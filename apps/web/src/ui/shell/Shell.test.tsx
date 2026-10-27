import { beforeEach, expect, test, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { loadAppState, setAppState } from '../../app/store.ts';
import { openSystem } from '../systems/panel-store.ts';
import { Search } from './Search.tsx';
import { Sidebar } from './Sidebar.tsx';
import { TabBar } from './TabBar.tsx';
import { StorageBanner, reportStorage } from './StorageBanner.tsx';
import { showSection } from './section-store.ts';

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
  for (const key of ['home', 'systems', 'outlaw', 'more', 'book1']) {
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
    showSection('book1');
  });
  expect(document.getElementById('nav-guides')?.getAttribute('aria-current')).toBe('page'); // a book is in Guides
  expect(screen.getByRole('link', { name: /More/ }).getAttribute('aria-current')).toBe('page');
  expect(document.getElementById('sidebarSystemsCount')?.textContent).toBe('2');
  expect(document.getElementById('sidebarOutlawCount')?.textContent).toBe('1/1');
  expect(document.getElementById('tabOutlawBadge')?.textContent).toBe('1');
  act(() => {
    showSection('systems');
  });
  expect(document.getElementById('nav-systems')?.getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: 'Systems' }).getAttribute('aria-current')).toBe('page');
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
