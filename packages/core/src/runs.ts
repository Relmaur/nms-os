// Runs players make (design 32; state key `runs`, docs/state-schema.md): a named route of steps, each a verb and a
// system from the log, a wiki item, or free text. Steps that name a wiki item are checked against the game data, and
// the values a run relied on are kept with the game version they were checked in, so an update that changes one
// retires the run instead of letting it promise the old numbers (START-HERE: runs are data, not screens).
import { isPlainObject, SAFE_ID } from './util.ts';
import { findItem, type Catalog } from './planner.ts';
import type { Recipe } from './game-data.ts';

export const RUN_VERBS = { go: 'Go', farm: 'Farm', refine: 'Refine', craft: 'Craft', sell: 'Sell', do: 'Do' } as const;
export type RunVerb = keyof typeof RUN_VERBS;
export const RUN_EARNS = { units: 'Units', nanites: 'Nanites', quicksilver: 'Quicksilver', items: 'Items' } as const;
export type RunEarns = keyof typeof RUN_EARNS;

export interface RunStep {
  id: string;
  verb: RunVerb;
  target: string; // a system's or item's name, or free text
  systemId: string; // a Go step's system in the log, or ''
  qty: number | null; // how many: plants farmed, refiners, items crafted or sold
  price: number | null; // a Sell step's Units per item, when the player sets their own
}

export interface PlayerRun {
  id: string;
  name: string;
  line: string;
  earns: RunEarns;
  steps: RunStep[];
  runMinutes: number | null;
  repeatMinutes: number | null;
  timer: boolean; // start a repeat timer when the player finishes a run
  checked: { version: string; values: Record<string, string> }; // what the wiki said when it was saved
  createdAt: string;
  updatedAt: string;
}

export const MAX_RUNS = 100;
export const MAX_STEPS = 30;
const MAX_NAME = 80;
const MAX_LINE = 140;
const MAX_TARGET = 120;
const MAX_MINUTES = 30 * 24 * 60;

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const count = (value: unknown, max: number): number | null => {
  const n = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(max, Math.round(n)) : null;
};
const isVerb = (value: unknown): value is RunVerb => typeof value === 'string' && value in RUN_VERBS;
const isEarns = (value: unknown): value is RunEarns => typeof value === 'string' && value in RUN_EARNS;

function normalizeStep(item: unknown, index: number): RunStep | null {
  if (!isPlainObject(item)) return null;
  const target = text(item.target, MAX_TARGET);
  if (!target) return null;
  return {
    id: typeof item.id === 'string' && SAFE_ID.test(item.id) ? item.id : `step-${String(index + 1)}`,
    verb: isVerb(item.verb) ? item.verb : 'do',
    target,
    systemId: typeof item.systemId === 'string' && SAFE_ID.test(item.systemId) ? item.systemId : '',
    qty: count(item.qty, 1e6),
    price: count(item.price, 1e12)
  };
}

export function normalizeRuns(value: unknown): PlayerRun[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const runs: PlayerRun[] = [];
  for (const item of value) {
    if (!isPlainObject(item) || typeof item.id !== 'string' || !SAFE_ID.test(item.id) || seen.has(item.id)) continue;
    const name = text(item.name, MAX_NAME);
    if (!name) continue;
    seen.add(item.id);
    const checked = isPlainObject(item.checked) ? item.checked : {};
    const values = isPlainObject(checked.values) ? checked.values : {};
    const createdAt =
      typeof item.createdAt === 'string' && !Number.isNaN(Date.parse(item.createdAt)) ? item.createdAt : '';
    runs.push({
      id: item.id,
      name,
      line: text(item.line, MAX_LINE),
      earns: isEarns(item.earns) ? item.earns : 'units',
      steps: (Array.isArray(item.steps) ? item.steps : [])
        .map(normalizeStep)
        .filter(step => step !== null)
        .slice(0, MAX_STEPS),
      runMinutes: count(item.runMinutes, MAX_MINUTES),
      repeatMinutes: count(item.repeatMinutes, MAX_MINUTES),
      timer: item.timer === true,
      checked: {
        version: text(checked.version, 20),
        values: Object.fromEntries(
          Object.entries(values).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
        )
      },
      createdAt,
      updatedAt:
        typeof item.updatedAt === 'string' && !Number.isNaN(Date.parse(item.updatedAt)) ? item.updatedAt : createdAt
    });
  }
  return runs.slice(0, MAX_RUNS);
}

// What a step's check found: a wiki item (with the value it relied on, as `fingerprint`), a system from the log,
// free text, or a name that's neither.
export interface StepCheck {
  kind: 'wiki' | 'log' | 'text';
  detail: string; // the line under the step: "Hot Ice + Thermic Condensate", "your system · Euclid"
  key?: string; // where the fingerprint is kept in `checked.values`
  fingerprint?: string;
  value?: number; // a Sell step's wiki value in Units
}

// What kind of thing a Farm step's item is, by its wiki group.
const KIND_OF: Record<string, string> = {
  resources: 'a resource',
  products: 'a product',
  cooking: 'a cooking product',
  fish: 'a fish',
  technology: 'a technology',
  building: 'a building part'
};

