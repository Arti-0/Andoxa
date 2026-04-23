import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export const AUTH_FILE = path.join(__dirname, 'tests/.auth/user.json');

export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./tests/global-setup'),
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // ── 1. Login once and save session ──────────────────────────────
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },

    // ── 2. Authenticated flows (reuse saved session) ─────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
      testIgnore: ['**/flows/**', '**/security/**', '**/booking.spec.ts'],
    },
    {
      name: 'flows',
      testDir: './tests/flows',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },

    // ── 3. Public & security tests — no auth ────────────────────────
    {
      name: 'public',
      testMatch: ['**/booking.spec.ts', '**/security/**'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
