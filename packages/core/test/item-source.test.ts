import { test } from 'vitest';
import assert from 'node:assert/strict';
import { articleBody, sourceLines } from '../src/item-source.ts';

const article = `---
title: "Nitrogen"
---

# Nitrogen

## Source

- As a secondary element in some [[flora]].<br>
- From [[Atmosphere Harvester|Atmosphere Harvesters]] on **Lush** planets.

- **Refiner** · *Gas Transfer* · 0.36 s per unit: 3 × [[Radon]] → 1 × Nitrogen
- **Crafting** · needs the blueprint: 1 × [[Heat Capacitor]] + 1 × [[Poly Fibre]] → 1 × Circuit Board
- **Crafting (obsolete)** · 1 × [[Old]] → 1 × Nitrogen

## Release History

- Added.
`;

test('the Source section: prose as written, recipes keyed by their machine, obsolete ones left out', () => {
  assert.deepEqual(sourceLines(articleBody(article)), [
    { kind: 'found', text: 'As a secondary element in some flora.' },
    { kind: 'found', text: 'From Atmosphere Harvesters on Lush planets.' },
    { kind: 'refine', text: '3 × Radon → 1 × Nitrogen' },
    { kind: 'craft', text: '1 × Heat Capacitor + 1 × Poly Fibre → 1 × Circuit Board (blueprint)' }
  ]);
  assert.deepEqual(sourceLines('# X\n\n## Summary\n\nNo source here.'), []);
  assert.equal(sourceLines('## Sources\n\n- Found in caves.\n')[0]?.text, 'Found in caves.');
});
