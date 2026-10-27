// What the Outlaw Run shows (pure; `now` is injectable for tests): stations ranked by restock, the next run and its
// estimates at the player's own averages. Home's outlaw card reads the same summary, so the two never disagree.
import { packetsLogged, rankOutlaw, type OutlawStatus, type System } from './systems-model.ts';
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
  run: OutlawRow[]; // the next run: ready stations up to the run size
  runPackets: number;
  runUnits: number;
  runNanites: number;
}

export function outlawSummary(state: { systems: System[]; outlaw: OutlawSettings }, now: number): OutlawSummary {
  const { outlaw } = state;
  const rows = rankOutlaw(state.systems, outlaw.restockHours, now);
  const ready = rows.filter(row => row.status.ready);
  const run = ready.slice(0, outlaw.runSize);
  const runPackets = run.length * outlaw.packetsPerVisit;
  const packets = rows.reduce((sum, row) => sum + packetsLogged(row.system), 0);
  return {
    rows,
    ready,
    runs: rows.reduce((sum, row) => sum + row.system.visits.filter(visit => visit.packets).length, 0),
    nanitesEarned: packets * outlaw.nanitesPerPacket,
    run,
    runPackets,
    runUnits: runPackets * outlaw.unitsPerPacket,
    runNanites: runPackets * outlaw.nanitesPerPacket
  };
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
