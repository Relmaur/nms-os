import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { normalizeSystem } from '@atlas/core/systems-model';
import { deriveSyncKeys, newSyncCode, sealState } from '@atlas/core/sync-crypto';
import { appState, setAppState } from '../../app/store.ts';
import { pairWith, syncCode, syncNow, turnOffSync } from '../../app/sync.ts';
import { handle, type Vault, type VaultStore } from '../../../../sync/src/handler.ts';
import { Sync } from './Sync.tsx';

// The real relay handler over an in-memory store stands in for the Worker, so sealing, versions and merges all run.
const vaults = new Map<string, Vault>();
const store: VaultStore = {
  get: id => Promise.resolve(vaults.get(id) ?? null),
  create(id, tokenHash, blob) {
    if (vaults.has(id)) return Promise.resolve(false);
    vaults.set(id, { tokenHash, version: 1, blob });
    return Promise.resolve(true);
  },
  update(id, tokenHash, version, blob) {
    const vault = vaults.get(id);
    if (vault?.version !== version || vault.tokenHash !== tokenHash) return Promise.resolve(false);
    vaults.set(id, { ...vault, version: version + 1, blob });
    return Promise.resolve(true);
  },
  remove(id, tokenHash) {
    if (vaults.get(id)?.tokenHash === tokenHash) vaults.delete(id);
    return Promise.resolve();
  },
  touch: () => Promise.resolve()
};

const SYNC = import.meta.env.VITE_SYNC_URL;
const withSystems = (...names: string[]) => buildState({ systems: names.map(name => normalizeSystem({ name })) });

beforeEach(() => {
  vaults.clear();
  localStorage.clear();
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => handle(new Request(url, init), store, { origins: [] }));
  act(() => {
    turnOffSync();
    setAppState(withSystems('Ekwa Nexus'));
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const status = () => document.getElementById('syncStatus')?.textContent ?? '';

test('turning sync on uploads a sealed copy and shows when it last synced', async () => {
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await expect.poll(status).toMatch(/synced just now/i);
  expect(vaults.size).toBe(1);
  const [vault] = [...vaults.values()];
  expect(new TextDecoder().decode(vault?.blob)).not.toContain('Ekwa'); // the relay can't read it
  expect(status()).toMatch(/Copy ID [0-9A-F]{4}-[0-9A-F]{4}/);
  // This device wrote itself into the log it synced, and lists itself.
  expect(appState.devices).toHaveLength(1);
  expect(screen.getByRole('list', { name: 'Devices' }).textContent).toContain('This device');
  expect(screen.queryByRole('img', { name: /QR code/ })).toBeNull(); // not until asked, with a warning first
  expect(document.getElementById('syncCodeCard')?.textContent).toMatch(/stream/);
  await userEvent.click(screen.getByRole('button', { name: 'Show pairing code' }));
  expect(screen.getByRole('img', { name: /QR code/ })).toBeTruthy();
  expect(document.getElementById('syncCodeCard')?.textContent).toContain(syncCode() ?? 'missing');
});

test('pairing with a code merges both logs; a later edit on either side reaches the other', async () => {
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await expect.poll(status).toMatch(/synced/i);
  const code = syncCode() ?? '';

  // Another device: its own log, the same code.
  act(() => {
    turnOffSync();
    setAppState(withSystems('Hilbert Dimension'));
  });
  await userEvent.click(screen.getByRole('button', { name: 'I have a code' }));
  await userEvent.type(screen.getByLabelText(/sync code from your other device/), `#pair=${code}`);
  await userEvent.click(screen.getByRole('button', { name: 'Pair' }));
  await expect.poll(status).toMatch(/synced/i);
  expect(appState.systems.map(system => system.name).sort()).toEqual(['Ekwa Nexus', 'Hilbert Dimension']);
  expect([...vaults.values()][0]?.version).toBe(2);

  // Meanwhile the first device logs a new system and syncs; this one edits a note. Both survive.
  const keys = await deriveSyncKeys(code);
  const first = buildState(structuredClone(appState));
  first.systems.push(normalizeSystem({ name: 'Calypso' }));
  const vault = vaults.get(keys.vaultId)!;
  vaults.set(keys.vaultId, { ...vault, version: 3, blob: await sealState(keys, JSON.stringify(first), 3) });
  appState.systems[0]!.notes = 'edited here';
  await act(() => syncNow());
  expect(appState.systems.map(system => system.name).sort()).toEqual(['Calypso', 'Ekwa Nexus', 'Hilbert Dimension']);
  expect(appState.systems[0]?.notes).toBe('edited here');
  expect(vaults.get(keys.vaultId)?.version).toBe(4);
});

test('a mistyped code is refused without sending anything', async () => {
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'I have a code' }));
  await userEvent.type(screen.getByLabelText(/sync code from your other device/), 'abc');
  await userEvent.click(screen.getByRole('button', { name: 'Pair' }));
  expect(screen.getByText(/That isn’t a sync code/)).toBeTruthy();
  expect(vaults.size).toBe(0);
});

