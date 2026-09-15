/** Site-wide constants. Single source of truth for metadata and navigation. */

export const SITE = {
  name: 'Percentage Calculator',
  shortName: 'PercentageCalculator',
  url: 'https://prcentagecalc.com',
  /** Used as the default meta description and the WebSite schema description. */
  description:
    'Free online percentage calculators with step-by-step working. Find a percentage of a number, percentage increase, decrease, change, difference and discounts — instantly, in your browser.',
  locale: 'en_US',
  /** Contact address on the domain the site owns. */
  email: 'hello@prcentagecalc.com',
  /** First year in the footer copyright range. */
  founded: 2026,
} as const;

export type NavItem = { href: string; label: string };

/**
 * Footer links.
 *
 * Neither the calculators nor the guides are here: the navbar menu already
 * lists every one of them, grouped, on every page, and each calculator page
 * carries its own related-calculator links. What is left is the material a
 * footer is actually for — the standalone pages.
 */
export const FOOTER_NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Site',
    items: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
      { href: '/privacy-policy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms' },
      { href: '/disclaimer', label: 'Disclaimer' },
    ],
  },
];

/**
 * The site-relative path of the page being rendered, in the same shape as the
 * hrefs the site builds.
 *
 * `build.format: 'file'` means `Astro.url.pathname` carries a `.html`
 * extension at build time ("/discount-calculator.html"), so comparing it
 * against a generated href silently never matches.
 */
export function currentPath(url: URL): string {
  return url.pathname.replace(/\/?index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '') || '/';
}

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE.url).href;
}

/**
 * Roughly how wide a string renders, in units of one Latin character.
 *
 * Search results are truncated on pixel width, not character count, and CJK
 * glyphs are full-width — so a 30-character Japanese title occupies about the
 * same space as a 60-character English one. Counting characters alone would
 * call every Japanese title far too short and every German one too long.
 */
export function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0)!;
    // CJK ideographs, kana, Hangul syllables and full-width forms.
    const wide =
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x20000 && code <= 0x3fffd);
    width += wide ? 2 : 1;
  }
  return width;
}
