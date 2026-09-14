import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculate,
  discount,
  operations,
  percentOf,
  percentOfWhat,
  percentageChange,
  percentageDecrease,
  percentageDifference,
  percentageIncrease,
  whatPercent,
  type CalcOutcome,
  type CalcResult,
} from './percentage.ts';

/** Unwrap a successful outcome, failing the test with the error message otherwise. */
function ok(outcome: CalcOutcome): CalcResult {
  assert.equal(outcome.ok, true, outcome.ok ? '' : `expected success, got: ${outcome.message}`);
  return (outcome as { ok: true; result: CalcResult }).result;
}

function err(outcome: CalcOutcome): { message: string; field?: string } {
  assert.equal(outcome.ok, false, 'expected a failure');
  return outcome as { ok: false; message: string; field?: string };
}

describe('percentOf — what is X% of Y', () => {
  test('the worked examples from the brief', () => {
    assert.equal(ok(percentOf({ percent: '20', value: '500' })).value, 100);
    assert.equal(ok(percentOf({ percent: '10', value: '1000' })).value, 100);
    assert.equal(ok(percentOf({ percent: '15', value: '800' })).value, 120);
    assert.equal(ok(percentOf({ percent: '25', value: '240' })).value, 60);
  });

  test('builds a readable headline and substituted formula', () => {
    const result = ok(percentOf({ percent: '20', value: '500' }));
    assert.equal(result.headline, '20% of 500 = 100');
    assert.equal(result.substituted, '(20 ÷ 100) × 500 = 100');
    assert.equal(result.steps.length, 2);
    assert.equal(result.steps[0]!.expression, '20 ÷ 100 = 0.2');
    assert.equal(result.steps[1]!.expression, '0.2 × 500 = 100');
  });

  test('decimals and percentages above 100', () => {
    assert.equal(ok(percentOf({ percent: '12.5', value: '80' })).value, 10);
    assert.equal(ok(percentOf({ percent: '150', value: '200' })).value, 300);
    assert.equal(ok(percentOf({ percent: '0.5', value: '200' })).value, 1);
  });

  test('zero is a valid answer, not an error', () => {
    assert.equal(ok(percentOf({ percent: '0', value: '500' })).value, 0);
    assert.equal(ok(percentOf({ percent: '20', value: '0' })).value, 0);
  });

  test('negative values are supported', () => {
    assert.equal(ok(percentOf({ percent: '20', value: '-500' })).value, -100);
    assert.equal(ok(percentOf({ percent: '-20', value: '500' })).value, -100);
  });

  test('large numbers stay exact', () => {
    assert.equal(ok(percentOf({ percent: '100', value: '123456789012345' })).value, 123456789012345);
    assert.equal(ok(percentOf({ percent: '50', value: '1,000,000,000' })).value, 500000000);
  });

  test('floating-point noise is cleaned up', () => {
    assert.equal(ok(percentOf({ percent: '30', value: '4.7' })).value, 1.41);
    assert.equal(ok(percentOf({ percent: '7', value: '3' })).value, 0.21);
  });

  test('empty and invalid input produce field-specific messages', () => {
    const empty = err(percentOf({ percent: '', value: '500' }));
    assert.equal(empty.field, 'percent');
    assert.match(empty.message, /Enter a value/);

    const invalid = err(percentOf({ percent: 'abc', value: '500' }));
    assert.equal(invalid.field, 'percent');
    assert.match(invalid.message, /must be a number/);

    for (const message of [empty.message, invalid.message]) {
      assert.doesNotMatch(message, /NaN|Infinity|undefined/);
    }
  });
});

describe('whatPercent — X is what percent of Y', () => {
  test('the worked example from the brief', () => {
    const result = ok(whatPercent({ part: '25', whole: '200' }));
    assert.equal(result.value, 12.5);
    assert.equal(result.display, '12.5%');
    assert.equal(result.headline, '25 is 12.5% of 200');
  });

  test('handles parts larger than the whole', () => {
    assert.equal(ok(whatPercent({ part: '250', whole: '200' })).value, 125);
  });

  test('a repeating decimal is flagged as rounded', () => {
    const result = ok(whatPercent({ part: '1', whole: '3' }));
    assert.equal(result.rounded, true);
    assert.ok(result.display.startsWith('33.33'));
  });

  test('division by zero is refused with a plain-language message', () => {
    const failure = err(whatPercent({ part: '25', whole: '0' }));
    assert.equal(failure.field, 'whole');
    assert.match(failure.message, /cannot be zero/);
    assert.doesNotMatch(failure.message, /NaN|Infinity/);
  });

  test('zero as the part is a valid 0% answer', () => {
    assert.equal(ok(whatPercent({ part: '0', whole: '200' })).value, 0);
  });
});

