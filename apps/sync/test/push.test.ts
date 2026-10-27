import { beforeEach, expect, test } from 'vitest';
import { handle, type VaultStore } from '../src/handler.ts';
import {
  CLAIM_MS,
  deliver,
  GIVE_UP_MS,
  MAX_TIMERS,
  PER_RUN,
  planSchedule,
  type Due,
  type PushStore
} from '../src/push.ts';
import { newSyncCode } from '@atlas/core/sync-crypto';

const ORIGIN = 'https://relmaur.github.io';
const NOW = Date.parse('2026-10-27T12:00:00Z');
const DEVICE = 'AbCdEfGhIjKlMnOpQrStUv';
const b64url = (bytes: number[]) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
// An uncompressed P-256 point (0x04 + 64 bytes) and a 16-byte secret: the shapes a browser gives.
const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: {
    p256dh: b64url([4, ...Array.from({ length: 64 }, (_, i) => i)]),
    auth: b64url(Array.from({ length: 16 }, (_, i) => i))
  }
};

function memoryPush(): PushStore & {
  devices: Map<string, { tokenHash: string; subscription: string; updatedAt: number }>;
  due_: Map<string, { deviceId: string; timerId: string; at: number; nextTry: number }>;
  writes: number;
} {
  const devices = new Map<string, { tokenHash: string; subscription: string; updatedAt: number }>();
  const due_ = new Map<string, { deviceId: string; timerId: string; at: number; nextTry: number }>();
  let writes = 0;
  const dropDue = (deviceId: string) => {
    for (const [key, row] of due_) if (row.deviceId === deviceId) due_.delete(key);
  };
  return {
    devices,
    due_,
    get writes() {
      return writes;
    },
    device(id) {
      const device = devices.get(id);
      if (!device) return Promise.resolve(null);
      const timers = [...due_.values()]
        .filter(row => row.deviceId === id)
        .map(row => ({ id: row.timerId, at: row.at }));
      return Promise.resolve({ ...device, timers });
    },
    applySchedule(id, tokenHash, change, now) {
      const known = devices.get(id);
      if (known && known.tokenHash !== tokenHash) return Promise.resolve(); // not the owner: nothing applies
      if (change.device) devices.set(id, { tokenHash, subscription: change.device.subscription, updatedAt: now });
      if (!devices.has(id)) return Promise.resolve();
      for (const timerId of change.remove) due_.delete(`${id}/${timerId}`);
      for (const timer of change.upsert)
        due_.set(`${id}/${timer.id}`, { deviceId: id, timerId: timer.id, at: timer.at, nextTry: timer.nextTry });
      writes += (change.device ? 1 : 0) + change.remove.length + change.upsert.length;
      return Promise.resolve();
    },
    removeDevice(id) {
      devices.delete(id);
      dropDue(id);
      return Promise.resolve();
    },
    due(now, limit) {
      const rows: Due[] = [...due_.values()]
        .filter(row => row.nextTry <= now && devices.has(row.deviceId))
        .sort((a, b) => a.nextTry - b.nextTry)
        .slice(0, limit)
        .map(row => ({
          deviceId: row.deviceId,
          timerId: row.timerId,
          at: row.at,
          subscription: devices.get(row.deviceId)?.subscription ?? ''
        }));
      return Promise.resolve(rows);
    },
    prune(before) {
      for (const [key, row] of due_) if (row.at < before) due_.delete(key);
      return Promise.resolve();
    },
    claim(rows, until) {
      for (const row of rows) {
        const kept = due_.get(`${row.deviceId}/${row.timerId}`);
        if (kept) kept.nextTry = until;
      }
      return Promise.resolve();
    },
    sent(deviceId, timerId) {
      due_.delete(`${deviceId}/${timerId}`);
      return Promise.resolve();
    },
    purgeDevices(before) {
      for (const [id, device] of devices) if (device.updatedAt < before) this.removeDevice(id).catch(() => undefined);
      return Promise.resolve();
    }
  };
}

const noVaults = {} as VaultStore; // push requests never reach the vault store
let push: ReturnType<typeof memoryPush>;
let token: string;
beforeEach(() => {
  push = memoryPush();
  token = newSyncCode(); // any 43-character base64url secret
});

