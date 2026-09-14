/**
 * The percentage calculation engine.
 *
 * Every operation takes raw string input (exactly what the user typed) and
 * returns either a structured, fully-explained result or a human-readable
 * error. Parsing, validation, maths and the step-by-step wording all live here
 * so the DOM layer stays presentational and the whole user-visible path is
 * testable.
 */

import {
  cleanFloat,
  formatNumber,
  parseList,
  parseNumber,
  presentNumber,
  presentPercent,
} from './number.ts';
import { engineEn, fill, type EngineStrings } from '../i18n/engine/en.ts';

/**
 * Active strings for the engine's prose.
 *
 * Module-scoped rather than threaded through every operation because the
 * engine only ever runs in the browser — no page renders it at build time —
 * and a document has exactly one locale. `src/scripts/calculator.ts` sets this
 * once before wiring anything up.
 */
let S: EngineStrings = engineEn;

export function setEngineStrings(strings: EngineStrings): void {
  S = strings;
}

export type OperationId =
  | 'percent-of'
  | 'what-percent'
  | 'percent-of-what'
  | 'increase'
  | 'decrease'
  | 'change'
  | 'difference'
  | 'discount'
  // Applied calculators — the same arithmetic in a specific vocabulary.
  | 'grade'
  | 'win'
  | 'average'
  | 'weight-loss'
  | 'tax-add'
  | 'tax-remove'
  | 'tax-rate'
  | 'body-fat-male'
  | 'body-fat-female';

export type Step = {
  /** Plain-language description of what this step does. */
  label: string;
  /** The arithmetic for this step. */
  expression: string;
};

export type Extra = {
  label: string;
  value: string;
  /** Marks the figure a user most likely came for (e.g. the price they pay). */
  emphasis?: boolean;
};

export type Direction = 'increase' | 'decrease' | 'none';

export type CalcResult = {
  /** Full-sentence answer, e.g. "20% of 500 = 100". */
  headline: string;
  /** The unrounded numeric answer. */
  value: number;
  /** The answer formatted for display, e.g. "12.5%". */
  display: string;
  /** True when `display` is a rounded view of `value`. */
  rounded: boolean;
  /** The formula in words, e.g. "(Percentage ÷ 100) × Value". */
  formula: string;
  /** The same formula with the user's numbers substituted in. */
  substituted: string;
  steps: Step[];
  extras?: Extra[];
  direction?: Direction;
  /** Extra guidance, e.g. when a value fell instead of rising. */
  note?: string;
};

export type CalcOutcome =
  | { ok: true; result: CalcResult }
  | { ok: false; message: string; field?: string };

export type Inputs = Record<string, string | undefined>;

/* -------------------------------------------------------------------------- */
/* Input helpers                                                              */
/* -------------------------------------------------------------------------- */

type FieldSpec = { key: string; label: string };

/**
 * Parse every required field, returning the first problem as a user-facing
 * message. Messages name the field so the UI can highlight it and so screen
 * readers get context, never a bare "NaN".
 */
function readFields(
  inputs: Inputs,
  specs: FieldSpec[],
): { ok: true; values: Record<string, number> } | { ok: false; message: string; field: string } {
  const values: Record<string, number> = {};

  for (const spec of specs) {
    const parsed = parseNumber(inputs[spec.key]);
    if (!parsed.ok) {
      const key =
        parsed.reason === 'empty' ? 'empty' : parsed.reason === 'too-large' ? 'tooLarge' : 'invalid';
      const message = fill(S.err[key], { field: spec.label });
      return { ok: false, message, field: spec.key };
    }
    values[spec.key] = parsed.value;
  }

  return { ok: true, values };
}

/** Short numeric form used inside formulas and steps. */
function n(value: number): string {
  return formatNumber(cleanFloat(value));
}

/**
 * Format a figure as money: a whole amount stays whole, but anything with a
 * fractional part shows both decimal places, so a saving never renders as
 * "87.5" when it means 87 and a half.
 */
function money(value: number, symbol: string): string {
  const rounded = cleanFloat(Math.round(value * 100) / 100);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(rounded);
  return symbol ? `${symbol}${formatted}` : formatted;
}

/* -------------------------------------------------------------------------- */
/* Operations                                                                 */
/* -------------------------------------------------------------------------- */

