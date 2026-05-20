/**
 * Capture marketing screenshots @2x and upload to Supabase Storage.
 *
 * Usage:
 *   bun run seed:screenshots   # first time / refresh data
 *   bun run images:sync        # capture + upload
 *
 * Optional:
 *   PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
 *   SKIP_UPLOAD=1              # write PNGs to public/screenshots only
 */

import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { loadEnv } from "./lib/load-env";
import {
  installMessagerieMocks,
  MOCK_CHAT_ID,
} from "./lib/messagerie-mocks";
import {
  injectScreenshotSession,
  prepareAppChrome,
  waitForScreenshotReady,
} from "./lib/screenshot-auth";
import {
  HOMEPAGE_ASSETS_BUCKET,
  LOCAL_SCREENSHOT_DIR,
  PLAYWRIGHT_VIEWPORT,
  resolveRoute,
  SCREENSHOT_STATE_PATH,
  SCREENSHOT_TARGETS,
  type ScreenshotState,
} from "./lib/screenshot-config";

loadEnv();

const baseURL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://localhost:3000";
const skipUpload = process.env.SKIP_UPLOAD === "1";

function readState(): ScreenshotState {
  if (!fs.existsSync(SCREENSHOT_STATE_PATH)) {
    throw new Error(
      `Missing ${SCREENSHOT_STATE_PATH}. Run: bun run seed:screenshots`
    );
  }
  return JSON.parse(
    fs.readFileSync(SCREENSHOT_STATE_PATH, "utf8")
  ) as ScreenshotState;
}

function publicUrl(filename: string): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return `${url}/storage/v1/object/public/${HOMEPAGE_ASSETS_BUCKET}/${filename}`;
}

async function uploadPng(filename: string, buffer: Buffer): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.warn("  ⚠ Skipping upload — missing Supabase credentials");
    return null;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase.storage
    .from(HOMEPAGE_ASSETS_BUCKET)
    .upload(filename, buffer, {
      upsert: true,
      contentType: "image/png",
      cacheControl: "31536000",
    });

  if (error) {
    throw new Error(`Upload failed for ${filename}: ${error.message}`);
  }

  return publicUrl(filename);
}

async function copyManualAsset(filename: string): Promise<Buffer | null> {
  const localPath = path.join(LOCAL_SCREENSHOT_DIR, filename);
  if (!fs.existsSync(localPath)) {
    console.warn(
      `  ⚠ Manual asset missing: ${localPath} — add the LinkedIn extension PNG and re-run`
    );
    return null;
  }
  return fs.readFileSync(localPath);
}

async function main(): Promise<void> {
  const state = readState();
  fs.mkdirSync(LOCAL_SCREENSHOT_DIR, { recursive: true });

  console.log(`Screenshot capture → ${baseURL}`);
  console.log(`Org: ${state.orgId} (${state.email})\n`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: PLAYWRIGHT_VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: "light",
    baseURL,
  });
  const page = await context.newPage();

  await injectScreenshotSession(page);

  for (const target of SCREENSHOT_TARGETS) {
    console.log(`→ ${target.id} (${target.filename})`);

    if (target.framing === "manual") {
      const buffer = await copyManualAsset(target.filename);
      if (!buffer) continue;
      const localOut = path.join(LOCAL_SCREENSHOT_DIR, target.filename);
      fs.writeFileSync(localOut, buffer);
      console.log(`  ✓ Local: ${localOut}`);
      if (!skipUpload) {
        const url = await uploadPng(target.filename, buffer);
        if (url) console.log(`  ✓ Uploaded: ${url}`);
      }
      continue;
    }

    const route = resolveRoute(target, state);
    if (!route) {
      console.warn(`  ⚠ No route for ${target.id}, skipping`);
      continue;
    }

    if (target.mockMessagerie) {
      await installMessagerieMocks(page);
      await page.evaluate((chatId) => {
        localStorage.setItem("m2_lastChatId", chatId);
      }, MOCK_CHAT_ID);
    }

    await page.goto(route, { waitUntil: "domcontentloaded" });
    await waitForScreenshotReady(page, target.waitSelector);
    await prepareAppChrome(page);

    if (target.routeKey === "messagerie") {
      await page.waitForTimeout(1200);
    }

    let buffer: Buffer;
    if (target.framing === "main") {
      const main = page.locator("main");
      await main.waitFor({ state: "visible", timeout: 15_000 });
      buffer = await main.screenshot({ type: "png" });
    } else {
      buffer = await page.screenshot({ type: "png", fullPage: false });
    }

    const localOut = path.join(LOCAL_SCREENSHOT_DIR, target.filename);
    fs.writeFileSync(localOut, buffer);
    console.log(`  ✓ Local: ${localOut}`);

    if (!skipUpload) {
      const url = await uploadPng(target.filename, buffer);
      if (url) console.log(`  ✓ Uploaded: ${url}`);
    }
  }

  await browser.close();
  console.log("\n✓ Screenshot sync complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
