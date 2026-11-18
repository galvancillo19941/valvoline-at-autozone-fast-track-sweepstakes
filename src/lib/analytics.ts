// GA4, loaded by the embed itself so it works on any page that drops the
// <script> in, with or without a tag of their own.
//
// The Measurement ID is the one the user gave (GA_MEASUREMENT_ID in the
// component), passed in through initAnalytics(id). It never comes from the
// campaign. With an empty ID every call here is a no-op.
//
// If the host page already defines window.gtag / dataLayer we reuse them and
// only add our own `config` — the gtag.js loader is injected once per ID.
// Never pass personal data (name, email, address, phone) as an event param.

import { injectScript } from "./inject-script";

let MEASUREMENT_ID = "";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// gtag.js only understands `arguments` objects, not arrays.
function gtag(..._args: unknown[]): void {
  // oxlint-disable-next-line prefer-rest-params
  window.dataLayer!.push(arguments);
}

let initialised = false;

export function initAnalytics(measurementId: string | undefined): void {
  const id = (measurementId ?? "").trim();
  if (initialised || !id || typeof window === "undefined") return;
  initialised = true;
  MEASUREMENT_ID = id;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || gtag;
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID);
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`);
}

export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

/** Sends one GA4 event. Returns false when analytics isn't initialised yet. */
export function track(event: string, params: AnalyticsParams = {}): boolean {
  if (!MEASUREMENT_ID || !initialised) return false;
  try {
    window.gtag?.("event", event, { send_to: MEASUREMENT_ID, ...params });
    return true;
  } catch {
    // Analytics must never break the form.
    return false;
  }
}

/** Scroll depth of the page, reported once per threshold (25/50/75/100). */
export function trackScrollDepth(): () => void {
  const thresholds = [25, 50, 75, 100];
  const reported = new Set<number>();
  const onScroll = (): void => {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const percent = (window.scrollY / scrollable) * 100;
    for (const t of thresholds) {
      // The ID arrives a moment after start-up (from get-form-fields): a threshold
      // only counts as reported once it was actually sent.
      if (
        percent >= t - 0.5 &&
        !reported.has(t) &&
        track("scroll_depth", { percent_scrolled: t })
      ) {
        reported.add(t);
      }
    }
    if (reported.size === thresholds.length) window.removeEventListener("scroll", onScroll);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}
