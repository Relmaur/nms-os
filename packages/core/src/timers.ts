// Timers for a play session (pure; `now` is injectable): refiner batches, crop harvests and custom timers, kept in
// nms_state.json → timers, plus outlaw restocks shown beside them. A refiner's time is the wiki's refining time; a
// crop's or a custom timer's is the player's own input (ADR-0003).
import { isPlainObject } from './util.ts';
import { rankOutlaw, type System } from './systems-model.ts';
import type { GameItem, Recipe } from './game-data.ts';

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
  return value.flatMap((item, index) => {
    if (!isPlainObject(item)) return [];
    const { id, kind, label, startedAt, endsAt, alerted } = item;
    if (typeof label !== 'string' || !label.trim()) return [];
    if (typeof startedAt !== 'string' || typeof endsAt !== 'string') return [];
    if (Number.isNaN(Date.parse(startedAt)) || Number.isNaN(Date.parse(endsAt))) return [];
    return [
      {
        id: typeof id === 'string' && id ? id : `timer-${Date.parse(startedAt).toString(36)}-${String(index)}`,
        kind: TIMER_KINDS.includes(kind as TimerKind) ? (kind as TimerKind) : 'custom', // checked just above
        label: label.trim(),
        startedAt,
        endsAt,
        alerted: alerted === true
      }
    ];
  });
}

// The wiki gives a refining time per unit made (the Codex shows it as "s per unit"), and a refiner makes whole
// batches of the recipe's output, so a run takes the units of its whole batches × that time.
export function refineDuration(recipe: Pick<Recipe, 'outputs' | 'seconds'>, amount: number): number | null {
  const qty = Number(recipe.outputs[0]?.qty); // the wiki writes some amounts as text
  const perBatch = Number.isFinite(qty) && qty > 0 ? qty : 1;
  if (!recipe.seconds || amount <= 0) return null;
  return Math.ceil(amount / perBatch) * perBatch * recipe.seconds * 1000;
}

// Longer than this is a typo, and far enough out to overflow a date.
export const MAX_TIMER_MS = 30 * 24 * 3_600_000;

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

// Everything counting down, soonest first (your timers and outlaw stations still restocking, read-only), then your
// finished timers waiting to be dismissed, the latest first.
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
  const running = [...own.filter(row => !row.status.done), ...restocking].sort((a, b) => a.endsAt - b.endsAt);
  return [...running, ...own.filter(row => row.status.done).sort((a, b) => b.endsAt - a.endsAt)];
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

// What a finished timer's alert says, in the app and in a push notification.
const KIND_TITLE: Record<TimerKind, string> = {
  refine: 'Refiner done',
  crop: 'Ready to harvest',
  custom: 'Timer done'
};
export function timerNotice(timer: Pick<Timer, 'kind' | 'label'>): { title: string; body: string } {
  return { title: `${KIND_TITLE[timer.kind]}: ${timer.label}`, body: 'Tap to open ATLAS.' };
}

// The timers a sleeping device should still be pushed about (ADR-0006): not yet announced, and not over an hour late
// (the relay gives up then), soonest first and at most `max`. Only ids and end times leave the device.
export const MAX_PUSHES = 20; // what the relay keeps per device
// Ids the relay accepts; an older or hand-edited log may hold others, which are left to the app's own alert.
const PUSH_ID = /^[A-Za-z0-9_-]{1,80}$/;
export function pendingPushes(timers: Timer[], now: number, max = MAX_PUSHES): { id: string; at: number }[] {
  const seen = new Set<string>();
  return timers
    .filter(timer => {
      const at = Date.parse(timer.endsAt);
      if (timer.alerted || !PUSH_ID.test(timer.id) || seen.has(timer.id)) return false;
      if (!(at > now - 3_600_000 && at <= now + MAX_TIMER_MS)) return false;
      seen.add(timer.id);
      return true;
    })
    .map(timer => ({ id: timer.id, at: Date.parse(timer.endsAt) }))
    .sort((a, b) => a.at - b.at)
    .slice(0, max);
}

// A new crop timer starts from the time last set for that crop (its name, any case), from the timers still listed.
export function lastCropMinutes(timers: Timer[], name: string): number | null {
  const key = name.trim().toLowerCase();
  const last = timers
    .filter(timer => timer.kind === 'crop' && timer.label.toLowerCase() === key)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
  return last ? Math.round((Date.parse(last.endsAt) - Date.parse(last.startedAt)) / 60000) : null;
}

export interface RefineOption {
  title: string; // what the refiner makes
  recipes: Recipe[]; // refine recipes with a wiki time
}

// Everything a refiner makes with a known time, by name, for the timer picker.
export function refineOptions(items: Iterable<GameItem>): RefineOption[] {
  const options: RefineOption[] = [];
  for (const item of items) {
    if (item.obsolete) continue;
    const recipes = item.recipes.filter(recipe => recipe.type === 'refine' && recipe.seconds);
    if (recipes.length) options.push({ title: item.title, recipes });
  }
  return options.sort((a, b) => a.title.localeCompare(b.title));
}

// "Methane + Lithium + Quartzite", the inputs as a short line.
export const recipeInputs = (recipe: Recipe): string =>
  recipe.inputs.map(input => `${String(input.qty)} ${input.name}`).join(' + ');