/** What is P% of V? */
export function percentOf(inputs: Inputs): CalcOutcome {
  const read = readFields(inputs, [
    { key: 'percent', label: S.field.percent },
    { key: 'value', label: S.field.value },
  ]);
  if (!read.ok) return read;

  const { percent, value } = read.values as { percent: number; value: number };
  const decimal = cleanFloat(percent / 100);
  const answer = cleanFloat((percent / 100) * value);
  const shown = presentNumber(answer);

  return {
    ok: true,
    result: {
      headline: fill(S.head.percentOf, { a: n(percent), b: n(value), r: shown.display }),
      value: answer,
      display: shown.display,
      rounded: shown.rounded,
      formula: S.formula.percentOf,
      substituted: `(${n(percent)} ÷ 100) × ${n(value)} = ${shown.display}`,
      steps: [
        {
          label: S.step.toDecimal,
          expression: `${n(percent)} ÷ 100 = ${n(decimal)}`,
        },
        {
          label: S.step.multiplyByNumber,
          expression: `${n(decimal)} × ${n(value)} = ${shown.display}`,
        },
      ],
    },
  };
}

/** X is what percent of Y? */
export function whatPercent(inputs: Inputs): CalcOutcome {
  const read = readFields(inputs, [
    { key: 'part', label: S.field.partFirst },
    { key: 'whole', label: S.field.whole },
  ]);
  if (!read.ok) return read;

  const { part, whole } = read.values as { part: number; whole: number };
  if (whole === 0) {
    return {
      ok: false,
      field: 'whole',
      message: S.err.wholeZero,
    };
  }

  const ratio = cleanFloat(part / whole);
  const answer = cleanFloat((part / whole) * 100);
  const shown = presentPercent(answer);

  return {
    ok: true,
    result: {
      headline: fill(S.head.whatPercent, { a: n(part), b: n(whole), r: shown.display }),
      value: answer,
      display: shown.display,
      rounded: shown.rounded,
      formula: S.formula.whatPercent,
      substituted: `(${n(part)} ÷ ${n(whole)}) × 100 = ${shown.display}`,
      steps: [
        {
          label: S.step.divideParts,
          expression: `${n(part)} ÷ ${n(whole)} = ${n(ratio)}`,
        },
        {
          label: S.step.timesHundredShare,
          expression: `${n(ratio)} × 100 = ${shown.display}`,
        },
      ],
    },
  };
}

/** X is P% of what number? */
export function percentOfWhat(inputs: Inputs): CalcOutcome {
  const read = readFields(inputs, [
    { key: 'part', label: S.field.part },
    { key: 'percent', label: S.field.percent },
  ]);
  if (!read.ok) return read;

  const { part, percent } = read.values as { part: number; percent: number };
  if (percent === 0) {
    return {
      ok: false,
      field: 'percent',
      message: S.err.percentZero,
    };
  }

  const decimal = cleanFloat(percent / 100);
  const answer = cleanFloat(part / (percent / 100));
  const shown = presentNumber(answer);

  return {
    ok: true,
    result: {
      headline: fill(S.head.percentOfWhat, { a: n(part), b: n(percent), r: shown.display }),
      value: answer,
      display: shown.display,
      rounded: shown.rounded,
      formula: S.formula.percentOfWhat,
      substituted: `${n(part)} ÷ (${n(percent)} ÷ 100) = ${shown.display}`,
      steps: [
        {
          label: S.step.toDecimal,
          expression: `${n(percent)} ÷ 100 = ${n(decimal)}`,
        },
        {
          label: S.step.divideByDecimal,
          expression: `${n(part)} ÷ ${n(decimal)} = ${shown.display}`,
        },
      ],
    },
  };
}

/**
 * Percentage change between an original and a new value.
 *
 * `increase`, `decrease` and `change` share this maths and differ only in how
 * the answer is framed — which is exactly the distinction most calculators
 * blur. When the value moves the opposite way to the page the user landed on,
 * the result says so rather than returning a confusing negative.
 */
