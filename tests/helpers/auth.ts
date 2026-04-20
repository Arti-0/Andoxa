/**
 * Playwright auth fixture — logs in a seeded test user once per worker and stores session.
 *
 * Uses Supabase signInWithPassword (email/password) rather than UI-driven login.
 * The session is injected into localStorage so all subsequent pages are authenticated.
 */

import { test as base, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
)!;

export const TEST_EMAIL = process.env.ANDOXA_TEST_EMAIL ?? "test@andoxa.dev";
export const TEST_PASSWORD =
  process.env.ANDOXA_TEST_PASSWORD ?? "AndoxaTest2026!";
export const TEST_ORG_ID =
  process.env.ANDOXA_TEST_ORG_ID ?? "00000000-0000-0000-0000-000000000001";

/** Inject a Supabase session into the browser page's localStorage */
async function injectSupabaseSession(page: Page) {
  // Use the anon key for client-side auth (service role should not go to the browser)
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(SUPABASE_URL, anonKey);

  const { data, error } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error || !data.session) {
    throw new Error(`Auth fixture: login failed — ${error?.message ?? "no session"}`);
  }

  const { access_token, refresh_token, expires_at } = data.session;

  // Supabase stores its session under a key like `sb-<project-ref>-auth-token`
  const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0];
  const storageKey = `sb-${projectRef}-auth-token`;

  await page.goto("/");
  await page.evaluate(
    ({ key, session }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          token_type: "bearer",
        })
      );
    },
    { key: storageKey, session: { access_token, refresh_token, expires_at } }
  );
}

export type AuthFixtures = {
  authedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    await injectSupabaseSession(page);
    await use(page);
  },
});

export { expect } from "@playwright/test";
