# Percentage Calculator

A static percentage-calculator site built with Astro, TypeScript and Tailwind CSS v4.
Every calculation runs in the browser — there is no calculation server and no API.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on `localhost:4321` |
| `npm run build` | Build the static site to `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm test` | Run the calculation-engine tests |
| `npm run check` | Type-check `.astro` and `.ts` files |
| `npm run check:prose` | Catch inline tags glued to adjacent words in `dist/` |
| `npm run verify` | Type-check, test, build, then check prose |

Tests use Node's built-in test runner against TypeScript directly — no test
framework or transpiler is installed.

## Structure

```
src/
  lib/
    percentage.ts       The calculation engine: every formula, validation
                        message and step-by-step explanation
    percentage.test.ts  Engine tests
    number.ts           Parsing, float-noise cleanup, display formatting
    number.test.ts      Formatting tests
    calculators.ts      Registry of tools: fields, modes, metadata
    schema.ts           JSON-LD builders
    site.ts             Site constants and navigation
    analytics.ts        Event dispatch (no vendor bundled)
  i18n/
    config.ts           Locale registry, localized slugs, hreflang alternates
    ui/                 Chrome strings (nav, buttons, labels) per locale
    engine/             The engine's prose (errors, formulas, steps) per locale
    content/            Page content (titles, intros, examples, FAQs) per locale
  scripts/
    calculator.ts       The only client-side module: wires the DOM to the engine
  components/           Astro components
  layouts/              Page shells
  pages/                One file per route
    [lang]/             Generates every translated page from the registry
  styles/global.css     Design tokens + component utilities
```

### Calculators

Fourteen tools, all driven by one engine and one component:

| Page | Targets |
| --- | --- |
| `/percentage-calculator` | percentage of a number, share, missing total |
| `/percentage-increase-calculator` | increase percentage calculator |
| `/percentage-decrease-calculator` | percentage decrease |
| `/percentage-change-calculator` | percentage change |
| `/percentage-difference-calculator` | percentage difference |
| `/what-percent-is-x-of-y` | what percent is X of Y |
| `/x-is-y-percent-of-what` | X is Y% of what number |
| `/discount-calculator` | discount percentage |
| `/grade-percentage-calculator` | grade and test percentage calculator |
| `/average-percentage-calculator` | average percentage, weighted average |
| `/win-percentage-calculator` | win percentage |
| `/weight-loss-percentage-calculator` | weight loss percentage |
| `/body-fat-percentage-calculator` | body fat percentage (US Navy method) |
| `/tax-percentage-calculator` | tax percentage — add, remove, find the rate |

### Where the logic lives

All arithmetic, input validation, error wording and step-by-step explanations
live in `src/lib/percentage.ts`. Each operation takes the raw strings a user
typed and returns either a fully-explained result or a human-readable error.
`src/scripts/calculator.ts` only moves values between the DOM and that module,
which keeps the entire user-visible path under test.

To add a calculator: add the operation to `percentage.ts` (with tests), register
the tool in `calculators.ts`, and add a page that renders `CalculatorLayout`.
The dispatch tests iterate `operations`, so a new calculator cannot be added
without being covered.

Fields default to a single numeric input. `kind: 'list'` renders a textarea
accepting comma-separated values (used by the average calculator, where
Ctrl/Cmd+Enter submits since Enter inserts a newline), and `kind: 'select'`
renders a fixed set of choices.

### A footgun worth knowing

Astro trims the newline between text and a following inline element, so

```astro
... the difference between them is measured in
<strong>percentage points</strong>
```

renders as `measured in**percentage points**` with no space. End the preceding
line with `{' '}`. `npm run check:prose` fails the build output if any slip
through.

### A second footgun

`build.format: 'file'` means `Astro.url.pathname` carries a `.html` extension
at build time — `/discount-calculator.html`, not `/discount-calculator`. Any
comparison against a generated href therefore never matches, silently: no
error, just an active state that never appears. Use `currentPath(Astro.url)`
from `lib/site.ts`, which normalises it back to the shape the site's own links
use.

## Navigation

The bar carries a wordmark, one menu, and the utility cluster (language, theme,
primary CTA) — nothing else. Every calculator and guide lives inside that one
disclosure, grouped by subject, so adding a calculator never adds anything to
the bar.

