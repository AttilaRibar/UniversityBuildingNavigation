# Contributing

Thanks for helping. Merre is an unofficial student project. Fixes to map data are the most useful contribution, because most of the interior of building BA is estimated.

## Prerequisites

- **Node.js 22 or later.** `package.json` declares `"engines": { "node": ">=22" }`. CI (`.github/workflows/ci.yml`) and the Vercel build use Node 22, and `@types/node` is `^22`.
- **npm.** The repository has a `package-lock.json`; install with `npm install` (CI uses `npm ci`).
- A browser with WebGL for the 3D views.

```bash
npm install
```

```bash
npm run dev
```

## Next.js version note

This project uses a recent Next.js (16.x) with breaking changes compared to older versions. Do not rely on memory or older tutorials. The reference is the documentation bundled with the installed package:

```text
node_modules/next/dist/docs/
```

Read the relevant guide there before changing routes, config or build behaviour. `AGENTS.md` carries the same instruction for coding agents. Heed deprecation notices.

## Workflow

1. Fork the repository and create a branch from `main`.
2. Make a focused change. Keep unrelated changes in separate pull requests.
3. Run the checks below.
4. Commit with Conventional Commits.
5. Open a pull request that says what changed and why. For data changes, say how you verified it (see below).

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, imperative mood, lower case summary, no trailing period.

Types in use: `feat`, `fix`, `test`, `docs`, `chore`, `ci`.

Scopes seen in the history:

| Scope | Area |
| --- | --- |
| `analytics` | Analytics facade, PostHog adapter, consent and campaign helpers |
| `app` | App shell, routes, campus dataset, i18n provider |
| `brand` | Logo and branding |
| `building` | Indoor building screen and 3D scene |
| `city` | City overview map, building list and card |
| `data` | Building and campus datasets, data tooling |
| `domain` | Domain model and geometry |
| `routing` | Route graph, A*, instructions, validation |
| `search` | Room search |
| `pwa` | Manifest, icons, service worker, install prompt |
| `ui` | Shared UI components |
| `research` | Notes under `docs/research/` (used as `docs(research)`) |

Examples from the history:

```text
feat(search): add typo-tolerant room search with ref normalisation
test(routing): compare condensed distance with float tolerance
docs(research): add indoor navigation landscape note
```

New scopes are fine when no existing one fits. Omit the scope for repository-wide changes (`chore: ...`, `ci: ...`).

## Code style

Rules that the repository already follows:

