// The Cloudflare Worker: the handler over D1, a minute cron that sends due timer pushes (ADR-0006), and a daily purge
// of vaults unused for a year (ADR-0005) and push devices silent for 60 days. It meters its own use of the plan's
// daily limits (requests, and D1's own rows-read/written counts) so it can turn away new players when busy, tell
// everyone "full until midnight UTC" before Cloudflare's hard stop, and report usage at /v1/status (no ids, no IPs).
import { buildPushHTTPRequest } from '@pushforge/builder';
import { handle, type Capacity, type LimitKind, type Vault, type VaultStore } from './handler.ts';
import { deliver, PER_RUN, sendResult, type PushStore, type SendResult, type Subscription } from './push.ts';
import { capacityState, LIMITS, storageFull, usedShare, utcDay, type DayUsage, type Plan } from './capacity.ts';

interface Env {
  DB: D1Database;
  LIMITER?: RateLimit;
  CREATE_LIMITER?: RateLimit;
  PUSH_LIMITER?: RateLimit;
  ALLOWED_ORIGINS: string;
  PLAN?: string;
  VAPID_SUBJECT: string;
  VAPID_PRIVATE_JWK?: string; // a Wrangler secret; without it the cron sends nothing
}

const DAILY = '23 4 * * *';
const DAY_MS = 24 * 3_600_000;
const RETENTION_MS = 365 * DAY_MS;
const PUSH_RETENTION_MS = 60 * DAY_MS;
const PUSH_TIMEOUT_MS = 5_000;
const FLUSH_MS = 5 * 60_000;
const FLUSH_EVERY = 50;
const CAPACITY_TTL_MS = 30_000;

const planOf = (env: Env): Plan => (env.PLAN === 'paid' ? 'paid' : 'free');

// ── The usage meter: counted in this isolate, added to its day's row every 50 requests or 5 minutes ──
// The flush is itself a D1 write, so it's rare; an isolate evicted between flushes loses its last few counts,
// which only makes the estimate slightly low. A failed flush puts its counts back.
interface Meter extends DayUsage {
  day: string;
  flushedAt: number;
}
const empty = (day: string, flushedAt: number): Meter => ({ day, requests: 0, rowsRead: 0, rowsWritten: 0, flushedAt });
let meter: Meter = empty('', 0);
let unflushed: Meter[] = []; // earlier days' counts still to write (an isolate that lived past midnight UTC)
let dbBytes = 0; // the database size D1 last reported to this isolate
function track(meta: D1Meta): void {
  meter.rowsRead += meta.rows_read;
  meter.rowsWritten += meta.rows_written;
  if (meta.size_after) dbBytes = meta.size_after;
}
function countRequest(now: number): void {
  const day = utcDay(now);
  if (meter.day !== day) {
    if (meter.requests || meter.rowsRead || meter.rowsWritten) unflushed.push(meter);
    meter = empty(day, meter.flushedAt || now); // workerd's clock reads 0 at module load: start it here
  }
  meter.requests += 1;
}
const hasCounts = (counts: DayUsage) => counts.requests > 0 || counts.rowsRead > 0 || counts.rowsWritten > 0;
async function flush(db: D1Database, now: number, force = false): Promise<void> {
  const due = force || now - meter.flushedAt > FLUSH_MS || meter.requests >= FLUSH_EVERY || unflushed.length > 0;
  if (!due || (!hasCounts(meter) && !unflushed.length)) return;
  const batch = [...unflushed, ...(hasCounts(meter) ? [meter] : [])];
  unflushed = [];
  meter = empty(meter.day || utcDay(now), now);
  try {
    const results = await db.batch(
      batch.map(counts =>
        db
          .prepare(
            'INSERT INTO usage (day, requests, rows_read, rows_written, db_bytes) VALUES (?, ?, ?, ?, ?) ' +
              'ON CONFLICT(day) DO UPDATE SET requests = requests + excluded.requests, ' +
              'rows_read = rows_read + excluded.rows_read, rows_written = rows_written + excluded.rows_written, ' +
              'db_bytes = MAX(db_bytes, excluded.db_bytes)'
          )
          .bind(counts.day, counts.requests, counts.rowsRead, counts.rowsWritten, dbBytes)
      )
    );
    results.forEach(result => {
      track(result.meta);
    });
  } catch {
    // Not written: keep the counts for the next flush rather than lose them.
    for (const counts of batch)
      if (counts.day === meter.day) {
        meter.requests += counts.requests;
        meter.rowsRead += counts.rowsRead;
        meter.rowsWritten += counts.rowsWritten;
      } else unflushed.push(counts);
  }
}

