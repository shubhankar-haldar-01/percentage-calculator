// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { NOINDEX_LOCALES, retiredRedirects } from './src/i18n/config.ts';

// https://astro.build/config
export default defineConfig({
  site: 'https://prcentagecalc.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  // English at the root, every other locale under its own prefix.
  i18n: {
    locales: ['en', 'es', 'ja', 'fr', 'de', 'pt', 'ko', 'it'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },

  integrations: [
    sitemap({
      // Error pages and locales kept out of search are noindex; listing them in
      // the sitemap would ask a crawler to fetch what it is then told to
      // ignore. /404 is dropped by default, /500 is not.
      filter: (page) => {
        const path = new URL(page).pathname;
        const hidden = NOINDEX_LOCALES.some((locale) => path === `/${locale}` || path.startsWith(`/${locale}/`));
        return !/\/(404|500)$/.test(path) && !hidden;
      },
      // Keep the sitemap compact. Localized slugs are mapped by reciprocal
      // hreflang links in page HTML rather than inferred from matching paths.
      namespaces: { news: false, image: false, video: false },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },

  // `/x-is-what-percent-of-y` and `/what-percent-is-x-of-y` are two phrasings of a
  // single search intent. Serving both as pages would be duplicate content, so the
  // alternate phrasing permanently redirects to the canonical page. The same goes
  // for each locale's retired percentage-calculator page, which competed with
  // that locale's home page: it now redirects there. `public/_redirects` mirrors
  // all of these as real 301s on Cloudflare Pages.
  redirects: {
    '/x-is-what-percent-of-y': { status: 301, destination: '/what-percent-is-x-of-y' },
    ...Object.fromEntries(
      retiredRedirects().map(({ from, to }) => [from, { status: 301, destination: to }]),
    ),
  },

  // DESIGN.md substitutes: figmaSans -> Inter, figmaMono -> JetBrains Mono.
  // The system uses fine weight increments (320, 330, 340, 480, 540, 700), so
  // Inter is pulled as a variable axis rather than fixed instances.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: ['300 700'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      optimizedFallbacks: true,
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      optimizedFallbacks: true,
    },
  ],
});
