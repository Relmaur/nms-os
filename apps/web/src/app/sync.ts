// Sync between the player's devices (ADR-0005). Opt-in: nothing is sent until sync is turned on or a device is paired.
// Every copy is sealed on this device before it leaves; the relay only stores it. A cycle pulls the cloud copy,
// merges it three-way against the copy both sides last agreed on (kept here), adopts the result, and pushes it back
// with the version it was based on, so two devices writing at once merge instead of overwriting each other.
import { useSyncExternalStore } from 'react';
import { buildState } from '@atlas/core/state';
import { validateState, describeErrors } from '@atlas/core/schema';
import { deepEqual, mergeStates } from '@atlas/core/sync';
import {
  deriveSyncKeys,
  newSyncCode,
  openState,
  parseSyncCode,
  sealState,
  type SyncKeys
} from '@atlas/core/sync-crypto';
import { isPlainObject } from '@atlas/core/util';
import {
  adoptNewerStoredCopy,
  adoptState,
  appState,
  getStartingState,
  persistState,
  STORAGE_KEY,
  subscribe
} from './store.ts';

export const SYNC_URL: string = import.meta.env.VITE_SYNC_URL ?? '';
const SETTINGS_KEY = 'nms_master_os_sync'; // { code, version, at }: this device only, never exported
const BASE_KEY = `${STORAGE_KEY}.synced`; // the copy both sides last agreed on
const TIMEOUT_MS = 10_000;
const SAVE_DELAY_MS = 3_000; // after a save, so a burst of edits goes up as one copy
const POLL_MS = 120_000; // while the app is visible, to pick up what another device logged meanwhile
const MAX_ROUNDS = 3; // merges in a row when other devices keep writing first

interface Settings {
  code: string;
  version: number; // the cloud version the base copy came from; 0 before the first push
  at: number | null; // the last successful sync
  fresh?: boolean; // a code made here just now: there's no cloud copy to pull yet
}

export type SyncProblem = 'offline' | 'server' | 'gone' | 'damaged' | 'storage';
export interface SyncStatus {
  enabled: boolean;
  busy: boolean;
  at: number | null;
  problem: SyncProblem | null;
  pending: string | null; // a code from a pairing link, waiting for the person to confirm
}

// ── Status store (read by More and the header) ──
let status: SyncStatus = { enabled: false, busy: false, at: null, problem: null, pending: null };
const listeners = new Set<() => void>();
function setStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch };
  listeners.forEach(listener => {
    listener();
  });
}
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => status
  );
}

// A problem only the person can fix (not being offline, or a server hiccup that the next try may clear).
export function useSyncAttention(): boolean {
  const { problem } = useSyncStatus();
  return problem === 'gone' || problem === 'damaged' || problem === 'storage';
}

// Diagnostics carry the event and reason only, never the code, ids or contents (ADR-0002).
function logEvent(event: string, detail: Record<string, unknown> = {}): void {
  console.warn('[atlas]', { event, ...detail });
}
const errorName = (e: unknown) => (e instanceof Error ? e.name : String(e));

