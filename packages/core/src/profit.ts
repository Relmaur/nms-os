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
}

export type CraftSort = 'gain' | 'per-step';
export interface RankOptions {
  sort?: CraftSort;
  category?: string; // a Codex category ("products", "cooking"), or every category
  maxSteps?: number;
}

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
    for (const raw of plan.raw) {
      const value = (raw.item ?? findItem(catalog, raw.title))?.value;
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
      blueprint: [plan.product, ...plan.rounds.flat()].some(step => step.recipe.blueprint)
    });
  }
  return { crafts, skipped };
}

export function sortCrafts(
  crafts: RankedCraft[],
  { sort = 'gain', category, maxSteps }: RankOptions = {}
): RankedCraft[] {
  const score = (craft: RankedCraft) => (sort === 'per-step' ? craft.gain / craft.steps : craft.gain);
  return crafts
    .filter(craft => (!category || craft.item.category === category) && (!maxSteps || craft.steps <= maxSteps))
    .sort((a, b) => score(b) - score(a) || a.item.title.localeCompare(b.item.title));
}
