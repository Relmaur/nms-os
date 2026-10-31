// Runs (design 28): routes that turn time into Units, each checked against the game version the wiki describes.
// Outlaw stations is the first run; it sits under In progress while the player is flying one. Suggestions are a
// later phase.
import { formatCountdown } from '@atlas/core/format';
import { outlawSummary } from '@atlas/core/outlaw';
import { useAppState } from '../useAppState.ts';
import { useNow } from '../useNow.ts';
import { RUN_CARD, SECTION_LABEL, WorksPill, useGameVersion } from './run-bits.tsx';

export function Runs() {
  const state = useAppState();
  const now = useNow();
  const game = useGameVersion();
  const summary = outlawSummary(state, now);
  const { progress, rows, ready } = summary;
  return (
    <div className="flex flex-col gap-4 max-w-2xl pt-[env(safe-area-inset-top)]">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-screen-title text-ink-bright mt-4 lg:mt-0">Runs</h1>
        <p className="text-sub text-ink-muted">
          Routes that turn time into Units{game ? `, checked against the game data for v${game.version}` : ''}.
        </p>
      </header>

      <section aria-labelledby="runsOutlawLabel" className="flex flex-col mt-2">
        <h2 id="runsOutlawLabel" className={SECTION_LABEL}>
          {progress ? 'In progress' : 'Built in'}
        </h2>
        <a
          id="runsOutlaw"
          href="#outlaw"
          className={`${RUN_CARD} ${progress ? 'border-scanner-cyan-edge hover:border-scanner-cyan-edge-strong' : 'hover:border-control-edge-hover'}`}
        >
          <span className="flex items-center gap-2.5">
            <i className="ph-bold ph-path text-xl text-scanner-cyan-pale" aria-hidden="true" />
            <span className="flex-1 min-w-0 font-display font-bold text-[15px] text-ink-bright truncate">
              Outlaw stations
            </span>
            <WorksPill game={game} />
          </span>
          <span className="text-sub text-ink-muted">
            Sell Suspicious Packets at outlaw stations, one restock at a time.
          </span>
          {progress ? (
            <>
              <span
                role="progressbar"
                aria-label="Stations done this run"
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.done}
                className="flex gap-1.5"
              >
                {Array.from({ length: progress.total }, (_, i) => (
                  <span
                    key={i}
                    className={`flex-1 h-1 rounded-full ${i < progress.done ? 'bg-scanner-cyan-glow' : 'bg-slate-800'}`}
                  />
                ))}
              </span>
              <span className="flex items-center justify-between gap-3 text-[14px] text-ink">
                <span className="min-w-0 truncate">
                  Station {progress.done + 1} of {progress.total}
                  {progress.next ? ` · ${progress.next.system.name}` : ' · all restocking'}
                </span>
                {progress.restockAt !== null && (
                  <span className="font-mono text-[13px] text-scanner-cyan-pale shrink-0">
                    restock {formatCountdown(progress.restockAt - now)}
                  </span>
                )}
              </span>
            </>
          ) : (
            <span className="text-[14px] text-ink">
              {rows.length
                ? `${String(ready.length)} of ${String(rows.length)} station${rows.length === 1 ? '' : 's'} ready`
                : 'No outlaw stations yet'}
            </span>
          )}
        </a>
      </section>
    </div>
  );
}
