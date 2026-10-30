import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  ALL_GEAR,
  classLetter,
  classPill,
  filterGear,
  fleetChips,
  gearFromFleet,
  gearLine,
  rulesSummary,
  slotShort,
  gearOrder,
  normalizeGear,
  parseSlots,
  slotGrid,
  slotRules,
  slotWarnings,
  toggleSlot
} from '../src/gear.ts';
import { getFact } from '../src/facts.ts';
import { buildState } from '../src/state.ts';
import { mergeStates } from '../src/sync.ts';

const fleet = {
  primaryStarship: {
    name: 'Kestrel',
    class: 'S',
    type: 'Interceptor',
    superchargedSlots: ['R2C2', 'R2C3'],
    layoutNotes: 'Main weapon in the middle.'
  },
  salvageStarship: { name: 'Spare', class: 'A', status: 'Strip and scrap' },
  multiTools: [{ name: 'Rifle', class: 'B', role: 'Combat', notes: 'Hidden slots.' }, 'not a tool']
};

test('typed supercharged slots are tidied, and what isn’t a slot is reported', () => {
  assert.deepEqual(parseSlots('r2c2, R2C3;R2C3  R0C1 R13C1 B4'), {
    slots: ['R2C2', 'R2C3'],
    rejected: ['R0C1', 'R13C1', 'B4']
  });
  const grid = slotGrid(['R4C10', 'R1C1']);
  assert.deepEqual([grid.rows, grid.cols, grid.marked.has('R4C10')], [4, 10, true]);
  assert.deepEqual([slotGrid([]).rows, slotGrid([]).cols], [3, 8]);
  assert.deepEqual([slotGrid(['R2C2'], { rows: 4, cols: 10 }).rows, slotGrid([], { rows: 4, cols: 10 }).cols], [4, 10]);
  assert.deepEqual(toggleSlot(['R2C4', 'R1C9'], 'R2C2'), ['R1C9', 'R2C2', 'R2C4']);
  assert.deepEqual(toggleSlot(['R1C9', 'R2C2'], 'R1C9'), ['R2C2']);
});

test('the old fleet notes become records with fixed ids, so two devices migrate to the same records', () => {
  const gear = gearFromFleet(fleet);
  assert.deepEqual(gearFromFleet(structuredClone(fleet)), gear);
  assert.deepEqual(
    gear.map(item => [item.id, item.kind, item.name, item.role]),
    [
      ['fleet-flagship', 'starship', 'Kestrel', 'Flagship'],
      ['fleet-spare', 'starship', 'Spare', 'Scrap spare'],
      ['fleet-tool-1', 'multitool', 'Rifle', 'Combat']
    ]
  );
  assert.deepEqual(gear[0]?.superchargedSlots, ['R2C2', 'R2C3']);
  assert.equal(gear[0].notes, 'Main weapon in the middle.');
  assert.equal(gear[1]?.notes, 'Strip and scrap');
  assert.equal(gear[2]?.notes, 'Hidden slots.');
});

test('buildState migrates a fleet once; an emptied gear list stays empty, and fleet is kept', () => {
  const state = buildState({ fleet });
  assert.equal(state.gear.length, 3);
  assert.equal(state.fleet.primaryStarship !== undefined, true);
  assert.deepEqual(buildState({ fleet, gear: [] }).gear, []);
  assert.deepEqual(buildState(state).gear, state.gear);
});

test('two devices that migrated separately sync without duplicates', () => {
  const base = buildState({ fleet, gear: null });
  const a = buildState({ fleet });
  const b = buildState({ fleet });
  b.gear[0] = { ...b.gear[0]!, notes: 'Changed on the phone' };
  b.meta.lastUpdated = '2026-10-28T00:00:00.000Z';
  const merged = buildState(mergeStates(base, a, b));
  assert.equal(merged.gear.length, 3);
  assert.equal(merged.gear[0]?.notes, 'Changed on the phone');
});

test('after upgrading, a ship deleted on one device stays deleted though the last synced copy predates gear', () => {
  const base = { meta: { lastUpdated: '2026-10-26T00:00:00.000Z' }, fleet }; // saved by 3.13: no gear key
  const deleted = buildState({ fleet });
  deleted.gear = deleted.gear.filter(item => item.id !== 'fleet-spare');
  deleted.meta.lastUpdated = '2026-10-28T00:00:00.000Z';
  const untouched = buildState({ fleet });
  const merged = buildState(mergeStates(base, deleted, untouched));
  assert.deepEqual(
    merged.gear.map(item => item.id),
    ['fleet-flagship', 'fleet-tool-1']
  );
});