test('Delete the cloud copy asks first, removes it, and turns sync off here', async () => {
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await expect.poll(status).toMatch(/synced/i);
  await userEvent.click(screen.getByRole('button', { name: 'Delete the cloud copy' }));
  expect(vaults.size).toBe(1); // armed, not yet deleted
  await userEvent.click(screen.getByRole('button', { name: /Tap again to delete/ }));
  await expect.poll(() => vaults.size).toBe(0);
  expect(await screen.findByRole('button', { name: 'Turn on sync' })).toBeTruthy();
  expect(appState.systems.map(system => system.name)).toEqual(['Ekwa Nexus']); // the log stays
});

test('an unreachable relay leaves the log alone and says so', async () => {
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await expect.poll(status).toMatch(/synced/i);
  vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  appState.systems[0]!.notes = 'kept';
  await act(() => syncNow());
  expect(status()).toMatch(/Couldn’t reach the sync server/);
  expect(appState.systems[0]?.notes).toBe('kept');
});

test('a fresh device pairing takes the other log as it is: starter data removed there stays removed', async () => {
  const main = buildState(); // the built-in starter log, then the player's own changes
  main.systems = [normalizeSystem({ id: 'sys-real', name: 'Real System' })];
  main.checklists.nutrientIngestorInstalled = true;
  main.outlaw.runSize = 9;
  act(() => {
    setAppState(main);
  });
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await expect.poll(status).toMatch(/synced/i);
  const code = syncCode() ?? '';

  act(() => {
    turnOffSync();
    setAppState(buildState()); // a new phone: only the starter log
  });
  await userEvent.click(screen.getByRole('button', { name: 'I have a code' }));
  await userEvent.type(screen.getByLabelText(/sync code from your other device/), code);
  await userEvent.click(screen.getByRole('button', { name: 'Pair' }));
  await expect.poll(status).toMatch(/synced/i);
  expect(appState.systems.map(system => system.id)).toEqual(['sys-real']);
  expect(appState.checklists.nutrientIngestorInstalled).toBe(true);
  expect(appState.outlaw.runSize).toBe(9);
});

test('turning sync off while a sync is under way sends nothing more and stays off', async () => {
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await expect.poll(status).toMatch(/synced/i);
  const real = globalThis.fetch;
  let release: () => void = () => undefined;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const methods: string[] = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    methods.push(init.method ?? 'GET');
    await gate;
    return real(url, init);
  });
  appState.systems[0]!.notes = 'not to be sent';
  const running = syncNow();
  await expect.poll(() => methods).toEqual(['GET']);
  act(() => {
    turnOffSync();
  });
  release();
  await act(() => running);
  expect(methods).toEqual(['GET']); // no PUT after the opt-out
  expect(syncCode()).toBeNull();
  expect(localStorage.getItem('nms_master_os_sync')).toBeNull();
});

test('pairing with another code while a sync is under way switches to the new vault', async () => {
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await expect.poll(status).toMatch(/synced/i);
  const other = newSyncCode();
  const real = globalThis.fetch;
  let release: () => void = () => undefined;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const otherKeys = await deriveSyncKeys(other); // another of the player's vaults, already uploaded
  await real(`${SYNC}/v1/vaults/${otherKeys.vaultId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${otherKeys.token}`, 'If-Match': '"0"' },
    body: await sealState(otherKeys, JSON.stringify(withSystems('Elsewhere')), 1)
  });
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    await gate;
    return real(url, init);
  });
  const running = syncNow();
  const pairing = pairWith(other);
  release();
  await act(async () => {
    await running;
    await pairing;
  });
  expect(syncCode()).toBe(other);
  expect(appState.systems.map(system => system.name).sort()).toEqual(['Ekwa Nexus', 'Elsewhere']);
});

