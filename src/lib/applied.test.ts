import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  averagePercent,
  bodyFatFemale,
  bodyFatMale,
  gradePercent,
  letterGrade,
  taxAdd,
  taxRate,
  taxRemove,
  weightLossPercent,
  winPercent,
  type CalcOutcome,
  type CalcResult,
} from './percentage.ts';

function ok(outcome: CalcOutcome): CalcResult {
  assert.equal(outcome.ok, true, outcome.ok ? '' : `expected success, got: ${outcome.message}`);
  return (outcome as { ok: true; result: CalcResult }).result;
}

function err(outcome: CalcOutcome): { message: string; field?: string } {
  assert.equal(outcome.ok, false, 'expected a failure');
  return outcome as { ok: false; message: string; field?: string };
}

const extra = (result: CalcResult, label: string) =>
  result.extras?.find((e) => e.label === label)?.value;

describe('gradePercent — grade and test scores', () => {
  test('converts marks into a percentage', () => {
    assert.equal(ok(gradePercent({ score: '38', total: '50' })).value, 76);
    assert.equal(ok(gradePercent({ score: '437', total: '500' })).value, 87.4);
    assert.equal(ok(gradePercent({ score: '0', total: '100' })).value, 0);
  });

  test('assigns the matching letter grade', () => {
    assert.equal(extra(ok(gradePercent({ score: '97', total: '100' })), 'Letter grade'), 'A+');
    assert.equal(extra(ok(gradePercent({ score: '85', total: '100' })), 'Letter grade'), 'B');
    assert.equal(extra(ok(gradePercent({ score: '59', total: '100' })), 'Letter grade'), 'F');
  });

  test('letter grade boundaries land on the right side', () => {
    assert.equal(letterGrade(90), 'A−');
    assert.equal(letterGrade(89.9), 'B+');
    assert.equal(letterGrade(60), 'D−');
    assert.equal(letterGrade(59.99), 'F');
    assert.equal(letterGrade(100), 'A+');
  });

  test('reports the marks dropped', () => {
    assert.equal(extra(ok(gradePercent({ score: '38', total: '50' })), 'Marks dropped'), '12');
  });

  test('a zero total is refused', () => {
    assert.equal(err(gradePercent({ score: '10', total: '0' })).field, 'total');
  });

  test('negative marks are refused', () => {
    assert.equal(err(gradePercent({ score: '-5', total: '50' })).field, 'score');
  });

  test('a score above the total is flagged rather than silently accepted', () => {
    const result = ok(gradePercent({ score: '60', total: '50' }));
    assert.match(result.note ?? '', /other way round/);
  });
});

describe('winPercent', () => {
  test('a simple win-loss record', () => {
    assert.equal(ok(winPercent({ wins: '10', losses: '5' })).value, 66.6666666666667);
    assert.equal(ok(winPercent({ wins: '3', losses: '1' })).value, 75);
  });

  test('ties count as half a win, the standard convention', () => {
    // 10 wins, 5 losses, 2 ties -> (10 + 1) / 17
    const result = ok(winPercent({ wins: '10', losses: '5', ties: '2' }));
    assert.ok(result.display.startsWith('64.7'), result.display);
    assert.equal(extra(result, 'Games played'), '17');
    assert.equal(extra(result, 'Win–loss record'), '10–5–2');
  });

  test('also reports the rate ignoring ties', () => {
    const result = ok(winPercent({ wins: '10', losses: '5', ties: '2' }));
    assert.ok((extra(result, 'Ignoring ties') ?? '').startsWith('66.6'));
  });

  test('an empty ties field is treated as no ties', () => {
    assert.equal(ok(winPercent({ wins: '4', losses: '1', ties: '' })).value, 80);
  });

  test('an unbeaten and a winless record', () => {
    assert.equal(ok(winPercent({ wins: '5', losses: '0' })).value, 100);
    assert.equal(ok(winPercent({ wins: '0', losses: '5' })).value, 0);
  });

  test('no games played has no answer', () => {
    assert.match(err(winPercent({ wins: '0', losses: '0' })).message, /at least one game/);
  });

  test('negative games are refused', () => {
    assert.match(err(winPercent({ wins: '-1', losses: '3' })).message, /cannot be negative/);
  });
});

