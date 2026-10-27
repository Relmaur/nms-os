// Every screen is React (ADR-0004), so neither page carries inline on…="" handlers: they would run in the global
// scope, where the app's functions no longer live. This keeps one from creeping back.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../../apps/web/', import.meta.url);

for (const page of ['index.html', 'wiki/index.html']) {
  test(`${page} has no inline handlers`, () => {
    const html = fs.readFileSync(new URL(page, root), 'utf8');
    assert.deepEqual(html.match(/\son[a-z]+="[^"]*"/g) ?? [], []);
  });
}
