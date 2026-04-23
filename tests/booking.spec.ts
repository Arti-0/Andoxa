/**
 * booking.spec.ts — Public booking page (no auth needed)
 *
 * Uses E2E_BOOKING_SLUG env var — set it to a real slug from your account.
 * Run: E2E_BOOKING_SLUG=your-slug bunx playwright test booking.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('Public booking page', () => {
  test('shows "lien invalide" for a nonsense slug', async ({ page }) => {
    await page.goto('/booking/this-slug-does-not-exist-xyz123');

    // The page should still render (no 500) and show an error state
    await expect(page.getByText(/lien de prise de rendez-vous invalide|aucun créneau/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('renders slot picker and form for a valid slug', async ({ page }) => {
    const slug = process.env.E2E_BOOKING_SLUG;
    if (!slug) test.skip();

    await page.goto(`/booking/${slug}`);

    // Heading
    await expect(page.getByText('Prendre rendez-vous')).toBeVisible();

    // Form fields
    await expect(page.getByLabel(/nom complet/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/adresse email/i)).toBeVisible();
    await expect(page.getByLabel(/numéro de téléphone/i)).toBeVisible();

    // WhatsApp helper text
    await expect(
      page.getByText(/recevez un message whatsapp pour confirmer/i)
    ).toBeVisible();
  });

  test('shows WhatsApp helper text under phone input', async ({ page }) => {
    const slug = process.env.E2E_BOOKING_SLUG;
    if (!slug) test.skip();

    await page.goto(`/booking/${slug}`);

    await expect(
      page.getByText(/recevez un message whatsapp pour confirmer votre rendez-vous/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test('submit button is disabled until a slot is selected', async ({ page }) => {
    const slug = process.env.E2E_BOOKING_SLUG;
    if (!slug) test.skip();

    await page.goto(`/booking/${slug}`);
    await page.waitForLoadState('networkidle');

    // Fill the form but don't pick a slot
    await page.getByLabel(/nom complet/i).fill('Test Utilisateur');
    await page.getByLabel(/adresse email/i).fill('test@example.com');

    const submitBtn = page.getByRole('button', { name: /confirmer le rendez-vous/i });
    await expect(submitBtn).toBeDisabled();
  });
});
