import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { buildState } from '@atlas/core/state';
import { normalizeSystem } from '@atlas/core/systems-model';
import { setAppState } from '../../app/store.ts';
import { Frontier } from './Frontier.tsx';

vi.mock('../gear/facts-store.ts', () => ({ useFacts: () => null, loadFacts: () => Promise.resolve() }));
vi.mock('../shell/section-store.ts', () => ({ useSection: () => 'frontier' }));

beforeEach(() => {
  const state = buildState({});
  state.systems = [normalizeSystem({ name: 'Masdalri Junction', star: 'yellow', race: 'korvax' })];
  state.gear = [];
  setAppState(state);
});

test('it names the next first and what each collection holds', () => {
  render(<Frontier />);
  expect(screen.getByText('A purple star')).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Star colours' }).textContent).toMatch(/1 \/ 5.*All yellow so far/);
  expect(screen.getByRole('region', { name: 'Races met' }).textContent).toMatch(/Korvax in Masdalri Junction/);
  expect(screen.getByRole('link', { name: /purple star/ }).getAttribute('href')).toContain('wiki/#/?q=purple');
});
