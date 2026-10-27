// Push alerts for finished timers (ADR-0006). A device with "Alerts when the app is asleep" on sends its push
// subscription and the random ids and end times of its running timers; nothing else. Each minute the cron sends
// every due timer one push carrying only its id, which the device's service worker turns into the notification
// from text it kept itself.
import { z } from 'zod';
import { readCapped } from './capacity.ts';

export const MAX_TIMERS = 20; // kept per device: well above what a player runs at once
const MAX_SENT = 50; // accepted in a request (older apps send up to 50); the soonest MAX_TIMERS are kept
const MAX_BODY_BYTES = 16 * 1024;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const MAX_AHEAD_MS = 30 * 24 * HOUR_MS + HOUR_MS; // the app's 30-day timer cap, with room for clock drift
export const GIVE_UP_MS = HOUR_MS; // a push still failing an hour after its time is dropped
const LATE_GRACE_MS = MINUTE_MS;
export const CLAIM_MS = 2 * MINUTE_MS; // a row being sent (or waiting to retry) is skipped by other runs until then
// Pushes per cron run: each costs ~0.5 ms of CPU to encrypt and sign, and a Free-plan run gets 10 ms; Paid gets 30 s.
export const PER_RUN = { free: 12, paid: 40 } as const;
const SCAN = 100; // due rows read per run, before the per-device cap
const PARALLEL = 6;
const PER_DEVICE = 5; // per run, so no one device's backlog crowds out everyone else's

// Only the browsers' own push services: the relay never posts to an address a client made up.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9.-]+\.push\.apple\.com$/,
  /^[a-z0-9.-]+\.notify\.windows\.com$/
];
const TIMER_ID = /^[A-Za-z0-9_-]{1,80}$/;

function decode(text: string): string | null {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(text)) return null;
  try {
    return atob(text.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return null;
  }
}

export const SubscriptionSchema = z.object({
  endpoint: z
    .string()
    .max(1024)
    .refine(value => {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.port && PUSH_HOSTS.some(host => host.test(url.hostname));
      } catch {
        return false;
      }
    }, 'must be a browser push service address'),
  // An uncompressed P-256 public key and a 16-byte secret (RFC 8291); anything else could never be encrypted to.
  keys: z.object({
    p256dh: z.string().refine(key => {
      const bytes = decode(key);
      return bytes?.length === 65 && bytes.charCodeAt(0) === 4;
    }),
    auth: z.string().refine(key => decode(key)?.length === 16)
  })
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

const ScheduleSchema = z.object({
  subscription: SubscriptionSchema,
  now: z.number().int().optional(), // the device's clock when it sent this, to correct for a wrong clock
  timers: z.array(z.object({ id: z.string().max(200), at: z.number() })).max(MAX_SENT)
});
export interface Due {
  deviceId: string;
  timerId: string;
  at: number;
  subscription: string; // as stored (JSON)
}

export interface Device {
  tokenHash: string;
  subscription: string;
  updatedAt: number;
  timers: { id: string; at: number }[];
}
// The writes a schedule needs, worked out by planSchedule() so an unchanged schedule writes nothing.
export interface ScheduleChange {
  device: { subscription: string } | null; // register, or refresh the subscription / last-contact time
  remove: string[];
  upsert: { id: string; at: number; nextTry: number }[];
}

export interface PushStore {
  device(id: string): Promise<Device | null>;
  // Applies a change for the device's owner only (`tokenHash`), so a racing registration can't take it over.
  applySchedule(id: string, tokenHash: string, change: ScheduleChange, now: number): Promise<void>;
  removeDevice(id: string): Promise<void>;
  // Rows due and not claimed (`next_try <= now`), oldest first.
  due(now: number, limit: number): Promise<Due[]>;
  // Drops rows over an hour late, so a backlog can't grow without end.
  prune(before: number): Promise<void>;
  // Marks rows as taken until `until`, so an overlapping run skips them and a failure waits that long to retry.
  claim(rows: { deviceId: string; timerId: string }[], until: number): Promise<void>;
  sent(deviceId: string, timerId: string): Promise<void>;
  purgeDevices(before: number): Promise<void>;
}

// The schedule as kept: well-formed ids only, one entry per id, times moved onto the relay's clock, nothing already
// over (the app is open and announces those itself; a minute's grace covers a schedule sent just before the end) or
// past the 30-day cap. A bad entry is dropped rather than refusing the device's whole schedule. With no backdating,
// a timer can't be placed ahead of others: rows come due in the order their times arrive.
export function cleanSchedule(
  timers: { id: string; at: number }[],
  deviceNow: number | undefined,
  now: number
): { id: string; at: number }[] {
  // A clock off by under a minute is mostly network delay, which differs on every send; correcting for it would make
  // an unchanged schedule look changed each time.
  const measured = deviceNow === undefined ? 0 : now - deviceNow;
  const skew = Math.abs(measured) < 60_000 ? 0 : measured;
  const kept = new Map<string, number>();
  for (const timer of timers) {
    const at = Math.round(timer.at + skew);
    if (!TIMER_ID.test(timer.id) || !Number.isFinite(at) || at <= now - LATE_GRACE_MS || at > now + MAX_AHEAD_MS)
      continue;
    if (!kept.has(timer.id)) kept.set(timer.id, at);
  }
  return [...kept]
    .map(([id, at]) => ({ id, at }))
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_TIMERS);
}

