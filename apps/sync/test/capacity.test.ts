import { expect, test } from 'vitest';
import { capacityState, clientKey, secondsToMidnightUtc, storageFull, usedShare, utcDay } from '../src/capacity.ts';

const usage = (requests: number, rowsRead = 0, rowsWritten = 0) => ({ requests, rowsRead, rowsWritten });

test('the free plan turns busy at 80% and full at 95% of any daily limit; paid never does', () => {
  expect(capacityState(usage(79_000), 'free')).toBe('ok');
  expect(capacityState(usage(80_000), 'free')).toBe('busy');
  expect(capacityState(usage(1000, 0, 95_000), 'free')).toBe('full'); // D1 writes run out first
  expect(capacityState(usage(10_000, 4_800_000), 'free')).toBe('full');
  expect(capacityState(usage(5_000_000, 50_000_000, 5_000_000), 'paid')).toBe('ok');
  expect(usedShare(usage(50_000, 0, 25_000), 'free')).toBe(0.5);
});

test('storage fills at 90% of the database cap', () => {
  expect(storageFull(449 * 1024 * 1024, 'free')).toBe(false);
  expect(storageFull(451 * 1024 * 1024, 'free')).toBe(true);
  expect(storageFull(451 * 1024 * 1024, 'paid')).toBe(false);
});

test('days and the wait until the limits reset are in UTC', () => {
  const now = Date.parse('2026-10-27T22:30:00Z');
  expect(utcDay(now)).toBe('2026-10-27');
  expect(secondsToMidnightUtc(now)).toBe(5400);
});

test('IPv6 clients are keyed by their /64, IPv4 by address', () => {
  expect(clientKey('203.0.113.7')).toBe('203.0.113.7');
  expect(clientKey('2605:59c8:7427:cd10:b016:69bf:eb67:d1c5')).toBe('2605:59c8:7427:cd10::/64');
  expect(clientKey('2605:59c8:7427:cd10::1')).toBe('2605:59c8:7427:cd10::/64');
  expect(clientKey('2001:db8::1')).toBe('2001:db8:0:0::/64');
  expect(clientKey('2001:DB8:0:0:ffff::')).toBe('2001:db8:0:0::/64');
  expect(clientKey('::ffff:198.51.100.4')).toBe('198.51.100.4');
  expect(clientKey('1:2:3:4:5:6:7:8:9::')).toBe('1:2:3:4::/64'); // malformed, but no crash
});
