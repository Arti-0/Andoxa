/**
 * capture-section.ts — Capture un écran de l'app pour le site vitrine, au
 * cadrage EXACT du hero (1920×944, deviceScaleFactor 2) puis passé dans la même
 * pipeline Sharp que shot-hero.js. Sortie : public/<nom>-section.png.
 *
 * Miroir d'`images:sync` (mêmes helpers : auth injectée + mocks messagerie +
 * attente data-screenshot-ready), mais au cadrage hero et avec une sortie
 * /public en PNG palette (servi `unoptimized`) au lieu du bucket. La sidebar
 * reste DÉPLIÉE (comme le hero / le CRM), donc on NE replie pas le chrome.
 *
 * Prérequis :
 *   1) bun run seed:screenshots            # données B2B fictives dans l'org démo
 *   2) le serveur de dev de la NOUVELLE app tourne (sans Workflows ni cadenas)
 *
 * Usage :
 *   bun scripts/capture-section.ts campaigns
 *   bun scripts/capture-section.ts messagerie
 *   bun scripts/capture-section.ts calendar
 *   bun scripts/capture-section.ts session
 *   bun scripts/capture-section.ts all
 *
 * Env : PLAYWRIGHT_TEST_BASE_URL (défaut http://localhost:3000)
 */
import { chromium, type Page } from "@playwright/test";
import fs from "fs";
import sharp from "sharp";
import { loadEnv } from "./lib/load-env";
import { installMessagerieMocks, MOCK_CHAT_ID } from "./lib/messagerie-mocks";
import {
  injectScreenshotSession,
  waitForScreenshotReady,
} from "./lib/screenshot-auth";
import {
  SCREENSHOT_STATE_PATH,
  type ScreenshotState,
} from "./lib/screenshot-config";

loadEnv();

const baseURL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";
const TARGET_WIDTH = 1920; // largeur finale (ratio ~2.03:1, identique au hero)

const SECTIONS = {
  campaigns: { routeKey: "campaigns", out: "public/campagnes-section.png", ready: "app" },
  messagerie: { routeKey: "messagerie", out: "public/messagerie-section.png", ready: "app", mock: true },
  calendar: { routeKey: "calendar", out: "public/calendrier-section.png", ready: "app" },
  session: { routeKey: "callSession", out: "public/session-section.png", ready: "app" },
  // Page publique de réservation (pas d'auth). Host = l'utilisateur de seed (Marie Dupont),
  // d'où l'URL ci-dessous, lue depuis le bandeau "Lien de booking" du calendrier de seed.
  booking: { path: "/booking/acme-sales/marie-dupont", out: "public/booking-section.png", ready: "public" },
} as const;

type Key = keyof typeof SECTIONS;

function readState(): ScreenshotState {
  if (!fs.existsSync(SCREENSHOT_STATE_PATH)) {
    throw new Error(
      `Manque ${SCREENSHOT_STATE_PATH}. Lance d'abord : bun run seed:screenshots`,
    );
  }
  return JSON.parse(fs.readFileSync(SCREENSHOT_STATE_PATH, "utf8")) as ScreenshotState;
}

async function captureOne(page: Page, key: Key, state: ScreenshotState): Promise<void> {
  const cfg = SECTIONS[key] as {
    routeKey?: keyof ScreenshotState["routes"];
    path?: string;
    out: string;
    ready: "app" | "public";
    mock?: boolean;
  };
  const route = cfg.path ?? state.routes[cfg.routeKey!];

  if (cfg.mock) {
    await installMessagerieMocks(page);
    await page.evaluate((chatId) => {
      localStorage.setItem("m2_lastChatId", chatId);
    }, MOCK_CHAT_ID);
  }

  await page.goto(new URL(route, baseURL).toString(), { waitUntil: "domcontentloaded" });

  const url = page.url();
  if (/\/(auth|login|onboarding|inactive)\b/.test(url)) {
    throw new Error(
      `Redirigé vers ${url} — session invalide. Relance : bun run seed:screenshots`,
    );
  }

  if (cfg.ready === "public") {
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1_200);
  } else {
    await waitForScreenshotReady(page);
    if (key === "messagerie") await page.waitForTimeout(1_200);
  }

  await page.addStyleTag({
    content:
      "*{scrollbar-width:none!important;-ms-overflow-style:none!important}*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}",
  });

  const buffer = await page.screenshot({ fullPage: false });
  await sharp(buffer)
    .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
    .png({ quality: 90, compressionLevel: 9, effort: 10, palette: true })
    .toFile(cfg.out);

  const meta = await sharp(cfg.out).metadata();
  console.log(`📸 ${cfg.out} — ${meta.width}×${meta.height}px`);
}

async function main(): Promise<void> {
  const arg = (process.argv[2] ?? "all").toLowerCase();
  const keys: Key[] =
    arg === "all" ? (Object.keys(SECTIONS) as Key[]) : [arg as Key];
  for (const k of keys) {
    if (!SECTIONS[k]) {
      throw new Error(
        `Écran inconnu : "${k}". Choix : ${Object.keys(SECTIONS).join(", ")}, all`,
      );
    }
  }

  const state = readState();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 944 }, // cadrage hero
    deviceScaleFactor: 2, // capture 2× puis downscale → texte net
    colorScheme: "light",
    baseURL,
  });
  const page = await context.newPage();
  await injectScreenshotSession(page);

  for (const k of keys) await captureOne(page, k, state);

  await browser.close();
  console.log("\n✓ Captures terminées.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
