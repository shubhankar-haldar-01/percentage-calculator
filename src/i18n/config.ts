/**
 * Locale registry and localized routing.
 *
 * English lives at the site root and is hand-authored; the other locales are
 * generated from translated content through `src/pages/[lang]/[slug].astro`.
 * Slugs are localized per language so the URL carries the keyword too —
 * except for Japanese and Korean, where non-ASCII slugs percent-encode into
 * unreadable URLs and ASCII paths are the convention.
 */

import { translatedLocales } from './content/index.ts';

export const LOCALES = ['en', 'es', 'ja', 'fr', 'de', 'pt', 'ko', 'it'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Locales that get a `/xx/` prefix — everything except the default. */
export const TRANSLATED_LOCALES = LOCALES.filter((l) => l !== DEFAULT_LOCALE) as Exclude<
  Locale,
  'en'
>[];

/**
 * Native name, shown in the language switcher, plus the BCP-47 tag.
 *
 * `og` is the territory-qualified form Open Graph insists on. The tag itself
 * stays territory-free, because the content targets the language rather than
 * any one country — the exception is Portuguese, whose prose and tax examples
 * are European, so pt_PT is the honest code.
 */
export const LOCALE_META: Record<Locale, { label: string; tag: string; og: string }> = {
  en: { label: 'English', tag: 'en', og: 'en_US' },
  es: { label: 'Español', tag: 'es', og: 'es_ES' },
  ja: { label: '日本語', tag: 'ja', og: 'ja_JP' },
  fr: { label: 'Français', tag: 'fr', og: 'fr_FR' },
  de: { label: 'Deutsch', tag: 'de', og: 'de_DE' },
  pt: { label: 'Português', tag: 'pt', og: 'pt_PT' },
  ko: { label: '한국어', tag: 'ko', og: 'ko_KR' },
  it: { label: 'Italiano', tag: 'it', og: 'it_IT' },
};

/** Every translated page, keyed by a stable identifier. */
export const PAGE_KEYS = [
  'home',
  'percentage-calculator',
  'increase',
  'decrease',
  'change',
  'difference',
  'what-percent',
  'percent-of-what',
  'discount',
  'grade',
  'win',
  'average',
  'weight-loss',
  'body-fat',
  'tax',
  'how-to',
  'formulas',
] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

/**
 * Localized slugs. `home` is the locale root, so its slug is empty.
 * English slugs match the hand-authored pages already at the site root.
 */
export const SLUGS: Record<Locale, Record<PageKey, string>> = {
  en: {
    home: '',
    'percentage-calculator': 'percentage-calculator',
    increase: 'percentage-increase-calculator',
    decrease: 'percentage-decrease-calculator',
    change: 'percentage-change-calculator',
    difference: 'percentage-difference-calculator',
    'what-percent': 'what-percent-is-x-of-y',
    'percent-of-what': 'x-is-y-percent-of-what',
    discount: 'discount-calculator',
    grade: 'grade-percentage-calculator',
    win: 'win-percentage-calculator',
    average: 'average-percentage-calculator',
    'weight-loss': 'weight-loss-percentage-calculator',
    'body-fat': 'body-fat-percentage-calculator',
    tax: 'tax-percentage-calculator',
    'how-to': 'how-to-calculate-percentage',
    formulas: 'percentage-formula',
  },
  es: {
    home: '',
    'percentage-calculator': 'calculadora-de-porcentaje',
    increase: 'calculadora-de-aumento-porcentual',
    decrease: 'calculadora-de-disminucion-porcentual',
    change: 'calculadora-de-variacion-porcentual',
    difference: 'calculadora-de-diferencia-porcentual',
    'what-percent': 'que-porcentaje-es-x-de-y',
    'percent-of-what': 'x-es-y-por-ciento-de-que-numero',
    discount: 'calculadora-de-descuentos',
    grade: 'calculadora-de-porcentaje-de-notas',
    win: 'calculadora-de-porcentaje-de-victorias',
    average: 'calculadora-de-porcentaje-promedio',
    'weight-loss': 'calculadora-de-porcentaje-de-perdida-de-peso',
    'body-fat': 'calculadora-de-porcentaje-de-grasa-corporal',
    tax: 'calculadora-de-porcentaje-de-impuestos',
    'how-to': 'como-calcular-porcentajes',
    formulas: 'formulas-de-porcentaje',
  },
  ja: {
    home: '',
    'percentage-calculator': 'percentage-calculator',
    increase: 'percentage-increase-calculator',
    decrease: 'percentage-decrease-calculator',
    change: 'percentage-change-calculator',
    difference: 'percentage-difference-calculator',
    'what-percent': 'what-percent-is-x-of-y',
    'percent-of-what': 'x-is-y-percent-of-what',
    discount: 'discount-calculator',
    grade: 'grade-percentage-calculator',
    win: 'win-percentage-calculator',
    average: 'average-percentage-calculator',
    'weight-loss': 'weight-loss-percentage-calculator',
    'body-fat': 'body-fat-percentage-calculator',
    tax: 'tax-percentage-calculator',
    'how-to': 'how-to-calculate-percentage',
    formulas: 'percentage-formula',
  },
  fr: {
    home: '',
    'percentage-calculator': 'calculateur-de-pourcentage',
    increase: 'calculateur-augmentation-pourcentage',
    decrease: 'calculateur-diminution-pourcentage',
    change: 'calculateur-variation-pourcentage',
    difference: 'calculateur-difference-pourcentage',
    'what-percent': 'quel-pourcentage-represente-x-de-y',
    'percent-of-what': 'x-est-y-pour-cent-de-quel-nombre',
    discount: 'calculateur-de-remise',
    grade: 'calculateur-de-pourcentage-de-note',
    win: 'calculateur-pourcentage-de-victoires',
    average: 'calculateur-pourcentage-moyen',
    'weight-loss': 'calculateur-pourcentage-perte-de-poids',
    'body-fat': 'calculateur-pourcentage-masse-grasse',
    tax: 'calculateur-pourcentage-taxe',
    'how-to': 'comment-calculer-un-pourcentage',
    formulas: 'formules-de-pourcentage',
  },
  de: {
    home: '',
    'percentage-calculator': 'prozentrechner',
    increase: 'prozentuale-zunahme-rechner',
    decrease: 'prozentuale-abnahme-rechner',
    change: 'prozentuale-veraenderung-rechner',
    difference: 'prozentuale-differenz-rechner',
    'what-percent': 'wie-viel-prozent-ist-x-von-y',
    'percent-of-what': 'x-ist-y-prozent-von-welcher-zahl',
    discount: 'rabattrechner',
    grade: 'noten-prozentrechner',
    win: 'siegquote-rechner',
    average: 'durchschnittlicher-prozentsatz-rechner',
    'weight-loss': 'gewichtsverlust-prozentrechner',
    'body-fat': 'koerperfettanteil-rechner',
    tax: 'steuer-prozentrechner',
    'how-to': 'wie-berechnet-man-prozent',
    formulas: 'prozentformeln',
  },
  pt: {
    home: '',
    'percentage-calculator': 'calculadora-de-porcentagem',
    increase: 'calculadora-de-aumento-percentual',
    decrease: 'calculadora-de-reducao-percentual',
    change: 'calculadora-de-variacao-percentual',
    difference: 'calculadora-de-diferenca-percentual',
    'what-percent': 'que-porcentagem-e-x-de-y',
    'percent-of-what': 'x-e-y-por-cento-de-que-numero',
    discount: 'calculadora-de-desconto',
    grade: 'calculadora-de-porcentagem-de-notas',
    win: 'calculadora-de-porcentagem-de-vitorias',
    average: 'calculadora-de-porcentagem-media',
    'weight-loss': 'calculadora-de-porcentagem-de-perda-de-peso',
    'body-fat': 'calculadora-de-percentual-de-gordura-corporal',
    tax: 'calculadora-de-porcentagem-de-imposto',
    'how-to': 'como-calcular-porcentagem',
    formulas: 'formulas-de-porcentagem',
  },
  ko: {
    home: '',
    'percentage-calculator': 'percentage-calculator',
    increase: 'percentage-increase-calculator',
    decrease: 'percentage-decrease-calculator',
    change: 'percentage-change-calculator',
    difference: 'percentage-difference-calculator',
    'what-percent': 'what-percent-is-x-of-y',
    'percent-of-what': 'x-is-y-percent-of-what',
    discount: 'discount-calculator',
    grade: 'grade-percentage-calculator',
    win: 'win-percentage-calculator',
    average: 'average-percentage-calculator',
    'weight-loss': 'weight-loss-percentage-calculator',
    'body-fat': 'body-fat-percentage-calculator',
    tax: 'tax-percentage-calculator',
    'how-to': 'how-to-calculate-percentage',
    formulas: 'percentage-formula',
  },
  it: {
    home: '',
    'percentage-calculator': 'calcolo-percentuale',
    increase: 'calcolo-aumento-percentuale',
    decrease: 'calcolo-diminuzione-percentuale',
    change: 'calcolo-variazione-percentuale',
    difference: 'calcolo-differenza-percentuale',
    'what-percent': 'che-percentuale-e-x-di-y',
    'percent-of-what': 'x-e-y-percento-di-quale-numero',
    discount: 'calcolo-sconto',
    grade: 'calcolo-percentuale-voti',
    win: 'calcolo-percentuale-vittorie',
    average: 'calcolo-percentuale-media',
    'weight-loss': 'calcolo-percentuale-perdita-di-peso',
    'body-fat': 'calcolo-percentuale-massa-grassa',
    tax: 'calcolo-percentuale-iva',
    'how-to': 'come-calcolare-la-percentuale',
    formulas: 'formule-percentuali',
  },
};

/** The 14 calculator pages, in the order they appear in listings. */
export const CALC_KEYS = [
  'percentage-calculator', 'increase', 'decrease', 'change', 'difference',
  'what-percent', 'percent-of-what', 'discount', 'grade', 'win', 'average',
  'weight-loss', 'body-fat', 'tax',
] as const satisfies readonly PageKey[];

export type CalcKey = (typeof CALC_KEYS)[number];

/** The two long-form guide pages. */
export const GUIDE_KEYS = ['how-to', 'formulas'] as const satisfies readonly PageKey[];

/** Site-relative path for a page in a locale, e.g. "/es/calculadora-de-porcentaje". */
export function pathFor(locale: Locale, key: PageKey): string {
  const slug = SLUGS[locale][key];
  if (locale === DEFAULT_LOCALE) return slug ? `/${slug}` : '/';
  return slug ? `/${locale}/${slug}` : `/${locale}`;
}

/**
 * English slug to page key.
 *
 * The calculator registry identifies tools by their English slug, but content
 * and labels are keyed by page key, so anything holding a `CalculatorDef` needs
 * this to reach the translated strings.
 */
const KEY_BY_EN_SLUG = new Map<string, PageKey>(PAGE_KEYS.map((key) => [SLUGS.en[key], key]));

/**
 * Calculator page key for an English slug, with or without its leading slash.
 *
 * Narrowed to calculator keys rather than every page key, because the label
 * records it feeds cover only the calculators — the guides and the home page
 * have no entry there, and the type should say so.
 */
export function calcKeyForSlug(slug: string): CalcKey | undefined {
  const key = KEY_BY_EN_SLUG.get(slug.replace(/^\//, ''));
  return key && (CALC_KEYS as readonly PageKey[]).includes(key) ? (key as CalcKey) : undefined;
}

/** Read the locale out of a URL path; falls back to the default. */
export function localeFromPath(pathname: string): Locale {
  const first = pathname.split('/').filter(Boolean)[0];
  return (LOCALES as readonly string[]).includes(first ?? '') ? (first as Locale) : DEFAULT_LOCALE;
}

/**
 * Every locale variant of one page that actually exists, for hreflang and the
 * language switcher.
 *
 * Driven by the content registry rather than the locale list, so an alternate
 * is never advertised for a page that was not generated.
 */
export function alternates(key: PageKey): { locale: Locale; tag: string; path: string }[] {
  const live: Locale[] = [DEFAULT_LOCALE, ...translatedLocales()];
  return LOCALES.filter((locale) => live.includes(locale)).map((locale) => ({
    locale,
    tag: LOCALE_META[locale].tag,
    path: pathFor(locale, key),
  }));
}
