/**
 * Guards against a recurring Astro footgun: the compiler trims the newline
 * between text and a following inline element, so
 *
 *   ... measured in
 *   <strong>percentage points</strong>
 *
 * renders as "measured in**percentage points**" with no space. The fix is an
 * explicit {' '} at the end of the preceding line.
 *
 * Run against the built output, where the problem is actually visible.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const PATTERN = /([a-z,;:)])<(strong|em|a|code)[ >]|<\/(strong|em|a|code)>([a-zA-Z])/g;

let problems = 0;
for (const file of readdirSync(DIST).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(join(DIST, file), 'utf8');
  for (const match of html.matchAll(PATTERN)) {
    const start = Math.max(0, match.index - 40);
    const context = html.slice(start, match.index + match[0].length + 40).replace(/\s+/g, ' ');
    console.error(`${file}: missing space around inline tag\n  …${context}…`);
    problems += 1;
  }
}

if (problems) {
  console.error(`\n${problems} missing space(s). Add {' '} to the end of the preceding line.`);
  process.exit(1);
}
console.log('Prose spacing OK — no inline tags glued to adjacent words.');
