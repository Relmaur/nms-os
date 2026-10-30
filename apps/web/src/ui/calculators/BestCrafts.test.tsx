import { beforeEach, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeCatalog } from '@atlas/core/planner';
import { BestCrafts } from './BestCrafts.tsx';
import { setGameDataForTests } from './game-data.ts';
import subset from '../../../../../tests/fixtures/game-data-subset.json';

vi.mock('../shell/section-store.ts', () => ({
  showSection: vi.fn(),
  goBack: vi.fn(),
  useSection: () => 'crafts',
  useSectionParam: () => ''
}));

// The frozen wiki subset the core tests use, trimmed: it goes straight to makeCatalog (see Calculators.test.tsx).
const catalog = makeCatalog(subset as unknown as Parameters<typeof makeCatalog>[0]);
const list = () =>
  [...document.querySelectorAll('#craftList [data-craft]')].map(row => row.getAttribute('data-craft') ?? '');

beforeEach(() => {
  act(() => {
    setGameDataForTests({ status: 'ready', catalog, verification: null });
  });
});

test('ranked by profit, with the top pick; each row opens the planner', () => {
  render(<BestCrafts />);
  expect(list().length).toBeGreaterThan(0);
  const top = document.getElementById('craftTop');
  expect(top?.textContent).toContain(list()[0]);
  expect(top?.getAttribute('href')).toBe(`#plan/${encodeURIComponent(list()[0] ?? '')}`);
  const first = document.querySelector('#craftList a');
  expect(first?.getAttribute('href')).toBe(`#plan/${encodeURIComponent(list()[0] ?? '')}`);
  expect(first?.textContent).toMatch(/^01.*\+[\d,]+×[\d.]+$/);
});

test('Multiplier, Fewest steps and No farming re-rank the list', async () => {
  render(<BestCrafts />);
  const byProfit = list();
  await userEvent.click(screen.getByRole('button', { name: 'Fewest steps' }));
  expect(screen.getByRole('button', { name: 'Fewest steps' }).getAttribute('aria-pressed')).toBe('true');
  expect(list()).not.toEqual(byProfit);
  await userEvent.click(screen.getByRole('button', { name: 'No farming' }));
  expect(list()).not.toContain('Stasis Device'); // it needs Frost Crystal, a crop
  expect(screen.getByText(/leaves out crafts that need a crop/)).toBeTruthy();
});

test('loading and failure say so', () => {
  act(() => {
    setGameDataForTests({ status: 'failed' });
  });
  render(<BestCrafts />);
  expect(screen.getByRole('alert').textContent).toContain('couldn’t be loaded');
});
