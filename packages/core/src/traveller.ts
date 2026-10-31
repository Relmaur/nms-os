// The Traveller Card (design 05, its back 29; components c09 and c13): one living card per player that only grows,
// and only from what they logged. Everything on it is computed here from the log, so the back can explain every part.
import { STAR_CLASSES, type StarClass, type System } from './systems-model.ts';
import { classLetter, type GearItem } from './gear.ts';
import { MILESTONE_BOOK } from './guides.ts';
import { journey, type Journey } from './map.ts';
import { loggedAt, type First } from './frontier.ts';
import type { Galaxy } from './location.ts';
import type { Note } from './notes.ts';
import type { PlayerRun } from './runs.ts';
import { seedOf } from './seed.ts';

export type CardClass = 'C' | 'B' | 'A' | 'S';

// Depth points and the class ladder (c09). A first proposal the owner kept as placeholders (2026-10-31): tune them
// here, in one place, once the app has real players.
export const DEPTH_POINTS = { system: 10, planet: 3, sclass: 15, first: 10, milestone: 5 } as const;
export const CLASS_FROM: { cls: CardClass; points: number }[] = [
  { cls: 'B', points: 200 },
  { cls: 'A', points: 600 },
  { cls: 'S', points: 1500 }
];

export const STAR_ORDER: StarClass[] = ['yellow', 'red', 'green', 'blue', 'purple'];
export type Rank = 'Traveller' | 'Pathfinder' | 'Collector' | 'Trader' | 'Scholar';

export interface TravellerCard {
  id: string; // "7F3A·21C9", seeded from the issue time
  issuedAt: number | null; // when the first thing was logged; null on day one
  updatedAt: number | null;
  trip: Journey;
  systems: number;
  galaxies: number;
  planets: number;
  gear: number;
  sclass: number;
  stars: Record<StarClass, number>;
  deepest: { regions: number; galaxy: string } | null;
  route: string[]; // the first and the latest galaxy reached
  firsts: First[];
  milestones: number;
  points: { systems: number; planets: number; sclass: number; firsts: number; milestones: number; total: number };
  cls: CardClass;
  next: { cls: CardClass; points: number } | null; // the next class and the points it starts at
  rank: { title: Rank; why: string };
}

const planetsOf = (system: System) => system.planetCount || system.planets.length;
const plural = (n: number, word: string, many = `${word}s`) => `${String(n)} ${n === 1 ? word : many}`;

export function travellerCard(
  log: {
    systems: System[];
    gear: GearItem[];
    notes: Note[];
    runs: PlayerRun[];
    checklists: Record<string, boolean>;
  },
  firsts: First[],
  galaxies: Galaxy[] | null
): TravellerCard {
  const trip = journey(log.systems, galaxies);
  const planets = log.systems.reduce((sum, system) => sum + planetsOf(system), 0);
  const sclass = log.gear.filter(item => classLetter(item.class) === 'S').length;
  const milestones = Object.keys(MILESTONE_BOOK).filter(id => log.checklists[id]).length;
  const stars = Object.fromEntries(STAR_ORDER.map(star => [star, 0])) as Record<StarClass, number>; // every key set
  for (const system of log.systems) if (system.star) stars[system.star] += 1;

  let deepest: TravellerCard['deepest'] = null;
  for (const galaxy of trip.galaxies)
    if (galaxy.deepest !== null && (!deepest || galaxy.deepest < deepest.regions))
      deepest = { regions: galaxy.deepest, galaxy: galaxy.name };

  const points = {
    systems: log.systems.length * DEPTH_POINTS.system,
    planets: planets * DEPTH_POINTS.planet,
    sclass: sclass * DEPTH_POINTS.sclass,
    firsts: firsts.length * DEPTH_POINTS.first,
    milestones: milestones * DEPTH_POINTS.milestone,
    total: 0
  };
  points.total = points.systems + points.planets + points.sclass + points.firsts + points.milestones;
  const reached = CLASS_FROM.filter(step => points.total >= step.points);
  const cls = reached.at(-1)?.cls ?? 'C';
  const next = CLASS_FROM.find(step => points.total < step.points) ?? null;

  const times = [
    ...log.systems.map(loggedAt),
    ...log.gear.map(item => Date.parse(item.createdAt)),
    ...log.notes.map(note => Date.parse(note.createdAt)),
    ...log.runs.map(run => Date.parse(run.createdAt))
  ].filter(time => Number.isFinite(time) && time > 0);
  const issuedAt = times.length ? Math.min(...times) : null;
  const updatedAt = times.length ? Math.max(...times) : null;
  const hex = issuedAt === null ? '' : seedOf('traveller', new Date(issuedAt).toISOString()).toString(16).toUpperCase();
  const id = hex ? `${hex.padStart(8, '0').slice(0, 4)}·${hex.padStart(8, '0').slice(4)}` : '····';

  const first = trip.galaxies[0]?.name;
  const latest = trip.galaxies.at(-1)?.name;
  return {
    id,
    issuedAt,
    updatedAt,
    trip,
    systems: log.systems.length,
    galaxies: trip.galaxies.length,
    planets,
    gear: log.gear.length,
    sclass,
    stars,
    deepest,
    route: first ? (latest && latest !== first ? [first, latest] : [first]) : ['Euclid'],
    firsts,
    milestones,
    points,
    cls,
    next,
    rank: rank(log, trip.galaxies.length, sclass)
  };
}

