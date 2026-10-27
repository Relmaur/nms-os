// Home screen + device integration: keep-awake, app badge, share sheet, install, swipe-to-close.
import { escapeHtml } from '../lib/util.js';
import { formatAgo, formatDuration } from '../lib/format.js';
import { lastVisit } from '../lib/systems-model.js';
import { appState, saveAppState } from './store.js';
import { showToast, haptic } from './ui.js';
import { findSystem, sortedOutlaw, starDot, glyphChip, tagChip, renderOutlaw, renderSystems, panelMode, closeSystemPanel } from './systems.js';

const KEEP_AWAKE_KEY = 'atlas_keep_awake'; // per-device preference, so not part of nms_state.json
const HOME_RECENT_LIMIT = 5;
const HOME_OUTLAW_LIMIT = 3;

// ---------------------------------------------------------------------------
// Home: the current system, warp-back list and the next outlaw stations
// ---------------------------------------------------------------------------
function lastActivity(system) {
    return Date.parse(lastVisit(system)?.at || system.createdAt) || 0;
}

export function renderHome() {
    const [current, ...rest] = [...appState.systems].sort((a, b) => lastActivity(b) - lastActivity(a));
    renderHomeNow(current);
    renderHomeRecent(rest.slice(0, HOME_RECENT_LIMIT));
    renderHomeOutlaw();
}

function renderHomeNow(system) {
    const newButton = `<button onclick="openSystemEditor()" class="h-12 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition"><i class="ph-bold ph-plus"></i>Warped somewhere new</button>`;
    const el = document.getElementById('homeNow');
    if (!system) {
        el.innerHTML = `
            <div class="hud-card rounded-2xl p-5 sm:p-6 space-y-4">
                <div class="space-y-1.5">
                    <h2 class="font-display text-lg font-bold text-white">Log your first system</h2>
                    <p class="text-sm text-slate-300 max-w-prose">Warp somewhere, then add it here with its glyphs and what’s worth coming back for. It becomes your current system, one tap to log again.</p>
                </div>
                <div class="grid sm:flex">${newButton}</div>
            </div>`;
        return;
    }
    const last = lastVisit(system);
    const where = [last ? `Here ${formatAgo(last.at)}` : `Added ${formatAgo(system.createdAt)}`, system.region, system.galaxy]
        .filter(Boolean).map(escapeHtml).join(' · ');
    const note = system.notes.split('\n').find(line => line.trim());
    el.innerHTML = `
        <div class="hud-card rounded-2xl p-5 sm:p-6 space-y-4">
            <button onclick="openSystem('${system.id}')" class="group flex items-start gap-3 max-w-full text-left">
                <span class="flex mt-2.5">${starDot(system, 'w-3.5 h-3.5')}</span>
                <span class="min-w-0">
                    <span class="block font-display text-xl sm:text-2xl font-bold text-white leading-snug break-words group-hover:underline underline-offset-4 decoration-slate-600">${escapeHtml(system.name)}</span>
                    <span class="block text-sm text-slate-400 mt-1">${where}</span>
                </span>
            </button>
            ${system.tags.length || system.glyphs ? `<div class="flex flex-wrap items-center gap-1.5">${glyphChip(system.glyphs)}${system.tags.slice(0, 5).map(tag => tagChip(tag)).join('')}</div>` : ''}
            ${note ? `<p class="text-sm text-slate-300 line-clamp-2 max-w-prose">${escapeHtml(note)}</p>` : ''}
            <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-1">
                <div class="col-span-2 grid sm:contents">${newButton}</div>
                <button onclick="quickLogVisit('${system.id}')" class="h-11 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-400/60 text-sm font-medium text-slate-100 flex items-center justify-center gap-2 transition"><i class="ph-bold ph-map-pin"></i>Log visit</button>
                <button onclick="openSystem('${system.id}')" class="h-11 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-sm font-medium text-slate-100 flex items-center justify-center gap-2 transition"><i class="ph-bold ph-note-pencil"></i>Details</button>
            </div>
        </div>`;
}

function renderHomeRecent(systems) {
    document.getElementById('homeRecent').innerHTML = systems.length ? systems.map(system => {
        const last = lastVisit(system);
        const meta = [last ? formatAgo(last.at) : 'Never visited', system.region].filter(Boolean).map(escapeHtml).join(' · ');
        return `
        <li class="flex items-center gap-2 -mx-2 px-2 py-1.5 rounded-xl hover:bg-slate-900/70">
            <button onclick="openSystem('${system.id}')" class="flex items-center gap-3 min-w-0 flex-1 text-left py-1">
                ${starDot(system)}
                <span class="min-w-0"><span class="block text-sm text-white truncate">${escapeHtml(system.name)}</span><span class="block text-xs text-slate-400 truncate">${meta}</span></span>
            </button>
            <button onclick="quickLogVisit('${system.id}')" aria-label="I'm at ${escapeHtml(system.name)}" class="shrink-0 h-9 px-3 rounded-lg border border-slate-700 hover:border-emerald-400/60 hover:text-emerald-200 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition"><i class="ph-bold ph-map-pin"></i>I’m here</button>
        </li>`;
    }).join('') : '<li class="text-sm text-slate-400">Systems you log land here, so warping back is one tap.</li>';
}

