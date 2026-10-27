import { test } from 'vitest';
import assert from 'node:assert/strict';
import { normalizeSession, normalizeSessions, recapText, sessionRecap, MAX_SESSIONS } from '../src/session.ts';
import { normalizeSystem } from '../src/systems-model.ts';
import { formatDuration } from '../src/format.ts';

const start = '2026-10-27T10:00:00.000Z';
const end = '2026-10-27T12:00:00.000Z';
const outlaw = { restockHours: 24, packetsPerVisit: 15, runSize: 5, unitsPerPacket: 75000, nanitesPerPacket: 350 };

test('the recap counts what was logged inside the session only', () => {
  const systems = [
    normalizeSystem({
      name: 'Den',
      createdAt: '2026-10-20T00:00:00Z',
      visits: [
        { at: '2026-10-27T09:00:00Z', packets: 15 },
        { at: '2026-10-27T10:30:00Z', packets: 15 }
      ]
    }),
    normalizeSystem({
      name: 'New',
      createdAt: '2026-10-27T11:00:00Z',
      visits: [{ at: '2026-10-27T11:00:00Z' }, { at: '2026-10-27T11:30:00Z' }]
    }),
    normalizeSystem({ name: 'After', visits: [{ at: '2026-10-27T13:00:00Z' }] })
  ];
  const recap = sessionRecap({ systems, outlaw }, { startedAt: start, endedAt: end, timersDone: 2 }, Date.parse(end));
  assert.equal(recap.elapsed, 2 * 3600_000);
  assert.equal(recap.visits, 3);
  assert.equal(recap.systemsVisited, 2);
  assert.equal(recap.newSystems, 1);
  assert.equal(recap.packetRuns, 1);
  assert.equal(recap.nanites, 15 * 350);
  assert.equal(recap.units, 15 * 75000);
  assert.equal(recap.timersDone, 2);
  assert.match(recapText(recap, formatDuration), /3 visits to 2 systems \(1 new\)\n1 packet run: 15 packets/);
});

test('a running session counts up to now', () => {
  const recap = sessionRecap({ systems: [], outlaw }, { startedAt: start, timersDone: 0 }, Date.parse(start) + 60_000);
  assert.equal(recap.endedAt, null);
  assert.equal(recap.elapsed, 60_000);
});

test('loading keeps valid sessions, at most the last 50', () => {
  assert.deepEqual(normalizeSession({ startedAt: start, timersDone: 3 }), { startedAt: start, timersDone: 3 });
  assert.equal(normalizeSession({ startedAt: 'never' }), null);
  assert.equal(normalizeSession(null), null);
  const many = Array.from({ length: 60 }, (_, i) => ({ startedAt: start, endedAt: end, timersDone: i }));
  const kept = normalizeSessions([...many, { startedAt: start }]);
  assert.equal(kept.length, MAX_SESSIONS);
  assert.equal(kept.at(-1)?.timersDone, 59);
});
