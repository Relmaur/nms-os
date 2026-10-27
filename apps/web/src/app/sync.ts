// Sync between the player's devices (ADR-0005). Opt-in: nothing is sent until sync is turned on or a device is paired.
// Every copy is sealed on this device before it leaves; the relay only stores it. A cycle pulls the cloud copy,
// merges it three-way against the copy both sides last agreed on (kept here), adopts the result, and pushes it back
// with the version it was based on, so two devices writing at once merge instead of overwriting each other.
import { useSyncExternalStore } from 'react';
import { buildState } from '@atlas/core/state';
import { validateState, describeErrors } from '@atlas/core/schema';
import { deepEqual, mergeStates, needsConfirmation, removalReport, type Removal } from '@atlas/core/sync';
import {
  deriveSyncKeys,
  fingerprint,
  newSyncCode,
  openState,
  parseSyncCode,
  sealState,
  type SyncKeys
} from '@atlas/core/sync-crypto';
import { isPlainObject, withinDepth } from '@atlas/core/util';
import { readCapacity, relayPaused, relayStatus } from './relay-status.ts';
import {
  adoptNewerStoredCopy,
  adoptState,
  appState,
  getStartingState,
  persistState,
  STORAGE_KEY,
  subscribe,
  wasRecovered
} from './store.ts';

export const SYNC_URL: string = import.meta.env.VITE_SYNC_URL ?? '';
const SETTINGS_KEY = 'nms_master_os_sync'; // { code, version, at }: this device only, never exported
const BASE_KEY = `${STORAGE_KEY}.synced`; // the copy both sides last agreed on
const TIMEOUT_MS = 10_000;
const SAVE_DELAY_MS = 3_000; // after a save, so a burst of edits goes up as one copy
const POLL_MS = 120_000; // while the app is visible, to pick up what another device logged meanwhile
const MAX_ROUNDS = 3; // merges in a row when other devices keep writing first
const MAX_COPY_BYTES = 512 * 1024; // the relay keeps copies up to 256 KB
const MAX_DEPTH = 64; // a log nests about 5 deep
const BEFORE_SYNC_KEY = `${STORAGE_KEY}.before-sync`; // the log as it was before a confirmed big removal

interface Settings {
  code: string;
  version: number; // the cloud version the base copy came from; 0 before the first push
  at: number | null; // the last successful sync
  fresh?: boolean; // a code made here just now: there's no cloud copy to pull yet
  sealed2?: boolean; // the cloud copy has been format 2: from then on a format-1 copy is an old one replayed
}

// 'capacity': the free relay is full for today; 'busy': it isn't taking new players today (relay-status.ts).
// 'unknown': no cloud copy uses the code being paired; 'older': the cloud copy is older than one this device already
// synced (a rollback); 'review': a merge would remove many records, and waits for the person (status.review).
export type SyncProblem =
  'offline' | 'server' | 'gone' | 'damaged' | 'storage' | 'capacity' | 'busy' | 'unknown' | 'older' | 'review';
export interface SyncStatus {
  enabled: boolean;
  busy: boolean;
  at: number | null;
  problem: SyncProblem | null;
  pending: string | null; // a code from a pairing link, waiting for the person to confirm
  fingerprint: string | null; // the vault's short name, the same on every paired device
  review: Removal | null; // what the waiting merge would remove
  restorable: boolean; // a log from before a confirmed removal is kept here
}

// ── Status store (read by More and the header) ──
let status: SyncStatus = {
  enabled: false,
  busy: false,
  at: null,
  problem: null,
  pending: null,
  fingerprint: null,
  review: null,
  restorable: false
};
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
  return (
    problem === 'gone' || problem === 'damaged' || problem === 'storage' || problem === 'older' || problem === 'review'
  );
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
      fresh: parsed.fresh === true,
      sealed2: parsed.sealed2 === true
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
  const capacity = await readCapacity(response);
  if (capacity) throw new SyncError(capacity === 'full' ? 'capacity' : 'busy');
  return response;
}

