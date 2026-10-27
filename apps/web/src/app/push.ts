// "Alerts when the app is asleep" (ADR-0006): opt-in Web Push for finished timers, through the sync relay. With the
// switch on, this device sends the relay its push subscription and the ids and end times of its running timers,
// nothing else. The notification's words stay here, in a cache the service worker reads (`atlas-timer-notes`),
// so the relay never sees a timer's name. Independent of sync.
import { useSyncExternalStore } from 'react';
import { pendingPushes, timerNotice } from '@atlas/core/timers';
import { fromBase64Url, newSyncCode, toBase64Url } from '@atlas/core/sync-crypto';
import { isPlainObject } from '@atlas/core/util';
import { appState, subscribe } from './store.ts';
import { SYNC_URL } from './sync.ts';
import { readCapacity, relayPaused, relayStatus } from './relay-status.ts';

const VAPID_KEY: string = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';
const SETTINGS_KEY = 'nms_master_os_push'; // { deviceId, token }: this device only, never exported
const UNSENT_DELETE_KEY = 'nms_master_os_push.delete'; // a turn-off the relay hasn't heard about yet
export const NOTES_CACHE = 'atlas-timer-notes';
// What the service worker needs to re-register on its own when the browser replaces the subscription.
const DEVICE_NOTE = '_device';
const TIMEOUT_MS = 10_000;
const RETRY_MS = [30_000, 120_000, 300_000];

// 'install': an iPhone or iPad browser tab; Web Push there needs the app added to the Home Screen.
export type PushSupport = 'yes' | 'install' | 'no';
// 'capacity' / 'busy': the free relay is full for today, or isn't taking new devices today (relay-status.ts).
export type PushProblem = 'denied' | 'offline' | 'server' | 'capacity' | 'busy';
export interface PushStatus {
  support: PushSupport;
  enabled: boolean;
  busy: boolean;
  problem: PushProblem | null;
}

function detectSupport(): PushSupport {
  if (!SYNC_URL || !VAPID_KEY) return 'no';
  if ('PushManager' in window && 'serviceWorker' in navigator && 'Notification' in window) return 'yes';
  // iPadOS Safari reports itself as a Mac; the touch screen tells them apart.
  const ua = navigator.userAgent;
  const apple = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return apple ? 'install' : 'no';
}

let status: PushStatus = { support: 'no', enabled: false, busy: false, problem: null };
const listeners = new Set<() => void>();
function setStatus(patch: Partial<PushStatus>): void {
  status = { ...status, ...patch };
  listeners.forEach(listener => {
    listener();
  });
}
export function usePushStatus(): PushStatus {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => status
  );
}

const logEvent = (event: string, reason: unknown) => {
  console.warn('[atlas]', { event, reason: reason instanceof Error ? reason.name : String(reason) });
};

interface Settings {
  deviceId: string;
  token: string;
}
function parseSettings(raw: string | null): Settings | null {
  try {
    const parsed: unknown = JSON.parse(raw ?? 'null');
    if (!isPlainObject(parsed) || typeof parsed.deviceId !== 'string' || typeof parsed.token !== 'string') return null;
    return { deviceId: parsed.deviceId, token: parsed.token };
  } catch {
    return null;
  }
}
function readSettings(): Settings | null {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return null;
  }
}

async function registration(): Promise<ServiceWorkerRegistration> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('no service worker'));
        }, TIMEOUT_MS);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function currentSubscription(create: boolean): Promise<PushSubscription | null> {
  const { pushManager } = await registration();
  const existing = await pushManager.getSubscription();
  if (existing || !create) return existing;
  return pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromBase64Url(VAPID_KEY) });
}

const online = () => navigator.onLine; // read fresh: it can change while a request waits

