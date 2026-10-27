// The committed data files every fresh clone and every deploy start from must be well-formed.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const readJson = async path => JSON.parse(await fs.readFile(new URL(`../../${path}`, import.meta.url), 'utf8'));

test('nms_state.json is the canonical default shape', async () => {
  const state = await readJson('apps/web/public/nms_state.json');
  for (const key of ['meta', 'fleet', 'checklists', 'outlaw', 'systems']) assert.ok(key in state, `missing ${key}`);
  assert.equal(typeof state.meta.lastUpdated, 'string');
  assert.ok(Array.isArray(state.systems));
  for (const key of ['restockHours', 'packetsPerVisit', 'runSize', 'unitsPerPacket', 'nanitesPerPacket']) {
    assert.ok(Number(state.outlaw[key]) > 0, `outlaw.${key} must be a positive number`);
  }
  assert.equal(state.logbook, undefined, 'legacy logbook must not be committed');
});

test('wiki/aliases.json maps old item names to current titles', async () => {
  const aliases = await readJson('wiki/aliases.json');
  for (const [from, to] of Object.entries(aliases)) {
    assert.equal(typeof to, 'string', `${from} must map to a title`);
    assert.notEqual(from, to);
  }
});
