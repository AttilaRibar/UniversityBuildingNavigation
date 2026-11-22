/**
 * Renders scripts/og-image.html to public/og-image.png (1200x630), the link preview image.
 * The PNG is committed; run this only after changing the HTML. Needs Playwright with Chromium
 * (`npx playwright install chromium` if it is not available yet).
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(root, "scripts", "og-image.html")).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(root, "public", "og-image.png") });
await browser.close();
console.log("wrote public/og-image.png");
