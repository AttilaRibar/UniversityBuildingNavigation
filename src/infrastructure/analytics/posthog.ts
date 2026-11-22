import type { AnalyticsSink } from "@/application/analytics";

export interface PostHogSettings {
  /** Project API key (public by design: it can only write events). */
  key: string;
  /** Ingestion host, e.g. https://eu.i.posthog.com for the EU cloud. */
  host: string;
  /** utm_* values of the landing URL, already removed from the address bar; added to every event of this page load. */
  campaign?: Record<string, string>;
  /** "production", "preview" (Vercel preview deployments) or "local"; sent as `deploy_env` on every event. */
  deployEnv?: string;
}

/**
 * PostHog adapter. Loaded as its own chunk after the page is interactive.
 *
 * Privacy choices:
 * - `cookieless_mode: "always"`: no cookies, no localStorage, no sessionStorage. Unique
 *   visitors are counted with a daily rotating hash on PostHog's servers. This requires
 *   "Cookieless server hash mode" to be switched on in the PostHog project settings,
 *   otherwise the events are discarded.
 * - No autocapture and no session recording: only the named events in
 *   `src/application/analytics.ts`, page views, page leaves, web vitals and errors.
 * - The `no-external` bundle never loads extra scripts, which keeps the CSP short.
 */
export async function createPostHogSink({ key, host, campaign = {}, deployEnv = "local" }: PostHogSettings): Promise<AnalyticsSink> {
  const { default: posthog } = await import("posthog-js/no-external");
  // With cookieless_mode "always" the SDK ignores opt_out_capturing(), so its automatic
  // events (page views, page leaves, web vitals, errors) are dropped here instead.
  let optedOut = false;
  posthog.init(key, {
    api_host: host,
    defaults: "2026-01-30",
    cookieless_mode: "always",
    // Page views on path changes only: the indoor screen rewrites ?to=… with replaceState on every selection.
    capture_pageview: "history_change",
    capture_pageleave: true,
    autocapture: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_web_experiments: true,
    advanced_disable_flags: true,
    disable_external_dependency_loading: true,
    capture_exceptions: true,
    capture_performance: { web_vitals: true, network_timing: false },
    respect_dnt: true,
    // The SDK reads utm_* from the current URL, which no longer has them (see takeCampaignParams).
    before_send: (event) => {
      if (optedOut) return null;
      event.properties.deploy_env = deployEnv;
      for (const [name, value] of Object.entries(campaign)) {
        if (event.properties[name] == null) event.properties[name] = value;
      }
      return event;
    },
  });
  return {
    capture: (name, properties) => posthog.capture(name, properties),
    captureException: (error, properties) => posthog.captureException(error, properties),
    optOut: () => {
      optedOut = true;
    },
  };
}
