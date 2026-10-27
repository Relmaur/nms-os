import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { DEFAULT_FILTER } from '@atlas/core/systems-list';
import { appState, setAppState } from '../../app/store.ts';
import { showSection } from '../../app/nav.js';
import { SystemPanel } from './SystemPanel.tsx';
import { closeSystemPanel, getPanel, openSystem, openSystemEditor, setSystemFilter } from './panel-store.ts';

vi.mock('../../app/nav.js', () => ({ showSection: vi.fn() }));

const system = (id: string) => appState.systems.find(item => item.id === id);
const stored = () =>
  JSON.parse(localStorage.getItem('nms_master_os_state') ?? '{}') as { systems: { notes: string }[] };

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  setAppState(
    buildState({
      systems: [
        {
          id: 'sys-a',
          name: 'Ekwa Nexus',
          region: 'Odyalutai',
          tags: ['trade-hub'],
          notes: 'Old notes',
          planets: [{ id: 'pl-1', name: 'Verdant IV', biome: 'Lush' }],
          visits: [{ at: '2026-10-20T10:00:00.000Z', note: 'First arrival' }]
        },
        { id: 'sys-den', name: 'Outlaw Den', tags: ['outlaw'] }
      ]
    })
  );
  act(() => {
    setSystemFilter(DEFAULT_FILTER);
  });
});

afterEach(() => {
  act(closeSystemPanel);
  vi.useRealTimers();
});

const open = (id: string) => {
  render(<SystemPanel />);
  act(() => {
    openSystem(id);
  });
};

test('closed, the panel is hidden and inert; opening shows the system', () => {
  render(<SystemPanel />);
  const dialog = document.getElementById('systemPanel')!;
  expect(dialog.getAttribute('aria-hidden')).toBe('true');
  expect(dialog.hasAttribute('inert')).toBe(true);
  act(() => {
    openSystem('sys-a');
  });
  expect(dialog.getAttribute('aria-hidden')).toBe('false');
  expect(screen.getByRole('heading', { name: 'Ekwa Nexus' })).toBeTruthy();
  expect(screen.getByText('Odyalutai · Euclid')).toBeTruthy();
  expect(screen.getByText('First arrival')).toBeTruthy();
});

test('Log visit records the note; an outlaw system can log a packet run', async () => {
  open('sys-a');
  await userEvent.type(screen.getByRole('textbox', { name: 'Visit note (optional)' }), 'Back for fuel');
  await userEvent.click(screen.getByRole('button', { name: 'Log visit' }));
  expect(system('sys-a')?.visits.at(-1)?.note).toBe('Back for fuel');
  expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Visit note (optional)' }).value).toBe('');

  act(() => {
    openSystem('sys-den');
  });
  expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Packet run' }).checked).toBe(true);
  await userEvent.click(screen.getByRole('button', { name: 'Log visit' }));
  expect(system('sys-den')?.visits.at(-1)?.packets).toBe(15);
});

test('favourite and rating toggle', async () => {
  open('sys-a');
  await userEvent.click(screen.getByRole('button', { name: 'Add to favourites' }));
  expect(system('sys-a')?.favorite).toBe(true);
  await userEvent.click(screen.getByRole('button', { name: 'Remove from favourites' }));
  expect(system('sys-a')?.favorite).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Rate 4 of 5' }));
  expect(system('sys-a')?.rating).toBe(4);
  await userEvent.click(screen.getByRole('button', { name: 'Rate 4 of 5' }));
  expect(system('sys-a')?.rating).toBe(0);
});

test('a tag filters the Systems list and switches to it', async () => {
  open('sys-a');
  await userEvent.click(screen.getByRole('button', { name: 'trade-hub' }));
  expect(getPanel().open).toBe(false);
  expect(showSection).toHaveBeenCalledWith('systems');
});

test('notes autosave after a pause, and say when storage failed', () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  open('sys-a');
  const notes = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Notes' });
  fireEvent.change(notes, { target: { value: 'New notes' } });
  expect(screen.getByText('Editing…')).toBeTruthy();
  expect(system('sys-a')?.notes).toBe('Old notes');
  act(() => {
    vi.advanceTimersByTime(800);
  });
  expect(system('sys-a')?.notes).toBe('New notes');
  expect(stored().systems[0]?.notes).toBe('New notes');
  expect(screen.getByText('Saved')).toBeTruthy();

  const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage is full', 'QuotaExceededError');
  });
  fireEvent.change(notes, { target: { value: 'Unsaveable' } });
  fireEvent.focusOut(notes); // React's onBlur listens for focusout
  expect(screen.getByText('Not saved')).toBeTruthy();
  setItem.mockRestore();
});

test('closing the panel saves notes still being typed', () => {
  open('sys-a');
  fireEvent.change(screen.getByRole('textbox', { name: 'Notes' }), { target: { value: 'Typed then closed' } });
  act(closeSystemPanel);
  expect(system('sys-a')?.notes).toBe('Typed then closed');
});