// Only what changed is written: a new or moved timer (queued no earlier than now, so a backdated one can't jump
// ahead of others), a removed one, and the device row when it's new, its subscription changed, or a day has passed
// (its last-contact time drives the 60-day purge).
export function planSchedule(
  known: Device | null,
  subscription: string,
  timers: { id: string; at: number }[],
  now: number
): ScheduleChange {
  const before = new Map((known?.timers ?? []).map(timer => [timer.id, timer.at]));
  const ids = new Set(timers.map(timer => timer.id));
  return {
    device:
      !known || known.subscription !== subscription || now - known.updatedAt > 24 * HOUR_MS ? { subscription } : null,
    remove: [...before.keys()].filter(id => !ids.has(id)),
    upsert: timers
      .filter(timer => before.get(timer.id) !== timer.at)
      .map(timer => ({ ...timer, nextTry: Math.max(timer.at, now) }))
  };
}

const isEmpty = (change: ScheduleChange) => !change.device && !change.remove.length && !change.upsert.length;

// `admitNew` decides whether a device may register now (rate limits, the relay's capacity); it returns the refusal.
export async function handlePush(
  request: Request,
  id: string,
  tokenHash: string,
  store: PushStore,
  reply: (status: number, body?: BodyInit | null, headers?: Record<string, string>) => Response,
  now: number,
  admitNew: () => Promise<Response | null> = () => Promise.resolve(null)
): Promise<Response> {
  const known = await store.device(id);
  if (known && known.tokenHash !== tokenHash) return reply(401);
  switch (request.method) {
    case 'DELETE':
      if (known) await store.removeDevice(id);
      return reply(204);
    case 'PUT': {
      const bytes = await readCapped(request, MAX_BODY_BYTES);
      if (!bytes) return reply(413);
      let json: unknown;
      try {
        json = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        return reply(400);
      }
      const parsed = ScheduleSchema.safeParse(json);
      if (!parsed.success) return reply(400);
      if (!known) {
        const refused = await admitNew();
        if (refused) return refused;
      }
      const { subscription, timers, now: deviceNow } = parsed.data;
      const change = planSchedule(known, JSON.stringify(subscription), cleanSchedule(timers, deviceNow, now), now);
      if (!isEmpty(change)) await store.applySchedule(id, tokenHash, change, now);
      return reply(204);
    }
    default:
      return reply(405, null, { Allow: 'PUT, DELETE, OPTIONS' });
  }
}

// What a send attempt came to: delivered, the subscription is gone (404/410), a failure worth retrying (429, 5xx,
// unreachable), or one that never will succeed (any other 4xx, or a push that couldn't even be built).
export type SendResult = 'sent' | 'gone' | 'retry' | 'failed';
export function sendResult(status: number): SendResult {
  if (status >= 200 && status < 300) return 'sent';
  if (status === 404 || status === 410) return 'gone';
  if (status === 0 || status === 429 || status >= 500) return 'retry';
  return 'failed';
}

// One timer per device in turn (oldest first within each), at most PER_DEVICE from any one, so a device with a long
// queue never fills a run while another waits.
export function takeTurns(rows: Due[], limit: number): Due[] {
  const byDevice = new Map<string, Due[]>();
  for (const row of rows) byDevice.set(row.deviceId, [...(byDevice.get(row.deviceId) ?? []), row]);
  const picked: Due[] = [];
  for (let turn = 0; turn < PER_DEVICE && picked.length < limit; turn++)
    for (const queue of byDevice.values()) {
      const row = queue[turn];
      if (row && picked.length < limit) picked.push(row);
    }
  return picked;
}

// One push per due timer, at most PER_RUN a run, a few at a time. Rows are claimed first, so a run that overlaps
// the next minute's never sends them twice, and a row that keeps failing waits its turn instead of blocking others.
export async function deliver(
  store: PushStore,
  send: (subscription: Subscription, timerId: string) => Promise<SendResult>,
  now: number,
  perRun: number = PER_RUN.free
): Promise<{ sent: number; dropped: number }> {
  await store.prune(now - GIVE_UP_MS);
  const rows = takeTurns(await store.due(now, SCAN), perRun);
  await store.claim(rows, now + CLAIM_MS);
  let sent = 0;
  let dropped = 0;
  const goneDevices = new Set<string>();
  const one = async (due: Due) => {
    if (goneDevices.has(due.deviceId)) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(due.subscription);
    } catch {
      parsed = null;
    }
    const subscription = SubscriptionSchema.safeParse(parsed);
    const result = subscription.success ? await send(subscription.data, due.timerId) : 'gone';
    if (result === 'sent') {
      await store.sent(due.deviceId, due.timerId);
      sent += 1;
    } else if (result === 'gone') {
      goneDevices.add(due.deviceId);
      await store.removeDevice(due.deviceId); // the browser dropped this subscription
      dropped += 1;
    } else if (result === 'failed' || now - due.at > GIVE_UP_MS) {
      await store.sent(due.deviceId, due.timerId); // can't succeed, or too late to be useful
      dropped += 1;
    } // 'retry': stays claimed until CLAIM_MS from now, then the next run tries again
  };
  for (let i = 0; i < rows.length; i += PARALLEL) await Promise.all(rows.slice(i, i + PARALLEL).map(one));
  return { sent, dropped };
}
