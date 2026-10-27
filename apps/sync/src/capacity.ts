// The relay's guardrails on Cloudflare's plans (ADR-0005, ADR-0006): what a day may use, when the relay stops taking
// new players (busy) or answers everyone "full until midnight UTC" before Cloudflare's own hard stop, how clients
// are keyed for rate limits, and how request bodies are capped while they stream in.

export type Plan = 'free' | 'paid';
export type CapacityState = 'ok' | 'busy' | 'full';

export interface DayUsage {
  requests: number;
  rowsRead: number;
  rowsWritten: number;
}

// Workers Free: 100k requests a day; D1 Free: 5M rows read and 100k rows written a day, 500 MB per database. Paid has
// no daily caps (usage is billed past the monthly allowance), so only its 10 GB database size can fill.
export const LIMITS: Record<Plan, DayUsage & { bytes: number }> = {
  free: { requests: 100_000, rowsRead: 5_000_000, rowsWritten: 100_000, bytes: 500 * 1024 * 1024 },
  paid: { requests: Infinity, rowsRead: Infinity, rowsWritten: Infinity, bytes: 10 * 1024 * 1024 * 1024 }
};
export const BUSY_AT = 0.8; // no new vaults or push devices; everyone already here carries on
export const FULL_AT = 0.95; // everyone gets a clear "full until midnight UTC", before Cloudflare's hard stop
export const STORAGE_FULL_AT = 0.9; // no new vaults until the purge or an upgrade frees room

// The largest share of any daily limit used so far (0…1+).
export function usedShare(usage: DayUsage, plan: Plan): number {
  const limit = LIMITS[plan];
  return Math.max(
    usage.requests / limit.requests,
    usage.rowsRead / limit.rowsRead,
    usage.rowsWritten / limit.rowsWritten
  );
}

export function capacityState(usage: DayUsage, plan: Plan): CapacityState {
  const share = usedShare(usage, plan);
  return share >= FULL_AT ? 'full' : share >= BUSY_AT ? 'busy' : 'ok';
}

export function storageFull(bytes: number, plan: Plan): boolean {
  return bytes >= LIMITS[plan].bytes * STORAGE_FULL_AT;
}

// Daily limits reset at 00:00 UTC.
export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}
export function secondsToMidnightUtc(now: number): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((next.getTime() - now) / 1000));
}

// A rate-limit key per client: the IPv4 address, or the /64 prefix of an IPv6 one (a single home or server is given
// a whole /64, so keying on full addresses would hand one client endless keys).
export function clientKey(ip: string): string {
  if (!ip.includes(':')) return ip;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip); // an IPv4 address written as IPv6
  if (mapped?.[1]) return mapped[1];
  const [head = '', tail = ''] = ip.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const groups = ip.includes('::')
    ? [...left, ...Array<string>(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right]
    : left;
  return `${groups
    .slice(0, 4)
    .map(group => parseInt(group || '0', 16).toString(16))
    .join(':')}::/64`;
}

// Reads a request body up to `max` bytes, whatever its Content-Length says (or doesn't). null: too large.
export async function readCapped(request: Request, max: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (Number(request.headers.get('Content-Length') ?? 0) > max) return null;
  if (!request.body) return new Uint8Array(0);
  // A request body is a byte stream; the Workers types leave its chunks untyped.
  const reader = request.body.getReader() as ReadableStreamDefaultReader<Uint8Array>;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
