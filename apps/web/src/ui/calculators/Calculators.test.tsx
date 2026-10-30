import { beforeEach, expect, test } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeCatalog } from '@atlas/core/planner';
import { Calculators } from './Calculators.tsx';
import { setGameDataForTests } from './game-data.ts';
import { setTool } from './tool-store.ts';
import subset from '../../../../../tests/fixtures/game-data-subset.json';

// The frozen wiki subset the core tests use. It is trimmed (not every field GameDataSchema requires), so it goes
// straight to makeCatalog; the shape makeCatalog reads (items with title/recipes/value) is what the fixture keeps.
const catalog = makeCatalog(subset as unknown as Parameters<typeof makeCatalog>[0]);

beforeEach(() => {
  localStorage.clear();
  act(() => {
    setGameDataForTests({ status: 'ready', catalog, verification: null });
    setTool('profit');
  });
});

test('base value, extractor yield and registers', async () => {
  render(<Calculators />);
  await userEvent.click(screen.getByRole('tab', { name: 'Base value' }));
  expect(document.getElementById('valueTotal')?.textContent).toBe('Total: 53,900 Units');
  await userEvent.click(screen.getByRole('tab', { name: 'Extractors' }));
  await userEvent.type(screen.getByRole('spinbutton', { name: 'Units/hour each' }), '250');
  expect(document.getElementById('mineResult')?.textContent).toMatch(/per hour, worth/);
  await userEvent.click(screen.getByRole('tab', { name: 'Registers' }));
  const register = screen.getByRole('textbox', { name: /Register 1/ });
  await userEvent.clear(register);
  await userEvent.type(register, '3 * 3');
  expect(document.getElementById('calcAns1')?.textContent).toBe('9');
});

test('loading and failure say so', () => {
  act(() => {
    setGameDataForTests({ status: 'failed' });
  });
  render(<Calculators />);
  expect(screen.getByRole('alert').textContent).toContain('couldn’t be loaded');
});

test('the chosen tool comes back after the screen is unmounted', async () => {
  const first = render(<Calculators />);
  await userEvent.click(screen.getByRole('tab', { name: 'Extractors' }));
  first.unmount();
  render(<Calculators />);
  expect(screen.getByRole('tab', { name: 'Extractors' }).getAttribute('aria-selected')).toBe('true');
});

test('the planner card names the plan in progress and opens it', () => {
  localStorage.setItem(
    'atlas_plan_progress',
    JSON.stringify({ item: 'Stasis Device', qty: 1, choices: {}, ticked: ['raw:Radon@500'] })
  );
  render(<Calculators />);
  const card = screen.getByRole('link', { name: /Recipe planner/ });
  expect(card.getAttribute('href')).toBe('#plan/Stasis%20Device');
  expect(document.getElementById('calcPlanSummary')?.textContent).toBe('×1 Stasis Device · 1/14 gathered');
});

test('arrow keys, Home and End move along the dock', async () => {
  render(<Calculators />);
  screen.getByRole('tab', { name: 'Best crafts' }).focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Base value' }));
  await userEvent.keyboard('{End}');
  expect(screen.getByRole('tab', { name: 'Registers' }).getAttribute('aria-selected')).toBe('true');
  await userEvent.keyboard('{ArrowRight}'); // wraps round
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Best crafts' }));
  await userEvent.keyboard('{ArrowLeft}');
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Registers' }));
  await userEvent.keyboard('{Home}');
  expect(screen.getByRole('tab', { name: 'Best crafts' }).getAttribute('aria-selected')).toBe('true');
});

test('switching tools keeps what was typed in each', async () => {
  render(<Calculators />);
  await userEvent.click(screen.getByRole('tab', { name: 'Registers' }));
  const register = screen.getByRole('textbox', { name: /Register 2/ });
  await userEvent.clear(register);
  await userEvent.type(register, '7 * 6');
  await userEvent.click(screen.getByRole('tab', { name: 'Best crafts' }));
  await userEvent.click(screen.getByRole('tab', { name: 'Registers' }));
  expect(document.getElementById('calcAns2')?.textContent).toBe('42');
});

test('Best crafts ranks by value gained, filters, and opens a pick in the planner', async () => {
  render(<Calculators />);
  const list = () =>
    [...document.querySelectorAll('#craftList [data-craft]')].map(row => row.getAttribute('data-craft'));
  expect(list().length).toBeGreaterThan(0);
  const first = document.querySelector('#craftList [data-craft]');
  expect(first?.textContent).toMatch(/\+[\d.,]+[KM]?/); // a gain, signed
  await userEvent.selectOptions(screen.getByLabelText('Length'), 'Up to 3 steps');
  expect(list()).not.toContain('Stasis Device'); // a long chain
  await userEvent.selectOptions(screen.getByLabelText('Length'), 'Any length');
  await userEvent.click(screen.getByRole('button', { name: 'Most gained' }));
  const top = list().find(title => title !== 'Stasis Device') ?? '';
  await userEvent.click(screen.getByRole('button', { name: `Plan it: ${top}` }));
  expect(decodeURIComponent(location.hash)).toBe(`#plan/${top}`);
});
