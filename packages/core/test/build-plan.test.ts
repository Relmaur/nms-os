// The build order (buildPlan) and tick progress (planProgress), on the frozen wiki subset and a small made-up catalog.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildPlan,
  collectRaw,
  craftKey,
  expandPlan,
  makeCatalog,
  planProgress,
  rawKey,
  type BuildPlan
} from '../src/planner.ts';
import type { GameItem } from '../src/game-data.ts';

const catalog = makeCatalog(
  JSON.parse(fs.readFileSync(new URL('../../../tests/fixtures/game-data-subset.json', import.meta.url), 'utf8'))
);
const rawOf = (plan: BuildPlan | undefined) =>
  Object.fromEntries(plan?.raw.map(entry => [entry.title, entry.qty]) ?? []);
const treeRaw = (name: string, qty: number, choices?: Record<string, number>) =>
  Object.fromEntries(
    [...collectRaw(expandPlan(catalog, name, qty, choices)).entries()].map(([title, entry]) => [title, entry.qty])
  );

test('a Stasis Device gives the same raw totals as the tree, crafted in rounds', () => {
  for (const qty of [1, 100])
    assert.deepEqual(rawOf(buildPlan(catalog, 'Stasis Device', qty)), treeRaw('Stasis Device', qty));
  const plan = buildPlan(catalog, 'Stasis Device', 100);
  assert.ok(plan);
  assert.equal(plan.product.title, 'Stasis Device');
  assert.equal(plan.product.qty, 100);
  // Round 1 needs only raw materials; every later step needs something from the round below it.
  assert.ok(plan.rounds[0]?.every(step => step.inputs.every(input => input.raw)));
  plan.rounds.forEach((round, i) => {
    round.forEach(step => {
      assert.equal(step.round, i + 1);
      if (i) assert.ok(step.inputs.some(input => !input.raw && plan.rounds[i - 1]?.some(s => s.title === input.title)));
    });
  });
  assert.equal(plan.product.round, plan.rounds.length + 1);
  // Each crafted item appears once.
  const titles = plan.rounds.flat().map(step => step.title);
  assert.equal(new Set(titles).size, titles.length);
  assert.equal(plan.steps, titles.length + 1);
  assert.equal(plan.raw[0]?.qty, Math.max(...plan.raw.map(entry => entry.qty))); // largest first
});

test('alternative recipes change the plan per item', () => {
  assert.deepEqual(
    rawOf(buildPlan(catalog, 'Anomalous Doughnut', 1, { 'Clarified Oil': 1 })),
    treeRaw('Anomalous Doughnut', 1, { 'Clarified Oil': 1 })
  );
  const plan = buildPlan(catalog, 'Anomalous Doughnut', 1);
  const oil = plan?.rounds.flat().find(step => step.title === 'Clarified Oil');
  assert.ok((oil?.recipes.length ?? 0) > 1);
  assert.equal(oil?.index, 0);
});

test('items with no crafting or cooking recipe have no plan', () => {
  assert.equal(buildPlan(catalog, 'Radon', 1), undefined);
  assert.equal(buildPlan(catalog, 'Not an item', 1), undefined);
});

// A made-up catalog: Widget needs Gear and Frame; Frame also needs Gear. Gear comes 5 per batch.
const item = (title: string, recipes: GameItem['recipes'] = []): GameItem => ({
  title,
  slug: title,
  category: 'products',
  path: `wiki/products/${title}.md`,
  summary: '',
  source: 'wiki',
  revId: 1,
  fields: {},
  recipes
});
const craft = (output: string, qty: number, inputs: [string, number][]): GameItem['recipes'][number] => ({
  type: 'craft',
  inputs: inputs.map(([name, n]) => ({ name, qty: n })),
  outputs: [{ name: output, qty }]
});
const made = makeCatalog({
  items: [
    item('Widget', [
      craft('Widget', 1, [
        ['Gear', 2],
        ['Frame', 1]
      ])
    ]),
    item('Frame', [
      craft('Frame', 1, [
        ['Gear', 1],
        ['Ore', 3]
      ])
    ]),
    item('Gear', [craft('Gear', 5, [['Ore', 1]])]),
    item('Ore'),
    item('Loop', [craft('Loop', 1, [['Loop Part', 1]])]),
    item('Loop Part', [
      craft('Loop Part', 1, [
        ['Loop', 1],
        ['Ore', 1]
      ])
    ])
  ]
});

test('a shared multi-output intermediate is batched once, from its total demand', () => {
  const plan = buildPlan(made, 'Widget', 1);
  assert.ok(plan);
  const gear = plan.rounds.flat().find(step => step.title === 'Gear');
  assert.deepEqual([gear?.qty, gear?.batches, gear?.makes, gear?.round], [3, 1, 5, 1]); // 2 for Widget + 1 for Frame
  assert.deepEqual(rawOf(plan), { Ore: 4 }); // 1 batch of Gear + 3 for Frame; the tree would batch Gear twice
  assert.deepEqual(
    plan.rounds.map(round => round.map(step => step.title)),
    [['Gear'], ['Frame']]
  );
  assert.equal(plan.product.round, 3);
});

test('a recipe cycle stops at the item already being made', () => {
  const plan = buildPlan(made, 'Loop', 2);
  assert.ok(plan);
  assert.deepEqual(rawOf(plan), { Loop: 2, Ore: 2 });
});

test('progress: ticked inputs make a step ready; a round is ready when all its steps are', () => {
  const plan = buildPlan(made, 'Widget', 1);
  assert.ok(plan);
  let progress = planProgress(plan, new Set());
  assert.deepEqual(
    [progress.step('Gear'), progress.round(0), progress.gathered, progress.crafted],
    ['waiting', 'waiting', 0, 0]
  );
  progress = planProgress(plan, new Set([rawKey('Ore')]));
  assert.deepEqual([progress.step('Gear'), progress.round(0), progress.step('Frame')], ['ready', 'ready', 'waiting']);
  progress = planProgress(plan, new Set([rawKey('Ore'), craftKey('Gear')]));
  assert.deepEqual([progress.round(0), progress.step('Frame'), progress.step('Widget')], ['done', 'ready', 'waiting']);
  progress = planProgress(plan, new Set([rawKey('Ore'), craftKey('Gear'), craftKey('Frame'), craftKey('Widget')]));
  assert.deepEqual([progress.complete, progress.crafted, progress.gathered], [true, 3, 1]);
});
