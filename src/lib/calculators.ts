/**
 * The calculator registry.
 *
 * Defines the tools themselves — which operation each runs, which fields it
 * shows and how it phrases its question — plus the metadata that drives
 * navigation, related-calculator links and breadcrumbs.
 *
 * Page prose (FAQs, worked examples, use cases) deliberately lives in the page
 * files instead, so each page satisfies a distinct intent rather than rendering
 * the same blob of content from a shared blob of data.
 */

import type { OperationId } from './percentage.ts';

export type CalculatorField = {
  name: string;
  label: string;
  placeholder: string;
  /** Unit rendered inside the field, e.g. "%". */
  suffix?: string;
  /** Short hint shown under the field. */
  hint?: string;
  /**
   * `text` (default) is a single numeric field, `list` a textarea accepting
   * several comma-separated values, `select` a fixed set of choices.
   */
  kind?: 'text' | 'list' | 'select';
  options?: { value: string; label: string }[];
  /** Marks a field the calculator can do without. */
  optional?: boolean;
  /** Lays the field across both grid columns. */
  wide?: boolean;
};

export type CalculatorMode = {
  id: string;
  operation: OperationId;
  /** Short label for the mode tab. */
  tab: string;
  /** The full question, used as the form's accessible name. */
  question: string;
  fields: CalculatorField[];
  /** Prefilled values used by the "Try an example" affordance. */
  example: Record<string, string>;
};

export type CalculatorDef = {
  slug: string;
  /** Full product name, used in breadcrumbs and card titles. */
  name: string;
  /** Compact label for related-calculator chips. */
  shortName: string;
  /** One-line explanation used on directory cards. */
  blurb: string;
  modes: CalculatorMode[];
};

const CHANGE_FIELDS: CalculatorField[] = [
  { name: 'original', label: 'Original value', placeholder: '100' },
  { name: 'final', label: 'New value', placeholder: '150' },
];

