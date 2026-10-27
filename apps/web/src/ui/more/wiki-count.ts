// How many current game-data pages the Codex holds. main.js loads the wiki index once for the header search and
// reports the count here; More reads it.
import { useSyncExternalStore } from 'react';

let count: number | null = null;
const listeners = new Set<() => void>();

export function setWikiCount(next: number): void {
  count = next;
  listeners.forEach(listener => {
    listener();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWikiCount(): number | null {
  return useSyncExternalStore(subscribe, () => count);
}
