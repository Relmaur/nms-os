import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateState, describeErrors } from '../../assets/lib/schema.js';
import { migrateLegacyState } from '../../assets/lib/state.js';

const repoState = JSON.parse(fs.readFileSync(new URL('../../nms_state.json', import.meta.url), 'utf8'));

test('the repo’s nms_state.json is valid', () => {
  assert.deepEqual(validateState(repoState), { ok: true, errors: [] });
});

test('partial and legacy documents are valid', () => {
  assert.equal(validateState({}).ok, true);
  assert.equal(validateState({ logbook: [{ system: 'Old Camp' }], outlaw: { stations: [] } }).ok, true);
  assert.equal(validateState(migrateLegacyState({ checkedItems: { cs1: true }, logEntries: [] })).ok, true);
  assert.equal(validateState({ futureKey: { anything: 1 } }).ok, true, 'unknown keys are allowed');
});

test('errors name the exact path and the problem', () => {
  const result = validateState({
    meta: { lastUpdated: 'yesterday' },
    checklists: { cs1: 'yes' },
    outlaw: { restockHours: -1 },
    systems: [{ name: 'Fine' }, { name: 42, visits: [{ at: 'soon' }] }, 'not a system']
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors.map(error => error.path), ['meta.lastUpdated', 'checklists.cs1', 'outlaw.restockHours', 'systems[1].name', 'systems[1].visits[0].at']);
  assert.equal(describeErrors(result.errors.slice(0, 1)), 'meta.lastUpdated must be a date');
});

test('non-objects and wrong container types are rejected', () => {
  assert.deepEqual(validateState([]).errors, [{ path: '(root)', message: 'must be a JSON object' }]);
  assert.deepEqual(validateState({ systems: {} }).errors, [{ path: 'systems', message: 'must be a list' }]);
});
