import { beforeEach, expect, test } from 'vitest';
import { handle, MAX_BLOB_BYTES, type Capacity, type Options, type Vault, type VaultStore } from '../src/handler.ts';
import { deriveSyncKeys, newSyncCode, type SyncKeys } from '@atlas/core/sync-crypto';

const ORIGIN = 'https://relmaur.github.io';

function memoryStore(): VaultStore & { vaults: Map<string, Vault & { updatedAt: number }> } {
  const vaults = new Map<string, Vault & { updatedAt: number }>();
  return {
    vaults,
    get: id => Promise.resolve(vaults.get(id) ?? null),
    create(id, tokenHash, blob, now) {
      if (vaults.has(id)) return Promise.resolve(false);
      vaults.set(id, { tokenHash, version: 1, blob, updatedAt: now });
      return Promise.resolve(true);
    },
    update(id, tokenHash, version, blob, now) {
      const vault = vaults.get(id);
      if (vault?.version !== version || vault.tokenHash !== tokenHash) return Promise.resolve(false);
      vaults.set(id, { ...vault, version: version + 1, blob, updatedAt: now });
      return Promise.resolve(true);
    },
    remove(id, tokenHash) {
      if (vaults.get(id)?.tokenHash === tokenHash) vaults.delete(id);
      return Promise.resolve();
    },
    touch(id, now) {
      const vault = vaults.get(id);
      if (vault) vault.updatedAt = now;
      return Promise.resolve();
    }
  };
}

let store: ReturnType<typeof memoryStore>;
let keys: SyncKeys;
beforeEach(async () => {
  store = memoryStore();
  keys = await deriveSyncKeys(newSyncCode());
});

const call = (
  method: string,
  init: {
    body?: Uint8Array<ArrayBuffer>;
    version?: number;
    token?: string;
    origin?: string;
    options?: Partial<Options>;
  } = {}
) =>
  handle(
    new Request(`https://atlas-sync.example.workers.dev/v1/vaults/${keys.vaultId}`, {
      method,
      headers: {
        Origin: init.origin ?? ORIGIN,
        Authorization: `Bearer ${init.token ?? keys.token}`,
        ...(init.version !== undefined && { 'If-Match': `"${String(init.version)}"` })
      },
      ...(init.body && { body: init.body })
    }),
    store,
    { origins: [ORIGIN], now: () => 1000, ...init.options }
  );
const bytes = (...values: number[]) => new Uint8Array(values);

