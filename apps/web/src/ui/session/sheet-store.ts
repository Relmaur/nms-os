// The Session screen (#session, design 04) and what it holds while the page is open: which add-timer sheet is open,
// and the recap of a session just ended. Not saved.
import { useSyncExternalStore } from 'react';
import type { PastSession } from '@atlas/core/session';
import type { TimerKind } from '@atlas/core/timers';

let adding: TimerKind | null = null;
let recap: PastSession | null = null;
const listeners = new Set<() => void>();
function changed(): void {
  listeners.forEach(listener => {
    listener();
  });
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Opens the Session screen, from Home's timers, the header's timer button and the session bar. */
export const openSession = (): void => {
  location.hash = '#session';
};

export const useAddingTimer = (): TimerKind | null => useSyncExternalStore(subscribe, () => adding);
export const openAddTimer = (kind: TimerKind): void => {
  adding = kind;
  changed();
};
export const closeAddTimer = (): void => {
  adding = null;
  changed();
};

export const useRecap = (): PastSession | null => useSyncExternalStore(subscribe, () => recap);
export const showRecap = (ended: PastSession): void => {
  recap = ended;
  changed();
};
export const clearRecap = (): void => {
  recap = null;
  changed();
};
