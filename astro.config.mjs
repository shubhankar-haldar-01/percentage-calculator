// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://percentagecalculator.com',
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
      // Error pages are noindex; listing them in the sitemap would ask a
      // crawler to fetch what it is then told to ignore. /404 is dropped by
      // default, /500 is not.
      filter: (page) => !/\/(404|500)$/.test(new URL(page).pathname),
      // Only `xhtml` is used, for the hreflang alternates. Declaring the other
      // three on every file is bytes a crawler parses and discards.
      namespaces: { news: false, image: false, video: false },
      // Emits the alternate-language links Google reads alongside the
      // in-page hreflang tags.
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', es: 'es', ja: 'ja', fr: 'fr', de: 'de', pt: 'pt', ko: 'ko', it: 'it' },
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },

  // `/x-is-what-percent-of-y` and `/what-percent-is-x-of-y` are two phrasings of a
  // single search intent. Serving both as pages would be duplicate content, so the
  // alternate phrasing permanently redirects to the canonical page.
  redirects: {
    '/x-is-what-percent-of-y': { status: 301, destination: '/what-percent-is-x-of-y' },
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