// Every query goes through these, so D1's own row counts reach the meter.
async function run(statement: D1PreparedStatement): Promise<D1Result> {
  const result = await statement.run();
  track(result.meta);
  return result;
}
async function all<T>(statement: D1PreparedStatement): Promise<T[]> {
  const result = await statement.all<T>();
  track(result.meta);
  return result.results;
}
async function batch(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  if (!statements.length) return;
  const results = await db.batch(statements);
  results.forEach(result => {
    track(result.meta);
  });
}

// ── Capacity: today's row plus what this isolate hasn't flushed, re-read at most every 30 s ──
interface UsageRow {
  day: string;
  requests: number;
  rows_read: number;
  rows_written: number;
  db_bytes: number;
  vaults: number | null;
  push_devices: number | null;
}
let cached: { at: number; day: string; capacity: Capacity } | null = null;
async function capacity(env: Env, now: number): Promise<Capacity> {
  // A state read before midnight UTC never answers for the new day: the limits have reset.
  if (cached && cached.day === utcDay(now) && now - cached.at < CAPACITY_TTL_MS) return cached.capacity;
  const plan = planOf(env);
  const rows = await all<UsageRow>(env.DB.prepare('SELECT * FROM usage ORDER BY day DESC LIMIT 2'));
  const today = rows.find(row => row.day === utcDay(now));
  const usage = {
    requests: (today?.requests ?? 0) + meter.requests,
    rowsRead: (today?.rows_read ?? 0) + meter.rowsRead,
    rowsWritten: (today?.rows_written ?? 0) + meter.rowsWritten
  };
  // The database's size now: what D1 last told this isolate, else today's largest report.
  const bytes = dbBytes || (today?.db_bytes ?? 0);
  const result: Capacity = { state: capacityState(usage, plan), storageFull: storageFull(bytes, plan) };
  cached = { at: now, day: utcDay(now), capacity: result };
  return result;
}

// The public usage summary for the daily upgrade check (.github/workflows/relay-usage.yml): shares (%) of the Free
// plan's daily limits, the database size, and how many vaults and push devices there are. Aggregates only.
async function status(env: Env, now: number): Promise<unknown> {
  const rows = await all<UsageRow>(env.DB.prepare('SELECT * FROM usage ORDER BY day DESC LIMIT 7'));
  const free = LIMITS.free;
  const percent = (share: number) => Math.round(share * 1000) / 10;
  const bytes = dbBytes || (rows[0]?.db_bytes ?? 0);
  const counted = rows.find(row => row.vaults !== null);
  return {
    plan: planOf(env),
    capacity: (await capacity(env, now)).state,
    databaseMB: Math.round(bytes / 104_857.6) / 10,
    databasePercent: percent(bytes / free.bytes),
    vaults: counted?.vaults ?? null,
    pushDevices: counted?.push_devices ?? null,
    days: rows.map(row => ({
      day: row.day,
      requests: row.requests,
      rowsRead: row.rows_read,
      rowsWritten: row.rows_written,
      // The largest share of any Free daily limit that day: the number the upgrade check watches.
      percent: percent(
        usedShare({ requests: row.requests, rowsRead: row.rows_read, rowsWritten: row.rows_written }, 'free')
      )
    }))
  };
}

