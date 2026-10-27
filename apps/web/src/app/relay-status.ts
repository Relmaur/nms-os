// What the relay last said about its capacity (apps/sync/src/capacity.ts), shared by sync and push alerts. On Cloudflare's
// free plan it can fill up for the day: then it answers 503 { capacity: 'full' } with Retry-After (midnight UTC), and
// this device stops calling it until then, so it doesn't spend the allowance everyone is waiting on. 'busy' only
// turns away new vaults and push devices. The pause survives reloads; a manual "Sync now" may still try.
import { useSyncExternalStore } from 'react';
import { isPlainObject } from '@atlas/core/util';

export type RelayCapacity = 'busy' | 'full';
export interface RelayStatus {
  capacity: RelayCapacity | null;
  until: number | null; // when the relay said to come back (ms)
}

const PAUSE_KEY = 'nms_master_os_relay_pause'; // { capacity, until }: this device only
const MAX_PAUSE_MS = 24 * 3_600_000;

function read(): RelayStatus {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(PAUSE_KEY) ?? 'null');
    if (
      isPlainObject(saved) &&
      (saved.capacity === 'busy' || saved.capacity === 'full') &&
      typeof saved.until === 'number' &&
      saved.until > Date.now()
    )
      return { capacity: saved.capacity, until: saved.until };
  } catch {}
  return { capacity: null, until: null };
}

const CLEAR: RelayStatus = { capacity: null, until: null };
const JITTER_MS = 10 * 60_000; // so paused devices don't all come back at the same second
let status: RelayStatus = CLEAR;
const listeners = new Set<() => void>();
let expiry: ReturnType<typeof setTimeout> | undefined;
function set(next: RelayStatus): void {
  status = next;
  try {
    if (next.capacity) localStorage.setItem(PAUSE_KEY, JSON.stringify(next));
    else localStorage.removeItem(PAUSE_KEY);
  } catch {}
  clearTimeout(expiry);
  if (next.until !== null)
    expiry = setTimeout(
      () => {
        set(CLEAR);
      },
      Math.max(0, next.until - Date.now())
    );
  listeners.forEach(listener => {
    listener();
  });
}
set(read());

// Pure (React reads it while rendering): a pause that has run out reads as clear; its timer tells listeners.
export function relayStatus(): RelayStatus {
  return status.until !== null && status.until <= Date.now() ? CLEAR : status;
}
export function useRelayStatus(): RelayStatus {
  return useSyncExternalStore(listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, relayStatus);
}

// Automatic syncs and push sends wait while the relay is full, or while it's turning this device away as new (busy
// is only ever said to a device that's joining), so neither spends the allowance it's waiting on.
export function relayPaused(): boolean {
  return relayStatus().capacity !== null;
}

// Reads a relay answer: returns the capacity it reported (and remembers it), or null for any other response.
export async function readCapacity(response: Response): Promise<RelayCapacity | null> {
  if (response.status !== 503) {
    if (response.ok && status.capacity) set(CLEAR); // it's back
    return null;
  }
  let body: unknown = null;
  try {
    body = await response.clone().json();
  } catch {}
  const capacity = isPlainObject(body) ? body.capacity : null;
  if (capacity !== 'busy' && capacity !== 'full') return null; // 'unavailable': a plain server problem
  const seconds = Number(response.headers.get('Retry-After'));
  const wait = Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, MAX_PAUSE_MS) : 3_600_000;
  set({ capacity, until: Date.now() + wait + Math.round(Math.random() * JITTER_MS) });
  return capacity;
}

// "after 6:00 PM": when the relay's day resets, in the player's own time.
export function untilText(until: number | null): string {
  if (until === null) return 'midnight UTC';
  return new Date(until).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function clearRelayStatusForTests(): void {
  set(CLEAR);
}
