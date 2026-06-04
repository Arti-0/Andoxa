/**
 * login.js — Capture an authenticated Andoxa session for screenshots.
 *
 * Logs in via /auth/login (email + password) and saves the session cookies to
 * `auth.json`, which shot.js then reuses (STORAGE_STATE=auth.json).
 *
 * Credentials are read from env (never hard-coded):
 *   DEMO_EMAIL=...  DEMO_PASSWORD=...  node login.js
 *
 * Env:
 *   BASE_URL   base origin of the running dev server (default http://localhost:3000)
 */
const path = require("path");
const { chromium } = require("@playwright/test");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.DEMO_EMAIL;
const PASSWORD = process.env.DEMO_PASSWORD;
const OUT = path.join(__dirname, "auth.json");

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error(
      "\n❌ Définis DEMO_EMAIL et DEMO_PASSWORD avant de lancer ce script.\n" +
        "   Ex : DEMO_EMAIL=toi@andoxa.fr DEMO_PASSWORD='...' node login.js\n",
    );
    process.exit(1);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(new URL("/auth/login", BASE_URL).toString(), {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  await page.fill("#auth-email", EMAIL);
  await page.fill("#auth-password", PASSWORD);
  await page.click('button[type="submit"]');

  // Success = we leave /auth/* (dashboard, onboarding, success, ...).
  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/"), {
      timeout: 30_000,
    });
  } catch {
    await browser.close();
    console.error(
      "\n❌ Connexion échouée — toujours sur /auth/login. Vérifie l'email / le mot de passe.\n",
    );
    process.exit(2);
  }

  await context.storageState({ path: OUT });
  const landed = page.url();
  await browser.close();
  console.log(`\n✅ Session enregistrée : ${OUT}\n   (arrivé sur ${landed})\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
