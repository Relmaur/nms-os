// What Outlaw stations, the first run, shows (pure; `now` is injectable for tests): stations ranked by restock, the run
// in progress, the next stations and the estimates at the player's own averages. Home's outlaw card and the Runs tab
// read the same summary, so they never disagree.
import { HOUR_MS, packetsLogged, rankOutlaw, type OutlawStatus, type System } from './systems-model.ts';
import type { OutlawSettings } from './state.ts';

export interface OutlawRow {
  system: System;
  status: OutlawStatus;
}
export interface OutlawSummary {
  rows: OutlawRow[]; // ready first, then by soonest restock
  ready: OutlawRow[];
  runs: number; // packet runs logged across all stations
  nanitesEarned: number;
  progress: OutlawProgress | null; // the run the player started, until it's done or a restock has passed
  run: OutlawRow[]; // the next stations: ready ones, up to what the run still needs
  runPackets: number;
  runUnits: number;
  runNanites: number;
}

export interface OutlawProgress {
  startedAt: number;
  done: number; // stations with a packet run logged since the start
  total: number; // the run size
  next: OutlawRow | null; // the station to fly to now, or null when every station is restocking
  restockAt: number | null; // when the first station of this run restocks, once one is done
}

// A run is just its start time (`outlaw.runStartedAt`): the stations it covers are the packet runs logged since, so
// two devices that each log a station never disagree about which ones the run holds. A run left open ends by itself
// once a restock has passed, since by then its first station is ready for the next one.
export function outlawProgress(
  rows: OutlawRow[],
  outlaw: OutlawSettings & { runStartedAt?: string },
  now: number
): OutlawProgress | null {
  const startedAt = outlaw.runStartedAt ? Date.parse(outlaw.runStartedAt) : NaN;
  if (Number.isNaN(startedAt) || startedAt > now || now - startedAt >= outlaw.restockHours * HOUR_MS) return null;
  const done = rows.filter(row => row.system.visits.some(visit => visit.packets && Date.parse(visit.at) >= startedAt));
  if (done.length >= outlaw.runSize) return null;
  const restocks = done.map(row => row.status.readyAt);
  return {
    startedAt,
    done: done.length,
    total: outlaw.runSize,
    next: rows.find(row => row.status.ready) ?? null,
    restockAt: restocks.length ? Math.min(...restocks) : null
  };
}

export function outlawSummary(
  state: { systems: System[]; outlaw: OutlawSettings & { runStartedAt?: string } },
  now: number
): OutlawSummary {
  const { outlaw } = state;
  const rows = rankOutlaw(state.systems, outlaw.restockHours, now);
  const ready = rows.filter(row => row.status.ready);
  const progress = outlawProgress(rows, outlaw, now);
  const run = ready.slice(0, outlaw.runSize - (progress?.done ?? 0));
  const runPackets = run.length * outlaw.packetsPerVisit;
  const packets = rows.reduce((sum, row) => sum + packetsLogged(row.system), 0);
  return {
    rows,
    ready,
    runs: rows.reduce((sum, row) => sum + row.system.visits.filter(visit => visit.packets).length, 0),
    nanitesEarned: packets * outlaw.nanitesPerPacket,
    progress,
    run,
    runPackets,
    runUnits: runPackets * outlaw.unitsPerPacket,
    runNanites: runPackets * outlaw.nanitesPerPacket
  };
}

/** What one full run earns at the player's averages, whatever is ready: the run settings' estimate. */
export function fullRunEstimate(outlaw: OutlawSettings): { packets: number; units: number; nanites: number } {
  const packets = outlaw.runSize * outlaw.packetsPerVisit;
  return { packets, units: packets * outlaw.unitsPerPacket, nanites: packets * outlaw.nanitesPerPacket };
}

// The settings are the player's own numbers; these bounds only keep a typo from breaking the estimates.
export const OUTLAW_LIMITS: Record<keyof OutlawSettings, [min: number, max: number]> = {
  restockHours: [1, 720],
  packetsPerVisit: [1, 99],
  runSize: [1, 15],
  unitsPerPacket: [1, 1e9],
  nanitesPerPacket: [1, 1e6]
};

export function clampOutlawSetting(key: keyof OutlawSettings, value: unknown): number {
  const [min, max] = OUTLAW_LIMITS[key];
  return Math.min(max, Math.max(min, Math.round(Number(value)) || min));
}
