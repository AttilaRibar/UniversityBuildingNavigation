# Operations

Runbook for the deployed site: first-time setup, configuration, releases, rollback, checks after a deployment, data updates and incidents. The architecture is in [ARCHITECTURE.md](ARCHITECTURE.md); analytics details are in [ANALYTICS.md](ANALYTICS.md).

## What runs where

| Part | Where | Notes |
| --- | --- | --- |
| Source code | GitHub, `AttilaRibar/UniversityBuildingNavigation` | `main` is the production branch |
| CI | GitHub Actions, `.github/workflows/ci.yml` | On every pull request and every push to `main`: `npm ci`, `npm audit --omit=dev --audit-level=high`, lint, typecheck, tests, data validation, build. CI does not deploy |
| Hosting | Vercel project `merre` | Git integration with the repository. Production URL: https://oe-merre.vercel.app. The first address, `merre-chi.vercel.app`, redirects to it (307, path and query string kept) |
| Analytics: events | PostHog EU Cloud project | Receives events from production builds that have `NEXT_PUBLIC_POSTHOG_KEY` |
| Analytics: visitors | Vercel Web Analytics | Page views of Vercel builds, once Web Analytics is enabled for the project ([setup](#vercel-web-analytics-setup)) |
| Map tiles and fonts | `tiles.openfreemap.org` | Third party, no account or key |
| Problem reports and feedback | GitHub issues of the repository | Linked from the room card and the footer |

There is no server, database or backend to operate. The deployed site is the static `out/` folder.

### Vercel project settings

`vercel.json` holds the build settings, so the dashboard values do not need to match a framework preset:

| Setting | Value | Source |
| --- | --- | --- |
| Framework preset | none (`"framework": null`) | `vercel.json` |
| Build command | `npm run build` (`next build`, then `tsx scripts/build-precache.ts`) | `vercel.json` |
| Output directory | `out` | `vercel.json` |
| Node.js version | 22.x | Project settings; `package.json` requires `>=22` |
| Deployment Protection | Vercel Authentication, Standard Protection | Project settings |

With Standard Protection, preview deployments and generated deployment URLs ask for a Vercel login with access to the team. The production domain `oe-merre.vercel.app` is public.

`vercel.json` also sets the response headers (CSP and other security headers, caching). See [Verifying a deployment](#verifying-a-deployment) for the expected values and [ARCHITECTURE.md](ARCHITECTURE.md#security-headers) for the reasoning.

## Environment variables

All of them are optional and read at build time. `NEXT_PUBLIC_*` values are inlined into the JavaScript by `next build`, so a change takes effect only after a new build: in Vercel, open the latest production deployment and choose Redeploy. An Instant Rollback reuses an old build and never picks up changed variables.

| Variable | Default when unset | Effect | Vercel environments |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` | unset: PostHog off | PostHog project API key (`phc_…`). It can only write events and is visible in the shipped JavaScript by design | Production. It is currently also set for Preview and Development: every event carries `deploy_env` (`production`, `preview` or `local`), so filter PostHog insights to `deploy_env = production`. Development builds (`next dev`) never send anything |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` | Ingestion host | Normally unset. If you change it, also change `connect-src` in the CSP in `vercel.json`, or the browser blocks the requests |
| `NEXT_PUBLIC_SITE_URL` | `https://oe-merre.vercel.app` | Origin for `metadataBase`, canonical and Open Graph URLs, `sitemap.xml` and `robots.txt` (`SITE_URL` in `src/application/app-info.ts`; trailing slashes are removed) | Production, once a custom domain is attached. Preview builds can leave it unset; their canonical URLs then point to production |

Locally, put them in `.env.local` (git-ignored, like every `.env*` file) or pass them on the command line.

Set by Vercel, not by you: `VERCEL_ENV` (`production` or `preview`). `next.config.ts` inlines it as `MERRE_DEPLOY_ENV`. It switches Vercel Web Analytics on for Vercel builds only and becomes the `deploy_env` property of PostHog events. A local `npm run build` leaves it empty, so local builds load no Vercel script (simulate a Vercel build with `VERCEL_ENV=production npm run build`).

## PostHog first-time setup

Do this once, before the first production build with a key.

1. Sign up at PostHog and choose **EU Cloud**. The region is chosen when the organisation is created. US and EU Cloud are separate instances, so moving later means migrating the data.
2. In the project settings (Settings → Project):
   - **Web analytics → Cookieless server hash mode** (some PostHog pages call it "Enable cookieless tracking"): switch it on and save. **Required.** The SDK runs with `cookieless_mode: "always"`; without this setting PostHog discards every cookieless event and the project stays empty.
   - **IP data capture → Discard client IP data**: switch it on. **Required.** The privacy page tells visitors that IP addresses are not stored. PostHog documents that new EU Cloud projects have it on by default; check it anyway.
   - **Filter out internal and test users**: add the filter `deploy_env` = `production`, so preview and local builds do not show up in insights.
   - **Authorized URLs** (toolbar and web analytics domains): add `https://oe-merre.vercel.app`. Remove `https://merre-chi.vercel.app` if it is listed; that address now only redirects.
   - Leave session replay, surveys, autocapture and heatmaps off. The SDK does not load PostHog's remote configuration (`advanced_disable_flags: true` in `src/infrastructure/analytics/posthog.ts`), so these switches have no effect on Merre, but the dashboard should match what is collected.
3. Copy the **Project API key** (`phc_…`) into the Vercel environment variable `NEXT_PUBLIC_POSTHOG_KEY` for Production, then redeploy.
4. Verify: open the production site in a normal browser window, use it for a minute, and check that `$pageview` and named events appear in PostHog's Activity view. If requests to `eu.i.posthog.com` succeed in the browser but nothing appears, the cookieless setting from step 2 is missing.
5. Build the first insights listed in [ANALYTICS.md](ANALYTICS.md#first-insights-and-dashboards).

Billing: the free plan needs no card and stops ingesting at the monthly free allowance, so it cannot cost money. If you move to pay-as-you-go, set a billing limit for every product straight away (Organization → Billing): a cap for product analytics and error tracking, and `$0` for products the app does not use (session replay, feature flags, surveys). Current allowances and the plan comparison are in [ANALYTICS.md](ANALYTICS.md#why-posthog).

## Vercel Web Analytics setup

Vercel Web Analytics counts visitors and page views in the Vercel dashboard (pages, referrers, countries, devices, UTM sources). It complements PostHog, which records the named events. The component is `src/presentation/analytics/VercelAnalytics.tsx`; it follows the same consent rules as PostHog.

1. Vercel → project `merre` → **Analytics** → **Enable** (or `vercel project web-analytics enable merre`).
2. Redeploy production. Until Web Analytics is enabled, `/_vercel/insights/script.js` returns 404 and the browser console shows "[Vercel Web Analytics] Failed to load script"; the app works regardless.
3. Verify: `curl -s -o /dev/null -w '%{http_code}\n' "$SITE/_vercel/insights/script.js"` prints `200`, and visits appear in the Analytics tab within a few minutes.

Limits on the Hobby plan (checked 2026-11-22 on vercel.com/docs/analytics/limits-and-pricing): 50,000 events per month, page views only (custom events need Pro), and collection pauses for the rest of the billing cycle once the limit is reached. The app therefore sends Vercel page views only; every named event goes to PostHog. Pro charges per event, but Pro itself is a fixed monthly subscription.

## Release procedure

1. Work on a branch and open a pull request against `main`. CI runs on the pull request, and Vercel builds a preview deployment for it (behind Vercel Authentication; the Vercel bot posts the link on the pull request).
2. Smoke-test the preview: the city map loads, room search finds `F.06` and `1.32`, a route from the main entrance to `2.14` renders in 3D and as text, the language toggle works, `/privacy/` opens, an unknown path shows the 404 page.
3. In the same pull request:
   - add the release notes to [CHANGELOG.md](../CHANGELOG.md) under a new version heading,
   - bump the version: `npm version <x.y.z> --no-git-tag-version` (updates `package.json` and `package-lock.json`),
   - if analytics or the data shown to visitors changed, update both languages of `src/presentation/i18n/messages/privacy.ts` and its `updated` date.
4. Merge when CI is green. Vercel builds and deploys `main` to production on its own; it does not wait for the GitHub Actions run. Requiring the CI check in GitHub branch protection for `main` keeps red builds from being merged.
5. Run the checks in [Verifying a deployment](#verifying-a-deployment) against https://merre-chi.vercel.app.
6. Optionally tag the merge commit (`git tag v<x.y.z>` and `git push origin v<x.y.z>`). The repository has no tags yet.

### How a release reaches users

- **Pages.** The service worker fetches pages network-first with a 3 second timeout. An online visitor gets the new HTML on the next page load, and with it the new hashed JavaScript chunks. A tab that stays open keeps the build it loaded until it reloads.
- **Service worker and update toast.** A browser installs a new service worker only when the bytes of `/sw.js` change. `npm run build` appends the build version (a hash of the precached files' contents) to `out/sw.js`, so every release that changes a precached file ships a new worker:
  - The new worker installs in the background on the visitor's next visit and precaches the new build.
  - It waits until the visitor presses "Update" in the toast ("A new version is available"); the page then reloads once, and the old precaches are deleted.
  - A release that changes no precached file (for example only `vercel.json`) produces the same `sw.js` and installs nothing new.

## Rollback

Use Vercel's **Instant Rollback**: project overview → Production Deployment tile → Instant Rollback, or Deployments → ⋮ next to an earlier production deployment → Instant Rollback. It re-points the production domain to the earlier build within seconds; nothing is rebuilt.

- On the Hobby plan only the immediately previous production deployment can be restored; Pro and Enterprise can pick any earlier production deployment.
- The restored deployment keeps the environment variables it was built with.
- After a rollback, Vercel stops assigning the production domain to new deployments. Pushes to `main` still build but do not go live until you undo the rollback: project overview → **Manage** on the production tile → promote a deployment (or `vercel promote <deployment-url>`).
- For a fix that should go through CI, revert the commit on `main` instead (`git revert <sha>`, pull request, merge); Vercel then deploys the reverted state.

Visitors who loaded the bad build get the restored one on their next page load (pages are network-first). The restored deployment serves its own `sw.js`, whose build stamp differs from the bad one, so browsers that already installed the bad worker install the restored one on their next update check and show the update toast.

## Verifying a deployment

Set the address once:

```bash
SITE=https://oe-merre.vercel.app
```

Security headers on a page (all seven must be present; `strict-transport-security` is added by Vercel itself):

```bash
curl -sI "$SITE/" | grep -iE '^(content-security-policy|x-content-type-options|x-frame-options|referrer-policy|permissions-policy|cross-origin-opener-policy|strict-transport-security):'
```

Expected values (from `vercel.json`):

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://tiles.openfreemap.org https://eu.i.posthog.com; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Strict-Transport-Security` | set by Vercel, for example `max-age=63072000; includeSubDomains; preload` |

Caching:

```bash
curl -sI "$SITE/sw.js" | grep -i '^cache-control'
curl -sI "$SITE/precache-manifest.json" | grep -i '^cache-control'
CHUNK=$(curl -s "$SITE/" | grep -o '/_next/static/chunks/[^"]*\.js' | head -1)
curl -sI "$SITE$CHUNK" | grep -i '^cache-control'
```

Expected: `no-cache` for the first two, `public, max-age=31536000, immutable` for the chunk. Icons under `/icons/` get `public, max-age=604800`.

Generated files and the 404 page:

```bash
curl -s "$SITE/robots.txt"
curl -s "$SITE/sitemap.xml"
curl -s "$SITE/precache-manifest.json" | head -5
curl -s -o /dev/null -w '%{http_code}\n' "$SITE/no-such-page/"
```

`robots.txt` must name `$SITE/sitemap.xml`; the sitemap lists `/`, `/building/ba/` and `/privacy/` with the same origin. If they show another origin, `NEXT_PUBLIC_SITE_URL` (or the default `SITE_URL`) does not match the production domain. The unknown path must return `404`.

Whether the build has an analytics key (prints the `phc_…` key, or nothing):

```bash
for f in $(curl -s "$SITE/" | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u); do curl -s "$SITE$f"; done | grep -o 'phc_[A-Za-z0-9_]*' | sort -u
```

In a browser, with DevTools open:

- Console: no `Content-Security-Policy` violation messages ("Refused to connect", "Refused to load") on `/`, on `/building/ba/?to=1.32` (press "Route here", then "Start", so the street map of the first step loads) and on `/privacy/`.
- Network: map tiles load from `tiles.openfreemap.org`; after the page is idle, analytics requests go to `eu.i.posthog.com` (only with a key) and to `/_vercel/insights/view` (only with Web Analytics enabled), in both cases only if the browser sends neither Do Not Track nor Global Privacy Control.
- Application: the service worker `/sw.js` is activated, and the site sets no cookies (on a preview deployment, Vercel's own login cookie is expected).
- A link preview: paste `$SITE/building/ba/?to=F.06` into a chat app or an Open Graph checker; it should show `og-image.png` and the building title.

## Attaching a custom domain

1. Vercel → project `merre` → Settings → Domains → add the domain and set the DNS records Vercel shows.
2. Set `NEXT_PUBLIC_SITE_URL` to `https://<domain>` (no trailing slash needed) for Production and redeploy. Canonical URLs, Open Graph URLs, `sitemap.xml` and `robots.txt` follow.
3. Keep the previous address assigned to the project and redirect it to the new one (Settings → Domains → Edit → Redirect to). Installed apps and their offline caches belong to the origin they were installed from, and links shared earlier carry the old address. Check that path and query string survive the redirect: `/?utm_source=szorolap&utm_medium=print` and `/building/ba/?to=F.06&utm_source=szorolap&utm_medium=print` must arrive intact. This is how `merre-chi.vercel.app` → `oe-merre.vercel.app` is set up (307; a permanent 308 would tell search engines the move is final).
4. The flyer QR codes: follow [flyer/README.md](flyer/README.md), section "Ha változik a cím" (change `SITE` in `docs/flyer/build-flyer.mjs`, regenerate and verify the QR codes, update the visible short address in `flyer.html`). Flyers already printed keep the old address.
5. Nothing else needs to change: the CSP uses `'self'`, and the manifest, the service worker scope and the precache URLs are root-relative.
6. In PostHog, add the new address to the project's Authorized URLs, and update insights that filter by `$host`. Vercel Web Analytics needs no change; it reports per project.

## Updating building data

Data edits are code changes and go through the [release procedure](#release-procedure).

1. Edit the GeoJSON under `src/data/buildings/<id>/levels/` as described in [DATA_MODEL.md](DATA_MODEL.md#changing-data).
2. `npm run validate:data`, render the plans with `npx tsx scripts/render-plans.ts <room>`, then `npm test`.
3. Check the route on the pull request's preview deployment, for example `/building/ba/?to=<room>`.
4. Close the matching GitHub issues (problem reports open with the title `Térképhiba: …`).
5. If people need the correction offline, change `public/sw.js` in the same release (see [How a release reaches users](#how-a-release-reaches-users)).

Useful PostHog inputs for data work: `route_not_found` by `room`, and `search_performed` with zero results by `query` (missing aliases or rooms).

## Dependency updates

- CI fails on high or critical advisories in shipped dependencies (`npm audit --omit=dev --audit-level=high`). Development tools are not audited in CI; run `npm audit` locally from time to time.
- `posthog-js` is pinned to an exact version (`1.445.5`). When you update it, check the option names used in `src/infrastructure/analytics/posthog.ts` against the new version, rebuild, and repeat the checks in [ANALYTICS.md](ANALYTICS.md#testing-locally): events arrive, no cookies or storage are written, no new hosts appear in the Network tab (a new host would also be blocked by the CSP).
- `next` is pinned to an exact version. Read the bundled docs in `node_modules/next/dist/docs/` before upgrading (see `AGENTS.md`).

## Incident checklist

Start with: what is broken, since when, for whom. Check the latest production deployment and its build log in Vercel, and `$exception`, `map_unavailable` and `building_load_failed` in PostHog.

### Map tiles down (`tiles.openfreemap.org`)

- Symptoms: the city map shows its "degraded" or "failed" notice; the building list and search keep working. On the indoor screen only the street approach map is affected; the 3D view, search and text routes do not use tiles. PostHog shows `map_unavailable` with `screen = city`.
- Check: `curl -sI https://tiles.openfreemap.org/planet`.
- Visitors keep the tiles they viewed before (service worker cache, up to 400 entries).
- Usually wait it out. To switch providers, change `TILEJSON_URL` and `GLYPHS_URL` in `src/presentation/city/mapStyle.ts`, `MAP_HOST` in `public/sw.js`, `connect-src` in `vercel.json`, the attribution links in `src/presentation/city/CityMap.tsx`, and the provider named in `src/presentation/i18n/messages/privacy.ts`.

### PostHog down or blocked

- The app is not affected. The SDK chunk is served from Merre's own origin and loads after the page is idle; if PostHog is down or blocked by an extension, its requests fail and the SDK retries them in memory for the rest of that page load. If the chunk itself cannot be loaded, `disableAnalytics()` turns analytics off for that page load. Nothing is stored in the browser either way.
- Expect a gap in the data. Nothing to do on the Merre side.
- If events stop while PostHog is up: check that the latest build has the key (command in [Verifying a deployment](#verifying-a-deployment)), that the CSP still allows the ingestion host, and that "Cookieless server hash mode" is still on.

### Broken deploy

- Build failed: the previous production deployment stays live. Fix on a branch.
- Build succeeded but the site is broken: [roll back](#rollback) first, then investigate on a preview deployment.
- Only some visitors affected: ask for the browser and whether the site is installed. A stale service worker can be cleared by the visitor (site settings → clear data) or replaced by releasing a changed `public/sw.js`.
- CSP errors in the console after a change: compare the blocked host with `connect-src`, `img-src`, `font-src` and `worker-src` in `vercel.json`.

### Wrong or dangerous map data reported

- A route that sends people the wrong way: fix the data and release as above. Merre is not an evacuation plan; the route panel says so under every route.

## Repository settings

- Turn on private vulnerability reporting in the repository's security settings, so that the procedure in [SECURITY.md](../SECURITY.md) works.
- Consider requiring the `verify` CI job for merges into `main`.
