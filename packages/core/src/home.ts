// What the Home screen shows (pure; `now` is injectable for tests): the current system, the warp-back list and the
// next outlaw stations to hit.
import { lastVisit, rankOutlaw, type OutlawStatus, type System } from './systems-model.ts';
import type { OutlawSettings } from './state.ts';

export const HOME_RECENT_LIMIT = 5;
export const HOME_OUTLAW_LIMIT = 3;

export interface OutlawRow {
  system: System;
  status: OutlawStatus;
}
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
  const rows = rankOutlaw(state.systems, state.outlaw.restockHours, now);
  const ready = rows.filter(row => row.status.ready);
  const runPackets = Math.min(ready.length, state.outlaw.runSize) * state.outlaw.packetsPerVisit;
  return {
    current,
    recent: rest.slice(0, HOME_RECENT_LIMIT),
    outlaw: {
      total: rows.length,
      ready: ready.length,
      next: ready.slice(0, HOME_OUTLAW_LIMIT),
      soonest: ready.length ? undefined : rows[0],
      runNanites: runPackets * state.outlaw.nanitesPerPacket
    }
  };
}
