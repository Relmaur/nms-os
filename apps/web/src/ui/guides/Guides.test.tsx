import { beforeEach, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildState } from '@atlas/core/state';
import { appState, setAppState } from '../../app/store.ts';
import { Guides } from './Guides.tsx';
import { Book } from './Book.tsx';

beforeEach(() => {
  localStorage.clear();
  // Only the ticks given here (the built-in state ticks some milestones).
  const state = buildState();
  state.checklists = { crossSaveLinked: true };
  setAppState(state);
});

test('a checklist step is a checkbox that ticks from the keyboard, and Guides counts it', async () => {
  render(
    <>
      <Guides />
      <Book book="book1" />
    </>
  );
  expect(document.getElementById('guidesProgressText')?.textContent).toBe('1 of 35 steps');
  const step = screen.getByRole('checkbox', { name: /Nutrient Ingestor Installed/ });
  expect((step as HTMLInputElement).checked).toBe(false);
  step.focus();
  await userEvent.keyboard(' ');
  expect(appState.checklists.nutrientIngestorInstalled).toBe(true);
  expect((step as HTMLInputElement).checked).toBe(true);
  expect(document.getElementById('guidesProgressText')?.textContent).toBe('2 of 35 steps');
  const row = within(document.getElementById('guidesList')!).getByRole('link', { name: /Cross-Save & First Hours/ });
  expect(row.textContent).toContain('2/23');
});

test('a book links back to Guides and to its neighbours', () => {
  render(<Book book="book3" />);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Starship & Multi-Tool Meta');
  expect(screen.getByRole('link', { name: 'Guides' }).getAttribute('href')).toBe('#guides');
  const pager = screen.getByRole('navigation', { name: 'More guides' });
  expect(
    within(pager)
      .getByRole('link', { name: /Book II/ })
      .getAttribute('href')
  ).toBe('#book2');
  expect(
    within(pager)
      .getByRole('link', { name: /Book IV/ })
      .getAttribute('href')
  ).toBe('#book4');
});
