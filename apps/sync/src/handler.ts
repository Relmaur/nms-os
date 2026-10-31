// The relay's HTTP API, over small storage interfaces so it's tested without Cloudflare. Sync (ADR-0005): one sealed
// copy per vault and a version for compare-and-swap; it can't open the copy. Push (ADR-0006, src/push.ts): a device's
// push subscription and its timers' end times. Guardrails (src/capacity.ts): per-client rate limits, stricter ones for
// new vaults and devices, and a capacity state that turns new players away when busy and answers everyone with a
// clear "full until midnight UTC" before Cloudflare's own hard stop. It never logs ids, tokens or bodies.
import { hashToken } from '@atlas/core/sync-crypto';
import { handlePush, type PushStore } from './push.ts';
import { clientKey, readCapped, secondsToMidnightUtc, type CapacityState } from './capacity.ts';

// A sealed log is ~1 KB gzipped today; a very large one stays well under 100 KB.
export const MAX_BLOB_BYTES = 256 * 1024;
const VAULT_PATH = /^\/v1\/vaults\/([A-Za-z0-9_-]{22})$/;
const PUSH_PATH = /^\/v1\/push\/([A-Za-z0-9_-]{22})$/;

export interface Vault {
  tokenHash: string;
  version: number;
  blob: Uint8Array<ArrayBuffer>;
}

export interface VaultStore {
  get(id: string): Promise<Vault | null>;
  // Both return false when the vault already exists (create) or moved on since `version` (update). Update and remove
  // apply to the owner's vault only (`tokenHash`), whatever was read before.
  create(id: string, tokenHash: string, blob: Uint8Array<ArrayBuffer>, now: number): Promise<boolean>;
  update(id: string, tokenHash: string, version: number, blob: Uint8Array<ArrayBuffer>, now: number): Promise<boolean>;
  remove(id: string, tokenHash: string): Promise<void>;
  // A read counts as use for the yearly purge (an unchanged log still syncs); stores may record it at most daily.
  touch(id: string, now: number): Promise<void>;
}

// Which budget a request draws on: every request, registering something new, or sending a push schedule.
export type LimitKind = 'any' | 'create' | 'push';
export interface Capacity {
  state: CapacityState;
  storageFull: boolean;
}

export interface Options {
  origins: string[];
  // Per-client request budgets; true when the request may go ahead.
  allow?: (key: string, kind: LimitKind) => Promise<boolean>;
  capacity?: () => Promise<Capacity>;
  status?: () => Promise<unknown>; // the public usage summary (aggregate numbers only)
  now?: () => number;
  push?: PushStore;
}

type Reply = (status: number, body?: BodyInit | null, headers?: Record<string, string>) => Response;

export async function handle(request: Request, store: VaultStore, options: Options): Promise<Response> {
  const origin = request.headers.get('Origin');
  if (origin && !options.origins.includes(origin)) return new Response(null, { status: 403 });
  const cors: Record<string, string> = origin
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Expose-Headers': 'ETag, Retry-After',
        Vary: 'Origin'
      }
    : {};
  const reply: Reply = (status, body = null, headers = {}) =>
    new Response(body, { status, headers: { ...cors, 'Cache-Control': 'no-store', ...headers } });
  try {
    return await route(request, store, options, reply);
  } catch {
    // D1 refusing (its daily quota, an outage) or anything unexpected: a clear answer the app can show, with CORS.
    return reply(503, JSON.stringify({ capacity: 'unavailable' }), { 'Content-Type': 'application/json' });
  }
}

async function route(request: Request, store: VaultStore, options: Options, reply: Reply): Promise<Response> {
  if (request.method === 'OPTIONS')
    return reply(204, null, {
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Authorization, If-Match, Content-Type',
      'Access-Control-Max-Age': '86400'
    });

  const now = (options.now ?? Date.now)();
  const key = clientKey(request.headers.get('CF-Connecting-IP') ?? 'unknown');
  const allowed = (kind: LimitKind) => (options.allow ? options.allow(key, kind) : Promise.resolve(true));
  if (!(await allowed('any'))) return reply(429);

  // The same relay answers on workers.dev (installed apps, published MCP servers) and at atlas-os.cloud/api/sync/*.
  const path = new URL(request.url).pathname.replace(/^\/api\/sync(?=\/)/, '');
  if (path === '/v1/status' && request.method === 'GET' && options.status)
    return reply(200, JSON.stringify(await options.status()), { 'Content-Type': 'application/json' });

  const pushId = options.push ? PUSH_PATH.exec(path)?.[1] : undefined;
  const id = pushId ?? VAULT_PATH.exec(path)?.[1];
  if (!id) return reply(404);
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get('Authorization') ?? '')?.[1];
  if (!token) return reply(401);

  // Full: everyone hears it plainly and waits for midnight UTC, except to delete (always honoured).
  const capacity: Capacity = options.capacity ? await options.capacity() : { state: 'ok', storageFull: false };
  const refuse = (state: 'busy' | 'full') =>
    reply(503, JSON.stringify({ capacity: state }), {
      'Content-Type': 'application/json',
      'Retry-After': String(secondsToMidnightUtc(now))
    });
  if (capacity.state === 'full' && request.method !== 'DELETE') return refuse('full');
  // Something new (a vault, a push device): turned away when busy or out of room, and on its own stricter budget.
  const admitNew = async (): Promise<Response | null> => {
    if (capacity.state !== 'ok' || capacity.storageFull) return refuse('busy');
    return (await allowed('create')) ? null : reply(429);
  };

  const tokenHash = await hashToken(token);
  if (pushId && options.push) {
    if (request.method === 'PUT' && !(await allowed('push'))) return reply(429);
    return handlePush(request, pushId, tokenHash, options.push, reply, now, admitNew);
  }
  const sealed = (vault: Vault, status = 200) =>
    reply(status, vault.blob, { 'Content-Type': 'application/octet-stream', ETag: `"${String(vault.version)}"` });

  const vault = await store.get(id);
  if (vault && vault.tokenHash !== tokenHash) return reply(401);

  switch (request.method) {
    case 'GET':
      if (!vault) return reply(404);
      await store.touch(id, now);
      return sealed(vault);
    case 'DELETE':
      if (vault) await store.remove(id, tokenHash);
      return reply(204);
    case 'PUT': {
      const expected = Number(/^"?(\d+)"?$/.exec(request.headers.get('If-Match') ?? '')?.[1] ?? NaN);
      if (!Number.isSafeInteger(expected)) return reply(428);
      const blob = await readCapped(request, MAX_BLOB_BYTES);
      if (!blob) return reply(413);
      if (!blob.length) return reply(400);
      if (expected === 0 && !vault) {
        const refused = await admitNew();
        if (refused) return refused;
      }
      const written =
        expected === 0
          ? await store.create(id, tokenHash, blob, now)
          : await store.update(id, tokenHash, expected, blob, now);
      if (written) {
        const version = expected + 1;
        return reply(200, JSON.stringify({ version }), {
          'Content-Type': 'application/json',
          ETag: `"${String(version)}"`
        });
      }
      // Another device wrote first: send its copy back so the client merges without another round trip.
      const current = await store.get(id);
      if (!current) return reply(404);
      return current.tokenHash === tokenHash ? sealed(current, 409) : reply(401);
    }
    default:
      return reply(405, null, { Allow: 'GET, PUT, DELETE, OPTIONS' });
  }
}
