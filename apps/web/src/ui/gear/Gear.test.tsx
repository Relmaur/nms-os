import { beforeEach, expect, test } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { appState, setAppState } from '../../app/store.ts';
import { closeEditor } from '../parts/editor-store.ts';
import { PlayerEditors } from '../PlayerEditors.tsx';
import { Home } from '../home/Home.tsx';
import { Gear } from './Gear.tsx';

beforeEach(() => {
  localStorage.clear();
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
  expect(screen.getByRole('button', { name: 'Row 2, column 2' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: 'Row 1, column 9' }).getAttribute('aria-pressed')).toBe('false');
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(appState.gear).toMatchObject([{ name: 'Kestrel', role: 'Flagship', superchargedSlots: ['R2C2', 'R2C3'] }]);
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
