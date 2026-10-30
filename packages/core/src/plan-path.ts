// The recipe planner as one path in play order (design 13): Gather, then each crafting round, then the final craft.
// A step is done when everything in it is ticked; the first one that isn't is where the player is now. Rounds are
// ticked whole: the design draws their items as pills, not checkboxes.
import { stepKey, untick, type BuildPlan, type PlanProgress } from './planner.ts';
import { lastVisit, type System } from './systems-model.ts';
import { parsePortal } from './location.ts';

export type PathKind = 'gather' | 'round' | 'final';
export interface PathStep {
  kind: PathKind;
  round: number; // the crafting round's index for 'round', else -1
  state: 'done' | 'now' | 'next';
}

export function planPath(plan: BuildPlan, progress: PlanProgress): { steps: PathStep[]; current: number } {
  const done = [
    progress.gathered === plan.raw.length,
    ...plan.rounds.map((_, index) => progress.round(index) === 'done'),
    progress.complete
  ];
  const kinds: [PathKind, number][] = [
    ['gather', -1],
    ...plan.rounds.map((_, i): [PathKind, number] => ['round', i]),
    ['final', -1]
  ];
  const now = done.indexOf(false);
  return {
    steps: kinds.map(([kind, round], i) => ({
      kind,
      round,
      state: done[i] ? 'done' : i === now ? 'now' : 'next'
    })),
    current: now === -1 ? kinds.length - 1 : now
  };
}

/** The ticks after marking a whole crafting round crafted, or not crafted when it already is. */
export function toggleRound(plan: BuildPlan, ticked: ReadonlySet<string>, index: number): Set<string> {
  const keys = (plan.rounds[index] ?? []).map(stepKey);
  if (keys.every(key => ticked.has(key)))
    return keys.reduce<Set<string>>((next, key) => untick(next, key), new Set(ticked));
  const next = new Set(ticked);
  keys.forEach(key => next.add(key));
  return next;
}

/** How many of `title` the plan needs, and at which step (1-based): raw materials at Gather, crafts at their round. */
export function planNeed(plan: BuildPlan, title: string): { qty: number; step: number; kind: PathKind } | null {
  const raw = plan.raw.find(entry => entry.title === title);
  if (raw) return { qty: raw.qty, step: 1, kind: 'gather' };
  const round = plan.rounds.findIndex(list => list.some(step => step.title === title));
  if (round !== -1) {
    const step = plan.rounds[round]?.find(item => item.title === title);
    return step ? { qty: step.qty, step: round + 2, kind: 'round' } : null;
  }
  return plan.product.title === title ? { qty: plan.product.qty, step: plan.rounds.length + 2, kind: 'final' } : null;
}

export interface Closest {
  system: System;
  planet: string; // the planet's name, or '' when the system itself mentions the item
  base: boolean;
  regions: number | null; // from the system the player is in, when both addresses are known in one galaxy
}

// "Closest for you" (design 34): the logged places that name the item, in a planet's name, tags or notes or the
// system's, nearest the system the player was last in. Only the player's own words count: the log doesn't know what
// grows where unless they wrote it down.
export function closestFor(systems: System[], title: string): Closest | null {
  const word = new RegExp(`(^|[^a-z])${title.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z])`);
  const says = (...texts: string[]) => texts.some(text => word.test(text.toLowerCase()));
  const when = (system: System) => Date.parse(lastVisit(system)?.at ?? system.createdAt) || 0;
  const here = [...systems].sort((a, b) => when(b) - when(a))[0];
  const from = here ? parsePortal(here.glyphs) : null;
  const found = systems.flatMap(system => {
    const planets = system.planets.filter(planet => says(planet.name, planet.notes, planet.tags.join(' ')));
    const at = parsePortal(system.glyphs);
    const regions =
      from && at && here?.galaxy === system.galaxy ? Math.hypot(at.x - from.x, at.y - from.y, at.z - from.z) : null;
    const rows = planets.map(planet => ({ system, planet: planet.name, base: planet.tags.includes('base'), regions }));
    if (!rows.length && says(system.notes, system.tags.join(' ')))
      rows.push({ system, planet: '', base: false, regions });
    return rows;
  });
  // Nearest first where a distance is known, then the base, then the most recently visited.
  return (
    found.sort(
      (a, b) =>
        (a.regions ?? Infinity) - (b.regions ?? Infinity) ||
        Number(b.base) - Number(a.base) ||
        when(b.system) - when(a.system)
    )[0] ?? null
  );
}
