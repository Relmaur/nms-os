// Inline on…="" handlers run in the global scope, but the app's functions live in ES modules. Every function a
// handler calls must therefore be exposed with Object.assign(window, {…}) by that page's modules (ADR-0001).
// This checks it statically, across the HTML and the templates the modules render.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const BUILTINS = new Set([
  'event',
  'this',
  'window',
  'document',
  'location',
  'history',
  'if',
  'return',
  'typeof',
  'Number',
  'String',
  'JSON',
  'Math',
  'setTimeout'
]);

const PAGES = {
  'index.html': [
    'assets/app/main.js',
    'assets/app/nav.js',
    'assets/app/systems.js',
    'assets/app/companion.js',
    'assets/app/calculators.js'
  ],
  'wiki/index.html': ['wiki/codex.js']
};

// Names a handler calls (`name(`) or reads a property of (`NAME.x`) without a receiver.
function handlerNames(source) {
  const names = new Set();
  for (const [, code] of source.matchAll(/\son[a-z]+="([^"]*)"/g)) {
    let text = code;
    // Template data like ${system.id} or ${escapeHtml(tag)} is evaluated at render time, not by the handler.
    for (let previous; previous !== text;) {
      previous = text;
      text = text.replace(/\$\{[^{}`]*\}/g, '');
    }
    for (const [, name] of text.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*[(.]/g)) {
      if (!BUILTINS.has(name)) names.add(name);
    }
  }
  return names;
}

function exposedNames(source) {
  const names = new Set();
  for (const [, list] of source.matchAll(/Object\.assign\(window, \{([^}]*)\}\)/g)) {
    list
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)
      .forEach(name => names.add(name));
  }
  return names;
}

for (const [page, modules] of Object.entries(PAGES)) {
  test(`${page}: every inline handler resolves to an exposed function`, () => {
    const sources = [page, ...modules].map(read);
    const called = new Set(sources.flatMap(source => [...handlerNames(source)]));
    const exposed = new Set(modules.flatMap(path => [...exposedNames(read(path))]));
    assert.ok(called.size > 5, 'the scan found handlers');
    assert.deepEqual([...called].filter(name => !exposed.has(name)).sort(), []);
  });
}
