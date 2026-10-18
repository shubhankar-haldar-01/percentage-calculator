/**
 * SEO audit of every page the sitemap advertises.
 *
 * Checks the signals Google uses to decide whether a page can be indexed and
 * which URL represents it: HTTP status, robots directives (meta, header and
 * robots.txt), canonicals, hreflang reciprocity, per-locale rendering, sitemap
 * coverage and duplicate or missing metadata.
 *
 * By default it reads the built output, so run it after `astro build`:
 *
 *   npm run check:seo
 *
 * With --live it audits a deployed origin instead, using real responses and
 * headers — run it after every deploy:
 *
 *   npm run check:seo -- --live https://prcentagecalc.com
 *
 * Everything is derived from the output itself (sitemap, robots.txt, _headers,
 * _redirects, the HTML), so the audit cannot drift from what is deployed.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const liveIndex = process.argv.indexOf('--live');
const LIVE = liveIndex === -1 ? null : (process.argv[liveIndex + 1] ?? '').replace(/\/$/, '');
if (liveIndex !== -1 && !/^https?:\/\//.test(LIVE)) {
  console.error('Usage: node scripts/check-seo.mjs [--live https://example.com]');
  process.exit(2);
}

const failures = new Map();
const fail = (check, detail) => {
  if (!failures.has(check)) failures.set(check, []);
  failures.get(check).push(detail);
};

/* -------------------------------------------------------------------------- */
/* Sources: built files, or the deployed origin                               */
/* -------------------------------------------------------------------------- */

const distFile = (path) => join(DIST, path === '/' ? 'index.html' : `${path}.html`);
const readDist = (name) => (existsSync(join(DIST, name)) ? readFileSync(join(DIST, name), 'utf8') : null);

/** Fetches without following redirects, so a redirect is reported, not hidden. */
async function get(url) {
  const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (compatible; check-seo)' } });
  return { status: res.status, headers: res.headers, body: res.status === 200 ? await res.text() : '' };
}

async function pool(items, size, task) {
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) await task(items[next++]);
    }),
  );
}

/* -------------------------------------------------------------------------- */
/* Parsing                                                                    */
/* -------------------------------------------------------------------------- */

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))?.[1];
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function parsePage(html) {
  const head = html.slice(0, html.indexOf('</head>'));
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const meta = (key) =>
    metas.filter((m) => attr(m, 'name') === key || attr(m, 'property') === key).map((m) => attr(m, 'content') ?? '');
  const hreflang = links
    .filter((l) => /rel="alternate"/.test(l) && /hreflang=/.test(l))
    .map((l) => [attr(l, 'hreflang'), attr(l, 'href')]);
  return {
    lang: html.match(/<html\b[^>]*\blang="([^"]*)"/)?.[1],
    titles: [...html.matchAll(/<title>([\s\S]*?)<\/title>/g)].map((m) => text(m[1])),
    descriptions: meta('description'),
    robots: meta('robots').join(',').toLowerCase(),
    canonicals: links.filter((l) => /rel="canonical"/.test(l)).map((l) => attr(l, 'href')),
    ogUrl: meta('og:url')[0],
    hreflang,
    h1s: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => text(m[1])),
    jsonLd: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]),
    isRedirect: /<meta\s+http-equiv="refresh"/i.test(head),
    skipLink: text(html.match(/<a\s+href="#main"[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? ''),
    legends: [...html.matchAll(/<legend\b[^>]*>([\s\S]*?)<\/legend>/g)].map((m) => text(m[1])),
  };
}

const locs = (xml) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1].trim());

/* Google's robots.txt matching: the longest matching rule wins, Allow on a tie. */
function parseRobots(txt) {
  const groups = [];
  const sitemaps = [];
  let current = null;
  let collectingAgents = false;
  for (const raw of txt.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === 'user-agent') {
      if (!collectingAgents) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
      collectingAgents = true;
      continue;
    }
    collectingAgents = false;
    if (key === 'sitemap') sitemaps.push(value);
    else if ((key === 'allow' || key === 'disallow') && current && value) {
      current.rules.push({ allow: key === 'allow', pattern: value });
    }
  }
  return { groups, sitemaps };
}

