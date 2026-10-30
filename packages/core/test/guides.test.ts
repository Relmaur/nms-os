import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  BOOKS,
  CHECKLISTS,
  CHECKLIST_BOOK,
  MILESTONE_BOOK,
  bookChecks,
  guideProgress,
  milestoneHint,
  nextMilestone
} from '../src/guides.ts';
import type { GearItem } from '../src/gear.ts';

test('checklist ids are unique', () => {
  const ids = Object.values(CHECKLISTS)
    .flat()
    .map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every checklist sits in a known book', () => {
  const keys = new Set(BOOKS.map(book => book.key));
  for (const book of Object.values(CHECKLIST_BOOK)) assert.ok(keys.has(book));
  // …and every milestone in one.
  for (const item of CHECKLISTS.milestones) {
    const book = MILESTONE_BOOK[item.id];
    assert.ok(book && keys.has(book), item.id);
  }
});

test('a book lists its milestones first, then its checklists, and every tick sits in one book', () => {
  assert.deepEqual(
    bookChecks('book1').map(group => group.label),
    ['Milestones', 'Cross-save', 'First five hours']
  );
  assert.deepEqual(
    bookChecks('book3')[0]?.items.map(item => item.id),
    ['sClassInterceptorSecured', 'sentinelRifleSecured']
  );
  const all = BOOKS.flatMap(book => bookChecks(book.key).flatMap(group => group.items.map(item => item.id)));
  assert.equal(all.length, Object.values(CHECKLISTS).flat().length);
  assert.equal(new Set(all).size, all.length);
});

test('progress counts ticked items per book and overall; unknown keys and false are not ticks', () => {
  const progress = guideProgress({ crossSaveLinked: true, cs1: true, eg1: true, eg2: false, stray: true });
  assert.equal(progress.done, 3);
  assert.equal(progress.total, 35);
  assert.equal(progress.pct, 9);
  assert.deepEqual(progress.perBook.book1, { done: 2, total: 16 });
  assert.deepEqual(progress.perBook.book3, { done: 0, total: 2 });
  assert.deepEqual(progress.perBook.book5, { done: 0, total: 5 });
  assert.deepEqual(progress.perBook.book6, { done: 1, total: 9 });
});

test('the next milestone is the first tick not yet made, in book order', () => {
  assert.equal(nextMilestone({})?.item.id, 'crossSaveLinked');
  const book1 = bookChecks('book1').flatMap(group => group.items.map(item => [item.id, true]));
  const next = nextMilestone(Object.fromEntries(book1));
  assert.equal(next?.item.id, 'nutrientIngestorInstalled');
  assert.equal(next.book.key, 'book2');
  const all = Object.values(CHECKLISTS)
    .flat()
    .map(item => [item.id, true]);
  assert.equal(nextMilestone(Object.fromEntries(all)), null);
});

test('the fleet hints at the ship and tool a milestone names, without ticking it', () => {
  const gear = (item: Partial<GearItem>): GearItem => ({
    id: 'g',
    kind: 'starship',
    name: '',
    class: '',
    type: '',
    role: '',
    superchargedSlots: [],
    slotLabels: {},
    notes: '',
    createdAt: '',
    ...item
  });
  const fleet = [
    gear({ name: 'Rook', type: 'Sentinel Interceptor', class: 'A' }),
    gear({ name: 'Ythgall', type: 'Sentinel Interceptor', class: 'A -> S' }),
    gear({ name: 'Defiance of Thought', kind: 'multitool', type: 'Sentinel' })
  ];
  assert.equal(milestoneHint('sClassInterceptorSecured', fleet), 'Ythgall · logged in your fleet');
  assert.equal(milestoneHint('sentinelRifleSecured', fleet), 'Defiance of Thought · logged in your fleet');
  assert.equal(milestoneHint('sClassInterceptorSecured', fleet.slice(0, 1)), null);
  assert.equal(milestoneHint('cs1', fleet), null);
});

test('no checklists means 0%', () => {
  assert.equal(guideProgress({}).pct, 0);
});
