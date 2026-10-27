import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  DEFAULT_FILTER,
  filterActive,
  filterSystems,
  parseOutlawList,
  systemMeta,
  systemsSummary,
  tagCounts,
  type SystemFilter
} from '../src/systems-list.ts';
import { normalizeSystem, HOUR_MS } from '../src/systems-model.ts';

const now = Date.parse('2026-10-27T12:00:00Z');
const ago = (hours: number) => new Date(now - hours * HOUR_MS).toISOString();

const systems = [
  normalizeSystem({
    id: 'a',
    name: 'Ekwa Nexus',
    region: 'Odyalutai',
    star: 'yellow',
    race: 'gek',
    conflict: 'low',
    tags: ['trade-hub'],
    rating: 3,
    createdAt: ago(300),
    visits: [{ at: ago(2) }],
    planets: [{ name: 'Verdant IV', tags: ['base'] }]
  }),
  normalizeSystem({
    id: 'b',
    name: 'Hesper Drift',
    region: 'Baltar',
    star: 'red',
    race: 'korvax',
    tags: ['trade-hub', 'mining'],
    favorite: true,
    rating: 1,
    createdAt: ago(100),
    visits: [{ at: ago(48), note: 'storm shelter' }]
  }),
  normalizeSystem({ id: 'c', name: 'Aldor', createdAt: ago(1), rating: 3 })
];
const ids = (filter: Partial<SystemFilter>) =>
  filterSystems(systems, { ...DEFAULT_FILTER, ...filter }).map(system => system.id);

test('favourites come first, then the chosen sort', () => {
  assert.deepEqual(ids({}), ['b', 'c', 'a']); // recent: c added 1h ago, a visited 2h ago
  assert.deepEqual(ids({ sort: 'discovered' }), ['b', 'c', 'a']);
  assert.deepEqual(ids({ sort: 'rating' }), ['b', 'c', 'a']); // equal ratings: the more recent first
});

test('alphabetical sorts ignore favourites; systems without a region go last', () => {
  assert.deepEqual(ids({ sort: 'name' }), ['c', 'a', 'b']);
  assert.deepEqual(ids({ sort: 'region' }), ['b', 'a', 'c']);
});

test('filters combine: favourites, star, race, conflict and every chosen tag', () => {
  assert.deepEqual(ids({ favorites: true }), ['b']);
  assert.deepEqual(ids({ star: 'yellow' }), ['a']);
  assert.deepEqual(ids({ race: 'korvax' }), ['b']);
  assert.deepEqual(ids({ conflict: 'low' }), ['a']);
  assert.deepEqual(ids({ tags: ['trade-hub'] }), ['b', 'a']);
  assert.deepEqual(ids({ tags: ['trade-hub', 'mining'] }), ['b']);
  assert.deepEqual(ids({ tags: ['base'] }), ['a']); // planet tags count
});

test('search needs every word, anywhere in the system', () => {
  assert.deepEqual(ids({ q: 'verdant' }), ['a']);
  assert.deepEqual(ids({ q: 'STORM baltar' }), ['b']);
  assert.deepEqual(ids({ q: 'storm odyalutai' }), []);
});

test('a filter is active when anything but the sort is set', () => {
  assert.equal(filterActive(DEFAULT_FILTER), false);
  assert.equal(filterActive({ ...DEFAULT_FILTER, sort: 'name' }), false);
  assert.equal(filterActive({ ...DEFAULT_FILTER, tags: ['x'] }), true);
  assert.equal(filterActive({ ...DEFAULT_FILTER, favorites: true }), true);
});

test('tag counts include planet tags, most used first', () => {
  assert.deepEqual(tagCounts(systems), [
    ['trade-hub', 2],
    ['base', 1],
    ['mining', 1]
  ]);
});

test('summary counts systems, planets and visits', () => {
  assert.deepEqual(systemsSummary(systems), { systems: 3, planets: 1, visits: 2 });
});

test('meta parts: race and conflict as labels, economy carries its wealth, pirates aren’t "conflict"', () => {
  const system = normalizeSystem({ name: 'X', region: 'R', race: 'vykeen', economy: 'Mining', wealth: 2 });
  assert.deepEqual(systemMeta(system), [
    { text: 'R' },
    { text: 'Euclid' },
    { text: "Vy'keen" },
    { text: 'Mining', wealth: 2 }
  ]);
  assert.deepEqual(systemMeta(normalizeSystem({ name: 'Y', galaxy: '', conflict: 'pirate' })).at(-1), {
    text: 'Pirate (outlaw)'
  });
  assert.deepEqual(systemMeta(normalizeSystem({ name: 'Z', conflict: 'high' })).at(-1), { text: 'High conflict' });
});

test('a pasted outlaw list: one per line, glyphs normalised, notes may contain bars', () => {
  const result = parseOutlawList('Den Two | 01234 56789ab | Far Reach | 2 jumps | from base\n\n  Den Three  ');
  assert.ok('systems' in result);
  assert.deepEqual(result.systems, [
    {
      name: 'Den Two',
      glyphs: '0123456789AB',
      region: 'Far Reach',
      notes: '2 jumps | from base',
      conflict: 'pirate',
      tags: ['outlaw']
    },
    { name: 'Den Three', glyphs: '', region: '', notes: '', conflict: 'pirate', tags: ['outlaw'] }
  ]);
});

test('a pasted outlaw list names the first bad line', () => {
  assert.deepEqual(parseOutlawList(' \n '), { error: 'Paste at least one system, one per line.' });
  assert.deepEqual(parseOutlawList('Good\n| 0123456789AB'), {
    error: 'Line 2: needs a name, and glyphs must be exactly 12 hex digits.'
  });
  assert.deepEqual(parseOutlawList('Short | 123'), {
    error: 'Line 1: needs a name, and glyphs must be exactly 12 hex digits.'
  });
});
