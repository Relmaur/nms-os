import { beforeEach, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { appState, setAppState } from '../../app/store.ts';
import { More } from './More.tsx';

beforeEach(() => {
  localStorage.clear();
  setAppState(buildState({ systems: [] }));
});

test('Import replaces the log with a valid file, and leaves it alone for an invalid one', async () => {
  render(<More />);
  const input = screen.getByLabelText(/Import nms_state\.json/);
  await userEvent.upload(input, new File(['not json'], 'nms_state.json', { type: 'application/json' }));
  expect(appState.systems).toHaveLength(0);
  const file = new File([JSON.stringify({ systems: [{ name: 'Ekwa Nexus' }] })], 'nms_state.json', {
    type: 'application/json'
  });
  await userEvent.upload(input, file);
  await expect.poll(() => appState.systems.map(system => system.name)).toEqual(['Ekwa Nexus']);
});

test('the Guides row shows checklist progress', () => {
  const state = buildState();
  state.checklists = { crossSaveLinked: true, anomalyUnlocked: true }; // only these (the built-in state ticks more)
  setAppState(state);
  render(<More />);
  expect(screen.getByRole('link', { name: /Guides/ }).textContent).toContain('6% of checklists done');
});

test('past play sessions are listed, newest first', () => {
  const state = buildState({ systems: [] });
  state.sessions = [
    { startedAt: '2026-10-25T18:00:00.000Z', endedAt: '2026-10-25T19:00:00.000Z', timersDone: 0 },
    { startedAt: '2026-10-26T18:00:00.000Z', endedAt: '2026-10-26T20:30:00.000Z', timersDone: 3 }
  ];
  setAppState(state);
  render(<More />);
  const rows = screen.getByRole('heading', { name: 'Play sessions' }).nextElementSibling?.textContent ?? '';
  expect(rows.indexOf('2h 30m · 0 visits · 3 timers')).toBeLessThan(rows.indexOf('1h · 0 visits'));
});

test('Support opens the Ko-fi page in a new tab', () => {
  render(<More />);
  const link = screen.getByRole('link', { name: /Support ATLAS on Ko-fi/ });
  expect(link.getAttribute('href')).toBe('https://ko-fi.com/mlizardo');
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toContain('noopener');
});