The footer deliberately does not repeat them. It holds the two guides and the
five standalone pages — About, Contact, Privacy policy, Terms, Disclaimer —
under one `Site` head, and nothing else. Calculators are already one click away
from the bar on every page, and each calculator page carries its own
related-calculator links.

Its composition is set by that short list. The spec's dense multi-column grid
assumed the footer carried the site's navigation; with seven links it was mostly
air, so the wordmark and the list sit on one line instead of stacking, and the
list fills down its first column before moving across, because that is how a
list is read. The wordmark side carries the privacy line and a secondary pill,
which is what keeps the two sides roughly level.

It is a native `<details>`, which matters for three reasons: all sixteen links
are in the HTML for crawlers, the menu opens with no JavaScript, and the
open/close and button semantics come from the platform. Script supplies only
Escape, outside-click, and closing the language menu when this one opens (the
`name` attribute makes disclosures exclusive only within their own group).

Group headings are `<p>` elements tied to their list with `aria-labelledby`,
not headings: the menu repeats on every page, and six more `<h2>`s in every
document outline would bury the real ones.

Three things give way as the viewport narrows, in this order: the wordmark at
900px, the menu's own label at 480px (it becomes a hamburger), and the CTA's
long form at 640px. `qa/navfit.mjs` sweeps 320-1440px in 8px steps across all
eight locales, because the widths that break are the ones a longer language
reaches first.

## Languages

Eight locales: English at the root, and `/es`, `/ja`, `/fr`, `/de`, `/pt`, `/ko`
and `/it`. English pages are hand-authored; every other locale is generated from
the content registry, so 17 pages x 8 locales = 136 translated routes plus the
English-only extras.

Strings are split three ways because they have different lifetimes and different
consumers:

| Where | What | Loaded |
| --- | --- | --- |
| `i18n/ui/` | Nav, buttons, field labels, empty states | At build time, per page |
| `i18n/engine/` | Error messages, formulas, step-by-step prose | In the browser, one locale |
| `i18n/content/` | Titles, descriptions, intros, worked examples, FAQs | At build time, per page |

The engine's strings are the only ones shipped to the browser, and only one
locale's worth: `calculator.ts` dynamically imports the matching module based on
`data-locale` and calls `setEngineStrings()` before wiring any calculator. The
engine keeps that at module scope rather than threading a locale through every
operation, which is safe because it only ever runs client-side and a document
has exactly one language.

### Adding a locale

1. Add the code to `LOCALES` and `LOCALE_META` in `i18n/config.ts`, including
   its Open Graph territory code.
2. Add a row to `SLUGS` — localized slugs, so the URL carries the keyword too.
   Japanese and Korean deliberately keep ASCII slugs, because non-ASCII ones
   percent-encode into unreadable URLs.
3. Write `i18n/ui/<code>.ts` and `i18n/engine/<code>.ts`. The English files are
   the type source, so a missing key is a build error rather than a silent
   fallback to English.
4. Write `i18n/content/<code>.ts` and register it in `i18n/content/index.ts`.

That last registration is what makes a locale real. `alternates()` reads the
content registry rather than the locale list, so hreflang can never advertise a
page that was not generated — a half-translated locale simply does not appear in
anyone's alternates until its content lands.

### hreflang

Every page links all eight locales plus `x-default` on the English URL, and each
alternate is reciprocal. Pages that exist only in English — privacy, terms,
contact, about — pass no `pageKey` and emit no alternates at all, which is
correct: an incomplete set is worse than none.

### Things that only break in translation

- **Long words.** German compounds exceed a 320px viewport at display sizes
  ("Prozentrechner" alone wants 327px in `text-display-xl`), and a word that
  cannot break sets a floor no container can shrink under. Headings and
  `.numeric` carry `overflow-wrap`, the hyphenating languages get `hyphens:
  auto`, and single-column grids are pinned to `minmax(0,1fr)` so no child can
  widen the page.
- **Title budgets.** The ` | Percentage Calculator` suffix is appended only when
  the result still fits what Google shows. Translated titles already carry the
  keyword in their own language, and the English brand would only be truncated
  away, taking real words with it.
