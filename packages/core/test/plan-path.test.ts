import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildPlan, makeCatalog, planProgress, rawKey, stepKey } from '../src/planner.ts';
import { closestFor, planNeed, planPath, toggleRound } from '../src/plan-path.ts';
import { normalizeSystem } from '../src/systems-model.ts';

const catalog = makeCatalog(
  JSON.parse(fs.readFileSync(new URL('../../../tests/fixtures/game-data-subset.json', import.meta.url), 'utf8'))
);
const plan = buildPlan(catalog, 'Stasis Device', 1)!;

test('the path runs Gather, each round, then the final craft; the first unfinished step is now', () => {
  const states = (ticked: Set<string>) => planPath(plan, planProgress(plan, ticked));
  const start = states(new Set());
  assert.deepEqual(
    start.steps.map(step => step.kind),
    ['gather', ...plan.rounds.map(() => 'round'), 'final']
  );
  assert.equal(start.current, 0);
  assert.deepEqual(start.steps.map(step => step.state).slice(0, 2), ['now', 'next']);
  const gathered = new Set(plan.raw.map(entry => rawKey(entry.title, entry.qty)));
  const round1 = toggleRound(plan, gathered, 0);
  assert.equal(states(round1).current, 2);
  assert.deepEqual(toggleRound(plan, round1, 0), gathered); // a second tap marks it not crafted again
  const all = new Set([...gathered, ...plan.rounds.flat().map(stepKey), stepKey(plan.product)]);
  assert.equal(
    states(all).steps.every(step => step.state === 'done'),
    true
  );
});

test('what the plan needs of an item, and at which step', () => {
  assert.deepEqual(planNeed(plan, 'Frost Crystal'), { qty: 300, step: 1, kind: 'gather' });
  assert.equal(planNeed(plan, plan.product.title)?.kind, 'final');
  assert.equal(planNeed(plan, 'Gold'), null);
});

test('closest for you: places the player wrote the item down, nearest the system they were last in', () => {
  const system = (id: string, glyphs: string, at: string, planets: Record<string, unknown>[] = [], notes = '') =>
    normalizeSystem({ id, name: id, galaxy: 'Euclid', glyphs, notes, planets, visits: [{ at }] });
  const systems = [
    system('here', '000000000001', '2026-10-30T00:00:00Z'),
    system('far', '0000FF000100', '2026-10-01T00:00:00Z', [
      { id: 'p1', name: 'Rime', notes: 'Frost Crystal everywhere' }
    ]),
    system('near', '000001000002', '2026-10-02T00:00:00Z', [
      { id: 'p2', name: 'Home', tags: ['base'], notes: 'Frost Crystal farm' }
    ]),
    system('other', '', '2026-10-29T00:00:00Z', [], 'frost crystals? no: frostwort only')
  ];
  const found = closestFor(systems, 'Frost Crystal');
  assert.ok(found);
  assert.equal(found.system.id, 'near');
  assert.equal(found.planet, 'Home');
  assert.equal(found.base, true);
  assert.equal(closestFor(systems, 'Gold'), null);
  assert.equal(closestFor(systems, 'Crystal')?.system.id, 'near'); // a whole word, not "Crystals"
});
