import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSystem,
  migrateToSystems,
  outlawStatus,
  rankOutlaw,
  systemHaystack,
  HOUR_MS
} from '../../assets/lib/systems-model.js';
import { formatDuration, formatAgo } from '../../assets/lib/format.js';

test('normalizeSystem cleans user input into the stored shape', () => {
  const system = normalizeSystem({
    id: 1,
    name: '  ',
    glyphs: '01-23 ab',
    star: 'pink',
    wealth: 9,
    rating: -2,
    tags: ['Trade Hub', 'trade-hub', ''],
    visits: [{ at: 'bad' }, { at: '2026-01-02T00:00:00Z', packets: '15' }, { at: '2026-01-01T00:00:00Z' }]
  });
  assert.equal(system.id, '1');
  assert.equal(system.name, 'Unnamed system');
  assert.equal(system.glyphs, '0123AB');
  assert.equal(system.star, '');
  assert.equal(system.wealth, 3);
  assert.equal(system.rating, 0);
  assert.deepEqual(system.tags, ['trade-hub']);
  assert.deepEqual(
    system.visits.map(visit => visit.at),
    ['2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z']
  );
  assert.equal(system.visits[1].packets, 15);
});

test('migrating logbook and outlaw stations is idempotent and keeps ids', () => {
  const state = {
    systems: [{ id: 'keep', name: 'Existing' }],
    logbook: [{ id: 'log-1', system: 'Camp', type: 'Harmonic Camp', glyphSolution: [4, 10, 16] }],
    outlaw: {
      stations: [
        { id: 'st-1', name: 'Den', glyphs: 'abc' },
        { id: 'keep', name: 'Duplicate id' }
      ]
    }
  };
  migrateToSystems(state);
  const once = JSON.stringify(state.systems);
  migrateToSystems(state);
  assert.equal(JSON.stringify(state.systems), once, 'running it again changes nothing');
  assert.deepEqual(
    state.systems.map(system => system.id),
    ['keep', 'log-1', 'st-1']
  );
  assert.deepEqual(state.systems[2].tags, ['outlaw']);
  assert.equal(state.systems[1].notes, 'Harmonic Camp solution: 4, 10, 16');
  assert.equal(state.logbook, undefined);
  assert.equal(state.outlaw.stations, undefined);
});

test('outlaw status: never run, restocking, then ready after restockHours', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  const visit = hoursAgo => ({ at: new Date(now - hoursAgo * HOUR_MS).toISOString(), packets: 15 });
  assert.deepEqual(outlawStatus({ visits: [] }, 24, now).label, 'Never run');
  const waiting = outlawStatus({ visits: [visit(20)] }, 24, now);
  assert.deepEqual([waiting.ready, waiting.label], [false, 'Ready in 4h']);
  assert.equal(outlawStatus({ visits: [visit(25)] }, 24, now).ready, true);
  assert.equal(
    outlawStatus({ visits: [visit(25), { at: new Date(now).toISOString() }] }, 24, now).ready,
    true,
    'visits without packets do not reset the timer'
  );
});

test('rankOutlaw puts ready stations first, then the soonest to restock', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  const station = (name, hoursAgo) =>
    normalizeSystem({
      name,
      tags: ['outlaw'],
      visits: hoursAgo === null ? [] : [{ at: new Date(now - hoursAgo * HOUR_MS).toISOString(), packets: 15 }]
    });
  const ranked = rankOutlaw(
    [
      station('Fresh', 1),
      station('Never', null),
      station('Soon', 23),
      station('Old', 30),
      normalizeSystem({ name: 'Not outlaw' })
    ],
    24,
    now
  );
  assert.deepEqual(
    ranked.map(row => row.system.name),
    ['Never', 'Old', 'Soon', 'Fresh']
  );
});

test('search haystack covers planets, tags and visit notes', () => {
  const haystack = systemHaystack(
    normalizeSystem({
      name: 'Alpha',
      race: 'gek',
      planets: [{ name: 'Verdant IV', biome: 'Lush' }],
      visits: [{ at: '2026-01-01T00:00:00Z', note: 'Found an S-class' }]
    })
  );
  for (const word of ['alpha', 'gek', 'verdant iv', 'lush', 's-class']) assert.ok(haystack.includes(word), word);
});

test('durations read naturally', () => {
  assert.equal(formatDuration(30 * 1000), '1m');
  assert.equal(formatDuration(90 * 60000), '1h 30m');
  assert.equal(formatDuration(72 * HOUR_MS), '3d');
  const now = Date.parse('2026-10-27T12:00:00Z');
  assert.equal(formatAgo('2026-10-27T11:59:30Z', now), 'just now');
  assert.equal(formatAgo('2026-10-27T10:00:00Z', now), '2h ago');
});

test('unsafe ids are made safe; generated and legacy ids are kept', () => {
  assert.equal(normalizeSystem({ id: "x');alert(1);('" }).id, 'x---alert-1----');
  assert.equal(normalizeSystem({ id: 1698000000000 }).id, '1698000000000');
  assert.equal(normalizeSystem({ id: 'camp-01' }).id, 'camp-01');
  assert.match(normalizeSystem({ id: "');('" }).id, /^sys-/, 'nothing usable left: a fresh id');
  assert.equal(normalizeSystem({ planets: [{ id: 'pl "x"', name: 'P' }] }).planets[0].id, 'pl--x-');
});
