/**
 * auth.spec.ts — Login page (no auth state)
 *
 * These tests do NOT use the saved session — they test the login page itself.
 */
import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('renders the form', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuer' })).toBeVisible();
  });

  test('shows an error for empty password (< 8 chars)', async ({ page }) => {
    await page.goto('/auth/login');

    await page.getByLabel('E-mail').fill('test@example.com');
    await page.getByLabel('Mot de passe').fill('short');
    await page.getByRole('button', { name: 'Continuer' }).click();

    // Sonner toast or inline error should appear
    await expect(page.getByText(/au moins 8 caractères/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test('shows an error for wrong credentials', async ({ page }) => {
    await page.goto('/auth/login');

    await page.getByLabel('E-mail').fill('nobody@nowhere.invalid');
    await page.getByLabel('Mot de passe').fill('wrongpassword1234');
    await page.getByRole('button', { name: 'Continuer' }).click();

    // Either "Mot de passe incorrect" or the translated Supabase error
    await expect(
      page.getByText(/mot de passe incorrect|identifiants invalides|incorrect/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test('redirects to /dashboard after successful login', async ({ page }) => {
    const email = process.env.E2E_EMAIL!;
    const password = process.env.E2E_PASSWORD!;
    if (!email || !password) test.skip();

    await page.goto('/auth/login');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Mot de passe').fill(password);
    await page.getByRole('button', { name: 'Continuer' }).click();

    await expect(page).toHaveURL(/\/(dashboard|whatsapp|crm|calendar)/, {
      timeout: 15_000,
    });
  });
});