test('slot labels are kept only for marked slots, trimmed and capped', () => {
  const [item] = normalizeGear([
    {
      id: 'k',
      name: 'Kestrel',
      superchargedSlots: ['R2C3', 'R1C1'],
      slotLabels: { R2C3: '  Infra-Knife ', R1C1: '', R4C4: 'gone', __proto__: 'x', R1C2: 7 }
    }
  ]);
  assert.deepEqual(item?.slotLabels, { R2C3: 'Infra-Knife' });
  assert.deepEqual(normalizeGear([{ name: 'No labels' }])[0]?.slotLabels, {});
});

test('damaged gear entries are dropped, not the list; flagships come first', () => {
  const gear = normalizeGear([
    { id: 'a', name: 'Tool', kind: 'multitool' },
    { id: 'a', name: 'Duplicate id' },
    { id: 'bad id!', name: 'Ship' },
    { name: '' },
    null,
    { id: 'f', name: 'Flag', role: 'flagship' }
  ]);
  assert.deepEqual(
    gear.map(item => item.id),
    ['a', 'gear-2', 'f']
  );
  assert.deepEqual(
    gearOrder(gear).map(item => item.id),
    ['f', 'gear-2', 'a']
  );
});

const cite = (value: unknown, page = 'Inventory') => ({
  page,
  path: `wiki/mechanics/${page.replace(/ /g, '_')}.md`,
  url: `https://example.invalid/${page}`,
  revId: 1,
  quote: '…',
  value
});
const facts = {
  schema: 1 as const,
  facts: {
    'supercharged-per-class': cite({ C: 1, B: 2, A: 3, S: 4 }, 'Supercharged Slot'),
    'supercharged-fixed-count': cite(3, 'Supercharged Slot'),
    'exosuit-supercharged-slots': cite(['R1C5', 'R2C9', 'R3C3'], 'Exosuit'),
    'multitool-tech-max': cite({ columns: 10, slots: { C: 30, B: 30, A: 45, S: 60 } }),
    'starship-tech-max': cite({ columns: 10, slots: { S: 60 } }),
    'exosuit-tech-max': cite({ columns: 10, slots: { any: 60 } })
  }
};

test('the class is read from what the player wrote, upgrades included', () => {
  assert.deepEqual(['S', 'a', 'A -> S', 'B-Class', 'Royal', ''].map(classLetter), ['S', 'A', 'S', 'B', null, null]);
});

test('slot rules come from the cited facts: grid size by kind and class, supercharged count, fixed positions', () => {
  const tool = slotRules(facts, 'multitool', 'A');
  assert.deepEqual([tool.columns, tool.maxRows, tool.maxSlots, tool.supercharged], [10, 5, 45, 3]);
  assert.deepEqual(slotRules(facts, 'multitool', 'C').maxRows, 3);
  // The wiki only gives the S-class ship maximum; a C-class ship can be upgraded to it.
  assert.deepEqual([slotRules(facts, 'starship', 'C').maxRows, slotRules(facts, 'starship', 'C').supercharged], [6, 1]);
  assert.equal(slotRules(facts, 'starship', 'Royal').supercharged, null);
  const suit = slotRules(facts, 'exosuit', '');
  assert.deepEqual([suit.maxRows, suit.supercharged, suit.fixed], [6, 3, ['R1C5', 'R2C9', 'R3C3']]);
  assert.deepEqual(
    suit.sources.map(fact => fact.page),
    ['Inventory', 'Supercharged Slot', 'Exosuit']
  );
});

test('without facts (or with a value in the wrong shape) the picker keeps its own limits and states no rule', () => {
  const none = slotRules(null, 'multitool', 'S');
  assert.deepEqual(
    [none.columns, none.maxRows, none.maxSlots, none.supercharged, none.sources],
    [10, 12, null, null, []]
  );
  const broken = { schema: 1 as const, facts: { 'supercharged-per-class': cite({ S: 'four' }) } };
  assert.equal(getFact(broken, 'supercharged-per-class'), null);
  assert.equal(slotRules(broken, 'starship', 'S').supercharged, null);
});

