// The service worker precaches SHELL so the installed app works offline. Every module a page imports must be in
// it (a missing one breaks that page offline), and every listed file must exist (except files built by index:wiki).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../../', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), 'utf8');
const shellSource = read('sw.js')
  .match(/const SHELL = \[([\s\S]*?)\];/)[1]
  .replace(/\/\/.*$/gm, '');
const shell = new Set([...shellSource.matchAll(/'([^']+)'/g)].map(match => match[1]));
const DERIVED = new Set(['wiki/index.json', 'wiki/offline-bundle.js', 'wiki/game-data.json']);

function importGraph(entry, seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  for (const [, specifier] of read(entry).matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) {
    importGraph(path.posix.normalize(path.posix.join(path.posix.dirname(entry), specifier)), seen);
  }
  return seen;
}

test('every module the pages import is precached', () => {
  const modules = [...importGraph('assets/app/main.js'), ...importGraph('wiki/codex.js')];
  assert.deepEqual(
    modules.filter(file => !shell.has(file)),
    []
  );
});

test('every precached file exists', () => {
  const missing = [...shell].filter(
    file => !file.endsWith('/') && !DERIVED.has(file) && !fs.existsSync(new URL(file, root))
  );
  assert.deepEqual(missing, []);
});
