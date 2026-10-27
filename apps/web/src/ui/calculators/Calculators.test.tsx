import { beforeEach, expect, test } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeCatalog } from '@atlas/core/planner';
import { Calculators } from './Calculators.tsx';
import { setGameDataForTests } from './game-data.ts';
import { setTool } from './tool-store.ts';
import subset from '../../../../../tests/fixtures/game-data-subset.json';

// The frozen wiki subset the core tests use. It is trimmed (not every field GameDataSchema requires), so it goes
// straight to makeCatalog; the shape makeCatalog reads (items with title/recipes/value) is what the fixture keeps.
const catalog = makeCatalog(subset as unknown as Parameters<typeof makeCatalog>[0]);

const hold = (): Record<string, number> =>
  Object.fromEntries(
    [...document.querySelectorAll('#planResult [data-raw]')].map(tile => [
      tile.getAttribute('data-raw') ?? '',
      Number(tile.getAttribute('data-qty'))
    ])
  );
const rounds = () => screen.getByRole('region', { name: 'Crafting rounds, last first' });

beforeEach(() => {
  localStorage.clear();
  act(() => {
    setGameDataForTests({ status: 'ready', catalog, verification: null });
    setTool('planner');
  });
});

test('a Stasis Device: capstone worth, rounds from the top, the hold holds the raw totals', () => {
  render(<Calculators />);
  expect(screen.getByRole('heading', { name: 'Stasis Device' })).toBeTruthy();
  expect(document.querySelector('#planResult dl')?.textContent).toContain('15.6M Units');
  expect(hold()).toMatchObject({ Radon: 500, 'Frost Crystal': 300, Dioxite: 50 });
  const titles = within(rounds())
    .getAllByRole('heading', { level: 4 })
    .map(h => h.textContent);
  expect(titles[0]).toBe(`Round ${String(titles.length)}`); // the last round first
  expect(titles.at(-1)).toBe('Round 1');
  expect(within(rounds()).getAllByText('Needs the cargo hold · ', { exact: false })).toHaveLength(1);
});

test('ticking the hold readies round 1; crafting it readies the next round', async () => {
  render(<Calculators />);
  const firstRound = () =>
    within(rounds())
      .getAllByRole('listitem')
      .filter(li => li.querySelector('h4'))
      .at(-1)!;
  for (const box of screen.getAllByRole('checkbox', { name: /^Gathered/ })) await userEvent.click(box);
  expect(firstRound().textContent).toContain('Ready to craft');
  expect(screen.getByText(/14 of 14 gathered/)).toBeTruthy();
  for (const box of within(firstRound()).getAllByRole('checkbox')) await userEvent.click(box);
  expect(firstRound().textContent).toContain('Crafted');
  expect(within(rounds()).getAllByText(/Ready to craft/).length).toBeGreaterThan(0);
});

test('ticks survive a remount; another quantity starts fresh', async () => {
  const first = render(<Calculators />);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Gathered 500 Radon' }));
  first.unmount();
  render(<Calculators />);
  expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Gathered 500 Radon' }).checked).toBe(true);
  await userEvent.click(screen.getByRole('button', { name: 'One more' }));
  expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Gathered 1,000 Radon' }).checked).toBe(false);
});

test('a corrupt saved plan is ignored', () => {
  localStorage.setItem('atlas_plan_progress', '{"item": 42');
  render(<Calculators />);
  expect(screen.getByRole('heading', { name: 'Stasis Device' })).toBeTruthy();
});

test('presets and switching an alternative recipe recompute the plan and say what changed', async () => {
  render(<Calculators />);
  await userEvent.click(screen.getByRole('button', { name: 'Anomalous Doughnut' }));
  expect(screen.getByRole<HTMLInputElement>('combobox', { name: 'Item to make' }).value).toBe('Anomalous Doughnut');
  expect(hold()).toMatchObject({ 'Fresh Milk': 2, Grahberry: 2 });
  fireEvent.click(document.querySelector('#planResult button[data-title="Clarified Oil"]')!);
  expect(hold()).toMatchObject({ 'Fresh Milk': 1, 'Warm Proto-Milk': 1 });
  expect(within(document.getElementById('planResult')!).getByRole('status').textContent).toMatch(/^Clarified Oil: /);
});