describe('averagePercent', () => {
  test('averages a comma-separated list', () => {
    assert.equal(ok(averagePercent({ values: '80, 90, 100' })).value, 90);
    assert.equal(ok(averagePercent({ values: '25,75' })).value, 50);
  });

  test('accepts spaces and newlines as separators', () => {
    assert.equal(ok(averagePercent({ values: '80 90 100' })).value, 90);
    assert.equal(ok(averagePercent({ values: '80\n90\n100' })).value, 90);
  });

  test('weighting by group size changes the answer', () => {
    // 80% of 10 marks and 60% of 90 marks is 62%, not 70%.
    const weighted = ok(averagePercent({ values: '80, 60', weights: '10, 90' }));
    assert.equal(weighted.value, 62);
    assert.equal(extra(weighted, 'Weighted average'), '62%');
    assert.equal(extra(weighted, 'Simple average'), '70%');
  });

  test('reports the highest and lowest values', () => {
    const result = ok(averagePercent({ values: '12, 88, 50' }));
    assert.equal(extra(result, 'Highest'), '88%');
    assert.equal(extra(result, 'Lowest'), '12%');
    assert.equal(extra(result, 'How many values'), '3');
  });

  test('warns that a plain average assumes equal group sizes', () => {
    assert.match(ok(averagePercent({ values: '80, 60' })).note ?? '', /same size/);
  });

  test('a single value is not an average', () => {
    assert.match(err(averagePercent({ values: '80' })).message, /at least two/);
  });

  test('mismatched weight counts are refused with the counts named', () => {
    const failure = err(averagePercent({ values: '80, 60, 40', weights: '1, 2' }));
    assert.match(failure.message, /3 percentages but 2 group sizes/);
  });

  test('non-numeric entries name the offending token', () => {
    assert.match(err(averagePercent({ values: '80, abc' })).message, /“abc”/);
  });

  test('empty input is refused', () => {
    assert.match(err(averagePercent({ values: '' })).message, /at least two/);
  });

  test('weights summing to zero are refused', () => {
    assert.match(err(averagePercent({ values: '80, 60', weights: '0, 0' })).message, /add up to zero/);
  });
});

describe('weightLossPercent', () => {
  test('the percentage of starting weight lost', () => {
    // 200 -> 180 is 10%
    const result = ok(weightLossPercent({ start: '200', current: '180' }));
    assert.equal(result.value, 10);
    assert.equal(extra(result, 'Weight lost'), '20');
  });

  test('a gain is reported as a gain, not a negative loss', () => {
    const result = ok(weightLossPercent({ start: '180', current: '200' }));
    assert.equal(result.display, '11.1111%');
    assert.match(result.note ?? '', /gain rather than a loss/);
    assert.equal(extra(result, 'Weight gained'), '20');
  });

  test('no change is stated plainly', () => {
    const result = ok(weightLossPercent({ start: '180', current: '180' }));
    assert.equal(result.value, 0);
    assert.match(result.headline, /unchanged/);
  });

  test('a zero or negative starting weight is refused', () => {
    assert.equal(err(weightLossPercent({ start: '0', current: '10' })).field, 'start');
    assert.equal(err(weightLossPercent({ start: '-5', current: '10' })).field, 'start');
  });

  test('works with decimals', () => {
    assert.equal(ok(weightLossPercent({ start: '82.5', current: '78.375' })).value, 5);
  });
});

