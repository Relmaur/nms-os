// The Cloudflare Worker: the handler over D1, a per-client rate limit, a minute cron that sends due timer pushes
// (ADR-0006), and a daily purge of vaults unused for a year (ADR-0005) and push devices silent for 60 days.
import { buildPushHTTPRequest } from '@pushforge/builder';
import { handle, type Vault, type VaultStore } from './handler.ts';
import { deliver, sendResult, type PushStore, type SendResult, type Subscription } from './push.ts';

interface Env {
  DB: D1Database;
  LIMITER?: RateLimit;
  ALLOWED_ORIGINS: string;
  VAPID_SUBJECT: string;
  VAPID_PRIVATE_JWK?: string; // a Wrangler secret; without it the cron sends nothing
}

const DAILY = '23 4 * * *';
const PUSH_RETENTION_MS = 60 * 24 * 3_600_000;
const PUSH_TIMEOUT_MS = 5_000;

const DAY_MS = 24 * 3_600_000;
const RETENTION_MS = 365 * DAY_MS;

function d1Store(db: D1Database): VaultStore {
  return {
    async get(id) {
      const row = await db
        .prepare('SELECT token_hash, version, blob FROM vaults WHERE id = ?')
        .bind(id)
        .first<{ token_hash: string; version: number; blob: ArrayBuffer | number[] }>();
      if (!row) return null;
      // D1 returns a BLOB column as an ArrayBuffer or, in local development, as an array of bytes.
      const vault: Vault = { tokenHash: row.token_hash, version: row.version, blob: new Uint8Array(row.blob) };
      return vault;
    },
    async create(id, tokenHash, blob, now) {
      const result = await db
        .prepare(
          'INSERT INTO vaults (id, token_hash, version, blob, updated_at) VALUES (?, ?, 1, ?, ?) ON CONFLICT(id) DO NOTHING'
        )
        .bind(id, tokenHash, blob, now)
        .run();
      return result.meta.changes === 1;
    },
    async update(id, version, blob, now) {
      const result = await db
        .prepare('UPDATE vaults SET blob = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?')
        .bind(blob, now, id, version)
        .run();
      return result.meta.changes === 1;
    },
    async remove(id) {
      await db.prepare('DELETE FROM vaults WHERE id = ?').bind(id).run();
    },
    async touch(id, now) {
      // At most one write a day per vault, however often devices pull.
      await db
        .prepare('UPDATE vaults SET updated_at = ? WHERE id = ? AND updated_at < ?')
        .bind(now, id, now - DAY_MS)
        .run();
    }
  };
}

function d1Push(db: D1Database): PushStore {
  return {
    async deviceToken(id) {
      const row = await db
        .prepare('SELECT token_hash FROM push_devices WHERE id = ?')
        .bind(id)
        .first<{ token_hash: string }>();
      return row?.token_hash ?? null;
    },
    async saveDevice(id, tokenHash, subscription, timers, now) {
      await db.batch([
        db
          .prepare(
            'INSERT INTO push_devices (id, token_hash, subscription, updated_at) VALUES (?, ?, ?, ?) ' +
              'ON CONFLICT(id) DO UPDATE SET subscription = excluded.subscription, updated_at = excluded.updated_at'
          )
          .bind(id, tokenHash, subscription, now),
        // Timers no longer listed go; listed ones keep their claim, so re-sending a schedule can't jump the queue.
        db
          .prepare(
            `DELETE FROM push_due WHERE device_id = ? AND timer_id NOT IN (${timers.map(() => '?').join(', ') || "''"})`
          )
          .bind(id, ...timers.map(timer => timer.id)),
        ...timers.map(timer =>
          db
            .prepare(
              'INSERT INTO push_due (device_id, timer_id, at, next_try) VALUES (?, ?, ?, ?) ' +
                'ON CONFLICT(device_id, timer_id) DO UPDATE SET ' +
                'next_try = CASE WHEN excluded.at = push_due.at THEN push_due.next_try ELSE MAX(excluded.at, ?) END, ' +
                'at = excluded.at'
            )
            .bind(id, timer.id, timer.at, timer.at, now)
        )
      ]);
    },
    async removeDevice(id) {
      await db.batch([
        db.prepare('DELETE FROM push_due WHERE device_id = ?').bind(id),
        db.prepare('DELETE FROM push_devices WHERE id = ?').bind(id)
      ]);
    },
    async due(now, limit, perDevice) {
      const { results } = await db
        .prepare(
          'SELECT d.device_id, d.timer_id, d.at, p.subscription FROM (' +
            'SELECT device_id, timer_id, at, next_try, ' +
            'ROW_NUMBER() OVER (PARTITION BY device_id ORDER BY next_try) AS n FROM push_due WHERE next_try <= ?' +
            ') d JOIN push_devices p ON p.id = d.device_id WHERE d.n <= ? ORDER BY d.next_try LIMIT ?'
        )
        .bind(now, perDevice, limit)
        .all<{ device_id: string; timer_id: string; at: number; subscription: string }>();
      return results.map(row => ({
        deviceId: row.device_id,
        timerId: row.timer_id,
        at: row.at,
        subscription: row.subscription
      }));
    },
    async claim(rows, until) {
      if (!rows.length) return;
      await db.batch(
        rows.map(row =>
          db
            .prepare('UPDATE push_due SET next_try = ? WHERE device_id = ? AND timer_id = ?')
            .bind(until, row.deviceId, row.timerId)
        )
      );
    },
    async sent(deviceId, timerId) {
      await db.prepare('DELETE FROM push_due WHERE device_id = ? AND timer_id = ?').bind(deviceId, timerId).run();
    },
    async purgeDevices(before) {
      await db.batch([
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
function pushSender(env: Env & { VAPID_PRIVATE_JWK: string }) {
  return async (subscription: Subscription, timerId: string): Promise<SendResult> => {
    let request: Awaited<ReturnType<typeof buildPushHTTPRequest>>;
    try {
      request = await buildPushHTTPRequest({
        privateJWK: env.VAPID_PRIVATE_JWK,
        subscription,
        message: {
          payload: { t: timerId },
          adminContact: env.VAPID_SUBJECT,
          options: { ttl: 3600, urgency: 'high' }
        }
      });
    } catch {
      return 'failed'; // keys it can't encrypt to: retrying won't help
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

export default {
  fetch(request, env) {
    const limiter = env.LIMITER;
    return handle(request, d1Store(env.DB), {
      origins: env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
      push: d1Push(env.DB),
      ...(limiter && { allow: async key => (await limiter.limit({ key })).success })
    });
  },
  async scheduled(controller, env) {
    const now = controller.scheduledTime;
    if (controller.cron === DAILY) {
      await env.DB.prepare('DELETE FROM vaults WHERE updated_at < ?')
        .bind(now - RETENTION_MS)
        .run();
      await d1Push(env.DB).purgeDevices(now - PUSH_RETENTION_MS);
      return;
    }
    const key = env.VAPID_PRIVATE_JWK;
    if (key) await deliver(d1Push(env.DB), pushSender({ ...env, VAPID_PRIVATE_JWK: key }), Date.now());
  }
} satisfies ExportedHandler<Env>;