interface Remote {
  version: number;
  doc: Record<string, unknown>;
  sealed2: boolean;
}
// A copy is trusted only if it opens with this code, was sealed for the version the relay labels it with (format 2),
// is of a sane size and depth, and is a valid log.
async function readRemote(response: Response, sync: SyncKeys, settings: Settings): Promise<Remote> {
  const version = Number(/\d+/.exec(response.headers.get('ETag') ?? '')?.[0]);
  let doc: unknown;
  let sealed2: boolean;
  try {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_COPY_BYTES) throw new Error('copy too large');
    const opened = await openState(sync, bytes);
    if (opened.version !== null && opened.version !== version) throw new Error('relabelled copy');
    // Every write since 3.15 is format 2, so once the cloud has held one, a format-1 copy can only be an old copy
    // the relay kept and served again, which would read as "everything added since was deleted".
    if (opened.version === null && settings.sealed2) throw new Error('replayed format-1 copy');
    sealed2 = opened.version !== null;
    doc = JSON.parse(opened.json);
    if (!withinDepth(doc, MAX_DEPTH)) throw new Error('copy nested too deep');
  } catch (e) {
    logEvent('sync-unreadable', { reason: e instanceof Error ? e.message : errorName(e) });
    throw new SyncError('damaged');
  }
  const check = validateState(doc);
  if (!check.ok || !isPlainObject(doc) || !Number.isSafeInteger(version)) {
    logEvent('sync-invalid', { reason: describeErrors(check.errors) });
    throw new SyncError('damaged');
  }
  return { version, doc, sealed2 };
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

// Set by the person's answer to a waiting review: 'apply' adopts the merge (keeping the log from before), 'keep' sends
// this device's log over the cloud copy instead. Used by the next cycle only.
let decision: 'apply' | 'keep' | null = null;

async function cycle(settings: Settings, started: number): Promise<void> {
  const check = () => {
    stillCurrent(started, settings.code);
  };
  const sync = await keysFor(settings.code);
  check();
  setStatus({ fingerprint: fingerprint(sync.vaultId) });
  const answer = decision;
  decision = null;
  // A first pairing has no common copy yet: the state every device starts from stands in, so starter data removed
  // or changed on one device isn't brought back by another device's untouched copy.
  const base = readBase() ?? (JSON.parse(JSON.stringify(getStartingState())) as unknown);
  let remote: Remote | null = null;
  if (!settings.fresh) {
    const pulled = await call('GET', sync);
    check();
    if (pulled.status === 404 && settings.version > 0) throw new SyncError('gone'); // deleted from another device
    if (pulled.status === 404) {
      // Pairing with a code no device uploaded (a typo, or a stranger's code from a screenshot): never create a
      // vault for it (only "Turn on sync", a code made here, starts one), and go back to the sync this replaced.
      if (replaced) restore(replaced);
      else forget();
      throw new SyncError('unknown');
    }
    if (!pulled.ok) throw new SyncError('server');
    remote = await readRemote(pulled, sync, settings);
    check();
    // The relay served an older copy than this device already synced; "Keep this device's log" overrides it.
    if (remote.version < settings.version && answer !== 'keep') throw new SyncError('older');
  }
  adoptQuietly(adoptNewerStoredCopy); // another tab's save that hasn't reached this one yet

  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Fold in the cloud's changes when it moved on since the base copy. The content is compared too: a vault deleted
    // and recreated starts its versions again, so a matching number alone doesn't prove nothing changed.
    if (remote && answer !== 'keep' && (remote.version !== settings.version || !deepEqual(remote.doc, base))) {
      const before = snapshot();
      const merged = mergeStates(base, before, remote.doc);
      if (!validateState(merged).ok) throw new SyncError('damaged');
      // A merge that would take many records away from this device waits for the person: a damaged or crafted copy
      // mustn't empty the log.
      // Counted from this device's log: what the other side's changes would take away. (This device's own deletions
      // are its owner's doing; a log lost here is handled by dropping the base, in startSync.)
      const removal = removalReport(before, merged);
      if (needsConfirmation(removal)) {
        if (answer !== 'apply') {
          setStatus({ review: removal });
          throw new SyncError('review');
        }
        keepBefore(before);
      }
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
      if (remote.sealed2) settings.sealed2 = true;
      agreed(settings, remote.version, local);
      return;
    }
    const expected = remote?.version ?? 0;
    const body = await sealState(sync, JSON.stringify(local), expected + 1);
    check();
    const pushed = await call('PUT', sync, {
      body,
      headers: { 'If-Match': `"${String(expected)}"`, 'Content-Type': 'application/octet-stream' }
    });
    check();
    if (pushed.ok) {
      settings.sealed2 = true;
      agreed(settings, expected + 1, local);
      return;
    }
    if (pushed.status !== 409) throw new SyncError('server');
    remote = await readRemote(pushed, sync, settings); // another device wrote first: merge with its copy and retry
    check();
    if (remote.version <= expected) throw new SyncError('older'); // a "conflict" can only be a newer copy
  }
  throw new SyncError('server');
}

// The log as it was before a confirmed big removal, so More → Sync can put it back.
function keepBefore(doc: Record<string, unknown>): void {
  try {
    localStorage.setItem(BEFORE_SYNC_KEY, JSON.stringify({ at: new Date().toISOString(), doc }));
    setStatus({ restorable: true });
  } catch (e) {
    logEvent('sync-before-not-kept', { reason: errorName(e) });
    throw new SyncError('storage'); // never remove that much without a way back
  }
}

