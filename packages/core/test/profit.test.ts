// "Best crafts": value gained over the raw materials, on the frozen wiki subset and on the real mirror.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeCatalog, buildPlan, findItem, type Catalog } from '../src/planner.ts';
import { rankCrafts, sortCrafts } from '../src/profit.ts';
import { GameDataSchema } from '../src/game-data.ts';

const subset = makeCatalog(
  JSON.parse(fs.readFileSync(new URL('../../../tests/fixtures/game-data-subset.json', import.meta.url), 'utf8'))
);

test('a craft gains its value minus what its raw materials would sell for, from the planner’s own build order', () => {
  const { crafts } = rankCrafts(subset);
  const stasis = crafts.find(craft => craft.item.title === 'Stasis Device');
  assert.ok(stasis);
  const plan = buildPlan(subset, 'Stasis Device', 1);
  assert.ok(plan);
  const rawValue = plan.raw.reduce((sum, raw) => sum + (findItem(subset, raw.title)?.value ?? NaN) * raw.qty, 0);
  assert.equal(stasis.rawValue, rawValue);
  assert.equal(stasis.gain, (stasis.item.value ?? 0) * stasis.makes - rawValue);
  assert.equal(stasis.steps, plan.steps);
  assert.equal(stasis.multiplier, stasis.value / rawValue);
});

test('a raw material without a wiki value leaves the craft out, counted, rather than guessed', () => {
  const items = JSON.parse(
    fs.readFileSync(new URL('../../../tests/fixtures/game-data-subset.json', import.meta.url), 'utf8')
  ) as {
    items: { title: string; value?: number }[];
  };
  const noRadon = makeCatalog({
    ...items,
    items: items.items.map(item => (item.title === 'Radon' ? { ...item, value: undefined } : item))
  } as Parameters<typeof makeCatalog>[0]);
  const { crafts, skipped } = rankCrafts(noRadon);
  assert.equal(
    crafts.some(craft => craft.item.title === 'Stasis Device'),
    false
  );
  assert.ok(skipped >= 1);
});

test('sorting by gain per step favours short chains; filters by category and steps', () => {
  const { crafts } = rankCrafts(subset);
  const byGain = sortCrafts(crafts);
  for (let i = 1; i < byGain.length; i++) assert.ok((byGain[i - 1]?.gain ?? 0) >= (byGain[i]?.gain ?? 0));
  const perStep = sortCrafts(crafts, { sort: 'per-step' });
  const score = (c: (typeof crafts)[number]) => c.gain / c.steps;
  for (let i = 1; i < perStep.length; i++) assert.ok(score(perStep[i - 1]!) >= score(perStep[i]!));
  assert.ok(sortCrafts(crafts, { maxSteps: 3 }).every(craft => craft.steps <= 3));
  assert.ok(sortCrafts(crafts, { category: 'cooking' }).every(craft => craft.item.category === 'cooking'));
});

test('by multiplier, by fewest steps, and without crops', () => {
  const { crafts } = rankCrafts(subset);
  const byMultiplier = sortCrafts(crafts, { sort: 'multiplier' });
  for (let i = 1; i < byMultiplier.length; i++)
    assert.ok((byMultiplier[i - 1]?.multiplier ?? 0) >= (byMultiplier[i]?.multiplier ?? 0));
  const bySteps = sortCrafts(crafts, { sort: 'steps' });
  for (let i = 1; i < bySteps.length; i++) assert.ok((bySteps[i - 1]?.steps ?? 0) <= (bySteps[i]?.steps ?? 0));
  const stasis = crafts.find(craft => craft.item.title === 'Stasis Device');
  assert.equal(stasis?.farmed, true); // Frost Crystal, Star Bulb, Gamma Root…
  const noCrops = sortCrafts(crafts, { noFarming: true });
  assert.ok(noCrops.length > 0 && noCrops.every(craft => !craft.farmed));
  assert.ok(!noCrops.some(craft => craft.item.title === 'Stasis Device'));
});

test('on the real mirror, the well-known money crafts lead', () => {
  let catalog: Catalog;
  try {
    catalog = makeCatalog(
      GameDataSchema.parse(
        JSON.parse(fs.readFileSync(new URL('../../../wiki/game-data.json', import.meta.url), 'utf8'))
      )
    );
  } catch {
    return; // a fresh clone before `pnpm index:wiki`
  }
  const top = sortCrafts(rankCrafts(catalog).crafts)
    .slice(0, 2)
    .map(craft => craft.item.title)
    .sort();
  assert.deepEqual(top, ['Fusion Ignitor', 'Stasis Device']);
});