function d1Store(db: D1Database): VaultStore {
  return {
    async get(id) {
      const [row] = await all<{ token_hash: string; version: number; blob: ArrayBuffer | number[] }>(
        db.prepare('SELECT token_hash, version, blob FROM vaults WHERE id = ?').bind(id)
      );
      if (!row) return null;
      // D1 returns a BLOB column as an ArrayBuffer or, in local development, as an array of bytes.
      const vault: Vault = { tokenHash: row.token_hash, version: row.version, blob: new Uint8Array(row.blob) };
      return vault;
    },
    async create(id, tokenHash, blob, now) {
      const result = await run(
        db
          .prepare(
            'INSERT INTO vaults (id, token_hash, version, blob, updated_at) VALUES (?, ?, 1, ?, ?) ON CONFLICT(id) DO NOTHING'
          )
          .bind(id, tokenHash, blob, now)
      );
      return result.meta.changes === 1;
    },
    async update(id, tokenHash, version, blob, now) {
      const result = await run(
        db
          .prepare(
            'UPDATE vaults SET blob = ?, version = version + 1, updated_at = ? ' +
              'WHERE id = ? AND token_hash = ? AND version = ?'
          )
          .bind(blob, now, id, tokenHash, version)
      );
      return result.meta.changes === 1;
    },
    async remove(id, tokenHash) {
      await run(db.prepare('DELETE FROM vaults WHERE id = ? AND token_hash = ?').bind(id, tokenHash));
    },
    async touch(id, now) {
      // At most one write a day per vault, however often devices pull.
      await run(
        db.prepare('UPDATE vaults SET updated_at = ? WHERE id = ? AND updated_at < ?').bind(now, id, now - DAY_MS)
      );
    }
  };
}

function d1Push(db: D1Database): PushStore {
  // Statements on a device's timers apply only while the device belongs to this token.
  const owns = 'EXISTS (SELECT 1 FROM push_devices WHERE id = ? AND token_hash = ?)';
  return {
    async device(id) {
      const [device] = await all<{ token_hash: string; subscription: string; updated_at: number }>(
        db.prepare('SELECT token_hash, subscription, updated_at FROM push_devices WHERE id = ?').bind(id)
      );
      if (!device) return null;
      const timers = await all<{ timer_id: string; at: number }>(
        db.prepare('SELECT timer_id, at FROM push_due WHERE device_id = ?').bind(id)
      );
      return {
        tokenHash: device.token_hash,
        subscription: device.subscription,
        updatedAt: device.updated_at,
        timers: timers.map(row => ({ id: row.timer_id, at: row.at }))
      };
    },
    async applySchedule(id, tokenHash, change, now) {
      const statements: D1PreparedStatement[] = [];
      if (change.device)
        statements.push(
          db
            .prepare(
              'INSERT INTO push_devices (id, token_hash, subscription, updated_at) VALUES (?, ?, ?, ?) ' +
                'ON CONFLICT(id) DO UPDATE SET subscription = excluded.subscription, updated_at = excluded.updated_at ' +
                'WHERE push_devices.token_hash = excluded.token_hash'
            )
            .bind(id, tokenHash, change.device.subscription, now)
        );
      if (change.remove.length)
        statements.push(
          db
            .prepare(
              `DELETE FROM push_due WHERE device_id = ? AND timer_id IN (${change.remove.map(() => '?').join(', ')}) ` +
                `AND ${owns}`
            )
            .bind(id, ...change.remove, id, tokenHash)
        );
      for (const timer of change.upsert)
        statements.push(
          db
            .prepare(
              `INSERT INTO push_due (device_id, timer_id, at, next_try) SELECT ?, ?, ?, ? WHERE ${owns} ` +
                'ON CONFLICT(device_id, timer_id) DO UPDATE SET at = excluded.at, next_try = excluded.next_try'
            )
            .bind(id, timer.id, timer.at, timer.nextTry, id, tokenHash)
        );
      await batch(db, statements);
    },
    async removeDevice(id) {
      await batch(db, [
        db.prepare('DELETE FROM push_due WHERE device_id = ?').bind(id),
        db.prepare('DELETE FROM push_devices WHERE id = ?').bind(id)
      ]);
    },
    async due(now, limit) {
      const rows = await all<{ device_id: string; timer_id: string; at: number; subscription: string }>(
        db
          .prepare(
            'SELECT d.device_id, d.timer_id, d.at, p.subscription FROM push_due d ' +
              'JOIN push_devices p ON p.id = d.device_id WHERE d.next_try <= ? ORDER BY d.next_try LIMIT ?'
          )
          .bind(now, limit)
      );
      return rows.map(row => ({
        deviceId: row.device_id,
        timerId: row.timer_id,
        at: row.at,
        subscription: row.subscription
      }));
    },
    async prune(before) {
      await run(db.prepare('DELETE FROM push_due WHERE at < ?').bind(before));
    },
    async claim(rows, until) {
      await batch(
        db,
        rows.map(row =>
          db
            .prepare('UPDATE push_due SET next_try = ? WHERE device_id = ? AND timer_id = ?')
            .bind(until, row.deviceId, row.timerId)
        )
      );
    },
    async sent(deviceId, timerId) {
      await run(db.prepare('DELETE FROM push_due WHERE device_id = ? AND timer_id = ?').bind(deviceId, timerId));
    },
    async purgeDevices(before) {
      await batch(db, [
        db
          .prepare('DELETE FROM push_due WHERE device_id IN (SELECT id FROM push_devices WHERE updated_at < ?)')
          .bind(before),
        db.prepare('DELETE FROM push_devices WHERE updated_at < ?').bind(before)
      ]);
    }
  };
}

