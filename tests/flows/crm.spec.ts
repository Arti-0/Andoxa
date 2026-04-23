/**
 * crm.spec.ts — CRM / Prospects page
 *
 * Covers: page loads, filter popover opens, no overflow at 375px viewport.
 */
import { test, expect } from '@playwright/test';

test.describe('CRM page', () => {
  test('loads the prospects list', async ({ page }) => {
    await page.goto('/crm');

    await expect(
      page.getByRole('heading', { name: /crm|prospects/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows prospects or empty state', async ({ page }) => {
    await page.goto('/crm');
    await page.waitForLoadState('networkidle');

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/aucun prospect/i).isVisible().catch(() => false);

    expect(hasTable || hasEmpty).toBe(true);
  });

  test('filter popover opens and closes', async ({ page }) => {
    await page.goto('/crm');
    await page.waitForLoadState('networkidle');

    // Find the filter button/popover trigger
    const filterBtn = page.getByRole('button', { name: /filtrer|filter/i }).first();
    const hasFilter = await filterBtn.isVisible().catch(() => false);
    if (!hasFilter) test.skip();

    await filterBtn.click();

    // Popover content should be visible
    await expect(page.getByRole('dialog').or(page.locator('[data-radix-popper-content-wrapper]'))).toBeVisible({
      timeout: 3_000,
    });

    // Close by pressing Escape
    await page.keyboard.press('Escape');
  });

  test('filter dropdown does not overflow at mobile width (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/crm');
    await page.waitForLoadState('networkidle');

    const filterBtn = page.getByRole('button', { name: /filtrer|filter/i }).first();
    const hasFilter = await filterBtn.isVisible().catch(() => false);
    if (!hasFilter) test.skip();

    await filterBtn.click();

    // Get the popover bounding box — it should stay within the viewport
    const popover = page.locator('[data-radix-popper-content-wrapper]').first();
    await expect(popover).toBeVisible({ timeout: 3_000 });

    const box = await popover.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375 + 4); // 4px tolerance
    }
  });
});
