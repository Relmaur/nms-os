import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { DEFAULT_FILTER } from '@atlas/core/systems-list';
import { appState, setAppState } from '../../app/store.ts';
import { SystemPanel } from './SystemPanel.tsx';
import { closeSystemPanel, getPanel, openSystemEditor, setSystemFilter } from './panel-store.ts';

vi.mock('../shell/section-store.ts', () => ({ showSection: vi.fn() }));

const system = (id: string) => appState.systems.find(item => item.id === id);

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

const edit = (id: string | null) => {
  render(<SystemPanel />);
  act(() => {
    openSystemEditor(id);
  });
};

test('closed, the editor panel is hidden and inert; opening shows the editor', () => {
  render(<SystemPanel />);
  const dialog = document.getElementById('systemPanel')!;
  expect(dialog.getAttribute('aria-hidden')).toBe('true');
  expect(dialog.hasAttribute('inert')).toBe(true);
  act(() => {
    openSystemEditor('sys-a');
  });
  expect(dialog.getAttribute('aria-hidden')).toBe('false');
  expect(screen.getByRole('heading', { name: 'Edit system' })).toBeTruthy();
});

test('Esc closes the editor', async () => {
  edit('sys-a');
  await userEvent.keyboard('{Escape}');
  expect(getPanel().open).toBe(false);
});

test('editor: validates the name and glyphs, normalises glyphs, adds tags, logs the arrival, opens the new system', async () => {
  edit(null);
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
  expect(getPanel().open).toBe(false);
  expect(location.hash).toBe(`#system/${added?.id ?? ''}`);
});

test('editor: sets your rating; Cancel discards changes', async () => {
  edit('sys-a');
  await userEvent.click(screen.getByRole('radio', { name: '4' }));
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(system('sys-a')?.rating).toBe(4);

  act(() => {
    openSystemEditor('sys-a');
  });
  await userEvent.type(screen.getByRole('textbox', { name: 'Region' }), ' changed');
  await userEvent.click(screen.getAllByRole('button', { name: 'Cancel' })[1]!); // the footer one (the header ✕ is the other)
  expect(system('sys-a')?.region).toBe('Odyalutai');
  expect(getPanel().open).toBe(false);
});

test('focus: the editor takes it, and closing returns it to what opened the panel', async () => {
  render(
    <>
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
  await userEvent.click(screen.getByRole('button', { name: 'New system' }));
  expect(document.activeElement?.id).toBe('sysName');
  await userEvent.keyboard('{Escape}');
  expect(document.activeElement?.textContent).toBe('New system');
});

test('on a phone the grab bar closes the editor, but refuses while there are unsaved changes', async () => {
  const handle = () => document.querySelector<HTMLButtonElement>('#systemPanel [data-sheet-handle]')!;
  edit('sys-a');
  await userEvent.click(handle()); // nothing changed yet: it closes
  expect(getPanel().open).toBe(false);

  act(() => {
    openSystemEditor('sys-a');
  });
  await userEvent.type(screen.getByRole('textbox', { name: /System name/ }), ' Prime');
  await userEvent.click(handle());
  expect(getPanel()).toMatchObject({ open: true, mode: 'edit' });
  await userEvent.click(screen.getAllByRole('button', { name: 'Cancel' })[1]!); // Cancel still discards
  expect(getPanel().open).toBe(false);
});
