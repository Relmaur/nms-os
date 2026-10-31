import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { normalizeSystem } from '@atlas/core/systems-model';
import { drawPostcard } from './draw.ts';
import { ShareSystemSheet } from './ShareSheet.tsx';

vi.mock('./draw.ts', () => ({
  drawPostcard: vi.fn(),
  drawFleetCard: vi.fn(),
  loadShareFonts: () => Promise.resolve(),
  pictureBlob: () => Promise.resolve(new Blob())
}));
vi.mock('../gear/facts-store.ts', () => ({ useFacts: () => null, loadFacts: () => Promise.resolve() }));

const system = normalizeSystem({
  name: 'Masdalri Junction',
  galaxy: 'Euclid',
  notes: 'Main save planet',
  planets: [{ name: 'Buya', biome: 'Rotting' }]
});
const lastCard = () => vi.mocked(drawPostcard).mock.lastCall?.[1];

beforeEach(() => {
  vi.mocked(drawPostcard).mockClear();
});

test('notes start off the picture; a choice redraws it; a missing address can’t be chosen', async () => {
  render(<ShareSystemSheet system={system} open onClose={() => undefined} />);
  await vi.waitFor(() => {
    expect(lastCard()?.card.note).toBe('');
  });
  expect(lastCard()?.format).toBe('square');
  const notes = screen.getByRole('switch', { name: 'My notes' });
  expect(notes.getAttribute('aria-checked')).toBe('false');
  await userEvent.click(notes);
  await vi.waitFor(() => {
    expect(lastCard()?.card.note).toBe('Main save planet');
  });
  expect(screen.getByRole<HTMLButtonElement>('switch', { name: 'Portal address' }).disabled).toBe(true);
  await userEvent.click(screen.getByRole('radio', { name: 'Story' }));
  expect(screen.getByText('1080 × 1920')).toBeTruthy();
});

test('without a phone’s share sheet there’s Save and Copy, and no Share', () => {
  render(<ShareSystemSheet system={system} open onClose={() => undefined} />);
  expect(screen.getByRole('button', { name: 'Save picture' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Copy as text' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^Share/ })).toBeNull();
});
