import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { quickFacts, recipeRows, sectionSize, splitSections } from '../src/article-sections.ts';

const article = `# Chromatic Metal

## Quick Facts

- **Category:** Special
- **Value:** 88

## Source

- Some Galactic Trade Terminals
- Pirate ships

### Single Input

- **Refiner** · *Extract Chromatic Material* · 0.36 s per unit: 2 × [[Copper]] → 1 × Chromatic Metal
- **Refiner** · *Extract Chromatic Material* · 0.1 s per unit: 2 × [[Indium]] → 4 × Chromatic Metal

### Notes

Kept.

## Crafting

- **Crafting** · needs the blueprint: 1 × [[Heat Capacitor]] + 1 × [[Poly Fibre]] → 1 × Circuit Board
`;

test('an article splits into its ## sections, the title line dropped', () => {
  const { intro, sections } = splitSections(article);
  assert.equal(intro, '');
  assert.deepEqual(
    sections.map(section => section.title),
    ['Quick Facts', 'Source', 'Crafting']
  );
});

test('Quick Facts become pairs; other sections don’t', () => {
  const [facts, source] = splitSections(article).sections;
  assert.deepEqual(quickFacts(`${facts!.markdown}\n\n**Chromatic Metal** is a resource.`), {
    facts: [
      ['Category', 'Special'],
      ['Value', '88']
    ],
    rest: '**Chromatic Metal** is a resource.'
  });
  assert.equal(quickFacts(source!.markdown), null);
  assert.equal(sectionSize(facts!), '2 facts');
});

test('recipe lines become rows; an emptied subheading goes, the prose stays', () => {
  const [, source, crafting] = splitSections(article).sections;
  const { rows, rest } = recipeRows(source!.markdown);
  assert.deepEqual(rows[1], {
    machine: 'Refiner',
    inputs: '2 × [[Indium]]',
    makes: '4',
    time: '0.1 s',
    note: 'Extract Chromatic Material'
  });
  assert.equal(rest, '- Some Galactic Trade Terminals\n- Pirate ships\n\n### Notes\n\nKept.');
  assert.equal(sectionSize(source!), '2 recipes');
  const craft = recipeRows(crafting!.markdown).rows[0];
  assert.ok(craft);
  assert.equal(craft.note, 'needs the blueprint');
  assert.equal(craft.time, '');
});

test('on the real mirror, Chromatic Metal’s refiner recipes are all read', () => {
  let file: string;
  try {
    file = fs.readFileSync(new URL('../../../wiki/resources/Chromatic_Metal.md', import.meta.url), 'utf8');
  } catch {
    return; // a fresh clone before `pnpm index:wiki`
  }
  const source = splitSections(file.replace(/^---\n[\s\S]*?\n---\n/, '')).sections.find(s => s.title === 'Source');
  const { rows, rest } = recipeRows(source?.markdown ?? '');
  assert.ok(rows.length >= 20);
  assert.ok(!rest.includes('**Refiner**'));
});
