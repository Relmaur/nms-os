// The Map (designs 30 and 31; component c10): where the player's systems really are. A portal address is a position
// (P SSS YY ZZZ XXX, the galaxy's centre at 0,0,0), so every system logged with one is drawn at its true place round
// its galaxy's core; one without an address is counted, never placed. In the game the next galaxy is reached by
// travelling to the centre of the one you're in, so galaxies come in the wiki's order and the chain grows one way.
// Pure: the log and the wiki's galaxy list in, positions out; the same log draws the same map on every device.
import { parsePortal, regionsFromCentre, type Galaxy, type Voxel } from './location.ts';
import { Rng, seedOf } from './seed.ts';
import type { System } from './systems-model.ts';

/** A portal coordinate runs ±0x7FF regions from the centre on X and Z: the disc's edge along an axis. */
export const RIM_REGIONS = 0x7ff;

export interface PlacedSystem {
  system: System;
  voxel: Voxel;
  angle: number; // round the core in the galaxy's plane: atan2(Z, X)
  reach: number; // 0 at the centre, 1 at the rim
  regions: number; // straight-line regions from the centre (height included)
}

export interface GalaxyJourney {
  name: string;
  n: number | null; // the wiki's number for it (Euclid 1 … 256), when the name is one of the 256
  type: string; // Norm, Lush, Harsh, Empty, or '' when the wiki doesn't say
  path: string; // its Codex page, or ''
  placed: PlacedSystem[]; // in the order they were logged
  unplaced: number; // systems here without a portal address
  deepest: number | null; // the fewest regions from the centre any of its systems is
}

export interface Journey {
  galaxies: GalaxyJourney[]; // in the order first reached
  here: number; // index of the galaxy of the player's latest activity, or -1 with nothing logged
  placed: number;
  unplaced: number;
}

// When a system entered the player's story: logged, or first visited if a visit is older.
const firstSeen = (system: System) =>
  Math.min(Date.parse(system.createdAt) || Infinity, ...system.visits.map(visit => Date.parse(visit.at) || Infinity));
const lastSeen = (system: System) =>
  Math.max(Date.parse(system.createdAt) || 0, ...system.visits.map(visit => Date.parse(visit.at) || 0));

export function placeSystem(system: System): PlacedSystem | null {
  const voxel = parsePortal(system.glyphs);
  if (!voxel) return null;
  return {
    system,
    voxel,
    angle: Math.atan2(voxel.z, voxel.x),
    reach: Math.min(1, Math.hypot(voxel.x, voxel.z) / RIM_REGIONS),
    regions: regionsFromCentre(voxel)
  };
}

export function journey(systems: System[], galaxies: Galaxy[] | null): Journey {
  const order = [...systems].sort((a, b) => firstSeen(a) - firstSeen(b) || a.name.localeCompare(b.name));
  const byName = new Map<string, GalaxyJourney>();
  for (const system of order) {
    const name = system.galaxy.trim() || 'Euclid';
    const key = name.toLowerCase();
    let entry = byName.get(key);
    if (!entry) {
      const wiki = galaxies?.find(galaxy => galaxy.name.toLowerCase() === key);
      entry = {
        name: wiki?.name ?? name,
        n: wiki?.n ?? null,
        type: wiki?.type ?? '',
        path: wiki?.path ?? '',
        placed: [],
        unplaced: 0,
        deepest: null
      };
      byName.set(key, entry);
    }
    const placed = placeSystem(system);
    if (placed) {
      entry.placed.push(placed);
      entry.deepest = Math.min(entry.deepest ?? Infinity, placed.regions);
    } else entry.unplaced += 1;
  }
  const list = [...byName.values()];
  const latest = [...systems].sort((a, b) => lastSeen(b) - lastSeen(a))[0];
  const here = latest
    ? list.findIndex(g => g.name.toLowerCase() === (latest.galaxy.trim() || 'Euclid').toLowerCase())
    : -1;
  return {
    galaxies: list,
    here,
    placed: list.reduce((sum, g) => sum + g.placed.length, 0),
    unplaced: list.reduce((sum, g) => sum + g.unplaced, 0)
  };
}

