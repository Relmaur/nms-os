// Which ship, Multi-Tool or Exosuit is being edited. Home, Fleet, a ship's screen and the header search all open the
// same editor (mounted once, in PlayerEditors). Notes open on their own screen instead (notes/note-nav.ts).
import { useSyncExternalStore } from 'react';
import type { GearKind } from '@atlas/core/gear';

export type Editing = { kind: 'gear'; id: string | null; preset: GearKind; session: number } | null;

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
export function closeEditor(): void {
  set(null);
  const element = opener;
  opener = null;
  if (element?.isConnected) element.focus({ preventScroll: true });
}