// The payload is only the timer's id ({ t }), encrypted to the device's keys (RFC 8291); the service worker shows
// the notification from text it kept on the device.
function pushSender(env: Env, privateJWK: string) {
  return async (subscription: Subscription, timerId: string): Promise<SendResult> => {
    let request: Awaited<ReturnType<typeof buildPushHTTPRequest>>;
    try {
      request = await buildPushHTTPRequest({
        privateJWK,
        subscription,
        message: {
          payload: { t: timerId },
          adminContact: env.VAPID_SUBJECT,
          options: { ttl: 3600, urgency: 'high' }
        }
      });
    } catch {
      return 'failed'; // keys it can't encrypt to (the VAPID key itself was checked before the run)
    }
    try {
      const response = await fetch(request.endpoint, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
        signal: AbortSignal.timeout(PUSH_TIMEOUT_MS)
      });
      return sendResult(response.status);
    } catch {
      return 'retry'; // unreachable or timed out
    }
  };
}

// A missing or broken VAPID key would fail every push: leave the queue alone and say so once, instead.
async function vapidKey(env: Env): Promise<string | null> {
  const key = env.VAPID_PRIVATE_JWK;
  if (!key) return null;
  try {
    const jwk = JSON.parse(key) as JsonWebKey; // checked by importKey just below
    await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    return key;
  } catch {
    console.warn('[atlas]', { event: 'vapid-invalid' });
    return null;
  }
}

function limiter(env: Env, kind: LimitKind): RateLimit | undefined {
  return kind === 'create' ? env.CREATE_LIMITER : kind === 'push' ? env.PUSH_LIMITER : env.LIMITER;
}

export default {
  async fetch(request, env, ctx) {
    const now = Date.now();
    countRequest(now);
    const response = await handle(request, d1Store(env.DB), {
      origins: env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
      push: d1Push(env.DB),
      allow: async (key, kind) => {
        const binding = limiter(env, kind);
        return binding ? (await binding.limit({ key: `${kind}:${key}` })).success : true;
      },
      capacity: () => capacity(env, now),
      status: () => status(env, now)
    });
    ctx.waitUntil(flush(env.DB, now).catch(() => undefined));
    return response;
  },
  async scheduled(controller, env, ctx) {
    const now = controller.scheduledTime;
    countRequest(now);
    try {
      if (controller.cron === DAILY) {
        await run(env.DB.prepare('DELETE FROM vaults WHERE updated_at < ?').bind(now - RETENTION_MS));
        await d1Push(env.DB).purgeDevices(now - PUSH_RETENTION_MS);
        // Counted once a day for the status summary, rather than on every status request.
        const [counts] = await all<{ vaults: number; devices: number }>(
          env.DB.prepare(
            'SELECT (SELECT COUNT(*) FROM vaults) AS vaults, (SELECT COUNT(*) FROM push_devices) AS devices'
          )
        );
        await flush(env.DB, now, true);
        await run(
          env.DB.prepare('UPDATE usage SET vaults = ?, push_devices = ? WHERE day = ?').bind(
            counts?.vaults ?? 0,
            counts?.devices ?? 0,
            utcDay(now)
          )
        );
        return;
      }
      if ((await capacity(env, Date.now())).state === 'full') return; // nothing more to spend until midnight UTC
      const key = await vapidKey(env);
      if (key) await deliver(d1Push(env.DB), pushSender(env, key), Date.now(), PER_RUN[planOf(env)]);
    } finally {
      ctx.waitUntil(flush(env.DB, Date.now()).catch(() => undefined));
    }
  }
} satisfies ExportedHandler<Env>;
