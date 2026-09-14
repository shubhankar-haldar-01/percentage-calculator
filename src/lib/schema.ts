/**
 * JSON-LD builders.
 *
 * Only schema that accurately describes the page. Notably absent: FAQPage.
 * Google restricted FAQ rich results to authoritative government and health
 * sites in August 2023 and retired them from Search entirely on 7 May 2026, so
 * the markup would describe a rich result that no longer exists. The FAQ
 * content itself is still on the pages because it answers real questions.
 *
 * Also absent: aggregateRating and review. The site has no ratings, and
 * inventing them would be both false and a structured-data violation.
 */

import { SITE, absoluteUrl } from './site.ts';

export function websiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: 'en',
    publisher: { '@id': `${SITE.url}/#organization` },
  };
}

export function organizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
  };
}

/**
 * A browser-based calculator is genuinely a WebApplication. The zero price is
 * accurate — the tools are free and require no account.
 */
export function calculatorSchema(options: {
  name: string;
  description: string;
  path: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: options.name,
    description: options.description,
    url: absoluteUrl(options.path),
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    inLanguage: 'en',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@id': `${SITE.url}/#organization` },
  };
}

export type Crumb = { label: string; path: string };

export function breadcrumbSchema(crumbs: Crumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.label,
      item: absoluteUrl(crumb.path),
    })),
  };
}
