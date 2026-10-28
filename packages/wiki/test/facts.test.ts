// Cited facts (ADR-0003): each one's value has the shape the app expects, and each quote is in its archived page.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FACT_VALUES, type FactId } from '@atlas/core/facts';
import { FACTS, checkFacts, type FactPage } from '../src/facts.ts';
import { parseFrontmatter } from '../src/wikitext.ts';

const WIKI = new URL('../../../wiki/', import.meta.url);

// The archived copy of every page a fact cites, found by its frontmatter title.
function archivedPages(): Map<string, FactPage> {
  const titles = new Set(Object.values(FACTS).map(fact => fact.page));
  const pages = new Map<string, FactPage>();
  for (const folder of fs.readdirSync(WIKI, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
    if (folder.name === 'custom') continue;
    for (const file of fs.readdirSync(new URL(`${folder.name}/`, WIKI)).filter(name => name.endsWith('.md'))) {
      const { meta, body } = parseFrontmatter(fs.readFileSync(new URL(`${folder.name}/${file}`, WIKI), 'utf8'));
      if (typeof meta.title === 'string' && titles.has(meta.title) && meta.status !== 'removed')
        pages.set(meta.title, {
          path: `wiki/${folder.name}/${file}`,
          url: String(meta.source),
          revId: Number(meta.revId),
          body
        });
    }
  }
  return pages;
}

test('every fact’s value has the shape the app reads', () => {
  for (const [id, fact] of Object.entries(FACTS)) {
    assert.ok(FACT_VALUES[id as FactId].safeParse(fact.value).success, id); // Object.entries widens the key
  }
});

test('every fact’s quote is in its archived page (rerun after `pnpm sync:wiki` if this fails)', () => {
  const { found, stale } = checkFacts(archivedPages());
  assert.deepEqual(stale, []);
  assert.equal(found['supercharged-per-class']?.path, 'wiki/mechanics/Supercharged_Slot.md');
});

test('a quote the page no longer has makes the fact stale, and it is left out', () => {
  const pages = archivedPages();
  const slot = pages.get('Supercharged Slot');
  assert.ok(slot);
  pages.set('Supercharged Slot', { ...slot, body: slot.body.replace('4 in Class S', '5 in Class S') });
  pages.delete('Exosuit');
  const { found, stale } = checkFacts(pages);
  assert.deepEqual(stale, [
    { id: 'supercharged-per-class', page: 'Supercharged Slot', reason: 'quote no longer on the page' },
    { id: 'exosuit-supercharged-slots', page: 'Exosuit', reason: 'page not in the mirror' }
  ]);
  assert.equal(found['supercharged-per-class'], undefined);
  assert.ok(found['supercharged-fixed-count']); // the page's other sentence still stands
});
