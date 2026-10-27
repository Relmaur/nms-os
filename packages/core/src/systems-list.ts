// What the Systems screen shows (pure): the filtered, sorted list, the tag cloud and the summary lines, plus the
// Outlaw Run's "Paste a list" parser.
import {
  CONFLICT_LEVELS,
  OUTLAW_TAG,
  RACES,
  SORTS,
  SUGGESTED_TAGS,
  lastVisit,
  normalizeGlyphs,
  systemHaystack,
  systemTags,
  type ConflictLevel,
  type Race,
  type StarClass,
  type System
} from './systems-model.ts';

export type SystemSort = keyof typeof SORTS;
export interface SystemFilter {
  q: string;
  tags: string[];
  star: StarClass | '';
  race: Race | '';
  conflict: ConflictLevel | '';
  favorites: boolean;
  sort: SystemSort;
}
export const DEFAULT_FILTER: SystemFilter = {
  q: '',
  tags: [],
  star: '',
  race: '',
  conflict: '',
  favorites: false,
  sort: 'recent'
};

const lastAt = (system: System) => Date.parse(lastVisit(system)?.at ?? system.createdAt);
const SORTERS: Record<SystemSort, (a: System, b: System) => number> = {
  recent: (a, b) => lastAt(b) - lastAt(a),
  discovered: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  name: (a, b) => a.name.localeCompare(b.name),
  rating: (a, b) => b.rating - a.rating || Number(b.favorite) - Number(a.favorite) || lastAt(b) - lastAt(a),
  region: (a, b) =>
    Number(!a.region) - Number(!b.region) || a.region.localeCompare(b.region) || a.name.localeCompare(b.name)
};

// Every search token must match somewhere (name, notes, planets, tags…); favourites come first except in the
// alphabetical sorts, where pinning them would hide the order the person asked for.
export function filterSystems(systems: System[], filter: SystemFilter): System[] {
  const tokens = filter.q.toLowerCase().split(/\s+/).filter(Boolean);
  const pinFavorites = filter.sort !== 'name' && filter.sort !== 'region';
  return systems
    .filter(system => {
      if (filter.favorites && !system.favorite) return false;
      if (filter.star && system.star !== filter.star) return false;
      if (filter.race && system.race !== filter.race) return false;
      if (filter.conflict && system.conflict !== filter.conflict) return false;
      const tags = systemTags(system);
      if (!filter.tags.every(tag => tags.has(tag))) return false;
      if (tokens.length) {
        const haystack = systemHaystack(system);
        if (!tokens.every(token => haystack.includes(token))) return false;
      }
      return true;
    })
    .sort((a, b) => (pinFavorites ? Number(b.favorite) - Number(a.favorite) : 0) || SORTERS[filter.sort](a, b));
}

export function filterActive(filter: SystemFilter): boolean {
  return Boolean(filter.q || filter.tags.length || filter.star || filter.race || filter.conflict || filter.favorites);
}

// Every tag on systems and their planets with how often it's used, most used first.
export function tagCounts(systems: System[]): [string, number][] {
  const counts = new Map<string, number>();
  systems.forEach(system => {
    [...system.tags, ...system.planets.flatMap(planet => planet.tags)].forEach(tag =>
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    );
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// Tag suggestions for the editor: tags already in use (in the order they first appear), then the built-in ones.
export function tagSuggestions(systems: System[], exclude: string[], query: string): string[] {
  const used = systems.flatMap(system => [...system.tags, ...system.planets.flatMap(planet => planet.tags)]);
  return [...new Set([...used, ...SUGGESTED_TAGS])].filter(tag => !exclude.includes(tag) && tag.includes(query));
}

export function systemsSummary(systems: System[]): { systems: number; planets: number; visits: number } {
  return {
    systems: systems.length,
    planets: systems.reduce((sum, system) => sum + system.planets.length, 0),
    visits: systems.reduce((sum, system) => sum + system.visits.length, 0)
  };
}

// The one-line summary under a system's name, as parts; the economy part carries the wealth for its stars.
export interface MetaPart {
  text: string;
  wealth?: number;
}
export function systemMeta(system: System): MetaPart[] {
  const parts: MetaPart[] = [
    { text: system.region },
    { text: system.galaxy },
    { text: system.race ? RACES[system.race] : '' },
    { text: system.economy, wealth: system.wealth },
    {
      text: system.conflict
        ? `${CONFLICT_LEVELS[system.conflict]}${system.conflict === 'pirate' ? '' : ' conflict'}`
        : ''
    }
  ];
  return parts.filter(part => part.text || part.wealth);
}

export interface ParsedOutlawSystem {
  name: string;
  glyphs: string;
  region: string;
  notes: string;
  conflict: 'pirate';
  tags: string[];
}
// One system per line: `Name | Glyphs | Region | Notes…` (only the name is required).
export function parseOutlawList(text: string): { systems: ParsedOutlawSystem[] } | { error: string } {
  const parsed = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [name = '', glyphs = '', region = '', ...notes] = line.split('|').map(part => part.trim());
      return {
        name,
        glyphs: normalizeGlyphs(glyphs),
        region,
        notes: notes.join(' | '),
        conflict: 'pirate' as const,
        tags: [OUTLAW_TAG]
      };
    });
  if (!parsed.length) return { error: 'Paste at least one system, one per line.' };
  const bad = parsed.findIndex(item => !item.name || (item.glyphs && item.glyphs.length !== 12));
  if (bad !== -1) return { error: `Line ${bad + 1}: needs a name, and glyphs must be exactly 12 hex digits.` };
  return { systems: parsed };
}
