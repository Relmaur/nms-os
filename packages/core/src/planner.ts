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

// ---------------------------------------------------------------------------
// Build order: the same plan as crafting rounds instead of a tree. Each crafted item appears once with its total
// demand, so a shared intermediate is batched once (as you would craft it in game), and round N only needs what
// rounds below it made.
// ---------------------------------------------------------------------------
export interface StepInput {
  title: string;
  item: GameItem | undefined;
  qty: number;
  raw: boolean;
}
export interface PlanStep {
  title: string;
  item: GameItem | undefined;
  qty: number; // how many the plan needs
  batches: number;
  makes: number; // batches × the recipe's output, ≥ qty
  recipe: Recipe;
  recipes: Recipe[]; // the alternatives, for the recipe switch
  index: number;
  round: number; // 1 = needs only raw materials
  inputs: StepInput[];
}
export interface BuildPlan {
  product: PlanStep;
  rounds: PlanStep[][]; // rounds[0] is round 1; the product is not in them
  raw: (RawTotal & { title: string })[]; // largest amount first
  steps: number; // crafting and cooking steps, the product included
}

interface Craft {
  title: string;
  item: GameItem;
  recipes: Recipe[];
  index: number;
  recipe: Recipe;
  inputs: { title: string; item: GameItem | undefined; perBatch: number; raw: boolean }[];
}

export function buildPlan(
  catalog: Catalog,
  name: string,
  qty: number,
  choices: Record<string, number> = {}
): BuildPlan | undefined {
  const crafts = new Map<string, Craft>(); // in discovery order: an item's inputs follow it
  // An input already on the path back to the product is a cycle, and is treated as raw. Each item is discovered once,
  // so where a cycle or the depth cap is cut depends on the first path that reaches it; among the wiki's chosen
  // recipes neither happens (checked against all 1,265 craftable items), so the simple rule is kept.
  const discover = (title: string, item: GameItem, depth: number, path: Set<string>): void => {
    if (crafts.has(title)) return;
    const recipes = planRecipes(catalog, item);
    const index = Math.min(Math.max(0, Math.trunc(choices[title] ?? 0) || 0), recipes.length - 1);
    const recipe = recipes[index];
    if (!recipe) return;
    const next = new Set(path).add(title);
    const craft: Craft = { title, item, recipes, index, recipe, inputs: [] };
    crafts.set(title, craft);
    for (const input of recipe.inputs) {
      const inputItem = findItem(catalog, input.name);
      const inputTitle = inputItem?.title ?? input.name;
      const craftable =
        inputItem && depth + 1 < PLAN_MAX_DEPTH && !next.has(inputTitle) && planRecipes(catalog, inputItem).length;
      craft.inputs.push({ title: inputTitle, item: inputItem, perBatch: Number(input.qty) || 1, raw: !craftable });
      if (craftable) discover(inputTitle, inputItem, depth + 1, next);
    }
  };
  const productItem = findItem(catalog, name);
  if (!productItem) return undefined;
  discover(productItem.title, productItem, 0, new Set());
  const product = crafts.get(productItem.title);
  if (!product) return undefined;

  // Consumers before their inputs (a topological order), so every demand is complete before it is batched.
  const order: Craft[] = [];
  const seen = new Set<string>();
  const visit = (craft: Craft): void => {
    if (seen.has(craft.title)) return;
    seen.add(craft.title);
    craft.inputs.forEach(input => {
      const next = input.raw ? undefined : crafts.get(input.title);
      if (next) visit(next);
    });
    order.unshift(craft);
  };
  visit(product);

  const demand = new Map<string, number>([[product.title, qty]]);
  const raw = new Map<string, RawTotal>();
  const steps = new Map<string, PlanStep>();
  for (const craft of order) {
    const need = demand.get(craft.title) ?? 0;
    const perBatch = Number(craft.recipe.outputs[0]?.qty) || 1;
    const batches = Math.ceil(need / perBatch);
    const inputs = craft.inputs.map(input => {
      const amount = input.perBatch * batches;
      if (input.raw) {
        const entry = raw.get(input.title) ?? { item: input.item, qty: 0 };
        entry.qty += amount;
        raw.set(input.title, entry);
      } else {
        demand.set(input.title, (demand.get(input.title) ?? 0) + amount);
      }
      return { title: input.title, item: input.item, qty: amount, raw: input.raw };
    });
    steps.set(craft.title, {
      title: craft.title,
      item: craft.item,
      qty: need,
      batches,
      makes: batches * perBatch,
      recipe: craft.recipe,
      recipes: craft.recipes,
      index: craft.index,
      round: 0,
      inputs
    });
  }

  // Round = 1 + the highest round among crafted inputs; inputs come later in `order`, so walk it backwards.
  for (const craft of [...order].reverse()) {
    const step = steps.get(craft.title);
    if (!step) continue;
    step.round = 1 + Math.max(0, ...step.inputs.map(input => (input.raw ? 0 : (steps.get(input.title)?.round ?? 0))));
  }
  const productStep = steps.get(product.title);
  if (!productStep) return undefined;
  const rounds: PlanStep[][] = [];
  for (const craft of crafts.values()) {
    const step = steps.get(craft.title);
    if (!step || step === productStep) continue;
    (rounds[step.round - 1] ??= []).push(step);
  }
  return {
    product: productStep,
    rounds: rounds.filter(Boolean),
    raw: [...raw.entries()].map(([title, entry]) => ({ title, ...entry })).sort((a, b) => b.qty - a.qty),
    steps: steps.size
  };
}

