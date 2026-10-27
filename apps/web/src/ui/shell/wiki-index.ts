// The Codex's light index on the main page: main.ts loads it once; the header search searches it, and More and the
// sidebar show how many current game-data pages it holds.
import { useSyncExternalStore } from 'react';
import { isOld, type PreparedEntry } from '@atlas/core/search';

let entries: PreparedEntry[] = [];
let count: number | null = null; // null until loaded
const listeners = new Set<() => void>();

export function setWikiEntries(next: PreparedEntry[]): void {
  entries = next;
  count = next.filter(entry => !isOld(entry)).length;
  listeners.forEach(listener => {
    listener();
  });
}

export const wikiEntries = (): PreparedEntry[] => entries;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWikiCount(): number | null {
  return useSyncExternalStore(subscribe, () => count);
}
