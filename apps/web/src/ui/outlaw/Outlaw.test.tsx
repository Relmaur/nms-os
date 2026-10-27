import { beforeEach, expect, test } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { HOUR_MS } from '@atlas/core/systems-model';
import { appState, setAppState } from '../../app/store.ts';
import { Outlaw } from './Outlaw.tsx';

const ago = (hours: number) => new Date(Date.now() - hours * HOUR_MS).toISOString();
const station = (id: string, runs: number[]) => ({
  id,
  name: id,
  tags: ['outlaw'],
  visits: runs.map(hours => ({ at: ago(hours), packets: 15 }))
});
const runList = () => within(document.getElementById('outlawRunList')!);

beforeEach(() => {
  localStorage.clear();
  setAppState(
    buildState({
      outlaw: { runSize: 2 },
      systems: [station('Fresh', []), station('Stale', [30]), station('Waiting', [5]), station('Older', [80])]
    })
  );
});

test('the next run takes the ready stations up to the run size, with its estimate', () => {
  render(<Outlaw />);
  expect(document.getElementById('outlawSummary')?.textContent).toBe(
    '4 outlaw systems · 3 ready · 3 packet runs · ~15,750 Nanites earned so far'
  );
  expect(
    runList()
      .getAllByRole('button', { name: /Euclid/ })
      .map(button => button.textContent)
  ).toEqual(['FreshEuclid', 'OlderEuclid']); // name, then galaxy
  expect(document.getElementById('outlawRunFooter')?.textContent).toContain(
    '2 stations · 30 packets · ~2.3M Units → ~10,500 Nanites'
  );
});

test('Mark whole run visited logs every station in the run at once', async () => {
  render(<Outlaw />);
  await userEvent.click(screen.getByRole('button', { name: 'Mark whole run visited' }));
  const runs = ['Fresh', 'Older'].map(id => appState.systems.find(system => system.id === id)?.visits.at(-1));
  expect(runs[0]?.at).toBe(runs[1]?.at);
  expect(runs.map(visit => visit?.packets)).toEqual([15, 15]);
  expect(runList().getAllByRole('button', { name: /Stale/ })).toHaveLength(1); // Stale moves up
});

test('Undo removes the last packet run; the filter shows ready or restocking stations', async () => {
  render(<Outlaw />);
  await userEvent.click(screen.getByRole('button', { name: 'Undo last run at Waiting' }));
  expect(appState.systems.find(system => system.id === 'Waiting')?.visits).toEqual([]);

  await userEvent.click(screen.getByRole('button', { name: 'Restocking 0' }));
  expect(screen.getByText('No stations in this view.')).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Ready 4' }));
  expect(within(document.getElementById('outlawStationList')!).getAllByRole('listitem')).toHaveLength(4);
});

test('settings are kept on change (blur or a spinner step), within their bounds', async () => {
  render(<Outlaw />);
  const nanites = screen.getByRole<HTMLInputElement>('spinbutton', { name: /Nanites you get per packet/ });
  await userEvent.clear(nanites);
  await userEvent.type(nanites, '500');
  expect(appState.outlaw.nanitesPerPacket).toBe(350); // not while typing
  await userEvent.tab();
  expect(appState.outlaw.nanitesPerPacket).toBe(500);

  const restock = screen.getByRole<HTMLInputElement>('spinbutton', { name: /Restock timer/ });
  await userEvent.clear(restock);
  await userEvent.type(restock, '9999');
  await userEvent.tab(); // happy-dom doesn't fire change on Enter as browsers do; the probe covers that
  expect(appState.outlaw.restockHours).toBe(720);
  expect(restock.value).toBe('720');

  // A spinner step fires a native change straight away, without leaving the field.
  const packets = screen.getByRole<HTMLInputElement>('spinbutton', { name: /Packets bought per visit/ });
  packets.value = '16';
  fireEvent.change(packets);
  expect(appState.outlaw.packetsPerVisit).toBe(16);
});

test('pasting a list: errors name the line; a good list adds outlaw systems', async () => {
  setAppState(buildState({ systems: [] }));
  render(<Outlaw />);
  expect(screen.getByText('Add outlaw systems to plan a run.')).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Paste a list' }));
  const input = screen.getByRole('textbox', { name: /One system per line/ });
  await userEvent.type(input, 'Den Two | 123');
  await userEvent.click(screen.getByRole('button', { name: 'Add systems' }));
  expect(screen.getByRole('alert').textContent).toBe('Line 1: needs a name, and glyphs must be exactly 12 hex digits.');

  await userEvent.clear(input);
  await userEvent.type(input, 'Den Two | 0123456789AB | Far Reach{Enter}Den Three');
  await userEvent.click(screen.getByRole('button', { name: 'Add systems' }));
  expect(appState.systems.map(system => [system.name, system.glyphs, system.conflict, system.tags])).toEqual([
    ['Den Two', '0123456789AB', 'pirate', ['outlaw']],
    ['Den Three', '', 'pirate', ['outlaw']]
  ]);
  expect(document.getElementById('outlawBulkForm')?.classList.contains('hidden')).toBe(true);
});
