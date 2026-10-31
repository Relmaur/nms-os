import { expect, test } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { showSection } from '../shell/section-store.ts';
import { LogSegment } from './LogSegment.tsx';

test('the Log segment links Systems, Map, Fleet and Notes and marks the open one', () => {
  document.body.innerHTML =
    '<section id="sec-systems"></section><section id="sec-map"></section><section id="sec-gear"></section><section id="sec-notes"></section>';
  render(<LogSegment />);
  const nav = screen.getByRole('navigation', { name: 'Log sections' });
  const links = screen.getAllByRole('link');
  expect(nav).toBeTruthy();
  expect(links.map(link => [link.textContent, link.getAttribute('href')])).toEqual([
    ['Systems', '#systems'],
    ['Map', '#map'],
    ['Fleet', '#gear'],
    ['Notes', '#notes']
  ]);
  act(() => {
    void showSection('gear');
  });
  expect(screen.getByRole('link', { name: 'Fleet' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: 'Systems' }).getAttribute('aria-current')).toBeNull();
});
