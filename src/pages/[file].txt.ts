import type { APIRoute, GetStaticPaths } from 'astro';
import { adsensePublisherId } from '../lib/site.ts';

/**
 * ads.txt
 *
 * Declares Google as an authorised seller of this site's ad space. Without it,
 * AdSense flags the account's earnings as at risk.
 *
 * A dynamic route rather than ads.txt.ts because a static endpoint is always
 * written. This way no file exists until a publisher ID is set in SITE, rather
 * than one that authorises nobody.
 */
export const getStaticPaths = (() =>
  adsensePublisherId ? [{ params: { file: 'ads' } }] : []) satisfies GetStaticPaths;

export const GET: APIRoute = () =>
  new Response(`google.com, ${adsensePublisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
