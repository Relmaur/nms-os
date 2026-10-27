import { test } from 'vitest';
import assert from 'node:assert/strict';
import { DEFAULT_STATE, buildState, deepMerge, migrateLegacyState, stateTimestamp } from '../src/state.ts';

test('deepMerge merges objects key by key and replaces arrays wholesale', () => {
  const merged = deepMerge({ a: { x: 1, y: 2 }, list: [1, 2] }, { a: { y: 3 }, list: [9] });
  assert.deepEqual(merged, { a: { x: 1, y: 3 }, list: [9] });
});

test('buildState layers defaults ← file ← local and normalises systems', () => {
  const file = { meta: { lastUpdated: '2026-01-01T00:00:00Z', currentPhase: 'From file' }, checklists: { cs1: true } };
  const local = {
    meta: { lastUpdated: '2026-02-01T00:00:00Z' },
    checklists: { cs2: true },
    systems: [{ id: 'a', name: 'Alpha', tags: ['Trade Hub'] }]
  };
  const state = buildState(file, local);
  assert.equal(state.meta.currentPhase, 'From file');
  assert.deepEqual({ cs1: state.checklists.cs1, cs2: state.checklists.cs2 }, { cs1: true, cs2: true });
  assert.deepEqual([state.fleet, state.gear, state.notes], [{}, [], []]);
  assert.deepEqual(
    state.systems.map(system => [system.id, system.galaxy, system.tags]),
    [['a', 'Euclid', ['trade-hub']]]
  );
});

test('buildState repairs invalid outlaw settings with the defaults', () => {
  const state = buildState({ outlaw: { restockHours: 0, packetsPerVisit: 'many', runSize: 3 } });
  assert.equal(state.outlaw.restockHours, DEFAULT_STATE.outlaw.restockHours);
  assert.equal(state.outlaw.packetsPerVisit, DEFAULT_STATE.outlaw.packetsPerVisit);
  assert.equal(state.outlaw.runSize, 3);
  assert.equal(state.outlaw.nanitesPerPacket, DEFAULT_STATE.outlaw.nanitesPerPacket);
});

test('the pre-2.0 save shape migrates into systems', () => {
  const legacy = {
    lastUpdated: '2025-01-01T00:00:00Z',
    checkedItems: { cs1: true },
    logEntries: [{ id: 7, title: 'Old Camp', category: 'Harmonic Camp', details: 'by the ridge' }]
  };
  const state = buildState(migrateLegacyState(legacy));
  assert.equal(state.checklists.cs1, true);
  const camp = state.systems.find(system => system.id === '7');
  assert.deepEqual([camp?.name, camp?.tags, camp?.notes], ['Old Camp', ['harmonic-camp'], 'by the ridge']);
  assert.equal(state.logbook, undefined);
});

test('stateTimestamp tolerates missing or invalid dates', () => {
  assert.equal(stateTimestamp(null), 0);
  assert.equal(stateTimestamp({ meta: { lastUpdated: 'nope' } }), 0);
  assert.equal(stateTimestamp({ meta: { lastUpdated: '2026-01-01T00:00:00Z' } }), Date.parse('2026-01-01T00:00:00Z'));
});

test('a "__proto__" key in a document never changes an object’s prototype', () => {
  const merged = deepMerge(
    { checklists: {} },
    JSON.parse('{"checklists":{"__proto__":{"polluted":true},"cs1":true}}') as Record<string, unknown>
  );
  const checklists = merged.checklists as Record<string, unknown>;
  assert.equal(Object.getPrototypeOf(checklists), Object.prototype);
  assert.equal(checklists.polluted, undefined);
  assert.equal(checklists.cs1, true);
});

test('timers and sessions default to empty, and an older save without them still loads', () => {
  const state = buildState({ systems: [] });
  assert.deepEqual(state.timers, []);
  assert.equal(state.session, null);
  assert.deepEqual(state.sessions, []);
  const later = buildState({
    timers: [
      { id: 't', kind: 'crop', label: 'Frostwort', startedAt: '2026-10-27T10:00:00Z', endsAt: '2026-10-27T11:00:00Z' }
    ],
    session: { startedAt: '2026-10-27T10:00:00Z' }
  });
  assert.equal(later.timers[0]?.label, 'Frostwort');
  assert.deepEqual(later.session, { startedAt: '2026-10-27T10:00:00Z', timersDone: 0 });
});

test('a damaged timer is dropped on load, the rest of the log kept', () => {
  const state = buildState({
    systems: [{ name: 'Kept' }],
    timers: [
      { label: 5, endsAt: null },
      { label: 'Fine', startedAt: '2026-10-27T10:00:00Z', endsAt: '2026-10-27T11:00:00Z' }
    ]
  });
  assert.deepEqual(
    state.timers.map(timer => timer.label),
    ['Fine']
  );
  assert.equal(state.systems[0]?.name, 'Kept');
});