function robotsAllows(groups, agent, path) {
  const own = groups.filter((g) => g.agents.includes(agent));
  const rules = (own.length ? own : groups.filter((g) => g.agents.includes('*'))).flatMap((g) => g.rules);
  let best = null;
  for (const rule of rules) {
    const anchored = rule.pattern.endsWith('$');
    const body = (anchored ? rule.pattern.slice(0, -1) : rule.pattern)
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*');
    if (!new RegExp(`^${body}${anchored ? '$' : ''}`).test(path)) continue;
    const longer = !best || rule.pattern.length > best.pattern.length;
    const tieAllow = best && rule.pattern.length === best.pattern.length && rule.allow;
    if (longer || tieAllow) best = rule;
  }
  return !best || best.allow;
}

/* -------------------------------------------------------------------------- */
/* Collect the sitemap and every page it lists                                */
/* -------------------------------------------------------------------------- */

const indexXml = LIVE ? (await get(`${LIVE}/sitemap-index.xml`)).body : readDist('sitemap-index.xml');
if (!indexXml) {
  console.error(LIVE ? `No sitemap-index.xml at ${LIVE}.` : 'No dist/sitemap-index.xml — run `npm run build` first.');
  process.exit(1);
}
const sitemapUrls = locs(indexXml);
if (!sitemapUrls.length) {
  console.error('sitemap-index.xml lists no sitemaps.');
  process.exit(1);
}
// The canonical origin comes from the sitemap; pages are fetched from LIVE when
// auditing a deployment, so a preview URL can be checked before promoting it.
const ORIGIN = new URL(sitemapUrls[0]).origin;

const urls = [];
for (const sitemapUrl of sitemapUrls) {
  const name = new URL(sitemapUrl).pathname.slice(1);
  const xml = LIVE ? (await get(`${LIVE}/${name}`)).body : readDist(name);
  if (!xml) {
    fail('sitemap index points at a missing sitemap', sitemapUrl);
    continue;
  }
  const entries = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
  for (const entry of entries) if (locs(entry).length !== 1) fail('sitemap <url> without exactly one <loc>', name);
  if (!/<urlset\b[\s\S]*<\/urlset>\s*$/.test(xml)) fail('sitemap is not a complete <urlset>', name);
  urls.push(...locs(xml));
}

const inSitemap = new Set(urls);
const seen = new Set();
for (const url of urls) {
  if (seen.has(url)) fail('sitemap lists a URL twice', url);
  seen.add(url);
  const parsed = new URL(url);
  if (parsed.origin !== ORIGIN) fail('sitemap URL on another origin', url);
  if (parsed.protocol !== 'https:') fail('sitemap URL is not https', url);
  if (parsed.search || parsed.hash) fail('sitemap URL carries a query or fragment', url);
  if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) fail('sitemap URL has a trailing slash', url);
}

/* -------------------------------------------------------------------------- */
/* robots.txt, _headers and _redirects                                        */
/* -------------------------------------------------------------------------- */

const robotsTxt = LIVE ? (await get(`${LIVE}/robots.txt`)).body : readDist('robots.txt');
if (!robotsTxt) fail('robots.txt missing', ORIGIN);
else {
  const { groups, sitemaps } = parseRobots(robotsTxt);
  for (const url of urls) {
    const path = new URL(url).pathname;
    if (!robotsAllows(groups, 'googlebot', path)) fail('robots.txt blocks Googlebot from a sitemap URL', url);
  }
  if (!sitemaps.includes(`${ORIGIN}/sitemap-index.xml`)) {
    fail('robots.txt does not reference the sitemap index', sitemaps.join(', ') || '(no Sitemap line)');
  }
}

