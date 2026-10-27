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
  await expect.poll(status).toMatch(/Synced just now/);
  expect(vaults.size).toBe(1);
  const [vault] = [...vaults.values()];
  expect(new TextDecoder().decode(vault?.blob)).not.toContain('Ekwa'); // the relay can't read it
  await userEvent.click(screen.getByRole('button', { name: 'Pair another device' }));
  expect(screen.getByRole('img', { name: /QR code/ })).toBeTruthy();
  expect(document.getElementById('syncCodeCard')?.textContent).toContain(syncCode() ?? 'missing');
});

test('pairing with a code merges both logs; a later edit on either side reaches the other', async () => {
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await expect.poll(status).toMatch(/Synced/);
  const code = syncCode() ?? '';

  // Another device: its own log, the same code.
  act(() => {
    turnOffSync();
    setAppState(withSystems('Hilbert Dimension'));
  });
  await userEvent.click(screen.getByRole('button', { name: 'I have a code' }));
  await userEvent.type(screen.getByLabelText(/sync code from your other device/), `#pair=${code}`);
  await userEvent.click(screen.getByRole('button', { name: 'Pair' }));
  await expect.poll(status).toMatch(/Synced/);
  expect(appState.systems.map(system => system.name).sort()).toEqual(['Ekwa Nexus', 'Hilbert Dimension']);
  expect([...vaults.values()][0]?.version).toBe(2);

  // Meanwhile the first device logs a new system and syncs; this one edits a note. Both survive.
  const keys = await deriveSyncKeys(code);
  const first = buildState(structuredClone(appState));
  first.systems.push(normalizeSystem({ name: 'Calypso' }));
  const vault = vaults.get(keys.vaultId)!;
  vaults.set(keys.vaultId, { ...vault, version: 3, blob: await sealState(keys, JSON.stringify(first)) });
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

test('Delete cloud copy asks first, removes it, and turns sync off here', async () => {
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await expect.poll(status).toMatch(/Synced/);
  await userEvent.click(screen.getByRole('button', { name: 'Delete cloud copy' }));
  expect(vaults.size).toBe(1);
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  await expect.poll(() => vaults.size).toBe(0);
  expect(await screen.findByRole('button', { name: 'Turn on sync' })).toBeTruthy();
  expect(appState.systems.map(system => system.name)).toEqual(['Ekwa Nexus']); // the log stays
});

test('an unreachable relay leaves the log alone and says so', async () => {
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await expect.poll(status).toMatch(/Synced/);
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
  await expect.poll(status).toMatch(/Synced/);
  const code = syncCode() ?? '';

  act(() => {
    turnOffSync();
    setAppState(buildState()); // a new phone: only the starter log
  });
  await userEvent.click(screen.getByRole('button', { name: 'I have a code' }));
  await userEvent.type(screen.getByLabelText(/sync code from your other device/), code);
  await userEvent.click(screen.getByRole('button', { name: 'Pair' }));
  await expect.poll(status).toMatch(/Synced/);
  expect(appState.systems.map(system => system.id)).toEqual(['sys-real']);
  expect(appState.checklists.nutrientIngestorInstalled).toBe(true);
  expect(appState.outlaw.runSize).toBe(9);
});

test('turning sync off while a sync is under way sends nothing more and stays off', async () => {
  render(<Sync />);
  await userEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await expect.poll(status).toMatch(/Synced/);
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
  await expect.poll(status).toMatch(/Synced/);
  const other = newSyncCode();
  const real = globalThis.fetch;
  let release: () => void = () => undefined;
  const gate = new Promise<void>(resolve => {
    release = resolve;
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
  expect(vaults.has((await deriveSyncKeys(other)).vaultId)).toBe(true);
});
