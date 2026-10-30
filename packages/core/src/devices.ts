// The devices that sync this log (state key `devices`, docs/state-schema.md): each one writes its own name and when it
// last synced into the log itself, so the list travels inside the encrypted copy and the relay learns nothing new
// (ADR-0005). It's a record, not a control: every device shares one code, so none can be revoked on its own.
import { SAFE_ID, isPlainObject } from './util.ts';

export interface SyncDevice {
  id: string;
  name: string; // "iPhone · Safari", from the device's own browser
  lastSync: string; // ISO time
}

export const MAX_DEVICES = 20;
const MAX_NAME = 60;
// A sync every few minutes would otherwise change the log each time, and every other device would pull it back.
export const STAMP_EVERY_MS = 60 * 60 * 1000;

export function normalizeDevices(value: unknown): SyncDevice[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const devices: SyncDevice[] = [];
  for (const item of value) {
    if (!isPlainObject(item)) continue;
    const { id, name, lastSync } = item;
    if (typeof id !== 'string' || !SAFE_ID.test(id) || seen.has(id)) continue;
    if (typeof lastSync !== 'string' || Number.isNaN(Date.parse(lastSync))) continue;
    seen.add(id);
    devices.push({ id, name: typeof name === 'string' ? name.trim().slice(0, MAX_NAME) : '', lastSync });
  }
  return devices.slice(0, MAX_DEVICES);
}

/**
 * This device's entry brought up to date, or null when it already is (same name, stamped within the hour). The rest
 * of the list is left alone; the oldest entries make room when the list is full.
 */
export function stampDevice(devices: SyncDevice[], me: { id: string; name: string }, now: number): SyncDevice[] | null {
  const mine = devices.find(device => device.id === me.id);
  if (mine && mine.name === me.name && now - Date.parse(mine.lastSync) < STAMP_EVERY_MS) return null;
  const entry = { id: me.id, name: me.name, lastSync: new Date(now).toISOString() };
  const list = mine ? devices.map(device => (device.id === me.id ? entry : device)) : [entry, ...devices];
  if (list.length <= MAX_DEVICES) return list;
  const oldest = new Set(
    devices
      .filter(device => device.id !== me.id)
      .sort((a, b) => Date.parse(a.lastSync) - Date.parse(b.lastSync))
      .slice(0, list.length - MAX_DEVICES)
      .map(device => device.id)
  );
  return list.filter(device => !oldest.has(device.id));
}

/** A name a player can recognise, from the browser's own description of itself: "iPhone · Safari", "Windows · Chrome". */
export function deviceName(userAgent: string, standalone = false): string {
  const ua = userAgent;
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua))
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Macintosh|Mac OS X/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : /CrOS/.test(ua)
              ? 'Chromebook'
              : /Linux/.test(ua)
                ? 'Linux'
                : 'Device';
  if (standalone) return `${os} · app`;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\/|FxiOS/.test(ua)
      ? 'Firefox'
      : /Chrome\/|CriOS/.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : '';
  return browser ? `${os} · ${browser}` : os;
}
