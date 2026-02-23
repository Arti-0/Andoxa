import { test, expect } from "@playwright/test";

test.describe("Stripe Subscription Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to pricing page
    await page.goto("/pricing");
  });

  test("should display correct button text for unauthenticated user", async ({
    page,
  }) => {
    // Check Essential monthly shows "14 jours gratuits"
    const essentialMonthlyButton = page
      .locator('[data-plan="Essential"]')
      .locator('[data-frequency="mensuel"]')
      .locator("button");
    await expect(essentialMonthlyButton).toContainText("14 jours gratuits");

    // Check other plans show "Commencez maintenant"
    const proButton = page
      .locator('[data-plan="Pro"]')
      .locator("button")
      .first();
    await expect(proButton).toContainText("Commencez maintenant");
  });

  test("should display correct button text for authenticated user with trial", async ({
    page,
  }) => {
    // Login first (you'll need to implement login helper)
    // await loginUser(page, "test@example.com", "password");

    // Navigate to pricing
    await page.goto("/pricing");

    // Check current plan is shown
    const currentPlanButton = page.locator("button:has-text('Plan actuel')");
    await expect(currentPlanButton).toBeVisible();

    // Check upgrade buttons show "Upgrader" or "Choisir ce plan"
    const upgradeButton = page.locator("button:has-text('Upgrader')");
    await expect(upgradeButton).toBeVisible();
  });

  test("should redirect to checkout after plan selection", async ({
    page,
  }) => {
    // Select Essential monthly plan
    await page
      .locator('[data-plan="Essential"]')
      .locator('[data-frequency="mensuel"]')
      .locator("button")
      .click();

    // Should redirect to sign-up or checkout
    await expect(page).toHaveURL(/sign-up|checkout/);
  });

  test("should update tenant.plan after successful payment", async ({
    page,
  }) => {
    // This test would require:
    // 1. Create test user
    // 2. Complete checkout with test card
    // 3. Verify webhook was called
    // 4. Verify tenant.plan was updated in database
    // 5. Verify user can access protected routes
  });

  test("should show expired message when expired=true", async ({ page }) => {
    await page.goto("/pricing?expired=true");

    const expiredAlert = page.locator("text=Votre abonnement a expiré");
    await expect(expiredAlert).toBeVisible();
  });

  test("should display correct plan info in /parametres", async ({ page }) => {
    // Login with user that has Essential plan
    // await loginUser(page, "essential@example.com", "password");

    await page.goto("/parametres");

    // Check plan name is displayed correctly (not "Starter")
    const planName = page.locator("text=Essential");
    await expect(planName).toBeVisible();

    // Check no "Starter" text appears
    const starterText = page.locator("text=Starter");
    await expect(starterText).not.toBeVisible();
  });
});