describe('percentOfWhat — X is Y% of what number', () => {
  test('the worked example from the brief', () => {
    const result = ok(percentOfWhat({ part: '50', percent: '20' }));
    assert.equal(result.value, 250);
    assert.equal(result.headline, '50 is 20% of 250');
  });

  test('a zero percentage has no single answer and is refused', () => {
    const failure = err(percentOfWhat({ part: '50', percent: '0' }));
    assert.equal(failure.field, 'percent');
    assert.match(failure.message, /cannot be zero/);
  });

  test('round-trips against percentOf', () => {
    const whole = ok(percentOfWhat({ part: '37.5', percent: '15' })).value;
    assert.equal(ok(percentOf({ percent: '15', value: String(whole) })).value, 37.5);
  });
});

describe('percentage increase / decrease / change', () => {
  test('the worked examples from the brief', () => {
    assert.equal(ok(percentageIncrease({ original: '100', final: '150' })).value, 50);
    assert.equal(ok(percentageDecrease({ original: '200', final: '150' })).value, -25);
    assert.equal(ok(percentageIncrease({ original: '100', final: '125' })).value, 25);
  });

  test('applying an increase and a decrease to a base value', () => {
    // 25% increase from 100 = 125; 20% decrease from 200 = 160.
    assert.equal(ok(percentOf({ percent: '125', value: '100' })).value, 125);
    assert.equal(ok(percentOf({ percent: '80', value: '200' })).value, 160);
  });

  test('reports direction and displays magnitude, never a bare negative', () => {
    const down = ok(percentageChange({ original: '200', final: '150' }));
    assert.equal(down.direction, 'decrease');
    assert.equal(down.display, '25%');
    assert.equal(down.value, -25);
    assert.match(down.headline, /decrease/);
  });

  test('corrects the user when the value moved the other way', () => {
    const result = ok(percentageIncrease({ original: '200', final: '150' }));
    assert.equal(result.direction, 'decrease');
    assert.match(result.note ?? '', /decrease rather than an increase/);
  });

  test('identical values are no change, not an error', () => {
    const result = ok(percentageChange({ original: '100', final: '100' }));
    assert.equal(result.value, 0);
    assert.equal(result.direction, 'none');
    assert.match(result.headline, /no change/);
  });

  test('change from zero is undefined and refused', () => {
    const failure = err(percentageChange({ original: '0', final: '50' }));
    assert.equal(failure.field, 'original');
    assert.match(failure.message, /undefined/);
    assert.doesNotMatch(failure.message, /NaN|Infinity/);
  });

  test('a negative original is measured against its absolute value and says so', () => {
    const result = ok(percentageChange({ original: '-50', final: '-25' }));
    assert.equal(result.value, 50);
    assert.equal(result.direction, 'increase');
    assert.match(result.note ?? '', /negative/);
  });

  test('handles decimals without float noise', () => {
    assert.equal(ok(percentageIncrease({ original: '2.5', final: '3' })).value, 20);
  });

  test('shows three explanation steps for a rise', () => {
    const result = ok(percentageIncrease({ original: '100', final: '150' }));
    assert.equal(result.steps.length, 3);
    assert.equal(result.steps[0]!.expression, '150 − 100 = 50');
    assert.equal(result.steps[1]!.expression, '50 ÷ 100 = 0.5');
    assert.equal(result.steps[2]!.expression, '0.5 × 100 = 50%');
  });

  test('a fall is shown as Original − New so the working reaches a positive figure', () => {
    const result = ok(percentageDecrease({ original: '200', final: '150' }));
    assert.equal(result.formula, '((Original − New) ÷ |Original|) × 100');
    assert.equal(result.substituted, '((200 − 150) ÷ 200) × 100 = 25%');
    assert.equal(result.steps[0]!.expression, '200 − 150 = 50');
    assert.equal(result.steps[1]!.expression, '50 ÷ 200 = 0.25');
    assert.equal(result.steps[2]!.expression, '0.25 × 100 = 25%');
    // The signed value is still available to callers that need the direction.
    assert.equal(result.value, -25);
  });

  test('the working always ends at the figure shown as the answer', () => {
    for (const [original, final] of [
      ['100', '150'],
      ['200', '150'],
      ['45000', '52000'],
      ['180', '126'],
      ['3', '7'],
    ]) {
      const result = ok(percentageChange({ original: original!, final: final! }));
      const lastStep = result.steps.at(-1)!.expression;
      assert.ok(
        lastStep.endsWith(result.display),
        `final step "${lastStep}" should end at "${result.display}"`,
      );
      assert.ok(result.substituted.endsWith(result.display));
    }
  });
});

describe('percentageDifference', () => {
  test('uses the average of the two values as the reference', () => {
    // |100 - 120| / 110 * 100 = 18.1818...
    const result = ok(percentageDifference({ a: '100', b: '120' }));
    assert.ok(result.display.startsWith('18.18'));
    assert.equal(result.rounded, true);
  });

  test('is symmetric — order does not matter', () => {
    const forwards = ok(percentageDifference({ a: '100', b: '120' })).value;
    const backwards = ok(percentageDifference({ a: '120', b: '100' })).value;
    assert.equal(forwards, backwards);
  });

  test('differs from percentage change, which is not symmetric', () => {
    const difference = ok(percentageDifference({ a: '100', b: '120' })).value;
    const change = ok(percentageChange({ original: '100', final: '120' })).value;
    assert.notEqual(difference, change);
    assert.equal(change, 20);
  });

  test('identical values give 0%', () => {
    assert.equal(ok(percentageDifference({ a: '50', b: '50' })).value, 0);
  });

  test('two zeros have no difference to express', () => {
    const failure = err(percentageDifference({ a: '0', b: '0' }));
    assert.match(failure.message, /zero/);
  });

  test('one zero value is still well defined', () => {
    // |0 - 50| / 25 * 100 = 200
    assert.equal(ok(percentageDifference({ a: '0', b: '50' })).value, 200);
  });

  test('explains how it differs from percentage change', () => {
    const result = ok(percentageDifference({ a: '100', b: '120' }));
    assert.match(result.note ?? '', /symmetric/);
  });
});

