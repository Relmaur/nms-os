// The app state, one document (docs/state-schema.md): loading, saving, and the hook that re-renders after a save.
// Only this module reassigns `appState`; others read the live binding and mutate it, then call saveAppState().
import { DEFAULT_STATE, buildState, migrateLegacyState, stateTimestamp } from '../lib/state.js';
import { validateState, describeErrors } from '../lib/schema.js';

export const STORAGE_KEY = 'nms_master_os_state';
const LEGACY_STORAGE_KEY = 'ATLAS_MASTER_OS_STATE_V2';
const STATE_FILE = './nms_state.json';
const STATE_FETCH_TIMEOUT_MS = 5000; // the browser copy renders without the repo file; a slow network must not block it

export let appState = structuredClone(DEFAULT_STATE);

export function setAppState(next) {
    appState = next;
}

let renderAll = () => {};
export function onSave(render) {
    renderAll = render;
}

// Storage problems the person must see (never only the console): { saveFailed, recoveredKey, fromOtherTab }.
let reportStatus = () => {};
export function onStorageStatus(report) {
    reportStatus = report;
}
let saveFailed = false;

// Diagnostics carry the event and reason only, never state contents (ADR-0002).
function logEvent(event, detail = {}) {
    console.warn('[atlas]', { event, ...detail });
}

// An unreadable browser copy is kept under its own key before the app falls back to defaults, so a bug or a bad
// edit can never silently destroy someone's log.
function preserveUnreadable(raw, reason) {
    const key = `${STORAGE_KEY}.corrupt-${new Date().toISOString()}`;
    try { localStorage.setItem(key, raw); } catch {}
    logEvent('local-state-unreadable', { reason, keptAs: key });
    reportStatus({ recoveredKey: key });
}

function readLocalState() {
    let raw;
    let legacy;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
        legacy = raw ? null : localStorage.getItem(LEGACY_STORAGE_KEY);
    } catch (e) {
        logEvent('storage-unavailable', { reason: e.name });
        return null;
    }
    const source = raw ?? legacy;
    if (!source) return null;
    let state;
    try {
        state = JSON.parse(source);
        if (!raw) state = migrateLegacyState(state);
    } catch {
        preserveUnreadable(source, 'not JSON');
        return null;
    }
    const { ok, errors } = validateState(state);
    if (!ok) {
        preserveUnreadable(source, describeErrors(errors));
        return null;
    }
    return state;
}

async function fetchRepoState() {
    try {
        const res = await fetch(STATE_FILE, { cache: 'no-store', signal: AbortSignal.timeout(STATE_FETCH_TIMEOUT_MS) });
        if (!res.ok) return null;
        const state = await res.json();
        const { ok, errors } = validateState(state);
        if (ok) return state;
        logEvent('repo-state-invalid', { reason: describeErrors(errors) });
    } catch (e) {
        logEvent('repo-state-unavailable', { reason: e.name }); // offline, timed out, or file://
    }
    return null;
}

export async function loadAppState() {
    const repoState = await fetchRepoState();
    const localState = readLocalState();
    // Browser edits win, unless the repo file is newer (e.g. pulled from another machine).
    appState = localState && stateTimestamp(repoState) > stateTimestamp(localState)
        ? buildState(localState, repoState)
        : buildState(repoState, localState);
}

export function saveAppState() {
    appState.meta.lastUpdated = new Date().toISOString();
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
        if (saveFailed) reportStatus({ saveFailed: (saveFailed = false) });
    } catch (e) {
        // Quota exceeded or storage blocked (private mode): the data stays in memory, and the banner tells the
        // person to export it before closing the app.
        saveFailed = true;
        logEvent('save-failed', { reason: e.name });
        reportStatus({ saveFailed: true });
    }
    renderAll();
}

// Another tab of the app saved: adopt its copy, so this tab never writes stale data over newer changes.
// Last write wins between tabs (ADR-0002); this makes sure the last write was made on fresh data.
window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    let next;
    try { next = JSON.parse(event.newValue); } catch { return; }
    if (!validateState(next).ok) return;
    appState = buildState(next);
    renderAll();
    reportStatus({ fromOtherTab: true });
});
