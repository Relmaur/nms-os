import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, IconButton, buttonClass } from './Button.tsx';

test('the primary button is tint and edge, never a solid fill', () => {
  const classes = buttonClass('primary');
  expect(classes).toContain('bg-ready-emerald-tint');
  expect(classes).toContain('border-ready-emerald-edge');
  expect(classes).not.toMatch(/(^|\s)bg-ready-emerald(\s|$)/);
  expect(classes).toContain('h-12'); // primary defaults to L
  expect(buttonClass('secondary')).toContain('h-[42px]');
});

test('a button runs its action, and a loading one is busy and shows its label', async () => {
  const onClick = vi.fn();
  const { rerender } = render(
    <Button variant="primary" icon="ph-floppy-disk" onClick={onClick}>
      Save changes
    </Button>
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(onClick).toHaveBeenCalledTimes(1);
  rerender(
    <Button variant="primary" loading="Saving…" onClick={onClick}>
      Save changes
    </Button>
  );
  const busy = screen.getByRole('button', { name: 'Saving…' });
  expect(busy.getAttribute('aria-busy')).toBe('true');
  expect((busy as HTMLButtonElement).disabled).toBe(true);
});

test('an icon button is named by its label', async () => {
  const onClick = vi.fn();
  render(<IconButton icon="ph-plus" label="Add gear" onClick={onClick} />);
  await userEvent.click(screen.getByRole('button', { name: 'Add gear' }));
  expect(onClick).toHaveBeenCalledTimes(1);
});
