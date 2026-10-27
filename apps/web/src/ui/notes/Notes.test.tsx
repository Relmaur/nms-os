import { beforeEach, expect, test } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { appState, setAppState } from '../../app/store.ts';
import { closeEditor } from '../parts/editor-store.ts';
import { PlayerEditors } from '../PlayerEditors.tsx';
import { Book } from '../guides/Book.tsx';
import { Notes } from './Notes.tsx';
import { renderNote } from './NoteCard.tsx';

const note = {
  title: 'Grid',
  body: 'Main **weapon** in [[Infra-Knife Accelerator]]',
  createdAt: '2026-10-01T00:00:00Z'
};

beforeEach(() => {
  localStorage.clear();
  act(() => {
    closeEditor();
    setAppState(buildState({ notes: [{ ...note, id: 'n1', pins: ['book3'], updatedAt: '2026-10-01T00:00:00Z' }] }));
  });
});

// The sanitiser itself is checked in a real browser (tests/e2e/player.spec.mjs): DOMPurify does nothing under happy-dom.
test('[[Name]] links become Codex searches', () => {
  expect(renderNote('[[Gold|the gold]] and [[Infra-Knife Accelerator]]')).toContain(
    'href="wiki/#/?q=Infra-Knife%20Accelerator"'
  );
});

test('a note pinned to Book III shows under it, and a new one from there starts pinned to it', async () => {
  render(
    <>
      <Book book="book3" />
      <PlayerEditors />
    </>
  );
  const pinned = screen.getByRole('region', { name: 'Your notes' });
  expect(within(pinned).getByRole('heading', { name: 'Grid' })).toBeTruthy();
  expect(pinned.querySelector('strong')?.textContent).toBe('weapon');

  await userEvent.click(within(pinned).getByRole('button', { name: 'Add a note to Book III' }));
  await userEvent.type(screen.getByLabelText('Title'), 'Second');
  expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Book III' }).checked).toBe(true);
  await userEvent.click(screen.getByRole('button', { name: 'Add note' }));
  expect(appState.notes.find(item => item.title === 'Second')?.pins).toEqual(['book3']);
  expect(within(pinned).getByRole('heading', { name: 'Second' })).toBeTruthy();
});

test('a note deleted elsewhere while open isn’t brought back by a plain Save', async () => {
  render(
    <>
      <Notes />
      <PlayerEditors />
    </>
  );
  await userEvent.click(screen.getByRole('button', { name: 'Edit Grid' }));
  act(() => {
    setAppState(buildState({ notes: [] })); // another device's copy, adopted mid-edit
  });
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('alert').textContent).toContain('deleted on another device');
  expect(appState.notes).toHaveLength(0);
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(appState.notes.map(item => item.id)).toEqual(['n1']);
});

test('an unsaved note isn’t lost to Escape; Delete asks before it removes', async () => {
  render(
    <>
      <Notes />
      <PlayerEditors />
    </>
  );
  await userEvent.click(screen.getByRole('button', { name: 'Edit Grid' }));
  await userEvent.type(screen.getByLabelText('Title'), '!');
  await userEvent.keyboard('{Escape}');
  expect(screen.getByRole('dialog', { name: 'Edit note' })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(appState.notes).toHaveLength(1);
  await userEvent.click(screen.getByRole('button', { name: 'Delete for good' }));
  expect(appState.notes).toHaveLength(0);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByText(/No notes yet/)).toBeTruthy();
});
