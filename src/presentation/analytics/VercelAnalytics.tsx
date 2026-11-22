"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { useEffect, useState } from "react";
import { landingCampaign, withCampaign } from "./campaign";
import { analyticsAllowed, readOptOut } from "./consent";

/**
 * Vercel Web Analytics exists only on Vercel deployments (the script is served from
 * `/_vercel/insights/` once Web Analytics is enabled for the project).
 */
const ON_VERCEL = process.env.NODE_ENV === "production" && Boolean(process.env.MERRE_DEPLOY_ENV);

/** Runs before every page view is sent. */
function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  // The opt-out switch on the privacy page takes effect immediately.
  if (readOptOut()) return null;
  // utm_* was removed from the address bar before the app started (campaign.ts); add it back
  // so Vercel attributes flyer traffic too.
  return { ...event, url: withCampaign(event.url, landingCampaign()) };
}

/**
 * Vercel Web Analytics: cookieless page views (visitors, pages, referrers, countries,
 * devices) in the Vercel dashboard. Custom events stay in PostHog: on the Hobby plan
 * Vercel records page views only. Same consent rules as PostHog.
 */
export function VercelAnalytics() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only consent, read once after mount
    setAllowed(ON_VERCEL && analyticsAllowed());
  }, []);
  return allowed ? <Analytics beforeSend={beforeSend} /> : null;
}
