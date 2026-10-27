// Whether the Session sheet is open, and what it shows: the timers (with the add form), or the recap of a session
// just ended. Not saved: it lasts while the page is open.
import { useSyncExternalStore } from 'react';
import type { PastSession } from '@atlas/core/session';

export type SheetView = { open: false } | { open: true; recap: PastSession | null };

let view: SheetView = { open: false };
const listeners = new Set<() => void>();
function set(next: SheetView): void {
  view = next;
  listeners.forEach(listener => {
    listener();
  });
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const useSheetView = (): SheetView => useSyncExternalStore(subscribe, () => view);
export const openSessionSheet = (): void => {
  set({ open: true, recap: null });
};
export const showRecap = (recap: PastSession): void => {
  set({ open: true, recap });
};
export const closeSessionSheet = (): void => {
  set({ open: false });
};
