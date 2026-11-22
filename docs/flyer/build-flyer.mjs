#!/usr/bin/env node
/**
 * Builds the Merre flyer (A5 portrait, two pages) from flyer.html.
 *
 *   node docs/flyer/build-flyer.mjs              PDF + previews + layout checks
 *   node docs/flyer/build-flyer.mjs --qr         also regenerate the QR SVGs first (needs npx + network)
 *   node docs/flyer/build-flyer.mjs --verify-qr  also decode the rendered QR codes and compare them
 *                                                with the expected URLs (needs jsqr + pngjs, see README)
 *
 * Outputs (next to this file): merre-szorolap.pdf, preview-1.png, preview-2.png.
 * Uses Playwright's Chromium. Exits with code 1 if a check fails.
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(DIR, "assets");
const HTML = path.join(DIR, "flyer.html");
const PDF = path.join(DIR, "merre-szorolap.pdf");

/* The only place the QR URLs live. If the app moves to its own domain, change SITE, run with
 * --qr --verify-qr, and update the visible short address (".url" on the front) in flyer.html. */
const SITE = "https://oe-merre.vercel.app";
const UTM = "utm_source=szorolap&utm_medium=print";
const QR_CODES = [
  { file: "qr-main.svg", url: `${SITE}/?${UTM}` },
  { file: "qr-f06.svg", url: `${SITE}/building/ba/?to=F.06&${UTM}` },
];
const QR_INK = "14213dff"; // --ink, on white

const PAGE_MM = { width: 148, height: 210 };
const SAFE_MM = 5; // nothing printed closer than this to the trim edge
const MIN_PT = 8;
const MIN_QR_MM = 30; // printed size of the main code, quiet zone excluded

const args = new Set(process.argv.slice(2));
const require = createRequire(import.meta.url);
const problems = [];

function requireFrom(name) {
  const roots = [process.env.FLYER_TOOLS, process.cwd(), DIR].filter(Boolean);
  for (const root of roots) {
    try {
      return createRequire(path.join(path.resolve(root), "noop.js"))(name);
    } catch {
      /* try the next root */
    }
  }
  return require(name); // NODE_PATH / global install
}

function regenerateQr() {
  for (const { file, url } of QR_CODES) {
    const out = path.join(ASSETS, file);
    execFileSync(
      "npx",
      ["--yes", "qrcode@1.5.4", "-t", "svg", "-e", "M", "-d", QR_INK, "-l", "ffffffff", "-o", out, url],
      // stdin must be closed: with a non-TTY stdin the qrcode CLI waits to read its input from it.
      { stdio: ["ignore", "inherit", "inherit"] },
    );
  }
}