const call = (method: string, body?: unknown, auth = token) =>
  handle(
    new Request(`https://atlas-sync.example.workers.dev/v1/push/${DEVICE}`, {
      method,
      headers: { Origin: ORIGIN, Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
      ...(body !== undefined && { body: JSON.stringify(body) })
    }),
    noVaults,
    { origins: [ORIGIN], now: () => NOW, push }
  );

test('a device registers with its schedule, and each PUT replaces the whole schedule', async () => {
  const first = await call('PUT', {
    subscription,
    timers: [
      { id: 'timer-a', at: NOW + 60_000 },
      { id: 'timer-b', at: NOW + 120_000 }
    ]
  });
  expect(first.status).toBe(204);
  expect(first.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  expect([...push.due_.values()].map(row => row.timerId)).toEqual(['timer-a', 'timer-b']);
  expect(push.devices.get(DEVICE)?.tokenHash).not.toBe(token); // only a hash is kept

  expect((await call('PUT', { subscription, timers: [{ id: 'timer-c', at: NOW + 1000 }] })).status).toBe(204);
  expect([...push.due_.values()].map(row => row.timerId)).toEqual(['timer-c']);
  const stored = JSON.parse(push.devices.get(DEVICE)?.subscription ?? '{}') as Record<string, unknown>;
  expect(Object.keys(stored).sort()).toEqual(['endpoint', 'keys']); // nothing else from the body is kept
});

test('another token is refused; DELETE removes the device and its schedule', async () => {
  await call('PUT', { subscription, timers: [{ id: 'timer-a', at: NOW + 60_000 }] });
  expect((await call('PUT', { subscription, timers: [] }, newSyncCode())).status).toBe(401);
  expect((await call('DELETE', undefined, newSyncCode())).status).toBe(401);
  expect(push.due_.size).toBe(1);
  expect((await call('DELETE')).status).toBe(204);
  expect(push.devices.size).toBe(0);
  expect(push.due_.size).toBe(0);
});

test('only browser push services with well-formed keys, and a bounded list, are accepted', async () => {
  const bad = [
    { subscription: { ...subscription, endpoint: 'https://evil.example/hook' }, timers: [] },
    { subscription: { ...subscription, endpoint: 'http://fcm.googleapis.com/fcm/send/x' }, timers: [] },
    { subscription: { ...subscription, endpoint: 'https://fcm.googleapis.com:8443/fcm/send/x' }, timers: [] },
    { subscription: { ...subscription, keys: { ...subscription.keys, p256dh: 'AAAA' } }, timers: [] },
    { subscription: { ...subscription, keys: { ...subscription.keys, auth: b64url([1, 2, 3]) } }, timers: [] },
    { subscription, timers: Array.from({ length: 51 }, (_, i) => ({ id: `t${String(i)}`, at: NOW })) }
  ];
  for (const body of bad) expect((await call('PUT', body)).status).toBe(400);
  expect(push.devices.size).toBe(0);
  const apple = { ...subscription, endpoint: 'https://web.push.apple.com/QGuQyavXutnMH' };
  expect((await call('PUT', { subscription: apple, timers: [] })).status).toBe(204);
});

test('each due timer is pushed once with only its id; a gone subscription removes the device', async () => {
  await call('PUT', {
    subscription,
    timers: [
      { id: 'timer-a', at: NOW - 1000 }, // within the minute's grace
      { id: 'timer-b', at: NOW + 60_000 }
    ]
  });
  const sent: string[] = [];
  const result = await deliver(
    push,
    (_sub, timerId) => {
      sent.push(timerId);
      return Promise.resolve('sent' as const);
    },
    NOW
  );
  expect(result).toEqual({ sent: 1, dropped: 0 });
  expect(sent).toEqual(['timer-a']);
  await deliver(push, () => Promise.resolve('sent' as const), NOW);
  expect(sent).toEqual(['timer-a']); // not twice

  await deliver(push, () => Promise.resolve('gone' as const), NOW + 120_000);
  expect(push.devices.size).toBe(0);
});

test('a failing push waits its turn and is retried, then dropped an hour late; one that can’t work is dropped', async () => {
  await call('PUT', { subscription, timers: [{ id: 'timer-a', at: NOW }] });
  const tries: number[] = [];
  const retry = (at: number) => () => {
    tries.push(at);
    return Promise.resolve('retry' as const);
  };
  await deliver(push, retry(NOW), NOW);
  await deliver(push, retry(NOW + 60_000), NOW + 60_000); // still claimed: an overlapping run skips it
  expect(tries).toEqual([NOW]);
  await deliver(push, retry(NOW + CLAIM_MS), NOW + CLAIM_MS);
  expect(tries).toEqual([NOW, NOW + CLAIM_MS]);
  expect(push.due_.size).toBe(1);
  await deliver(push, retry(NOW + GIVE_UP_MS + CLAIM_MS), NOW + GIVE_UP_MS + CLAIM_MS);
  expect(push.due_.size).toBe(0);
  expect(push.devices.size).toBe(1); // the device stays; only that alert is given up

  await call('PUT', { subscription, timers: [{ id: 'timer-b', at: NOW }] });
  await deliver(push, () => Promise.resolve('failed' as const), NOW);
  expect(push.due_.size).toBe(0);
});

test('a device with a long queue can’t crowd out everyone else’s: devices take turns', async () => {
  for (let device = 0; device < 4; device++) {
    const id = `crowd${String(device)}`.padEnd(22, 'x');
    const timers = Array.from({ length: MAX_TIMERS }, (_, i) => ({ id: `t${String(i)}`, at: NOW }));
    await push.applySchedule(id, 'hash', planSchedule(null, JSON.stringify(subscription), timers, NOW), NOW);
  }
  await call('PUT', { subscription, timers: [{ id: 'timer-real', at: NOW }] });
  const sent: string[] = [];
  await deliver(
    push,
    (_sub, timerId) => {
      sent.push(timerId);
      return Promise.resolve('sent' as const);
    },
    NOW
  );
  expect(sent).toHaveLength(PER_RUN.free);
  expect(sent).toContain('timer-real');
});

test('an unchanged schedule writes nothing; a moved timer queues no earlier than now', async () => {
  const schedule = { subscription, timers: [{ id: 'timer-a', at: NOW + 60_000 }] };
  await call('PUT', schedule);
  const before = push.writes;
  await call('PUT', schedule);
  expect(push.writes).toBe(before);
  const change = planSchedule(
    {
      tokenHash: 'h',
      subscription: JSON.stringify(subscription),
      updatedAt: NOW,
      timers: [{ id: 'timer-a', at: NOW }]
    },
    JSON.stringify(subscription),
    [{ id: 'timer-a', at: NOW - 30_000 }],
    NOW
  );
  expect(change).toEqual({ device: null, remove: [], upsert: [{ id: 'timer-a', at: NOW - 30_000, nextTry: NOW }] });
});

test('a new device is turned away when the relay is busy; a known one carries on', async () => {
  const busy = (state: 'ok' | 'busy') =>
    handle(
      new Request(`https://atlas-sync.example.workers.dev/v1/push/${DEVICE}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscription, timers: [] })
      }),
      noVaults,
      { origins: [], now: () => NOW, push, capacity: () => Promise.resolve({ state, storageFull: false }) }
    );
  expect((await busy('busy')).status).toBe(503);
  expect(push.devices.size).toBe(0);
  expect((await busy('ok')).status).toBe(204);
  expect((await busy('busy')).status).toBe(204);
});

test('devices silent for the retention period are purged', async () => {
  await call('PUT', { subscription, timers: [{ id: 'timer-a', at: NOW + 1000 }] });
  await push.purgeDevices(NOW + 1);
  expect(push.devices.size).toBe(0);
  expect(push.due_.size).toBe(0);
});

test('bad entries are dropped instead of refusing the schedule; the device clock is corrected', async () => {
  const response = await call('PUT', {
    subscription,
    now: NOW - 20 * 60_000, // the phone's clock runs 20 minutes slow
    timers: [
      { id: 'timer-a', at: NOW - 20 * 60_000 + 60_000 },
      { id: 'timer-a', at: NOW + 5 * 60_000 }, // a duplicate id: the first stays
      { id: 'bad id!', at: NOW + 60_000 },
      { id: 'too-far', at: NOW + 40 * 24 * 3_600_000 },
      { id: 'already-over', at: NOW - 25 * 60_000 } // the open app announces it; no push
    ]
  });
  expect(response.status).toBe(204);
  expect([...push.due_.values()].map(row => [row.timerId, row.at])).toEqual([['timer-a', NOW + 60_000]]);
});

test('up to 50 timers are accepted from a device; the soonest 20 are kept', async () => {
  const timers = Array.from({ length: 30 }, (_, i) => ({ id: `t${String(i)}`, at: NOW + (30 - i) * 60_000 }));
  expect((await call('PUT', { subscription, timers })).status).toBe(204);
  const kept = [...push.due_.values()].map(row => row.timerId);
  expect(kept).toHaveLength(MAX_TIMERS);
  expect(kept).toContain('t29'); // the soonest
  expect(kept).not.toContain('t0'); // the latest
});
