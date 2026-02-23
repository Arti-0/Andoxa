import { test, expect } from "@playwright/test";

/**
 * Authentication & Authorization E2E Tests
 * 
 * Tests authentication and multi-tenancy security
 */

test.describe("Authentication & Authorization", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    // Try to access protected route
    await page.goto("/dashboard");
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*auth\/login/);
  });

  test.skip("should block API access without authentication", async ({ request }) => {
    // Try to access protected API
    const response = await request.get("/api/evenements");
    
    // Should return 401
    expect(response.status()).toBe(401);
  });

  test.skip("should isolate data between tenants", async ({ page }) => {
    // This test requires two test users from different tenants
    // Login as User A
    // Create data
    // Login as User B
    // Verify User B cannot see User A's data
  });

  test("login page should be accessible", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

