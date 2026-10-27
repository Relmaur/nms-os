// One countdown in the Session sheet: your timers (with Dismiss once done) and outlaw stations still restocking.
import { formatCountdown } from '@atlas/core/format';
import type { TimerKind, TimerRow as Row } from '@atlas/core/timers';
import { dismissTimer } from '../actions.ts';

export const TIMER_ICON: Record<TimerKind, string> = { refine: 'ph-flask', crop: 'ph-plant', custom: 'ph-timer' };
const KIND_LABEL: Record<TimerKind, string> = { refine: 'Refiner', crop: 'Crop', custom: 'Timer' };

export function TimerRow({ row, now }: { row: Row; now: number }) {
  if (row.type === 'outlaw')
    return (
      <li className="timer-row">
        <span className="timer-icon text-red-300">
          <i className="ph-bold ph-skull" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-white">{row.system.name}</span>
          <span className="block text-xs text-slate-400">Outlaw restock</span>
        </span>
        <span className="min-w-[5ch] text-right font-mono text-lg font-semibold text-cyan-300 tabular-nums">
          {formatCountdown(row.endsAt - now)}
        </span>
      </li>
    );
  const { timer, status } = row;
  return (
    <li className={`timer-row ${status.done ? 'is-done' : ''}`}>
      <span className={`timer-icon ${status.done ? 'text-emerald-300' : 'text-cyan-300'}`}>
        <i className={`ph-bold ${status.done ? 'ph-check' : TIMER_ICON[timer.kind]}`} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-white">{timer.label}</span>
        <span className="block text-xs text-slate-400">
          {status.done ? `${KIND_LABEL[timer.kind]} · done` : KIND_LABEL[timer.kind]}
        </span>
        {!status.done && (
          <span className="timer-track mt-1.5" aria-hidden="true">
            <span style={{ transform: `scaleX(${String(status.progress)})` }} />
          </span>
        )}
      </span>
      {status.done ? (
        <button
          type="button"
          onClick={() => {
            dismissTimer(timer.id);
          }}
          className="h-10 px-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20"
        >
          Dismiss<span className="sr-only"> {timer.label}</span>
        </button>
      ) : (
        <span className="min-w-[5ch] text-right font-mono text-lg font-semibold text-cyan-300 tabular-nums">
          {formatCountdown(status.remaining)}
        </span>
      )}
    </li>
  );
}
