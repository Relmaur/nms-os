import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ARM_MS, ArmButton, HOLD_MS, HoldToActivate, SlideToActivate, slideProgress } from './Gesture.tsx';

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance']
  });
});
afterEach(() => {
  vi.useRealTimers();
});

test('a slide completes only past 85% of its travel', () => {
  expect(slideProgress(0, 280)).toEqual({ progress: 0, completes: false });
  expect(slideProgress(230, 280).completes).toBe(false); // 82%
  expect(slideProgress(240, 280).completes).toBe(true); // 86%
  expect(slideProgress(400, 280)).toEqual({ progress: 1, completes: true });
  expect(slideProgress(-20, 280).progress).toBe(0);
  expect(slideProgress(10, 0).progress).toBe(0); // not laid out yet
});

function renderSlide() {
  const onActivate = vi.fn();
  render(
    <SlideToActivate label="Warped somewhere new" action="log a new system" result="Logged" onActivate={onActivate} />
  );
  const track = screen.getByRole('button', { name: 'Warped somewhere new: slide or activate to log a new system' });
  Object.defineProperty(track, 'clientWidth', { value: 342 }); // a 390px screen less its gutters; travel is 284
  const knob = track.querySelector<HTMLElement>('[data-knob]');
  if (!knob) throw new Error('no knob');
  return { onActivate, track, knob };
}

test('a tap on the slide does nothing; dragging part way springs back', () => {
  const { onActivate, track, knob } = renderSlide();
  fireEvent.click(track, { detail: 1 });
  fireEvent.pointerDown(knob, { clientX: 20, pointerId: 1 });
  fireEvent.pointerMove(knob, { clientX: 200, pointerId: 1 }); // 63%
  fireEvent.pointerUp(knob, { clientX: 200, pointerId: 1 });
  expect(onActivate).not.toHaveBeenCalled();
  expect(knob.style.left).toBe('5px');
});

test('dragging the knob past 85% logs, shows the result, then rests again', () => {
  const { onActivate, track, knob } = renderSlide();
  fireEvent.pointerDown(knob, { clientX: 20, pointerId: 1 });
  fireEvent.pointerMove(knob, { clientX: 270, pointerId: 1 }); // 88%
  fireEvent.pointerUp(knob, { clientX: 270, pointerId: 1 });
  expect(onActivate).toHaveBeenCalledTimes(1);
  expect(track.textContent).toContain('Logged');
  act(() => {
    vi.advanceTimersByTime(1200);
  });
  expect(track.textContent).toContain('Warped somewhere new');
  expect(knob.style.left).toBe('5px');
});

test('the keyboard and screen readers activate the slide in one action', () => {
  const { onActivate, track } = renderSlide();
  fireEvent.keyDown(track, { key: 'Enter' });
  expect(onActivate).toHaveBeenCalledTimes(1);
  act(() => {
    vi.advanceTimersByTime(1200);
  });
  fireEvent.click(track, { detail: 0 }); // what VoiceOver's double-tap and a keyboard click send
  expect(onActivate).toHaveBeenCalledTimes(2);
});

test('a disabled slide says why and never fires', () => {
  const onActivate = vi.fn();
  render(
    <SlideToActivate label="Warped somewhere new" action="log" disabled="Log a system first" onActivate={onActivate} />
  );
  const track = screen.getByRole('button', { name: 'Warped somewhere new: Log a system first' });
  expect((track as HTMLButtonElement).disabled).toBe(true);
  fireEvent.keyDown(track, { key: 'Enter' });
  expect(onActivate).not.toHaveBeenCalled();
});

test('holding for 600ms starts it; letting go early does nothing', () => {
  const onActivate = vi.fn();
  render(<HoldToActivate label="Hold to start session" hint="Counts systems" onActivate={onActivate} />);
  const button = screen.getByRole('button', { name: /^Hold to start session.*, press and hold$/ });
  fireEvent.pointerDown(button, { button: 0 });
  act(() => {
    vi.advanceTimersByTime(HOLD_MS / 2);
  });
  fireEvent.pointerUp(button);
  act(() => {
    vi.advanceTimersByTime(HOLD_MS);
  });
  expect(onActivate).not.toHaveBeenCalled();
  fireEvent.pointerDown(button, { button: 0 });
  act(() => {
    vi.advanceTimersByTime(HOLD_MS + 50);
  });
  expect(onActivate).toHaveBeenCalledTimes(1);
  fireEvent.pointerUp(button); // releasing after it fired doesn't undo it
  expect(onActivate).toHaveBeenCalledTimes(1);
});

test('the keyboard holds Space; a screen reader presses once', () => {
  const onActivate = vi.fn();
  render(<HoldToActivate label="Hold to start session" hint="Counts systems" onActivate={onActivate} />);
  const button = screen.getByRole('button', { name: /Hold to start session/ });
  fireEvent.keyDown(button, { key: ' ' });
  fireEvent.keyDown(button, { key: ' ', repeat: true }); // key repeat doesn't restart the hold
  act(() => {
    vi.advanceTimersByTime(HOLD_MS + 50);
  });
  fireEvent.keyUp(button, { key: ' ' });
  expect(onActivate).toHaveBeenCalledTimes(1);
  fireEvent.click(button, { detail: 0 });
  expect(onActivate).toHaveBeenCalledTimes(2);
});

test('once running, the hold shows its done state and can no longer be pressed', () => {
  const onActivate = vi.fn();
  render(
    <HoldToActivate
      label="Hold to start session"
      hint="Counts systems"
      onActivate={onActivate}
      done={{ label: 'Session live', hint: '00:00:01 · tap the bar to stop' }}
    />
  );
  const button = screen.getByRole('button', { name: /^Session live/ });
  expect(button.getAttribute('aria-disabled')).toBe('true');
  fireEvent.pointerDown(button, { button: 0 });
  act(() => {
    vi.advanceTimersByTime(HOLD_MS + 50);
  });
  fireEvent.click(button, { detail: 0 });
  expect(onActivate).not.toHaveBeenCalled();
});

test('tap to arm confirms only on a second tap within 3s', () => {
  const onConfirm = vi.fn();
  render(<ArmButton label="Delete the cloud copy" armedLabel="Tap again to delete" onConfirm={onConfirm} />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete the cloud copy' }));
  expect(onConfirm).not.toHaveBeenCalled();
  expect(screen.getByText('Tap again to delete, within 3 seconds')).toBeTruthy(); // announced
  act(() => {
    vi.advanceTimersByTime(ARM_MS + 10);
  });
  fireEvent.click(screen.getByRole('button', { name: 'Delete the cloud copy' })); // the window closed: arms again
  expect(onConfirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Tap again to delete' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Delete the cloud copy' })).toBeTruthy();
});

test('Esc or leaving the button disarms it', () => {
  const onConfirm = vi.fn();
  render(<ArmButton label="Delete the cloud copy" armedLabel="Tap again to delete" onConfirm={onConfirm} />);
  const button = screen.getByRole('button');
  fireEvent.click(button);
  fireEvent.keyDown(button, { key: 'Escape' });
  expect(button.textContent).toBe('Delete the cloud copy');
  fireEvent.click(button);
  fireEvent.blur(button);
  expect(button.textContent).toBe('Delete the cloud copy');
  expect(onConfirm).not.toHaveBeenCalled();
});
