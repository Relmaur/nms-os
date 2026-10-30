// The 256 galaxies for the editor's galaxy picker (wiki/galaxies.json, written by the wiki indexer), loaded once when
// the editor first opens. A few kilobytes, precached with the other wiki indexes. Without it the picker becomes a
// plain text field, so a galaxy can still be typed.
import { useSyncExternalStore } from 'react';
import { GalaxiesFileSchema, type Galaxy } from '@atlas/core/location';

let galaxies: Galaxy[] | null = null;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function loadGalaxies(): Promise<void> {
  pending ??= fetch('wiki/galaxies.json', { signal: AbortSignal.timeout(8000) })
    .then((res): Promise<unknown> => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${String(res.status)}`))))
    .then(json => {
      galaxies = GalaxiesFileSchema.parse(json).galaxies;
      listeners.forEach(listener => {
        listener();
      });
    })
    .catch((err: unknown) => {
      pending = null; // the next editor retries
      console.warn('[atlas]', { event: 'galaxies-unavailable', reason: err instanceof Error ? err.name : String(err) });
    });
  return pending;
}

export function useGalaxies(): Galaxy[] | null {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => galaxies
  );
}

// Tests start from a known list without fetching.
export function setGalaxiesForTests(value: Galaxy[] | null): void {
  galaxies = value;
  pending = value ? Promise.resolve() : null;
}
