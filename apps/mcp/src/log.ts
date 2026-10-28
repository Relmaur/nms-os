// The player's own log, read-only (ADR-0008), from one of two places the player chooses in the MCP client's config:
//   ATLAS_SYNC_CODE   the sync code from More → Sync: the sealed copy is fetched from the relay (GET only) and opened
//                     here, with the same code as the app (@atlas/core/sync-crypto); the relay still sees ciphertext.
//   ATLAS_STATE_FILE  an exported nms_state.json: nothing leaves the computer.
// Either way the log goes through the same checks as an import or a synced copy before any tool reads it.
import fs from 'node:fs/promises';
import { deriveSyncKeys, openState, parseSyncCode, type SyncKeys } from '@atlas/core/sync-crypto';
import { validateState, describeErrors } from '@atlas/core/schema';
import { buildState, migrateLegacyState, type AppState } from '@atlas/core/state';
import { isPlainObject, withinDepth } from '@atlas/core/util';

// The relay the web app syncs with (apps/web/.env, VITE_SYNC_URL).
export const DEFAULT_SYNC_URL = 'https://atlas-sync.atlas-companion.workers.dev';
const TIMEOUT_MS = 15_000;
const MAX_COPY_BYTES = 512 * 1024; // as the app: the relay refuses copies over 256 KB
const MAX_FILE_BYTES = 5 * 1024 * 1024; // as Import
const MAX_DEPTH = 64;
export const CACHE_MS = 60_000; // one fetch serves a burst of tool calls; a minute-old log is fresh enough to answer from

export class LogError extends Error {}

export type LogSource = { kind: 'sync'; code: string; url: string } | { kind: 'file'; path: string };

// Reads the client's config. A code that isn't one is an error, not a silent fallback to the file.
export function logSourceFromEnv(env: Record<string, string | undefined>): LogSource | null {
  const raw = env.ATLAS_SYNC_CODE?.trim();
  if (raw) {
    const code = parseSyncCode(raw);
    if (!code) throw new LogError('ATLAS_SYNC_CODE isn’t a sync code: copy it again from More → Sync.');
    const url = (env.ATLAS_SYNC_URL?.trim() || DEFAULT_SYNC_URL).replace(/\/+$/, '');
    if (!/^https:\/\//.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url))
      throw new LogError('ATLAS_SYNC_URL must be an https address.');
    return { kind: 'sync', code, url };
  }
  const file = env.ATLAS_STATE_FILE?.trim();
  return file ? { kind: 'file', path: file } : null;
}

function checked(raw: unknown): AppState {
  if (!withinDepth(raw, MAX_DEPTH)) throw new LogError('The log is nested too deeply to be an ATLAS log.');
  const doc = isPlainObject(raw) ? migrateLegacyState(raw) : raw; // as Import: an old export keeps its systems
  const check = validateState(doc);
  if (!check.ok || !isPlainObject(doc))
    throw new LogError(`This isn’t a valid ATLAS log: ${describeErrors(check.errors)}`);
  return buildState(doc);
}

async function fromRelay(keys: SyncKeys, url: string, fetcher: typeof fetch): Promise<AppState> {
  let response: Response;
  try {
    response = await fetcher(`${url}/v1/vaults/${keys.vaultId}`, {
      method: 'GET', // never anything else: this server only reads (a test holds it to that)
      headers: { Authorization: `Bearer ${keys.token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch {
    throw new LogError('The sync server couldn’t be reached. Check the connection, or use ATLAS_STATE_FILE.');
  }
  if (response.status === 404) throw new LogError('No synced copy for this code: turn on sync in the app first.');
  if (response.status === 401) throw new LogError('This sync code is no longer valid (sync was turned off or reset).');
  if (response.status === 429) throw new LogError('The sync server asked to slow down: try again in a minute.');
  if (!response.ok) throw new LogError(`The sync server is unavailable right now (HTTP ${String(response.status)}).`);
  const version = Number(/\d+/.exec(response.headers.get('ETag') ?? '')?.[0]);
  // Without its version label a copy can't be checked against what it was sealed for (as the app, it's refused).
  if (!Number.isSafeInteger(version)) throw new LogError('The synced copy is damaged (no version).');
  if (Number(response.headers.get('Content-Length')) > MAX_COPY_BYTES)
    throw new LogError('The synced copy is too large to be an ATLAS log.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_COPY_BYTES) throw new LogError('The synced copy is too large to be an ATLAS log.');
  let doc: unknown;
  try {
    const opened = await openState(keys, bytes);
    // Sealed for another version than the relay labels it: a copy served out of turn, as the app refuses it.
    if (opened.version !== null && opened.version !== version) throw new Error('relabelled copy');
    doc = JSON.parse(opened.json);
  } catch {
    throw new LogError('The synced copy doesn’t open with this code, or is damaged.');
  }
  return checked(doc);
}

async function fromFile(file: string): Promise<AppState> {
  let text: string;
  try {
    const { size } = await fs.stat(file);
    if (size > MAX_FILE_BYTES) throw new LogError('ATLAS_STATE_FILE is over 5 MB: that isn’t an ATLAS export.');
    text = await fs.readFile(file, 'utf8');
  } catch (err) {
    if (err instanceof LogError) throw err;
    throw new LogError(`ATLAS_STATE_FILE can’t be read (${file}).`);
  }
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new LogError('ATLAS_STATE_FILE isn’t JSON: export it again from More → Your data.');
  }
  return checked(doc);
}

// One loader per server. Tool calls made together share one read; a failed read isn't cached, so the next call
// tries again.
export function makeLogLoader(
  source: LogSource,
  { fetcher = fetch, now = Date.now }: { fetcher?: typeof fetch; now?: () => number } = {}
): () => Promise<AppState> {
  let keys: Promise<SyncKeys> | null = null;
  let cached: { at: number; state: AppState } | null = null;
  let reading: Promise<AppState> | null = null;
  const read = async () => {
    if (source.kind === 'file') return fromFile(source.path);
    keys ??= deriveSyncKeys(source.code);
    return fromRelay(await keys, source.url, fetcher);
  };
  return () => {
    if (cached && now() - cached.at < CACHE_MS) return Promise.resolve(cached.state);
    reading ??= read()
      .then(state => {
        cached = { at: now(), state };
        return state;
      })
      .finally(() => {
        reading = null;
      });
    return reading;
  };
}
