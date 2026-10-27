// The Codex's data: every article with its body (the offline bundle, parsed with its schema), the player's drafts,
// and the last verification. Loaded once per page; saving or removing a draft reloads it.
import { useSyncExternalStore } from 'react';
import { makeIndex, type CodexIndex } from '@atlas/core/codex';
import { VerificationSchema, type Verification } from '@atlas/core/wiki-files';
import { WikiSearch } from '../../app/wiki-data.js';

export type CodexData =
  { status: 'loading' } | { status: 'ready'; index: CodexIndex; verification: Verification | null };

let data: CodexData = { status: 'loading' };
const listeners = new Set<() => void>();
function set(next: CodexData): void {
  data = next;
  listeners.forEach(listener => {
    listener();
  });
}

async function loadVerification(): Promise<Verification | null> {
  try {
    const res = await fetch('verification.json', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    return res.ok ? (VerificationSchema.safeParse(await res.json()).data ?? null) : null;
  } catch {
    return null; // only a sync or verify writes it; without it the landing says "Not verified on this copy"
  }
}

// A missing or malformed bundle leaves the Codex empty, and the landing says how to build it.
export async function loadCodex(): Promise<void> {
  const [entries, bundle, verification] = await Promise.all([
    WikiSearch.load('./', { withBodies: true }),
    WikiSearch.loadBundle('./'),
    loadVerification()
  ]);
  set({ status: 'ready', index: makeIndex(entries, bundle?.aliases ?? {}), verification });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export const useCodex = (): CodexData => useSyncExternalStore(subscribe, () => data);

export function setCodexForTests(next: CodexData): void {
  set(next);
}
