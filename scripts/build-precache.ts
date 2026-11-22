/**
 * Runs after `next build`: scans `out/` and writes `out/precache-manifest.json`
 * (`{ version, urls }`) which `public/sw.js` fetches on install.
 * `version` is a hash of the URL list plus file sizes, so every changed build gets a fresh cache.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const outDir = path.resolve(import.meta.dirname, "..", "out");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

/**
 * The analytics SDK chunk is not precached: visitors who opted out (or whose browser
 * sends Do Not Track) never load it, so they should not download it either. Visitors
 * with analytics on fetch it once and the worker keeps it (`/_next/static/` is cache-first).
 */
function isAnalyticsSdk(rel: string): boolean {
  return rel.endsWith(".js") && readFileSync(path.join(outDir, rel), "utf8").includes("[PostHog.js]");
}

/** Maps a file in out/ to the URL the browser will request, or null to skip it. */
function toUrl(rel: string): string | null {
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return `/${rel.slice(0, -"index.html".length)}`;
  if (rel === "404.html" || rel === "_not-found.html" || rel.endsWith(".html")) return null; // not a navigable page
  if (rel.startsWith("_next/static/")) return isAnalyticsSdk(rel) ? null : `/${rel}`;
  if (rel.startsWith("icons/") && /\.(png|svg)$/.test(rel)) return `/${rel}`;
  if (rel === "icon.svg" || rel === "apple-icon.png" || rel === "manifest.webmanifest") return `/${rel}`;
  // RSC payloads (`/building/ba/index.txt`, `__next.*.txt`) used by client-side navigation.
  if (rel.endsWith(".txt") && rel !== "robots.txt") return `/${rel}`;
  return null;
}

const files = walk(outDir).map((f) => path.relative(outDir, f).split(path.sep).join("/"));
const entries: { url: string; size: number }[] = [];
for (const rel of files.sort()) {
  const url = toUrl(rel);
  if (url) entries.push({ url, size: statSync(path.join(outDir, rel)).size });
}

const urls = entries.map((e) => e.url);
const hash = createHash("sha256");
for (const e of entries) hash.update(`${e.url}:${e.size}\n`);
const version = hash.digest("hex").slice(0, 12);

writeFileSync(path.join(outDir, "precache-manifest.json"), JSON.stringify({ version, urls }, null, 2));
console.log(`precache-manifest.json: ${urls.length} urls, version ${version}`);
