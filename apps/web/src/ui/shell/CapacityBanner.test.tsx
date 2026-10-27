import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { setAppState } from '../../app/store.ts';
import { clearRelayStatusForTests, readCapacity, relayPaused } from '../../app/relay-status.ts';
import { syncNow, turnOffSync, turnOnSync } from '../../app/sync.ts';
import { Sync } from '../more/Sync.tsx';
import { CapacityBanner } from './CapacityBanner.tsx';

const full = (seconds = 3600) =>
  new Response(JSON.stringify({ capacity: 'full' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json', 'Retry-After': String(seconds) }
  });
let calls = 0;

beforeEach(() => {
  localStorage.clear();
  calls = 0;
  act(() => {
    clearRelayStatusForTests();
    turnOffSync();
    setAppState(buildState({ systems: [] }));
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

test('a full relay pauses this device until it resets, and the banner invites a coffee once a day', async () => {
  vi.stubGlobal('fetch', () => {
    calls += 1;
    return Promise.resolve(full());
  });
  render(
    <>
      <CapacityBanner />
      <Sync />
    </>
  );
  await act(() => turnOnSync());
  expect(relayPaused()).toBe(true);
  expect(calls).toBe(1); // one attempt, then it waits for the reset
  const banner = await screen.findByText(/syncs again after/, { selector: '#capacityBanner p' });
  expect(document.getElementById('capacityBanner')?.textContent).toMatch(
    /free sync server is full for today\. Your log is safe on this device/
  );
  expect(banner).toBeTruthy();
  expect(screen.getByRole('link', { name: /Support on Ko-fi/ }).getAttribute('href')).toBe(
    'https://ko-fi.com/mlizardo'
  );
  expect(document.getElementById('syncStatus')?.textContent).toMatch(/full for today/);
  expect(screen.getByRole('link', { name: /coffee on Ko-fi/ })).toBeTruthy();

  await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(document.getElementById('capacityBanner')).toBeNull();
  expect(localStorage.getItem('atlas_capacity_notice')).toBe(new Date().toISOString().slice(0, 10));
});

test('the pause ends when the relay answers normally again; a plain 503 is just a server problem', async () => {
  await readCapacity(full(60));
  expect(relayPaused()).toBe(true);
  await readCapacity(new Response(null, { status: 200 }));
  expect(relayPaused()).toBe(false);
  await readCapacity(new Response(JSON.stringify({ capacity: 'unavailable' }), { status: 503 }));
  expect(relayPaused()).toBe(false);
});

test('busy turns away a new vault with its own message: this device waits, and no "full" banner shows', async () => {
  vi.stubGlobal('fetch', () =>
    Promise.resolve(
      new Response(JSON.stringify({ capacity: 'busy' }), { status: 503, headers: { 'Retry-After': '600' } })
    )
  );
  render(<Sync />);
  await act(() => turnOnSync());
  expect(relayPaused()).toBe(true); // a joining device doesn't retry on every save
  expect(document.getElementById('syncStatus')?.textContent).toMatch(/isn’t taking new players today/);
  await act(() => syncNow());
  expect(document.getElementById('capacityBanner')).toBeNull();
});
