import { test, expect } from "@playwright/test";

/**
 * Data Tables E2E Tests
 * 
 * Tests the data table components:
 * - Campaigns table
 * - Prospects table
 * - Responsiveness
 * - Pagination (15 rows per page)
 */

test.describe("Data Tables", () => {
  test.skip("campaigns table should display 15 rows per page", async ({ page }) => {
    await page.goto("/campagnes");
    
    // Wait for table to load
    await page.waitForSelector("table");
    
    // Count visible rows (excluding header)
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    
    expect(count).toBeLessThanOrEqual(15);
  });

  test.skip("prospects table should display 15 rows per page", async ({ page }) => {
    await page.goto("/prospects");
    
    // Wait for table to load
    await page.waitForSelector("table");
    
    // Count visible rows
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    
    expect(count).toBeLessThanOrEqual(15);
  });

  test.skip("prospects table should not have fixed columns", async ({ page }) => {
    await page.goto("/prospects");
    
    // Check for sticky/fixed column styles
    const firstColumn = page.locator("table thead th").first();
    const classes = await firstColumn.getAttribute("class");
    
    // Should not contain sticky or fixed positioning
    expect(classes).not.toContain("sticky");
  });

  test.skip("tables should be responsive", async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/campagnes");
    
    // Verify table is scrollable or adapts to mobile
    const table = page.locator("table");
    await expect(table).toBeVisible();
  });
});

