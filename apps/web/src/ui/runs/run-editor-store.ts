// Which run the Run editor (32) has open: a new one (id null) or one of the player's. Each open is a new session, so
// the editor remounts with a fresh draft.
import { useSyncExternalStore } from 'react';

export type RunEditing = { id: string | null; session: number } | null;

let editing: RunEditing = null;
let session = 0;
const listeners = new Set<() => void>();
function set(next: RunEditing): void {
  editing = next;
  listeners.forEach(listener => {
    listener();
  });
}

export function useRunEditing(): RunEditing {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => editing
  );
}

export function openRunEditor(id: string | null = null): void {
  set({ id, session: ++session });
}
export function closeRunEditor(): void {
  set(null);
}