// Cloudflare Pages header rules: a noindex must only ever target another host
// (the pages.dev alias), never a path, which would apply to production.
const headersFile = readDist('_headers') ?? '';
let pattern = null;
for (const line of headersFile.split('\n')) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (!/^\s/.test(line)) {
    pattern = line.trim();
    continue;
  }
  if (/^\s*x-robots-tag\s*:.*\b(noindex|none)\b/i.test(line)) {
    const host = /^https?:\/\//.test(pattern) ? new URL(pattern.replace(/\*/g, 'x')).host : null;
    if (!host || host === new URL(ORIGIN).host) fail('_headers applies noindex to the production site', pattern);
  }
}

const redirects = (readDist('_redirects') ?? '')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const [from, to, status = '302'] = line.split(/\s+/);
    return { from, to, status };
  });
for (const rule of redirects) {
  if (!['301', '308'].includes(rule.status)) fail('_redirects rule is not permanent', `${rule.from} ${rule.status}`);
  if (inSitemap.has(new URL(rule.from, ORIGIN).href)) fail('sitemap lists a redirected URL', rule.from);
  if (!inSitemap.has(new URL(rule.to, ORIGIN).href)) fail('_redirects target is not an indexable sitemap URL', `${rule.from} → ${rule.to}`);
}

/* -------------------------------------------------------------------------- */
/* Every sitemap page                                                         */
/* -------------------------------------------------------------------------- */

const pages = new Map();
await pool(urls, LIVE ? 6 : 1, async (url) => {
  const path = new URL(url).pathname;
  let html;
  if (LIVE) {
    const res = await get(`${LIVE}${path}`);
    if (res.status !== 200) {
      fail('sitemap URL does not return 200', `${url} → ${res.status} ${res.headers.get('location') ?? ''}`.trim());
      return;
    }
    const xRobots = res.headers.get('x-robots-tag') ?? '';
    if (/\b(noindex|none)\b/i.test(xRobots)) fail('X-Robots-Tag header blocks indexing', `${url} (${xRobots})`);
    html = res.body;
  } else {
    if (!existsSync(distFile(path))) {
      fail('sitemap URL has no built page (would 404)', url);
      return;
    }
    html = readFileSync(distFile(path), 'utf8');
  }
  pages.set(url, parsePage(html));
});

const locales = new Set([...pages.values()].map((p) => p.lang));
const expectedLang = (path) => {
  const first = path.split('/')[1];
  return first && first.length === 2 && locales.has(first) ? first : 'en';
};

