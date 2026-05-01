/**
 * workflow-builder.spec.ts — Create and configure a workflow
 *
 * Covers: naming, adding steps, condition branches, saving.
 * Uses the authenticated session from global-setup.
 */
import { test, expect } from '@playwright/test';

// Helper: open a shadcn/ui Select and pick an option by label
async function selectOption(
  page: import('@playwright/test').Page,
  triggerLabel: string | RegExp,
  optionLabel: string | RegExp
) {
  // Find the trigger closest to a label that matches, or the first visible trigger
  const trigger = page.getByRole('combobox').filter({ hasText: /choisir|ajouter/i }).first();
  await trigger.click();
  await page.getByRole('option', { name: optionLabel }).click();
}

test.describe('Workflow builder', () => {
  test('renders new workflow page', async ({ page }) => {
    await page.goto('/workflows/new');

    await expect(page.getByText('Nouveau parcours')).toBeVisible();
    await expect(page.getByLabel('Nom')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sauvegarder' })).toBeVisible();
  });

  test('blocks save without a name', async ({ page }) => {
    await page.goto('/workflows/new');

    // Don't fill name, click save
    await page.getByRole('button', { name: 'Sauvegarder' }).click();

    // Toast error
    await expect(page.getByText(/indiquez un nom/i)).toBeVisible({ timeout: 5_000 });
  });

  test('adds a WhatsApp message step and a wait step', async ({ page }) => {
    await page.goto('/workflows/new');

    await page.getByLabel('Nom').fill('Test parcours e2e');

    // Add Message WhatsApp step
    const addStepSelect = page.getByRole('combobox').first();
    await addStepSelect.click();
    await page.getByRole('option', { name: 'Message WhatsApp' }).click();

    // Step appears in the list
    await expect(page.getByText('Message WhatsApp').first()).toBeVisible();

    // Add Attente step
    await addStepSelect.click();
    await page.getByRole('option', { name: 'Attente' }).click();

    await expect(page.getByText('Attente').first()).toBeVisible();

    // Two steps total — both arrows visible between them
    await expect(page.locator('[aria-hidden="true"]').filter({ hasText: '' }).first()).toBeVisible();
  });

  test('saves workflow and redirects to detail page', async ({ page }) => {
    await page.goto('/workflows/new');

    await page.getByLabel('Nom').fill(`E2E workflow ${Date.now()}`);

    // Add one step so it's not empty
    const addStepSelect = page.getByRole('combobox').first();
    await addStepSelect.click();
    await page.getByRole('option', { name: 'Message WhatsApp' }).click();

    await page.getByRole('button', { name: 'Sauvegarder' }).click();

    // Should redirect to /workflows/[id]
    await expect(page).toHaveURL(/\/workflows\/[a-z0-9-]+$/, { timeout: 15_000 });
  });

  test('condition step shows OUI/NON branch editor when expanded', async ({ page }) => {
    await page.goto('/workflows/new');

    await page.getByLabel('Nom').fill('Test condition');

    // Add a Condition step
    const addStepSelect = page.getByRole('combobox').first();
    await addStepSelect.click();
    await page.getByRole('option', { name: 'Condition' }).click();

    // The condition card should appear
    await expect(page.getByText('Condition').first()).toBeVisible();
    await expect(page.getByText(/le prospect a répondu/i)).toBeVisible();

    // Click the condition card to expand branches
    await page.getByText(/le prospect a répondu/i).click();

    // OUI and NON columns should appear
    await expect(page.getByText('✓ OUI')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText('✗ NON')).toBeVisible();
  });

  test('can add steps inside OUI branch of a condition', async ({ page }) => {
    await page.goto('/workflows/new');
    await page.getByLabel('Nom').fill('Test branches');

    // Add condition
    const addStepSelect = page.getByRole('combobox').first();
    await addStepSelect.click();
    await page.getByRole('option', { name: 'Condition' }).click();

    // Expand branches
    await page.getByText(/le prospect a répondu/i).click();

    // The OUI branch has its own select — use the first branch select
    const branchSelects = page.getByRole('combobox').filter({ hasText: /ajouter une étape/i });
    await branchSelects.first().click();
    await page.getByRole('option', { name: 'Message WhatsApp' }).first().click();

    // A step appears inside OUI
    await expect(page.getByText(/configurer le message|bonjour/i).first()).toBeVisible({ timeout: 3_000 });
  });
});