test('an old format-1 copy served again after format 2 is refused, not merged as deletions', async () => {
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await expect.poll(status).toMatch(/synced/i);
  const keys = await deriveSyncKeys(syncCode() ?? '');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const gz = new Uint8Array(
    await new Response(
      new Blob([JSON.stringify(withSystems())]).stream().pipeThrough(new CompressionStream('gzip'))
    ).arrayBuffer()
  );
  const ad = new TextEncoder().encode(`atlas-sync/${keys.vaultId}`);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: ad }, keys.key, gz));
  const vault = vaults.get(keys.vaultId)!;
  vaults.set(keys.vaultId, { ...vault, version: 5, blob: new Uint8Array([1, ...iv, ...ct]) }); // a 3.14-era copy
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  await act(() => syncNow());
  expect(status()).toMatch(/couldn’t be opened/);
  expect(appState.systems.map(system => system.name)).toEqual(['Ekwa Nexus']);
});

test('pairing with an unknown code goes back to the sync it would have replaced', async () => {
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await expect.poll(status).toMatch(/synced/i);
  const code = syncCode();
  await act(async () => {
    await pairWith(newSyncCode());
  });
  expect(syncCode()).toBe(code);
  await act(() => syncNow());
  expect(status()).toMatch(/synced/i);
});

test('a code no device uploaded is refused: no vault is made for it, and sync stays off', async () => {
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'I have a code' }));
  await userEvent.type(screen.getByLabelText(/sync code from your other device/), newSyncCode());
  await userEvent.click(screen.getByRole('button', { name: 'Pair' }));
  await expect.poll(status).toMatch(/No synced log uses that code/);
  expect(vaults.size).toBe(0);
  expect(syncCode()).toBeNull();
});

test('a copy that would empty this log waits for the person; applying keeps the log from before', async () => {
  act(() => {
    setAppState(withSystems('A', 'B', 'C', 'D', 'E'));
  });
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await expect.poll(status).toMatch(/synced/i);
  const keys = await deriveSyncKeys(syncCode() ?? '');
  const vault = vaults.get(keys.vaultId)!;
  const emptied = buildState(structuredClone(appState)); // another device (or a crafted copy) that lost four systems
  emptied.systems = emptied.systems.slice(0, 1);
  emptied.meta.lastUpdated = new Date().toISOString();
  vaults.set(keys.vaultId, { ...vault, version: 2, blob: await sealState(keys, JSON.stringify(emptied), 2) });
  await act(() => syncNow());
  expect(status()).toMatch(/waiting for you/);
  expect(screen.getByRole('alert').textContent).toMatch(/4 systems/);
  expect(appState.systems).toHaveLength(5); // nothing removed yet
  await userEvent.click(screen.getByRole('button', { name: 'Apply the removal' }));
  await expect.poll(() => appState.systems.length).toBe(1);
  await userEvent.click(screen.getByRole('button', { name: 'Put it back' }));
  expect(appState.systems.map(system => system.name)).toEqual(['A', 'B', 'C', 'D', 'E']);
});

test('the relay can’t pass an old copy off as new, or serve an older version than this device synced', async () => {
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await expect.poll(status).toMatch(/synced/i);
  appState.systems[0]!.notes = 'second';
  await act(() => syncNow());
  const keys = await deriveSyncKeys(syncCode() ?? '');
  const now = vaults.get(keys.vaultId)!;
  expect(now.version).toBe(2);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vaults.set(keys.vaultId, { ...now, version: 5 }); // the same copy, relabelled
  await act(() => syncNow());
  expect(status()).toMatch(/couldn’t be opened/);
  vaults.set(keys.vaultId, { ...now, version: 1, blob: await sealState(keys, JSON.stringify(withSystems('Old')), 1) });
  await act(() => syncNow());
  expect(status()).toMatch(/older than one this device already synced/);
  expect(appState.systems[0]?.notes).toBe('second');
});

test('at an address without encryption, sync says so instead of blaming the server', () => {
  vi.stubGlobal('crypto', {}); // what a browser gives a page on plain http
  render(<Sync />);
  expect(screen.getByRole('status').textContent).toMatch(/browsers only allow encryption on a secure/);
  expect(screen.queryByRole('button', { name: 'Turn on sync' })).toBeNull();
});
