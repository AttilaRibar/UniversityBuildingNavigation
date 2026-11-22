# Merre

Merre helps Óbuda University students find their way around campus. It shows a 3D map of the city with the university buildings highlighted, and an indoor 3D map of building BA (Bécsi út 96/B) with room search and step-by-step routing from an entrance to a room. It is a Progressive Web App built as a fully static Next.js export: there is no backend and no login.

Live: **https://oe-merre.vercel.app** (version 1.1.0, see [CHANGELOG.md](CHANGELOG.md)).

> **Status and data accuracy**
>
> - Merre is an **unofficial student project**. It is not made, endorsed or maintained by Óbuda University.
> - The interior of building BA is **estimated**. It was derived from the floor directory signs in the building and the OpenStreetMap outline. Every BA unit is flagged `accuracy: "estimated"`. Room positions along corridors are approximate until someone verifies them on site, and a route may point to the wrong side of a corridor.
> - Merre is **not an evacuation plan** and must not be used as one. Follow the official signs and instructions in the building.
> - Only building BA has indoor data. All other buildings appear on the city map only.

## Features

- **City overview.** A 3D map (MapLibre GL, OpenFreeMap tiles) with the university buildings extruded and coloured by faculty, grouped by campus, with a building list, search and a detail card per building.
- **Directions to a building.** The building card hands walking directions over to the phone's own maps app (Apple Maps on Apple devices, Google Maps elsewhere). Outdoor routing is deliberately not implemented here.
- **Indoor 3D map of building BA.** Six levels (A, F, 1, 2, 3, 4) shown as a stack of floor plates that can be explored level by level.
- **Room search.** Search by room number (`F.06`, `1.32`, `132`), by name, by alias (for example "Audmax") or by category, with typo tolerance and Hungarian diacritics folded.
- **Step-by-step routing.** From a chosen start point to a room, as instruction cards and as a highlighted route in the 3D view. A step-free option avoids stairs.
- **Nearest facility.** "Nearest" shortcuts (restroom, café, reception, aula) pick the cheapest reachable unit of a category.
- **Shareable links.** Every room has a URL that opens the map with the route prepared (see [Deep links](#deep-links)). Link previews in chat apps show a title and an image.
- **Problem reports.** The room card links to a pre-filled GitHub issue with the page link, for wrong room positions or routes.
- **Offline use.** A hand-written service worker precaches the app and keeps visited map tiles, so a visited screen still opens without a connection.
- **Hungarian and English.** The language follows the stored or browser preference and can be switched in the UI.
- **Text alternative to the 3D view.** The full step list is always available as text, and the 3D scene respects `prefers-reduced-motion`.

## Privacy and analytics

Production builds with a PostHog key send anonymous usage statistics to PostHog EU Cloud, for example page views, searches (the text trimmed, lower-cased and cut to 40 characters, with the result counts), selected buildings and rooms, whether a route was started and finished, errors and load speed. Builds on Vercel also count visitors and page views with Vercel Web Analytics. Analytics sets no cookies and writes nothing to browser storage; PostHog counts visitors with a daily changing hash on its servers, Vercel with a request hash discarded after 24 hours. Nothing is sent when the browser sends Do Not Track or Global Privacy Control, or after the visitor switches statistics off on the privacy page.

- Privacy page for visitors: `/privacy/` (https://oe-merre.vercel.app/privacy/)
- Event catalogue, privacy rules for new events, testing: [docs/ANALYTICS.md](docs/ANALYTICS.md)

The app itself stores only the language, a dismissed install banner and the analytics opt-out in `localStorage`. There are no accounts and no server-side user data.

## Quick start

Requirements: Node.js 22 or later and npm (see [CONTRIBUTING.md](CONTRIBUTING.md#prerequisites)).

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create the static export (`out/`) and the precache manifest:

```bash
npm run build
```

Serve the exported site locally. This runs `npx serve out` on port 3000 and downloads `serve` on first use:

```bash
npm run preview
```

The service worker and analytics run in production builds only, so test offline behaviour and analytics with `npm run build` and `npm run preview`, not with `npm run dev`. `npm run preview` does not send the headers from `vercel.json` (Content Security Policy and others).

## Environment variables

All are optional and read by `next build`. `NEXT_PUBLIC_*` values are inlined into the JavaScript at build time, so changing one needs a new build. Locally, use `.env.local` (git-ignored) or the command line; on Vercel, the project's environment variables ([docs/OPERATIONS.md](docs/OPERATIONS.md#environment-variables)).

| Variable | Default | Effect |
| --- | --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` | unset | PostHog project API key (`phc_…`). Without it, PostHog is off |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` | PostHog ingestion host. If changed, update `connect-src` in the CSP in `vercel.json` |
| `NEXT_PUBLIC_SITE_URL` | `https://oe-merre.vercel.app` | Public origin used for canonical and Open Graph URLs, `sitemap.xml` and `robots.txt` |
| `PLANS_OUT` | `.plans` | Output folder of `scripts/render-plans.ts` (development only) |

`VERCEL_ENV` is set by Vercel itself; `next.config.ts` inlines it as `MERRE_DEPLOY_ENV`, which turns Vercel Web Analytics on for Vercel builds and tags PostHog events with `deploy_env`.

## Project scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `npm run dev` | `next dev` | Development server |
| `npm run build` | `next build && tsx scripts/build-precache.ts` | Static export to `out/`, then writes `out/precache-manifest.json` |
| `npm run preview` | `npx --yes serve out -l 3000` | Serve the exported `out/` folder on port 3000 |
| `npm run lint` | `eslint .` | Lint (Next.js core-web-vitals and TypeScript presets) |
| `npm run typecheck` | `tsc --noEmit` | Type check |
| `npm test` | `vitest run` | Unit tests once (`src/**/*.test.ts`, `scripts/**/*.test.ts`) |
| `npm run test:watch` | `vitest` | Tests in watch mode |
| `npm run validate:data` | `tsx scripts/validate-data.ts` | Validates every building's indoor data; exits non-zero on errors |
| `npm run icons` | `tsx scripts/generate-icons.ts` | Regenerates the PWA icons from `public/icons/logo.svg` |
| `npm run og-image` | `node scripts/generate-og-image.mjs` | Renders `scripts/og-image.html` to `public/og-image.png` (1200 × 630). Needs Playwright with Chromium, which is not a project dependency (see [CONTRIBUTING.md](CONTRIBUTING.md#link-preview-image)) |

Scripts that are run directly with `npx tsx`:

| Script | Purpose |
| --- | --- |
| `scripts/render-plans.ts` | Renders a top-down PNG per level into `.plans/` for eyeballing data edits |
| `scripts/bootstrap/ba.ts` | One-time derivation of the BA data from signs and the OSM outline. Overwrites the BA data files, see [DATA_MODEL.md](docs/DATA_MODEL.md#when-not-to-re-run-the-bootstrap-scripts) |
| `scripts/bootstrap/campus.ts` | Curates the OSM research export into the campus dataset |

## Tech stack

| Technology | Why |
| --- | --- |
| Next.js 16 (App Router, `output: "export"`) | Static HTML and JS that any static host can serve; per-route code splitting |
| React 19 | UI components |
| TypeScript | Typed domain model, data mapping and analytics event catalogue |
| three.js | The indoor 3D scene, driven from one imperative scene object |
| MapLibre GL JS with OpenFreeMap tiles | The city map and the entrance street map, vector tiles without an API key |
| Tailwind CSS 4 | Styling with design tokens |
| motion | Sheet and screen animations; honours reduced motion |
| posthog-js (pinned `1.445.5`, `no-external` build) | Cookieless product analytics, error and web vitals capture |
| Vitest | Unit tests for the pure layers and the shipped data |
| sharp, tsx | Development scripts (icons, plan rendering, data tools) |
| Hand-written service worker | Offline support without a build-time library |
| Vercel | Hosting, with headers and caching from `vercel.json` |

## Project structure

```text
src/
  domain/                  Pure TypeScript: indoor model, routing, search, geometry, campus model
  application/             Use-case helpers: maps hand-off, links, room search index, app info, analytics facade
  infrastructure/          Adapters: GeoJSON -> domain mapper, PostHog analytics adapter
  data/                    Shipped datasets: campus buildings, building BA (building.json + levels/*.json)
  presentation/            React UI: building screen (3D scene, panels), city screen, privacy and status pages,
                           analytics consent helpers, shared ui/, pwa/, i18n/
  app/                     Next.js routes, layout, error and 404 pages, manifest, robots, sitemap, icons
  instrumentation-client.ts  Runs before hydration: analytics start-up (composition root)
scripts/                   Data validation, plan rendering, icon and link preview generation, precache manifest, bootstrap tools
public/                    sw.js (service worker), og-image.png, PWA icons
docs/                      Architecture, data model, analytics, operations, research notes, flyer
vercel.json                Vercel build settings, security headers, caching
```

The layer rules are described in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## How routing works

1. Each level's walkway polylines are split at every vertex and crossing and merged into graph nodes (1 cm resolution).
2. Doors, entrances and connector stops (stairs, lifts) are snapped onto the nearest walkway, at most 6 m away, and joined with a short spur.
3. Connectors become edges between levels. Stairs and ramps link consecutive levels; a lift links every pair of its stops. Stairs and lifts carry an extra cost in metre-equivalents.
4. A* with a straight-line heuristic finds the cheapest path from any door of the origin to any door of the destination. In step-free mode, edges that are not step-free are skipped.
5. The path is grouped into legs (one walk per level, one leg per connector ride) and turned into structured steps: depart, turn, connector, arrive.
6. The steps are condensed so that short shuffles near doors and lifts do not become cards of their own.
7. The presentation layer renders the steps as Hungarian or English text and as highlights in the 3D scene.

Details and the trade-offs behind this design are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Adding or correcting data

The GeoJSON files under `src/data/buildings/` are the source of truth. Edit them directly, run `npm run validate:data`, render the plans, and run the tests. The full procedure, the file format and the validation rules are in [docs/DATA_MODEL.md](docs/DATA_MODEL.md).

## Deep links

The indoor map of a building lives at `/building/<buildingId>/`. Query parameters prepare a route:

| Parameter | Meaning |
| --- | --- |
| `to` | Destination: a unit id or a room number, for example `F.06` |
| `from` | Start point: an anchor id (for example `doberdo-entrance`) or a unit id. Defaults to the building's default entrance |
| `sf` | `1` turns on step-free routing |

Example:

```text
/building/ba/?to=F.06&from=doberdo-entrance&sf=1
```

While the app is open it keeps the address bar in sync with the current destination, start point and step-free setting, so the browser URL can be shared as it is. Other parameters are removed from the address bar: `utm_*` campaign parameters on page load (they are kept for analytics only), and `src=search`, which the city search adds to its room links so analytics can tell a search from a shared link.

## Deployment

Production runs on Vercel (project `merre`, Git integration with this repository): every push to `main` is built and deployed to https://oe-merre.vercel.app (the earlier `merre-chi.vercel.app` redirects there), and pull requests get preview deployments behind Vercel Authentication. `vercel.json` sets the build command, the output folder `out`, the Content Security Policy and other security headers, and caching. Setup, releases, rollback and incident handling are in [docs/OPERATIONS.md](docs/OPERATIONS.md).

The build output is a static site in `out/`, so other static hosts work too. Notes:

- Host the site at the **root of a domain**. The service worker scope, the manifest `start_url` and the precache URLs are root-absolute, and `next.config.ts` sets no `basePath`.
- Serve `sw.js` with `Cache-Control: no-cache` (or equivalent) so that browsers pick up new versions. `precache-manifest.json` should not be cached long-term either; the service worker fetches it with `cache: "no-store"` regardless.
- `next.config.ts` enables `trailingSlash`, so pages are exported as `folder/index.html`. The host must serve `/building/ba/` from `building/ba/index.html`, and `404.html` for unknown paths.
- The headers in `vercel.json` apply on Vercel only. On another host, configure the same headers there.
- CI (`.github/workflows/ci.yml`) runs the production dependency audit, lint, typecheck, tests, data validation and the build on Node 22. It does not deploy.

## Data sources and attribution

- Building outlines and the city base map data: **© OpenStreetMap contributors**, licensed under the [Open Database License (ODbL)](https://www.openstreetmap.org/copyright).
- City map tiles and fonts: [OpenFreeMap](https://openfreemap.org), built on [OpenMapTiles](https://openmaptiles.org) and OpenStreetMap data. The app requests them from `tiles.openfreemap.org`.
- Interior of building BA: estimated from the floor directory signs in the building. Room numbers, laboratory lists and capacities come from public university pages; the research notes are in [docs/research/ba-building.md](docs/research/ba-building.md).
- Campus buildings: [docs/research/campus-buildings.md](docs/research/campus-buildings.md).
- Background on indoor navigation approaches: [docs/research/indoor-navigation-landscape.md](docs/research/indoor-navigation-landscape.md).
- Faculty and building names are used to identify places. Merre has no affiliation with the university.

## License

The maintainer has not chosen a license yet. Until a `LICENSE` file is added, no license is granted. Data derived from OpenStreetMap remains under the ODbL.

## Acknowledgements

- The OpenStreetMap contributors who mapped the campus buildings.
- OpenFreeMap and OpenMapTiles for free vector tiles.
- The MapLibre GL JS and three.js projects.
- The Indoor Mapping Data Format (IMDF) for the vocabulary the indoor data model borrows from.
- Fontsource and the Overpass typeface (`@fontsource-variable/overpass`).

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): layers, runtime flow, error handling, security headers, design decisions, offline, testing, limitations
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md): indoor and campus data formats, validation, how to edit data
- [docs/ANALYTICS.md](docs/ANALYTICS.md): why PostHog, how it is wired, event catalogue, privacy rules, testing, first insights
- [docs/OPERATIONS.md](docs/OPERATIONS.md): PostHog and Vercel setup, environment variables, releases, rollback, verification, custom domain, incidents
- [SECURITY.md](SECURITY.md): supported versions, reporting a vulnerability, security posture
- [CHANGELOG.md](CHANGELOG.md): release notes
- [CONTRIBUTING.md](CONTRIBUTING.md): workflow, code style, checks, reporting wrong map data
- [docs/flyer/](docs/flyer/README.md): the printable A5 flyer (in Hungarian)
- [docs/research/](docs/research/): research notes
