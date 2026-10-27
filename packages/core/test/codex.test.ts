// The Codex page's routes, browse facets and article relations, on a small made-up set of entries.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  DEFAULTS,
  articleHref,
  browse,
  browseHref,
  headingIds,
  isLanding,
  makeIndex,
  pageOf,
  parseRoute,
  relations,
  splitLink
} from '../src/codex.ts';
import { prepare, type Entry } from '../src/search.ts';
import { parseBundle } from '../src/wiki-files.ts';

const entries = (
  [
    {
      title: 'Oxygen',
      category: 'resources',
      path: 'wiki/resources/Oxygen.md',
      source: 'wiki',
      body: '# Oxygen\n\nBreathe.'
    },
    {
      title: 'Life Support Gel',
      category: 'products',
      path: 'wiki/products/Life_Support_Gel.md',
      source: 'wiki',
      body: '# Life Support Gel\n\nMade from [[Oxygen]] and [[Di-hydrogen Jelly|jelly]]. See [[Coprite]].',
      recipes: [{ type: 'craft', inputs: [{ name: 'Oxygen' }, { name: 'Di-hydrogen Jelly' }] }]
    },
    {
      title: 'Di-hydrogen Jelly',
      category: 'products',
      path: 'wiki/products/Di-hydrogen_Jelly.md',
      source: 'wiki',
      body: 'Refined; oxygen helps.'
    },
    { title: 'Faecium', category: 'resources', path: 'wiki/resources/Faecium.md', source: 'wiki', body: 'Smelly.' },
    {
      title: 'Old Oxygen Thing',
      category: 'products',
      path: 'wiki/products/Old.md',
      source: 'wiki',
      obsolete: true,
      body: 'Uses oxygen.',
      recipes: [{ type: 'craft', inputs: [{ name: 'Oxygen' }] }]
    },
    {
      title: 'My Notes',
      category: 'resources',
      path: 'wiki/custom/resources/my-notes.md',
      source: 'draft',
      body: 'oxygen'
    }
  ] satisfies Entry[]
).map(prepare);
const index = makeIndex(entries, { Coprite: 'Faecium' });
const entry = (title: string) => entries.find(item => item.title === title)!;

test('routes parse and serialise, with unknown values falling back to the defaults', () => {
  assert.deepEqual(parseRoute(''), { view: 'browse', params: DEFAULTS });
  const route = parseRoute('#/?q=oxygen&cat=products&src=draft&letter=Q&sort=az&old=1&page=3');
  assert.deepEqual(route, {
    view: 'browse',
    params: { q: 'oxygen', cat: 'products', src: 'all', letter: 'Q', sort: 'az', old: '1', page: 3 }
  });
  assert.equal(parseRoute('#/?cat=nope&page=-2').params.cat, 'all');
  assert.equal(parseRoute('#/?page=-2').params.page, 1);
  assert.equal(parseRoute('#/?cat=toString&src=constructor').params.cat, 'all'); // own keys only
  assert.equal(parseRoute('#/?cat=toString&src=constructor').params.src, 'all');
  assert.deepEqual(parseRoute(articleHref('wiki/a b/Ö.md', 'gel')), {
    view: 'article',
    path: 'wiki/a b/Ö.md',
    params: { ...DEFAULTS, q: 'gel' }
  });
  assert.equal(parseRoute('#/a/%E0%A4%A').view, 'article'); // a malformed escape doesn't throw
  assert.equal(browseHref({ q: 'x y', page: 1, cat: 'all' }), '#/?q=x+y');
  assert.equal(browseHref({}), '#/');
  assert.ok(isLanding(DEFAULTS) && !isLanding({ ...DEFAULTS, letter: 'A' }));
});

test('facets count what choosing them would show; drafts count as your articles', () => {
  const view = browse(entries, { ...DEFAULTS, q: 'oxygen' });
  // Which entries match is the filters' job; their order is search()'s (search.test.ts).
  assert.deepEqual(view.results.map(result => result.entry.title).sort(), [
    'Di-hydrogen Jelly',
    'Life Support Gel',
    'My Notes',
    'Oxygen'
  ]);
  assert.equal(view.oldCount, 1); // the obsolete one, hidden unless asked for
  assert.equal(view.srcCounts.custom, 1);
  const products = browse(entries, { ...DEFAULTS, q: 'oxygen', cat: 'products' });
  assert.ok(products.results.every(result => result.entry.category === 'products'));
  assert.equal(products.catTotal, view.catTotal); // category counts ignore the category filter itself
  assert.equal(browse(entries, { ...DEFAULTS, letter: 'O', old: '1' }).results.length, 2);
  const paged = browse(entries, { ...DEFAULTS, letter: 'O', page: 9 });
  assert.equal(paged.page, 1);
  assert.equal(pageOf(paged).length, paged.results.length);
});

test('an article knows what uses it, what it links to, where it is mentioned, and its neighbours', () => {
  const oxygen = relations(index, entry('Oxygen'));
  assert.deepEqual(
    oxygen.usedIn.map(item => item.title),
    ['Life Support Gel']
  ); // the obsolete recipe user is left out
  assert.deepEqual(
    oxygen.mentionedIn.map(item => item.title),
    ['Di-hydrogen Jelly', 'Life Support Gel', 'My Notes']
  ); // a draft of your own counts too
  const gel = relations(index, entry('Life Support Gel'));
  // [[Coprite]] resolves through the wiki's alias to Faecium.
  assert.deepEqual(
    gel.linksTo.map(item => item.title),
    ['Oxygen', 'Di-hydrogen Jelly', 'Faecium']
  );
  assert.deepEqual(
    gel.nearby.map(item => item.title),
    ['Di-hydrogen Jelly']
  );
  assert.equal(index.find('coprite')?.title, 'Faecium');
});

test('wiki links and heading ids', () => {
  assert.deepEqual(splitLink('Target'), { target: 'Target', label: 'Target' });
  assert.deepEqual(splitLink('Target\\|shown'), { target: 'Target', label: 'shown' });
  assert.deepEqual(headingIds(['Quick Facts', 'Quick facts!', 'Uses']), ['h-quick-facts', 'h-quick-facts-x', 'h-uses']);
});

test('a bundle with one bad article keeps the rest', () => {
  const parsed = parseBundle({
    aliases: { Coprite: 'Faecium' },
    articles: [
      { title: 'Oxygen', category: 'resources', path: 'a.md' },
      { title: '', category: 'x', path: 'b.md' }
    ]
  });
  assert.ok(parsed);
  assert.deepEqual(
    parsed.bundle.articles.map(article => article.title),
    ['Oxygen']
  );
  assert.equal(parsed.dropped, 1);
  assert.equal(parseBundle({ articles: 'nope' }), null);
});
