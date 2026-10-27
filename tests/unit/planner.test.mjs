// The recipe planner against a frozen subset of the wiki dataset (tests/fixtures/game-data-subset.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeCatalog, findItem, planRecipes, expandPlan, collectRaw, countSteps } from '../../assets/lib/planner.js';

const catalog = makeCatalog(JSON.parse(fs.readFileSync(new URL('../fixtures/game-data-subset.json', import.meta.url), 'utf8')));
const raw = (name, qty, choices) => Object.fromEntries([...collectRaw(expandPlan(catalog, name, qty, choices)).entries()].map(([title, entry]) => [title, entry.qty]));

test('a Stasis Device expands to the wiki’s raw totals', () => {
  assert.deepEqual(raw('Stasis Device', 1), {
    'Frost Crystal': 300, Solanium: 200, 'Cactus Flesh': 100, 'Star Bulb': 200, Radon: 500, 'Condensed Carbon': 300,
    Sulphurine: 500, Nitrogen: 500, Faecium: 50, 'Gamma Root': 400, Paraffinium: 50, 'Ionised Cobalt': 150, Phosphorus: 50, Dioxite: 50
  });
  assert.equal(countSteps(expandPlan(catalog, 'Stasis Device', 1)), 23);
  assert.equal(raw('Stasis Device', 20).Radon, 10000);
});

test('multi-output crafts round up to whole batches', () => {
  const plan = expandPlan(catalog, 'Projectile Ammunition', 1);
  assert.deepEqual([plan.batches, plan.makes], [1, 1250]);
  assert.deepEqual(raw('Projectile Ammunition', 1300), { 'Ferrite Dust': 100 });
});

test('self-multiplying recipes are not production steps', () => {
  const yeast = findItem(catalog, 'Wild Yeast');
  assert.equal(yeast.recipes.length, 2);
  assert.deepEqual(planRecipes(catalog, yeast).map(recipe => recipe.inputs[0].name), ['Faecium']);
});

test('alternative recipes are chosen per item', () => {
  assert.deepEqual(raw('Anomalous Doughnut', 1)['Fresh Milk'], 2);
  const alternative = raw('Anomalous Doughnut', 1, { 'Clarified Oil': 1 });
  assert.equal(alternative['Fresh Milk'], 1);
  assert.equal(alternative['Warm Proto-Milk'], 1);
});

test('old names resolve through the wiki’s redirects', () => {
  assert.equal(findItem(catalog, 'Rigogen')?.title, 'Kelp Sac');
  assert.equal(findItem(catalog, 'stasis device')?.title, 'Stasis Device');
  assert.equal(findItem(catalog, 'Not An Item'), undefined);
});

test('an item with no crafting or cooking recipe is raw', () => {
  const plan = expandPlan(catalog, 'Radon', 7);
  assert.deepEqual([plan.recipe, plan.qty], [undefined, 7]);
});
