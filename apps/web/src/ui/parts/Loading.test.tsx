import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { CodexLoading, LoadFailed } from './Loading.tsx';

afterEach(() => {
  vi.restoreAllMocks();
});

test('placeholders are heard as one short status', () => {
  render(<CodexLoading />);
  expect(screen.getByRole('status').textContent).toContain('Loading the Codex');
});

test('offline, a failure says the data isn’t here yet, and offers another try', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  const retry = vi.fn();
  render(<LoadFailed what="The Codex" onRetry={retry} />);
  expect(screen.getByRole('alert').textContent).toMatch(/The Codex isn’t on this device yet.*Your log is safe/);
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledOnce();
});

test('online, it doesn’t blame the connection', () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  render(<LoadFailed what="The recipe data" onRetry={() => undefined} />);
  expect(screen.getByRole('alert').textContent).toMatch(/Couldn’t load the recipe data/);
});
