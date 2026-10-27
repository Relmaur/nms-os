// Timers for a play session (pure; `now` is injectable): refiner batches, crop harvests and custom timers, kept in
// nms_state.json → timers, plus outlaw restocks shown beside them. A refiner's time is the wiki's refining time; a
// crop's or a custom timer's is the player's own input (ADR-0003).
import { isPlainObject } from './util.ts';
import { rankOutlaw, type System } from './systems-model.ts';
import type { Recipe } from './game-data.ts';

export type TimerKind = 'refine' | 'crop' | 'custom';
export const TIMER_KINDS: TimerKind[] = ['refine', 'crop', 'custom'];

export interface Timer {
  id: string;
  kind: TimerKind;
  label: string; // "250 Activated Quartzite", "Frostwort", "Frigate mission"
  startedAt: string;
  endsAt: string;
  alerted: boolean; // set once the finish was announced, so a reload or another tab never announces it again
}

// Keeps the timers that can be shown; a damaged entry is dropped, not the whole list.
export function normalizeTimers(value: unknown): Timer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!isPlainObject(item)) return [];
    const { id, kind, label, startedAt, endsAt, alerted } = item;
    if (typeof label !== 'string' || !label.trim()) return [];
    if (typeof startedAt !== 'string' || typeof endsAt !== 'string') return [];
    if (Number.isNaN(Date.parse(startedAt)) || Number.isNaN(Date.parse(endsAt))) return [];
    return [
      {
        id: typeof id === 'string' && id ? id : `timer-${Date.parse(startedAt).toString(36)}`,
        kind: TIMER_KINDS.includes(kind as TimerKind) ? (kind as TimerKind) : 'custom', // checked just above
        label: label.trim(),
        startedAt,
        endsAt,
        alerted: alerted === true
      }
    ];
  });
}

// A refiner works through one batch at a time, so a run takes whole batches × the wiki's seconds per batch.
export function refineDuration(recipe: Pick<Recipe, 'outputs' | 'seconds'>, amount: number): number | null {
  const qty = Number(recipe.outputs[0]?.qty); // the wiki writes some amounts as text
  const perBatch = Number.isFinite(qty) && qty > 0 ? qty : 1;
  if (!recipe.seconds || amount <= 0) return null;
  return Math.ceil(amount / perBatch) * recipe.seconds * 1000;
}

export interface TimerStatus {
  remaining: number; // ms, 0 once done
  done: boolean;
  progress: number; // 0…1
}

export function timerStatus(timer: Pick<Timer, 'startedAt' | 'endsAt'>, now: number): TimerStatus {
  const start = Date.parse(timer.startedAt);
  const end = Date.parse(timer.endsAt);
  const remaining = Math.max(0, end - now);
  const span = end - start;
  return { remaining, done: remaining === 0, progress: span > 0 ? Math.min(1, (now - start) / span) : 1 };
}

// Everything counting down, soonest first: your timers, then outlaw stations still restocking (read-only rows).
export type TimerRow =
  | { type: 'timer'; timer: Timer; status: TimerStatus; endsAt: number }
  | { type: 'outlaw'; system: System; endsAt: number };

export function timerRows(
  state: { timers: Timer[]; systems: System[]; outlaw: { restockHours: number } },
  now: number
): TimerRow[] {
  const own = state.timers.map(timer => ({
    type: 'timer' as const,
    timer,
    status: timerStatus(timer, now),
    endsAt: Date.parse(timer.endsAt)
  }));
  const restocking = rankOutlaw(state.systems, state.outlaw.restockHours, now)
    .filter(row => !row.status.ready)
    .map(row => ({ type: 'outlaw' as const, system: row.system, endsAt: row.status.readyAt }));
  return [...own, ...restocking].sort((a, b) => a.endsAt - b.endsAt);
}

export const runningTimers = (timers: Timer[], now: number): Timer[] =>
  timers.filter(timer => Date.parse(timer.endsAt) > now);

// Finished timers whose finish hasn't been announced yet.
export const dueForAlert = (timers: Timer[], now: number): Timer[] =>
  timers.filter(timer => !timer.alerted && Date.parse(timer.endsAt) <= now);

// When the next unannounced timer finishes (ms epoch), to arm one timeout for it.
export function nextDue(timers: Timer[]): number | null {
  const pending = timers.filter(timer => !timer.alerted).map(timer => Date.parse(timer.endsAt));
  return pending.length ? Math.min(...pending) : null;
}

// A new crop timer starts from the time last set for that crop (its name, any case), from the timers still listed.
export function lastCropMinutes(timers: Timer[], name: string): number | null {
  const key = name.trim().toLowerCase();
  const last = timers
    .filter(timer => timer.kind === 'crop' && timer.label.toLowerCase() === key)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
  return last ? Math.round((Date.parse(last.endsAt) - Date.parse(last.startedAt)) / 60000) : null;
}
