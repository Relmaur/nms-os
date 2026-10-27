// The Session sheet: start or end a play session, every countdown (your timers and outlaw restocks), the form to
// add a timer, and the recap once a session ends. A bottom sheet on phones (the grab bar closes it), a side panel
// from md up.
import { useEffect, useRef } from 'react';
import { formatDuration } from '@atlas/core/format';
import { recapText, sessionRecap, type PastSession } from '@atlas/core/session';
import { timerRows } from '@atlas/core/timers';
import { showToast } from '../../app/ui.ts';
import { endSession, startSession } from '../actions.ts';
import { loadGameData } from '../calculators/game-data.ts';
import { SheetGrab, useSheetDrag, useSheetOpen } from '../parts/Sheet.tsx';
import { useAppState } from '../useAppState.ts';
import { AddTimer } from './AddTimer.tsx';
import { closeSessionSheet, showRecap, useSheetView } from './sheet-store.ts';
import { TimerRow } from './TimerRow.tsx';
import { useClock } from './useClock.ts';

const HOUR = 3_600_000;

export function SessionSheet() {
  const view = useSheetView();
  const sheet = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  useSheetDrag(sheet, closeSessionSheet);
  useSheetOpen(view.open, closeSessionSheet, { layout: '(max-width: 767px)', focus: title });

  // The refiner picker needs the wiki's recipes; fetch them as soon as the sheet opens.
  useEffect(() => {
    if (view.open) void loadGameData();
  }, [view.open]);

  return (
    <>
      <div
        onClick={closeSessionSheet}
        className={`fixed inset-0 z-[55] bg-slate-950/60 backdrop-blur-[2px] transition-opacity duration-200 ${view.open ? '' : 'opacity-0 pointer-events-none'}`}
      />
      <div
        ref={sheet}
        id="sessionSheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sessionSheetTitle"
        aria-hidden={!view.open}
        inert={!view.open}
        className={`fixed z-[56] flex flex-col bg-slate-950 border-slate-700 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl border-t ${view.open ? '' : 'translate-y-full'} md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:max-h-none md:w-[min(28rem,92vw)] md:rounded-none md:border-t-0 md:border-l md:translate-y-0 ${view.open ? '' : 'md:translate-x-full'}`}
      >
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-6">
          <div data-sheet-grab className="sticky top-0 z-10 -mx-5 px-5 pt-3 md:pt-5 pb-3 bg-slate-950/95 backdrop-blur">
            <SheetGrab onClose={closeSessionSheet} label="Close session" />
            <div className="flex items-center justify-between gap-3">
              <h2
                ref={title}
                id="sessionSheetTitle"
                tabIndex={-1}
                className="font-display font-bold text-lg text-white focus:outline-hidden"
              >
                {view.open && view.recap ? 'Session recap' : 'Session'}
              </h2>
              <button
                type="button"
                onClick={closeSessionSheet}
                aria-label="Close"
                className="hidden md:flex w-9 h-9 rounded-xl items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900"
              >
                <i className="ph-bold ph-x text-lg" aria-hidden="true" />
              </button>
            </div>
          </div>
          {view.open && (view.recap ? <Recap ended={view.recap} /> : <Timers />)}
        </div>
      </div>
    </>
  );
}

