// The Cloudflare Worker: the handler over D1, a per-client rate limit, and a daily purge of vaults nobody has
// synced for a year (ADR-0005).
import { handle, type Vault, type VaultStore } from './handler.ts';

interface Env {
  DB: D1Database;
  LIMITER?: RateLimit;
  ALLOWED_ORIGINS: string;
}

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

export default {
  fetch(request, env) {
    const limiter = env.LIMITER;
    return handle(request, d1Store(env.DB), {
      origins: env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
      ...(limiter && { allow: async key => (await limiter.limit({ key })).success })
    });
  },
  async scheduled(controller, env) {
    await env.DB.prepare('DELETE FROM vaults WHERE updated_at < ?')
      .bind(controller.scheduledTime - RETENTION_MS)
      .run();
  }
} satisfies ExportedHandler<Env>;