- **CJK is denser.** Search results truncate on pixel width, and CJK glyphs are
  full-width, so a 50-character Japanese description is as long as a
  100-character English one. `displayWidth()` in `lib/site.ts` counts that way;
  counting characters would call every Japanese title far too short.

## Design

`figma/DESIGN.md` is the source of truth. Its tokens are mapped into Tailwind's
`@theme` in `src/styles/global.css`.

The rules that shape most of the UI:

- **Monochrome frame, colour as surface.** Pure black on pure white carries
  every CTA, headline and body line. Colour never appears as a text tone — it
  arrives as a whole `ColorBlock` section (lime, lilac, cream, pink, mint,
  coral, navy) with 24px corners and 48px padding. The page returns to white
  canvas between any two blocks, and no two are adjacent.
- **No mid-grey text.** Hierarchy comes from Inter's variable weight axis —
  320 body, 330 small, 340 display, 480 links and buttons, 540 headings, 700
  card titles. The one grey in the system is the input placeholder, which is
  affordance rather than content.
- **Pills only.** Every CTA is `rounded-pill`; every icon button is a circle.
  Selected states use the primary surface — a chosen tab is a black pill, the
  same fill as the primary button.
- **Mono is taxonomy.** `eyebrow` and `caption` are uppercase JetBrains Mono
  with positive tracking, used for section markers and column heads — never for
  paragraphs. Numbers also render in mono via the `numeric` utility.
- **Shadow-light.** One `shadow-soft` tier; colour blocks do the work elevation
  usually does.

The result panel uses this vocabulary for direction: an increase lands on mint,
a decrease on pink. Colour is never the only signal — the sentence beneath
still says "increase" or "decrease".

### Theming

`figma/DESIGN.md` documents no dark theme, so this one is **derived rather than
specified**: the monochrome core simply swaps — the spec's own `inverse-canvas`
/ `inverse-ink` pair becomes the page — while every colour block keeps its
pastel surface in both themes. That preserves the system's signature, since
colour is still a whole surface rather than a tint.

Because blocks stay light in both themes, text on them is pinned to
`--color-block-ink` instead of following the flipping ink token. The same
applies to the mint/pink result panels.

Three states: with nothing stored the page follows the OS through
`prefers-color-scheme`; the toggle pins `data-theme` on `<html>` and stores it.
A tiny inline script in `<head>` applies a stored choice before first paint, so
a pinned dark theme never flashes white.

### Deviations from the spec

- **Header breakpoints are measured, not the documented ones.** The spec
  collapses the nav at 960px; with 20px button type the row does not actually
  fit until 1120px, and the wordmark and secondary pill have their own
  thresholds. All verified at 8px steps from 320–1920px.
- **The marquee strip is static.** The spec describes a scrolling ribbon; an
  auto-scrolling marquee is a motion hazard, so it renders as a fixed row of
  real links to prefilled calculators.
- **The footer is one row, not a link grid.** The spec's dense multi-column
  footer assumed the footer carried the site's navigation; here the navbar menu
  does, so repeating fourteen calculators below every page only made it longer.

## Performance

The build ships no framework runtime. Measured on the built output at mobile
viewport: LCP well under 200ms and CLS 0.000. Fonts (Inter, JetBrains Mono) are
self-hosted via Astro's font pipeline, so no request leaves the origin.

## Privacy

Calculations never leave the browser. The site sets no cookies and loads no
third-party scripts. `localStorage` holds only calculation history and the
currency preference, both clearable from the UI.

`src/lib/analytics.ts` pushes events onto `window.dataLayer` and forwards them to
`gtag` when a tag is present, so GA4 or Tag Manager can be added later without
touching calculator code. No analytics vendor is currently bundled — if one is
added, update `/privacy-policy` first. Events never include the numbers a user
typed.

Tracked events: `calculator_used`, `calculation_completed`,
`calculator_mode_changed`, `calculator_reset`, `result_copied`,
`result_shared`, `history_cleared`, `faq_opened`.

## SEO notes

- `site` in `astro.config.mjs` drives canonicals and the sitemap. Change it before
  deploying anywhere other than `percentagecalculator.com`.
- Query strings are shareable links, not pages. Every page canonicalises to its
  clean URL and `robots.txt` disallows `/*?`.
