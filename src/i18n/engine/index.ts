/**
 * Engine string registry for server-side rendering.
 *
 * The client loads a single locale dynamically; pages use this to render the
 * formula card in the right language at build time.
 */
import type { Locale } from '../config.ts';
import type { OperationId } from '../../lib/percentage.ts';
import { engineEn, type EngineStrings } from './en.ts';
import { engineEs } from './es.ts';
import { engineJa } from './ja.ts';
import { engineFr } from './fr.ts';
import { engineDe } from './de.ts';
import { enginePt } from './pt.ts';
import { engineKo } from './ko.ts';
import { engineIt } from './it.ts';

const ENGINE: Record<Locale, EngineStrings> = {
  en: engineEn, es: engineEs, ja: engineJa, fr: engineFr,
  de: engineDe, pt: enginePt, ko: engineKo, it: engineIt,
};

export function engine(locale: Locale): EngineStrings {
  return ENGINE[locale] ?? engineEn;
}

/** The formula an operation displays, in the given locale. */
const FORMULA_KEY: Record<OperationId, keyof EngineStrings['formula']> = {
  'percent-of': 'percentOf',
  'what-percent': 'whatPercent',
  'percent-of-what': 'percentOfWhat',
  increase: 'changeUp',
  decrease: 'changeDown',
  change: 'changeUp',
  difference: 'difference',
  discount: 'discount',
  grade: 'grade',
  win: 'winPlain',
  average: 'averagePlain',
  'weight-loss': 'weightLoss',
  'tax-add': 'taxAdd',
  'tax-remove': 'taxRemove',
  'tax-rate': 'taxRate',
  'body-fat-male': 'bodyFatMale',
  'body-fat-female': 'bodyFatFemale',
};

export function formulaFor(locale: Locale, operation: OperationId): string {
  return engine(locale).formula[FORMULA_KEY[operation]];
}