function changeCore(inputs: Inputs, expected: Direction): CalcOutcome {
  const read = readFields(inputs, [
    { key: 'original', label: S.field.original },
    { key: 'final', label: S.field.final },
  ]);
  if (!read.ok) return read;

  const { original, final } = read.values as { original: number; final: number };
  if (original === 0) {
    return {
      ok: false,
      field: 'original',
      message:
S.err.originalZero,
    };
  }

  const difference = cleanFloat(final - original);
  const signed = cleanFloat((difference / Math.abs(original)) * 100);
  const magnitude = Math.abs(signed);
  const direction: Direction = signed > 0 ? 'increase' : signed < 0 ? 'decrease' : 'none';

  const shown = presentPercent(magnitude);
  const ratio = cleanFloat(difference / Math.abs(original));

  const headTemplate =
    direction === 'increase'
      ? S.head.changeUp
      : direction === 'decrease'
        ? S.head.changeDown
        : S.head.changeNone;
  const headline = fill(headTemplate, { a: n(original), b: n(final), r: shown.display });

  let note: string | undefined;
  if (expected !== 'none' && direction !== 'none' && direction !== expected) {
    note = fill(
      direction === 'decrease' ? S.note.wrongWayDecrease : S.note.wrongWayIncrease,
      { r: shown.display },
    );
  } else if (direction === 'none') {
    note = S.note.noChange;
  }

  if (original < 0) {
    note = [note, S.note.negativeOriginal].filter(Boolean).join(' ');
  }

  // A decrease is quoted as a positive figure ("a 25% decrease"), so when the
  // value fell the working is presented as Original − New. Both orderings are
  // the same formula; this one arrives at the number actually being reported
  // instead of a negative the reader has to mentally flip.
  const fellBack = direction === 'decrease';
  const gap = cleanFloat(Math.abs(difference));
  const magnitudeRatio = cleanFloat(Math.abs(ratio));

  return {
    ok: true,
    result: {
      headline,
      value: signed,
      display: shown.display,
      rounded: shown.rounded,
      direction,
      note,
      formula: fellBack ? S.formula.changeDown : S.formula.changeUp,
      substituted: fellBack
        ? `((${n(original)} − ${n(final)}) ÷ ${n(Math.abs(original))}) × 100 = ${shown.display}`
        : `((${n(final)} − ${n(original)}) ÷ ${n(Math.abs(original))}) × 100 = ${shown.display}`,
      steps: [
        {
          label: fellBack
            ? S.step.diffDown
            : S.step.diffUp,
          expression: fellBack
            ? `${n(original)} − ${n(final)} = ${n(gap)}`
            : `${n(final)} − ${n(original)} = ${n(difference)}`,
        },
        {
          label: S.step.divideByOriginal,
          expression: `${n(fellBack ? gap : difference)} ÷ ${n(Math.abs(original))} = ${n(fellBack ? magnitudeRatio : ratio)}`,
        },
        {
          label: S.step.timesHundred,
          expression: `${n(fellBack ? magnitudeRatio : ratio)} × 100 = ${shown.display}`,
        },
      ],
      extras: [
        { label: S.extra.absoluteDifference, value: n(Math.abs(difference)) },
        {
          label: S.extra.direction,
          value:
            direction === 'increase'
              ? S.extra.increase
              : direction === 'decrease'
                ? S.extra.decrease
                : S.extra.noChange,
        },
      ],
    },
  };
}

export function percentageIncrease(inputs: Inputs): CalcOutcome {
  return changeCore(inputs, 'increase');
}

export function percentageDecrease(inputs: Inputs): CalcOutcome {
  return changeCore(inputs, 'decrease');
}

export function percentageChange(inputs: Inputs): CalcOutcome {
  return changeCore(inputs, 'none');
}

/**
 * Percentage difference between two values with no "before" or "after".
 *
 * Measured against the average of the two, which is what makes it symmetric —
 * and what makes it a different question from percentage change.
 */
export function percentageDifference(inputs: Inputs): CalcOutcome {
  const read = readFields(inputs, [
    { key: 'a', label: S.field.a },
    { key: 'b', label: S.field.b },
  ]);
  if (!read.ok) return read;

  const { a, b } = read.values as { a: number; b: number };
  const average = cleanFloat((Math.abs(a) + Math.abs(b)) / 2);
  if (average === 0) {
    return {
      ok: false,
      field: 'a',
      message: S.err.bothZero,
    };
  }

  const gap = cleanFloat(Math.abs(a - b));
  const answer = cleanFloat((gap / average) * 100);
  const shown = presentPercent(answer);
  const ratio = cleanFloat(gap / average);

  return {
    ok: true,
    result: {
      headline: fill(S.head.difference, { a: n(a), b: n(b), r: shown.display }),
      value: answer,
      display: shown.display,
      rounded: shown.rounded,
      formula: S.formula.difference,
      substituted: `(${n(gap)} ÷ ${n(average)}) × 100 = ${shown.display}`,
      steps: [
        {
          label: S.step.gapSize,
          expression: `|${n(a)} − ${n(b)}| = ${n(gap)}`,
        },
        {
          label: S.step.findAverage,
          expression: `(${n(Math.abs(a))} + ${n(Math.abs(b))}) ÷ 2 = ${n(average)}`,
        },
        {
          label: S.step.gapOverAverage,
          expression: `${n(ratio)} × 100 = ${shown.display}`,
        },
      ],
      extras: [
        { label: S.extra.absoluteDifference, value: n(gap) },
        { label: S.extra.averageOfTwo, value: n(average) },
      ],
      note: S.note.differenceSymmetric,
    },
  };
}