- `/x-is-what-percent-of-y` permanently redirects to `/what-percent-is-x-of-y`;
  they are one search intent, and serving both would be duplicate content.
- `Faq.astro` emits `FAQPage` JSON-LD, built from the same array the accordion
  renders so the structured data and the visible answers cannot drift apart —
  which is the condition search engines check. Exactly one page renders one
  `<Faq>`, so there is never more than one `FAQPage` per URL. Note that Google
  retired FAQ rich results from Search on 7 May 2026, so this will not produce a
  rich result there; it stays valid schema.org that other engines and answer
  engines read. `WebSite`, `Organization`, `WebApplication` and `BreadcrumbList`
  are also used.
- Each page owns one keyword cluster. "Grade percentage calculator" and "test
  percentage calculator" are the same intent, so they share one page rather than
  becoming two thin ones.
- `SEO.astro` emits the full Open Graph set (including `og:image:type`,
  `og:image:secure_url` and `twitter:image:alt`) plus a `robots` directive with
  `max-snippet:-1` and `max-image-preview:large`. Guide pages pass
  `ogType="article"` with a `modified` date.
- `og:locale` follows the page's language, and `og:locale:alternate` lists the
  other seven — but only on pages that actually have translations, matching the
  hreflang set exactly.
- The sitemap covers all eight locales. See **Languages** for how hreflang stays
  reciprocal and why it is driven by the content registry.

## Error pages

`/404` and `/500`, both `noindex` and both filtered out of the sitemap — listing
a page in the sitemap and then telling the crawler to ignore it is a
contradiction worth avoiding.

The two are deliberately different shapes. A wrong address is a navigation
problem, so the 404 lists every calculator and a reader can recover in one
click. A 500 is not something the reader can act on, so it stays to a short
explanation, a reload suggestion, and two ways out.

Both keep the header and footer, so there is always a route onward.

**Hosting.** Static hosts serve `/404.html` for unmatched paths automatically,
and `npm run preview` already does — a request to a missing path returns a real
404 status with the custom body. `/500.html` is different: nothing in a static
build can raise a 500, so it would come from the host or CDN, and whether that
file gets used depends on the host. Check your host's custom-error-page setting
and point it at `/500.html`; some static hosts do not support it at all, in
which case the file is harmless and simply unused.

**One 404 for every language.** A reader who mistypes a URL under `/de/` gets
the English 404, because the root `404.html` is what an unmatched path falls
back to. Hosts that look for the nearest `404.html` up the directory tree
(Netlify and Cloudflare Pages among them) would use a localised one if it
existed; adding `src/pages/[lang]/404.astro` would generate them.

## Deploying

Cloudflare Pages, project `percentage-calculator`, live at
`https://percentage-calculator-5zn.pages.dev`.

```
npm run deploy           # build, then upload dist/ to the production branch
npm run deploy:preview   # same, onto a preview branch
```

The site is static, so no adapter is involved — the deploy is just an upload of
`dist/`. Two things Pages gets right without configuration: `404.html` is served
for unmatched paths with a real 404 status, and `robots.txt`, the sitemaps and
the manifest all come back with correct content types.

`--commit-dirty=true` is set because the deploy runs from the working tree
rather than a clean checkout; drop it if this ever moves to CI.

**Worth knowing.** Cloudflare has folded Pages into Workers and now steers new
projects there — `wrangler pages project create` delegates to Workers unless
`--force` is passed, which is why this project was created with it. Nothing
needs `--force` again. A static site runs fine on either, so this is a migration
to make on your own schedule rather than a problem.

**Not yet configured.** Two Pages features this build would benefit from:

- `_redirects` would turn `/x-is-what-percent-of-y` into a real 301. Right now
  the static build emits a meta-refresh stub, which search engines treat more
  weakly than a server redirect.
- `_headers` would let you send a CSP and the usual security headers, which is
  straightforward here because the site loads no third-party scripts.

## Before deploying

- Confirm the contact address in `src/lib/site.ts` (currently
  `hello@percentagecalculator.com`).
- Serve over HTTPS — the Clipboard API needs a secure context. A copy fallback
  handles insecure contexts, but sharing is a better experience without it.
- Consider security headers at the CDN or host: a CSP is straightforward here
  because the site loads no third-party scripts and uses no inline scripts beyond
  JSON-LD.
