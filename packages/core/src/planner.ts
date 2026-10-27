// Recipe planner over the wiki dataset (wiki/game-data.json): expands crafting and cooking recipes down
// to raw materials. Pure: the catalog and the chosen alternatives are passed in (docs/calculators.md).
import type { GameData, GameItem, Recipe, RecipeType } from './game-data.ts';

export const PLAN_TYPES: readonly RecipeType[] = ['craft', 'cook']; // refining is a way to obtain raw materials, not a production step
export const PLAN_MAX_DEPTH = 14;

export interface Catalog {
  byTitle: Map<string, GameItem>;
  aliases: Record<string, string>;
  pages: number;
}

export interface PlanNode {
  title: string;
  item: GameItem | undefined;
  qty: number;
  recipes: Recipe[];
  children: PlanNode[];
  recipe?: Recipe;
  index?: number;
  batches?: number;
  makes?: number;
}

export interface RawTotal {
  item: GameItem | undefined;
  qty: number;
}

// Current pages win over obsolete ones with the same title; removed pages are left out.
export function makeCatalog(data: Pick<GameData, 'items'> & { aliases?: Record<string, string> }): Catalog {
  const byTitle = new Map<string, GameItem>();
  data.items
    .filter(item => !item.removed)
    .sort((a, b) => Number(Boolean(a.obsolete)) - Number(Boolean(b.obsolete)))
    .forEach(item => {
      if (!byTitle.has(item.title.toLowerCase())) byTitle.set(item.title.toLowerCase(), item);
    });
  return { byTitle, aliases: data.aliases ?? {}, pages: data.items.filter(item => !item.removed).length };
}

// Exact title, case-insensitive, or an old name the wiki redirects ("Rigogen" -> "Kelp Sac").
export function findItem(catalog: Catalog | null | undefined, name: string | undefined): GameItem | undefined {
  if (!catalog || !name) return undefined;
  const lower = name.trim().toLowerCase();
  const alias = Object.keys(catalog.aliases).find(key => key.toLowerCase() === lower);
  const target = alias === undefined ? undefined : catalog.aliases[alias];
  return catalog.byTitle.get(lower) ?? (target === undefined ? undefined : catalog.byTitle.get(target.toLowerCase()));
}

export function planRecipes(catalog: Catalog, item: GameItem): Recipe[] {
  return item.recipes.filter(
    recipe =>
      PLAN_TYPES.includes(recipe.type) &&
      !recipe.obsolete &&
      findItem(catalog, recipe.outputs[0]?.name) === item &&
      !recipe.inputs.some(input => findItem(catalog, input.name) === item)
  ); // "X + Wild Yeast -> Wild Yeast" multipliers aren't steps
}

// `choices` maps an item title to the index of the alternative recipe to use (default: the first).
export function expandPlan(
  catalog: Catalog,
  name: string,
  qty: number,
  choices: Record<string, number> = {},
  depth = 0,
  path: Set<string> = new Set()
): PlanNode {
  const item = findItem(catalog, name);
  const title = item?.title ?? name;
  const recipes = item && depth < PLAN_MAX_DEPTH && !path.has(title) ? planRecipes(catalog, item) : [];
  const node: PlanNode = { title, item, qty, recipes, children: [] };
  const index = Math.min(choices[title] ?? 0, recipes.length - 1);
  const recipe = recipes[index];
  if (!recipe) return node;
  const perBatch = Number(recipe.outputs[0]?.qty) || 1;
  const batches = Math.ceil(qty / perBatch); // a craft that yields 20 still needs whole batches
  const next = new Set(path).add(title);
  return {
    ...node,
    recipe,
    index,
    batches,
    makes: batches * perBatch,
    children: recipe.inputs.map(input =>
      expandPlan(catalog, input.name, (Number(input.qty) || 1) * batches, choices, depth + 1, next)
    )
  };
}

export function collectRaw(node: PlanNode, totals: Map<string, RawTotal> = new Map()): Map<string, RawTotal> {
  if (!node.recipe) {
    const entry = totals.get(node.title) ?? { item: node.item, qty: 0 };
    entry.qty += node.qty;
    totals.set(node.title, entry);
  } else {
    node.children.forEach(child => collectRaw(child, totals));
  }
  return totals;
}

export const countSteps = (node: PlanNode): number =>
  node.recipe ? 1 + node.children.reduce((sum, child) => sum + countSteps(child), 0) : 0;
