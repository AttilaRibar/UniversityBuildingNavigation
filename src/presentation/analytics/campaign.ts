/** Campaign parameters analytics tools use for traffic sources, e.g. `utm_source=szorolap` on the flyer's QR codes. */
const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export type CampaignParams = Partial<Record<(typeof CAMPAIGN_KEYS)[number], string>>;

let landing: CampaignParams = {};

/** The campaign of this page load, as taken from the landing URL by `takeCampaignParams()`. */
export function landingCampaign(): CampaignParams {
  return landing;
}

/** `url` with the campaign parameters added back (those the URL does not already have). */
export function withCampaign(url: string, campaign: CampaignParams): string {
  const entries = Object.entries(campaign);
  if (entries.length === 0) return url;
  const parsed = new URL(url);
  for (const [name, value] of entries) {
    if (value && !parsed.searchParams.has(name)) parsed.searchParams.set(name, value);
  }
  return parsed.toString();
}

/**
 * Reads the campaign parameters of the landing URL and removes them from the address bar.
 *
 * Runs before the app starts (from `instrumentation-client.ts`), because the indoor screen
 * rewrites its URL on mount and would drop them before analytics loads. Removing them also
 * means a link copied after scanning a QR code is not counted as flyer traffic again.
 */
export function takeCampaignParams(): CampaignParams {
  const url = new URL(window.location.href);
  const campaign: CampaignParams = {};
  for (const key of CAMPAIGN_KEYS) {
    const value = url.searchParams.get(key);
    if (!value) continue;
    campaign[key] = value.slice(0, 100);
    url.searchParams.delete(key);
  }
  if (Object.keys(campaign).length > 0) {
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }
  landing = campaign;
  return campaign;
}
