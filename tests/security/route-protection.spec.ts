/**
 * route-protection.spec.ts — Unauthenticated access
 *
 * Verifies that protected pages redirect to login when there's no session.
 * These tests intentionally have NO storageState set.
 */
import { test, expect } from '@playwright/test';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/crm',
  '/campaigns',
  '/calendar',
  '/whatsapp',
  '/settings',
  '/messagerie',
  '/prospect',
];

for (const route of PROTECTED_ROUTES) {
  test(`${route} redirects to login when unauthenticated`, async ({ page }) => {
    const response = await page.goto(route);

    // Either we're redirected to /auth/login, or the page itself shows a login UI
    await expect(page).toHaveURL(/auth\/login|\/$/, { timeout: 10_000 });

    // Additionally, the final URL should NOT be the protected route
    expect(page.url()).not.toContain(route);
  });
}

test('public booking page is accessible without auth', async ({ page }) => {
  // The /booking path itself (without a slug) should render without redirecting
  const response = await page.goto('/booking');
  expect(response?.status()).not.toBe(401);
  expect(response?.status()).not.toBe(403);

  // Should NOT redirect to login
  await expect(page).not.toHaveURL(/auth\/login/);
});
