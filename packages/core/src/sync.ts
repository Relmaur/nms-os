// Merging two copies of the log for sync (ADR-0005): a three-way merge against the copy both devices last agreed on,
// so a change made on either side survives and a deletion is told apart from a record the other side never had,
// without tombstones or per-record timestamps in the state.
import { isPlainObject } from './util.ts';
import { stateTimestamp } from './state.ts';
import { gearFromFleet } from './gear.ts';

// Lists of records are matched by the first of these each item carries, unique within every copy: systems, planets
// and timers by id, visits by when they happened, past sessions by when they started.
const RECORD_KEYS = ['id', 'at', 'startedAt'] as const;

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  const keys = Object.keys(a).filter(key => a[key] !== undefined);
  if (keys.length !== Object.keys(b).filter(key => b[key] !== undefined).length) return false;
  return keys.every(key => Object.hasOwn(b, key) && deepEqual(a[key], b[key]));
}

// `base` is the last synced copy (undefined on a first pairing: then nothing counts as deleted and both logs are
// combined). A value both sides changed differently goes to the copy saved last.
// Save times are clamped to `now`, in the comparison and in the result: a copy stamped in the future (a wrong clock,
// or a crafted copy) would otherwise win every clash from then on.
export function mergeStates(base: unknown, local: unknown, remote: unknown, now = Date.now()): Record<string, unknown> {
  const localWins = Math.min(stateTimestamp(local), now) >= Math.min(stateTimestamp(remote), now);
  const merged = merge3(upgradeBase(base), local, remote, localWins);
  if (!isPlainObject(merged)) return {};
  // The result carries no future save time either, so after one merge clashes are judged fairly again.
  if (stateTimestamp(merged) > now && isPlainObject(merged.meta))
    merged.meta = { ...merged.meta, lastUpdated: new Date(now).toISOString() };
  return merged;
}

// A base saved by an older build lacks keys that both sides now derive on load. Giving it the same migration keeps a
// record deleted on one side from reading as "new on the other" (3.14.0: gear from the old fleet notes).
function upgradeBase(base: unknown): unknown {
  if (!isPlainObject(base) || (base.gear !== undefined && base.gear !== null)) return base;
  return { ...base, gear: gearFromFleet(base.fleet) };
}

function merge3(base: unknown, local: unknown, remote: unknown, localWins: boolean): unknown {
  if (deepEqual(local, remote)) return local;
  if (base !== undefined && deepEqual(base, local)) return remote;
  if (base !== undefined && deepEqual(base, remote)) return local;
  if (isPlainObject(local) && isPlainObject(remote)) return mergeObjects(base, local, remote, localWins);
  if (Array.isArray(local) && Array.isArray(remote)) {
    const baseList = Array.isArray(base) ? base : [];
    if ([baseList, local, remote].every(list => list.every(item => typeof item === 'string')))
      return mergeSets(baseList as string[], local as string[], remote as string[]);
    const key = recordKey(baseList, local, remote);
    if (key) return mergeRecords(key, baseList, local, remote, localWins);
  }
  return localWins ? local : remote;
}

function mergeObjects(
  base: unknown,
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
  localWins: boolean
): Record<string, unknown> {
  const baseObject = isPlainObject(base) ? base : {};
  const merged: Record<string, unknown> = {};
  // Own keys only: `key in` and a plain read would find "constructor" or "toString" on every object's prototype.
  const own = (object: Record<string, unknown>, key: string) => (Object.hasOwn(object, key) ? object[key] : undefined);
  for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    if (key === '__proto__') continue; // JSON.parse makes it an own key; assigning it would swap the prototype
    const value =
      Object.hasOwn(local, key) && Object.hasOwn(remote, key)
        ? merge3(own(baseObject, key), local[key], remote[key], localWins)
        : mergeOneSided(own(baseObject, key), Object.hasOwn(local, key) ? local[key] : remote[key]);
    if (value !== undefined) merged[key] = value;
  }
  return merged;
}

