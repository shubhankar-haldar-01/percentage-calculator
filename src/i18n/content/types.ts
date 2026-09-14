/**
 * Shape of the translated page content.
 *
 * English is not stored here — the English pages under `src/pages/` are
 * hand-authored and richer (bespoke comparison tables, multiple formula cards).
 * These entries drive the seven translated locales through one shared
 * template, which keeps every localized page substantial and consistent.
 */
import type { PageKey } from '../config.ts';

export type ExampleStep = { label: string; expression: string };

export type CalcContent = {
  /** SEO title, without the site-name suffix. */
  title: string;
  description: string;
  h1: string;
  intro: string;
  /** Sits under the formula, explaining when to reach for it. */
  formulaCaption: string;
  example: { scenario: string; steps: ExampleStep[]; answer: string };
  uses: string[];
  faq: { q: string; a: string }[];
};

export type GuideSection = { heading: string; paragraphs: string[] };

export type GuideContent = {
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: GuideSection[];
  faq: { q: string; a: string }[];
};

export type HomeContent = {
  title: string;
  description: string;
  h1: string;
  lead: string;
  aboutHeading: string;
  /** Long-form paragraphs for the on-page SEO section. */
  about: string[];
};

/** Calculator pages — every PageKey except the home page and the two guides. */
export type CalcPageKey = Exclude<PageKey, 'home' | 'how-to' | 'formulas'>;

/**
 * Labels for the calculator widget itself: field names, mode tabs and the
 * display names used on related-calculator cards and in breadcrumbs.
 */
export type CalcLabels = {
  /** Keyed by the field `name` in the calculator registry. */
  fields: Record<string, string>;
  /** Keyed by the field `name`, for the hint under a field. */
  hints: Record<string, string>;
  /** Keyed by mode id. */
  tabs: Record<string, string>;
  /** Display name per calculator, for cards and breadcrumbs. */
  names: Record<CalcPageKey, string>;
  /** One-line card description per calculator. */
  blurbs: Record<CalcPageKey, string>;
  units: { cm: string; inches: string };
};

export type LocaleContent = {
  labels: CalcLabels;
  home: HomeContent;
  calculators: Record<CalcPageKey, CalcContent>;
  guides: { 'how-to': GuideContent; formulas: GuideContent };
};