/** Final price after a percentage discount. */
export function discount(inputs: Inputs): CalcOutcome {
  const read = readFields(inputs, [
    { key: 'price', label: S.field.price },
    { key: 'percent', label: S.field.discountPercent },
  ]);
  if (!read.ok) return read;

  const { price, percent } = read.values as { price: number; percent: number };
  const symbol = (inputs.currency ?? '').trim();

  if (price < 0) {
    return { ok: false, field: 'price', message: S.err.negativePrice };
  }
  if (percent < 0 || percent > 100) {
    return {
      ok: false,
      field: 'percent',
      message: S.err.discountRange,
    };
  }

  const saved = cleanFloat((price * percent) / 100);
  const final = cleanFloat(price - saved);
  const shownFinal = presentNumber(final, 2);

  return {
    ok: true,
    result: {
      headline: fill(S.head.discount, { a: money(price, symbol), b: n(percent), r: money(final, symbol) }),
      value: final,
      display: money(final, symbol),
      rounded: shownFinal.rounded,
      formula: S.formula.discount,
      substituted: `${n(price)} − (${n(price)} × ${n(percent)} ÷ 100) = ${n(final)}`,
      steps: [
        {
          label: S.step.discountAmount,
          expression: `${n(price)} × ${n(percent)} ÷ 100 = ${n(saved)}`,
        },
        {
          label: S.step.subtractDiscount,
          expression: `${n(price)} − ${n(saved)} = ${n(final)}`,
        },
      ],
      extras: [
        { label: S.extra.youSave, value: money(saved, symbol) },
        { label: S.extra.youPay, value: money(final, symbol), emphasis: true },
      ],
    },
  };
}

/* -------------------------------------------------------------------------- */


/* -------------------------------------------------------------------------- */
/* Applied percentage calculators                                             */
/*                                                                            */
/* Each of these is the same percentage arithmetic wearing the vocabulary of a */
/* specific job. They exist as separate operations because the wording, the    */
/* validation and the secondary figures differ — not because the maths does.   */
/* -------------------------------------------------------------------------- */

/** US letter-grade bands, highest first. */
const GRADE_BANDS: { min: number; grade: string }[] = [
  { min: 97, grade: 'A+' },
  { min: 93, grade: 'A' },
  { min: 90, grade: 'A−' },
  { min: 87, grade: 'B+' },
  { min: 83, grade: 'B' },
  { min: 80, grade: 'B−' },
  { min: 77, grade: 'C+' },
  { min: 73, grade: 'C' },
  { min: 70, grade: 'C−' },
  { min: 67, grade: 'D+' },
  { min: 63, grade: 'D' },
  { min: 60, grade: 'D−' },
  { min: -Infinity, grade: 'F' },
];

export function letterGrade(percent: number): string {
  return GRADE_BANDS.find((band) => percent >= band.min)?.grade ?? 'F';
}

/** Marks scored out of marks available, as a percentage and a letter grade. */
export function gradePercent(inputs: Inputs): CalcOutcome {
  const read = readFields(inputs, [
    { key: 'score', label: S.field.score },
    { key: 'total', label: S.field.totalMarks },
  ]);
  if (!read.ok) return read;

  const { score, total } = read.values as { score: number; total: number };
  if (total <= 0) {
    return { ok: false, field: 'total', message: S.err.totalMarksZero };
  }
  if (score < 0) {
    return { ok: false, field: 'score', message: S.err.negativeScore };
  }

  const ratio = cleanFloat(score / total);
  const answer = cleanFloat((score / total) * 100);
  const shown = presentPercent(answer);
  const grade = letterGrade(answer);

  return {
    ok: true,
    result: {
      headline: fill(S.head.grade, { a: n(score), b: n(total), r: shown.display }),
      value: answer,
      display: shown.display,
      rounded: shown.rounded,
      formula: S.formula.grade,
      substituted: `(${n(score)} ÷ ${n(total)}) × 100 = ${shown.display}`,
      steps: [
        {
          label: S.step.divideMarks,
          expression: `${n(score)} ÷ ${n(total)} = ${n(ratio)}`,
        },
        {
          label: S.step.timesHundredPlain,
          expression: `${n(ratio)} × 100 = ${shown.display}`,
        },
      ],
      extras: [
        { label: S.extra.letterGrade, value: grade, emphasis: true },
        { label: S.extra.marksDropped, value: n(cleanFloat(total - score)) },
      ],
      note: score > total ? S.note.gradeSwapped : S.note.gradeScale,
    },
  };
}

