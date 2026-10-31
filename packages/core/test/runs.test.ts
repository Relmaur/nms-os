import { test } from 'vitest';
import assert from 'node:assert/strict';
import { makeCatalog } from '../src/planner.ts';
import type { GameItem } from '../src/game-data.ts';
import {
  checkStep,
  normalizeRuns,
  runEstimate,
  runStatus,
  snapshotRun,
  stepRanges,
  type PlayerRun,
  type RunStep
} from '../src/runs.ts';

const item = (title: string, extra: Partial<GameItem> = {}): GameItem => ({
  title,
  slug: title.replace(/ /g, '_'),
  category: 'products',
  path: `wiki/products/${title.replace(/ /g, '_')}.md`,
  summary: '',
  source: 'wiki',
  revId: 1,
  fields: {},
  recipes: [],
  ...extra
});
const ITEMS = [
  item('Frost Crystal', { category: 'resources', value: 12 }),
  item('Glass', {
    category: 'products',
    value: 2000,
    recipes: [
      {
        type: 'refine',
        inputs: [{ name: 'Frost Crystal', qty: 40 }],
        outputs: [{ name: 'Glass', qty: 1 }],
        seconds: 30
      }
    ]
  }),
  item('Cryo-Pump', {
    value: 1_500_000,
    recipes: [
      {
        type: 'craft',
        inputs: [
          { name: 'Hot Ice', qty: 1 },
          { name: 'Thermic Condensate', qty: 1 }
        ],
        outputs: [{ name: 'Cryo-Pump', qty: 1 }]
      }
    ]
  })
];
const catalog = makeCatalog({ items: ITEMS });
const systems = [{ id: 'sys-m', name: 'Masdalri Junction', galaxy: 'Euclid' }];
const step = (verb: RunStep['verb'], target: string, extra: Partial<RunStep> = {}): RunStep => ({
  id: `s-${verb}`,
  verb,
  target,
  systemId: '',
  qty: null,
  price: null,
  ...extra
});
const STEPS = [
  step('go', 'Masdalri Junction', { systemId: 'sys-m' }),
  step('farm', 'Frost Crystal', { qty: 40 }),
  step('refine', 'Glass', { qty: 3 }),
  step('craft', 'Cryo-Pump'),
  step('sell', 'Cryo-Pump', { qty: 2 })
];
const run = (extra: Partial<PlayerRun> = {}): PlayerRun => ({
  id: 'run-1',
  name: 'Cryo-Pump loop',
  line: '',
  earns: 'units',
  steps: STEPS,
  runMinutes: 25,
  repeatMinutes: 40,
  timer: true,
  checked: snapshotRun({ steps: STEPS }, catalog, '7.10'),
  createdAt: '2026-10-30T12:00:00.000Z',
  updatedAt: '2026-10-30T12:00:00.000Z',
  ...extra
});

test('each step is checked against the log or the wiki; anything else is free text', () => {
  const checks = STEPS.map(s => checkStep(s, catalog, systems));
  assert.deepEqual(
    checks.map(c => [c.kind, c.detail]),
    [
      ['log', 'your system · Euclid'],
      ['wiki', 'a resource'],
      ['wiki', 'from Frost Crystal ×40 · 30 s'],
      ['wiki', 'Hot Ice + Thermic Condensate'],
      ['wiki', '1,500,000 Units each']
    ]
  );
  assert.equal(checkStep(step('craft', 'Frost Crystal'), catalog, systems).detail, 'no crafting recipe in the wiki');
  assert.equal(checkStep(step('sell', 'Moon Rock'), catalog, systems).kind, 'text');
  assert.equal(checkStep(step('go', 'Nowhere'), catalog, systems).detail, 'not in your log');
  assert.equal(checkStep(step('sell', 'Cryo-Pump'), null, systems).detail, 'free text'); // no game data: no claims
});

test('the estimate sells at wiki values unless the player sets a price, and says so', () => {
  const wiki = runEstimate(run(), catalog, systems);
  assert.equal(wiki.units, 3_000_000);
  assert.equal(wiki.perHour, 7_200_000);
  assert.equal(wiki.byYourNumbers, false);
  assert.deepEqual(wiki.wikiSteps, [2, 3, 4, 5]);
  const own = runEstimate(
    { steps: [step('sell', 'Cryo-Pump', { qty: 2, price: 1_000_000 })], runMinutes: null },
    catalog,
    systems
  );
  assert.deepEqual([own.units, own.perHour, own.byYourNumbers], [2_000_000, null, true]);
});

test('a run is retired once an update changes or removes a value it relied on', () => {
  assert.equal(runStatus(run(), catalog), 'works');
  assert.equal(runStatus(run(), null), 'unknown');
  assert.equal(runStatus(run({ checked: { version: '', values: {} } }), catalog), 'unknown');
  const cheaper = makeCatalog({ items: ITEMS.map(i => (i.title === 'Cryo-Pump' ? { ...i, value: 900_000 } : i)) });
  assert.equal(runStatus(run(), cheaper), 'changed');
  const noGlass = makeCatalog({ items: ITEMS.filter(i => i.title !== 'Glass') });
  assert.equal(runStatus(run(), noGlass), 'changed');
});

test('runs load from a log: damaged ones and steps are dropped, numbers kept in range', () => {
  const [loaded, ...rest] = normalizeRuns([
    {
      ...run(),
      timer: 'yes',
      runMinutes: -5,
      earns: 'gold',
      steps: [...STEPS, { verb: 'fly', target: ' Somewhere ' }, { verb: 'go', target: '' }, 'junk']
    },
    { id: 'run-1', name: 'Duplicate' },
    { id: 'run-2', name: '  ' },
    { id: 'bad id!', name: 'Bad' }
  ]);
  assert.equal(rest.length, 0);
  assert.ok(loaded);
  assert.equal(loaded.timer, false);
  assert.equal(loaded.runMinutes, null);
  assert.equal(loaded.earns, 'units');
  assert.deepEqual(loaded.steps.at(-1), {
    id: 'step-6',
    verb: 'do',
    target: 'Somewhere',
    systemId: '',
    qty: null,
    price: null
  });
  assert.equal(loaded.steps.length, 6);
  assert.deepEqual(loaded.checked, run().checked);
  assert.deepEqual(normalizeRuns(undefined), []);
});

test('step numbers read as ranges', () => {
  assert.equal(stepRanges([2, 3, 4, 5]), 'Steps 2–5');
  assert.equal(stepRanges([1, 3, 4]), 'Steps 1, 3–4');
  assert.equal(stepRanges([2]), 'Step 2');
});
