import { test, expect } from "@playwright/test";

/**
 * Read-only smoke: confirms the authenticated session works and the campaign +
 * dashboard surfaces render, without creating any data (safe against the shared
 * dev/prod database). Temporary harness validation — not a coverage test.
 */

test("campaigns list renders for an authenticated user", async ({ page }) => {
  await page.goto("/campaigns");
  // Must not bounce to the login page (session is valid).
  await expect(page).toHaveURL(/\/campaigns/);
  await expect(page).not.toHaveURL(/\/auth\/login/);
  await expect(page.locator("body")).toBeVisible();
});

test("dashboard renders the LinkedIn limits card", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).not.toHaveURL(/\/auth\/login/);
  // The reworked card's title (see LinkedInQuotasCard).
  await expect(
    page.getByText(/Limites LinkedIn|Quotas LinkedIn/i).first(),
  ).toBeVisible({ timeout: 20_000 });
});
