import { beforeEach, expect, test } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeIndex } from '@atlas/core/codex';
import { prepare } from '@atlas/core/search';
import { Codex } from './Codex.tsx';
import { setCodexForTests } from './codex-data.ts';

const entries = [
  {
    title: 'Oxygen',
    category: 'resources',
    path: 'wiki/resources/Oxygen.md',
    source: 'wiki',
    summary: 'A gas.',
    // Under happy-dom, DOMPurify drops the tags of a document's first element (browsers don't), so the fixture
    // opens with a paragraph to keep both headings.
    body: '# Oxygen\n\nAn element.\n\n## Quick Facts\n\nBreathe.\n\n## Uses\n\nMany.'
  },
  {
    title: 'Life Support Gel',
    category: 'products',
    path: 'wiki/products/Life_Support_Gel.md',
    source: 'wiki',
    summary: 'A gel.',
    body: '# Life Support Gel\n\nMade from [[Oxygen]] and [[Nowhere]].',
    recipes: [{ type: 'craft', inputs: [{ name: 'Oxygen' }] }]
  }
].map(prepare);

const at = (hash: string) => {
  act(() => {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
};

beforeEach(() => {
  at('#/');
  act(() => {
    setCodexForTests({ status: 'ready', index: makeIndex(entries, {}), verification: null });
  });
});

test('an article puts its index first: a bar with counts, opening a sheet at the chosen list', async () => {
  render(<Codex />);
  at(`#/a/${encodeURIComponent('wiki/resources/Oxygen.md')}`);
  expect(screen.getByRole('heading', { level: 1, name: 'Oxygen' })).toBeTruthy();
  const bar = document.getElementById('articleIndexBar')!;
  expect(bar.textContent).toContain('Contents2');
  expect(bar.textContent).toContain('Used in1');
  await userEvent.click(within(bar).getByRole('button', { name: /Used in/ }));
  const sheet = document.getElementById('articleIndexSheet')!;
  expect(sheet.getAttribute('aria-hidden')).toBe('false');
  expect(within(sheet).getAllByRole('link', { name: 'Life Support Gel' }).length).toBeGreaterThan(0); // used in, and mentioned in
  await userEvent.click(sheet.querySelector<HTMLButtonElement>('[data-sheet-handle]')!); // the bar (the ✕ shows from md)
  expect(sheet.getAttribute('aria-hidden')).toBe('true');
});

test('wiki links resolve to Codex articles, or stay plain text when the page isn’t archived', () => {
  render(<Codex />);
  at(`#/a/${encodeURIComponent('wiki/products/Life_Support_Gel.md')}`);
  const body = document.getElementById('articleBody')!;
  expect(within(body).getByRole('link', { name: 'Oxygen' }).getAttribute('href')).toBe(
    `#/a/${encodeURIComponent('wiki/resources/Oxygen.md')}`
  );
  expect(within(body).queryByRole('link', { name: 'Nowhere' })).toBeNull();
  expect(body.textContent).toContain('Nowhere');
});

test('search results open a quick look; Escape closes it', async () => {
  render(<Codex />);
  at('#/?q=gel');
  await userEvent.click(screen.getByRole('button', { name: /Life Support Gel/ }));
  expect(document.getElementById('peekPanel')?.getAttribute('aria-hidden')).toBe('false');
  expect(document.getElementById('peekTitle')?.textContent).toBe('Life Support Gel');
  await userEvent.keyboard('{Escape}');
  expect(document.getElementById('peekPanel')?.getAttribute('aria-hidden')).toBe('true');
});

test('an unknown article says so', () => {
  render(<Codex />);
  at('#/a/wiki%2Fnope.md');
  expect(screen.getByRole('heading', { name: 'Article not found' })).toBeTruthy();
});
