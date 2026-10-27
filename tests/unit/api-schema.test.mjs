import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InvalidResponse, readEmbeddedIn, readRevisions } from '../../scripts/lib/api-schema.mjs';

const page = (overrides = {}) => ({ pageid: 1, title: 'Oxygen', revisions: [{ revid: 10, timestamp: '2026-09-30T19:57:58Z', slots: { main: { content: '{{Version|Waypoint}}' } } }], ...overrides });

test('well-formed responses pass through in a flat shape', () => {
  assert.deepEqual(readEmbeddedIn({ query: { embeddedin: [{ pageid: 1, ns: 0, title: 'Oxygen' }] } }, 'Resource infobox'), [{ pageid: 1, ns: 0, title: 'Oxygen' }]);
  assert.deepEqual(readRevisions({ query: { pages: [page()] } }), [{ pageid: 1, title: 'Oxygen', revid: 10, timestamp: '2026-09-30T19:57:58Z', content: '{{Version|Waypoint}}' }]);
});

test('pages deleted mid-sync are skipped, not errors', () => {
  assert.deepEqual(readRevisions({ query: { pages: [{ pageid: 2, title: 'Gone', missing: true }, page()] } }).map(p => p.title), ['Oxygen']);
});

test('malformed responses stop the sync and name the page', () => {
  assert.throws(() => readEmbeddedIn({ query: {} }, 'Product infobox'), InvalidResponse);
  assert.throws(() => readEmbeddedIn({ query: { embeddedin: [{ title: 'No id' }] } }, 'Product infobox'), /has no pageid/);
  assert.throws(() => readRevisions({ query: { pages: [page({ revisions: [] })] } }), /page 1 \(Oxygen\) has no revision id/);
  assert.throws(() => readRevisions({ query: { pages: [page({ revisions: [{ revid: 10, timestamp: 'x', slots: { main: { content: '' } } }] })] } }), /no valid timestamp/);
  assert.throws(() => readRevisions({ query: { pages: [page({ revisions: [{ revid: 10, timestamp: '2026-01-01T00:00:00Z', slots: {} }] })] } }), /no wikitext/);
});
