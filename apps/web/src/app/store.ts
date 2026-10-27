// The app state, one document (docs/state-schema.md): loading, saving, and the hook that re-renders after a save.
// Only this module reassigns `appState`; others read the live binding and mutate it, then call saveAppState().
// Vanilla screens re-render through onSave(); React screens subscribe() (see src/ui/useAppState.ts). Both fire
// after every load, save and adoption of another tab's copy.
import { buildState, migrateLegacyState, stateTimestamp, type AppState } from '@atlas/core/state';
import { validateState, describeErrors } from '@atlas/core/schema';
import { isPlainObject } from '@atlas/core/util';

export const STORAGE_KEY = 'nms_master_os_state';
const LEGACY_STORAGE_KEY = 'ATLAS_MASTER_OS_STATE_V2';
const STATE_FILE = './nms_state.json';
const STATE_FETCH_TIMEOUT_MS = 5000; // the browser copy renders without the repo file; a slow network must not block it

export let appState: AppState = buildState();

export function setAppState(next: AppState): void {
  appState = next;
  changed();
}

let renderAll = () => {};
export function onSave(render: () => void): void {
  renderAll = render;
}

// A version number that changes whenever appState may have: React's useSyncExternalStore compares it, since the
// state object itself is mutated in place.
let version = 0;
const listeners = new Set<() => void>();
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getVersion(): number {
  return version;
}
function changed(): void {
  version += 1;
  listeners.forEach(listener => {
    listener();
  });
}

// Storage problems the person must see (never only the console).
export interface StorageStatus {
  saveFailed?: boolean;
  recoveredKey?: string;
  unreadableNotKept?: boolean;
  fromOtherTab?: boolean;
}
let reportStatus: (status: StorageStatus) => void = () => {};
export function onStorageStatus(report: (status: StorageStatus) => void): void {
  reportStatus = report;
}
let saveFailed = false;

const errorName = (e: unknown) => (e instanceof Error ? e.name : String(e));

// Diagnostics carry the event and reason only, never state contents (ADR-0002).
function logEvent(event: string, detail: Record<string, unknown> = {}): void {
  console.warn('[atlas]', { event, ...detail });
}

// Set when the stored copy couldn't be read *and* couldn't be copied aside (storage full): from then on the app
// never writes over it, so unread data is never destroyed. Saving resumes after a reload once there is room.
let protectUnread = false;

// An unreadable browser copy is kept under its own key before the app falls back to defaults, so a bug or a bad
// edit can never silently destroy someone's log. The same copy is reused on later reloads, not duplicated.
function preserveUnreadable(raw: string, reason: string): void {
  let key: string | null;
  try {
    key =
      Object.keys(localStorage).find(
        name => name.startsWith(`${STORAGE_KEY}.corrupt-`) && localStorage.getItem(name) === raw
      ) || null;
    if (!key) {
      key = `${STORAGE_KEY}.corrupt-${new Date().toISOString()}`;
      localStorage.setItem(key, raw);
    }
  } catch (e) {
    protectUnread = true;
    logEvent('local-state-unreadable', { reason, keptAs: null, copyFailed: errorName(e) });
    reportStatus({ unreadableNotKept: true });
    return;
  }
  logEvent('local-state-unreadable', { reason, keptAs: key });
  reportStatus({ recoveredKey: key });
}

function readLocalState(): Record<string, unknown> | null {
  let raw: string | null;
  let legacy: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    legacy = raw ? null : localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch (e) {
    logEvent('storage-unavailable', { reason: errorName(e) });
    return null;
  }
  const source = raw ?? legacy;
  if (!source) return null;
  let state: unknown;
  try {
    state = JSON.parse(source);
    if (!raw && isPlainObject(state)) state = migrateLegacyState(state);
  } catch {
    preserveUnreadable(source, 'not JSON');
    return null;
  }
  const { ok, errors } = validateState(state);
  if (!ok || !isPlainObject(state)) {
    preserveUnreadable(source, describeErrors(errors));
    return null;
  }
  return state;
}

async function fetchRepoState(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(STATE_FILE, { cache: 'no-store', signal: AbortSignal.timeout(STATE_FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const state: unknown = await res.json();
    const { ok, errors } = validateState(state);
    if (ok && isPlainObject(state)) return state;
    logEvent('repo-state-invalid', { reason: describeErrors(errors) });
  } catch (e) {
    logEvent('repo-state-unavailable', { reason: errorName(e) }); // offline or timed out
  }
  return null;
}

export async function loadAppState(): Promise<void> {
  const repoState = await fetchRepoState();
  const localState = readLocalState();
  // Browser edits win, unless the repo file is newer (e.g. pulled from another machine).
  appState =
    localState && stateTimestamp(repoState) > stateTimestamp(localState)
      ? buildState(localState, repoState)
      : buildState(repoState, localState);
  changed();
}

// The only way the state reaches storage. Returns true once it's written; every failure reaches the banner.
export function persistState(): boolean {
  appState.meta.lastUpdated = new Date().toISOString();
  if (protectUnread) {
    reportStatus({ unreadableNotKept: true });
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    if (saveFailed) reportStatus({ saveFailed: (saveFailed = false) });
    return true;
  } catch (e) {
    // Quota exceeded or storage blocked (private mode): the data stays in memory, and the banner tells the
    // person to export it before closing the app.
    saveFailed = true;
    logEvent('save-failed', { reason: errorName(e) });
    reportStatus({ saveFailed: true });
    return false;
  }
}

export function saveAppState(): void {
  persistState();
  renderAll();
  changed();
}

// Run after another tab's copy is adopted and before re-rendering, so features can carry over work in progress
// (notes being typed) or react to records that disappeared.
const adoptHooks: (() => void)[] = [];
export function onAdopt(run: () => void): void {
  adoptHooks.push(run);
}

// Another tab of the app saved: adopt its copy, so this tab never writes stale data over newer changes.
// Last write wins between tabs (ADR-0002); this makes sure the last write was made on fresh data.
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  let next: unknown;
  try {
    next = JSON.parse(event.newValue);
  } catch {
    next = null;
  }
  const check = next ? validateState(next) : { ok: false, errors: [{ path: '(root)', message: 'not JSON' }] };
  if (!check.ok) {
    logEvent('other-tab-state-ignored', { reason: describeErrors(check.errors) });
    return;
  }
  appState = buildState(next);
  adoptHooks.forEach(run => {
    run();
  });
  renderAll();
  changed();
  reportStatus({ fromOtherTab: true });
});
