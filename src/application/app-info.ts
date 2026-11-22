/** Single place for the product name, so renaming the app is a one-line change. */
export const APP_NAME = "Merre";
export const APP_TAGLINE = { hu: "Óbudai Egyetem teremkereső", en: "Óbuda University room finder" } as const;
export const APP_DESCRIPTION = {
  hu: "Találd meg bármelyik termet az Óbudai Egyetemen: 3D térkép, útvonal a teremig, telepítés nélkül.",
  en: "Find any room at Óbuda University: 3D map and step-by-step route to the door, no install needed.",
} as const;
export const REPOSITORY_URL = "https://github.com/AttilaRibar/UniversityBuildingNavigation";

/**
 * Public origin of the deployed app, without a trailing slash. Absolute URLs in the
 * page metadata, the sitemap and robots.txt are built from it. Override per deployment
 * with `NEXT_PUBLIC_SITE_URL` (e.g. once a custom domain is attached).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://merre-chi.vercel.app").replace(/\/+$/, "");
