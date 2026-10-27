// A play session (pure; `now` is injectable): started when you sit down to play, ended with a recap. Kept in
// nms_state.json → session (the one in progress) and sessions[] (past ones). The recap is computed from the log
// itself (visits and packet runs inside the window), so nothing is stored twice; only finished timers are counted
// as they happen, since a dismissed timer leaves the list.
import { isPlainObject } from './util.ts';
import type { System } from './systems-model.ts';
import type { OutlawSettings } from './state.ts';

export interface Session {
  startedAt: string;
  timersDone: number;
}
export interface PastSession extends Session {
  endedAt: string;
}
export const MAX_SESSIONS = 50;

const isDate = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const count = (value: unknown): number => (Number.isInteger(value) && Number(value) > 0 ? Number(value) : 0);

export function normalizeSession(value: unknown): Session | null {
  if (!isPlainObject(value) || !isDate(value.startedAt)) return null;
  return { startedAt: value.startedAt, timersDone: count(value.timersDone) };
}

export function normalizeSessions(value: unknown): PastSession[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap(item =>
      isPlainObject(item) && isDate(item.startedAt) && isDate(item.endedAt)
        ? [{ startedAt: item.startedAt, endedAt: item.endedAt, timersDone: count(item.timersDone) }]
        : []
    )
    .slice(-MAX_SESSIONS);
}

export interface Recap {
  startedAt: string;
  endedAt: string | null; // null while it runs
  elapsed: number; // ms
  visits: number;
  systemsVisited: number;
  newSystems: number;
  packetRuns: number;
  packets: number;
  units: number; // estimates at the player's own averages (Outlaw Run settings)
  nanites: number;
  timersDone: number;
}

export function sessionRecap(
  state: { systems: System[]; outlaw: OutlawSettings },
  session: Session & { endedAt?: string },
  now: number
): Recap {
  const start = Date.parse(session.startedAt);
  const end = session.endedAt ? Date.parse(session.endedAt) : now;
  const inside = (iso: string | undefined) => {
    const at = iso ? Date.parse(iso) : NaN;
    return at >= start && at <= end;
  };
  let visits = 0;
  let packetRuns = 0;
  let packets = 0;
  let systemsVisited = 0;
  let newSystems = 0;
  for (const system of state.systems) {
    const here = system.visits.filter(visit => inside(visit.at));
    visits += here.length;
    if (here.length) systemsVisited += 1;
    if (inside(system.createdAt)) newSystems += 1;
    for (const visit of here) {
      if (!visit.packets) continue;
      packetRuns += 1;
      packets += visit.packets;
    }
  }
  return {
    startedAt: session.startedAt,
    endedAt: session.endedAt ?? null,
    elapsed: Math.max(0, end - start),
    visits,
    systemsVisited,
    newSystems,
    packetRuns,
    packets,
    units: packets * state.outlaw.unitsPerPacket,
    nanites: packets * state.outlaw.nanitesPerPacket,
    timersDone: session.timersDone
  };
}

// The recap as plain text, for pasting into your own notes.
export function recapText(recap: Recap, formatDuration: (ms: number) => string): string {
  const lines = [
    `ATLAS session · ${new Date(recap.startedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · ${formatDuration(recap.elapsed)}`,
    `${recap.visits} visit${recap.visits === 1 ? '' : 's'} to ${recap.systemsVisited} system${recap.systemsVisited === 1 ? '' : 's'}${recap.newSystems ? ` (${recap.newSystems} new)` : ''}`
  ];
  if (recap.packetRuns)
    lines.push(
      `${recap.packetRuns} packet run${recap.packetRuns === 1 ? '' : 's'}: ${recap.packets} packets, ~${recap.nanites.toLocaleString()} Nanites, ~${recap.units.toLocaleString()} Units (your averages)`
    );
  if (recap.timersDone) lines.push(`${recap.timersDone} timer${recap.timersDone === 1 ? '' : 's'} finished`);
  return lines.join('\n');
}
