import { test } from 'vitest';
import assert from 'node:assert/strict';
import { gearFromFleet, gearOrder, normalizeGear, parseSlots, slotGrid, toggleSlot } from '../src/gear.ts';
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
