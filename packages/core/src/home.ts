// What the Home screen shows (pure; `now` is injectable for tests): the current system, the warp-back list and the
// next outlaw stations to hit.
import { RACES, lastVisit, type System } from './systems-model.ts';
import { formatAgo } from './format.ts';
import { timerStatus, type Timer, type TimerStatus } from './timers.ts';
import { outlawSummary, type OutlawRow } from './outlaw.ts';
import type { OutlawSettings } from './state.ts';

export type { OutlawRow } from './outlaw.ts';

export const HOME_RECENT_LIMIT = 5;
export const HOME_OUTLAW_LIMIT = 3;

export interface HomeSummary {
  current: System | undefined; // the system visited (or added) most recently
  recent: System[];
  outlaw: {
    total: number;
    ready: number;
    next: OutlawRow[]; // ready stations, best first
    soonest: OutlawRow | undefined; // when none is ready: the first to restock
    runNanites: number; // a run over the ready stations, at the player's own averages
  };
}

export function lastActivity(system: System): number {
  return Date.parse(lastVisit(system)?.at ?? system.createdAt) || 0;
}

export function homeSummary(state: { systems: System[]; outlaw: OutlawSettings }, now: number): HomeSummary {
  const [current, ...rest] = [...state.systems].sort((a, b) => lastActivity(b) - lastActivity(a));
  const outlaw = outlawSummary(state, now);
  return {
    current,
    recent: rest.slice(0, HOME_RECENT_LIMIT),
    outlaw: {
      total: outlaw.rows.length,
      ready: outlaw.ready.length,
      next: outlaw.ready.slice(0, HOME_OUTLAW_LIMIT),
      soonest: outlaw.ready.length ? undefined : outlaw.rows[0],
      runNanites: outlaw.runNanites
    }
  };
}

// The live status line over the current system's name: true and current, or it isn't shown as "here". A system
// never visited says when it was logged instead.
export function heroStatus(system: System, now: number): string {
  const last = lastVisit(system);
  return last ? `You are here · ${formatAgo(last.at, now)}` : `Logged ${formatAgo(system.createdAt, now)}`;
}

// The current system's place and character, in the game's order: region, galaxy, race, economy. Wealth is drawn as
// stars beside it, so it isn't in the text.
export function heroPlace(system: System): string {
  const race = system.race ? RACES[system.race] : '';
  return [system.region, system.galaxy, race, system.economy].filter(Boolean).join(' · ');
}

// A Warp back row's second line: galaxy, the first tag, and when you were last there.
export function warpBackLine(system: System, now: number): string {
  const last = lastVisit(system);
  return [system.galaxy, system.tags[0], last ? formatAgo(last.at, now) : 'never visited'].filter(Boolean).join(' · ');
}

export const HOME_TIMER_LIMIT = 2;

// The timer cards on Home, as the design shows them: the soonest still running, then the newest finished (waiting
// to be dismissed), so a finished timer is never crowded out by running ones. A free card takes the next of either.
export function homeTimers(
  timers: Timer[],
  now: number,
  limit = HOME_TIMER_LIMIT
): { timer: Timer; status: TimerStatus }[] {
  const rows = timers.map(timer => ({ timer, status: timerStatus(timer, now) }));
  const running = rows.filter(row => !row.status.done).sort((a, b) => a.status.remaining - b.status.remaining);
  const done = rows
    .filter(row => row.status.done)
    .sort((a, b) => Date.parse(b.timer.endsAt) - Date.parse(a.timer.endsAt));
  const first = [running[0], done[0]].filter(row => row !== undefined);
  const shown = [...first, ...running.slice(1), ...done.slice(1)].slice(0, limit);
  return [...shown.filter(row => !row.status.done), ...shown.filter(row => row.status.done)];
}
