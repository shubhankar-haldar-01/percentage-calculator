/**
 * Registry of translated content.
 *
 * This is the source of truth for which locales actually exist. `alternates()`
 * reads it so hreflang can never advertise a page that was not generated — an
 * incomplete alternate set is worse than none.
 */
import type { Locale } from '../config.ts';
import type { LocaleContent } from './types.ts';
import { contentEs } from './es.ts';
import { contentDe } from './de.ts';
import { contentFr } from './fr.ts';
import { contentIt } from './it.ts';
import { contentPt } from './pt.ts';
import { contentJa } from './ja.ts';
import { contentKo } from './ko.ts';

const CONTENT: Partial<Record<Locale, LocaleContent>> = {
  es: contentEs,
  de: contentDe,
  fr: contentFr,
  it: contentIt,
  pt: contentPt,
  ja: contentJa,
  ko: contentKo,
};

/** Locales that have translated content, excluding the English default. */
export function translatedLocales(): Locale[] {
  return Object.keys(CONTENT) as Locale[];
}

export function contentFor(locale: Locale): LocaleContent {
  const found = CONTENT[locale];
  if (!found) throw new Error(`No content for locale: ${locale}`);
  return found;
}

export function hasContent(locale: Locale): boolean {
  return locale in CONTENT;
}
