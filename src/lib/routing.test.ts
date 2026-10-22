import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  alternates,
  DEFAULT_LOCALE,
  HOME_CALCULATOR,
  indexedAlternates,
  isIndexable,
  NOINDEX_LOCALES,
  pathFor,
  retiredRedirects,
  type Locale,
} from '../i18n/config.ts';
import { translatedLocales } from '../i18n/content/index.ts';

const LIVE_LOCALES: Locale[] = [DEFAULT_LOCALE, ...translatedLocales()];

describe('the home calculator', () => {
  test('links to it resolve to the home page in every locale', () => {
    for (const locale of LIVE_LOCALES) {
      assert.equal(pathFor(locale, HOME_CALCULATOR), pathFor(locale, 'home'));
    }
  });

  test('public/_redirects 301s every retired URL to its home page', () => {
    // astro.config.mjs builds its redirects from retiredRedirects(), but
    // Cloudflare reads the static file, which has to be kept in step by hand.
    const rules = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split(/\s+/).join(' '));
    assert.equal(retiredRedirects().length, LIVE_LOCALES.length);
    for (const { from, to } of retiredRedirects()) {
      assert.ok(rules.includes(`${from} ${to} 301`), `public/_redirects is missing "${from} ${to} 301"`);
    }
  });
});

describe('locales kept out of search', () => {
  test('stay in the language switcher but leave hreflang', () => {
    assert.ok(NOINDEX_LOCALES.length > 0);
    for (const locale of NOINDEX_LOCALES) {
      assert.equal(isIndexable(locale), false);
      assert.ok(alternates('home').some((entry) => entry.locale === locale), `${locale} missing from the switcher`);
      assert.ok(!indexedAlternates('home').some((entry) => entry.locale === locale), `${locale} still in hreflang`);
    }
  });

  test('never include the default locale, which carries x-default', () => {
    assert.ok(isIndexable(DEFAULT_LOCALE));
  });
});