async function main() {
  if (args.has("--qr")) regenerateQr();

  let playwright;
  try {
    playwright = requireFrom("playwright");
  } catch {
    console.error("Playwright not found. Install it outside the project, e.g. `npm i -g playwright`.");
    process.exit(1);
  }

  const browser = await playwright.chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 560, height: 794 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(pathToFileURL(HTML).href, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    await checkLayout(page);

    await page.pdf({
      path: PDF,
      width: `${PAGE_MM.width}mm`,
      height: `${PAGE_MM.height}mm`,
      printBackground: true,
      preferCSSPageSize: true,
    });
    const pdfText = fs.readFileSync(PDF, "latin1");
    const pdfPages = (pdfText.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
    if (pdfPages !== 2) problems.push(`PDF has ${pdfPages} pages, expected 2`);
    // Every embedded font must be Overpass (no fallback font), and none may be Type 3.
    const baseFonts = [...new Set((pdfText.match(/\/BaseFont\s*\/[^\s/<>[\]]+/g) || []).map((m) => m.replace(/.*\/(?:[A-Z]{6}\+)?/, "")))];
    const strays = baseFonts.filter((name) => !name.startsWith("Overpass"));
    const type3 = /\/Subtype\s*\/Type3/.test(pdfText);
    console.log(`PDF      ${path.relative(process.cwd(), PDF)} (${pdfPages} pages; fonts: ${baseFonts.join(", ") || "none found"}${type3 ? "; Type 3 glyphs!" : ""})`);
    if (strays.length) problems.push(`PDF uses a fallback font: ${strays.join(", ")}`);
    if (type3) problems.push("PDF contains Type 3 fonts (a variable font slipped in?)");

    const sheets = page.locator("section.page");
    for (let i = 0; i < (await sheets.count()); i++) {
      const out = path.join(DIR, `preview-${i + 1}.png`);
      await sheets.nth(i).screenshot({ path: out });
      console.log(`Preview  ${path.relative(process.cwd(), out)}`);
    }

    if (args.has("--verify-qr")) await verifyQr(browser);
  } finally {
    await browser.close();
  }

  if (problems.length) {
    console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log("\nAll checks passed.");
}

/** Fonts, smallest type, safe zone and QR size, measured in the browser. */
async function checkLayout(page) {
  const report = await page.evaluate(
    ({ SAFE_MM }) => {
      const pxPerMm = 96 / 25.4;
      const out = { fonts: [], minPt: Infinity, minPtText: "", unsafe: [], spill: [], qr: [] };

      for (const face of document.fonts) {
        if (face.family.replace(/"/g, "") === "Overpass") out.fonts.push({ status: face.status, weight: face.weight });
      }
      out.hasOu = ["500", "700", "800"].every((w) => document.fonts.check(`${w} 20px "Overpass"`, "őűŐŰáéíóöúü„”"));

      for (const sheet of document.querySelectorAll("section.page")) {
        const box = sheet.getBoundingClientRect();
        const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.textContent.trim();
          if (!text) continue;
          const el = node.parentElement;
          const pt = parseFloat(getComputedStyle(el).fontSize) * 0.75;
          if (pt < out.minPt) {
            out.minPt = pt;
            out.minPtText = text.slice(0, 40);
          }
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const r of range.getClientRects()) {
            const mm = (v) => v / pxPerMm;
            const left = mm(r.left - box.left);
            const right = mm(box.right - r.right);
            const top = mm(r.top - box.top);
            const bottom = mm(box.bottom - r.bottom);
            if (Math.min(left, right, top, bottom) < SAFE_MM - 0.01) {
              out.unsafe.push(`${sheet.getAttribute("aria-label")}: "${text.slice(0, 30)}"`);
              break;
            }
          }
        }
        // Coloured boxes and images must also stay inside the safe zone, except inside
        // containers marked data-clipped (the phones, which their panel crops on purpose).
        for (const el of sheet.querySelectorAll("*")) {
          if (el.closest("[data-clipped]")) continue;
          const style = getComputedStyle(el);
          const painted = el.tagName === "IMG" || el.tagName === "svg" || style.backgroundColor !== "rgba(0, 0, 0, 0)";
          if (!painted) continue;
          const r = el.getBoundingClientRect();
          const gap = Math.min(r.left - box.left, box.right - r.right, r.top - box.top, box.bottom - r.bottom) / pxPerMm;
          if (gap < SAFE_MM - 0.01) out.unsafe.push(`${sheet.getAttribute("aria-label")}: <${el.tagName.toLowerCase()} class="${el.className}"> ${gap.toFixed(1)} mm from the edge`);
        }
        // Text that is wider than its box (e.g. a nowrap URL) spills out silently.
        for (const el of sheet.querySelectorAll("p, h1, h2, h3, li, span")) {
          if (el.closest("[data-clipped]")) continue;
          if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== "inline") {
            out.spill.push(`${sheet.getAttribute("aria-label")}: "${el.textContent.trim().slice(0, 40)}"`);
          }
        }
        for (const img of sheet.querySelectorAll("img.qr")) {
          const widthMm = img.getBoundingClientRect().width / pxPerMm;
          out.qr.push({ src: img.getAttribute("src"), widthMm, sheet: sheet.getAttribute("aria-label") });
        }
      }
      return out;
    },
    { SAFE_MM },
  );

  const failed = report.fonts.filter((f) => f.status === "error");
  const loaded = report.fonts.filter((f) => f.status === "loaded");
  console.log(`Fonts    ${loaded.length}/${report.fonts.length} Overpass faces in use, ő/ű in every weight: ${report.hasOu ? "ok" : "MISSING"}`);
  if (failed.length || !report.hasOu) problems.push("an Overpass face failed to load (see assets/fonts)");

  console.log(`Type     smallest text ${report.minPt.toFixed(1)} pt ("${report.minPtText}")`);
  if (report.minPt < MIN_PT) problems.push(`text smaller than ${MIN_PT} pt: "${report.minPtText}"`);

  console.log(`Margins  ${report.unsafe.length ? report.unsafe.length + " item(s) inside the 5 mm edge" : "all text, boxes and images at least 5 mm from the edge"}`);
  for (const u of report.unsafe) problems.push(`closer than ${SAFE_MM} mm to the edge: ${u}`);
  console.log(`Overflow ${report.spill.length ? report.spill.length + " element(s) wider than their box" : "no text wider than its box"}`);
  for (const s of report.spill) problems.push(`text wider than its box: ${s}`);

  for (const qr of report.qr) {
    const svg = fs.readFileSync(path.join(DIR, qr.src), "utf8");
    const side = Number(/viewBox="0 0 (\d+)/.exec(svg)?.[1] || 0);
    const codeMm = side ? (qr.widthMm * (side - 8)) / side : qr.widthMm;
    console.log(`QR       ${qr.src}: ${qr.widthMm.toFixed(1)} mm with quiet zone, ${codeMm.toFixed(1)} mm code (${qr.sheet})`);
    if (qr.src.endsWith("qr-main.svg") && codeMm < MIN_QR_MM) problems.push(`main QR code is only ${codeMm.toFixed(1)} mm`);
  }
}

/** Renders each QR image large, decodes it with jsQR and compares it with QR_CODES. */
async function verifyQr(browser) {
  let jsQR, PNG;
  try {
    jsQR = requireFrom("jsqr");
    ({ PNG } = requireFrom("pngjs"));
  } catch {
    problems.push(
      "--verify-qr needs jsqr and pngjs. Install them outside the project, e.g. " +
        "`npm i --prefix /tmp/flyer-tools jsqr pngjs` and run with FLYER_TOOLS=/tmp/flyer-tools",
    );
    return;
  }
  const context = await browser.newContext({ viewport: { width: 560, height: 794 }, deviceScaleFactor: 4 });
  const page = await context.newPage();
  await page.goto(pathToFileURL(HTML).href, { waitUntil: "networkidle" });
  for (const { file, url: expected } of QR_CODES) {
    const src = `assets/${file}`;
    const img = page.locator(`img.qr[src="${src}"]`);
    if ((await img.count()) !== 1) {
      problems.push(`${src} should appear exactly once in flyer.html`);
      continue;
    }
    const png = PNG.sync.read(await img.screenshot());
    const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    const ok = result?.data === expected;
    console.log(`Decode   ${src}: ${ok ? "OK" : "MISMATCH"} -> ${result?.data ?? "(not readable)"}`);
    if (!ok) problems.push(`${src} decodes to ${result?.data ?? "nothing"}, expected ${expected}`);
  }
  await context.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
