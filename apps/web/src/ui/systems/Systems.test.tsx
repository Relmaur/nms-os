import { beforeEach, expect, test } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { DEFAULT_FILTER } from '@atlas/core/systems-list';
import { setAppState } from '../../app/store.ts';
import { Systems } from './Systems.tsx';
import { getPanel, setSystemFilter } from './panel-store.ts';

beforeEach(() => {
  localStorage.clear();
  act(() => {
    setSystemFilter(DEFAULT_FILTER);
  });
  setAppState(
    buildState({
      systems: [
        { id: 'sys-a', name: 'Ekwa Nexus', region: 'Odyalutai', tags: ['trade-hub'], notes: 'S-class hauler' },
        { id: 'sys-b', name: 'Hesper Drift', race: 'korvax', favorite: true, tags: ['mining', 'trade-hub'] },
        { id: 'sys-c', name: 'Outlaw Den', tags: ['outlaw'] }
      ]
    })
  );
});

const names = () =>
  within(document.getElementById('systemList')!)
    .queryAllByRole('button', { name: /./ })
    .map(button => button.querySelector('strong')?.textContent);

test('lists every system, favourites first, with the summary and tag filters', () => {
  render(<Systems />);
  expect(document.getElementById('systemsSummary')?.textContent).toBe('3 systems · 0 planets · 0 visits logged');
  expect(names()[0]).toBe('Hesper Drift');
  expect(names()).toHaveLength(3);
  expect(screen.getByRole('button', { name: 'trade-hub 2' })).toBeTruthy();
  expect(screen.getByText('Never run')).toBeTruthy(); // the outlaw station shows its restock status
});

test('search, favourites and tag filters narrow the list; Clear filters restores it', async () => {
  render(<Systems />);
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search systems' }), 'hauler');
  expect(names()).toEqual(['Ekwa Nexus']);
  expect(screen.getByText(/1 of 3/)).toBeTruthy();

  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(names()).toHaveLength(3);
  expect(screen.getByRole<HTMLInputElement>('searchbox').value).toBe('');

  await userEvent.click(screen.getByRole('button', { name: 'mining 1' }));
  expect(screen.getByRole('button', { name: 'mining 1' }).getAttribute('aria-pressed')).toBe('true');
  expect(names()).toEqual(['Hesper Drift']);
  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

  await userEvent.click(screen.getByRole('button', { name: 'Favourites' }));
  expect(names()).toEqual(['Hesper Drift']);
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Dominant race' }), 'gek');
  expect(screen.getByText('No systems match these filters.')).toBeTruthy();
});

test('the sort is kept when filters are cleared', async () => {
  render(<Systems />);
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Sort' }), 'name');
  expect(names()).toEqual(['Ekwa Nexus', 'Hesper Drift', 'Outlaw Den']);
  await userEvent.click(screen.getByRole('button', { name: 'Favourites' }));
  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByRole<HTMLSelectElement>('combobox', { name: 'Sort' }).value).toBe('name');
});

test('a card opens the system; Add system opens the editor', async () => {
  render(<Systems />);
  await userEvent.click(screen.getByText('Ekwa Nexus'));
  expect(getPanel()).toMatchObject({ open: true, mode: 'view', systemId: 'sys-a' });
  await userEvent.click(screen.getByRole('button', { name: 'Add system' }));
  expect(getPanel()).toMatchObject({ open: true, mode: 'edit', systemId: null });
});

test('an empty log explains what to do', () => {
  setAppState(buildState({ systems: [] }));
  render(<Systems />);
  expect(screen.getByText('Your atlas is empty. Use “Add system” after your next warp.')).toBeTruthy();
  expect(screen.getByText('Tags you add to systems and planets show up here as filters.')).toBeTruthy();
});