function renderHomeOutlaw() {
    const rows = sortedOutlaw();
    const ready = rows.filter(row => row.status.ready);
    updateBadges(rows.length ? ready.length : 0);
    const el = document.getElementById('homeOutlaw');
    if (!rows.length) {
        el.innerHTML = `
            <p class="text-sm text-slate-300">Tag systems with outlaw stations to plan Suspicious Packet runs and see which have restocked.</p>
            <button onclick="openSystemEditor(null, { tags: ['outlaw'], conflict: 'pirate' })" class="mt-3 h-10 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-sm text-slate-100 flex items-center gap-2"><i class="ph-bold ph-plus"></i>Add outlaw system</button>`;
        return;
    }
    const next = ready.slice(0, HOME_OUTLAW_LIMIT);
    const runPackets = Math.min(ready.length, appState.outlaw.runSize) * appState.outlaw.packetsPerVisit;
    el.innerHTML = `
        <p class="text-sm text-slate-300"><strong class="${ready.length ? 'text-emerald-300' : 'text-amber-300'}">${ready.length} of ${rows.length} ready</strong>${ready.length ? ` · next run ~${(runPackets * appState.outlaw.nanitesPerPacket).toLocaleString()} Nanites` : ''}</p>
        ${next.length ? `<ul class="mt-3 space-y-1">${next.map(({ system }) => `
            <li class="flex items-center gap-2 -mx-2 px-2 py-1.5 rounded-xl hover:bg-slate-900/70">
                <button onclick="openSystem('${system.id}')" class="min-w-0 flex-1 text-left py-1"><span class="block text-sm text-white truncate">${escapeHtml(system.name)}</span><span class="block text-xs text-slate-400 truncate">${escapeHtml([system.region, system.galaxy].filter(Boolean).join(' · ') || 'No region logged')}</span></button>
                <button onclick="logPacketRun('${system.id}')" class="shrink-0 h-9 px-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 text-xs font-semibold flex items-center gap-1.5"><i class="ph-bold ph-check"></i>Visited</button>
            </li>`).join('')}</ul>`
        : `<p class="mt-2 text-sm text-slate-400">All restocking. ${escapeHtml(rows[0].system.name)} is ready in ${formatDuration(rows[0].status.readyAt - Date.now())}.</p>`}`;
}

function quickLogVisit(id) {
    const system = findSystem(id);
    if (!system) return;
    system.visits.push({ at: new Date().toISOString() });
    haptic();
    saveAppState();
    showToast(`Logged a visit to ${system.name}.`);
}

// ---------------------------------------------------------------------------
// Device integration
// ---------------------------------------------------------------------------
// Ready outlaw stations on the home-screen icon and the Outlaw tab.
function updateBadges(readyCount) {
    const badge = document.getElementById('tabOutlawBadge');
    badge.textContent = readyCount;
    badge.classList.toggle('hidden', !readyCount);
    if ('setAppBadge' in navigator) (readyCount ? navigator.setAppBadge(readyCount) : navigator.clearAppBadge()).catch(() => {});
}

function shareSystem(id) {
    const system = findSystem(id);
    if (!system || !navigator.share) return;
    const text = [
        system.name,
        [system.region, system.galaxy].filter(Boolean).join(' · '),
        system.glyphs ? `Portal glyphs: ${system.glyphs}` : ''
    ].filter(Boolean).join('\n');
    navigator.share({ title: system.name, text }).catch(() => {}); // dismissing the sheet rejects
}

let wakeLock = null;

function keepAwakeWanted() {
    try { return localStorage.getItem(KEEP_AWAKE_KEY) === '1'; } catch { return false; }
}

async function applyKeepAwake() {
    if (keepAwakeWanted() && !wakeLock && document.visibilityState === 'visible') {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => { wakeLock = null; renderWakeControls(); });
        } catch { wakeLock = null; }
    } else if (!keepAwakeWanted() && wakeLock) {
        await wakeLock.release().catch(() => {});
        wakeLock = null;
    }
    renderWakeControls();
}

function toggleKeepAwake() {
    const next = !keepAwakeWanted();
    try { localStorage.setItem(KEEP_AWAKE_KEY, next ? '1' : '0'); } catch {}
    haptic();
    applyKeepAwake().then(() => showToast(next
        ? (wakeLock ? 'Screen stays on while the app is open.' : 'This browser wouldn’t keep the screen on.')
        : 'Screen can sleep again.'));
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
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function renderInstallRow() {
    document.getElementById('installText').textContent = isStandalone()
        ? 'Installed: full screen, works offline.'
        : installPrompt ? 'Install it for a full-screen app that works offline.'
        : isIOS() ? 'To install: tap Share, then “Add to Home Screen”.'
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
    panel.addEventListener('touchstart', event => {
        const target = event.target;
        if (window.innerWidth >= 768 || panelMode !== 'view' || event.touches.length !== 1) return;
        if (!target.closest('[data-sheet-grab]') || target.closest('button, a, input, textarea, select, label')) return;
        startY = event.touches[0].clientY;
        startAt = performance.now();
        dy = 0;
        panel.style.transition = 'none';
    }, { passive: true });
    panel.addEventListener('touchmove', event => {
        if (startY === null) return;
        dy = Math.max(0, event.touches[0].clientY - startY);
        panel.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
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
    renderHome();
    renderOutlaw();
    renderSystems();
});

setInterval(() => { if (appState.systems) renderHome(); }, 60000);

document.addEventListener('DOMContentLoaded', () => {
    if ('wakeLock' in navigator) applyKeepAwake();
    renderInstallRow();
    renderStorage();
    enableSheetDrag();
});

// Called from inline on…="" handlers in the markup and in rendered templates.
Object.assign(window, { quickLogVisit, shareSystem, toggleKeepAwake, promptInstall });
