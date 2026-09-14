/**
 * Number parsing, float-noise cleanup and display formatting.
 *
 * Kept separate from the percentage formulas so both the engine and the UI
 * share one definition of "what a number looks like".
 */

/** Largest magnitude we render in positional notation before switching to exponential. */
const POSITIONAL_MAX = 1e15;
/** Smallest non-zero magnitude we render positionally. */
const POSITIONAL_MIN = 1e-9;
/** IEEE-754 doubles carry ~15-17 significant decimal digits; noise lives past 15. */
const SIGNIFICANT_DIGITS = 15;

export type ParseFailure = 'empty' | 'invalid' | 'too-large';
export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; reason: ParseFailure };

/**
 * Parse user input into a number.
 *
 * Accepts thousands separators in both Western (1,234,567) and Indian
 * (12,34,567) grouping, incidental whitespace, a leading +/-, and a trailing
 * percent sign. Separators are stripped rather than validated so that both
 * grouping conventions work without the calculator taking a position on locale.
 */
export function parseNumber(raw: string | null | undefined): ParseResult {
  if (raw === null || raw === undefined) return { ok: false, reason: 'empty' };

  const trimmed = raw.trim();
  if (trimmed === '') return { ok: false, reason: 'empty' };

  const normalised = trimmed
    .replace(/[,\s_  ]/g, '')
    .replace(/%$/, '')
    .replace(/^\+/, '');

  if (normalised === '' || normalised === '-') return { ok: false, reason: 'empty' };

  // Deliberately stricter than Number(): rejects hex, Infinity, and "12abc".
  if (!/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(normalised)) {
    return { ok: false, reason: 'invalid' };
  }

  const value = Number(normalised);
  if (Number.isNaN(value)) return { ok: false, reason: 'invalid' };
  if (!Number.isFinite(value)) return { ok: false, reason: 'too-large' };

  return { ok: true, value };
}

/**
 * Strip binary floating-point noise: 0.1 + 0.2 -> 0.3, not 0.30000000000000004.
 *
 * Integers pass through untouched so that large exact integers keep every digit
 * a double can actually hold.
 */
export function cleanFloat(value: number): number {
  if (!Number.isFinite(value) || Number.isInteger(value)) return value;
  return Number(value.toPrecision(SIGNIFICANT_DIGITS));
}

/** Format a number for display, with grouping and trailing zeros trimmed. */
export function formatNumber(value: number, maxFractionDigits = 10): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';

  const magnitude = Math.abs(value);
  if (magnitude >= POSITIONAL_MAX || magnitude < POSITIONAL_MIN) {
    return value.toExponential(6).replace(/\.?0+e/, 'e');
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxFractionDigits,
    useGrouping: true,
  }).format(value);
}

/**
 * Format a value alongside whether the formatted form is lossy, so the UI can
 * mark rounded answers with "≈" instead of implying false precision.
 */
export function presentNumber(value: number, maxFractionDigits = 10): {
  display: string;
  rounded: boolean;
} {
  const clean = cleanFloat(value);
  const display = formatNumber(clean, maxFractionDigits);
  const parsedBack = Number(display.replace(/,/g, ''));
  return { display, rounded: Number.isFinite(parsedBack) && parsedBack !== clean };
}

/**
 * Format a percentage value, e.g. 12.5 -> "12.5%".
 *
 * Percentages carry fewer useful decimals than raw numbers — four places is
 * finer than any practical use of a percentage — and anything beyond that is
 * noise. Values that get rounded are still flagged, so precision is never
 * silently overstated.
 */
export function presentPercent(value: number, maxFractionDigits = 4): {
  display: string;
  rounded: boolean;
} {
  const { display, rounded } = presentNumber(value, maxFractionDigits);
  return { display: `${display}%`, rounded };
}

/**
 * Parse a list of numbers separated by commas, spaces or newlines.
 *
 * Used by calculators that average an arbitrary set of values. Group
 * separators inside a single number cannot be supported here — a comma has to
 * mean "next value" — so "1,234" reads as two numbers, not one thousand.
 */
export function parseList(raw: string | null | undefined): {
  ok: true; values: number[];
} | { ok: false; reason: ParseFailure; token?: string } {
  if (raw === null || raw === undefined || raw.trim() === '') {
    return { ok: false, reason: 'empty' };
  }

  const tokens = raw
    .split(/[,;\n\r\t ]+/)
    .map((token) => token.trim())
    .filter((token) => token !== '');

  if (tokens.length === 0) return { ok: false, reason: 'empty' };

  const values: number[] = [];
  for (const token of tokens) {
    // Re-use the scalar parser but without comma stripping, since commas are
    // the separator here.
    const parsed = parseNumber(token.replace(/,/g, ''));
    if (!parsed.ok) return { ok: false, reason: parsed.reason, token };
    values.push(parsed.value);
  }

  return { ok: true, values };
}
