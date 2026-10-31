import { afterEach, beforeEach, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildState } from '@atlas/core/state';
import { HOUR_MS } from '@atlas/core/systems-model';
import { setAppState } from '../../app/store.ts';
import { setFactsForTests } from '../gear/facts-store.ts';
import { Runs } from './Runs.tsx';

const ago = (hours: number) => new Date(Date.now() - hours * HOUR_MS).toISOString();
const station = (id: string, runs: number[]) => ({
  id,
  name: id,
  tags: ['outlaw'],
  visits: runs.map(hours => ({ at: ago(hours), packets: 15 }))
});
const GAME = {
  version: '7.10',
  page: 'Update 7.10',
  path: 'wiki/updates/Update_710.md',
  url: 'https://nomanssky.fandom.com/wiki/Update_7.10',
  date: '28 October, 2026'
};

beforeEach(() => {
  setAppState(buildState({ outlaw: { runSize: 2 }, systems: [station('Fresh', []), station('Waiting', [5])] }));
  setFactsForTests({ schema: 1, facts: {}, game: GAME });
});
afterEach(() => {
  setFactsForTests(null);
});

test('Outlaw stations is built in, checked against the wiki’s game version', () => {
  render(<Runs />);
  expect(screen.getByText(/checked against the game data for v7\.10/)).toBeTruthy();
  const card = screen.getByRole('link', { name: /Outlaw stations/ });
  expect(card.getAttribute('href')).toBe('#outlaw');
  expect(card.textContent).toContain('Works in v7.10');
  expect(card.textContent).toContain('1 of 2 stations ready');
  expect(screen.getByRole('heading', { name: 'Built in' })).toBeTruthy();
});

test('a run in progress shows which station is next and when the first one restocks', () => {
  setAppState(
    buildState({
      outlaw: { runSize: 3, runStartedAt: ago(6) },
      systems: [station('Fresh', []), station('Waiting', [5])]
    })
  );
  render(<Runs />);
  expect(screen.getByRole('heading', { name: 'In progress' })).toBeTruthy();
  const card = screen.getByRole('link', { name: /Outlaw stations/ });
  expect(card.textContent).toContain('Station 2 of 3 · Fresh');
  expect(card.textContent).toMatch(/restock (18h 59m|19h 00m)/);
});

test('without the facts file, nothing claims a version', () => {
  setFactsForTests({ schema: 1, facts: {} });
  render(<Runs />);
  expect(screen.queryByText(/Works in/)).toBeNull();
  expect(screen.getByText('Routes that turn time into Units.')).toBeTruthy();
});
