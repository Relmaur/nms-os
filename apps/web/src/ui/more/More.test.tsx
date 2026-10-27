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
