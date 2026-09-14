/**
 * Analytics event dispatch.
 *
 * No analytics vendor is bundled. This pushes events onto `dataLayer` and
 * forwards them to `gtag` when a tag is present, so GA4 or Google Tag Manager
 * can be added later without touching calculator code.
 *
 * Calculator *inputs* are never included — only which tool was used and how.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
  }
}

/** The interaction vocabulary the site reports on. */
export type AnalyticsEvent =
  | 'calculator_used'
  | 'calculation_completed'
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
