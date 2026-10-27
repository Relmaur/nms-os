import { test } from 'vitest';
import assert from 'node:assert/strict';
import { evaluateRegister, extractorYield, formatUnits, haulValue } from '../src/calc.ts';

test('register expressions: arithmetic with precedence, parentheses and decimals', () => {
  assert.equal(evaluateRegister('6 - 2'), 4);
  assert.equal(evaluateRegister('11 + 5'), 16);
  assert.equal(evaluateRegister('2 + 3 * 4'), 14);
  assert.equal(evaluateRegister('(2 + 3) × 4'), 20);
  assert.equal(evaluateRegister('9 ÷ 2'), 4.5);
  assert.equal(evaluateRegister('-3 + 10'), 7);
  assert.equal(evaluateRegister('0.1 + 0.2'), 0.3);
  assert.equal(evaluateRegister(''), 0);
});

test('anything that is not arithmetic reads "?", and nothing typed runs', () => {
  for (const expr of ['2 +', '(1 + 2', 'alert(1)', '1 / 0', '2 2', 'Math.PI'])
    assert.equal(evaluateRegister(expr), '?');
});

test('extractor yield and haul value', () => {
  assert.deepEqual(extractorYield(4, 250, 353), { perHour: 1000, unitsPerHour: 353000, unitsPerDay: 8472000 });
  assert.equal(
    haulValue([
      { qty: 2, value: 100 },
      { qty: 5, value: undefined }
    ]),
    200
  );
  assert.equal(formatUnits(15_600_000), '15.6M');
  assert.equal(formatUnits(53_900), '53,900');
});
