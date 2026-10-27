// Device integration: keep-awake, app badge, share sheet, install, swipe-to-close. (Home is React: src/ui/home.)
import { appState } from './store.ts';
import { showToast, haptic } from './ui.ts';
import { findSystem, sortedOutlaw, renderOutlaw, renderSystems, panelMode, closeSystemPanel } from './systems.js';

const KEEP_AWAKE_KEY = 'atlas_keep_awake'; // per-device preference, so not part of nms_state.json

// ---------------------------------------------------------------------------
// Device integration
// ---------------------------------------------------------------------------
// Ready outlaw stations on the home-screen icon and the Outlaw tab.
export function updateOutlawBadges() {
  const rows = sortedOutlaw();
  const readyCount = rows.filter(row => row.status.ready).length;
  const badge = document.getElementById('tabOutlawBadge');
  badge.textContent = readyCount;
  badge.classList.toggle('hidden', !readyCount);
  if ('setAppBadge' in navigator)
    (readyCount ? navigator.setAppBadge(readyCount) : navigator.clearAppBadge()).catch(() => {});
}

function shareSystem(id) {
  const system = findSystem(id);
  if (!system || !navigator.share) return;
  const text = [
    system.name,
    [system.region, system.galaxy].filter(Boolean).join(' · '),
    system.glyphs ? `Portal glyphs: ${system.glyphs}` : ''
  ]
    .filter(Boolean)
    .join('\n');
  navigator.share({ title: system.name, text }).catch(() => {}); // dismissing the sheet rejects
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

// Drag the detail sheet's header down to dismiss it (phones only, view mode only so drafts aren't lost).
function enableSheetDrag() {
  const panel = document.getElementById('systemPanel');
  let startY = null;
  let startAt = 0;
  let dy = 0;
  panel.addEventListener(
    'touchstart',
    event => {
      const target = event.target;
      if (window.innerWidth >= 768 || panelMode !== 'view' || event.touches.length !== 1) return;
      if (!target.closest('[data-sheet-grab]') || target.closest('button, a, input, textarea, select, label')) return;
      startY = event.touches[0].clientY;
      startAt = performance.now();
      dy = 0;
      panel.style.transition = 'none';
    },
    { passive: true }
  );
  panel.addEventListener(
    'touchmove',
    event => {
      if (startY === null) return;
      dy = Math.max(0, event.touches[0].clientY - startY);
      panel.style.transform = `translateY(${dy}px)`;
    },
    { passive: true }
  );
  const end = () => {
    if (startY === null) return;
    const flicked = dy / (performance.now() - startAt) > 0.6 && dy > 40;
    startY = null;
    panel.style.transition = '';
    panel.style.transform = ''; // the class transform takes over and animates from here
    if (dy > 120 || flicked) closeSystemPanel();
  };
  panel.addEventListener('touchend', end);
  panel.addEventListener('touchcancel', end);
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

// Coming back to the app (e.g. after an hour in-game): refresh countdowns and re-take the wake lock.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !appState.systems) return;
  applyKeepAwake();
  renderOutlaw();
  renderSystems();
  updateOutlawBadges();
});

// Stations restock while the app sits open (keep-awake, mid-session): keep the badges in step with Home's minute tick.
setInterval(updateOutlawBadges, 60000);

document.addEventListener('DOMContentLoaded', () => {
  if ('wakeLock' in navigator) applyKeepAwake();
  renderInstallRow();
  renderStorage();
  enableSheetDrag();
});

// Called from inline on…="" handlers in the markup and in rendered templates.
Object.assign(window, { shareSystem, toggleKeepAwake, promptInstall });