/** The galaxies after the one the player is in, by the wiki's numbering, that they haven't reached yet. */
export function nextGalaxies(trip: Journey, galaxies: Galaxy[] | null, count = 2): Galaxy[] {
  const n = trip.galaxies[trip.here]?.n;
  if (!galaxies || !n) return [];
  const reached = new Set(trip.galaxies.map(g => g.n));
  return galaxies
    .filter(galaxy => galaxy.n > n && !reached.has(galaxy.n))
    .sort((a, b) => a.n - b.n)
    .slice(0, count);
}

// The Traveller Card's palette (c11): a galaxy's colour by order of arrival, cyan → violet → rose → amber, so time
// reads as colour. One galaxy is cyan.
const TIDE = ['#67e8f9', '#a78bfa', '#f472b6', '#fbbf24'];
export function tide(index: number, count: number): string {
  if (count <= 1) return TIDE[0] ?? '#67e8f9';
  const t = (index / (count - 1)) * (TIDE.length - 1);
  const i = Math.min(Math.floor(t), TIDE.length - 2);
  const f = t - i;
  const rgb = (hex: string) => [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16));
  const a = rgb(TIDE[i] ?? '#000000');
  const b = rgb(TIDE[i + 1] ?? '#000000');
  return `#${a
    .map((v, k) =>
      Math.round(v + ((b[k] ?? 0) - v) * f)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

// Spiral arms by the wiki's galaxy type: a drawn glyph, not a map of the galaxy.
const ARMS: Record<string, number> = { Norm: 4, Lush: 5, Harsh: 2, Empty: 3 };

/** A galaxy's spiral glyph as dots in a unit disc (radius 1), seeded by its name. */
export function spiralDots(
  name: string,
  type: string,
  count: number
): { x: number; y: number; r: number; o: number }[] {
  const arms = ARMS[type] ?? 4;
  const rng = new Rng(seedOf(name));
  return Array.from({ length: count }, (_, k) => {
    const t = rng.next() ** 0.7;
    const th = ((k % arms) * 2 * Math.PI) / arms + t * 3.4 + rng.range(-0.35, 0.35) * (1 - t * 0.5);
    return { x: t * Math.cos(th), y: t * Math.sin(th), r: rng.range(0.3, 0.9), o: 1 - t * 0.6 };
  });
}

/**
 * One galaxy's view (31): the player's cluster magnified to fill a square of `size`, true shape kept. Returns where
 * each system lands, where the (usually off-screen) core lands, and the cluster's centre and span in rim units for
 * the locator. A lone system gets a minimum span, so it isn't zoomed to nothing.
 */
export function clusterView(placed: PlacedSystem[], size: number) {
  const xs = placed.map(p => p.voxel.x);
  const zs = placed.map(p => p.voxel.z);
  const mx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
  const mz = zs.length ? (Math.min(...zs) + Math.max(...zs)) / 2 : 0;
  const span = Math.max(
    xs.length ? Math.max(...xs) - Math.min(...xs) : 0,
    zs.length ? Math.max(...zs) - Math.min(...zs) : 0,
    40
  );
  const scale = (size * 0.78) / span;
  const at = (x: number, z: number) => ({ x: size / 2 + (x - mx) * scale, y: size / 2 + (z - mz) * scale });
  return {
    points: placed.map(p => at(p.voxel.x, p.voxel.z)),
    core: at(0, 0),
    scale, // view units per region
    centre: { x: mx / RIM_REGIONS, y: mz / RIM_REGIONS },
    span: span / RIM_REGIONS
  };
}

/** "197,000 ly" for the galaxy list; under 10,000 to the light year. */
export function lightYearsLong(regions: number, lyPerRegion: number): string {
  const ly = regions * lyPerRegion;
  return ly >= 10000
    ? `${Math.round(ly / 1000).toLocaleString('en')},000 ly`
    : `${Math.round(ly).toLocaleString('en')} ly`;
}

/** "1st", "2nd", "23rd". */
export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${String(n)}${suffix}`;
}
