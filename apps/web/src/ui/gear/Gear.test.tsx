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
  await userEvent.type(screen.getByLabelText('Supercharged slots'), 'r2c2 r2c3');
  expect(screen.getByRole('img', { name: 'Supercharged slots: R2C2, R2C3' })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(appState.gear).toMatchObject([{ name: 'Kestrel', role: 'Flagship', superchargedSlots: ['R2C2', 'R2C3'] }]);
  expect(card.textContent).toContain('Flagship');
  expect(card.textContent).toContain('Kestrel');
});

test('a migrated fleet shows by kind, and a typo in the slots is refused with its name', async () => {
  act(() => {
    setAppState(
      buildState({
        fleet: { primaryStarship: { name: 'Old Flag', class: 'S' }, multiTools: [{ name: 'Old Rifle', class: 'B' }] }
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
  await userEvent.type(screen.getByLabelText('Supercharged slots'), 'R1C1 Q9');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('alert').textContent).toContain('Q9');
  expect(appState.gear[0]?.superchargedSlots).toEqual([]);
});