test('planets: add, edit, and delete on the second tap', async () => {
  open('sys-a');
  await userEvent.click(screen.getByRole('button', { name: 'Add planet' }));
  await userEvent.type(screen.getByRole('textbox', { name: 'Planet name' }), 'Ashen');
  await userEvent.type(screen.getByRole('textbox', { name: 'Planet tags' }), 'Base, base, oxygen hotspot');
  await userEvent.click(screen.getAllByRole('button', { name: 'Add planet' }).at(-1)!);
  const ashen = system('sys-a')?.planets.find(planet => planet.name === 'Ashen');
  expect(ashen?.tags).toEqual(['base', 'oxygen-hotspot']);

  await userEvent.click(screen.getByRole('button', { name: 'Edit Verdant IV' }));
  const name = screen.getByRole('textbox', { name: 'Planet name' });
  await userEvent.clear(name);
  await userEvent.type(name, 'Verdant V');
  await userEvent.click(screen.getByRole('button', { name: 'Save planet' }));
  expect(system('sys-a')?.planets.map(planet => planet.name)).toEqual(['Verdant V', 'Ashen']);

  await userEvent.click(screen.getByRole('button', { name: 'Delete Ashen' }));
  expect(system('sys-a')?.planets).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Delete Ashen' }).textContent).toBe('Delete?');
  await userEvent.click(screen.getByRole('button', { name: 'Delete Ashen' }));
  expect(system('sys-a')?.planets).toHaveLength(1);
});

test('an armed delete disarms after four seconds', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  open('sys-a');
  await userEvent.click(screen.getByRole('button', { name: 'Delete system' }));
  expect(screen.getByRole('button', { name: 'Click again to delete this system' })).toBeTruthy();
  act(() => {
    vi.advanceTimersByTime(4000);
  });
  expect(screen.getByRole('button', { name: 'Delete system' })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Delete system' }));
  await userEvent.click(screen.getByRole('button', { name: 'Click again to delete this system' }));
  expect(system('sys-a')).toBeUndefined();
  expect(getPanel().open).toBe(false);
});

test('Esc goes from the editor back to the view, then closes', async () => {
  open('sys-a');
  await userEvent.click(screen.getByRole('button', { name: 'Edit system' }));
  expect(screen.getByRole('heading', { name: 'Edit system' })).toBeTruthy();
  await userEvent.keyboard('{Escape}');
  expect(getPanel()).toMatchObject({ open: true, mode: 'view' });
  await userEvent.keyboard('{Escape}');
  expect(getPanel().open).toBe(false);
});

test('editor: validates the name and glyphs, normalises glyphs, adds tags, logs the arrival', async () => {
  render(<SystemPanel />);
  act(() => {
    openSystemEditor(null, { tags: ['outlaw'], conflict: 'pirate' });
  });
  const form = document.getElementById('systemEditor') as HTMLFormElement;
  fireEvent.submit(form); // the browser's `required` check is bypassed here, so the app's own check shows
  expect(screen.getByRole('alert').textContent).toBe('The system needs a name.');

  await userEvent.type(screen.getByRole('textbox', { name: /System name/ }), 'Test Prime');
  await userEvent.type(screen.getByRole('textbox', { name: 'Portal glyphs' }), '1a2b');
  await userEvent.click(screen.getByRole('button', { name: 'Add system' }));
  expect(screen.getByRole('alert').textContent).toBe(
    'Portal glyphs are 12 hex digits (0–9, A–F), or leave them empty.'
  );

  await userEvent.type(screen.getByRole('textbox', { name: 'Portal glyphs' }), '3c4d5e6f');
  const tags = screen.getByRole('textbox', { name: 'Tags' });
  await userEvent.type(tags, 'Mining Base{Enter}scrap,temp');
  await userEvent.type(tags, '{Backspace}{Backspace}{Backspace}{Backspace}{Backspace}');
  await userEvent.click(screen.getByRole('button', { name: 'Add system' }));

  const added = appState.systems.find(item => item.name === 'Test Prime');
  expect(added?.glyphs).toBe('1A2B3C4D5E6F');
  expect(added?.tags).toEqual(['outlaw', 'mining-base']);
  expect(added?.conflict).toBe('pirate');
  expect(added?.visits).toHaveLength(1);
  expect(getPanel()).toMatchObject({ mode: 'view', systemId: added?.id });
});

test('editor: Cancel on an existing system returns to its view without saving', async () => {
  open('sys-a');
  await userEvent.click(screen.getByRole('button', { name: 'Edit system' }));
  await userEvent.type(screen.getByRole('textbox', { name: 'Region' }), ' changed');
  await userEvent.click(screen.getAllByRole('button', { name: 'Cancel' })[1]!); // the footer one (the header ✕ is the other)
  expect(system('sys-a')?.region).toBe('Odyalutai');
  expect(getPanel()).toMatchObject({ open: true, mode: 'view', systemId: 'sys-a' });
});

test('focus: the editor keeps it, and closing returns it to what opened the panel', async () => {
  render(
    <>
      <button
        type="button"
        onClick={() => {
          openSystem('sys-a');
        }}
      >
        Open Ekwa
      </button>
      <button
        type="button"
        onClick={() => {
          openSystemEditor();
        }}
      >
        New system
      </button>
      <SystemPanel />
    </>
  );
  await userEvent.click(screen.getByRole('button', { name: 'Open Ekwa' }));
  await userEvent.click(screen.getByRole('button', { name: 'Edit system' }));
  expect(document.activeElement?.id).toBe('sysName');
  await userEvent.keyboard('{Escape}'); // back to the view
  await userEvent.keyboard('{Escape}'); // closed
  expect(document.activeElement?.textContent).toBe('Open Ekwa');

  await userEvent.click(screen.getByRole('button', { name: 'New system' }));
  expect(document.activeElement?.id).toBe('sysName');
  await userEvent.keyboard('{Escape}');
  expect(document.activeElement?.textContent).toBe('New system');
});
