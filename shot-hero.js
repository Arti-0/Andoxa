/**
 * shot-hero.js — Capture the dashboard for the marketing hero, then optimise it
 * into a compressed PNG (same Sharp pipeline previously used for the WebP).
 *
 *   • Wide framing 1920×1200 (16:10 — matches the hero frame, no crop)
 *   • Captured at deviceScaleFactor 2 then downscaled to 1920px with Sharp
 *     (supersampling → crisp text) and palette-compressed (small file)
 *   • Reuses an authenticated session (auth.json) — /dashboard is auth-gated
 *   • Waits for fonts + charts, hides scrollbars
 *
 * Usage:  STORAGE_STATE=auth.json node shot-hero.js
 * Env:    BASE_URL (default http://localhost:3000), STORAGE_STATE (default auth.json)
 */
const { chromium } = require("@playwright/test");
const sharp = require("sharp");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const STORAGE_STATE = process.env.STORAGE_STATE || "auth.json";
const OUT = "public/dashboard-hero.png";
const TARGET_WIDTH = 1920; // final PNG width (16:10 → 1920×1200)

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1200 }, // 16:10, matches the hero frame
    deviceScaleFactor: 2, // capture at 2× then downscale → crisp text
    storageState: STORAGE_STATE,
  });
  const page = await context.newPage();

  await page.goto(new URL("/dashboard", BASE_URL).toString(), {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  const url = page.url();
  if (/\/(auth|login|onboarding|inactive)\b/.test(url)) {
    await browser.close();
    console.error(`\n❌ Redirigé vers ${url} — session invalide. Relance login.js.\n`);
    process.exit(2);
  }

  await page.evaluate(() => document.fonts.ready);
  await page.waitForSelector("svg, canvas", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1_500);

  await page.addStyleTag({
    content:
      "*{scrollbar-width:none!important;-ms-overflow-style:none!important}*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}",
  });

  const buffer = await page.screenshot({ fullPage: false });
  await browser.close();

  // Adapt + compress: downscale 2× capture to the target width, then PNG-optimise.
  await sharp(buffer)
    .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
    .png({ quality: 90, compressionLevel: 9, effort: 10, palette: true })
    .toFile(OUT);

  const meta = await sharp(OUT).metadata();
  console.log(`\n📸 ${OUT} — ${meta.width}×${meta.height}px\n`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
