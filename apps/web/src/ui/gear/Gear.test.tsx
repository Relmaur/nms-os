import { beforeEach, expect, test } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { appState, setAppState } from '../../app/store.ts';
import { closeEditor } from '../parts/editor-store.ts';
import { PlayerEditors } from '../PlayerEditors.tsx';
import { Home } from '../home/Home.tsx';
import { Gear } from './Gear.tsx';
import { setFactsForTests } from './facts-store.ts';

const cite = (page: string, value: unknown) => ({
  page,
  path: `wiki/mechanics/${page.replace(/ /g, '_')}.md`,
  url: `https://example.invalid/${page}`,
  revId: 1,
  quote: '…',
  value
});
const FACTS = {
  schema: 1 as const,
  facts: {
    'supercharged-per-class': cite('Supercharged Slot', { C: 1, B: 2, A: 3, S: 4 }),
    'supercharged-fixed-count': cite('Supercharged Slot', 3),
    'exosuit-supercharged-slots': cite('Exosuit', ['R1C5', 'R2C9', 'R3C3']),
    'multitool-tech-max': cite('Inventory', { columns: 10, slots: { C: 30, B: 30, A: 45, S: 60 } }),
    'starship-tech-max': cite('Inventory', { columns: 10, slots: { S: 60 } }),
    'exosuit-tech-max': cite('Inventory', { columns: 10, slots: { any: 60 } })
  }
};

beforeEach(() => {
  localStorage.clear();
  setFactsForTests(FACTS);
  act(() => {
    closeEditor();
    setAppState(buildState());
  });
});

test('a new player’s Home invites them to add a ship; it then leads the fleet card', async () => {
  render(
    <>
      <Home />
      <PlayerEditors />
    </>
  );
  const card = document.getElementById('fleetCardBody')!;
  expect(card.textContent).toContain('Add your ship and Multi-Tools');
  await userEvent.click(within(card).getByRole('button', { name: 'Add your ship' }));
  await userEvent.type(screen.getByLabelText(/Name/), 'Kestrel');
  await userEvent.type(screen.getByLabelText('Role'), 'Flagship');
  await userEvent.click(screen.getByRole('button', { name: 'Row 2, column 3' }));
  await userEvent.click(screen.getByRole('button', { name: 'Row 2, column 2' }));
  await userEvent.click(screen.getByRole('button', { name: 'Row 1, column 9' }));
  await userEvent.click(screen.getByRole('button', { name: 'Row 1, column 9' })); // tapped again: cleared
  await userEvent.type(screen.getByLabelText('What’s in R2C3'), 'Infra-Knife');
  expect(screen.getByRole('button', { name: 'Row 2, column 2' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: 'Row 1, column 9' }).getAttribute('aria-pressed')).toBe('false');
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(appState.gear).toMatchObject([
    { name: 'Kestrel', role: 'Flagship', superchargedSlots: ['R2C2', 'R2C3'], slotLabels: { R2C3: 'Infra-Knife' } }
  ]);
  expect(card.textContent).toContain('Flagship');
  expect(card.textContent).toContain('Kestrel');
});

