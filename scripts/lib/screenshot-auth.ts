import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import {
  SCREENSHOT_USER_EMAIL,
  SCREENSHOT_USER_PASSWORD,
} from "./screenshot-config";

export async function injectScreenshotSession(page: Page): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const client = createClient(url, anonKey);
  const { data, error } = await client.auth.signInWithPassword({
    email: SCREENSHOT_USER_EMAIL,
    password: SCREENSHOT_USER_PASSWORD,
  });

  if (error || !data.session) {
    throw new Error(
      `Screenshot auth failed — ${error?.message ?? "no session"}. Run: bun run seed:screenshots`
    );
  }

  const projectRef = url.replace("https://", "").split(".")[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const { access_token, refresh_token, expires_at } = data.session;

  await page.goto("/");
  await page.evaluate(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
      localStorage.setItem("theme", "light");
    },
    {
      key: storageKey,
      session: {
        access_token,
        refresh_token,
        expires_at,
        token_type: "bearer",
      },
    }
  );

  await page.emulateMedia({ colorScheme: "light" });
}

/** Collapse sidebar + hide transient banners before capture. */
export async function prepareAppChrome(page: Page): Promise<void> {
  const collapse = page.getByRole("button", {
    name: "Réduire la barre latérale",
  });
  if (await collapse.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await collapse.click();
    await page.waitForTimeout(300);
  }
}

export async function waitForScreenshotReady(
  page: Page,
  selector = '[data-screenshot-ready="true"]',
  timeout = 45_000
): Promise<void> {
  await page.waitForSelector(selector, { state: "attached", timeout });
  await page.waitForTimeout(800);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(
    () => undefined
  );
}