function Timers() {
  const state = useAppState();
  const minute = useClock(false);
  const rows = timerRows(state, minute);
  const now = useClock(rows.some(row => row.endsAt > minute && row.endsAt - minute < HOUR));
  const { session } = state;
  return (
    <div className="space-y-6 pt-1">
      <SessionControl session={session} now={now} />
      <section aria-labelledby="timersHeading" className="space-y-2">
        <h3 id="timersHeading" className="panel-heading">
          Timers
        </h3>
        {rows.length ? (
          <ul id="timerList" className="space-y-1.5">
            {rows.map(row => (
              <TimerRow key={row.type === 'timer' ? row.timer.id : `outlaw-${row.system.id}`} row={row} now={now} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">
            Nothing counting down. Start a refiner run, a crop or any timer below.
          </p>
        )}
      </section>
      <AddTimer />
      <Alerts />
    </div>
  );
}

function SessionControl({ session, now }: { session: { startedAt: string } | null; now: number }) {
  if (!session)
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
        <p className="text-sm text-slate-300">
          Start when you sit down to play: the bar keeps time and tallies your visits.
        </p>
        <button
          type="button"
          onClick={startSession}
          className="shrink-0 h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center gap-2"
        >
          <i className="ph-fill ph-play" aria-hidden="true" /> Start session
        </button>
      </div>
    );
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3.5">
      <p className="flex items-center gap-2.5 text-sm text-slate-300">
        <span className="session-dot is-live" aria-hidden="true" />
        Playing for{' '}
        <span className="font-mono text-white tabular-nums">{formatDuration(now - Date.parse(session.startedAt))}</span>
      </p>
      <button
        type="button"
        onClick={() => {
          const ended = endSession();
          if (ended) showRecap(ended);
        }}
        className="shrink-0 h-10 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-slate-200"
      >
        End session
      </button>
    </div>
  );
}

// Where the system alert stands; a web app can only alert while the browser runs it.
function Alerts() {
  const supported = 'Notification' in window;
  const permission = supported ? Notification.permission : 'denied';
  return (
    <p className="text-xs text-slate-400 leading-relaxed">
      {permission === 'granted'
        ? 'A finished timer alerts here, vibrates and sends a notification'
        : permission === 'denied'
          ? 'A finished timer alerts here and vibrates (notifications are off in the browser’s site settings)'
          : 'A finished timer alerts here and vibrates; your first timer asks to send notifications too'}
      . If the phone puts the app to sleep, the alert waits for your return.
    </p>
  );
}

function Recap({ ended }: { ended: PastSession }) {
  const state = useAppState();
  const recap = sessionRecap(state, ended, Date.parse(ended.endedAt));
  const rows: [string, string][] = [
    ['Played', formatDuration(recap.elapsed)],
    [
      'Visits',
      `${String(recap.visits)} to ${String(recap.systemsVisited)} system${recap.systemsVisited === 1 ? '' : 's'}`
    ],
    ['New systems', String(recap.newSystems)],
    ['Packet runs', recap.packetRuns ? `${String(recap.packetRuns)} · ${String(recap.packets)} packets` : '0'],
    ['Timers finished', String(recap.timersDone)]
  ];
  const copy = () => {
    navigator.clipboard
      .writeText(recapText(recap, formatDuration))
      .then(() => {
        showToast('Recap copied.');
      })
      .catch(() => {
        showToast('Couldn’t copy here; select the text instead.');
      });
  };
  return (
    <div className="space-y-5 pt-1">
      <dl id="sessionRecap" className="rounded-xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-slate-400">{label}</dt>
            <dd className="font-mono text-sm text-white tabular-nums text-right">{value}</dd>
          </div>
        ))}
        {recap.packetRuns > 0 && (
          <div className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-slate-400">Estimated earnings</dt>
            <dd className="text-right">
              <span className="block font-mono text-sm text-purple-200 tabular-nums">
                ~{recap.nanites.toLocaleString()} Nanites
              </span>
              <span className="block font-mono text-sm text-amber-300 tabular-nums">
                ~{recap.units.toLocaleString()} Units
              </span>
              <span className="block text-[11px] text-slate-400">at your Outlaw Run averages</span>
            </dd>
          </div>
        )}
      </dl>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={copy}
          className="h-10 px-4 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm text-slate-200 flex items-center gap-2"
        >
          <i className="ph-bold ph-copy" aria-hidden="true" /> Copy
        </button>
        <button
          type="button"
          onClick={closeSessionSheet}
          className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm"
        >
          Done
        </button>
      </div>
    </div>
  );
}