const recipeLine = (recipe: Recipe) =>
  recipe.inputs.map(input => (input.qty === 1 ? input.name : `${input.name} ×${String(input.qty)}`)).join(' + ');
const recipeSignature = (recipe: Recipe) =>
  `${recipe.inputs.map(input => `${input.name}×${String(input.qty)}`).join('+')}>${String(recipe.outputs[0]?.qty ?? '')}`;

/**
 * Checks a step against the log and the wiki. A Go step names a system; Farm and Sell need the item to exist (Sell
 * also its value); Refine and Craft need a recipe of that kind that makes the item. With no catalog (the game data
 * hasn't loaded), item steps are free text: nothing is claimed.
 */
export function checkStep(
  step: RunStep,
  catalog: Catalog | null,
  systems: { id: string; name: string; galaxy: string }[]
): StepCheck {
  if (step.verb === 'go') {
    const system = systems.find(s => s.id === step.systemId) ?? systems.find(s => s.name === step.target);
    return system
      ? { kind: 'log', detail: ['your system', system.galaxy].filter(Boolean).join(' · ') }
      : { kind: 'text', detail: 'not in your log' };
  }
  const item = step.verb === 'do' ? undefined : findItem(catalog, step.target);
  if (!item) return { kind: 'text', detail: catalog && step.verb !== 'do' ? 'not in the wiki' : 'free text' };
  const key = `${step.verb}:${item.title}`;
  if (step.verb === 'refine' || step.verb === 'craft') {
    const recipes = item.recipes.filter(
      recipe => recipe.type === step.verb && !recipe.obsolete && findItem(catalog, recipe.outputs[0]?.name) === item
    );
    const [first] = recipes;
    if (!first)
      return { kind: 'text', detail: `no ${step.verb === 'refine' ? 'refiner' : 'crafting'} recipe in the wiki` };
    const time = first.seconds ? ` · ${String(first.seconds)} s` : '';
    return {
      kind: 'wiki',
      detail: step.verb === 'refine' ? `from ${recipeLine(first)}${time}` : recipeLine(first),
      key,
      fingerprint: recipes.map(recipeSignature).sort().join('|')
    };
  }
  if (step.verb === 'sell') {
    if (item.value === undefined) return { kind: 'text', detail: 'the wiki gives no value' };
    return {
      kind: 'wiki',
      detail: `${item.value.toLocaleString('en-US')} Units each`,
      key,
      fingerprint: String(item.value),
      value: item.value
    };
  }
  return { kind: 'wiki', detail: KIND_OF[item.category] ?? item.category, key, fingerprint: 'found' };
}

export interface RunEstimate {
  units: number; // Units per run, from Sell steps
  perHour: number | null;
  byYourNumbers: boolean; // a price the player set stands in for a wiki value
  wikiSteps: number[]; // 1-based steps that use wiki values
}

export function runEstimate(
  run: Pick<PlayerRun, 'steps' | 'runMinutes'>,
  catalog: Catalog | null,
  systems: { id: string; name: string; galaxy: string }[]
): RunEstimate {
  let units = 0;
  let byYourNumbers = false;
  const wikiSteps: number[] = [];
  run.steps.forEach((step, i) => {
    const check = checkStep(step, catalog, systems);
    if (check.kind === 'wiki') wikiSteps.push(i + 1);
    if (step.verb !== 'sell') return;
    const price = step.price ?? check.value;
    if (price === undefined) return;
    if (step.price !== null) byYourNumbers = true;
    units += price * (step.qty ?? 1);
  });
  return {
    units,
    perHour: run.runMinutes && units ? Math.round((units * 60) / run.runMinutes) : null,
    byYourNumbers,
    wikiSteps
  };
}

/** The wiki values a run relies on, as saved with it. */
export function snapshotRun(
  run: Pick<PlayerRun, 'steps'>,
  catalog: Catalog | null,
  version: string
): PlayerRun['checked'] {
  const values: Record<string, string> = {};
  for (const step of run.steps) {
    const check = checkStep(step, catalog, []);
    if (check.key && check.fingerprint) values[check.key] = check.fingerprint;
  }
  return { version, values };
}

/**
 * 'works' while every value the run relied on still reads the same in the game data; 'changed' once an update has
 * changed or removed one (the run is retired); 'unknown' until the game data is in.
 */
export function runStatus(run: PlayerRun, catalog: Catalog | null): 'works' | 'changed' | 'unknown' {
  if (!catalog || !run.checked.version) return 'unknown'; // saved before the game data could load: nothing checked
  const now = snapshotRun(run, catalog, '').values;
  return Object.entries(run.checked.values).every(([key, value]) => now[key] === value) ? 'works' : 'changed';
}

/** "Step 2", "Steps 2–5", "Steps 1, 3–4". */
export function stepRanges(steps: number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < steps.length; i++) {
    const start = steps[i] ?? 0;
    let end = start;
    while (steps[i + 1] === end + 1) end = steps[++i] ?? end;
    parts.push(end === start ? String(start) : `${String(start)}–${String(end)}`);
  }
  return `${steps.length === 1 ? 'Step' : 'Steps'} ${parts.join(', ')}`;
}