- **English everywhere in code.** Identifiers, comments, commit messages and documentation are in English. User-facing text is Hungarian and English (see below).
- **No `any`.** The project is TypeScript with strict typing. Use precise types, `unknown` with narrowing, or generics. ESLint runs the Next.js TypeScript preset.
- **Small pure functions in the domain.** `src/domain/` has no React, three.js, Next.js, DOM or `@/` imports, and no I/O. Data in and data out, so it stays testable in Node. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#the-dependency-rule).
- **Respect the layers.** Domain, then application and infrastructure, then presentation and app routes. Lower layers must not import from `presentation` or `app`.
- **Readonly data.** Domain types use `readonly` arrays and tuples (`Vec2` is a readonly tuple).
- **User-visible strings go through message files.** Add Hungarian and English text to the files in `src/presentation/i18n/messages/` (`common`, `building`, `city`, `privacy`, `pwa`, `ui`) and read it with `useMessages(hu, en)`. Hungarian is the source language; the English object has the same type as the Hungarian one, so a missing key is a type error. Do not hard-code visible text in components. Bilingual data values use `{ hu, en }` objects. For Hungarian text after a number, use the helpers in `src/presentation/i18n/hungarian.ts` (`definiteArticle`, `elativeSuffix`): "az 5-ből", "a 10-ből".
- **Domain returns data, not sentences.** Route steps are structured; `src/presentation/building/stepText.ts` turns them into text.
- **Comments explain why.** Doc comments state intent and constraints (for example why a cost must stay at or above the planar distance), not what the next line does.
- **Accessibility.** Keep a text alternative for anything shown only in 3D, respect `prefers-reduced-motion`, and give controls accessible names.
- **No secrets.** The app is static and has no backend. The only key, the PostHog project API key, is public by design and comes from the `NEXT_PUBLIC_POSTHOG_KEY` environment variable; never commit `.env*` files.
- **Analytics only through the facade.** Add events to `AnalyticsEvents` in `src/application/analytics.ts` and send them with `track()`. Every event must follow the privacy rules in [docs/ANALYTICS.md](docs/ANALYTICS.md#privacy-rules-for-new-events): ids and counts, no personal data, no free text except the normalised search query. Add a row to the event catalogue in `docs/ANALYTICS.md`, and update the privacy page texts (`src/presentation/i18n/messages/privacy.ts`) when an event records a new kind of information. `posthog-js` is imported only by `src/infrastructure/analytics/posthog.ts`, and that adapter only by `src/instrumentation-client.ts`.

## Checks before a pull request

Run all of them. They are the same steps as CI, which also runs `npm audit --omit=dev --audit-level=high` before them.

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run validate:data
```

```bash
npm run build
```

Add or update tests for behaviour changes in `src/domain/`, `src/application/`, `src/infrastructure/`, pure presentation helpers (such as `src/presentation/building/stepText.ts` and `src/presentation/i18n/hungarian.ts`) and for changes to shipped data. Tests live next to the code as `*.test.ts`; for example `src/application/analytics.test.ts`, `src/application/links.test.ts` and `src/presentation/i18n/hungarian.test.ts`.

Changes to analytics, the service worker or `vercel.json` have no automated tests. Check them with a production build as described in [docs/ANALYTICS.md](docs/ANALYTICS.md#testing-locally) and, for headers, on the pull request's Vercel preview ([docs/OPERATIONS.md](docs/OPERATIONS.md#verifying-a-deployment)).

## Link preview image

`public/og-image.png` (1200 × 630) is the image chat apps show for shared links. It is committed. Its source is `scripts/og-image.html`; after editing the HTML, regenerate the PNG and commit both:

```bash
npm run og-image
```

The script needs Playwright with Chromium, which is not a project dependency. Install it so that Node can resolve it from the project, without saving it to `package.json`, for example `npm install --no-save playwright` and `npx playwright install chromium`. The next `npm ci` removes it again.

## Changing map data

Read [docs/DATA_MODEL.md](docs/DATA_MODEL.md) first. Short version:

1. Edit the GeoJSON under `src/data/buildings/<id>/levels/` (QGIS or by hand).
2. `npm run validate:data`
3. `npx tsx scripts/render-plans.ts <room>` and look at the PNGs in `.plans/`.
4. `npm test`

Do not re-run `scripts/bootstrap/*.ts` over files that were corrected by hand; they overwrite them. Only set `accuracy` to `"surveyed"` for geometry you verified on site or took from an authoritative plan.

## Reporting wrong map data

Open an issue (or a pull request with the fix). The "Wrong room position or route? Let us know" link on a room card opens a pre-filled issue with the page link and three questions: what is wrong, what is actually there, how you know. Include:

- The building and level (for example BA, level 2).
- The room number or place, and what is wrong: wrong position, wrong side of the corridor, missing room, wrong name, wrong capacity, a missing or wrong staircase or lift, a route that cannot be walked.
- What is actually there. Where possible: the position relative to a landmark (next to the west lift, third door on the left from the stairs), a photo of the door sign, or a scan of a plan.
- How you know: visited on a given date, read from a printed floor plan, seen on an official page (link).
- For a bad route: the deep link that reproduces it, for example `/building/ba/?to=F.06&from=doberdo-entrance&sf=1`, and what the route should have done.
- Whether step-free routing was on.

Please do not attach material you are not allowed to share, such as internal or restricted floor plans, and do not photograph people.

For other bugs, include the device, browser and language setting, and what you expected to happen.

## Questions

Open an issue. For architecture questions, start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
