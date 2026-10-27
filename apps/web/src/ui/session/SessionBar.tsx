// The session bar: a slim strip at the top of every screen while you play (a session is on, or a timer is listed).
// It answers "how long have I played, what's next to finish, what did I log" in one glance, and opens the Session
// sheet for the rest.
import { formatCountdown, formatDuration } from '@atlas/core/format';
import { sessionRecap } from '@atlas/core/session';
import { timerStatus, type Timer } from '@atlas/core/timers';
import { useAppState } from '../useAppState.ts';
import { openSessionSheet } from './sheet-store.ts';
import { useClock } from './useClock.ts';
import { TIMER_ICON } from './TimerRow.tsx';

const HOUR = 3_600_000;

export function SessionBar() {
  const state = useAppState();
  const { session, timers } = state;
  const minute = useClock(false);
  const running = timers.filter(timer => !timerStatus(timer, minute).done);
  const soonest = [...running].sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt))[0];
  const now = useClock(soonest !== undefined && Date.parse(soonest.endsAt) - minute < HOUR);
  const done = timers.filter(timer => timerStatus(timer, now).done);
  if (!session && !timers.length) return null;

  const recap = session ? sessionRecap(state, session, now) : null;
  const tallies = recap
    ? [
        `${String(recap.visits)} visit${recap.visits === 1 ? '' : 's'}`,
        recap.packetRuns ? `${String(recap.packetRuns)} run${recap.packetRuns === 1 ? '' : 's'}` : ''
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <button
      type="button"
      id="sessionBar"
      onClick={openSessionSheet}
      aria-haspopup="dialog"
      aria-controls="sessionSheet"
      className="session-bar group w-full mb-5 flex items-center gap-3 h-12 pl-3.5 pr-2.5 rounded-xl text-left"
    >
      <span className={`session-dot ${session ? 'is-live' : ''}`} aria-hidden="true" />
      <span className="shrink-0 flex flex-col leading-tight">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
          {session ? 'Session' : 'Timers'}
        </span>
        {recap && <span className="font-mono text-sm text-white tabular-nums">{formatDuration(recap.elapsed)}</span>}
      </span>
      <span className="min-w-0 flex-1 flex items-center gap-2 border-l border-slate-800 pl-3">
        <NextUp soonest={soonest} done={done} now={now} />
      </span>
      {tallies && <span className="hidden sm:block shrink-0 text-xs text-slate-400">{tallies}</span>}
      <i className="ph-bold ph-caret-up text-slate-500 group-hover:text-slate-300" aria-hidden="true" />
    </button>
  );
}

// The soonest countdown leads, so a finished timer left undismissed never hides a refiner about to finish; finished
// ones show as a count beside it (or lead, once nothing is running).
function NextUp({ soonest, done, now }: { soonest: Timer | undefined; done: Timer[]; now: number }) {
  const finished = done[0];
  if (!soonest)
    return finished ? (
      <>
        <i className="ph-fill ph-check-circle text-emerald-400 shrink-0" aria-hidden="true" />
        <span className="truncate text-sm text-emerald-200">
          {done.length === 1 ? `${finished.label} done` : `${String(done.length)} timers done`}
        </span>
      </>
    ) : (
      <span className="truncate text-sm text-slate-400">No timers running</span>
    );
  return (
    <>
      <i className={`ph-bold ${TIMER_ICON[soonest.kind]} text-cyan-300 shrink-0`} aria-hidden="true" />
      <span className="truncate text-sm text-slate-200">{soonest.label}</span>
      <span className="shrink-0 font-mono text-sm text-cyan-300 tabular-nums">
        {formatCountdown(timerStatus(soonest, now).remaining)}
      </span>
      {done.length > 0 && (
        <span className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-200">
          <i className="ph-bold ph-check" aria-hidden="true" />
          {done.length} done
        </span>
      )}
    </>
  );
}
