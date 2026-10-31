import { test } from 'vitest';
import assert from 'node:assert/strict';
import { clampOutlawSetting, fullRunEstimate, outlawSummary } from '../src/outlaw.ts';
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
const station = (name: string, runs: number[]) =>
  normalizeSystem({ name, tags: ['outlaw'], visits: runs.map(hours => ({ at: ago(hours), packets: 15 })) });

test('the run takes ready stations up to the run size; estimates use the player’s averages', () => {
  const systems = [
    station('Fresh', []),
    station('Stale', [50, 30]),
    station('Waiting', [5]),
    station('Older', [80]),
    normalizeSystem({ name: 'Not outlaw', visits: [{ at: ago(1), packets: 15 }] })
  ];
  const summary = outlawSummary({ systems, outlaw }, now);
  assert.deepEqual(
    summary.rows.map(row => row.system.name),
    ['Fresh', 'Older', 'Stale', 'Waiting']
  );
  assert.equal(summary.ready.length, 3);
  assert.deepEqual(
    summary.run.map(row => row.system.name),
    ['Fresh', 'Older']
  );
  assert.equal(summary.runs, 4);
  assert.equal(summary.nanitesEarned, 4 * 15 * 350);
  assert.equal(summary.runPackets, 30);
  assert.equal(summary.runUnits, 30 * 75000);
  assert.equal(summary.runNanites, 30 * 350);
});

test('nothing logged: no rows, no run', () => {
  const summary = outlawSummary({ systems: [], outlaw }, now);
  assert.deepEqual(summary.rows, []);
  assert.deepEqual(summary.run, []);
  assert.equal(summary.runNanites, 0);
});

test('settings are rounded and kept within their bounds; junk falls back to the minimum', () => {
  assert.equal(clampOutlawSetting('restockHours', '36.6'), 37);
  assert.equal(clampOutlawSetting('restockHours', 10000), 720);
  assert.equal(clampOutlawSetting('runSize', 0), 1);
  assert.equal(clampOutlawSetting('packetsPerVisit', 'abc'), 1);
  assert.equal(clampOutlawSetting('nanitesPerPacket', '500'), 500);
});

test('a run in progress counts the stations logged since it started and needs only the rest', () => {
  const systems = [station('Fresh', []), station('Done', [1]), station('Older', [80]), station('Before', [3])];
  const runStartedAt = ago(2);
  const summary = outlawSummary({ systems, outlaw: { ...outlaw, runSize: 3, runStartedAt } }, now);
  assert.ok(summary.progress);
  assert.equal(summary.progress.done, 1); // Done, not Before (logged before the start)
  assert.equal(summary.progress.total, 3);
  assert.equal(summary.progress.next?.system.name, 'Fresh');
  assert.equal(summary.progress.restockAt, Date.parse(ago(1)) + 24 * HOUR_MS);
  assert.deepEqual(
    summary.run.map(row => row.system.name),
    ['Fresh', 'Older']
  );
});

test('a run ends once every station is done, after a restock has passed, or never really started', () => {
  const systems = [station('A', [1]), station('B', [1]), station('C', [])];
  const progress = (runStartedAt: string, runSize = 2) =>
    outlawSummary({ systems, outlaw: { ...outlaw, runSize, runStartedAt } }, now).progress;
  assert.equal(progress(ago(2)), null); // both stations done
  assert.ok(progress(ago(2), 3));
  assert.equal(progress(ago(25), 3), null); // a restock (24 h) has passed
  assert.equal(progress(new Date(now + HOUR_MS).toISOString(), 3), null); // a clock from the future
  assert.equal(outlawSummary({ systems, outlaw }, now).progress, null);
});

test('one full run is the run size at the player’s averages', () => {
  assert.deepEqual(fullRunEstimate({ ...outlaw, runSize: 5 }), { packets: 75, units: 5_625_000, nanites: 26_250 });
});