// keepalive lets a send finish after the page is hidden (the player went back to the game).
async function call(method: 'PUT' | 'DELETE', settings: Settings, body?: unknown): Promise<boolean> {
  if (!online()) {
    setStatus({ problem: 'offline' });
    return false;
  }
  try {
    const response = await fetch(`${SYNC_URL}/v1/push/${settings.deviceId}`, {
      method,
      cache: 'no-store',
      keepalive: true,
      headers: { Authorization: `Bearer ${settings.token}`, 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const capacity = await readCapacity(response);
    if (capacity) {
      setStatus({ problem: capacity === 'full' ? 'capacity' : 'busy' });
      return false;
    }
    if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
    setStatus({ problem: null });
    return true;
  } catch (e) {
    logEvent('push-unreachable', e);
    setStatus({ problem: online() ? 'server' : 'offline' });
    return false;
  }
}

// The words each pending timer's notification will show, kept on this device for the service worker, plus what the
// worker needs to re-send the schedule itself if the browser replaces the subscription while the app sleeps.
const noteUrl = (id: string) => new URL(`timer-notes/${id}`, document.baseURI).href;
async function writeNotes(settings: Settings | null, timers: { id: string; at: number }[]): Promise<void> {
  if (!('caches' in window)) return;
  if (!settings) {
    await caches.delete(NOTES_CACHE);
    return;
  }
  const cache = await caches.open(NOTES_CACHE);
  const ids = new Set(timers.map(timer => timer.id));
  for (const request of await cache.keys()) {
    const id = request.url.split('/').pop() ?? '';
    if (id !== DEVICE_NOTE && !ids.has(id)) await cache.delete(request);
  }
  for (const timer of appState.timers.filter(item => ids.has(item.id)))
    await cache.put(noteUrl(timer.id), new Response(JSON.stringify(timerNotice(timer))));
  const device = { url: SYNC_URL, key: VAPID_KEY, ...settings, timers };
  await cache.put(noteUrl(DEVICE_NOTE), new Response(JSON.stringify(device)));
}

const scheduleKey = () => JSON.stringify(pendingPushes(appState.timers, Date.now()).map(timer => [timer.id, timer.at]));

// Sends the whole schedule (the relay replaces it) when it differs from the last one the relay accepted. One send
// at a time; a change during a send is sent right after it, and a failure is retried with a growing wait.
let lastSent = '';
let sending: Promise<void> | null = null;
let again = false;
let retry: ReturnType<typeof setTimeout> | undefined;
let failures = 0;
export function sendSchedule(): Promise<void> {
  if (sending) {
    again = true;
    return sending;
  }
  clearTimeout(retry);
  sending = (async () => {
    const settings = readSettings();
    if (!settings || status.support !== 'yes') return;
    if (relayPaused()) {
      // The relay is full for today (or not taking new devices): send once it resets, not before.
      setStatus({ problem: relayStatus().capacity === 'full' ? 'capacity' : 'busy' });
      retry = setTimeout(() => void sendSchedule(), Math.max(1000, (relayStatus().until ?? Date.now()) - Date.now()));
      return;
    }
    let ok = true;
    try {
      const subscription = await currentSubscription(Notification.permission === 'granted');
      if (!subscription) {
        setStatus({ problem: 'denied' }); // notifications were turned off in the browser's settings
        return;
      }
      const { endpoint, keys } = subscription.toJSON();
      const timers = pendingPushes(appState.timers, Date.now());
      await writeNotes(settings, timers);
      const key = JSON.stringify({ endpoint, keys, timers });
      if (key !== lastSent) {
        ok = await call('PUT', settings, { subscription: { endpoint, keys }, now: Date.now(), timers });
        if (ok && readSettings()?.deviceId === settings.deviceId) lastSent = key; // not turned off meanwhile
      }
    } catch (e) {
      logEvent('push-schedule-failed', e);
      setStatus({ problem: 'server' });
      ok = false;
    }
    failures = ok ? 0 : failures + 1;
    const until = relayPaused() ? relayStatus().until : null;
    if (!ok && status.enabled)
      retry = setTimeout(
        () => void sendSchedule(),
        until !== null ? Math.max(1000, until - Date.now()) : RETRY_MS[Math.min(failures, RETRY_MS.length) - 1]
      );
  })().finally(() => {
    sending = null;
    if (again) {
      again = false;
      void sendSchedule();
    }
  });
  return sending;
}

// From the switch's tap (browsers only show the permission prompt from a user action).
export async function enablePush(): Promise<void> {
  if (status.support !== 'yes') return;
  setStatus({ busy: true });
  try {
    const permission =
      Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission !== 'granted') {
      setStatus({ problem: 'denied' });
      return;
    }
    await currentSubscription(true);
    // A turn-off the relay never heard about is for the same subscription: reuse that device, so pushes don't double.
    const unsent = parseSettings(localStorage.getItem(UNSENT_DELETE_KEY));
    localStorage.removeItem(UNSENT_DELETE_KEY);
    if (!readSettings())
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(
          unsent ?? { deviceId: toBase64Url(crypto.getRandomValues(new Uint8Array(16))), token: newSyncCode() }
        )
      );
    lastSent = '';
    setStatus({ enabled: true, problem: null });
    await sendSchedule();
  } catch (e) {
    logEvent('push-enable-failed', e);
    setStatus({ problem: 'server' });
  } finally {
    setStatus({ busy: false });
  }
}

async function sendDelete(settings: Settings): Promise<void> {
  if (await call('DELETE', settings)) localStorage.removeItem(UNSENT_DELETE_KEY);
  else localStorage.setItem(UNSENT_DELETE_KEY, JSON.stringify(settings)); // retried on the next start or when online
}

// Removes this device and its schedule from the relay, then forgets the subscription and the notes here. A send
// under way finishes first, so it can't re-register the device after the removal.
export async function disablePush(): Promise<void> {
  const settings = readSettings();
  setStatus({ busy: true, enabled: false, problem: null });
  clearTimeout(retry);
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch {}
  lastSent = '';
  try {
    await sending;
    if (settings) await sendDelete(settings);
    setStatus({ problem: null });
    await (await currentSubscription(false))?.unsubscribe();
    await writeNotes(null, []);
  } catch (e) {
    logEvent('push-disable-failed', e);
  } finally {
    setStatus({ busy: false });
  }
}

function retryUnsentDelete(): void {
  const unsent = parseSettings(localStorage.getItem(UNSENT_DELETE_KEY));
  if (unsent && !readSettings()) void sendDelete(unsent);
}

export function startPush(): void {
  setStatus({ support: detectSupport(), enabled: readSettings() !== null });
  if (status.support !== 'yes') return;
  // Sent as soon as the schedule changes (a timer added, finished, dismissed), not after a delay: the player often
  // goes straight back to the game, and a hidden page may never run a delayed send.
  let queued = scheduleKey();
  subscribe(() => {
    if (!status.enabled) return;
    const key = scheduleKey();
    if (key === queued) return;
    queued = key;
    void sendSchedule();
  });
  window.addEventListener('online', () => {
    retryUnsentDelete();
    if (status.enabled) void sendSchedule();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && status.enabled) void sendSchedule();
  });
  // Turned on or off in another tab: follow it here.
  window.addEventListener('storage', event => {
    if (event.key !== SETTINGS_KEY) return;
    lastSent = '';
    setStatus({ enabled: readSettings() !== null, problem: null });
  });
  retryUnsentDelete();
  if (status.enabled) void sendSchedule();
}