test('an item without a recipe is refused; the plan stays', async () => {
  render(<Calculators />);
  const input = screen.getByRole('combobox', { name: 'Item to make' });
  await userEvent.clear(input);
  await userEvent.type(input, 'Radon{Enter}');
  expect(screen.getByRole('heading', { name: 'Stasis Device' })).toBeTruthy();
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

test('finishing a round keeps it open and keeps focus; it can then be folded', async () => {
  render(<Calculators />);
  for (const box of screen.getAllByRole('checkbox', { name: /^Gathered/ })) await userEvent.click(box);
  const firstRound = () =>
    within(rounds())
      .getAllByRole('listitem')
      .filter(li => li.querySelector('h4'))
      .at(-1)!;
  const boxes = within(firstRound()).getAllByRole('checkbox');
  for (const box of boxes) await userEvent.click(box);
  expect(document.activeElement).toBe(boxes.at(-1)); // still in the page, not on <body>
  const fold = within(firstRound()).getByRole('button', { name: 'Fold this round away' });
  expect(fold.getAttribute('aria-expanded')).toBe('true');
  await userEvent.click(fold);
  expect(within(firstRound()).queryAllByRole('checkbox')).toHaveLength(0);
});

test('a saved plan with out-of-range numbers is ignored', () => {
  localStorage.setItem(
    'atlas_plan_progress',
    JSON.stringify({ item: 'Stasis Device', qty: -3, choices: {}, ticked: ['raw:Radon'] })
  );
  render(<Calculators />);
  expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Gathered 500 Radon' }).checked).toBe(false);
});

test('a typed amount applies on Enter, not on every keystroke', async () => {
  render(<Calculators />);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Gathered 500 Radon' }));
  const qty = screen.getByRole('spinbutton', { name: 'How many' });
  await userEvent.clear(qty);
  await userEvent.type(qty, '1');
  expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Gathered 500 Radon' }).checked).toBe(true);
  await userEvent.type(qty, '0{Enter}');
  expect(screen.getByRole('checkbox', { name: 'Gathered 5,000 Radon' })).toBeTruthy();
});

test('a recipe switch keeps every tick that still covers what the new plan needs', async () => {
  render(<Calculators />);
  await userEvent.click(screen.getByRole('button', { name: 'Anomalous Doughnut' }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Gathered 2 Grahberry' }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Gathered 2 Fresh Milk' }));
  fireEvent.click(document.querySelector('#planResult button[data-title="Clarified Oil"]')!);
  expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Gathered 2 Grahberry' }).checked).toBe(true);
  // Fresh Milk now needs 1: the 2 already gathered cover it. Warm Proto-Milk is new, so it isn't ticked.
  expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Gathered 1 Fresh Milk' }).checked).toBe(true);
  expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Gathered 1 Warm Proto-Milk' }).checked).toBe(false);
});

test('the dock opens on the planner, names the plan in progress, and switches tools', async () => {
  render(<Calculators />);
  const planner = screen.getByRole('tab', { name: /^Recipe planner/ });
  expect(planner.getAttribute('aria-selected')).toBe('true');
  expect(screen.queryByRole('heading', { name: 'Base value' })).toBeNull(); // the other tools wait behind their tabs
  await userEvent.click(screen.getByRole('checkbox', { name: 'Gathered 500 Radon' }));
  expect(document.getElementById('calcPlanSummary')?.textContent).toBe('×1 Stasis Device · 1/14 gathered');
  await userEvent.click(screen.getByRole('tab', { name: 'Base value' }));
  expect(screen.getByRole('heading', { name: 'Base value' })).toBeTruthy();
  expect(document.getElementById('calcPanel-planner')?.hidden).toBe(true);
});

test('the chosen tool comes back after the screen is unmounted', async () => {
  const first = render(<Calculators />);
  await userEvent.click(screen.getByRole('tab', { name: 'Extractors' }));
  first.unmount();
  render(<Calculators />);
  expect(screen.getByRole('tab', { name: 'Extractors' }).getAttribute('aria-selected')).toBe('true');
});

test('arrow keys, Home and End move along the dock', async () => {
  render(<Calculators />);
  screen.getByRole('tab', { name: /^Recipe planner/ }).focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Base value' }));
  await userEvent.keyboard('{End}');
  expect(screen.getByRole('tab', { name: 'Registers' }).getAttribute('aria-selected')).toBe('true');
  await userEvent.keyboard('{ArrowRight}'); // wraps round to the planner
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: /^Recipe planner/ }));
  await userEvent.keyboard('{ArrowLeft}');
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Registers' }));
  await userEvent.keyboard('{Home}');
  expect(screen.getByRole('tab', { name: /^Recipe planner/ }).getAttribute('aria-selected')).toBe('true');
});

test('switching tools keeps what was typed in each', async () => {
  render(<Calculators />);
  await userEvent.click(screen.getByRole('tab', { name: 'Registers' }));
  const register = screen.getByRole('textbox', { name: /Register 2/ });
  await userEvent.clear(register);
  await userEvent.type(register, '7 * 6');
  await userEvent.click(screen.getByRole('tab', { name: /^Recipe planner/ }));
  await userEvent.click(screen.getByRole('tab', { name: 'Registers' }));
  expect(document.getElementById('calcAns2')?.textContent).toBe('42');
});
