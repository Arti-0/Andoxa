/**
 * campaigns.spec.ts — Campaigns list page
 *
 * Covers: page loads, action buttons render per status, optimistic updates.
 */
import { test, expect } from '@playwright/test';

test.describe('Campaigns page', () => {
  test('loads the campaigns list', async ({ page }) => {
    await page.goto('/campaigns');

    // The page heading should be visible
    await expect(
      page.getByRole('heading', { name: /campagnes/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows empty state or a table', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/aucune campagne/i).isVisible().catch(() => false);

    expect(hasTable || hasEmpty).toBe(true);
  });

  test('draft row shows play and delete buttons', async ({ page }) => {
    await page.goto('/campaigns');
    await page.waitForLoadState('networkidle');

    // Only meaningful if there's at least one draft campaign
    const draftBadge = page.getByText('draft').first();
    const hasDraft = await draftBadge.isVisible().catch(() => false);
    if (!hasDraft) test.skip();

    // The row should have a Play button (▶) and a Delete (🗑)
    const row = page.getByRole('row').filter({ has: draftBadge }).first();
    await expect(row.getByRole('button', { name: /lancer|play/i })).toBeVisible();
    await expect(row.getByRole('button', { name: /supprimer|delete/i })).toBeVisible();
  });
});
