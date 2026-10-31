// The invented log the product page's screens and video show: names a player might give, and nobody's own save.
const HOUR = 3_600_000;
const now = Date.now();
const ago = hours => new Date(now - hours * HOUR).toISOString();
const ahead = minutes => new Date(now + minutes * 60_000).toISOString();

const here = {
  id: 'vintam',
  name: 'Vintam Reach',
  galaxy: 'Euclid',
  region: 'Oshaun Sector',
  glyphs: '0A2F01C93B7E',
  star: 'yellow',
  race: 'korvax',
  economy: 'Technology',
  wealth: 2,
  conflict: 'medium',
  rating: 5,
  planetCount: 5,
  favorite: true,
  planets: [
    { id: 'p1', name: 'Ekora Prime', biome: 'Lush', notes: 'Paradise. Built the first base here.', tags: ['Base'] },
    { id: 'p2', name: 'Tessa Minor', biome: 'Scorched' },
    { id: 'p3', name: 'Oran IX', biome: 'Toxic' },
    { id: 'p4', name: 'Hale 24', biome: 'Frozen' },
    { id: 'p5', name: 'Geris Beta', biome: 'Exotic' }
  ],
  visits: [
    { at: ago(0.7), note: 'Back for the base. Refiners running.' },
    { at: ago(26), note: 'Found a Sentinel pillar on Oran IX.' },
    { at: ago(190), note: 'First warp out here. Keeping this one.' }
  ],
  createdAt: ago(190)
};
const others = [
  ['Asoru Drift', 'blue', 'gek', 'Trading'],
  ['Halden Cross', 'red', 'vykeen', 'Mining'],
  ['Irrin Basin', 'green', 'korvax', 'Scientific'],
  ['Nolvek Span', 'yellow', 'gek', 'Manufacturing'],
  ['Tharsis Gate', 'purple', 'vykeen', 'Power Generation']
].map(([name, star, race, economy], i) => ({
  id: `s${String(i)}`,
  name,
  galaxy: 'Euclid',
  region: 'Oshaun Sector',
  glyphs: `0${(0x4b1 + i * 37).toString(16).toUpperCase()}01C9${(0x3b7 + i * 91).toString(16).toUpperCase()}E`.padEnd(
    12,
    '0'
  ),
  star,
  race,
  economy,
  planetCount: 2 + i,
  visits: [{ at: ago(40 + i * 30) }],
  createdAt: ago(40 + i * 30)
}));
export const state = {
  systems: [here, ...others],
  session: { startedAt: ago(1.2), timersDone: 2 },
  timers: [
    { id: 't1', kind: 'refine', label: '300 Chromatic Metal', startedAt: ago(0.4), endsAt: ahead(18), alerted: false },
    { id: 't2', kind: 'crop', label: 'Frost Crystal', startedAt: ago(0.2), endsAt: ahead(42), alerted: false }
  ]
};
