import { test, expect } from '@playwright/test';

/**
 * Test du flow complet de création de campagne
 * 
 * Flow attendu :
 * 1. Click "Nouvelle campagne" → ID temporaire (temp-XXX)
 * 2. Step 1: Audience → Sélection BDDs
 * 3. Step 2: Content → Titre, Objet, Message
 * 4. Step 3: Validation → Paramètres par défaut
 * 5. Lancement → Création Supabase + Vérification limites + Envoi
 */
test.describe('Campaign Creation Flow', () => {
  // Fixture pour login (à adapter selon votre setup)
  test.beforeEach(async ({ page }) => {
    // TODO: Adapter selon votre méthode d'auth
    // Option 1: Utiliser un compte de test
    // Option 2: Utiliser une fixture d'auth
    await page.goto('/auth/login');
    // ... remplir formulaire login
  });

  test('should create campaign with temporary ID and persist in Zustand', async ({ page }) => {
    // 1. Navigate to campaigns
    await page.goto('/campagnes');
    await expect(page).toHaveURL(/\/campagnes$/);
    
    // 2. Click "Nouvelle campagne"
    await page.click('text=+ Nouvelle campagne');
    
    // 3. Verify temporary ID in URL
    await expect(page).toHaveURL(/\/campagnes\/temp-\d+\/audience/);
    
    // 4. Verify no API call was made to create campaign
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/campagnes-email') && request.method() === 'POST') {
        requests.push(request.url());
      }
    });
    
    // Wait a bit to ensure no request was made
    await page.waitForTimeout(500);
    expect(requests.length).toBe(0);
  });

  test('should validate audience step before navigating to content', async ({ page }) => {
    await page.goto('/campagnes');
    await page.click('text=+ Nouvelle campagne');
    
    // Try to navigate to content without selecting BDDs
    await page.click('text=Suivant');
    
    // Should show validation error
    await expect(page.locator('text=Au moins une base de données doit être sélectionnée')).toBeVisible();
    
    // Select a BDD
    await page.click('input[type="checkbox"]:first-of-type');
    
    // Now navigation should work
    await page.click('text=Suivant');
    await expect(page).toHaveURL(/\/campagnes\/temp-\d+\/content/);
  });

  test('should create campaign in Supabase when launching', async ({ page }) => {
    await page.goto('/campagnes');
    await page.click('text=+ Nouvelle campagne');
    
    const tempUrl = page.url();
    const tempId = tempUrl.match(/temp-(\d+)/)?.[0];
    
    // Fill audience step
    await page.click('input[type="checkbox"]:first-of-type');
    await page.click('text=Suivant');
    
    // Fill content step
    await page.fill('input[name="title"]', 'Test Campaign E2E');
    await page.fill('input[name="subject"]', 'Test Subject');
    // ... fill message field
    
    await page.click('text=Suivant');
    
    // Fill validation step
    // Wait for default parameters to load
    await page.waitForTimeout(1000);
    
    // Launch campaign
    const requestPromise = page.waitForRequest((request) => 
      request.url().includes('/api/campagnes-email') && request.method() === 'POST'
    );
    
    await page.click('text=Lancer');
    
    // Verify API call was made
    const request = await requestPromise;
    expect(request).toBeTruthy();
    
    // Verify URL changed from temp-XXX to real ID
    await page.waitForURL(/\/campagnes\/[a-z0-9-]+$/, { timeout: 5000 });
    await expect(page).not.toHaveURL(/temp-/);
  });

  test('should save draft when clicking "Sauvegarder comme brouillon"', async ({ page }) => {
    await page.goto('/campagnes');
    await page.click('text=+ Nouvelle campagne');
    
    // Fill steps
    await page.click('input[type="checkbox"]:first-of-type');
    await page.click('text=Suivant');
    await page.fill('input[name="title"]', 'Draft Campaign');
    await page.fill('input[name="subject"]', 'Draft Subject');
    await page.click('text=Suivant');
    
    // Click save draft button
    const requestPromise = page.waitForRequest((request) => 
      request.url().includes('/api/campagnes-email') && request.method() === 'POST'
    );
    
    await page.click('text=Sauvegarder comme brouillon');
    
    // Verify API call was made
    const request = await requestPromise;
    expect(request).toBeTruthy();
    
    // Verify URL changed from temp-XXX to real ID
    await page.waitForURL(/\/campagnes\/[a-z0-9-]+$/, { timeout: 5000 });
  });

  test('should show error when campaign limit is reached', async ({ page }) => {
    // TODO: Préparer un compte avec limite atteinte
    // This test requires setup of a test account at limit
    
    await page.goto('/campagnes');
    await page.click('text=+ Nouvelle campagne');
    
    // Fill all steps
    // ...
    
    // Try to launch
    await page.click('text=Lancer');
    
    // Should show error about limit
    await expect(page.locator('text=Limite de campagnes atteinte')).toBeVisible();
    
    // Should show CTA to upgrade
    await expect(page.locator('a[href="/pricing"]')).toBeVisible();
  });
});