export const CALCULATORS: CalculatorDef[] = [
  {
    slug: '/percentage-calculator',
    name: 'Percentage Calculator',
    shortName: 'Percentage calculator',
    blurb: 'Answer the three core percentage questions — a percentage of a number, a share as a percentage, and the missing total.',
    modes: [
      {
        id: 'percent-of',
        operation: 'percent-of',
        tab: 'X% of Y',
        question: 'What is X% of Y?',
        fields: [
          { name: 'percent', label: 'Percentage', placeholder: '20', suffix: '%' },
          { name: 'value', label: 'Number', placeholder: '500' },
        ],
        example: { percent: '20', value: '500' },
      },
      {
        id: 'what-percent',
        operation: 'what-percent',
        tab: 'X is what % of Y',
        question: 'X is what percent of Y?',
        fields: [
          { name: 'part', label: 'Number', placeholder: '25' },
          { name: 'whole', label: 'Total', placeholder: '200' },
        ],
        example: { part: '25', whole: '200' },
      },
      {
        id: 'percent-of-what',
        operation: 'percent-of-what',
        tab: 'X is Y% of what',
        question: 'X is Y% of what number?',
        fields: [
          { name: 'part', label: 'Number', placeholder: '50' },
          { name: 'percent', label: 'Percentage', placeholder: '20', suffix: '%' },
        ],
        example: { part: '50', percent: '20' },
      },
    ],
  },
  {
    slug: '/percentage-increase-calculator',
    name: 'Percentage Increase Calculator',
    shortName: 'Percentage increase',
    blurb: 'Measure how much a value has grown — a pay rise, a price rise or traffic growth.',
    modes: [
      {
        id: 'increase',
        operation: 'increase',
        tab: 'Percentage increase',
        question: 'What is the percentage increase?',
        fields: CHANGE_FIELDS,
        example: { original: '100', final: '150' },
      },
    ],
  },
  {
    slug: '/percentage-decrease-calculator',
    name: 'Percentage Decrease Calculator',
    shortName: 'Percentage decrease',
    blurb: 'Measure how much a value has fallen — a price cut, a drop in sales or a reduced bill.',
    modes: [
      {
        id: 'decrease',
        operation: 'decrease',
        tab: 'Percentage decrease',
        question: 'What is the percentage decrease?',
        fields: [
          { name: 'original', label: 'Original value', placeholder: '200' },
          { name: 'final', label: 'New value', placeholder: '150' },
        ],
        example: { original: '200', final: '150' },
      },
    ],
  },
  {
    slug: '/percentage-change-calculator',
    name: 'Percentage Change Calculator',
    shortName: 'Percentage change',
    blurb: 'One tool for movement in either direction — it tells you whether the value rose or fell.',
    modes: [
      {
        id: 'change',
        operation: 'change',
        tab: 'Percentage change',
        question: 'What is the percentage change?',
        fields: CHANGE_FIELDS,
        example: { original: '100', final: '125' },
      },
    ],
  },
  {
    slug: '/percentage-difference-calculator',
    name: 'Percentage Difference Calculator',
    shortName: 'Percentage difference',
    blurb: 'Compare two values where neither came first — measured against their average.',
    modes: [
      {
        id: 'difference',
        operation: 'difference',
        tab: 'Percentage difference',
        question: 'What is the percentage difference?',
        fields: [
          { name: 'a', label: 'Value A', placeholder: '100' },
          { name: 'b', label: 'Value B', placeholder: '120' },
        ],
        example: { a: '100', b: '120' },
      },
    ],
  },
  {
    slug: '/what-percent-is-x-of-y',
    name: 'What Percent Is X of Y?',
    shortName: 'What percent is X of Y',
    blurb: 'Turn a score, a share or a part into a percentage of the total.',
    modes: [
      {
        id: 'what-percent',
        operation: 'what-percent',
        tab: 'What percent is X of Y',
        question: 'X is what percent of Y?',
        fields: [
          { name: 'part', label: 'Number (the part)', placeholder: '25' },
          { name: 'whole', label: 'Total (the whole)', placeholder: '200' },
        ],
        example: { part: '25', whole: '200' },
      },
    ],
  },
  {
    slug: '/x-is-y-percent-of-what',
    name: 'X Is Y% of What Number?',
    shortName: 'X is Y% of what',
    blurb: 'Work backwards from a part and a percentage to find the original total.',
    modes: [
      {
        id: 'percent-of-what',
        operation: 'percent-of-what',
        tab: 'X is Y% of what',
        question: 'X is Y% of what number?',
        fields: [
          { name: 'part', label: 'Number (the part)', placeholder: '50' },
          { name: 'percent', label: 'Percentage', placeholder: '20', suffix: '%' },
        ],
        example: { part: '50', percent: '20' },
      },
    ],
  },
  {
    slug: '/discount-calculator',
    name: 'Discount Calculator',
    shortName: 'Discount calculator',
    blurb: 'See the money off and the price you actually pay before you get to the till.',
    modes: [
      {
        id: 'discount',
        operation: 'discount',
        tab: 'Discount',
        question: 'What is the final price after a discount?',
        fields: [
          { name: 'price', label: 'Original price', placeholder: '100' },
          { name: 'percent', label: 'Discount', placeholder: '20', suffix: '%' },
        ],
        example: { price: '100', percent: '20' },
      },
    ],
  },
  {
    slug: '/grade-percentage-calculator',
    name: 'Grade Percentage Calculator',
    shortName: 'Grade percentage',
    blurb: 'Turn marks out of any total into a percentage and a letter grade.',
    modes: [
      {
        id: 'grade',
        operation: 'grade',
        tab: 'Grade percentage',
        question: 'What percentage is this grade?',
        fields: [
          { name: 'score', label: 'Marks scored', placeholder: '38' },
          { name: 'total', label: 'Total marks', placeholder: '50' },
        ],
        example: { score: '38', total: '50' },
      },
    ],
  },
  {
    slug: '/win-percentage-calculator',
    name: 'Win Percentage Calculator',
    shortName: 'Win percentage',
    blurb: 'Turn a win–loss record into a win percentage, counting ties the way sports do.',
    modes: [
      {
        id: 'win',
        operation: 'win',
        tab: 'Win percentage',
        question: 'What is the win percentage?',
        fields: [
          { name: 'wins', label: 'Wins', placeholder: '10' },
          { name: 'losses', label: 'Losses', placeholder: '5' },
          { name: 'ties', label: 'Ties or draws', placeholder: '0', optional: true, hint: 'Leave empty if your sport has no draws.' },
        ],
        example: { wins: '10', losses: '5', ties: '2' },
      },
    ],
  },
  {
    slug: '/average-percentage-calculator',
    name: 'Average Percentage Calculator',
    shortName: 'Average percentage',
    blurb: 'Average several percentages — and weight them by group size, which is usually the figure you actually want.',
    modes: [
      {
        id: 'average',
        operation: 'average',
        tab: 'Average percentage',
        question: 'What is the average of these percentages?',
        fields: [
          {
            name: 'values',
            label: 'Percentages',
            placeholder: '80, 60, 95',
            kind: 'list',
            wide: true,
            hint: 'Separate each one with a comma.',
          },
          {
            name: 'weights',
            label: 'Group sizes',
            placeholder: '10, 90, 50',
            kind: 'list',
            wide: true,
            optional: true,
            hint: 'Optional. Add the size behind each percentage to get the weighted average.',
          },
        ],
        example: { values: '80, 60', weights: '10, 90' },
      },
    ],
  },
  {
    slug: '/weight-loss-percentage-calculator',
    name: 'Weight Loss Percentage Calculator',
    shortName: 'Weight loss percentage',
    blurb: 'See what share of your starting weight you have lost, in any unit.',
    modes: [
      {
        id: 'weight-loss',
        operation: 'weight-loss',
        tab: 'Weight loss',
        question: 'What percentage of weight has been lost?',
        fields: [
          { name: 'start', label: 'Starting weight', placeholder: '200' },
          { name: 'current', label: 'Current weight', placeholder: '180' },
        ],
        example: { start: '200', current: '180' },
      },
    ],
  },
  {
    slug: '/tax-percentage-calculator',
    name: 'Tax Percentage Calculator',
    shortName: 'Tax percentage',
    blurb: 'Add tax, strip tax out of a total, or work out the rate you were charged.',
    modes: [
      {
        id: 'tax-add',
        operation: 'tax-add',
        tab: 'Add tax',
        question: 'What is the total after tax?',
        fields: [
          { name: 'amount', label: 'Amount before tax', placeholder: '100' },
          { name: 'rate', label: 'Tax rate', placeholder: '20', suffix: '%' },
        ],
        example: { amount: '100', rate: '20' },
      },
      {
        id: 'tax-remove',
        operation: 'tax-remove',
        tab: 'Remove tax',
        question: 'What was the amount before tax?',
        fields: [
          { name: 'total', label: 'Total including tax', placeholder: '120' },
          { name: 'rate', label: 'Tax rate', placeholder: '20', suffix: '%' },
        ],
        example: { total: '120', rate: '20' },
      },
      {
        id: 'tax-rate',
        operation: 'tax-rate',
        tab: 'Find the rate',
        question: 'What tax rate was applied?',
        fields: [
          { name: 'amount', label: 'Amount before tax', placeholder: '100' },
          { name: 'total', label: 'Total including tax', placeholder: '107.5' },
        ],
        example: { amount: '100', total: '107.5' },
      },
    ],
  },
  {
    slug: '/body-fat-percentage-calculator',
    name: 'Body Fat Percentage Calculator',
    shortName: 'Body fat percentage',
    blurb: 'Estimate body fat from tape measurements using the US Navy method.',
    modes: [
      {
        id: 'body-fat-male',
        operation: 'body-fat-male',
        tab: 'Male',
        question: 'What is the estimated body fat percentage?',
        fields: [
          {
            name: 'unit',
            label: 'Units',
            placeholder: '',
            kind: 'select',
            options: [
              { value: 'cm', label: 'Centimetres' },
              { value: 'in', label: 'Inches' },
            ],
          },
          { name: 'height', label: 'Height', placeholder: '178' },
          { name: 'neck', label: 'Neck', placeholder: '38' },
          { name: 'waist', label: 'Waist', placeholder: '85', hint: 'Measured at the navel.' },
        ],
        example: { unit: 'cm', height: '178', neck: '38', waist: '85' },
      },
      {
        id: 'body-fat-female',
        operation: 'body-fat-female',
        tab: 'Female',
        question: 'What is the estimated body fat percentage?',
        fields: [
          {
            name: 'unit',
            label: 'Units',
            placeholder: '',
            kind: 'select',
            options: [
              { value: 'cm', label: 'Centimetres' },
              { value: 'in', label: 'Inches' },
            ],
          },
          { name: 'height', label: 'Height', placeholder: '165' },
          { name: 'neck', label: 'Neck', placeholder: '32' },
          { name: 'waist', label: 'Waist', placeholder: '72', hint: 'Measured at the narrowest point.' },
          { name: 'hip', label: 'Hips', placeholder: '95', hint: 'Measured at the widest point.' },
        ],
        example: { unit: 'cm', height: '165', neck: '32', waist: '72', hip: '95' },
      },
    ],
  },
];

export function getCalculator(slug: string): CalculatorDef {
  const found = CALCULATORS.find((calculator) => calculator.slug === slug);
  if (!found) throw new Error(`Unknown calculator: ${slug}`);
  return found;
}

/** Resolve an explicit, hand-picked list of related calculators. */
export function related(slugs: string[]): CalculatorDef[] {
  return slugs.map(getCalculator);
}
