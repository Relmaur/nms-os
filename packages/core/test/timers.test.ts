import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  dueForAlert,
  lastCropMinutes,
  nextDue,
  normalizeTimers,
  pendingPushes,
  refineDuration,
  refineOptions,
  timerRows,
  timerNotice,
  timerStatus,
  type Timer
} from '../src/timers.ts';
import { normalizeSystem, HOUR_MS } from '../src/systems-model.ts';
import type { GameItem } from '../src/game-data.ts';

const now = Date.parse('2026-10-27T12:00:00Z');
const at = (minutes: number) => new Date(now + minutes * 60000).toISOString();
const timer = (over: Partial<Timer>): Timer => ({
  id: 't1',
  kind: 'custom',
  label: 'Frigate',
  startedAt: at(-10),
  endsAt: at(10),
  alerted: false,
  ...over
});

test('a refiner run takes the wiki’s time per unit made, over whole batches', () => {
  const recipe = { outputs: [{ name: 'Activated Quartzite', qty: 1 }], seconds: 0.36 };
  assert.equal(refineDuration(recipe, 250), 90_000);
  // 30 per batch at 4.8 s a unit: 300 takes 24 minutes, and 301 rounds up to an 11th batch.
  const stellar = { outputs: [{ name: 'Chromatic Metal', qty: 30 }], seconds: 4.8 };
  assert.equal(refineDuration(stellar, 300), 24 * 60_000);
  assert.equal(refineDuration(stellar, 301), 330 * 4800);
  assert.equal(refineDuration({ outputs: [{ name: 'X', qty: 1 }] }, 10), null); // no wiki time
  assert.equal(refineDuration(recipe, 0), null);
});

test('status counts down to done, with progress', () => {
  assert.deepEqual(timerStatus(timer({}), now), { remaining: 600_000, done: false, progress: 0.5 });
  assert.equal(timerStatus(timer({ endsAt: at(-1) }), now).done, true);
  assert.equal(timerStatus(timer({ endsAt: at(-1) }), now).progress, 1);
});

test('rows put the soonest first and include outlaw stations still restocking', () => {
  const restocking = normalizeSystem({
    name: 'Den',
    tags: ['outlaw'],
    visits: [{ at: new Date(now - 23 * HOUR_MS).toISOString(), packets: 15 }]
  });
  const ready = normalizeSystem({ name: 'Ready', tags: ['outlaw'] });
  const rows = timerRows(
    {
      timers: [timer({ id: 'late', endsAt: at(120) }), timer({ id: 'soon', endsAt: at(5) })],
      systems: [restocking, ready],
      outlaw: { restockHours: 24 }
    },
    now
  );
  assert.deepEqual(
    rows.map(row => (row.type === 'timer' ? row.timer.id : row.system.name)),
    ['soon', 'Den', 'late']
  );
});

test('a finished timer is due for its alert once', () => {
  const timers = [
    timer({ id: 'a', endsAt: at(-1) }),
    timer({ id: 'b', endsAt: at(-1), alerted: true }),
    timer({ id: 'c' })
  ];
  assert.deepEqual(
    dueForAlert(timers, now).map(t => t.id),
    ['a']
  );
  assert.equal(nextDue(timers), Date.parse(at(-1)));
  assert.equal(nextDue([timer({ alerted: true })]), null);
});

test('a crop starts from the time last set for it', () => {
  const timers = [
    timer({ kind: 'crop', label: 'Frostwort', startedAt: at(-200), endsAt: at(-140) }),
    timer({ kind: 'crop', label: 'Frostwort', startedAt: at(-30), endsAt: at(45) })
  ];
  assert.equal(lastCropMinutes(timers, ' frostwort '), 75);
  assert.equal(lastCropMinutes(timers, 'Gravitino'), null);
});

test('loading keeps good timers and drops damaged ones', () => {
  const timers = normalizeTimers([
    { id: 'ok', kind: 'refine', label: ' 250 Glass ', startedAt: at(0), endsAt: at(5) },
    { label: 'no times' },
    { label: 'bad date', startedAt: 'soon', endsAt: at(5) },
    { kind: 'weird', label: 'Custom', startedAt: at(0), endsAt: at(1), alerted: true },
    'junk'
  ]);
  assert.deepEqual(
    timers.map(t => [t.label, t.kind, t.alerted]),
    [
      ['250 Glass', 'refine', false],
      ['Custom', 'custom', true]
    ]
  );
  assert.deepEqual(normalizeTimers(undefined), []);
});

test('the refiner picker lists current items with a timed refine recipe, by name', () => {
  // Only the fields refineOptions reads; a full GameItem carries many more.
  const item = (title: string, recipes: object[], obsolete = false) =>
    ({ title, recipes, obsolete }) as unknown as GameItem;
  const options = refineOptions([
    item('Glass', [
      {
        type: 'refine',
        inputs: [{ name: 'Frost Crystal', qty: 1 }],
        outputs: [{ name: 'Glass', qty: 1 }],
        seconds: 0.6
      }
    ]),
    item('Activated Quartzite', [
      { type: 'refine', inputs: [], outputs: [{ name: 'Activated Quartzite', qty: 1 }], seconds: 0.36 }
    ]),
    item('Untimed', [{ type: 'refine', inputs: [], outputs: [{ name: 'Untimed', qty: 1 }] }]),
    item('Old', [{ type: 'refine', inputs: [], outputs: [], seconds: 1 }], true),
    item('Crafted', [{ type: 'craft', inputs: [], outputs: [], seconds: 1 }])
  ]);
  assert.deepEqual(
    options.map(option => option.title),
    ['Activated Quartzite', 'Glass']
  );
});

test('pendingPushes sends ids and end times of timers not yet announced, soonest first, capped', () => {
  const make = (id: string, ends: number, alerted = false): Timer => ({
    id,
    kind: 'custom',
    label: id,
    startedAt: at(-120),
    endsAt: at(ends),
    alerted
  });
  const timers = [
    make('later', 30),
    make('soon', 5),
    make('told', 1, true),
    make('just-late', -10),
    make('stale', -90)
  ];
  assert.deepEqual(pendingPushes(timers, now), [
    { id: 'just-late', at: now - 600_000 },
    { id: 'soon', at: now + 300_000 },
    { id: 'later', at: now + 1_800_000 }
  ]);
  assert.equal(pendingPushes(timers, now, 1).length, 1);
  // A hand-edited log: ids the relay won't take, a duplicate, and a date past the 30-day cap stay with the app.
  const odd = [make('bad id!', 5), make('soon', 5), make('soon', 6), make('far', 60 * 24 * 40)];
  assert.deepEqual(
    pendingPushes(odd, now).map(item => item.id),
    ['soon']
  );
  assert.deepEqual(
    timerNotice({ kind: 'refine', label: '300 Chromatic Metal' }).title,
    'Refiner done: 300 Chromatic Metal'
  );
});
