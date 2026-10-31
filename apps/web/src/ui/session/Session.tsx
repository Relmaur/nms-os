// The Session screen (#session, design 04): the live session's clock and tallies (or a way to start one, or the
// recap of the one just ended), every countdown as a card, buttons to add a refiner, crop or custom timer, and the
// switch for alerts while the app is asleep.
import { useEffect, useRef, useState } from 'react';
import { formatClock, formatDuration } from '@atlas/core/format';
import { recapText, sessionRecap, type PastSession, type Session as LiveSession } from '@atlas/core/session';
import { timerRows, type TimerKind } from '@atlas/core/timers';
import { showToast } from '../../app/ui.ts';
import { usePushStatus } from '../../app/push.ts';
import { endSession, resumeSession, startSession } from '../actions.ts';
import { Button } from '../parts/Button.tsx';
import { HoldToActivate } from '../parts/Gesture.tsx';
import { useAppState } from '../useAppState.ts';
import { AlertsSwitch } from './AlertsSwitch.tsx';
import { clearRecap, openAddTimer, showRecap, useRecap } from './sheet-store.ts';
import { TimerRow } from './TimerRow.tsx';
import { useClock } from './useClock.ts';

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

export function Session() {
  const state = useAppState();
  const recap = useRecap();
  const minute = useClock(false);
  const rows = timerRows(state, minute);
  // Seconds matter for the live clock and for a countdown under an hour.
  const now = useClock(
    state.session !== null || rows.some(row => row.endsAt > minute && row.endsAt - minute < 3_600_000)
  );
  const { session } = state;

  return (
    <div className="relative flex flex-col gap-6 max-w-2xl pt-[env(safe-area-inset-top)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-4 -top-6 h-[380px] -z-10 bg-[radial-gradient(110%_45%_at_50%_0%,#0b2a33_0%,transparent_100%)]"
      />
      {recap ? <Recap ended={recap} /> : session ? <Live session={session} now={now} /> : <Idle />}

      <section aria-labelledby="timersTitle" className="flex flex-col gap-3">
        <h1 id="timersTitle" className="font-display font-bold text-[15px] tracking-[0.04em] text-ink-bright">
          Timers
        </h1>
        {rows.length ? (
          <ul id="timerList" className="flex flex-col gap-3">
            {rows.map(row => (
              <TimerRow
                key={row.type === 'timer' ? row.timer.id : `outlaw-${row.system.id}`}
                row={row}
                now={now}
                restockHours={state.outlaw.restockHours}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sub text-ink-muted">Nothing counting down. Start a refiner run, a crop or any timer.</p>
        )}
        <AddButtons />
        <Alerts />
      </section>
    </div>
  );
}

function Live({ session, now }: { session: LiveSession; now: number }) {
  const state = useAppState();
  const recap = sessionRecap(state, session, now);
  const tallies: [number, string, string][] = [
    [recap.newSystems, plural(recap.newSystems, 'new system'), 'text-ink-bright'],
    [recap.visits, plural(recap.visits, 'visit'), 'text-ink-bright'],
    [recap.timersDone, plural(recap.timersDone, 'timer done', 'timers done'), 'text-ready-emerald-pale']
  ];
  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ready-emerald-lit">
            <span
              aria-hidden="true"
              className="w-[7px] h-[7px] rounded-full bg-ready-emerald-lit shadow-[0_0_0_4px_rgba(52,211,153,0.2)]"
            />
            Session live
          </span>
          <span id="sessionClock" className="font-mono text-[30px] font-medium text-ink-bright tabular-nums">
            {/* The design's clock drops the leading zero: 1:12:08. */}
            {formatClock(now - Date.parse(session.startedAt)).replace(/^0(?=\d)/, '')}
          </span>
        </div>
        <Button
          onClick={() => {
            const ended = endSession();
            if (ended) showRecap(ended);
          }}
        >
          End session
        </Button>
      </header>
      <ul aria-label="This session" className="grid grid-cols-3 gap-2">
        {tallies.map(([count, label, colour]) => (
          <li key={label} className="rounded-[14px] bg-panel-glass border border-hairline px-3 py-2.5">
            <span className={`block font-display text-xl font-extrabold ${colour}`}>{count}</span>
            <span className="block text-[11px] text-ink-muted">{label}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Idle() {
  return (
    <HoldToActivate
      id="sessionStart"
      label="Hold to start session"
      hint="Counts systems, visits and timers until you stop"
      onActivate={startSession}
    />
  );
}

function Recap({ ended }: { ended: PastSession }) {
  const state = useAppState();
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, []);
  const recap = sessionRecap(state, ended, Date.parse(ended.endedAt));
  const rows: [string, string][] = [
    ['Played', formatDuration(recap.elapsed)],
    ['Visits', `${String(recap.visits)} · ${String(recap.systemsVisited)} ${plural(recap.systemsVisited, 'system')}`],
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
    <section aria-labelledby="recapTitle" className="flex flex-col gap-3">
      <h2
        ref={title}
        id="recapTitle"
        tabIndex={-1}
        className="font-display font-extrabold text-[22px] text-ink-bright focus:outline-hidden"
      >
        Session recap
      </h2>
      <dl id="sessionRecap" className="rounded-card border border-hairline bg-panel-glass divide-y divide-hairline">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-sub text-ink-muted">{label}</dt>
            <dd className="font-mono text-sm text-ink-bright tabular-nums text-right">{value}</dd>
          </div>
        ))}
        {recap.packetRuns > 0 && (
          <div className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-sub text-ink-muted">Estimated earnings</dt>
            <dd className="text-right">
              <span className="block font-mono text-sm text-purple-200 tabular-nums">
                ~{recap.nanites.toLocaleString()} Nanites
              </span>
              <span className="block font-mono text-sm text-units-amber-text tabular-nums">
                ~{recap.units.toLocaleString()} Units
              </span>
              <span className="block text-[11px] text-ink-muted">at your Outlaw Run averages</span>
            </dd>
          </div>
        )}
      </dl>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="ghost"
          icon="ph-arrow-counter-clockwise"
          className="mr-auto"
          onClick={() => {
            resumeSession(ended);
            clearRecap();
          }}
        >
          Resume session
        </Button>
        <Button icon="ph-copy" onClick={copy}>
          Copy
        </Button>
        <Button variant="primary" size="M" onClick={clearRecap}>
          Done
        </Button>
      </div>
    </section>
  );
}

const ADD: [TimerKind, string, string][] = [
  ['refine', 'Refiner', 'border-scanner-cyan-edge bg-[rgba(34,211,238,0.08)] text-scanner-cyan-text'],
  ['crop', 'Crop', 'border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] text-[#fde68a]'],
  ['custom', 'Custom', 'border-control-edge bg-slate-ground text-ink']
];

function AddButtons() {
  return (
    <div className="grid grid-cols-3 gap-2 mt-1">
      {ADD.map(([kind, label, colours]) => (
        <button
          key={kind}
          type="button"
          aria-haspopup="dialog"
          aria-controls="timerSheet"
          onClick={() => {
            openAddTimer(kind);
          }}
          className={`h-11 rounded-control border text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:brightness-125 ${colours}`}
        >
          <i className="ph-bold ph-plus" aria-hidden="true" />
          <span>
            {label}
            <span className="sr-only"> timer</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// Where the alert for a finished timer stands. Without push (its switch, ADR-0006), a web app can only alert while the
// browser runs it; with it on, the relay sends the alert when the app is asleep.
function Alerts() {
  const permission = usePermission();
  const push = usePushStatus();
  return (
    <section aria-label="Alerts" className="flex flex-col gap-2 mt-1">
      <div className="rounded-2xl bg-panel-glass border border-hairline p-3.5 flex items-center gap-3">
        <i className="ph-bold ph-bell text-[22px] text-scanner-cyan-pale shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <AlertsSwitch id="sessionPushSwitch" subtitle="Your phone pings you, even locked" />
        </div>
      </div>
      <p className="text-caption text-ink-muted leading-relaxed">
        {push.enabled && !push.problem
          ? 'A finished timer alerts here, and within a minute of its end on this device even while the app is asleep. '
          : `${alertsNote(permission)} If the phone puts the app to sleep, the alert waits for your return. `}
        Turned on, your device’s push address and each timer’s end time go to the alert server; timer names stay here.
      </p>
    </section>
  );
}

function alertsNote(permission: NotificationPermission): string {
  return permission === 'granted'
    ? 'A finished timer alerts here, vibrates and sends a notification.'
    : permission === 'denied'
      ? 'A finished timer alerts here and vibrates (notifications are off in the browser’s site settings).'
      : 'A finished timer alerts here and vibrates; your first timer asks to send notifications too.';
}

// The notification permission, kept current when it's answered or changed in the browser's settings.
function usePermission(): NotificationPermission {
  const supported = 'Notification' in window;
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : 'denied');
  useEffect(() => {
    if (!supported || !('permissions' in navigator)) return;
    let status: PermissionStatus | null = null;
    const update = () => {
      setPermission(Notification.permission);
    };
    navigator.permissions
      .query({ name: 'notifications' })
      .then(result => {
        status = result;
        result.addEventListener('change', update);
      })
      .catch(() => undefined);
    return () => status?.removeEventListener('change', update);
  }, [supported]);
  return permission;
}