/** Win percentage from a win/loss(/tie) record. */
export function winPercent(inputs: Inputs): CalcOutcome {
  const read = readFields(inputs, [
    { key: 'wins', label: S.field.wins },
    { key: 'losses', label: S.field.losses },
  ]);
  if (!read.ok) return read;

  const { wins, losses } = read.values as { wins: number; losses: number };

  // Ties are optional: an empty field means the sport has none.
  let ties = 0;
  if ((inputs.ties ?? '').trim() !== '') {
    const parsedTies = parseNumber(inputs.ties);
    if (!parsedTies.ok) {
      return { ok: false, field: 'ties', message: S.err.tiesInvalid };
    }
    ties = parsedTies.value;
  }

  if (wins < 0 || losses < 0 || ties < 0) {
    return { ok: false, field: 'wins', message: S.err.negativeGames };
  }

  const played = cleanFloat(wins + losses + ties);
  if (played === 0) {
    return { ok: false, field: 'wins', message: S.err.noGames };
  }

  // The standard sporting convention counts a tie as half a win.
  const credited = cleanFloat(wins + ties / 2);
  const answer = cleanFloat((credited / played) * 100);
  const shown = presentPercent(answer);

  const extras: Extra[] = [
    { label: S.extra.gamesPlayed, value: n(played) },
    { label: S.extra.record, value: ties > 0 ? `${n(wins)}–${n(losses)}–${n(ties)}` : `${n(wins)}–${n(losses)}` },
  ];

  if (ties > 0) {
    const excludingTies = cleanFloat((wins / (wins + losses)) * 100);
    extras.push({
      label: S.extra.ignoringTies,
      value: Number.isFinite(excludingTies) ? presentPercent(excludingTies).display : '—',
    });
  }

  return {
    ok: true,
    result: {
      headline: fill(S.head.win, { a: `${n(wins)}–${n(losses)}${ties > 0 ? `–${n(ties)}` : ''}`, r: shown.display }),
      value: answer,
      display: shown.display,
      rounded: shown.rounded,
      formula: ties > 0 ? S.formula.winWithTies : S.formula.winPlain,
      substituted: `(${n(credited)} ÷ ${n(played)}) × 100 = ${shown.display}`,
      steps: [
        {
          label: ties > 0 ? S.step.countGamesWithTies : S.step.countGames,
          expression: ties > 0 ? `${n(wins)} + ${n(losses)} + ${n(ties)} = ${n(played)}` : `${n(wins)} + ${n(losses)} = ${n(played)}`,
        },
        ...(ties > 0
          ? [{
              label: S.step.creditTies,
              expression: `${n(wins)} + (${n(ties)} ÷ 2) = ${n(credited)}`,
            }]
          : []),
        {
          label: S.step.winsOverPlayed,
          expression: `${n(credited)} ÷ ${n(played)} × 100 = ${shown.display}`,
        },
      ],
      extras,
    },
  };
}

/** Percentage of starting weight lost (or gained). */
export function weightLossPercent(inputs: Inputs): CalcOutcome {
  const read = readFields(inputs, [
    { key: 'start', label: S.field.start },
    { key: 'current', label: S.field.current },
  ]);
  if (!read.ok) return read;

  const { start, current } = read.values as { start: number; current: number };
  if (start <= 0) {
    return { ok: false, field: 'start', message: S.err.startWeightZero };
  }
  if (current < 0) {
    return { ok: false, field: 'current', message: S.err.negativeCurrent };
  }

  const difference = cleanFloat(start - current);
  const signed = cleanFloat((difference / start) * 100);
  const direction: Direction = signed > 0 ? 'decrease' : signed < 0 ? 'increase' : 'none';
  const magnitude = Math.abs(signed);
  const shown = presentPercent(magnitude);
  const ratio = cleanFloat(Math.abs(difference) / start);

  return {
    ok: true,
    result: {
      headline: fill(
        direction === 'none'
          ? S.head.weightSame
          : direction === 'decrease'
            ? S.head.weightLost
            : S.head.weightGained,
        { a: n(start), b: n(current), r: shown.display },
      ),
      value: signed,
      display: shown.display,
      rounded: shown.rounded,
      // A loss is progress here, so it is reported as the positive direction.
      direction: direction === 'decrease' ? 'increase' : direction === 'increase' ? 'decrease' : 'none',
      formula: S.formula.weightLoss,
      substituted: `((${n(start)} − ${n(current)}) ÷ ${n(start)}) × 100 = ${presentPercent(signed).display}`,
      steps: [
        {
          label: S.step.weightChange,
          expression: `${n(start)} − ${n(current)} = ${n(difference)}`,
        },
        {
          label: S.step.divideByStart,
          expression: `${n(Math.abs(difference))} ÷ ${n(start)} = ${n(ratio)}`,
        },
        {
          label: S.step.timesHundredWeight,
          expression: `${n(ratio)} × 100 = ${shown.display}`,
        },
      ],
      extras: [
        { label: direction === 'increase' ? 'Weight gained' : 'Weight lost', value: n(Math.abs(difference)), emphasis: true },
        { label: S.extra.units, value: S.extra.sameAsEntered },
      ],
      note: direction === 'increase' ? S.note.weightGain : S.note.weightUnits,
    },
  };
}

