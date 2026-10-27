// The app state, one document (docs/state-schema.md): loading, saving, and the hook that re-renders after a save.
// Only this module reassigns `appState`; others read the live binding and mutate it, then call saveAppState().
import { DEFAULT_STATE, buildState, migrateLegacyState, stateTimestamp } from '../lib/state.js';

export const STORAGE_KEY = 'nms_master_os_state';
const LEGACY_STORAGE_KEY = 'ATLAS_MASTER_OS_STATE_V2';
const STATE_FILE = './nms_state.json';

export let appState = structuredClone(DEFAULT_STATE);

export function setAppState(next) {
    appState = next;
}

let renderAll = () => {};
export function onSave(render) {
    renderAll = render;
}

function readLocalState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) return migrateLegacyState(JSON.parse(legacy));
    } catch (e) {
        console.warn('Could not read local state:', e);
    }
    return null;
}

async function fetchRepoState() {
    try {
        const res = await fetch(STATE_FILE, { cache: 'no-store' });
        if (res.ok) return await res.json();
    } catch (e) {
        console.info('nms_state.json not reachable (file:// or offline); using built-in defaults.');
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
    } catch (e) {
        console.warn('Could not save local state:', e);
    }
    renderAll();
}
