import { test } from 'vitest';
import assert from 'node:assert/strict';
import { prepare, search, tokenize, highlight, snippet, isOld } from '../../assets/lib/search.js';

const entries = [
  {
    title: 'Oxygen',
    summary: 'A fuel element.',
    category: 'resources',
    source: 'wiki',
    body: '# Oxygen\n\n## Source\nHarvested from red plants.'
  },
  {
    title: 'Oxygen Harvester',
    summary: 'Extracts gas.',
    category: 'building',
    source: 'wiki',
    body: '# Oxygen Harvester\n\nBuilt on a hotspot.'
  },
  {
    title: 'Kelp Sac',
    summary: 'Underwater flora.',
    category: 'resources',
    source: 'wiki',
    body: '# Kelp Sac\n\nRefines into oxygen.'
  },
  { title: 'Doughnut', summary: 'Food.', category: 'cooking', source: 'wiki', body: '# Doughnut' },
  {
    title: 'Blaze Javelin (Atlas)',
    summary: 'Old weapon.',
    category: 'technology',
    source: 'wiki',
    obsolete: true,
    body: '# Blaze Javelin (Atlas)'
  },
  { title: 'Gone Item', summary: 'Removed.', category: 'products', source: 'wiki', removed: true, body: '# Gone Item' }
].map(prepare);

test('title matches outrank body matches', () => {
  assert.deepEqual(
    search(entries, 'oxygen').map(result => result.entry.title),
    ['Oxygen', 'Oxygen Harvester', 'Kelp Sac']
  );
  assert.equal(search(entries, 'oxygen')[2].field, 'text');
});

test('plurals fold onto the singular', () => {
  assert.equal(search(entries, 'doughnuts')[0]?.entry.title, 'Doughnut');
});

test('obsolete and removed pages only appear when asked for', () => {
  assert.equal(search(entries, 'blaze').length, 0);
  assert.equal(search(entries, 'blaze', { includeOld: true })[0].entry.title, 'Blaze Javelin (Atlas)');
  assert.equal(
    search(entries, '').some(result => isOld(result.entry)),
    false
  );
});

test('category filter, highlighting and snippets', () => {
  assert.deepEqual(
    search(entries, 'oxygen', { category: 'building' }).map(result => result.entry.title),
    ['Oxygen Harvester']
  );
  assert.equal(highlight('Oxygen <b>', tokenize('oxygen')), '<mark>Oxygen</mark> &lt;b&gt;');
  assert.match(snippet(entries[2], ['oxygen']), /Refines into oxygen/);
});
