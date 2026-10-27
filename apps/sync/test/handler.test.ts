import { beforeEach, expect, test } from 'vitest';
import { handle, MAX_BLOB_BYTES, type Vault, type VaultStore } from '../src/handler.ts';
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
    update(id, version, blob, now) {
      const vault = vaults.get(id);
      if (vault?.version !== version) return Promise.resolve(false);
      vaults.set(id, { ...vault, version: version + 1, blob, updatedAt: now });
      return Promise.resolve(true);
    },
    remove(id) {
      vaults.delete(id);
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
  init: { body?: Uint8Array<ArrayBuffer>; version?: number; token?: string; origin?: string } = {}
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
    { origins: [ORIGIN], now: () => 1000 }
  );
const bytes = (...values: number[]) => new Uint8Array(values);

test('a vault is created at version 1, read back, and moves on one version per write', async () => {
  expect((await call('GET')).status).toBe(404);
  const created = await call('PUT', { body: bytes(1, 2, 3), version: 0 });
  expect(created.status).toBe(200);
  expect(await created.json()).toEqual({ version: 1 });
  expect(created.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  expect(created.headers.get('Access-Control-Expose-Headers')).toBe('ETag');

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

test('writes need a version and a body no larger than 1 MB', async () => {
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
