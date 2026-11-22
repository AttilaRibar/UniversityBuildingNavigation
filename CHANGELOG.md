# Changelog

All notable changes to Merre are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). The version is the `version` field of `package.json`. The repository has no release tags yet.

## Unreleased

Nothing yet.

## 1.0.0 – 2026-11-22

Deployed on Vercel at https://merre-chi.vercel.app.

### Added

- Anonymous usage statistics with PostHog EU Cloud in cookieless mode: no cookies and nothing in browser storage. Runs only in production builds with `NEXT_PUBLIC_POSTHOG_KEY`, never when the browser sends Do Not Track or Global Privacy Control, and not after the visitor opts out. Typed event catalogue in `src/application/analytics.ts`; details in [docs/ANALYTICS.md](docs/ANALYTICS.md).
- Privacy page at `/privacy/`, in Hungarian and English, with a switch to turn the statistics off.
- Privacy and feedback links at the bottom of the city sheet and the indoor room list.
- "Wrong room position or route? Let us know" link on the room card. It opens a pre-filled GitHub issue that includes the page link.
- A "You have arrived!" toast after pressing "I'm here" at the end of a route.
- A 404 page, an error page with "Try again", and a bilingual fallback page for errors in the root layout.
- A retry screen when a building's data fails to load, instead of an endless spinner.
- Link previews: Open Graph and Twitter card metadata, a 1200 × 630 preview image (`public/og-image.png`, generated from `scripts/og-image.html` with `npm run og-image`), a description and a canonical URL per page.
- `robots.txt` and `sitemap.xml`.
- `NEXT_PUBLIC_SITE_URL` for the public origin (default https://merre-chi.vercel.app).
- `vercel.json` with build settings, security headers and caching rules.
- A printable A5 flyer with QR codes under `docs/flyer/`.
- Tests for the analytics facade, building and problem-report links, Hungarian number grammar and the new step wording.
- Documentation: [docs/ANALYTICS.md](docs/ANALYTICS.md), [docs/OPERATIONS.md](docs/OPERATIONS.md), [SECURITY.md](SECURITY.md) and this changelog.

### Changed

- Room card: the start point is a full-width row you can tap to change it; occupant and capacity share one line under the room type and level; the shared link's title includes the building name.
- Route overview: the destination comes first ("To 1.32"), then the start point, distance and time on one line, so the start button stays visible on small phones.
- The indoor top bar shows the short building name ("BA épület") as the page heading; the full name is in its tooltip.
- Rooms in the per-level list are sorted by room number the way doors are numbered (`4.2` before `4.10`).
- The shortcut row is titled "Nearest" ("Legközelebbi").
- An empty search shows the search text and a hint ("No results for “…”").
- Hungarian step counter uses the correct article and suffix: "1. lépés a 10-ből", "2. lépés az 5-ből".
- Hungarian turn steps show only the distance under the instruction ("12 m") instead of repeating a verb ("Menj 12 m-t").
- Consistent `•` separators, non-breaking level names ("1. emelet"), and the same paddings and heading style across panels.
- Long entrance names wrap in the start point picker instead of being cut off.
- The bottom sheet scrolls back to the top when it switches to another room, the route or the start point picker.
- Search results on the indoor screen are announced to screen readers.
- `utm_*` parameters are removed from the address bar on load, and `src=search` after the indoor screen opens, so copied links stay clean.
- The PostHog SDK chunk is left out of the service worker precache; only visitors with analytics on download it.
- Version 1.0.0; `package.json` declares `engines.node` `>=22`.

### Fixed

- On short screens the bottom sheet could cover the lower floors in the level switcher. The buttons now shrink (down to 32 px) and the list scrolls if needed.
- A failed load of the room search data was cached for the rest of the visit, so room search stayed empty. It is now retried on the next search.
- Copying a room link without clipboard access failed silently. It now says "The link could not be copied."
- New releases never reached installed copies: every build shipped a byte-identical `sw.js`, so browsers installed no new service worker, kept the first precache and never showed the update toast. The build now stamps its version into `sw.js`; the version is a hash of the file contents rather than sizes.
- Offline navigations prefer the precached page, whose chunks belong to the same build, over an older page in the runtime cache.
- The 404 page is no longer precached.

### Security

- Content Security Policy and `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and `Cross-Origin-Opener-Policy` headers (`vercel.json`). HSTS is added by Vercel.
- `immutable` long-term caching for hashed files under `/_next/static/`, and `no-cache` for `/sw.js` and `/precache-manifest.json`.
- CI runs `npm audit --omit=dev --audit-level=high` on every pull request and push to `main`; advisories in development dependencies were fixed.
- `posthog-js` is pinned to an exact version (`1.445.5`).

## 0.1.0 – 2026-11-15

Initial version:

- City overview: 3D MapLibre map with OpenFreeMap tiles, university buildings by faculty and campus, building list, search and detail card, hand-off to Apple Maps or Google Maps.
- Indoor 3D map of building BA with six levels, room search with typo tolerance, step-by-step routing with a step-free option, nearest-facility shortcuts, and a street map for the walk to the entrance.
- GeoJSON indoor data model, data validator and plan renderer; BA data derived from the floor directory signs and the OpenStreetMap outline.
- Shareable deep links (`?to=`, `?from=`, `?sf=1`), Hungarian and English, offline support with a hand-written service worker, install banner.
- CI with lint, typecheck, tests, data validation and build; README, architecture, data model and contributing guides.
