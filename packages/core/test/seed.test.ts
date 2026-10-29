import { expect, test } from 'vitest';
import { Rng, seedOf, sha256Hex } from '../src/seed.ts';

test('sha-256 matches the standard test vectors', () => {
  expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  // Two blocks (56 bytes), and UTF-8 beyond ASCII.
  expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
  );
  expect(sha256Hex('Aeron-ημ')).toBe(sha256Hex('Aeron-ημ')); // stable
  expect(sha256Hex('a'.repeat(1000))).toBe('41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3');
});

// Vectors taken from the design's reference code (cards.py: seed_of and RNG).
test('seeds and the PRNG stream match the design reference exactly', () => {
  expect(sha256Hex('Euclid|0123456789AB|L')).toBe('b29d9f84708014351c7b823e9ad1685799de933df05c3818166cfd37c0901be1');
  expect(seedOf('Euclid', '0123456789AB', 'L')).toBe(2996674436);
  expect(seedOf('a')).toBe(3398926610);
  expect(seedOf('')).toBe(3820012610);
  const rng = new Rng(2996674436);
  expect(Array.from({ length: 5 }, () => rng.next())).toEqual([
    0.4960752648767084, 0.14605707838200033, 0.9934830782003701, 0.7245366394054145, 0.9981167260557413
  ]);
  const other = new Rng(12345);
  expect([other.next(), other.next(), other.next()]).toEqual([
    0.9797282677609473, 0.3067522644996643, 0.484205421525985
  ]);
  expect(new Rng(1).range(-1, 1)).toBeGreaterThanOrEqual(-1);
});
