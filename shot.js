/**
 * shot.js — Marketing screenshot of the Andoxa dashboard.
 *
 * Opens the local dashboard at deviceScaleFactor 4, waits for the page to be
 * fully ready (web fonts loaded + charts painted), hides scrollbars, then saves
 * a high-res `dashboard@4x.png` at the project root.
 *
 * Usage:
 *   node shot.js
 *   STORAGE_STATE=auth.json node shot.js   # reuse an authenticated session
 *
 * Env:
 *   BASE_URL       base origin of the running dev server (default http://localhost:3000)
 *   SHOT_PATH      dashboard path to capture (default /dashboard)
 *   STORAGE_STATE  Playwright storageState JSON (cookies) for an authed session
 *
 * Note: /dashboard is auth-gated (see src/proxy.ts). Without a valid session the
 * script detects the redirect to /auth/login and aborts instead of saving it.
 */
const path = require("path");
const { chromium } = require("@playwright/test");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const SHOT_PATH = process.env.SHOT_PATH || "/dashboard";
const OUT = path.join(__dirname, "dashboard@4x.png");
const STORAGE_STATE = process.env.STORAGE_STATE || undefined;

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 4,
    ...(STORAGE_STATE ? { storageState: STORAGE_STATE } : {}),
  });
  const page = await context.newPage();

  const target = new URL(SHOT_PATH, BASE_URL).toString();
  await page.goto(target, { waitUntil: "networkidle", timeout: 60_000 });

  // Guard: never save a misleading screenshot of the login / onboarding page.
  const finalUrl = page.url();
  if (/\/(auth|login|onboarding|inactive)\b/.test(finalUrl)) {
    await browser.close();
    console.error(
      `\n❌ Pas de capture : redirigé vers ${finalUrl}\n` +
        `   /dashboard exige une session authentifiée. Fournis un STORAGE_STATE\n` +
        `   (cookies d'une session connectée) puis relance : STORAGE_STATE=auth.json node shot.js\n`,
    );
    process.exit(2);
  }

  // Wait for everything that affects the visual: fonts + charts + a settle frame.
  await page.evaluate(() => document.fonts.ready);
  await page
    .waitForSelector("svg, canvas", { timeout: 15_000 })
    .catch(() => {});
  await page.waitForTimeout(1_500); // let chart entry animations finish

  // Hide scrollbars so they never show up in the capture.
  await page.addStyleTag({
    content:
      "*{scrollbar-width:none!important;-ms-overflow-style:none!important}*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}",
  });

  await page.screenshot({ path: OUT, fullPage: true });
  await browser.close();
  console.log(`\n✅ Capture enregistrée : ${OUT}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
