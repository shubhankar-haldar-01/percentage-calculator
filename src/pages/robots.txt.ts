import type { APIRoute } from 'astro';
import { SITE } from '../lib/site.ts';

/**
 * robots.txt
 *
 * Query-string variants of a calculator (?percent=20&value=500) are shareable
 * links, not pages. Every page already carries a canonical pointing at its
 * clean URL; disallowing crawl of parameterised URLs stops them being
 * discovered as separate entries in the first place.
 *
 * The AdSense crawler is the exception. It has to read every page an ad can
 * appear on, shared links included, or those pages get less relevant ads or
 * none. A bot follows only the most specific group naming it, so this group
 * changes nothing for Googlebot or any other crawler.
 */
export const GET: APIRoute = () =>
  new Response(
    `User-agent: Mediapartners-Google
Allow: /

User-agent: *
Allow: /
Disallow: /*?

Sitemap: ${SITE.url}/sitemap-index.xml
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
