/**
 * settings.spec.ts — Settings page
 *
 * Covers: page loads, availability section, org logo upload button.
 */
import { test, expect } from '@playwright/test';

test.describe('Settings page', () => {
  test('loads the settings page', async ({ page }) => {
    await page.goto('/settings');

    await expect(
      page.getByRole('heading', { name: /paramètres|settings/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('availability section is visible in account tab', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Click the "Compte" or "Mon compte" tab if tabs exist
    const compteTab = page.getByRole('tab', { name: /compte/i });
    const hasTab = await compteTab.isVisible().catch(() => false);
    if (hasTab) await compteTab.click();

    // Availability section heading
    await expect(
      page.getByText(/disponibilité|availability/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // Day toggles (Mon-Sun)
    await expect(page.getByText('Lun').first()).toBeVisible();
    await expect(page.getByText('Ven').first()).toBeVisible();
  });

  test('org logo upload button is visible', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Click Organisation tab if tabs exist
    const orgTab = page.getByRole('tab', { name: /organisation|workspace/i });
    const hasTab = await orgTab.isVisible().catch(() => false);
    if (hasTab) await orgTab.click();

    // The camera icon button or avatar area for logo upload
    await expect(
      page.getByRole('button', { name: /logo|photo|modifier/i })
        .or(page.locator('[aria-label*="logo"]'))
        .first()
    ).toBeVisible({ timeout: 5_000 });
  });
});
