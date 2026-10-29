import { expect, test } from 'vitest';
import { biomeFamily, type FactsFile } from '../src/facts.ts';

const cited = (biome: string, family: string) => ({
  page: 'Biome',
  path: 'wiki/mechanics/Biome.md',
  url: 'https://nomanssky.fandom.com/wiki/Biome',
  revId: 1,
  quote: '…',
  value: { biome, family }
});
const FILE: FactsFile = {
  schema: 1,
  facts: {
    'biome-scorched': cited('Scorched', 'hot'),
    'biome-volcanic': cited('Volcanic', 'hot'),
    'biome-frozen': cited('Frozen', 'frozen'),
    'biome-toxic': cited('Toxic', 'not-a-family') // a value of the wrong shape is ignored
  }
};

test("a biome's family comes from its cited fact, whatever the case or spacing", () => {
  expect(biomeFamily(FILE, 'Scorched')).toBe('hot');
  expect(biomeFamily(FILE, ' volcanic ')).toBe('hot');
  expect(biomeFamily(FILE, 'FROZEN')).toBe('frozen');
});

test('a biome the wiki gives no family, a broken fact, or no facts at all: no family (the marker draws slate)', () => {
  expect(biomeFamily(FILE, 'Barren')).toBeNull();
  expect(biomeFamily(FILE, 'Toxic')).toBeNull();
  expect(biomeFamily(FILE, '')).toBeNull();
  expect(biomeFamily(null, 'Scorched')).toBeNull();
});
