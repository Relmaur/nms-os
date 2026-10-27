import { test } from 'vitest';
import assert from 'node:assert/strict';
import { homeSummary } from '../src/home.ts';
import { normalizeSystem, HOUR_MS } from '../src/systems-model.ts';
import type { OutlawSettings } from '../src/state.ts';

const now = Date.parse('2026-10-27T12:00:00Z');
const ago = (hours: number) => new Date(now - hours * HOUR_MS).toISOString();
const outlaw: OutlawSettings = {
  restockHours: 24,
  packetsPerVisit: 15,
  runSize: 2,
  unitsPerPacket: 75000,
  nanitesPerPacket: 350
};

test('the current system is the one visited or added most recently', () => {
  const systems = [
    normalizeSystem({ name: 'Old', visits: [{ at: ago(48) }], createdAt: ago(100) }),
    normalizeSystem({ name: 'Just added', createdAt: ago(1) }),
    normalizeSystem({ name: 'Visited', visits: [{ at: ago(5) }], createdAt: ago(200) })
  ];
  const summary = homeSummary({ systems, outlaw }, now);
  assert.equal(summary.current?.name, 'Just added');
  assert.deepEqual(
    summary.recent.map(system => system.name),
    ['Visited', 'Old']
  );
});

test('an empty log has no current system and no outlaw stations', () => {
  const summary = homeSummary({ systems: [], outlaw }, now);
  assert.equal(summary.current, undefined);
  assert.deepEqual(summary.recent, []);
  assert.deepEqual(summary.outlaw, { total: 0, ready: 0, next: [], soonest: undefined, runNanites: 0 });
});

test('outlaw: ready stations first, capped; the run estimate uses the run size and packet averages', () => {
  const station = (name: string, hoursAgo: number | null) =>
    normalizeSystem({ name, tags: ['outlaw'], visits: hoursAgo === null ? [] : [{ at: ago(hoursAgo), packets: 15 }] });
  const systems = [station('A', 30), station('B', null), station('C', 2), station('D', 25), station('E', 40)];
  const { outlaw: card } = homeSummary({ systems, outlaw }, now);
  assert.equal(card.total, 5);
  assert.equal(card.ready, 4);
  assert.deepEqual(
    card.next.map(row => row.system.name),
    ['B', 'E', 'A']
  );
  assert.equal(card.runNanites, 2 * 15 * 350); // run size 2, though 4 are ready
  assert.equal(card.soonest, undefined);
});

test('when every station is restocking, the soonest one is named with its countdown', () => {
  const systems = [
    normalizeSystem({ name: 'Later', tags: ['outlaw'], visits: [{ at: ago(1), packets: 15 }] }),
    normalizeSystem({ name: 'Sooner', tags: ['outlaw'], visits: [{ at: ago(10), packets: 15 }] })
  ];
  const { outlaw: card } = homeSummary({ systems, outlaw }, now);
  assert.equal(card.ready, 0);
  assert.ok(card.soonest);
  assert.equal(card.soonest.system.name, 'Sooner');
  assert.equal(card.soonest.status.label, 'Ready in 14h');
});
