/**
 * global-setup.ts
 * Runs once before all tests. Logs in and saves the session cookie so every
 * authenticated test starts already signed in (no repeated login cost).
 *
 * Usage: set E2E_EMAIL and E2E_PASSWORD in a .env.test file (gitignored).
 */
import { chromium, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

export default async function globalSetup() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E_EMAIL and E2E_PASSWORD must be set. Add them to a .env.test file.'
    );
  }

  // Ensure the .auth directory exists
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('/auth/login');

  // Fill the form
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Continuer' }).click();

  // Wait until we land somewhere past the login page
  await expect(page).toHaveURL(/\/(dashboard|whatsapp|crm|calendar|prospect)/, {
    timeout: 15_000,
  });

  // Persist cookies + localStorage so tests can reuse this session
  await page.context().storageState({ path: AUTH_FILE });

  await browser.close();
}
