// The wiki dataset for the calculators (wiki/game-data.json), loaded once when Calculators first opens and parsed
// with GameDataSchema; the verification report only adds the "verified on" line, so its absence is fine.
import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { GameDataSchema } from '@atlas/core/game-data';
import { makeCatalog, type Catalog } from '@atlas/core/planner';

const VerificationSchema = z.object({ status: z.string(), checkedAt: z.string() }).loose();
export type GameDataState =
  | { status: 'idle' | 'loading' | 'failed' }
  | { status: 'ready'; catalog: Catalog; verification: z.infer<typeof VerificationSchema> | null };

let state: GameDataState = { status: 'idle' };
const listeners = new Set<() => void>();
function set(next: GameDataState): void {
  state = next;
  listeners.forEach(listener => {
    listener();
  });
}

let pending: Promise<void> | null = null;
export function loadGameData(): Promise<void> {
  pending ??= (async () => {
    set({ status: 'loading' });
    try {
      const [data, verification] = await Promise.all([
        // ~2.5 MB on first open (then served by the service worker); give a slow phone connection room.
        fetch('wiki/game-data.json', { signal: AbortSignal.timeout(20000) }).then((res): Promise<unknown> =>
          res.ok ? res.json() : Promise.reject(new Error(`HTTP ${String(res.status)}`))
        ),
        fetch('wiki/verification.json', { cache: 'no-store', signal: AbortSignal.timeout(5000) })
          .then(res => (res.ok ? res.json() : null))
          .then(json => VerificationSchema.safeParse(json).data ?? null)
          .catch(() => null)
      ]);
      set({ status: 'ready', catalog: makeCatalog(GameDataSchema.parse(data)), verification }); // a malformed file fails here, loudly
    } catch (err) {
      pending = null; // opening Calculators again retries
      console.warn('[atlas]', {
        event: 'game-data-unavailable',
        reason: err instanceof Error ? err.name : String(err)
      });
      set({ status: 'failed' });
    }
  })();
  return pending;
}

export function useGameData(): GameDataState {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state
  );
}

// Tests start from a known dataset without fetching.
export function setGameDataForTests(next: GameDataState): void {
  pending = next.status === 'ready' ? Promise.resolve() : null;
  set(next);
}