// A key or record only one side has: new on that side (keep it), or removed by the other side. A removal wins
// over an untouched copy; an edit wins over a removal, so nothing typed since the last sync is lost.
function mergeOneSided(base: unknown, kept: unknown): unknown {
  return base !== undefined && deepEqual(base, kept) ? undefined : kept;
}

// Three-way set merge (tags): an addition on either side is kept, and so is a removal.
function mergeSets(base: string[], local: string[], remote: string[]): string[] {
  const inBase = new Set(base);
  const inRemote = new Set(remote);
  const inLocal = new Set(local);
  return [
    ...local.filter(item => inRemote.has(item) || !inBase.has(item)),
    ...remote.filter(item => !inLocal.has(item) && !inBase.has(item))
  ];
}

function recordKey(...lists: unknown[][]): string | null {
  return (
    RECORD_KEYS.find(key =>
      lists.every(list => {
        const keys = list.map(item => (isPlainObject(item) ? item[key] : undefined));
        return keys.every(value => typeof value === 'string') && new Set(keys).size === keys.length;
      })
    ) ?? null
  );
}

// Records keep the local order; ones only the other side has follow, in its order.
function mergeRecords(
  key: string,
  base: unknown[],
  local: unknown[],
  remote: unknown[],
  localWins: boolean
): unknown[] {
  const index = (list: unknown[]) =>
    new Map(list.filter(isPlainObject).map(item => [item[key] as string, item] as const));
  const [baseById, localById, remoteById] = [index(base), index(local), index(remote)];
  const merged: unknown[] = [];
  for (const [id, item] of localById) {
    const value = remoteById.has(id)
      ? merge3(baseById.get(id), item, remoteById.get(id), localWins)
      : mergeOneSided(baseById.get(id), item);
    if (value !== undefined) merged.push(value);
  }
  for (const [id, item] of remoteById) {
    if (localById.has(id)) continue;
    const value = mergeOneSided(baseById.get(id), item);
    if (value !== undefined) merged.push(value);
  }
  return merged;
}

// What a merge would take away from this device: the guard against a copy that empties the log (a damaged or crafted
// copy) asks before adopting one that removes more than 10 records, or more than 20% of them (at least 3: deleting one
// of two notes on the other device shouldn't need a confirmation). A removed system counts once; its planets and
// visits count only when the system itself stays.
export interface Removal {
  systems: number;
  planets: number;
  visits: number;
  gear: number;
  notes: number;
  total: number;
  before: number;
}

function records(state: unknown): Map<string, string> {
  const found = new Map<string, string>(); // record key → kind
  if (!isPlainObject(state)) return found;
  const add = (list: unknown, kind: string, key: string, prefix = '') => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!isPlainObject(item)) continue;
      const id = item[key];
      if (typeof id === 'string' || typeof id === 'number') found.set(`${prefix}${kind}:${String(id)}`, kind);
      if (kind === 'systems') {
        add(item.planets, 'planets', 'id', `systems:${String(id)}/`);
        add(item.visits, 'visits', 'at', `systems:${String(id)}/`);
      }
    }
  };
  add(state.systems, 'systems', 'id');
  add(state.gear, 'gear', 'id');
  add(state.notes, 'notes', 'id');
  return found;
}

export function removalReport(before: unknown, after: unknown): Removal {
  const old = records(before);
  const kept = records(after);
  const report: Removal = { systems: 0, planets: 0, visits: 0, gear: 0, notes: 0, total: 0, before: old.size };
  for (const [key, kind] of old) {
    if (kept.has(key)) continue;
    const parent = key.includes('/') ? key.slice(0, key.indexOf('/')) : null;
    if (parent && !kept.has(parent)) continue; // inside a removed system, which already counts
    report[kind as 'systems' | 'planets' | 'visits' | 'gear' | 'notes'] += 1;
    report.total += 1;
  }
  return report;
}

export function needsConfirmation(removal: Removal): boolean {
  return removal.total > 10 || (removal.total >= 3 && removal.total > removal.before * 0.2);
}
