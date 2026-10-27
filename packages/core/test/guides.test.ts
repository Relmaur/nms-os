import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BOOKS, CHECKLISTS, CHECKLIST_BOOK, guideProgress } from '../src/guides.ts';

test('checklist ids are unique', () => {
  const ids = Object.values(CHECKLISTS)
    .flat()
    .map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every checklist sits in a known book', () => {
  const keys = new Set(BOOKS.map(book => book.key));
  for (const book of Object.values(CHECKLIST_BOOK)) assert.ok(keys.has(book));
});

test('progress counts ticked items per book and overall; unknown keys and false are not ticks', () => {
  const progress = guideProgress({ crossSaveLinked: true, cs1: true, eg1: true, eg2: false, stray: true });
  assert.equal(progress.done, 3);
  assert.equal(progress.total, 35);
  assert.equal(progress.pct, 9);
  assert.deepEqual(progress.perBook.book1, { done: 2, total: 23 });
  assert.deepEqual(progress.perBook.book5, { done: 0, total: 5 });
  assert.deepEqual(progress.perBook.book6, { done: 1, total: 7 });
  assert.equal(progress.perBook.book2, undefined);
});

test('no checklists means 0%', () => {
  assert.equal(guideProgress({}).pct, 0);
});
