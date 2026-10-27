import { expect, test, vi } from 'vitest';
import { toggleKeepAwake } from './device-store.ts';

// A lock the system can drop on its own, as browsers do on battery saver.
function fakeWakeLock() {
  const listeners: (() => void)[] = [];
  const sentinel = {
    released: false,
    addEventListener: (_: string, run: () => void) => listeners.push(run),
    release: vi.fn(() => {
      listeners.forEach(run => {
        run();
      });
      return Promise.resolve();
    })
  };
  const request = vi.fn(() => Promise.resolve(sentinel));
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  return { request, sentinel };
}

test('after the system drops the lock, one tap takes it again', async () => {
  const { request, sentinel } = fakeWakeLock();
  localStorage.setItem('atlas_keep_awake', '0');
  toggleKeepAwake();
  await vi.waitFor(() => {
    expect(request).toHaveBeenCalledTimes(1);
  });
  await sentinel.release(); // the system lets go; the wish to stay awake is still stored
  toggleKeepAwake();
  await vi.waitFor(() => {
    expect(request).toHaveBeenCalledTimes(2);
  });
  expect(localStorage.getItem('atlas_keep_awake')).toBe('1');
});
