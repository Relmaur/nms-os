// Push alerts for finished timers (ADR-0006). A device with "Alerts when the app is asleep" on sends its push
// subscription and the random ids and end times of its running timers; nothing else. Each minute the cron sends
// every due timer one push carrying only its id, which the device's service worker turns into the notification
// from text it kept itself.
import { z } from 'zod';

export const MAX_TIMERS = 50;
const MAX_BODY_BYTES = 16 * 1024;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const MAX_AHEAD_MS = 30 * 24 * HOUR_MS + HOUR_MS; // the app's 30-day timer cap, with room for clock drift
export const GIVE_UP_MS = HOUR_MS; // a push still failing an hour after its time is dropped
export const CLAIM_MS = 2 * MINUTE_MS; // a row being sent (or waiting to retry) is skipped by other runs until then
export const PER_RUN = 40; // within a Free-plan invocation's subrequest budget
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
  timers: z.array(z.object({ id: z.string().max(200), at: z.number() })).max(MAX_TIMERS)
});
export interface Due {
  deviceId: string;
  timerId: string;
  at: number;
  subscription: string; // as stored (JSON)
}

export interface PushStore {
  deviceToken(id: string): Promise<string | null>;
  // Registers the device on first use and replaces its whole schedule.
  saveDevice(
    id: string,
    tokenHash: string,
    subscription: string,
    timers: { id: string; at: number }[],
    now: number
  ): Promise<void>;
  removeDevice(id: string): Promise<void>;
  // Rows due and not claimed (`next_try <= now`), oldest first, at most `perDevice` from any one device.
  due(now: number, limit: number, perDevice: number): Promise<Due[]>;
  // Marks rows as taken until `until`, so an overlapping run skips them and a failure waits that long to retry.
  claim(rows: { deviceId: string; timerId: string }[], until: number): Promise<void>;
  sent(deviceId: string, timerId: string): Promise<void>;
  purgeDevices(before: number): Promise<void>;
}

// The schedule as kept: well-formed ids only, one entry per id, times moved onto the relay's clock, nothing over an
// hour late or past the 30-day cap. A bad entry is dropped rather than refusing the device's whole schedule.
export function cleanSchedule(
  timers: { id: string; at: number }[],
  deviceNow: number | undefined,
  now: number
): { id: string; at: number }[] {
  const skew = deviceNow === undefined ? 0 : now - deviceNow;
  const kept = new Map<string, number>();
  for (const timer of timers) {
    const at = Math.round(timer.at + skew);
    if (!TIMER_ID.test(timer.id) || !Number.isFinite(at) || at <= now - GIVE_UP_MS || at > now + MAX_AHEAD_MS) continue;
    if (!kept.has(timer.id)) kept.set(timer.id, at);
  }
  return [...kept].map(([id, at]) => ({ id, at }));
}

export async function handlePush(
  request: Request,
  id: string,
  tokenHash: string,
  store: PushStore,
  reply: (status: number, body?: BodyInit | null, headers?: Record<string, string>) => Response,
  now: number
): Promise<Response> {
  const known = await store.deviceToken(id);
  if (known !== null && known !== tokenHash) return reply(401);
  switch (request.method) {
    case 'DELETE':
      if (known !== null) await store.removeDevice(id);
      return reply(204);
    case 'PUT': {
      if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY_BYTES) return reply(413);
      const text = await request.text();
      if (text.length > MAX_BODY_BYTES) return reply(413);
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return reply(400);
      }
      const parsed = ScheduleSchema.safeParse(json);
      if (!parsed.success) return reply(400);
      const { subscription, timers, now: deviceNow } = parsed.data;
      await store.saveDevice(id, tokenHash, JSON.stringify(subscription), cleanSchedule(timers, deviceNow, now), now);
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

// One push per due timer, at most PER_RUN a run, a few at a time. Rows are claimed first, so a run that overlaps
// the next minute's never sends them twice, and a row that keeps failing waits its turn instead of blocking others.
export async function deliver(
  store: PushStore,
  send: (subscription: Subscription, timerId: string) => Promise<SendResult>,
  now: number
): Promise<{ sent: number; dropped: number }> {
  const rows = await store.due(now, PER_RUN, PER_DEVICE);
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
