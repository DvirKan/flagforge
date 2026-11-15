/**
 * Renders the link-preview image (Open Graph, 1200×630) shown when someone shares a FLAGFORGE link on WhatsApp,
 * Facebook, X, Telegram…: public/og.png. Real flags from the dataset, the site's font and colours.
 * Uses the Playwright Chromium installed for the e2e tests.   Usage: npm run data:og
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const root = join(__dirname, "..");
const flags = JSON.parse(readFileSync(join(root, "src", "server", "data", "flags.json"), "utf8")) as Record<string, string>;
const font = (name: string) =>
  readFileSync(join(root, "node_modules", "@fontsource-variable", "rubik", "files", name)).toString("base64");

// The same loose "fan" as the home page — decorative, and none of them is a daily answer hint.
const CARDS = [
  { iso: "BR", rotate: -9, x: 40, y: 150, w: 300 },
  { iso: "JP", rotate: 7, x: 300, y: 70, w: 270 },
  { iso: "KE", rotate: -3, x: 170, y: 290, w: 310 },
  { iso: "SE", rotate: 11, x: 360, y: 330, w: 240 },
];

const svgUri = (iso: string) => `data:image/svg+xml;base64,${Buffer.from(flags[iso] ?? "").toString("base64")}`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Rubik; src: url(data:font/woff2;base64,${font("rubik-latin-wght-normal.woff2")}) format("woff2"); font-weight: 300 900; }
@font-face { font-family: Rubik; src: url(data:font/woff2;base64,${font("rubik-hebrew-wght-normal.woff2")}) format("woff2"); font-weight: 300 900; unicode-range: U+0590-05FF; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #f1ebdd; font-family: Rubik, sans-serif; color: #172c3b; position: relative; overflow: hidden; }
.fan { position: absolute; left: 0; top: 0; width: 640px; height: 630px; }
.card { position: absolute; background: #faf8f2; padding: 10px; border-radius: 16px;
        box-shadow: 0 2px 4px rgb(23 44 59 / .08), 0 18px 40px -16px rgb(23 44 59 / .35); }
.card img { display: block; width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: 10px; }
.text { position: absolute; right: 60px; top: 0; bottom: 0; width: 540px; display: flex; flex-direction: column; justify-content: center; }
.brand { font-weight: 700; letter-spacing: 6px; font-size: 30px; display: flex; align-items: center; gap: 16px; }
.brand i { width: 22px; height: 22px; border-radius: 50%; background: ${"#c96d43"}; display: inline-block; }
h1 { font-size: 62px; line-height: 1.05; font-weight: 700; margin-top: 30px; }
.he { direction: rtl; text-align: left; font-size: 34px; font-weight: 600; margin-top: 20px; color: #2b4253; white-space: nowrap; }
.sub { margin-top: 26px; font-size: 24px; color: #5b666d; white-space: nowrap; }
.sub.rtl { direction: rtl; text-align: left; margin-top: 6px; }
</style></head><body>
<div class="fan">${CARDS.map((c) => `<div class="card" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;transform:rotate(${c.rotate}deg)"><img src="${svgUri(c.iso)}"></div>`).join("")}</div>
<div class="text">
  <div class="brand"><i></i>FLAGFORGE</div>
  <h1>How many flags do you really know?</h1>
  <p class="he">כמה דגלים אתם באמת מכירים?</p>
  <p class="sub">5 flags a day · the same for everyone</p>
  <p class="sub rtl">5 דגלים ביום · אותם דגלים לכולם</p>
</div>
</body></html>`;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(root, "public", "og.png") });
  await browser.close();
  console.log("public/og.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
