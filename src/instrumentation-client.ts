/**
 * Runs in the browser before the app becomes interactive (Next.js convention).
 * Decides whether analytics may run and, if so, loads the PostHog adapter once the
 * main thread is idle, so it never competes with the first paint or the 3D map.
 * (Vercel Web Analytics is the `<VercelAnalytics />` component in the root layout.)
 *
 * PostHog is on only when all of these hold:
 * - production build,
 * - `NEXT_PUBLIC_POSTHOG_KEY` was set at build time,
 * - the browser does not send Do Not Track / Global Privacy Control,
 * - the visitor has not opted out on the privacy page.
 */
import { attachAnalyticsSink, disableAnalytics } from "@/application/analytics";
import { takeCampaignParams } from "@/presentation/analytics/campaign";
import { analyticsAllowed } from "@/presentation/analytics/consent";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

let campaign: Record<string, string> = {};

function start(): void {
  import("@/infrastructure/analytics/posthog")
    .then(({ createPostHogSink }) => createPostHogSink({ key: key as string, host, campaign, deployEnv: process.env.MERRE_DEPLOY_ENV || "local" }))
    .then(attachAnalyticsSink)
    // Offline, blocked by an extension, or the vendor is down: the app carries on without analytics.
    .catch(() => disableAnalytics());
}

try {
  // Always, even with analytics off: shared links should not carry the flyer's utm_* along.
  campaign = takeCampaignParams() as Record<string, string>;
  if (process.env.NODE_ENV !== "production" || !key || !analyticsAllowed()) {
    disableAnalytics();
  } else if ("requestIdleCallback" in window) {
    window.requestIdleCallback(start, { timeout: 4000 });
  } else {
    setTimeout(start, 2000);
  }
} catch {
  disableAnalytics();
}
