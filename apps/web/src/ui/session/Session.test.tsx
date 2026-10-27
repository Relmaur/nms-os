import { beforeEach, expect, test } from 'vitest';
import { act, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { makeCatalog } from '@atlas/core/planner';
import { appState, setAppState } from '../../app/store.ts';
import { setGameDataForTests } from '../calculators/game-data.ts';
import { markAlerted } from '../actions.ts';
import { SessionBar } from './SessionBar.tsx';
import { SessionSheet } from './SessionSheet.tsx';
import { closeSessionSheet, openSessionSheet } from './sheet-store.ts';
import subset from '../../../../../tests/fixtures/game-data-subset.json';

// The trimmed wiki subset goes straight to makeCatalog (see Calculators.test.tsx).
const catalog = makeCatalog(subset as unknown as Parameters<typeof makeCatalog>[0]);
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

beforeEach(() => {
  localStorage.clear();
  act(() => {
    setAppState(buildState({ systems: [] }));
    setGameDataForTests({ status: 'ready', catalog, verification: null });
    closeSessionSheet();
  });
});

const sheet = () => document.getElementById('sessionSheet')!;
const open = () => {
  act(() => {
    openSessionSheet();
  });
};

test('a session starts from the sheet, the bar shows it, and ending it shows the recap', async () => {
  render(
    <>
      <SessionBar />
      <SessionSheet />
    </>
  );
  expect(document.getElementById('sessionBar')).toBeNull(); // nothing on: no bar
  open();
  await userEvent.click(within(sheet()).getByRole('button', { name: /Start session/ }));
  expect(appState.session).not.toBeNull();
  expect(document.getElementById('sessionBar')?.textContent).toContain('Session');
  await userEvent.click(within(sheet()).getByRole('button', { name: 'End session' }));
  expect(appState.session).toBeNull();
  expect(appState.sessions).toHaveLength(1);
  expect(within(sheet()).getByRole('heading', { name: 'Session recap' })).toBeTruthy();
  expect(document.getElementById('sessionRecap')?.textContent).toContain('Visits0 to 0 systems');
});

test('a refiner timer takes the wiki’s time for whole batches', async () => {
  render(<SessionSheet />);
  open();
  const form = within(sheet());
  await userEvent.type(form.getByLabelText('What it makes'), 'Enriched Carbon');
  await userEvent.clear(form.getByLabelText('Amount'));
  await userEvent.type(form.getByLabelText('Amount'), '4');
  expect(sheet().textContent).toContain('3:00'); // 4 batches × 45 s
  await userEvent.click(form.getByRole('button', { name: /Start refiner timer/ }));
  const [timer] = appState.timers;
  expect(timer?.label).toBe('4 Enriched Carbon');
  expect(Date.parse(timer?.endsAt ?? '') - Date.parse(timer?.startedAt ?? '')).toBe(180_000);
  expect(within(document.getElementById('timerList')!).getByText('4 Enriched Carbon')).toBeTruthy();
});

test('a crop starts from the time last set for it; a custom timer takes a quick time', async () => {
  const state = buildState({ systems: [] });
  state.timers = [
    { id: 'old', kind: 'crop', label: 'Frostwort', startedAt: minutesAgo(200), endsAt: minutesAgo(125), alerted: true }
  ];
  act(() => {
    setAppState(state);
  });
  render(<SessionSheet />);
  open();
  const form = within(sheet());
  await userEvent.click(form.getByRole('button', { name: /Crop/ }));
  await userEvent.type(form.getByLabelText('Crop'), 'Frostwort');
  expect(form.getByLabelText<HTMLInputElement>('Minutes').value).toBe('75');
  await userEvent.click(form.getByRole('button', { name: /Start crop timer/ }));
  await userEvent.click(form.getByRole('button', { name: /Custom/ }));
  await userEvent.type(form.getByLabelText('Name'), 'Frigate');
  await userEvent.click(form.getByRole('button', { name: '15m' }));
  await userEvent.click(form.getByRole('button', { name: /^Start timer/ }));
  expect(appState.timers.map(timer => [timer.kind, timer.label])).toEqual([
    ['crop', 'Frostwort'],
    ['crop', 'Frostwort'],
    ['custom', 'Frigate']
  ]);
});

test('a finished timer is announced once and counts toward the session; Dismiss clears it', async () => {
  const state = buildState({ systems: [] });
  state.session = { startedAt: minutesAgo(30), timersDone: 0 };
  state.timers = [
    { id: 'done', kind: 'custom', label: 'Storm', startedAt: minutesAgo(10), endsAt: minutesAgo(1), alerted: false }
  ];
  act(() => {
    setAppState(state);
  });
  expect(markAlerted(['done']).map(timer => timer.id)).toEqual(['done']);
  expect(markAlerted(['done'])).toEqual([]); // another tab or a reload: not again
  expect(appState.session?.timersDone).toBe(1);
  render(
    <>
      <SessionBar />
      <SessionSheet />
    </>
  );
  expect(document.getElementById('sessionBar')?.textContent).toContain('Storm done');
  open();
  await userEvent.click(within(sheet()).getByRole('button', { name: 'Dismiss Storm' }));
  expect(appState.timers).toEqual([]);
});