test('marks that disagree with the wiki are reported, never refused', () => {
  const rules = slotRules(facts, 'multitool', 'C');
  assert.deepEqual(slotWarnings(rules, ['R1C1', 'R2C2', 'R4C3']), {
    tooMany: true,
    outside: ['R4C3'],
    offPreset: []
  });
  assert.deepEqual(slotWarnings(slotRules(facts, 'exosuit', ''), ['R1C5', 'R2C9', 'R3C4']).offPreset, ['R3C4']);
  assert.deepEqual(slotWarnings(slotRules(null, 'starship', 'S'), ['R9C9', 'R1C1', 'R2C2', 'R3C3', 'R4C4']), {
    tooMany: false,
    outside: [],
    offPreset: []
  });
});

test('an Exosuit record keeps its kind; an unknown kind still loads as a starship', () => {
  const [suit, odd] = normalizeGear([
    { id: 'suit', kind: 'exosuit', name: 'Suit' },
    { id: 'odd', kind: 'freighter', name: 'Odd' }
  ]);
  assert.deepEqual([suit?.kind, odd?.kind], ['exosuit', 'starship']);
});

test('Fleet: chips per kind present, S-class and Supercharged narrow any kind', () => {
  const items = normalizeGear([
    {
      id: 'a',
      kind: 'starship',
      name: 'Ythgall',
      class: 'S',
      type: 'Sentinel Interceptor',
      role: 'Flagship',
      superchargedSlots: ['R2C2']
    },
    { id: 'b', kind: 'starship', name: 'Aeron', class: 'S' },
    { id: 'c', kind: 'multitool', name: 'Defiance', class: 'A -> S' },
    { id: 'd', kind: 'multitool', name: 'Light Capacitor', class: 'A', superchargedSlots: ['R1C1'] }
  ]);
  assert.deepEqual(
    fleetChips(items, ALL_GEAR).map(chip => [chip.label, chip.on]),
    [
      ['All · 4', true],
      ['Ships · 2', false],
      ['Multi-Tools · 2', false],
      ['S-class', false],
      ['Supercharged', false]
    ]
  );
  const ships = fleetChips(items, ALL_GEAR)[1]!.next;
  assert.deepEqual(
    filterGear(items, ships).map(item => item.id),
    ['a', 'b']
  );
  const sClass = fleetChips(items, ALL_GEAR).find(chip => chip.id === 's-class')!.next;
  assert.deepEqual(
    filterGear(items, sClass).map(item => item.id),
    ['a', 'b', 'c']
  ); // "A -> S" is S now
  const charged = fleetChips(items, sClass).find(chip => chip.id === 'supercharged')!.next;
  assert.deepEqual(
    filterGear(items, charged).map(item => item.id),
    ['a']
  );
  assert.equal(gearLine(items[0]!), 'Sentinel Interceptor · Flagship');
  assert.equal(classPill('A -> S'), 'A → S');
  assert.equal(slotShort('Infra-Knife Accelerator'), 'Infra');
  assert.equal(slotShort('S-Class Infra Mod'), 'S');
  assert.equal(slotShort(undefined), '');
});

test('the wiki’s rules as one sentence, and whether the marks match, fall short or disagree', () => {
  const rules = slotRules(facts, 'starship', 'S');
  assert.deepEqual(rulesSummary(rules, 'starship', 'S', ['R2C2', 'R2C3', 'R2C4', 'R3C7']), {
    sentence: 'S-class starships have 4 supercharged slots, on a tech grid up to 10 columns by 6 rows.',
    status: 'match',
    count: '4 of 4'
  });
  assert.equal(rulesSummary(rules, 'starship', 'S', ['R2C2'])?.status, 'short');
  assert.equal(rulesSummary(rules, 'starship', 'S', ['R9C1'])?.status, 'off');
  assert.equal(
    rulesSummary(slotRules(facts, 'exosuit', ''), 'exosuit', '', [])?.sentence,
    'The Exosuit has 3 supercharged slots, on a tech grid up to 10 columns by 6 rows.'
  );
  assert.equal(rulesSummary(slotRules(null, 'starship', 'S'), 'starship', 'S', []), null);
});
