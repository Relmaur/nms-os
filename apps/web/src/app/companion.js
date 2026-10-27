// Device integration: keep-awake, outlaw badges, install, storage protection. (Screens are React: src/ui.)
import { rankOutlaw } from '@atlas/core/systems-model';
import { appState } from './store.ts';
import { showToast, haptic } from './ui.ts';

const KEEP_AWAKE_KEY = 'atlas_keep_awake'; // per-device preference, so not part of nms_state.json

// ---------------------------------------------------------------------------
// Device integration
// ---------------------------------------------------------------------------
// Ready outlaw stations on the home-screen icon, the Outlaw tab and the sidebar.
export function updateOutlawBadges() {
  const rows = rankOutlaw(appState.systems, appState.outlaw.restockHours);
  const readyCount = rows.filter(row => row.status.ready).length;
  document.getElementById('sidebarOutlawCount').textContent = rows.length ? `${readyCount}/${rows.length}` : '0';
  const badge = document.getElementById('tabOutlawBadge');
  badge.textContent = readyCount;
  badge.classList.toggle('hidden', !readyCount);
  if ('setAppBadge' in navigator)
    (readyCount ? navigator.setAppBadge(readyCount) : navigator.clearAppBadge()).catch(() => {});
}

let wakeLock = null;

function keepAwakeWanted() {
  try {
    return localStorage.getItem(KEEP_AWAKE_KEY) === '1';
  } catch {
    return false;
  }
}

async function applyKeepAwake() {
  if (keepAwakeWanted() && !wakeLock && document.visibilityState === 'visible') {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
        renderWakeControls();
      });
    } catch {
      wakeLock = null;
    }
  } else if (!keepAwakeWanted() && wakeLock) {
    await wakeLock.release().catch(() => {});
    wakeLock = null;
  }
  renderWakeControls();
}

function toggleKeepAwake() {
  const next = !keepAwakeWanted();
  try {
    localStorage.setItem(KEEP_AWAKE_KEY, next ? '1' : '0');
  } catch {}
  haptic();
  applyKeepAwake().then(() =>
    showToast(
      next
        ? wakeLock
          ? 'Screen stays on while the app is open.'
          : 'This browser wouldn’t keep the screen on.'
        : 'Screen can sleep again.'
    )
  );
}

function renderWakeControls() {
  document.querySelectorAll('[data-wake-toggle]').forEach(el => {
    el.setAttribute('aria-checked', String(!!wakeLock));
    el.classList.remove('hidden');
  });
  document.querySelectorAll('[data-wake-row]').forEach(el => el.classList.remove('hidden'));
}

let installPrompt = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function renderInstallRow() {
  document.getElementById('installText').textContent = isStandalone()
    ? 'Installed: full screen, works offline.'
    : installPrompt
      ? 'Install it for a full-screen app that works offline.'
      : isIOS()
        ? 'To install: tap Share, then “Add to Home Screen”.'
        : 'To install: use “Install app” or “Add to Home Screen” in the browser menu.';
  document.getElementById('installButton').classList.toggle('hidden', !installPrompt);
}

async function promptInstall() {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice.catch(() => {});
  installPrompt = null;
  renderInstallRow();
}

async function renderStorage() {
  const el = document.getElementById('storageText');
  let persisted = false;
  try {
    persisted = await navigator.storage.persisted();
    if (!persisted && isStandalone()) persisted = await navigator.storage.persist();
  } catch {}
  el.textContent = persisted
    ? 'Protected: the browser won’t clear your log to free up space.'
    : 'The browser may clear site data when space runs low. Install the app, and export a backup now and then.';
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  renderInstallRow();
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  renderInstallRow();
  showToast('Installed. Atlas OS is on your home screen.');
});

// Coming back to the app (e.g. after an hour in-game): refresh the badges and re-take the wake lock. The React
// screens refresh their own countdowns (src/ui/useNow.ts).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  applyKeepAwake();
  updateOutlawBadges();
});

// Stations restock while the app sits open (keep-awake, mid-session): keep the badges in step with the screens' minute tick.
setInterval(updateOutlawBadges, 60000);

document.addEventListener('DOMContentLoaded', () => {
  if ('wakeLock' in navigator) applyKeepAwake();
  renderInstallRow();
  renderStorage();
});

// Called from inline on…="" handlers in the markup and in rendered templates.
Object.assign(window, { toggleKeepAwake, promptInstall });
