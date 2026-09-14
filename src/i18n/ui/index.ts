import type { Locale } from '../config.ts';
import { en, type UIStrings } from './en.ts';
import { es } from './es.ts';
import { ja } from './ja.ts';
import { fr } from './fr.ts';
import { de } from './de.ts';
import { pt } from './pt.ts';
import { ko } from './ko.ts';
import { it } from './it.ts';

export type { UIStrings };

const DICTIONARIES: Record<Locale, UIStrings> = { en, es, ja, fr, de, pt, ko, it };

/** UI strings for a locale. */
export function ui(locale: Locale): UIStrings {
  return DICTIONARIES[locale];
}
