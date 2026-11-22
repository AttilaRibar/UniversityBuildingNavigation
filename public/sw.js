/* Merre service worker: hand-written, no libraries.
 *
 * Caches:
 *   merre-precache-<version>  everything listed in /precache-manifest.json (new one per build)
 *   merre-runtime-v1          same-origin files fetched on demand (RSC payloads, data, ...)
 *   merre-map-v1              map tiles/glyphs from tiles.openfreemap.org (capped)
 */

const PRECACHE_PREFIX = "merre-precache-";
const RUNTIME_CACHE = "merre-runtime-v1";
const MAP_CACHE = "merre-map-v1";
const MAP_HOST = "tiles.openfreemap.org";
const MAP_CACHE_MAX_ENTRIES = 400;
const NAVIGATION_TIMEOUT_MS = 3000;
/** A stalled tile must fail (MapLibre then asks again) instead of leaving the map blank forever. */
const MAP_TIMEOUT_MS = 8000;

// ---------------------------------------------------------------- install
self.addEventListener("install", (event) => {
  // No skipWaiting() here: the page asks for it via a message once the user accepts the update toast.
  event.waitUntil(precache());
});

async function precache() {
  const response = await fetch("/precache-manifest.json", { cache: "no-store" });
  const { version, urls } = await response.json();
  const cache = await caches.open(PRECACHE_PREFIX + version);
  // One failing URL (e.g. a 404) must not abort the whole install, so add them individually.
  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { cache: "reload" });
        if (res.ok) await cache.put(url, res);
      } catch {
        /* ignore: the URL will be fetched from the network when needed */
      }
    }),
  );
}

// --------------------------------------------------------------- activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // Drop precaches of older builds but keep the runtime and map caches.
      // The live precache is the one named by the manifest this worker installed from.
      let current = null;
      try {
        const res = await fetch("/precache-manifest.json", { cache: "no-store" });
        current = PRECACHE_PREFIX + (await res.json()).version;
      } catch {
        /* offline at activation: keep all precaches rather than risk deleting the live one */
      }
      if (current) {
        await Promise.all(keys.filter((k) => k.startsWith(PRECACHE_PREFIX) && k !== current).map((k) => caches.delete(k)));
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// ------------------------------------------------------------------ fetch
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (url.origin === self.location.origin) {
    if (request.mode === "navigate") {
      // Pages: network-first so a deploy shows up at once, cache when the signal is weak/absent.
      event.respondWith(handleNavigation(event, url));
    } else if (url.pathname.startsWith("/_next/static/")) {
      // Hashed, immutable build output: cache-first is always correct and fastest.
      event.respondWith(cacheFirst(event));
    } else if (url.pathname === "/precache-manifest.json" || url.pathname === "/sw.js") {
      // Never serve these from cache: they decide what gets cached/updated.
      return;
    } else {
      // RSC payloads, icons, data: show the cached copy immediately, refresh in the background.
      event.respondWith(staleWhileRevalidate(event, RUNTIME_CACHE, { ignoreSearch: shouldIgnoreSearch(url) }));
    }
  } else if (url.hostname === MAP_HOST) {
    if (/^\/[^/]+$/.test(url.pathname)) {
      // The TileJSON (`/planet`) names this week's tile set: always ask the network first.
      event.respondWith(networkFirst(event, MAP_CACHE, MAP_TIMEOUT_MS));
    } else {
      // Map tiles/glyphs: serve what was viewed before, keep tiles fresh, cap the size.
      event.respondWith(staleWhileRevalidate(event, MAP_CACHE, { cap: MAP_CACHE_MAX_ENTRIES, timeoutMs: MAP_TIMEOUT_MS }));
    }
  }
});

/** Query strings only select client state (`?to=F.06`) for pages and RSC `.txt` files (and bust the icon cache), so ignoring them is safe. */
function shouldIgnoreSearch(url) {
  // The metadata icons carry a cache-busting query too.
  return url.pathname.endsWith("/") || url.pathname.endsWith(".txt") || url.pathname === "/icon.svg" || url.pathname === "/apple-icon.png";
}

/** Looks the request up in the precache(s) only. */
async function matchPrecache(request) {
  for (const key of await caches.keys()) {
    if (!key.startsWith(PRECACHE_PREFIX)) continue;
    const hit = await (await caches.open(key)).match(request);
    if (hit) return hit;
  }
  return undefined;
}

/** Looks the request up in every cache (precache versions + runtime). */
function matchAny(request, options) {
  return caches.match(request, options);
}

async function handleNavigation(event, url) {
  const request = event.request;
  try {
    const response = await fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS);
    if (response.ok) {
      // Keep the freshest page for offline use under its query-less URL.
      const cache = await caches.open(RUNTIME_CACHE);
      event.waitUntil(cache.put(stripSearch(url), response.clone()));
    }
    return response;
  } catch {
    // Offline or too slow: the cached page, matched without the query string, then the cached "/".
    // The precache comes first: its pages and chunks belong to the same build, while a page in the
    // runtime cache may be from an older build whose chunks were dropped with the old precache.
    return (
      (await matchPrecache(stripSearch(url))) ||
      (await matchAny(request, { ignoreSearch: true })) ||
      (await matchAny(stripSearch(url))) ||
      (await matchAny(withTrailingSlash(url), { ignoreSearch: true })) ||
      (await matchAny("/")) ||
      Response.error()
    );
  }
}

function stripSearch(url) {
  return url.origin + url.pathname;
}

function withTrailingSlash(url) {
  return url.origin + (url.pathname.endsWith("/") ? url.pathname : url.pathname + "/");
}

function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function cacheFirst(event) {
  const request = event.request;
  const cached = await matchAny(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    event.waitUntil(caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy)));
  }
  return response;
}

async function networkFirst(event, cacheName, timeoutMs) {
  const request = event.request;
  const cache = await caches.open(cacheName);
  try {
    const response = await fetchWithTimeout(request, timeoutMs);
    if (response.ok && response.type !== "opaque") event.waitUntil(cache.put(request, response.clone()));
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

async function staleWhileRevalidate(event, cacheName, { ignoreSearch = false, cap = 0, timeoutMs = 0 } = {}) {
  const request = event.request;
  const cache = await caches.open(cacheName);
  const cached = (await cache.match(request, { ignoreSearch })) || (cacheName === RUNTIME_CACHE ? await matchAny(request, { ignoreSearch }) : undefined);

  const refresh = (timeoutMs ? fetchWithTimeout(request, timeoutMs) : fetch(request))
    .then((response) => {
      // Only real, successful responses are stored: never opaque (status 0) or error responses.
      // Storing and trimming happen after the response is handed over, so they never delay it.
      if (response.ok && response.type !== "opaque") {
        const copy = response.clone();
        event.waitUntil(cache.put(request, copy).then(() => (cap ? trimCache(cache, cap) : undefined)));
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  return (await refresh) || Response.error();
}

/** Cache keys come back in insertion order, so the first ones are the oldest. */
async function trimCache(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}
