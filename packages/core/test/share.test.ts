import { test } from 'vitest';
import assert from 'node:assert/strict';
import { normalizeGear, slotRules } from '../src/gear.ts';
import { fleetCard, plainNote, postcard, postcardText, POSTCARD_DEFAULTS, shareFileName } from '../src/share.ts';
import { normalizeSystem } from '../src/systems-model.ts';

const system = normalizeSystem({
  name: 'Masdalri Junction',
  galaxy: 'Euclid',
  region: 'Aeushne Sector',
  glyphs: '100000000010',
  race: 'korvax',
  economy: 'High Tech',
  rating: 5,
  tags: ['first-system'],
  notes: 'Main **save** planet [[Oxygen|spawn]]!',
  createdAt: '2026-10-27T12:00:00Z',
  planets: [
    { name: 'Buya', biome: 'Rotting', tags: ['base'] },
    { name: 'Geor', biome: 'Metallic' }
  ]
});

test('a postcard starts without the notes and the portal address', () => {
  const card = postcard(system, POSTCARD_DEFAULTS, '7.10');
  assert.equal(card.eyebrow, 'HOME SYSTEM · ★★★★★');
  assert.deepEqual(card.lines, ['Aeushne Sector · Euclid', 'Korvax · High Tech · 2 worlds']);
  assert.deepEqual(card.labels, [
    { name: 'Buya', biome: 'ROTTING · BASE' },
    { name: 'Geor', biome: 'METALLIC' }
  ]);
  assert.equal(card.note, '');
  assert.equal(card.portal, '');
  assert.equal(card.footer, 'Logged 27 Oct 2026 · game v7.10');
});

test('each choice takes its part off the picture and out of the text', () => {
  const none = postcard(system, { planets: false, rating: false, notes: false, portal: false }, null);
  assert.equal(none.eyebrow, 'HOME SYSTEM');
  assert.equal(none.labels, null);
  assert.deepEqual(none.tags, []);
  assert.equal(none.footer, 'Logged 27 Oct 2026');
  const all = postcard(system, { planets: true, rating: true, notes: true, portal: true }, null);
  assert.equal(all.note, 'Main save planet spawn!');
  assert.equal(all.portal, '100000000010');
  const text = postcardText(all);
  assert.match(text, /Portal address: 100000000010/);
  assert.match(text, /Buya: rotting · base/);
  assert.doesNotMatch(postcardText(none), /Portal|Main save|Buya/);
});

test('a fleet card marks the wiki’s slots and shortens what sits in them', () => {
  const [item] = normalizeGear([
    {
      name: 'Ythgall',
      kind: 'starship',
      class: 'S',
      type: 'Sentinel Interceptor',
      role: 'Flagship',
      superchargedSlots: ['R2C3', 'R3C7'],
      slotLabels: { R2C3: 'Infra-Knife Accelerator' },
      notes: 'The *build*.'
    }
  ]);
  assert.ok(item);
  const rules = { ...slotRules(null, 'starship', 'S'), supercharged: 4 };
  const card = fleetCard(item, 'Starship', rules, false, true, '7.10');
  assert.equal(card.role, 'FLAGSHIP');
  assert.equal(card.line, 'Sentinel Interceptor · Starship');
  assert.equal(card.letter, 'S');
  assert.equal(card.count, '2 / 4 SUPERCHARGED');
  assert.deepEqual(
    card.cells.map(cell => cell.slot),
    ['R2C3', 'R3C7']
  );
  assert.equal(card.note, 'The build .');
  assert.equal(fleetCard(item, 'Starship', rules, false, false, null).note, '');
});

test('plain notes and file names', () => {
  assert.equal(plainNote('a'.repeat(200), 10), `${'a'.repeat(9)}…`);
  assert.equal(shareFileName('Masdalri Junction', 'square'), 'masdalri-junction-square.png');
  assert.equal(shareFileName('Aeron-ημ!', 'fleet'), 'aeron-ημ-fleet.png');
  assert.equal(shareFileName('***', 'fleet'), 'atlas-fleet.png');
});
