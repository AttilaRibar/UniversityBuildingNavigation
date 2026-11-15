/**
 * Generates the PWA icon set from `public/icons/logo.svg` with sharp.
 * Run with `npm run icons`; the PNGs are committed so a normal build needs no sharp.
 *
 * - icon-192 / icon-512: the logo as drawn (rounded tile, transparent corners).
 * - icon-maskable-512: full-bleed #ffd21f with the arrow inside the 80 % safe zone.
 * - apple-touch-icon (180) + src/app/apple-icon.png: full-bleed, iOS rounds the corners itself.
 */
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const iconsDir = path.join(root, "public", "icons");
const logoSvg = readFileSync(path.join(iconsDir, "logo.svg"));

const YELLOW = "#ffd21f";
const INK = "#14213d";

/** The arrow glyph of the logo (64x64 grid), centred on (31.5, 32.5) incl. stroke. */
function fullBleedSvg(glyphScale: number): string {
  // Glyph bounding box incl. 7px stroke is about 29 units wide; scale it around its centre.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${YELLOW}"/>
  <g transform="translate(32 32) scale(${glyphScale}) translate(-31.5 -32.5)">
    <path d="M22 42 L40 24 M27 23 H41 V37" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

async function render(svg: Buffer | string, size: number, out: string): Promise<void> {
  await sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
  console.log(`wrote ${path.relative(root, out)} (${size}x${size})`);
}

async function main(): Promise<void> {
  mkdirSync(iconsDir, { recursive: true });
  await render(logoSvg, 192, path.join(iconsDir, "icon-192.png"));
  await render(logoSvg, 512, path.join(iconsDir, "icon-512.png"));
  // Safe zone is a centred circle of 80 % diameter; glyph (~29 units) at 1.1x stays well inside.
  await render(fullBleedSvg(1.1), 512, path.join(iconsDir, "icon-maskable-512.png"));
  await render(fullBleedSvg(1.5), 180, path.join(iconsDir, "apple-touch-icon.png"));
  copyFileSync(path.join(iconsDir, "apple-touch-icon.png"), path.join(root, "src", "app", "apple-icon.png"));
  copyFileSync(path.join(iconsDir, "logo.svg"), path.join(root, "src", "app", "icon.svg"));
  console.log("copied src/app/apple-icon.png and src/app/icon.svg");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