// ── This device's settings and base copy ──
function readSettings(): Settings | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
    if (!isPlainObject(parsed) || typeof parsed.code !== 'string' || !parseSyncCode(parsed.code)) return null;
    return {
      code: parsed.code,
      version: typeof parsed.version === 'number' ? parsed.version : 0,
      at: typeof parsed.at === 'number' ? parsed.at : null,
      fresh: parsed.fresh === true
    };
  } catch {
    return null;
  }
}
function writeSettings(settings: Settings | null): void {
  if (settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  else localStorage.removeItem(SETTINGS_KEY);
}
function readBase(): unknown {
  try {
    return JSON.parse(localStorage.getItem(BASE_KEY) ?? 'null') ?? undefined;
  } catch {
    return undefined; // a lost base only means the next merge keeps everything from both sides
  }
}

let keys: { code: string; keys: SyncKeys } | null = null;
async function keysFor(code: string): Promise<SyncKeys> {
  if (keys?.code !== code) keys = { code, keys: await deriveSyncKeys(code) };
  return keys.keys;
}

// ── The relay ──
class SyncError extends Error {
  readonly problem: SyncProblem;
  constructor(problem: SyncProblem) {
    super(problem);
    this.problem = problem;
  }
}
const online = () => navigator.onLine;

async function call(
  method: 'GET' | 'PUT' | 'DELETE',
  sync: SyncKeys,
  init: { body?: BodyInit; headers?: Record<string, string> } = {}
): Promise<Response> {
  if (!online()) throw new SyncError('offline');
  let response: Response;
  try {
    response = await fetch(`${SYNC_URL}/v1/vaults/${sync.vaultId}`, {
      ...init,
      method,
      cache: 'no-store',
      headers: { Authorization: `Bearer ${sync.token}`, ...init.headers },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (e) {
    logEvent('sync-unreachable', { reason: errorName(e) });
    throw new SyncError(online() ? 'server' : 'offline');
  }
  if (response.status === 401) throw new SyncError('gone');
  return response;
}

interface Remote {
  version: number;
  doc: Record<string, unknown>;
}
async function readRemote(response: Response, sync: SyncKeys): Promise<Remote> {
  const version = Number(/\d+/.exec(response.headers.get('ETag') ?? '')?.[0]);
  let doc: unknown;
  try {
    doc = JSON.parse(await openState(sync, new Uint8Array(await response.arrayBuffer())));
  } catch (e) {
    logEvent('sync-unreadable', { reason: errorName(e) });
    throw new SyncError('damaged');
  }
  const check = validateState(doc);
  if (!check.ok || !isPlainObject(doc) || !Number.isSafeInteger(version)) {
    logEvent('sync-invalid', { reason: describeErrors(check.errors) });
    throw new SyncError('damaged');
  }
  return { version, doc };
}

// ── One cycle ──
const snapshot = (): Record<string, unknown> => JSON.parse(JSON.stringify(appState)) as Record<string, unknown>;
let applying = false; // our own adoption must not schedule another cycle

function adoptQuietly(run: () => void): void {
  applying = true;
  try {
    run();
  } finally {
    applying = false;
  }
}

// Bumped whenever sync is turned on, paired or turned off here. A cycle checks it (and that the stored code is still
// its code, which another tab may have changed) after every wait, and stops without writing or sending anything, so
// an opt-out or a new pairing is never undone by a sync already in flight.
let epoch = 0;
class Stale extends Error {}
function stillCurrent(started: number, code: string): void {
  if (started !== epoch || readSettings()?.code !== code) throw new Stale();
}

async function cycle(settings: Settings, started: number): Promise<void> {
  const check = () => {
    stillCurrent(started, settings.code);
  };
  const sync = await keysFor(settings.code);
  check();
  // A first pairing has no common copy yet: the state every device starts from stands in, so starter data removed
  // or changed on one device isn't brought back by another device's untouched copy.
  const base = readBase() ?? (JSON.parse(JSON.stringify(getStartingState())) as unknown);
  let remote: Remote | null = null;
  if (!settings.fresh) {
    const pulled = await call('GET', sync);
    check();
    if (pulled.status === 404 && settings.version > 0) throw new SyncError('gone'); // deleted from another device
    if (!pulled.ok && pulled.status !== 404) throw new SyncError('server');
    remote = pulled.ok ? await readRemote(pulled, sync) : null;
    check();
  }
  adoptQuietly(adoptNewerStoredCopy); // another tab's save that hasn't reached this one yet

  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Fold in the cloud's changes when it moved on since the base copy. The content is compared too: a vault deleted
    // and recreated starts its versions again, so a matching number alone doesn't prove nothing changed.
    if (remote && (remote.version !== settings.version || !deepEqual(remote.doc, base))) {
      const merged = mergeStates(base, snapshot(), remote.doc);
      if (!validateState(merged).ok) throw new SyncError('damaged');
      if (!deepEqual(merged, snapshot())) {
        adoptQuietly(() => {
          adoptState(buildState(merged));
        });
        // Saved as merged, without a new save time: taking another device's changes isn't an edit to send back.
        if (!persistState({ touch: false })) throw new SyncError('storage');
      }
    }
    const local = snapshot();
    if (remote && deepEqual(local, remote.doc)) {
      agreed(settings, remote.version, local);
      return;
    }
    const expected = remote?.version ?? 0;
    const body = await sealState(sync, JSON.stringify(local));
    check();
    const pushed = await call('PUT', sync, {
      body,
      headers: { 'If-Match': `"${String(expected)}"`, 'Content-Type': 'application/octet-stream' }
    });
    check();
    if (pushed.ok) {
      agreed(settings, expected + 1, local);
      return;
    }
    if (pushed.status !== 409) throw new SyncError('server');
    remote = await readRemote(pushed, sync); // another device wrote first: merge with its copy and try again
    check();
  }
  throw new SyncError('server');
}

function agreed(settings: Settings, version: number, doc: Record<string, unknown>): void {
  settings.version = version;
  settings.at = Date.now();
  delete settings.fresh;
  try {
    localStorage.setItem(BASE_KEY, JSON.stringify(doc));
    writeSettings(settings);
  } catch (e) {
    logEvent('sync-base-not-saved', { reason: errorName(e) });
    throw new SyncError('storage');
  }
  setStatus({ at: settings.at });
}

// One tab syncs at a time (Web Locks, where supported): two tabs merging at once could each save over the other.
function exclusively(run: () => Promise<void>): Promise<void> {
  // Typed as always there, but older browsers and test DOMs have none (or null).
  const locks = (navigator as { locks?: LockManager | null }).locks;
  return locks ? locks.request('atlas-sync', run) : run();
}

// One cycle at a time; a request made meanwhile runs once more afterwards.
let running: Promise<void> | null = null;
let requests = 0;
export function syncNow(): Promise<void> {
  requests += 1;
  if (running) return running;
  running = (async () => {
    let handled = 0;
    while (handled !== requests) {
      handled = requests;
      const settings = readSettings();
      if (!settings || !SYNC_URL) {
        setStatus({ enabled: false, busy: false, at: null, problem: null });
        return;
      }
      setStatus({ enabled: true, busy: true });
      const started = epoch;
      try {
        await exclusively(() => cycle(settings, started));
        setStatus({ problem: null });
      } catch (e) {
        if (e instanceof Stale) continue; // turned off or re-paired meanwhile; the loop reads the new settings
        const problem = e instanceof SyncError ? e.problem : 'server';
        if (!(e instanceof SyncError)) logEvent('sync-failed', { reason: errorName(e) });
        setStatus({ problem });
      }
    }
  })().finally(() => {
    running = null;
    setStatus({ busy: false });
  });
  return running;
}

// ── Turning it on and off ──
// A new vault from this device's log.
export function turnOnSync(): Promise<void> {
  if (readSettings()) return syncNow(); // already turned on in another tab: join it rather than start a second vault
  return startWith(newSyncCode(), true);
}

// Joins the vault behind a code: both logs are merged on the first sync, so nothing on either side is lost.
export function pairWith(text: string): Promise<boolean> {
  const code = parseSyncCode(text);
  if (!code) return Promise.resolve(false);
  return startWith(code).then(() => true);
}

function startWith(code: string, fresh = false): Promise<void> {
  epoch += 1;
  requests += 1; // a cycle in flight for the old code reruns with this one
  try {
    localStorage.removeItem(BASE_KEY); // a new pairing has no common history yet
    writeSettings({ code, version: 0, at: null, ...(fresh && { fresh }) });
  } catch (e) {
    logEvent('sync-settings-not-saved', { reason: errorName(e) });
    setStatus({ problem: 'storage' });
    return Promise.resolve();
  }
  return syncNow();
}

export function syncCode(): string | null {
  return readSettings()?.code ?? null;
}

// This device stops syncing; the cloud copy and other devices are untouched.
export function turnOffSync(): void {
  epoch += 1;
  try {
    writeSettings(null);
    localStorage.removeItem(BASE_KEY);
  } catch {}
  keys = null;
  setStatus({ enabled: false, busy: false, at: null, problem: null });
}

// Deletes the cloud copy for every paired device, then turns sync off here. Returns false if the relay couldn't
// be reached, so the person knows the copy is still there.
export async function deleteCloudCopy(): Promise<boolean> {
  const settings = readSettings();
  if (!settings) return true;
  try {
    const response = await call('DELETE', await keysFor(settings.code));
    if (!response.ok && response.status !== 404) return false;
  } catch (e) {
    if (!(e instanceof SyncError && e.problem === 'gone')) return false;
  }
  turnOffSync();
  return true;
}

// ── When to sync ──
// A pairing link (#pair=<code>, from the QR code) is taken out of the address before the sections read it, on load
// and on a hash change in an open tab, so it doesn't stay in the tab's history; More then asks before pairing.
// (The browser's own history list may still note the link; it's on the device that receives the code anyway.)
export function takePairingLink(): void {
  if (!location.hash.startsWith('#pair=')) return;
  const code = parseSyncCode(location.hash);
  history.replaceState(null, '', `${location.pathname}${location.search}#more`);
  if (code && code !== syncCode()) setStatus({ pending: code });
}

export function answerPairing(pair: boolean): Promise<boolean> {
  const code = status.pending;
  setStatus({ pending: null });
  return pair && code ? pairWith(code) : Promise.resolve(false);
}

export function startSync(): void {
  if (!SYNC_URL) return;
  const refresh = () => {
    const settings = readSettings();
    setStatus({ enabled: settings !== null, at: settings?.at ?? null, ...(settings ? {} : { problem: null }) });
  };
  refresh();
  // Turned on, paired or off in another tab: show it here too.
  window.addEventListener('storage', event => {
    if (event.key === SETTINGS_KEY) refresh();
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  subscribe(() => {
    if (applying || !status.enabled) return;
    clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), SAVE_DELAY_MS);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && status.enabled) void syncNow();
  });
  window.addEventListener('online', () => {
    if (status.enabled) void syncNow();
  });
  setInterval(() => {
    if (document.visibilityState === 'visible' && status.enabled) void syncNow();
  }, POLL_MS);
  if (status.enabled) void syncNow();
}