test('a migrated fleet shows by kind; the picker opens on its slots and moves by arrow keys', async () => {
  act(() => {
    setAppState(
      buildState({
        fleet: {
          primaryStarship: { name: 'Old Flag', class: 'S', superchargedSlots: ['R2C2', 'R3C7'] },
          multiTools: [{ name: 'Old Rifle', class: 'B' }]
        }
      })
    );
  });
  render(
    <>
      <Gear />
      <PlayerEditors />
    </>
  );
  const ships = screen.getByRole('region', { name: /Starships/ });
  const tools = screen.getByRole('region', { name: /Multi-Tools/ });
  expect(within(ships).getByRole('heading', { name: 'Old Flag' })).toBeTruthy();
  expect(within(tools).getByRole('heading', { name: 'Old Rifle' })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Edit Old Flag' }));
  const picker = screen.getByRole('group', { name: 'Supercharged slots' });
  expect(
    within(picker)
      .getAllByRole('button', { pressed: true })
      .map(cell => cell.dataset.slot)
  ).toEqual(['R2C2', 'R3C7']);
  const first = within(picker).getByRole('button', { name: 'Row 1, column 1' });
  first.focus();
  await userEvent.keyboard('{ArrowDown}{ArrowRight}{Enter}');
  expect(document.activeElement?.getAttribute('data-slot')).toBe('R2C2');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(appState.gear[0]?.superchargedSlots).toEqual(['R3C7']);
});

test('the picker follows the wiki: a C-class tool has 3 rows and 1 supercharged slot, and a second mark is flagged', async () => {
  render(
    <>
      <Gear />
      <PlayerEditors />
    </>
  );
  await userEvent.click(screen.getByRole('button', { name: 'Add Multi-Tool' }));
  await userEvent.type(screen.getByLabelText(/Name/), 'Pistol');
  await userEvent.type(screen.getByLabelText('Class'), 'C');
  const picker = screen.getByRole('group', { name: 'Supercharged slots' });
  expect(within(picker).getAllByRole('button')).toHaveLength(30);
  expect(screen.queryByRole('button', { name: '+ Add a row' })).toBeNull();
  const rules = document.getElementById('slotRules')!;
  expect(rules.textContent).toContain('C-class: 1 supercharged slot.');
  expect(within(rules).getByRole('link', { name: 'Supercharged Slot' }).getAttribute('href')).toBe(
    'wiki/#/a/wiki%2Fmechanics%2FSupercharged_Slot.md'
  );
  await userEvent.click(within(picker).getByRole('button', { name: 'Row 1, column 2' }));
  expect(document.getElementById('slotWarnings')).toBeNull();
  await userEvent.click(within(picker).getByRole('button', { name: 'Row 3, column 4' }));
  expect(document.getElementById('slotWarnings')?.textContent).toContain(
    'C-class has 1 supercharged slot; 2 are marked'
  );
  await userEvent.click(screen.getByRole('button', { name: 'Add' })); // a warning, not a block
  expect(appState.gear).toMatchObject([{ name: 'Pistol', class: 'C', superchargedSlots: ['R1C2', 'R3C4'] }]);
});

test('an Exosuit has no class, and its three fixed slots are one tap away', async () => {
  render(
    <>
      <Gear />
      <PlayerEditors />
    </>
  );
  await userEvent.click(screen.getByRole('button', { name: 'Add Exosuit' }));
  expect(screen.queryByLabelText('Class')).toBeNull();
  await userEvent.type(screen.getByLabelText(/Name/), 'My suit');
  await userEvent.click(screen.getByRole('button', { name: /Mark the Exosuit’s slots/ }));
  expect(screen.queryByRole('button', { name: /Mark the Exosuit’s slots/ })).toBeNull();
  await userEvent.type(screen.getByLabelText('What’s in R2C9'), 'Movement');
  await userEvent.click(screen.getByRole('button', { name: 'Row 4, column 1' }));
  const warnings = document.getElementById('slotWarnings')!.textContent;
  expect(warnings).not.toContain('4 are marked'); // said once, by the line naming the odd slot
  expect(warnings).toContain('R4C1 isn’t one of the Exosuit’s');
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(appState.gear).toMatchObject([
    {
      kind: 'exosuit',
      class: '',
      superchargedSlots: ['R1C5', 'R2C9', 'R3C3', 'R4C1'],
      slotLabels: { R2C9: 'Movement' }
    }
  ]);
  expect(screen.getByRole('region', { name: /Exosuit/ }).textContent).toContain('My suit');
});

test('lowering the class keeps a cell of the shrunken grid in the Tab order', async () => {
  render(
    <>
      <Gear />
      <PlayerEditors />
    </>
  );
  await userEvent.click(screen.getByRole('button', { name: 'Add Multi-Tool' }));
  await userEvent.type(screen.getByLabelText('Class'), 'S');
  await userEvent.click(screen.getByRole('button', { name: '+ Add a row' }));
  await userEvent.click(screen.getByRole('button', { name: 'Row 5, column 4' }));
  await userEvent.click(screen.getByRole('button', { name: 'Row 5, column 4' })); // cleared: focus stays on row 5
  await userEvent.clear(screen.getByLabelText('Class'));
  await userEvent.type(screen.getByLabelText('Class'), 'C');
  const picker = screen.getByRole('group', { name: 'Supercharged slots' });
  expect(within(picker).getAllByRole('button')).toHaveLength(30);
  expect(picker.querySelector('[tabindex="0"]')?.getAttribute('data-slot')).toBe('R3C4');
});
