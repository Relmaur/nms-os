import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { HOUR_MS } from '@atlas/core/systems-model';
import { appState, setAppState } from '../../app/store.ts';
import { openSystem, openSystemEditor } from '../systems/panel-store.ts';
import { Home } from './Home.tsx';

// The system panel (its own screen) isn't part of what's under test.
vi.mock('../systems/panel-store.ts', () => ({
  openSystem: vi.fn(),
  openSystemEditor: vi.fn()
}));

const ago = (hours: number) => new Date(Date.now() - hours * HOUR_MS).toISOString();

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

test('an empty log asks for the first system', async () => {
  setAppState(buildState({ systems: [] }));
  render(<Home />);
  expect(screen.getByRole('heading', { name: 'Log your first system' })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Warped somewhere new' }));
  expect(openSystemEditor).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Systems you log land here, so warping back is one tap.')).toBeTruthy();
});

test('the current system shows its place, glyphs, tags and first note line', async () => {
  setAppState(
    buildState({
      systems: [
        {
          id: 'sys-a',
          name: 'Ekwa Nexus',
          region: 'Odyalutai',
          glyphs: '0123456789AB',
          tags: ['trade-hub'],
          notes: '\nS-class hauler\nsecond line',
          visits: [{ at: ago(0.2) }]
        },
        { id: 'sys-b', name: 'Hesper Drift', visits: [{ at: ago(48) }] }
      ]
    })
  );
  const { container } = render(<Home />);
  const now = within(container.querySelector<HTMLElement>('#homeNow')!);
  expect(now.getByText('Ekwa Nexus')).toBeTruthy();
  expect(now.getByText('Here 12m ago · Odyalutai · Euclid')).toBeTruthy();
  expect(now.getByRole('button', { name: /0123456789AB/ })).toBeTruthy();
  expect(now.getByText('trade-hub')).toBeTruthy();
  expect(now.getByText('S-class hauler')).toBeTruthy();
  await userEvent.click(now.getByRole('button', { name: 'Details' }));
  expect(openSystem).toHaveBeenCalledWith('sys-a');
});

test('Log visit saves a visit and the screen follows; "I’m here" makes a recent system current', async () => {
  setAppState(
    buildState({
      systems: [
        { id: 'sys-a', name: 'Ekwa Nexus', visits: [{ at: ago(2) }] },
        { id: 'sys-b', name: 'Hesper Drift', visits: [{ at: ago(48) }] }
      ]
    })
  );
  const { container } = render(<Home />);
  await userEvent.click(screen.getByRole('button', { name: 'Log visit' }));
  expect(appState.systems.find(system => system.id === 'sys-a')?.visits).toHaveLength(2);
  expect(container.querySelector('#homeNow')?.textContent).toContain('Here just now');
  const saved = JSON.parse(localStorage.getItem('nms_master_os_state') ?? '{}') as { systems: unknown[] };
  expect(saved.systems).toHaveLength(2);

  await userEvent.click(screen.getByRole('button', { name: 'I’m here: Hesper Drift' }));
  expect(container.querySelector('#homeNow')?.textContent).toContain('Hesper Drift');
});

test('outlaw card: ready count and estimate, or the soonest restock', () => {
  const station = (id: string, hoursAgo: number) => ({
    id,
    name: id,
    tags: ['outlaw'],
    visits: [{ at: ago(hoursAgo), packets: 15 }]
  });
  setAppState(buildState({ systems: [station('Den', 30), station('Cove', 2)] }));
  const { container, unmount } = render(<Home />);
  expect(container.querySelector('#homeOutlaw')?.textContent).toContain('1 of 2 ready · next run ~5,250 Nanites');
  unmount();

  setAppState(buildState({ systems: [station('Den', 10), station('Cove', 2)] }));
  const second = render(<Home />);
  expect(second.container.querySelector('#homeOutlaw')?.textContent).toContain('All restocking. Den is ready in 14h.');
});
