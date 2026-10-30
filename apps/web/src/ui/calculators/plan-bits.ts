// What the planner screen, its Codex peek and Calculators share: opening a plan, its values, and the recipe switch.
import { formatQty, formatUnits } from '@atlas/core/calc';
import { buildPlan, planProgress, type BuildPlan, type Catalog, type PlanStep } from '@atlas/core/planner';
import type { PlanSettings } from './progress.ts';

/** Opens the planner for an item (#plan/<title>). */
export const openPlan = (title: string): void => {
  location.hash = `#plan/${encodeURIComponent(title)}`;
};

export const rawValue = (plan: BuildPlan): number =>
  plan.raw.reduce((sum, entry) => sum + (entry.item?.value ?? 0) * entry.qty, 0);

/** "147.9": the product's worth over its raw inputs', at the wiki's base values; null when either is unknown. */
export function ratioText(worth: number, inputs: number): string | null {
  if (!worth || !inputs) return null;
  return (worth / inputs).toFixed(1);
}

/** The plan in a line, for Calculators: what's being built and how far along it is. */
export function planSummary(plan: BuildPlan, ticked: ReadonlySet<string>): string {
  const progress = planProgress(plan, ticked);
  return `×${formatQty(plan.product.qty)} ${plan.product.title} · ${
    progress.complete
      ? 'done'
      : progress.gathered < plan.raw.length
        ? `${String(progress.gathered)}/${String(plan.raw.length)} gathered`
        : `${String(progress.crafted)}/${String(plan.steps)} crafted`
  }`;
}

export interface RecipeSwitch {
  at: number; // 1-based
  of: number;
  inputs: string; // the next recipe's, in this plan's amounts
  delta: string; // what it does to the raw inputs' value
  apply: () => void;
}
// A crafted step with more than one recipe on the wiki: what its next recipe would use and change, so the switch
// isn't blind.
export function recipeSwitch(
  catalog: Catalog,
  settings: PlanSettings,
  plan: BuildPlan,
  step: PlanStep,
  onChoices: (choices: Record<string, number>) => void
): RecipeSwitch | null {
  if (step.recipes.length < 2) return null;
  const index = (step.index + 1) % step.recipes.length;
  const choices = { ...settings.choices, [step.title]: index };
  const next = buildPlan(catalog, settings.item, settings.qty, choices);
  const recipe = step.recipes[index];
  if (!next || !recipe) return null;
  const batches = Math.ceil(step.qty / (Number(recipe.outputs[0]?.qty) || 1));
  const delta = rawValue(next) - rawValue(plan);
  return {
    at: step.index + 1,
    of: step.recipes.length,
    inputs: recipe.inputs.map(input => `${formatQty((Number(input.qty) || 1) * batches)} ${input.name}`).join(' + '),
    delta: delta ? `${delta < 0 ? '−' : '+'}${formatUnits(Math.abs(delta))} Units` : 'same value',
    apply: () => {
      onChoices(choices);
    }
  };
}
