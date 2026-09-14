import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { cleanFloat, formatNumber, parseNumber, presentNumber, presentPercent } from './number.ts';

describe('parseNumber', () => {
  test('parses whole and decimal numbers', () => {
    assert.deepEqual(parseNumber('500'), { ok: true, value: 500 });
    assert.deepEqual(parseNumber('12.5'), { ok: true, value: 12.5 });
    assert.deepEqual(parseNumber('.5'), { ok: true, value: 0.5 });
    assert.deepEqual(parseNumber('0'), { ok: true, value: 0 });
  });

  test('parses negative numbers and a leading plus', () => {
    assert.deepEqual(parseNumber('-42'), { ok: true, value: -42 });
    assert.deepEqual(parseNumber('+42'), { ok: true, value: 42 });
  });

  test('accepts Western and Indian thousands grouping', () => {
    assert.deepEqual(parseNumber('1,234,567'), { ok: true, value: 1234567 });
    assert.deepEqual(parseNumber('12,34,567'), { ok: true, value: 1234567 });
    assert.deepEqual(parseNumber('1 234 567'), { ok: true, value: 1234567 });
  });

  test('tolerates a trailing percent sign and surrounding whitespace', () => {
    assert.deepEqual(parseNumber('  20%  '), { ok: true, value: 20 });
  });

  test('rejects empty input', () => {
    assert.deepEqual(parseNumber(''), { ok: false, reason: 'empty' });
    assert.deepEqual(parseNumber('   '), { ok: false, reason: 'empty' });
    assert.deepEqual(parseNumber(null), { ok: false, reason: 'empty' });
    assert.deepEqual(parseNumber(undefined), { ok: false, reason: 'empty' });
    assert.deepEqual(parseNumber('-'), { ok: false, reason: 'empty' });
  });

  test('rejects values Number() would silently accept', () => {
    for (const bad of ['abc', '12abc', '1.2.3', '0x1f', 'Infinity', '--5', '1,2e']) {
      assert.equal(parseNumber(bad).ok, false, `${bad} should be rejected`);
    }
  });

  test('flags overflow to infinity separately from invalid input', () => {
    assert.deepEqual(parseNumber('1e400'), { ok: false, reason: 'too-large' });
  });

  test('accepts exponential notation', () => {
    assert.deepEqual(parseNumber('1e6'), { ok: true, value: 1000000 });
  });
});

describe('cleanFloat', () => {
  test('removes binary floating-point noise', () => {
    assert.equal(cleanFloat(0.1 + 0.2), 0.3);
    assert.equal(cleanFloat(0.3 * 4.7), 1.41);
    assert.equal(cleanFloat(4.35 * 100), 435);
    assert.equal(cleanFloat(0.07 * 3), 0.21);
  });

  test('leaves large exact integers untouched', () => {
    assert.equal(cleanFloat(123456789012345), 123456789012345);
    assert.equal(cleanFloat(9007199254740991), 9007199254740991);
  });

  test('passes through non-finite values', () => {
    assert.equal(cleanFloat(Infinity), Infinity);
    assert.ok(Number.isNaN(cleanFloat(NaN)));
  });
});

describe('formatNumber', () => {
  test('groups thousands and trims trailing zeros', () => {
    assert.equal(formatNumber(1234567), '1,234,567');
    assert.equal(formatNumber(12.5), '12.5');
    assert.equal(formatNumber(100), '100');
    assert.equal(formatNumber(0), '0');
  });

  test('switches to exponential for extreme magnitudes', () => {
    assert.match(formatNumber(1e20), /e\+20$/);
    assert.match(formatNumber(1e-12), /e-12$/);
  });

  test('respects a fraction-digit cap', () => {
    assert.equal(formatNumber(1 / 3, 2), '0.33');
  });
});

describe('presentNumber', () => {
  test('marks a repeating decimal as rounded', () => {
    const shown = presentNumber(100 / 3);
    assert.equal(shown.rounded, true);
  });

  test('does not mark an exact value as rounded', () => {
    assert.deepEqual(presentNumber(100), { display: '100', rounded: false });
    assert.deepEqual(presentNumber(12.5), { display: '12.5', rounded: false });
  });
});

describe('presentPercent', () => {
  test('caps a repeating percentage at four decimal places', () => {
    const shown = presentPercent(100 / 3);
    assert.equal(shown.display, '33.3333%');
    assert.equal(shown.rounded, true);
  });

  test('leaves an exact percentage untouched', () => {
    assert.deepEqual(presentPercent(12.5), { display: '12.5%', rounded: false });
    assert.deepEqual(presentPercent(50), { display: '50%', rounded: false });
  });
});
