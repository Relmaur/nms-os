// Firsts (design 26, Frontier; stamps on the Traveller Card, 05): the first time the log holds something new of a
// kind the game has a fixed set of. Each one is dated by the record that earned it, so the card can show the newest.
// Only logged facts count: a star colour, a biome family (by the wiki's cited rules), a race met, a galaxy beyond the
// first, an S-class ship or tool, a starship type.
import type { BiomeFamily } from './facts.ts';
import { classLetter, type GearItem } from './gear.ts';
import { RACES, STAR_CLASSES, type System } from './systems-model.ts';

export interface First {
  key: string; // 'star:purple', 'biome:frozen', 'race:korvax', 'galaxy:calypso', 's-class', 'ship:interceptor'
  label: string; // as the stamp reads: "First purple star"
  at: number; // when the record that earned it was logged (ms)
}

// The races a system can be run by; Uncharted and Abandoned systems meet no one.
const PEOPLES = ['gek', 'korvax', 'vykeen'] as const;
export const FAMILY_LABEL: Record<BiomeFamily, string> = {
  lush: 'lush',
  hot: 'hot',
  frozen: 'frozen',
  toxic: 'toxic',
  radioactive: 'radioactive',
  exotic: 'exotic'
};

/** When a system entered the log: created, or first visited if a visit is older. */
export function loggedAt(system: Pick<System, 'createdAt' | 'visits'>): number {
  const times = [system.createdAt, ...system.visits.map(visit => visit.at)]
    .map(value => Date.parse(value))
    .filter(Number.isFinite);
  return times.length ? Math.min(...times) : 0;
}

/** Every first in the log, newest first. `family` maps a planet's biome to its family (from the cited facts). */
export function firsts(
  log: { systems: System[]; gear: GearItem[] },
  family: (biome: string) => BiomeFamily | null
): First[] {
  const found = new Map<string, First>();
  const earn = (key: string, label: string, at: number) => {
    const held = found.get(key);
    if (!held || at < held.at) found.set(key, { key, label, at });
  };
  const systems = [...log.systems].sort((a, b) => loggedAt(a) - loggedAt(b));
  const firstGalaxy = (systems[0]?.galaxy.trim() || 'Euclid').toLowerCase();
  for (const system of systems) {
    const at = loggedAt(system);
    if (system.star) earn(`star:${system.star}`, `First ${STAR_CLASSES[system.star].label.toLowerCase()} star`, at);
    if ((PEOPLES as readonly string[]).includes(system.race) && system.race)
      earn(`race:${system.race}`, `Met the ${RACES[system.race]}`, at);
    const galaxy = system.galaxy.trim() || 'Euclid';
    if (galaxy.toLowerCase() !== firstGalaxy) earn(`galaxy:${galaxy.toLowerCase()}`, galaxy, at);
    for (const planet of system.planets) {
      const kind = family(planet.biome);
      if (kind) earn(`biome:${kind}`, `First ${FAMILY_LABEL[kind]} world`, at);
    }
  }
  for (const item of log.gear) {
    const at = Date.parse(item.createdAt) || 0;
    if (classLetter(item.class) === 'S') earn('s-class', 'First S-class', at);
    const type = item.type.trim();
    if (item.kind === 'starship' && type) earn(`ship:${type.toLowerCase()}`, `First ${type}`, at);
  }
  return [...found.values()].sort((a, b) => b.at - a.at || a.label.localeCompare(b.label));
}