/**
 * The rank title follows what the player logs most (c09): systems and galaxies make a Pathfinder, ships and tools a
 * Collector, packet runs and their own runs a Trader, guide ticks and notes a Scholar. A log of fewer than three
 * things is a Traveller's. Ties go in that order.
 */
function rank(
  log: { systems: System[]; gear: GearItem[]; notes: Note[]; runs: PlayerRun[]; checklists: Record<string, boolean> },
  galaxies: number,
  sclass: number
): { title: Rank; why: string } {
  const packetRuns = log.systems.reduce((sum, system) => sum + system.visits.filter(visit => visit.packets).length, 0);
  const ticks = Object.values(log.checklists).filter(Boolean).length;
  if (log.systems.length + log.gear.length + log.notes.length + log.runs.length + packetRuns < 3)
    return { title: 'Traveller', why: 'Just setting out: log a few things and the card finds your style.' };
  const scores: [Rank, number, string][] = [
    [
      'Pathfinder',
      log.systems.length + 5 * Math.max(0, galaxies - 1),
      `${plural(log.systems.length, 'system')} across ${plural(galaxies, 'galaxy', 'galaxies')}.`
    ],
    [
      'Collector',
      3 * log.gear.length,
      `${plural(log.gear.length, 'ship or Multi-Tool', 'ships and Multi-Tools')}, ${String(sclass)} of them S-class.`
    ],
    [
      'Trader',
      packetRuns + 3 * log.runs.length,
      `${plural(packetRuns, 'packet run')} and ${plural(log.runs.length, 'run')} of your own.`
    ],
    ['Scholar', ticks + 2 * log.notes.length, `${plural(ticks, 'guide tick')} and ${plural(log.notes.length, 'note')}.`]
  ];
  const [title, , why] = scores.reduce((best, entry) => (entry[1] > best[1] ? entry : best));
  return { title, why: `What you log most: ${why}` };
}

/** "531,000 ly" and how far in from the rim, as a share of the disc's radius (c13). */
export function deepestReading(regions: number, lyPerRegion: number): { ly: string; inward: number } {
  const ly = regions * lyPerRegion;
  const rim = 0x7ff * lyPerRegion;
  return {
    ly:
      ly >= 10000
        ? `${Math.round(ly / 1000).toLocaleString('en')},000 ly`
        : `${Math.round(ly).toLocaleString('en')} ly`,
    inward: Math.max(0, Math.min(100, (1 - ly / rim) * 100))
  };
}

export const STAR_COLOUR = (star: StarClass) => STAR_CLASSES[star].color;