// What the player has ticked off: gathered raw materials (`raw:<title>@<amount>`) and finished crafts
// (`craft:<title>@<amount>`). The amount is part of the key, so a tick still holds when the plan changes around it
// (another recipe elsewhere, a different quantity) as long as the same amount is needed, and lapses when it isn't.
export const rawKey = (title: string, qty: number): string => `raw:${title}@${String(qty)}`;
export const craftKey = (title: string, qty: number): string => `craft:${title}@${String(qty)}`;
export const stepKey = (step: PlanStep): string => craftKey(step.title, step.qty);
// A tick key split into its `kind:title` and amount.
const splitKey = (key: string): [string, number] => {
  const at = key.lastIndexOf('@');
  return at > 0 ? [key.slice(0, at), Number(key.slice(at + 1))] : [key, NaN];
};

// After a change of amount or recipe, a tick also covers the new plan wherever what was gathered or crafted is at
// least what's now needed (500 Radon gathered covers a need of 300). The old keys stay, so a tick still comes back
// if the plan returns to that amount.
export function carryTicks(plan: BuildPlan, ticked: ReadonlySet<string>): Set<string> {
  const most = new Map<string, number>(); // `kind:title` -> the largest ticked amount
  for (const key of ticked) {
    const [item, qty] = splitKey(key);
    if (Number.isFinite(qty) && qty > (most.get(item) ?? 0)) most.set(item, qty);
  }
  const next = new Set(ticked);
  const covered = (kind: string, title: string, qty: number) => (most.get(`${kind}:${title}`) ?? 0) >= qty;
  for (const entry of plan.raw) if (covered('raw', entry.title, entry.qty)) next.add(rawKey(entry.title, entry.qty));
  for (const step of [...plan.rounds.flat(), plan.product])
    if (covered('craft', step.title, step.qty)) next.add(stepKey(step));
  return next;
}
// Unticking says the player doesn't have that amount, so no larger tick of the same item may cover it again later.
export function untick(ticked: ReadonlySet<string>, key: string): Set<string> {
  const [item, qty] = splitKey(key);
  return new Set(
    [...ticked].filter(other => {
      const [otherItem, otherQty] = splitKey(other);
      return other !== key && !(otherItem === item && otherQty >= qty);
    })
  );
}

export type StepState = 'done' | 'ready' | 'waiting';
export interface PlanProgress {
  step: (title: string) => StepState; // ready = every input is ticked
  round: (index: number) => StepState; // ready = every step in it is ready or done
  has: (input: StepInput) => boolean; // that input is ticked (gathered, or crafted at the amount the plan needs)
  gathered: number;
  crafted: number;
  complete: boolean;
}

export function planProgress(plan: BuildPlan, ticked: ReadonlySet<string>): PlanProgress {
  const all = [...plan.rounds.flat(), plan.product];
  const byTitle = new Map(all.map(step => [step.title, step]));
  const rawTotal = new Map(plan.raw.map(entry => [entry.title, entry.qty]));
  // A raw input counts as ticked when the hold's whole total for it is (that's what the player gathers).
  const has = (input: StepInput) => {
    const made = input.raw ? undefined : byTitle.get(input.title);
    return ticked.has(made ? stepKey(made) : rawKey(input.title, rawTotal.get(input.title) ?? input.qty));
  };
  const states = new Map<string, StepState>(
    all.map(step => [step.title, ticked.has(stepKey(step)) ? 'done' : step.inputs.every(has) ? 'ready' : 'waiting'])
  );
  const step = (title: string): StepState => states.get(title) ?? 'waiting';
  return {
    step,
    round: index => {
      const list = (plan.rounds[index] ?? []).map(item => step(item.title));
      return list.every(state => state === 'done')
        ? 'done'
        : list.every(state => state !== 'waiting')
          ? 'ready'
          : 'waiting';
    },
    gathered: plan.raw.filter(entry => ticked.has(rawKey(entry.title, entry.qty))).length,
    crafted: all.filter(item => ticked.has(stepKey(item))).length,
    has,
    complete: ticked.has(stepKey(plan.product))
  };
}