/**
 * Average a set of percentages.
 *
 * The plain mean is only correct when every percentage covers a group of the
 * same size. Supplying group sizes produces the weighted average, which is the
 * figure people usually actually want — and rarely calculate.
 */
export function averagePercent(inputs: Inputs): CalcOutcome {
  const list = parseList(inputs.values);
  if (!list.ok) {
    return {
      ok: false,
      field: 'values',
      message:
        list.reason === 'empty'
          ? S.err.listEmpty
          : fill(S.err.listNotNumber, { token: list.token ?? '' }),
    };
  }

  const values = list.values;
  if (values.length < 2) {
    return { ok: false, field: 'values', message: S.err.listTooFew };
  }

  const total = cleanFloat(values.reduce((sum, value) => sum + value, 0));
  const simple = cleanFloat(total / values.length);

  const extras: Extra[] = [
    { label: S.extra.howMany, value: String(values.length) },
    { label: S.extra.highest, value: presentPercent(Math.max(...values)).display },
    { label: S.extra.lowest, value: presentPercent(Math.min(...values)).display },
  ];

  let weighted: number | null = null;
  const weightsRaw = (inputs.weights ?? '').trim();

  if (weightsRaw !== '') {
    const parsedWeights = parseList(weightsRaw);
    if (!parsedWeights.ok) {
      return {
        ok: false,
        field: 'weights',
        message: fill(S.err.weightsNotNumber, { token: parsedWeights.token ?? '' }),
      };
    }
    if (parsedWeights.values.length !== values.length) {
      return {
        ok: false,
        field: 'weights',
        message: fill(S.err.weightsMismatch, { values: values.length, weights: parsedWeights.values.length }),
      };
    }
    if (parsedWeights.values.some((weight) => weight < 0)) {
      return { ok: false, field: 'weights', message: S.err.weightsNegative };
    }

    const weightTotal = cleanFloat(parsedWeights.values.reduce((sum, weight) => sum + weight, 0));
    if (weightTotal === 0) {
      return { ok: false, field: 'weights', message: S.err.weightsZero };
    }

    const weightedSum = values.reduce(
      (sum, value, index) => sum + value * (parsedWeights.values[index] ?? 0),
      0,
    );
    weighted = cleanFloat(weightedSum / weightTotal);
    extras.unshift({ label: S.extra.weightedAverage, value: presentPercent(weighted).display, emphasis: true });
    extras.push({ label: S.extra.simpleAverage, value: presentPercent(simple).display });
  }

  const answer = weighted ?? simple;
  const shown = presentPercent(answer);
  const listed = values.map((value) => `${n(value)}%`).join(' + ');

  return {
    ok: true,
    result: {
      headline: fill(weighted !== null ? S.head.averageWeighted : S.head.averagePlain, {
        a: values.length,
        r: shown.display,
      }),
      value: answer,
      display: shown.display,
      rounded: shown.rounded,
      formula: weighted !== null ? S.formula.averageWeighted : S.formula.averagePlain,
      substituted: weighted !== null
        ? `weighted over ${values.length} groups = ${shown.display}`
        : `${n(total)} ÷ ${values.length} = ${shown.display}`,
      steps: weighted !== null
        ? [
            {
              label: S.step.multiplyByGroup,
              expression: fill(S.step.productsSummed, { n: values.length }),
            },
            {
              label: S.step.divideByGroupTotal,
              expression: `= ${shown.display}`,
            },
            {
              label: S.step.plainAverageDiffers,
              expression: `${n(total)} ÷ ${values.length} = ${presentPercent(simple).display}`,
            },
          ]
        : [
            {
              label: S.step.sumPercentages,
              expression: `${listed} = ${n(total)}%`,
            },
            {
              label: S.step.divideByCount,
              expression: `${n(total)} ÷ ${values.length} = ${shown.display}`,
            },
          ],
      extras,
      note: weighted !== null ? S.note.averageWeighted : S.note.averagePlain,
    },
  };
}

/** Add tax to a net amount. */
export function taxAdd(inputs: Inputs): CalcOutcome {
  const read = readFields(inputs, [
    { key: 'amount', label: S.field.amount },
    { key: 'rate', label: S.field.rate },
  ]);
  if (!read.ok) return read;

  const { amount, rate } = read.values as { amount: number; rate: number };
  if (amount < 0) return { ok: false, field: 'amount', message: S.err.negativeAmount };
  if (rate < 0) return { ok: false, field: 'rate', message: S.err.negativeRate };

  const symbol = (inputs.currency ?? '').trim();
  const tax = cleanFloat((amount * rate) / 100);
  const gross = cleanFloat(amount + tax);
  const shown = presentNumber(gross, 2);

  return {
    ok: true,
    result: {
      headline: fill(S.head.taxAdd, { a: money(amount, symbol), b: n(rate), r: money(gross, symbol) }),
      value: gross,
      display: money(gross, symbol),
      rounded: shown.rounded,
      formula: S.formula.taxAdd,
      substituted: `${n(amount)} + (${n(amount)} × ${n(rate)} ÷ 100) = ${n(gross)}`,
      steps: [
        { label: S.step.taxAmount, expression: `${n(amount)} × ${n(rate)} ÷ 100 = ${n(tax)}` },
        { label: S.step.addTax, expression: `${n(amount)} + ${n(tax)} = ${n(gross)}` },
      ],
      extras: [
        { label: S.extra.tax, value: money(tax, symbol) },
        { label: S.extra.totalIncludingTax, value: money(gross, symbol), emphasis: true },
      ],
    },
  };
}

