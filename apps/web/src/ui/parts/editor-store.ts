// Which of the player's own records is being edited: a ship or Multi-Tool, or a note. Home, the books, the Ships &
// Multi-Tools and Notes screens and the header search all open the same editors (mounted once, in PlayerEditors).
import { useSyncExternalStore } from 'react';
import type { GearKind } from '@atlas/core/gear';

export type Editing =
  | { kind: 'gear'; id: string | null; preset: GearKind; session: number }
  | { kind: 'note'; id: string | null; pins: string[]; session: number }
  | null;

let editing: Editing = null;
let session = 0;
// What had focus when an editor opened, so closing hands focus back there (captured here: by the time the dialog's
// effects run, its autofocused field already has it).
let opener: HTMLElement | null = null;
const listeners = new Set<() => void>();
function set(next: Editing): void {
  editing = next;
  listeners.forEach(listener => {
    listener();
  });
}

export function useEditing(): Editing {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => editing
  );
}

function remember(): void {
  if (!editing) opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

export function openGearEditor(id: string | null = null, preset: GearKind = 'starship'): void {
  remember();
  set({ kind: 'gear', id, preset, session: ++session });
}
// A new note opened from a book or Home starts pinned there.
export function openNoteEditor(id: string | null = null, pins: string[] = []): void {
  remember();
  set({ kind: 'note', id, pins, session: ++session });
}
export function closeEditor(): void {
  set(null);
  const element = opener;
  opener = null;
  if (element?.isConnected) element.focus({ preventScroll: true });
}
