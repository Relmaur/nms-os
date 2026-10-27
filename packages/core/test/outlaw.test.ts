import { test } from 'vitest';
import assert from 'node:assert/strict';
import { clampOutlawSetting, outlawSummary } from '../src/outlaw.ts';
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
