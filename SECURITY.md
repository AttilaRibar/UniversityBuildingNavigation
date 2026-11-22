# Security policy

## Supported versions

Only the version deployed at https://oe-merre.vercel.app, built from the `main` branch, receives fixes. There are no maintained release branches.

| Version | Supported |
| --- | --- |
| 1.0.x (current `main`) | Yes |
| Earlier versions | No |

## Reporting a vulnerability

Please report privately first, so a fix can be deployed before details are public.

1. Use GitHub's private vulnerability reporting: open the repository's **Security** tab and choose **Report a vulnerability**. The report is visible only to the maintainers.
2. If that option is not available, open a normal issue that says you found a security problem and asks for a private way to send it. Do not put the details, a proof of concept or affected URLs in the issue.

Useful details: what is affected (a page, a header, the service worker, a dependency), how to reproduce it, and what an attacker could do with it.

Merre is an unofficial student project maintained in spare time. Reports are handled on a best-effort basis; there is no guaranteed response time and no bug bounty.

Out of scope: vulnerabilities in third-party services themselves (Vercel, PostHog, OpenFreeMap, GitHub), denial-of-service and traffic floods, and wrong map data (report that as a normal issue, see [CONTRIBUTING.md](CONTRIBUTING.md#reporting-wrong-map-data)).

## Security posture

- **Static site, no backend.** The deployment is the static `out/` folder of a Next.js export. There is no server code, API, database, login or account. What leaves the browser is map tile requests to `tiles.openfreemap.org`, the analytics events described below, and links the user chooses to open (GitHub issues, maps apps).
- **No user data stored.** The app keeps three values in the browser's `localStorage`: the language, whether the install banner was dismissed, and the analytics opt-out.
- **Analytics without cookies.** In production builds with a key, anonymous usage events go to PostHog EU Cloud in cookieless mode: nothing is written to cookies or browser storage, there is no `identify()`, no session recording and no autocapture. Do Not Track and Global Privacy Control turn it off; the opt-out on `/privacy/` stops all events at once. Details: [docs/ANALYTICS.md](docs/ANALYTICS.md).
- **Content Security Policy and headers.** `vercel.json` sets a CSP that allows scripts, styles, fonts and workers only from the site itself (plus inline scripts and styles, which a static Next.js export needs, `data:` fonts and `blob:` workers) and connections only to the site, `tiles.openfreemap.org` and `eu.i.posthog.com`; framing is forbidden. It also sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` (camera, microphone, geolocation, payment, USB and Topics off) and `Cross-Origin-Opener-Policy`. Vercel adds `Strict-Transport-Security`. Reasoning: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#security-headers).
- **Dependency audit in CI.** Every pull request and push to `main` runs `npm audit --omit=dev --audit-level=high`; a high or critical advisory in a shipped dependency fails the build. `next` and `posthog-js` are pinned to exact versions.
- **No secrets in the repository.** The only key the app uses, the PostHog project API key, is public by design (it can only write events) and is set as a Vercel environment variable. `.env*` files are git-ignored.
- **Preview deployments** are protected by Vercel Authentication; only the production domain is public.
- **Links that open a new tab** (GitHub, faculty sites, the maps apps, map attribution) use `rel="noopener noreferrer"`.