describe('tax calculators', () => {
  test('adding tax to a net amount', () => {
    const result = ok(taxAdd({ amount: '100', rate: '20' }));
    assert.equal(result.value, 120);
    assert.equal(extra(result, 'Tax'), '20');
    assert.equal(extra(result, 'Total including tax'), '120');
  });

  test('removing tax divides rather than subtracting', () => {
    // £120 including 20% VAT is £100 before tax — not £96.
    const result = ok(taxRemove({ total: '120', rate: '20' }));
    assert.equal(result.value, 100);
    assert.equal(extra(result, 'Tax included'), '20');
    assert.notEqual(result.value, 96);
  });

  test('removing tax explains the common mistake', () => {
    assert.match(ok(taxRemove({ total: '120', rate: '20' })).note ?? '', /divide/);
  });

  test('finding the rate from a net and gross amount', () => {
    assert.equal(ok(taxRate({ amount: '100', total: '107.5' })).value, 7.5);
    assert.equal(ok(taxRate({ amount: '50', total: '54' })).value, 8);
  });

  test('a currency symbol formats the money figures', () => {
    const result = ok(taxAdd({ amount: '2500', rate: '18', currency: '₹' }));
    assert.equal(result.display, '₹2,950');
    assert.equal(extra(result, 'Tax'), '₹450');
  });

  test('add and remove are exact inverses', () => {
    const gross = ok(taxAdd({ amount: '249.99', rate: '8.25' })).value;
    const back = ok(taxRemove({ total: String(gross), rate: '8.25' })).value;
    assert.ok(Math.abs(back - 249.99) < 1e-9, `round trip gave ${back}`);
  });

  test('a zero rate leaves the amount untouched', () => {
    assert.equal(ok(taxAdd({ amount: '100', rate: '0' })).value, 100);
    assert.equal(ok(taxRemove({ total: '100', rate: '0' })).value, 100);
  });

  test('negative amounts and rates are refused', () => {
    assert.equal(err(taxAdd({ amount: '-10', rate: '20' })).field, 'amount');
    assert.equal(err(taxAdd({ amount: '10', rate: '-5' })).field, 'rate');
    assert.equal(err(taxRate({ amount: '0', total: '10' })).field, 'amount');
  });
});

describe('bodyFat — US Navy method', () => {
  test('a metric male estimate lands in a plausible range', () => {
    const result = ok(bodyFatMale({ height: '178', neck: '38', waist: '85', unit: 'cm' }));
    assert.ok(result.value > 15 && result.value < 18, `got ${result.value}`);
    assert.equal(extra(result, 'Method'), 'US Navy circumference');
  });

  test('a metric female estimate lands in a plausible range', () => {
    const result = ok(bodyFatFemale({ height: '165', neck: '32', waist: '72', hip: '95', unit: 'cm' }));
    assert.ok(result.value > 24 && result.value < 27, `got ${result.value}`);
  });

  test('inches and centimetres agree once converted', () => {
    const metric = ok(bodyFatMale({ height: '180', neck: '40', waist: '90', unit: 'cm' })).value;
    const imperial = ok(
      bodyFatMale({
        height: String(180 / 2.54),
        neck: String(40 / 2.54),
        waist: String(90 / 2.54),
        unit: 'in',
      }),
    ).value;
    assert.ok(Math.abs(metric - imperial) < 0.01, `${metric} vs ${imperial}`);
  });

  test('categories are banded per sex', () => {
    // The same percentage sits in different bands for men and women.
    const male = ok(bodyFatMale({ height: '180', neck: '38', waist: '80', unit: 'cm' }));
    assert.ok(['Essential fat', 'Athletic', 'Fitness'].includes(extra(male, 'Category') ?? ''));
  });

  test('a waist no larger than the neck is refused with guidance', () => {
    const failure = err(bodyFatMale({ height: '178', neck: '90', waist: '85', unit: 'cm' }));
    assert.match(failure.message, /larger than your neck/);
  });

  test('the female form requires a hip measurement', () => {
    const failure = err(bodyFatFemale({ height: '165', neck: '32', waist: '72', unit: 'cm' }));
    assert.equal(failure.field, 'hip');
  });

  test('nonsense measurements are refused rather than returning a wild number', () => {
    const failure = err(bodyFatMale({ height: '1', neck: '1', waist: '400', unit: 'cm' }));
    assert.match(failure.message, /sensible result|unit you selected/);
  });

  test('the result is labelled an estimate, not a measurement', () => {
    const result = ok(bodyFatMale({ height: '178', neck: '38', waist: '85', unit: 'cm' }));
    assert.match(result.note ?? '', /estimate/);
    assert.match(result.note ?? '', /not medical advice/);
  });
});