/** Strip tax out of a tax-inclusive total. */
export function taxRemove(inputs: Inputs): CalcOutcome {
  const read = readFields(inputs, [
    { key: 'total', label: S.field.total },
    { key: 'rate', label: S.field.rate },
  ]);
  if (!read.ok) return read;

  const { total, rate } = read.values as { total: number; rate: number };
  if (total < 0) return { ok: false, field: 'total', message: S.err.negativeTotal };
  if (rate <= -100) {
    return { ok: false, field: 'rate', message: S.err.rateTooLow };
  }

  const symbol = (inputs.currency ?? '').trim();
  const divisor = cleanFloat(1 + rate / 100);
  const net = cleanFloat(total / divisor);
  const tax = cleanFloat(total - net);
  const shown = presentNumber(net, 2);

  return {
    ok: true,
    result: {
      headline: fill(S.head.taxRemove, { a: money(total, symbol), b: n(rate), r: money(net, symbol) }),
      value: net,
      display: money(net, symbol),
      rounded: shown.rounded,
      formula: S.formula.taxRemove,
      substituted: `${n(total)} ÷ ${n(divisor)} = ${n(net)}`,
      steps: [
        {
          label: S.step.taxMultiplier,
          expression: `1 + (${n(rate)} ÷ 100) = ${n(divisor)}`,
        },
        { label: S.step.undoTax, expression: `${n(total)} ÷ ${n(divisor)} = ${n(net)}` },
      ],
      extras: [
        { label: S.extra.amountBeforeTax, value: money(net, symbol), emphasis: true },
        { label: S.extra.taxIncluded, value: money(tax, symbol) },
      ],
      note: S.note.removeTaxDivide,
    },
  };
}

/** Work out the tax rate implied by a net and gross amount. */
export function taxRate(inputs: Inputs): CalcOutcome {
  const read = readFields(inputs, [
    { key: 'amount', label: S.field.amount },
    { key: 'total', label: S.field.total },
  ]);
  if (!read.ok) return read;

  const { amount, total } = read.values as { amount: number; total: number };
  if (amount <= 0) {
    return { ok: false, field: 'amount', message: S.err.amountZero };
  }

  const symbol = (inputs.currency ?? '').trim();
  const tax = cleanFloat(total - amount);
  const answer = cleanFloat((tax / amount) * 100);
  const shown = presentPercent(answer);

  return {
    ok: true,
    result: {
      headline: fill(S.head.taxRate, { a: money(amount, symbol), b: money(total, symbol), r: shown.display }),
      value: answer,
      display: shown.display,
      rounded: shown.rounded,
      formula: S.formula.taxRate,
      substituted: `((${n(total)} − ${n(amount)}) ÷ ${n(amount)}) × 100 = ${shown.display}`,
      steps: [
        { label: S.step.taxAdded, expression: `${n(total)} − ${n(amount)} = ${n(tax)}` },
        { label: S.step.rateFromTax, expression: `${n(tax)} ÷ ${n(amount)} × 100 = ${shown.display}` },
      ],
      extras: [
        { label: S.extra.taxPaid, value: money(tax, symbol) },
        { label: S.extra.effectiveRate, value: shown.display, emphasis: true },
      ],
    },
  };
}

/**
 * Body-fat percentage by the US Navy circumference method.
 *
 * The published formula is metric, so imperial input is converted to
 * centimetres rather than maintaining a second set of constants.
 */
const BODY_FAT_BANDS = {
  male: [
    { max: 6, label: S.band.essential },
    { max: 14, label: S.band.athletic },
    { max: 18, label: S.band.fitness },
    { max: 25, label: S.band.average },
    { max: Infinity, label: S.band.aboveAverage },
  ],
  female: [
    { max: 14, label: S.band.essential },
    { max: 21, label: S.band.athletic },
    { max: 25, label: S.band.fitness },
    { max: 32, label: S.band.average },
    { max: Infinity, label: S.band.aboveAverage },
  ],
} as const;

