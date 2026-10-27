// The relay's HTTP API, over small storage interfaces so it's tested without Cloudflare. Sync (ADR-0005): one sealed
// copy per vault and a version for compare-and-swap; it can't open the copy. Push (ADR-0006, src/push.ts): a device's
// push subscription and its timers' end times. It never logs ids, tokens or bodies.
import { hashToken } from '@atlas/core/sync-crypto';
import { handlePush, type PushStore } from './push.ts';

export const MAX_BLOB_BYTES = 1024 * 1024;
const VAULT_PATH = /^\/v1\/vaults\/([A-Za-z0-9_-]{22})$/;
const PUSH_PATH = /^\/v1\/push\/([A-Za-z0-9_-]{22})$/;

export interface Vault {
  tokenHash: string;
  version: number;
  blob: Uint8Array<ArrayBuffer>;
}

export interface VaultStore {
  get(id: string): Promise<Vault | null>;
  // Both return false when the vault already exists (create) or moved on since `version` (update).
  create(id: string, tokenHash: string, blob: Uint8Array<ArrayBuffer>, now: number): Promise<boolean>;
  update(id: string, version: number, blob: Uint8Array<ArrayBuffer>, now: number): Promise<boolean>;
  remove(id: string): Promise<void>;
  // A read counts as use for the yearly purge (an unchanged log still syncs); stores may record it at most daily.
  touch(id: string, now: number): Promise<void>;
}

export interface Options {
  origins: string[];
  // Per-client request budget; true when the request may go ahead.
  allow?: (key: string) => Promise<boolean>;
  now?: () => number;
  push?: PushStore;
}

export async function handle(request: Request, store: VaultStore, options: Options): Promise<Response> {
  const origin = request.headers.get('Origin');
  if (origin && !options.origins.includes(origin)) return new Response(null, { status: 403 });
  const cors: Record<string, string> = origin
    ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Expose-Headers': 'ETag', Vary: 'Origin' }
    : {};
  const reply = (status: number, body: BodyInit | null = null, headers: Record<string, string> = {}) =>
    new Response(body, { status, headers: { ...cors, 'Cache-Control': 'no-store', ...headers } });

  if (request.method === 'OPTIONS')
    return reply(204, null, {
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Authorization, If-Match, Content-Type',
      'Access-Control-Max-Age': '86400'
    });

  const path = new URL(request.url).pathname;
  const pushId = options.push ? PUSH_PATH.exec(path)?.[1] : undefined;
  const id = pushId ?? VAULT_PATH.exec(path)?.[1];
  if (!id) return reply(404);
  if (options.allow && !(await options.allow(request.headers.get('CF-Connecting-IP') ?? id))) return reply(429);
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get('Authorization') ?? '')?.[1];
  if (!token) return reply(401);
  const tokenHash = await hashToken(token);
  const now = (options.now ?? Date.now)();
  if (pushId && options.push) return handlePush(request, pushId, tokenHash, options.push, reply, now);
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
      if (vault) await store.remove(id);
      return reply(204);
    case 'PUT': {
      const expected = Number(/^"?(\d+)"?$/.exec(request.headers.get('If-Match') ?? '')?.[1] ?? NaN);
      if (!Number.isSafeInteger(expected)) return reply(428);
      if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BLOB_BYTES) return reply(413);
      const blob = new Uint8Array(await request.arrayBuffer());
      if (blob.length > MAX_BLOB_BYTES) return reply(413);
      if (!blob.length) return reply(400);
      const written =
        expected === 0 ? await store.create(id, tokenHash, blob, now) : await store.update(id, expected, blob, now);
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
