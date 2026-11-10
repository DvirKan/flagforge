/**
 * Renders the app icons (PWA / home screen / favicon) from the brand mark: public/icons/*.png and src/app/icon.svg.
 * Uses the Playwright Chromium already installed for the e2e tests.   Usage: npm run data:icons
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const root = join(__dirname, "..");
const INK = "#172c3b";
const PARCHMENT = "#f1ebdd";
const RUST = "#c96d43";

/** The mark (36×24 plate, meridian, dashed equator, rust waypoint) centred on a square, `scale` = mark width / side. */
function iconSvg(size: number, scale: number, radius: number): string {
  const w = size * scale;
  const k = w / 36;
  const x = (size - w) / 2;
  const y = (size - 24 * k) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${PARCHMENT}"/>
  <g transform="translate(${x} ${y}) scale(${k})" fill="none" stroke="${INK}">
    <rect x="0.75" y="0.75" width="34.5" height="22.5" stroke-width="1.5"/>
    <path d="M12 0.75 C 16 8, 16 16, 12 23.25" stroke-width="1"/>
    <path d="M0.75 12 H 35.25" stroke-width="0.75" stroke-dasharray="1.5 1.5"/>
    <circle cx="25" cy="8" r="2.75" fill="${RUST}" stroke="none"/>
  </g>
</svg>`;
}

const outputs: { file: string; size: number; scale: number; radius: number }[] = [
  { file: "icon-192.png", size: 192, scale: 0.7, radius: 0 },
  { file: "icon-512.png", size: 512, scale: 0.7, radius: 0 },
  // Maskable: the OS crops to a circle/squircle, so the mark stays inside the central 80 % safe zone.
  { file: "maskable-512.png", size: 512, scale: 0.56, radius: 0 },
  { file: "apple-touch-icon.png", size: 180, scale: 0.7, radius: 0 },
];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const o of outputs) {
    await page.setViewportSize({ width: o.size, height: o.size });
    await page.setContent(`<html><body style="margin:0">${iconSvg(o.size, o.scale, o.radius)}</body></html>`);
    await page.locator("svg").screenshot({ path: join(root, "public", "icons", o.file), omitBackground: true });
    console.log(`public/icons/${o.file}`);
  }
  await browser.close();
  // Favicon: vector, rounded square so it reads on light and dark browser tabs.
  writeFileSync(join(root, "src", "app", "icon.svg"), iconSvg(64, 0.78, 14));
  console.log("src/app/icon.svg");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
