import { test } from 'vitest';
import assert from 'node:assert/strict';
import { deepEqual, mergeStates } from '../src/sync.ts';
import { deriveSyncKeys, hashToken, newSyncCode, openState, parseSyncCode, sealState } from '../src/sync-crypto.ts';
import { buildState } from '../src/state.ts';

const at = (hour: number) => `2026-10-27T${String(hour).padStart(2, '0')}:00:00.000Z`;
const system = (id: string, fields: Record<string, unknown> = {}) => ({
  id,
  name: id,
  tags: [],
  visits: [],
  planets: [],
  ...fields
});
const doc = (hour: number, fields: Record<string, unknown>): Record<string, unknown> => ({
  meta: { lastUpdated: at(hour) },
  ...fields
});

test('a side that changed alone wins; equal sides stay as they are', () => {
  const base = doc(1, { systems: [system('a')] });
  const local = doc(2, { systems: [system('a', { notes: 'mine' })] });
  assert.deepEqual(mergeStates(base, local, base).systems, local.systems);
  assert.deepEqual(mergeStates(base, base, local).systems, local.systems);
  assert.deepEqual(mergeStates(base, local, local), local);
});

test('different systems edited on each device both survive, and new ones from both sides are kept', () => {
  const base = doc(1, { systems: [system('a'), system('b')] });
  const local = doc(2, { systems: [system('a', { favorite: true }), system('b'), system('c')] });
  const remote = doc(3, { systems: [system('a'), system('b', { rating: 4 }), system('d')] });
  const merged = mergeStates(base, local, remote).systems as Record<string, unknown>[];
  assert.deepEqual(
    merged.map(item => item.id),
    ['a', 'b', 'c', 'd']
  );
  assert.equal(merged[0]?.favorite, true);
  assert.equal(merged[1]?.rating, 4);
});

test('different fields of one system merge; the same field goes to the copy saved last', () => {
  const base = doc(1, { systems: [system('a', { notes: '', rating: 0 })] });
  const local = doc(5, { systems: [system('a', { notes: 'phone', rating: 2 })] });
  const remote = doc(3, { systems: [system('a', { notes: 'pc', favorite: true })] });
  const merged = (mergeStates(base, local, remote).systems as Record<string, unknown>[])[0]!;
  assert.equal(merged.notes, 'phone'); // local was saved later
  assert.equal(merged.rating, 2);
  assert.equal(merged.favorite, true);
  assert.equal((mergeStates(base, remote, local).systems as Record<string, unknown>[])[0]?.notes, 'phone');
});

test('a deletion wins over an untouched copy, and an edit wins over a deletion', () => {
  const base = doc(1, { systems: [system('a'), system('b')] });
  const deleted = doc(2, { systems: [system('b')] });
  assert.deepEqual(
    (mergeStates(base, deleted, base).systems as Record<string, unknown>[]).map(item => item.id),
    ['b']
  );
  const edited = doc(3, { systems: [system('a', { notes: 'still here' }), system('b')] });
  const merged = mergeStates(base, deleted, edited).systems as Record<string, unknown>[];
  assert.deepEqual(
    merged.map(item => item.id),
    ['b', 'a']
  );
});

test('visits from both devices are combined by time, tags merge as sets', () => {
  const base = doc(1, { systems: [system('a', { tags: ['outlaw', 'old'], visits: [{ at: at(1) }] })] });
  const local = doc(2, {
    systems: [system('a', { tags: ['outlaw', 'trade-hub'], visits: [{ at: at(1) }, { at: at(2), packets: 15 }] })]
  });
  const remote = doc(3, {
    systems: [system('a', { tags: ['outlaw', 'old', 'farm'], visits: [{ at: at(1) }, { at: at(3) }] })]
  });
  const merged = (mergeStates(base, local, remote).systems as Record<string, unknown>[])[0]!;
  assert.deepEqual(merged.tags, ['outlaw', 'trade-hub', 'farm']);
  assert.deepEqual(merged.visits, [{ at: at(1) }, { at: at(2), packets: 15 }, { at: at(3) }]);
});

test('a first pairing (no base) combines both logs and drops nothing', () => {
  const local = doc(2, { systems: [system('a')], checklists: { cs1: true } });
  const remote = doc(3, { systems: [system('b')], checklists: { cs2: true } });
  const merged = mergeStates(undefined, local, remote);
  assert.deepEqual(
    (merged.systems as Record<string, unknown>[]).map(item => item.id),
    ['a', 'b']
  );
  assert.deepEqual(merged.checklists, { cs1: true, cs2: true });
  assert.equal((merged.meta as Record<string, unknown>).lastUpdated, at(3));
});

test('merging is idempotent, and two built states merge into a state that builds again', () => {
  const base = buildState(doc(1, { systems: [system('a')] }));
  const local = buildState(doc(2, { systems: [system('a', { notes: 'x' })] }));
  const remote = buildState(doc(3, { systems: [system('a'), system('b')] }));
  const once = mergeStates(base, local, remote);
  assert.ok(deepEqual(mergeStates(base, once, remote), once));
  assert.ok(deepEqual(mergeStates(remote, once, once), once));
  const rebuilt = buildState(once);
  assert.deepEqual(
    rebuilt.systems.map(item => [item.id, item.notes]),
    [
      ['a', 'x'],
      ['b', '']
    ]
  );
});

test('lists without unique keys are taken whole from the newer copy', () => {
  const base = doc(1, { fleet: { multiTools: [{ name: 'A' }] } });
  const local = doc(2, { fleet: { multiTools: [{ name: 'A' }, { name: 'B' }] } });
  const remote = doc(3, { fleet: { multiTools: [{ name: 'C' }] } });
  assert.deepEqual((mergeStates(base, local, remote).fleet as Record<string, unknown>).multiTools, [{ name: 'C' }]);
});

test('deepEqual ignores key order and undefined keys', () => {
  assert.ok(deepEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 }));
  assert.ok(deepEqual({ a: 1, b: undefined }, { a: 1 }));
  assert.ok(!deepEqual({ a: 1 }, { a: '1' }));
  assert.ok(!deepEqual([1, 2], [2, 1]));
});

test('a sync code derives the same keys every time, and a link or spaced code parses', async () => {
  const code = newSyncCode();
  assert.match(code, /^[A-Za-z0-9_-]{43}$/);
  const [one, two] = await Promise.all([deriveSyncKeys(code), deriveSyncKeys(code)]);
  assert.equal(one.vaultId, two.vaultId);
  assert.equal(one.token, two.token);
  assert.notEqual(one.vaultId, one.token.slice(0, 22));
  assert.equal(await hashToken(one.token), await hashToken(two.token));
  assert.equal(parseSyncCode(`https://relmaur.github.io/nms-os/#pair=${code}`), code);
  assert.equal(parseSyncCode(`  ${code.slice(0, 20)} ${code.slice(20)}\n`), code);
  assert.equal(parseSyncCode('not a code'), null);
});

test('a sealed copy opens with its code only', async () => {
  const keys = await deriveSyncKeys(newSyncCode());
  const json = JSON.stringify(buildState());
  const sealed = await sealState(keys, json);
  assert.equal(sealed[0], 1);
  assert.ok(!new TextDecoder().decode(sealed).includes('Dissonant')); // not readable on the server
  assert.equal(await openState(keys, sealed), json);
  const other = await deriveSyncKeys(newSyncCode());
  await assert.rejects(openState(other, sealed));
  const tampered = sealed.slice();
  tampered[20] = (tampered[20] ?? 0) ^ 1;
  await assert.rejects(openState(keys, tampered));
});
