// The cited facts (wiki/facts.json, ADR-0003), loaded once when a gear editor first opens. A few kilobytes, precached
// with the other wiki indexes. Without them the slot picker keeps its own limits and states no rule.
import { useSyncExternalStore } from 'react';
import { FactsFileSchema, type FactsFile } from '@atlas/core/facts';

let facts: FactsFile | null = null;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function loadFacts(): Promise<void> {
  pending ??= fetch('wiki/facts.json', { signal: AbortSignal.timeout(8000) })
    .then((res): Promise<unknown> => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${String(res.status)}`))))
    .then(json => {
      facts = FactsFileSchema.parse(json);
      listeners.forEach(listener => {
        listener();
      });
    })
    .catch((err: unknown) => {
      pending = null; // the next editor retries
      console.warn('[atlas]', { event: 'facts-unavailable', reason: err instanceof Error ? err.name : String(err) });
    });
  return pending;
}

export function useFacts(): FactsFile | null {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => facts
  );
}

// Tests start from a known file without fetching.
export function setFactsForTests(value: FactsFile | null): void {
  facts = value;
  pending = value ? Promise.resolve() : null;
}
