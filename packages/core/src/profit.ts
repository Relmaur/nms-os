// "Best crafts", the first recommendation (docs/calculators.md): which items gain the most value over what their raw
// materials would sell for. Pure arithmetic on the wiki's values and recipes, through the recipe planner's own build
// order (buildPlan), so a ranked item plans exactly as it ranks. Base values only: a trade terminal pays more or less
// depending on the system's economy, which the wiki's infoboxes don't give.
import { buildPlan, planRecipes, findItem, type Catalog } from './planner.ts';
import type { GameItem } from './game-data.ts';

export interface RankedCraft {
  item: GameItem;
  makes: number; // one batch of the final recipe can make more than one
  value: number; // what the batch sells for
  rawValue: number; // what its raw materials would sell for instead
  gain: number;
  multiplier: number | null; // value ÷ rawValue (null when the raw materials have no value)
  steps: number; // crafting and cooking steps, the product included
  blueprint: boolean; // some step needs a learned blueprint
  farmed: boolean; // a raw material is a crop: the wiki's "Harvested Agricultural Substance" (Frost Crystal, Star Bulb…)
}

// gain: most Units gained; per-step: gain per crafting step; multiplier: value over raw value; steps: fewest steps
// first (then most gained).
export type CraftSort = 'gain' | 'per-step' | 'multiplier' | 'steps';
export interface RankOptions {
  sort?: CraftSort;
  category?: string; // a Codex category ("products", "cooking"), or every category
  maxSteps?: number;
  noFarming?: boolean; // leave out crafts that need a crop
}
const CROP = 'Harvested Agricultural Substance';

// Every current item with a wiki value and a crafting or cooking recipe, ranked once; filter and sort with
// sortCrafts(). Items with a raw material the wiki gives no value are left out and counted, never guessed.
export function rankCrafts(catalog: Catalog): { crafts: RankedCraft[]; skipped: number } {
  const crafts: RankedCraft[] = [];
  let skipped = 0;
  for (const item of new Set(catalog.byTitle.values())) {
    if (item.obsolete || !item.value || !planRecipes(catalog, item).length) continue;
    const plan = buildPlan(catalog, item.title, 1);
    if (!plan) continue;
    let rawValue = 0;
    let unknown = false;
    let farmed = false;
    for (const raw of plan.raw) {
      const found = raw.item ?? findItem(catalog, raw.title);
      if (found?.fields.type === CROP) farmed = true;
      const value = found?.value;
      if (value === undefined) unknown = true;
      else rawValue += value * raw.qty;
    }
    if (unknown) {
      skipped += 1;
      continue;
    }
    const makes = plan.product.makes;
    const value = item.value * makes;
    crafts.push({
      item,
      makes,
      value,
      rawValue,
      gain: value - rawValue,
      multiplier: rawValue > 0 ? value / rawValue : null,
      steps: plan.steps,
      blueprint: [plan.product, ...plan.rounds.flat()].some(step => step.recipe.blueprint),
      farmed
    });
  }
  return { crafts, skipped };
}

export function sortCrafts(
  crafts: RankedCraft[],
  { sort = 'gain', category, maxSteps, noFarming }: RankOptions = {}
): RankedCraft[] {
  const score = (craft: RankedCraft) =>
    sort === 'per-step'
      ? craft.gain / craft.steps
      : sort === 'multiplier'
        ? (craft.multiplier ?? 0)
        : sort === 'steps'
          ? -craft.steps
          : craft.gain;
  return crafts
    .filter(
      craft =>
        (!category || craft.item.category === category) &&
        (!maxSteps || craft.steps <= maxSteps) &&
        (!noFarming || !craft.farmed)
    )
    .sort(
      (a, b) =>
        score(b) - score(a) || (sort === 'steps' ? b.gain - a.gain : 0) || a.item.title.localeCompare(b.item.title)
    );
}
