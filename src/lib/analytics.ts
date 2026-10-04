/**
 * Analytics event dispatch.
 *
 * No analytics vendor is bundled. This pushes events onto `dataLayer` and
 * forwards them to `gtag` — the GA4 tag installed in BaseLayout — when it is
 * present. A blocked or missing tag makes every call a no-op.
 *
 * Calculator *inputs* are never included — only which tool was used and how.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
  }
}

/**
 * The interaction vocabulary the site reports on.
 *
 * `calculator_used` fires once per successful calculation the visitor asks for
 * — never on page load, a failed validation or a reset — with
 * `calculator_name` (the route slug) and `calculation_type` (the mode). It is
 * the event to mark as a key event in GA4.
 */
export type AnalyticsEvent =
  | 'calculator_used'
  | 'calculator_mode_changed'
  | 'calculator_reset'
  | 'result_copied'
  | 'result_shared'
  | 'history_cleared'
  | 'faq_opened';

export function track(event: AnalyticsEvent, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;

  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event, ...params });
    window.gtag?.('event', event, params);
  } catch {
    /* Analytics must never break a calculation. */
  }
}