function bodyFatCore(inputs: Inputs, sex: 'male' | 'female'): CalcOutcome {
  const specs: FieldSpec[] = [
    { key: 'height', label: S.field.height },
    { key: 'neck', label: S.field.neck },
    { key: 'waist', label: S.field.waist },
  ];
  if (sex === 'female') specs.push({ key: 'hip', label: S.field.hip });

  const read = readFields(inputs, specs);
  if (!read.ok) return read;

  const unit = (inputs.unit ?? 'cm').trim() === 'in' ? 'in' : 'cm';
  const toCm = (value: number) => (unit === 'in' ? value * 2.54 : value);

  const height = toCm(read.values.height!);
  const neck = toCm(read.values.neck!);
  const waist = toCm(read.values.waist!);
  const hip = sex === 'female' ? toCm(read.values.hip!) : 0;

  for (const [key, value] of Object.entries({ height, neck, waist, ...(sex === 'female' ? { hip } : {}) })) {
    if (value <= 0) {
      return { ok: false, field: key, message: S.err.measurementZero };
    }
  }

  const girth = sex === 'male' ? waist - neck : waist + hip - neck;
  if (girth <= 0) {
    return {
      ok: false,
      field: 'waist',
      message:
        sex === 'male' ? S.err.waistNeckMale : S.err.waistNeckFemale,
    };
  }

  const denominator =
    sex === 'male'
      ? 1.0324 - 0.19077 * Math.log10(girth) + 0.15456 * Math.log10(height)
      : 1.29579 - 0.35004 * Math.log10(girth) + 0.221 * Math.log10(height);

  const raw = 495 / denominator - 450;
  if (!Number.isFinite(raw) || raw <= 0 || raw >= 80) {
    return {
      ok: false,
      field: 'waist',
      message: S.err.bodyFatNonsense,
    };
  }

  const answer = cleanFloat(raw);
  const shown = presentPercent(answer, 1);
  const band = BODY_FAT_BANDS[sex].find((entry) => answer < entry.max)?.label ?? S.band.aboveAverage;
  const u = unit === 'in' ? 'in' : 'cm';

  return {
    ok: true,
    result: {
      headline: fill(S.head.bodyFat, { r: shown.display }),
      value: answer,
      display: shown.display,
      rounded: shown.rounded,
      formula:
        sex === 'male' ? S.formula.bodyFatMale : S.formula.bodyFatFemale,
      substituted:
        sex === 'male'
          ? `waist − neck = ${n(cleanFloat(girth))} ${u === 'in' ? 'cm (converted)' : 'cm'} → ${shown.display}`
          : `waist + hip − neck = ${n(cleanFloat(girth))} ${u === 'in' ? 'cm (converted)' : 'cm'} → ${shown.display}`,
      steps: [
        {
          label:
            sex === 'male'
              ? S.step.girthMale
              : S.step.girthFemale,
          expression:
            sex === 'male'
              ? `${n(cleanFloat(waist))} − ${n(cleanFloat(neck))} = ${n(cleanFloat(girth))} cm`
              : `${n(cleanFloat(waist))} + ${n(cleanFloat(hip))} − ${n(cleanFloat(neck))} = ${n(cleanFloat(girth))} cm`,
        },
        {
          label: S.step.navyFormula,
          expression: `height = ${n(cleanFloat(height))} cm`,
        },
        {
          label: S.step.navyResult,
          expression: `= ${shown.display}`,
        },
      ],
      extras: [
        { label: S.extra.category, value: band, emphasis: true },
        { label: S.extra.method, value: S.extra.navyMethod },
      ],
      note: S.note.bodyFatEstimate,
    },
  };
}

export function bodyFatMale(inputs: Inputs): CalcOutcome {
  return bodyFatCore(inputs, 'male');
}

export function bodyFatFemale(inputs: Inputs): CalcOutcome {
  return bodyFatCore(inputs, 'female');
}

export const operations: Record<OperationId, (inputs: Inputs) => CalcOutcome> = {
  'percent-of': percentOf,
  'what-percent': whatPercent,
  'percent-of-what': percentOfWhat,
  increase: percentageIncrease,
  decrease: percentageDecrease,
  change: percentageChange,
  difference: percentageDifference,
  discount,
  grade: gradePercent,
  win: winPercent,
  average: averagePercent,
  'weight-loss': weightLossPercent,
  'tax-add': taxAdd,
  'tax-remove': taxRemove,
  'tax-rate': taxRate,
  'body-fat-male': bodyFatMale,
  'body-fat-female': bodyFatFemale,
};

/** Run an operation by id. Unknown ids fail closed rather than throwing. */
export function calculate(operation: OperationId, inputs: Inputs): CalcOutcome {
  const run = operations[operation];
  if (!run) return { ok: false, message: S.err.unknownOperation };
  return run(inputs);
}
