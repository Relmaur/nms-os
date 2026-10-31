// This device: keep the screen awake, install the app, and whether the browser protects the stored log. A small
// external store (read with useDevice) that Home's chip and More share.
import { useSyncExternalStore } from 'react';
import { showToast, haptic } from '../../app/ui.ts';

const KEEP_AWAKE_KEY = 'atlas_keep_awake'; // per-device preference, so not part of nms_state.json

// The install event isn't in the DOM typings yet (Chromium only).
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<unknown>;
}

export interface Device {
  wakeSupported: boolean;
  awake: boolean;
  installable: boolean;
  standalone: boolean;
  ios: boolean;
  persisted: boolean | null; // null while checking
}

let wakeLock: WakeLockSentinel | null = null;
let installPrompt: InstallPromptEvent | null = null;
let persisted: boolean | null = null;
let snapshot: Device = read();
const listeners = new Set<() => void>();

function read(): Device {
  return {
    wakeSupported: 'wakeLock' in navigator,
    awake: wakeLock !== null,
    installable: installPrompt !== null,
    standalone: isStandalone(),
    ios:
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    persisted
  };
}

function changed(): void {
  snapshot = read();
  listeners.forEach(listener => {
    listener();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDevice(): Device {
  return useSyncExternalStore(subscribe, () => snapshot);
}

function isStandalone(): boolean {
  // navigator.standalone is iOS Safari's own flag, missing from the DOM typings.
  const ios = navigator as Navigator & { standalone?: boolean };
  return matchMedia('(display-mode: standalone)').matches || ios.standalone === true;
}

function keepAwakeWanted(): boolean {
  try {
    return localStorage.getItem(KEEP_AWAKE_KEY) === '1';
  } catch {
    return false;
  }
}

// One change at a time: a toggle racing the return-to-app check would otherwise take two locks and lose one.
let applying: Promise<void> = Promise.resolve();
function applyKeepAwake(): Promise<void> {
  applying = applying.then(syncWakeLock);
  return applying;
}

async function syncWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator)) return;
  if (keepAwakeWanted() && !wakeLock && document.visibilityState === 'visible') {
    try {
      const lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => {
        if (wakeLock === lock) wakeLock = null;
        changed();
      });
      wakeLock = lock;
    } catch {
      wakeLock = null;
    }
  } else if (!keepAwakeWanted() && wakeLock) {
    await wakeLock.release().catch(() => undefined);
    wakeLock = null;
  }
  changed();
}

// A tap flips what the switch shows (whether the lock is held), not the stored wish: the system can drop the lock
// (battery saver, a moment away) while the wish stays on, and flipping the wish then took a second tap to show.
export function toggleKeepAwake(): void {
  const next = wakeLock === null;
  try {
    localStorage.setItem(KEEP_AWAKE_KEY, next ? '1' : '0');
  } catch {
    // Private windows may refuse storage; the lock below still applies for this visit.
  }
  haptic();
  void applyKeepAwake().then(() => {
    showToast(
      next
        ? wakeLock
          ? 'Screen stays on while the app is open.'
          : 'This browser wouldn’t keep the screen on.'
        : 'Screen can sleep again.'
    );
  });
}

// The prompt can be shown once: take it before awaiting, so a double tap or an install meanwhile can't reuse it.
export async function promptInstall(): Promise<void> {
  const event = installPrompt;
  if (!event) return;
  installPrompt = null;
  changed();
  await event.prompt().catch(() => undefined);
  await event.userChoice.catch(() => undefined);
}

async function checkStorage(): Promise<void> {
  let protectedNow = false;
  try {
    protectedNow = await navigator.storage.persisted();
    if (!protectedNow && isStandalone()) protectedNow = await navigator.storage.persist();
  } catch {
    // No StorageManager (older browsers): report it as unprotected.
  }
  persisted = protectedNow;
  changed();
}

// Starts once, from the main page (not in component tests).
export function startDevice(): void {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    // Only Chromium fires this event, and it is always a BeforeInstallPromptEvent.
    installPrompt = event as InstallPromptEvent;
    changed();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    changed();
    showToast('Installed. ATLAS:OS is on your home screen.');
  });
  // Coming back to the app (e.g. after an hour in-game) re-takes the wake lock the system released.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void applyKeepAwake();
  });
  void applyKeepAwake();
  void checkStorage();
}