test('a vault is created at version 1, read back, and moves on one version per write', async () => {
  expect((await call('GET')).status).toBe(404);
  const created = await call('PUT', { body: bytes(1, 2, 3), version: 0 });
  expect(created.status).toBe(200);
  expect(await created.json()).toEqual({ version: 1 });
  expect(created.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  expect(created.headers.get('Access-Control-Expose-Headers')).toBe('ETag, Retry-After');

  const read = await call('GET');
  expect(read.headers.get('ETag')).toBe('"1"');
  expect(new Uint8Array(await read.arrayBuffer())).toEqual(bytes(1, 2, 3));

  expect((await call('PUT', { body: bytes(4), version: 1 })).headers.get('ETag')).toBe('"2"');
  expect(store.vaults.get(keys.vaultId)?.blob).toEqual(bytes(4));
  expect(store.vaults.get(keys.vaultId)?.tokenHash).not.toBe(keys.token); // only a hash is kept
});

test('a write against an old version gets 409 with the current copy, so the client can merge', async () => {
  await call('PUT', { body: bytes(1), version: 0 });
  await call('PUT', { body: bytes(2), version: 1 });
  const stale = await call('PUT', { body: bytes(3), version: 1 });
  expect(stale.status).toBe(409);
  expect(stale.headers.get('ETag')).toBe('"2"');
  expect(new Uint8Array(await stale.arrayBuffer())).toEqual(bytes(2));
  expect((await call('PUT', { body: bytes(3), version: 0 })).status).toBe(409); // creating twice
});

test('another token is refused everywhere, and a missing one too', async () => {
  await call('PUT', { body: bytes(1), version: 0 });
  const other = (await deriveSyncKeys(newSyncCode())).token;
  expect((await call('GET', { token: other })).status).toBe(401);
  expect((await call('PUT', { body: bytes(9), version: 1, token: other })).status).toBe(401);
  expect((await call('DELETE', { token: other })).status).toBe(401);
  expect((await call('GET', { token: 'nope' })).status).toBe(401);
  expect(store.vaults.get(keys.vaultId)?.blob).toEqual(bytes(1));
});

test('writes need a version and a body no larger than the cap', async () => {
  expect((await call('PUT', { body: bytes(1) })).status).toBe(428);
  expect((await call('PUT', { body: new Uint8Array(0), version: 0 })).status).toBe(400);
  expect((await call('PUT', { body: new Uint8Array(MAX_BLOB_BYTES + 1), version: 0 })).status).toBe(413);
  expect(store.vaults.size).toBe(0);
});

test('Delete removes the cloud copy', async () => {
  await call('PUT', { body: bytes(1), version: 0 });
  expect((await call('DELETE')).status).toBe(204);
  expect(store.vaults.size).toBe(0);
  expect((await call('GET')).status).toBe(404);
});

test('other sites are refused; the app’s origin gets a preflight answer', async () => {
  expect((await call('GET', { origin: 'https://evil.example' })).status).toBe(403);
  const preflight = await handle(
    new Request(`https://atlas-sync.example.workers.dev/v1/vaults/${keys.vaultId}`, {
      method: 'OPTIONS',
      headers: { Origin: ORIGIN }
    }),
    store,
    { origins: [ORIGIN] }
  );
  expect(preflight.status).toBe(204);
  expect(preflight.headers.get('Access-Control-Allow-Headers')).toContain('If-Match');
});

test('unknown paths are 404, and a client over its budget gets 429', async () => {
  const request = (path: string) => new Request(`https://atlas-sync.example.workers.dev${path}`);
  expect((await handle(request('/v1/vaults/short'), store, { origins: [] })).status).toBe(404);
  expect((await handle(request('/'), store, { origins: [] })).status).toBe(404);
  const limited = await handle(request(`/v1/vaults/${keys.vaultId}`), store, {
    origins: [],
    allow: () => Promise.resolve(false)
  });
  expect(limited.status).toBe(429);
});

const at = (state: Capacity['state'], storageFull = false) => ({
  capacity: () => Promise.resolve({ state, storageFull })
});

test('busy: new vaults are turned away, existing ones keep syncing', async () => {
  await call('PUT', { body: bytes(1), version: 0 });
  const busy = at('busy');
  expect((await call('PUT', { body: bytes(2), version: 1, options: busy })).status).toBe(200);
  expect((await call('GET', { options: busy })).status).toBe(200);
  keys = await deriveSyncKeys(newSyncCode());
  const refused = await call('PUT', { body: bytes(1), version: 0, options: busy });
  expect(refused.status).toBe(503);
  expect(await refused.json()).toEqual({ capacity: 'busy' });
  expect((await call('PUT', { body: bytes(1), version: 0, options: at('ok', true) })).status).toBe(503); // out of room
});

test('full: everyone gets a clear 503 until midnight UTC, with CORS; deleting still works', async () => {
  await call('PUT', { body: bytes(1), version: 0 });
  const full = { ...at('full'), now: () => Date.parse('2026-10-27T23:00:00Z') };
  const response = await call('GET', { options: full });
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ capacity: 'full' });
  expect(response.headers.get('Retry-After')).toBe('3600');
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  expect(response.headers.get('Access-Control-Expose-Headers')).toContain('Retry-After');
  expect((await call('DELETE', { options: full })).status).toBe(204);
  expect(store.vaults.size).toBe(0);
});

test('a failing database answers 503 with CORS, not an error page', async () => {
  const broken = { ...store, get: () => Promise.reject(new Error('D1_ERROR: daily limit')) };
  const response = await handle(
    new Request(`https://atlas-sync.example.workers.dev/v1/vaults/${keys.vaultId}`, {
      headers: { Origin: ORIGIN, Authorization: `Bearer ${keys.token}` }
    }),
    broken,
    { origins: [ORIGIN] }
  );
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ capacity: 'unavailable' });
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
});

test('new vaults draw on their own, smaller budget; the status summary needs no token', async () => {
  const kinds: string[] = [];
  const allow = (_key: string, kind: string) => {
    kinds.push(kind);
    return Promise.resolve(kind !== 'create');
  };
  expect((await call('PUT', { body: bytes(1), version: 0, options: { allow } })).status).toBe(429);
  expect(kinds).toEqual(['any', 'create']);
  const status = await handle(new Request('https://atlas-sync.example.workers.dev/v1/status'), store, {
    origins: [],
    status: () => Promise.resolve({ plan: 'free', days: [] })
  });
  expect(await status.json()).toEqual({ plan: 'free', days: [] });
});

test('a body sent without Content-Length is still cut at the cap', async () => {
  const big = new Uint8Array(MAX_BLOB_BYTES + 1);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(big.subarray(0, 100_000));
      controller.enqueue(big.subarray(100_000));
      controller.close();
    }
  });
  const response = await handle(
    new Request(`https://atlas-sync.example.workers.dev/v1/vaults/${keys.vaultId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${keys.token}`, 'If-Match': '"0"' },
      body: stream,
      // @ts-expect-error -- streaming request bodies need this flag (Node/undici); the Workers types don't list it
      duplex: 'half'
    }),
    store,
    { origins: [] }
  );
  expect(response.status).toBe(413);
  expect(store.vaults.size).toBe(0);
});

test('the relay answers the same under the site’s /api/sync path', async () => {
  const at = (path: string) =>
    handle(new Request(`https://atlas-os.cloud${path}`), store, {
      origins: [],
      status: () => Promise.resolve({ plan: 'free', days: [] })
    });
  expect((await at('/api/sync/v1/status')).status).toBe(200);
  expect((await at('/api/synced/v1/status')).status).toBe(404);
});