describe('discount', () => {
  test('the worked example from the brief', () => {
    const result = ok(discount({ price: '100', percent: '20' }));
    assert.equal(result.value, 80);
    assert.deepEqual(
      result.extras?.map((e) => e.value),
      ['20', '80'],
    );
  });

  test('applies a currency symbol without any external lookup', () => {
    const result = ok(discount({ price: '2499', percent: '15', currency: '₹' }));
    assert.equal(result.value, 2124.15);
    assert.equal(result.display, '₹2,124.15');
    assert.match(result.headline, /₹2,499/);
  });

  test('0% and 100% are both valid', () => {
    assert.equal(ok(discount({ price: '100', percent: '0' })).value, 100);
    assert.equal(ok(discount({ price: '100', percent: '100' })).value, 0);
  });

  test('rejects discounts outside 0-100%', () => {
    assert.match(err(discount({ price: '100', percent: '120' })).message, /between 0% and 100%/);
    assert.match(err(discount({ price: '100', percent: '-5' })).message, /between 0% and 100%/);
  });

  test('rejects a negative price', () => {
    assert.equal(err(discount({ price: '-100', percent: '20' })).field, 'price');
  });

  test('money rounds to two decimal places without float noise', () => {
    const result = ok(discount({ price: '19.99', percent: '33' }));
    assert.equal(result.display, '13.39');
  });

  test('a fractional amount always shows both decimal places', () => {
    const result = ok(discount({ price: '249.99', percent: '35' }));
    assert.deepEqual(
      result.extras?.map((e) => e.value),
      ['87.50', '162.49'],
    );
    assert.equal(result.display, '162.49');
    assert.equal(result.rounded, true);
  });

  test('a whole amount is not padded with needless decimals', () => {
    const result = ok(discount({ price: '100', percent: '20' }));
    assert.deepEqual(
      result.extras?.map((e) => e.value),
      ['20', '80'],
    );
  });

  test('large money values keep thousands grouping', () => {
    const result = ok(discount({ price: '125000', percent: '12.5', currency: '$' }));
    assert.equal(result.display, '$109,375');
    assert.deepEqual(result.extras?.[0]?.value, '$15,625');
  });
});

describe('calculate — the dispatch used by the UI', () => {
  test('routes every registered operation id', () => {
    // Driven off the registry so a new calculator cannot be added without
    // being covered here.
    const sampleInputs = {
      percent: '20', value: '500', part: '25', whole: '200',
      original: '100', final: '150', a: '100', b: '120', price: '100',
      score: '38', total: '50', wins: '10', losses: '5',
      values: '80, 90', start: '200', current: '180',
      amount: '100', rate: '20',
      height: '178', neck: '38', waist: '85', hip: '95', unit: 'cm',
    };
    const ids = Object.keys(operations) as Array<keyof typeof operations>;
    assert.ok(ids.length >= 17, `expected the full registry, saw ${ids.length}`);
    for (const id of ids) {
      const outcome = calculate(id, sampleInputs);
      assert.equal(outcome.ok, true, `${id} should calculate`);
    }
  });

  test('an unknown operation fails closed instead of throwing', () => {
    // @ts-expect-error deliberately passing an id outside the union
    assert.equal(calculate('nope', {}).ok, false);
  });

  test('no operation ever surfaces a raw NaN or Infinity to the user', () => {
    const hostile = [
      { percent: '', value: '' },
      { percent: 'abc', value: 'def' },
      { part: '1', whole: '0' },
      { original: '0', final: '5' },
      { a: '0', b: '0' },
      { price: '1e400', percent: '20' },
    ];
    for (const id of Object.keys(operations) as Array<Parameters<typeof calculate>[0]>) {
      for (const inputs of hostile) {
        const outcome = calculate(id, inputs);
        if (outcome.ok) {
          // A rendered result is pure generated text, so a stray `undefined`
          // there can only have come from an unfilled template slot.
          assert.doesNotMatch(
            JSON.stringify(outcome.result),
            /NaN|Infinity|undefined/,
            `${id} leaked a raw value into its result`,
          );
        } else {
          // Error copy is prose and may legitimately say "undefined" in the
          // mathematical sense, but must never echo a JS literal.
          assert.doesNotMatch(outcome.message, /NaN|Infinity/, `${id} leaked a raw value into its error`);
        }
      }
    }
  });
});