// The sync a new pairing replaced, kept until the new one is confirmed, so an unknown code doesn't lose it.
let replaced: { settings: Settings; base: string | null } | null = null;
function restore(previous: { settings: Settings; base: string | null }): void {
  replaced = null;
  try {
    writeSettings(previous.settings);
    if (previous.base !== null) localStorage.setItem(BASE_KEY, previous.base);
  } catch {}
}

function forget(): void {
  try {
    writeSettings(null);
    localStorage.removeItem(BASE_KEY);
  } catch {}
}

function agreed(settings: Settings, version: number, doc: Record<string, unknown>): void {
  replaced = null;
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
        setStatus({ problem: null, review: null });
      } catch (e) {
        if (e instanceof Stale) continue; // turned off or re-paired meanwhile; the loop reads the new settings
        const problem = e instanceof SyncError ? e.problem : 'server';
        if (!(e instanceof SyncError)) logEvent('sync-failed', { reason: errorName(e) });
        setStatus({ problem, enabled: readSettings() !== null, ...(problem === 'review' ? {} : { review: null }) });
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
    const previous = readSettings();
    replaced =
      previous && !fresh && previous.code !== code
        ? { settings: previous, base: localStorage.getItem(BASE_KEY) }
        : null;
    localStorage.removeItem(BASE_KEY); // a new pairing has no common history yet
    writeSettings({ code, version: 0, at: null, ...(fresh && { fresh }) });
  } catch (e) {
    logEvent('sync-settings-not-saved', { reason: errorName(e) });
    setStatus({ problem: 'storage' });
    return Promise.resolve();
  }
  return syncNow();
}

// The person's answer to a waiting review (status.review).
export function answerReview(answer: 'apply' | 'keep'): Promise<void> {
  decision = answer;
  setStatus({ review: null });
  return syncNow();
}

// Puts back the log kept before a confirmed removal. It counts as a new edit, so the next sync sends it everywhere.
export function restoreBeforeSync(): boolean {
  try {
    const kept: unknown = JSON.parse(localStorage.getItem(BEFORE_SYNC_KEY) ?? 'null');
    if (!isPlainObject(kept) || !validateState(kept.doc).ok) return false;
    adoptState(buildState(kept.doc));
    if (!persistState()) return false;
    localStorage.removeItem(BEFORE_SYNC_KEY);
    setStatus({ restorable: false });
    return true;
  } catch {
    return false;
  }
}

// After an import: forget the common copy, so the next sync combines the imported log with the synced one (as a first
// pairing does) rather than reading what the file lacks as deletions to send to every device.
export function resetSyncBase(): void {
  try {
    localStorage.removeItem(BASE_KEY);
  } catch {}
}

export function syncCode(): string | null {
  return readSettings()?.code ?? null;
}

// This device stops syncing; the cloud copy and other devices are untouched.
export function turnOffSync(): void {
  epoch += 1;
  decision = null;
  forget();
  keys = null;
  setStatus({ enabled: false, busy: false, at: null, problem: null, fingerprint: null, review: null });
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
  // The log here was unreadable and fell back to defaults: without the base, the next sync combines both copies (as
  // a first pairing does) and so restores the cloud's, instead of reading the empty log as deletions to send.
  try {
    if (wasRecovered()) localStorage.removeItem(BASE_KEY);
    setStatus({ restorable: localStorage.getItem(BEFORE_SYNC_KEY) !== null });
  } catch {} // storage blocked: sync can't run anyway, and the rest of the page must still start
  const refresh = () => {
    const settings = readSettings();
    setStatus({ enabled: settings !== null, at: settings?.at ?? null, ...(settings ? {} : { problem: null }) });
  };
  refresh();
  // Turned on, paired or off in another tab: show it here too.
  window.addEventListener('storage', event => {
    if (event.key === SETTINGS_KEY) refresh();
  });
  // Automatic syncs wait while the relay is full for the day; "Sync now" still tries.
  const autoSync = () => {
    if (!status.enabled || status.problem === 'review') return; // a review waits for the person's answer
    if (relayPaused()) setStatus({ problem: relayStatus().capacity === 'full' ? 'capacity' : 'busy' });
    else void syncNow();
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  subscribe(() => {
    if (applying || !status.enabled) return;
    clearTimeout(timer);
    timer = setTimeout(autoSync, SAVE_DELAY_MS);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') autoSync();
  });
  window.addEventListener('online', autoSync);
  setInterval(() => {
    if (document.visibilityState === 'visible') autoSync();
  }, POLL_MS);
  autoSync();
}
