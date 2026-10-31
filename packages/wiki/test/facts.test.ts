// Cited facts (ADR-0003): each one's value has the shape the app expects, and each quote is in its archived page.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FACT_VALUES, type FactId } from '@atlas/core/facts';
import { FACTS, checkFacts, currentGameVersion, type FactPage, type UpdatePage } from '../src/facts.ts';
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

test('the current game version is the Update page with no next one, whatever its number looks like', () => {
  const update = (title: string, fields: Record<string, unknown>, extra: Partial<UpdatePage> = {}): UpdatePage => ({
    title,
    category: 'updates',
    path: `wiki/updates/${title.replace(/\W/g, '_')}.md`,
    url: `https://nomanssky.fandom.com/wiki/${title.replace(/ /g, '_')}`,
    fields,
    ...extra
  });
  const pages = [
    update('Update 7.06', { date: '5 October, 2026', next: '7.10' }),
    update('Update 7.10', { date: '28 October, 2026', previous: '7.06' }),
    update('Update 7.2', { date: '1 November, 2026' }, { obsolete: true }),
    update('Patch notes', { date: '2 November, 2026' }),
    { ...update('Update 8.0', { date: '3 November, 2026' }), category: 'products' }
  ];
  assert.deepEqual(currentGameVersion(pages), {
    version: '7.10',
    page: 'Update 7.10',
    path: 'wiki/updates/Update_7_10.md',
    url: 'https://nomanssky.fandom.com/wiki/Update_7.10',
    date: '28 October, 2026'
  });
  assert.equal(currentGameVersion([]), null);
});
