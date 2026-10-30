import { test } from 'vitest';
import assert from 'node:assert/strict';
import { MAX_DEVICES, deviceName, normalizeDevices, stampDevice } from '../src/devices.ts';
import { buildState } from '../src/state.ts';
import { mergeStates } from '../src/sync.ts';

const at = (iso: string) => Date.parse(iso);

test('a damaged or duplicate entry is dropped, not the list', () => {
  assert.deepEqual(
    normalizeDevices([
      { id: 'dev-a', name: ' iPhone · Safari ', lastSync: '2026-10-30T10:00:00.000Z' },
      { id: 'dev-a', name: 'again', lastSync: '2026-10-30T10:00:00.000Z' },
      { id: 'bad id!', name: 'x', lastSync: '2026-10-30T10:00:00.000Z' },
      { id: 'dev-b', name: 'Mac', lastSync: 'yesterday' },
      'nope'
    ]),
    [{ id: 'dev-a', name: 'iPhone · Safari', lastSync: '2026-10-30T10:00:00.000Z' }]
  );
  assert.deepEqual(normalizeDevices(undefined), []);
  assert.deepEqual(buildState({}).devices, []); // a log from before devices loads with none
});

test('a device stamps itself at most hourly, and when its name changes', () => {
  const me = { id: 'dev-a', name: 'iPhone · Safari' };
  const first = stampDevice([], me, at('2026-10-30T10:00:00Z'));
  assert.deepEqual(first, [{ ...me, lastSync: '2026-10-30T10:00:00.000Z' }]);
  assert.equal(stampDevice(first, me, at('2026-10-30T10:30:00Z')), null);
  assert.equal(stampDevice(first, me, at('2026-10-30T11:00:00Z'))?.[0]?.lastSync, '2026-10-30T11:00:00.000Z');
  assert.equal(
    stampDevice(first, { ...me, name: 'iPhone · app' }, at('2026-10-30T10:10:00Z'))?.[0]?.name,
    'iPhone · app'
  );
});

test('a full list makes room by dropping the device that synced longest ago', () => {
  const full = Array.from({ length: MAX_DEVICES }, (_, i) => ({
    id: `dev-${String(i)}`,
    name: 'Mac',
    lastSync: new Date(at('2026-10-01T00:00:00Z') + i * 1000).toISOString()
  }));
  const next = stampDevice(full, { id: 'dev-new', name: 'iPhone' }, at('2026-10-30T00:00:00Z')) ?? [];
  assert.equal(next.length, MAX_DEVICES);
  assert.equal(next[0]?.id, 'dev-new');
  assert.ok(!next.some(device => device.id === 'dev-0'));
});

test('two devices stamping the same log both stay after a merge', () => {
  const base = { meta: {}, devices: [] };
  const phone = { meta: {}, devices: [{ id: 'dev-p', name: 'iPhone', lastSync: '2026-10-30T10:00:00.000Z' }] };
  const desk = { meta: {}, devices: [{ id: 'dev-d', name: 'Mac', lastSync: '2026-10-30T10:05:00.000Z' }] };
  const merged = mergeStates(base, phone, desk);
  assert.deepEqual(
    (merged.devices as { id: string }[]).map(device => device.id),
    ['dev-p', 'dev-d']
  );
});

test('the name comes from the browser’s own description', () => {
  const iphone =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  assert.equal(deviceName(iphone), 'iPhone · Safari');
  assert.equal(deviceName(iphone, true), 'iPhone · app');
  assert.equal(
    deviceName(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    ),
    'Windows · Chrome'
  );
  assert.equal(
    deviceName(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'
    ),
    'Mac · Edge'
  );
  assert.equal(deviceName('Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0'), 'Linux · Firefox');
  assert.equal(deviceName(''), 'Device');
});
