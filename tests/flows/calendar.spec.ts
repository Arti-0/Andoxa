/**
 * calendar.spec.ts — Calendar page
 *
 * Covers: loads, stat cards, create-event modal, Google banner when disconnected.
 */
import { test, expect } from '@playwright/test';

test.describe('Calendar page', () => {
  test('renders the calendar and stat cards', async ({ page }) => {
    await page.goto('/calendar');

    await expect(page.getByRole('heading', { name: /calendrier/i })).toBeVisible({
      timeout: 10_000,
    });

    // Three stat cards
    await expect(page.getByText("À venir")).toBeVisible();
    await expect(page.getByText("Passés")).toBeVisible();
    await expect(page.getByText("Aujourd'hui")).toBeVisible();
  });

  test('create-event modal opens on button click', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /créer un événement|créer/i }).first().click();

    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByRole('dialog').getByLabel(/titre/i)).toBeVisible();
    await expect(page.getByRole('dialog').getByLabel(/début/i)).toBeVisible();
    await expect(page.getByRole('dialog').getByLabel(/fin/i)).toBeVisible();
  });

  test('create-event modal has Google Meet toggle and attendees field', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /créer un événement|créer/i }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Attendees input
    await expect(dialog.getByLabel(/invités/i)).toBeVisible();

    // Google Meet toggle
    await expect(dialog.getByText(/visio google meet/i)).toBeVisible();
    await expect(dialog.getByRole('switch')).toBeVisible();
  });

  test('create-event modal closes on Annuler', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /créer un événement|créer/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: 'Annuler' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 });
  });

  test('booking link copy button is visible', async ({ page }) => {
    await page.goto('/calendar');

    await expect(
      page.getByRole('button', { name: /copier le lien/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('shows Google Calendar connect banner when not connected', async ({ page }) => {
    // Mock the Google calendar endpoint to return connected: false
    await page.route('**/api/google/calendar/events**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [], connected: false } }),
      });
    });

    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText(/connecter google agenda/i)
    ).toBeVisible({ timeout: 5_000 });

    await expect(
      page.getByRole('link', { name: /connecter/i })
    ).toBeVisible();
  });
});
