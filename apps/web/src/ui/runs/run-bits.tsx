// Shared by Runs (28) and a run's own screen (07): the game version a run is checked against, and its status pill.
import { useEffect } from 'react';
import type { GameVersion } from '@atlas/core/facts';
import { loadFacts, useFacts } from '../gear/facts-store.ts';

// The wiki's newest Update page (wiki/facts.json), or null until it loads or when the file has none.
export function useGameVersion(): GameVersion | null {
  const facts = useFacts();
  useEffect(() => {
    void loadFacts();
  }, []);
  return facts?.game ?? null;
}

/** "Works in v7.10": the run relies on nothing the current game data contradicts. */
export function WorksPill({ game }: { game: GameVersion | null }) {
  if (!game) return null;
  return (
    <span className="h-6 px-2.5 shrink-0 rounded-full inline-flex items-center border border-ready-emerald-edge bg-ready-emerald-tint text-[11px] font-semibold text-ready-emerald-text whitespace-nowrap">
      Works in v{game.version}
    </span>
  );
}

export const RUN_CARD = 'rounded-card bg-panel-glass border border-hairline p-4 flex flex-col gap-3';
export const SECTION_LABEL = 'text-label uppercase text-ink-label px-1 pb-2';