const byTitle = new Map();
const byDescription = new Map();
for (const [url, page] of pages) {
  const path = new URL(url).pathname;
  if (page.isRedirect) fail('sitemap URL is a redirect page', url);
  if (/\b(noindex|none)\b/.test(page.robots)) fail('meta robots blocks indexing', url);
  if (page.canonicals.length !== 1) fail('page does not have exactly one canonical', `${url} (${page.canonicals.length})`);
  else if (page.canonicals[0] !== url) fail('canonical does not point at the page itself', `${url} → ${page.canonicals[0]}`);
  if (page.ogUrl !== undefined && page.ogUrl !== url) fail('og:url differs from the page URL', `${url} → ${page.ogUrl}`);
  if (page.lang !== expectedLang(path)) fail('<html lang> does not match the URL locale', `${url} (lang=${page.lang})`);
  if (page.titles.length !== 1 || !page.titles[0]) fail('page does not have exactly one non-empty <title>', url);
  if (page.descriptions.length !== 1 || !page.descriptions[0]) fail('page does not have exactly one meta description', url);
  if (page.h1s.length !== 1 || !page.h1s[0]) fail('page does not have exactly one non-empty <h1>', url);
  for (const block of page.jsonLd) {
    try {
      JSON.parse(block);
    } catch {
      fail('JSON-LD does not parse', url);
    }
  }
  if (page.titles[0]) byTitle.set(page.titles[0], [...(byTitle.get(page.titles[0]) ?? []), url]);
  if (page.descriptions[0]) byDescription.set(page.descriptions[0], [...(byDescription.get(page.descriptions[0]) ?? []), url]);

  /* hreflang: self-referencing, reciprocal, x-default, and pointing at real pages. */
  if (page.hreflang.length) {
    const codes = page.hreflang.map(([code]) => code);
    if (new Set(codes).size !== codes.length) fail('hreflang repeats a language code', url);
    if (!codes.includes('x-default')) fail('hreflang set has no x-default', url);
    if (!page.hreflang.some(([code, href]) => code === page.lang && href === url)) fail('hreflang set does not reference the page itself', url);
    for (const [code, href] of page.hreflang) {
      if (!inSitemap.has(href)) {
        fail('hreflang points at a URL outside the sitemap', `${url} → ${code} ${href}`);
        continue;
      }
      const target = pages.get(href);
      if (!target) continue;
      if (code !== 'x-default' && target.lang !== code) fail('hreflang code does not match the target page language', `${url} → ${code} ${href} (lang=${target.lang})`);
      if (!target.hreflang.some(([, back]) => back === url)) fail('hreflang is not reciprocal', `${url} → ${href}`);
    }

    /* Locale rendering: translated pages must not carry the English page's UI chrome. */
    const english = pages.get(page.hreflang.find(([code]) => code === 'en')?.[1]);
    if (page.lang !== 'en' && english) {
      if (page.skipLink && page.skipLink === english.skipLink) fail('translated page has an untranslated skip link', `${url} ("${page.skipLink}")`);
      for (const legend of page.legends) {
        if (english.legends.includes(legend)) fail('translated page has an untranslated form legend', `${url} ("${legend}")`);
      }
    }
  }
}
for (const [title, list] of byTitle) if (list.length > 1) fail('duplicate <title>', `"${title}": ${list.join(', ')}`);
for (const [description, list] of byDescription) {
  if (list.length > 1) fail('duplicate meta description', `"${description.slice(0, 60)}…": ${list.join(', ')}`);
}

/* Every indexable built page should be in the sitemap (only checkable on dist). */
if (!LIVE) {
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(join(dir, entry.name)) : entry.name.endsWith('.html') ? [join(dir, entry.name)] : [],
    );
  for (const file of walk(DIST)) {
    const rel = relative(DIST, file).replace(/\.html$/, '');
    const url = `${ORIGIN}${rel === 'index' ? '/' : `/${rel}`}`;
    const page = parsePage(readFileSync(file, 'utf8'));
    if (page.isRedirect || /\b(noindex|none)\b/.test(page.robots)) continue;
    if (!inSitemap.has(url)) fail('indexable page missing from the sitemap', url);
  }
}

/* Redirect sources must actually redirect once deployed. */
if (LIVE) {
  for (const rule of redirects) {
    const res = await get(`${LIVE}${rule.from}`);
    const location = res.headers.get('location') ?? '';
    if (String(res.status) !== rule.status || new URL(location, LIVE).pathname !== rule.to) {
      fail('redirect does not answer as configured', `${rule.from} → ${res.status} ${location}`);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Report                                                                     */
/* -------------------------------------------------------------------------- */

const target = LIVE ?? 'dist/';
if (failures.size) {
  for (const [check, details] of failures) {
    console.error(`✗ ${check} (${details.length})`);
    for (const detail of details.slice(0, 5)) console.error(`    ${detail}`);
    if (details.length > 5) console.error(`    … and ${details.length - 5} more`);
  }
  console.error(`\nSEO audit of ${target} failed: ${failures.size} check(s) across ${pages.size} sitemap pages.`);
  process.exit(1);
}
console.log(
  `SEO audit OK — ${target}: ${pages.size} sitemap pages indexable with self-canonicals, ` +
    `reciprocal hreflang and unique metadata; robots.txt, _headers and ${redirects.length} redirect(s) consistent.`,
);
