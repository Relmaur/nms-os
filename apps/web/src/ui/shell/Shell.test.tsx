import { beforeEach, expect, test, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { loadAppState, setAppState } from '../../app/store.ts';
import { openSystem } from '../systems/panel-store.ts';
import { Search } from './Search.tsx';
import { Sidebar } from './Sidebar.tsx';
import { TabBar, tabOf } from './TabBar.tsx';
import { StorageBanner, reportStorage } from './StorageBanner.tsx';
import { showSection } from './section-store.ts';
import { setWikiEntries } from './wiki-index.ts';
import { prepare } from '@atlas/core/search';

vi.mock('../systems/panel-store.ts', () => ({ openSystem: vi.fn() }));

beforeEach(async () => {
  localStorage.clear();
  vi.stubGlobal('fetch', () => Promise.reject(new Error('offline'))); // no repo file: the browser copy only
  await act(async () => {
    await loadAppState(); // the frame's counts wait for a loaded state
  });
  const state = buildState({
    systems: [
      { id: 'sys-ekwa', name: 'Ekwa Nexus', region: 'Odyalutai', tags: ['outlaw'] },
      { id: 'sys-hesper', name: 'Hesper Drift' }
    ]
  });
  state.checklists = {};
  act(() => {
    setAppState(state);
  });
  document.body.innerHTML = '';
  for (const key of ['home', 'systems', 'gear', 'outlaw', 'more', 'book1']) {
    const section = document.createElement('section');
    section.id = `sec-${key}`;
    section.className = 'book-section';
    document.body.append(section);
  }
});

test('the search lists matching systems, moves with the arrows and opens the chosen one with Enter', async () => {
  render(<Search />);
  const input = screen.getByRole('combobox');
  await userEvent.type(input, 'e');
  const list = screen.getByRole('listbox');
  expect(within(list).getByText('Your systems')).toBeTruthy();
  expect(within(list).getAllByRole('option')).toHaveLength(2);
  await userEvent.keyboard('{ArrowDown}{ArrowDown}');
  expect(input.getAttribute('aria-activedescendant')).toBe('search-hit-1');
  await userEvent.keyboard('{Enter}');
  expect(openSystem).toHaveBeenCalledWith('sys-hesper');
  expect(input.getAttribute('aria-expanded')).toBe('false');
});

test('a search typed before the wiki index arrives fills in its wiki results when it does', async () => {
  render(<Search />);
  await userEvent.type(screen.getByRole('combobox'), 'oxygen');
  expect(screen.queryByText('Wiki articles')).toBeNull();
  act(() => {
    setWikiEntries([
      prepare({ title: 'Oxygen', category: 'resources', path: 'wiki/resources/Oxygen.md', summary: 'A gas.' })
    ]);
  });
  expect(within(screen.getByRole('listbox')).getByText('Wiki articles')).toBeTruthy();
});

test('a search with no match says so', async () => {
  render(<Search />);
  await userEvent.type(screen.getByRole('combobox'), 'zzzz');
  expect(screen.getByRole('listbox').textContent).toContain('Nothing matches “zzzz”');
});

test('the sidebar and tab bar mark the open section and count the log', () => {
  render(
    <>
      <Sidebar />
      <TabBar />
    </>
  );
  act(() => {
    void showSection('book1');
  });
  expect(document.getElementById('nav-guides')?.getAttribute('aria-current')).toBe('page'); // a book is in Guides
  expect(screen.getByRole('link', { name: 'Codex' }).getAttribute('aria-current')).toBe('page'); // and in the Codex tab
  expect(document.getElementById('sidebarSystemsCount')?.textContent).toBe('2');
  expect(document.getElementById('sidebarOutlawCount')?.textContent).toBe('1/1');
  // A ready station lights the Runs tab's live dot, and its name says how many.
  const runs = screen.getByRole('link', { name: /^Runs/ });
  expect(runs.textContent).toContain('1 station ready');
  expect(runs.querySelector('.tab-live')).not.toBeNull();
  act(() => {
    void showSection('gear');
  });
  expect(screen.getByRole('link', { name: 'Log' }).getAttribute('aria-current')).toBe('page'); // Fleet is in Log
  act(() => {
    void showSection('more');
  });
  expect(screen.getByRole('link', { name: /^Home/ }).getAttribute('aria-current')).toBe('page'); // Settings is Home's
});

test('tabOf files every section under one of the four tabs', () => {
  expect(['home', 'more'].map(tabOf)).toEqual(['home', 'home']);
  expect(['systems', 'gear', 'notes'].map(tabOf)).toEqual(['log', 'log', 'log']);
  expect(['outlaw', 'calculators'].map(tabOf)).toEqual(['runs', 'runs']);
  expect(['guides', 'book3'].map(tabOf)).toEqual(['codex', 'codex']);
  expect(tabOf('nowhere')).toBe('home');
});

test('the search key opens the search', async () => {
  render(
    <>
      <Search />
      <TabBar />
    </>
  );
  await userEvent.click(screen.getByRole('button', { name: 'Search and quick actions' }));
  expect(document.body.classList.contains('search-open')).toBe(true);
  expect(document.activeElement?.id).toBe('globalSearchInput');
  await userEvent.keyboard('{Escape}'); // leave the page as the other tests expect it
  expect(document.body.classList.contains('search-open')).toBe(false);
});

test('a failed save raises the banner with an export, and it can be dismissed', async () => {
  render(<StorageBanner />);
  expect(screen.queryByRole('alert')).toBeNull();
  act(() => {
    reportStorage({ saveFailed: true });
  });
  expect(screen.getByRole('alert').textContent).toContain('Not saved on this device');
  expect(screen.getByRole('button', { name: 'Export backup' })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(screen.queryByRole('alert')).toBeNull();
});
