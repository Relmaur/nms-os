import { test } from 'vitest';
import assert from 'node:assert/strict';
import { normalizeSystem } from '../src/systems-model.ts';
import {
  clusterView,
  journey,
  lightYearsLong,
  nextGalaxies,
  ordinal,
  placeSystem,
  spiralDots,
  tide
} from '../src/map.ts';

const GALAXIES = [
  { n: 1, name: 'Euclid', type: 'Norm', path: 'wiki/galaxies/Euclid.md' },
  { n: 2, name: 'Hilbert Dimension', type: 'Norm', path: 'wiki/galaxies/Hilbert_Dimension.md' },
  { n: 3, name: 'Calypso', type: 'Harsh', path: 'wiki/galaxies/Calypso.md' },
  { n: 4, name: 'Hesperius Dimension', type: 'Norm', path: 'wiki/galaxies/Hesperius_Dimension.md' },
  { n: 5, name: 'Hyades', type: 'Norm', path: 'wiki/galaxies/Hyades.md' }
];
const system = (name: string, galaxy: string, glyphs: string, createdAt: string, visits: string[] = []) =>
  normalizeSystem({ name, galaxy, glyphs, createdAt, visits: visits.map(at => ({ at })) });

test('a portal address places a system round its galaxy’s core; no address, no place', () => {
  // X 010 east, Z 000: on the axis to the east, 16 regions out.
  const east = placeSystem(system('East', 'Euclid', '100000000010', '2026-10-01T00:00:00Z'));
  assert.ok(east);
  assert.equal(east.angle, 0);
  assert.equal(east.regions, 16);
  assert.equal(east.reach, 16 / 0x7ff);
  // Z FFF is one region north (the upper half of the range is negative): straight up the screen.
  const north = placeSystem(system('North', 'Euclid', '100000FFF000', '2026-10-01T00:00:00Z'));
  assert.equal(north?.angle, -Math.PI / 2);
  assert.equal(placeSystem(system('Nowhere', 'Euclid', '', '2026-10-01T00:00:00Z')), null);
});

test('the journey lists galaxies in the order first reached, and where the player is now', () => {
  const trip = journey(
    [
      system('Late Euclid', 'Euclid', '', '2026-10-20T00:00:00Z', ['2026-10-28T00:00:00Z']),
      system('First', 'Euclid', '100000000010', '2026-10-01T00:00:00Z'),
      system('Over', 'hilbert dimension', '1000000A0000', '2026-10-10T00:00:00Z'),
      system('Deeper', 'Euclid', '100000000008', '2026-10-05T00:00:00Z'),
      system('Custom', 'My Own Galaxy', '', '2026-10-15T00:00:00Z')
    ],
    GALAXIES
  );
  assert.deepEqual(
    trip.galaxies.map(g => [g.name, g.n, g.placed.map(p => p.system.name), g.unplaced, g.deepest]),
    [
      ['Euclid', 1, ['First', 'Deeper'], 1, 8],
      ['Hilbert Dimension', 2, ['Over'], 0, 160], // Z 0A0: 160 regions south
      ['My Own Galaxy', null, [], 1, null]
    ]
  );
  assert.equal(trip.here, 0); // the latest visit was in Euclid
  assert.deepEqual([trip.placed, trip.unplaced], [3, 2]);
  assert.deepEqual(journey([], GALAXIES), { galaxies: [], here: -1, placed: 0, unplaced: 0 });
});

test('the next galaxies follow the wiki’s numbering from where the player is', () => {
  const trip = journey(
    [
      system('A', 'Euclid', '', '2026-10-01T00:00:00Z'),
      system('B', 'Calypso', '', '2026-10-02T00:00:00Z'),
      system('C', 'Hilbert Dimension', '', '2026-10-03T00:00:00Z')
    ],
    GALAXIES
  );
  assert.deepEqual(
    nextGalaxies(trip, GALAXIES).map(g => g.name),
    ['Hesperius Dimension', 'Hyades'] // after Hilbert (2), skipping Calypso, already reached
  );
  assert.deepEqual(nextGalaxies(trip, null), []);
});

test('tide colours run cyan → violet → rose → amber by order of arrival', () => {
  assert.equal(tide(0, 1), '#67e8f9');
  assert.equal(tide(0, 4), '#67e8f9');
  assert.equal(tide(1, 4), '#a78bfa');
  assert.equal(tide(2, 4), '#f472b6');
  assert.equal(tide(3, 4), '#fbbf24');
});

test('a galaxy’s spiral glyph matches the design’s reference code', () => {
  // Vectors from journey_map.py's spiral() for "Euclid" (4 arms): t·cos θ, t·sin θ, dot radius.
  const dots = spiralDots('Euclid', 'Norm', 3).map(d => [d.x, d.y, d.r].map(v => Math.round(v * 1e6) / 1e6));
  assert.deepEqual(dots, [
    [-0.502209, 0.43151, 0.351378],
    [-0.489411, -0.160654, 0.870578],
    [-0.078483, -0.035264, 0.575377]
  ]);
});

test('one galaxy’s view fits the cluster, keeps its shape, and knows where the core is', () => {
  const placed = [
    placeSystem(system('A', 'Euclid', '100000100100', '2026-10-01T00:00:00Z')),
    placeSystem(system('B', 'Euclid', '100000200300', '2026-10-01T00:00:00Z'))
  ].filter(p => p !== null);
  const view = clusterView(placed, 358);
  // X 0x100 → 0x300 and Z 0x100 → 0x200: the wider side (512 regions) fills 78% of the view.
  assert.equal(view.scale, (358 * 0.78) / 512);
  assert.deepEqual(
    view.points.map(p => [Math.round(p.x), Math.round(p.y)]),
    [
      [39, 109],
      [319, 249]
    ]
  );
  assert.ok(view.core.x < 0 && view.core.y < 0); // north-west, off the view
  assert.equal(clusterView(placed.slice(0, 1), 358).scale, (358 * 0.78) / 40); // a lone system isn't zoomed to nothing
});

test('light years and ordinals read as the design writes them', () => {
  assert.equal(lightYearsLong(492.5, 400), '197,000 ly');
  assert.equal(lightYearsLong(10, 400), '4,000 ly');
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map(ordinal), [
    '1st',
    '2nd',
    '3rd',
    '4th',
    '11th',
    '12th',
    '13th',
    '21st',
    '22nd',
    '23rd',
    '101st'
  ]);
});
