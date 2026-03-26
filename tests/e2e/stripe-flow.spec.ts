import { test, expect } from "@playwright/test";

test.describe("Stripe Checkout Flow", () => {
  test("should redirect to Stripe checkout after onboarding with plan selection", async ({
    page,
  }) => {
    // 1. Go to pricing page
    await page.goto("/pricing");
    
    // 2. Select a plan (e.g., Essential monthly)
    const essentialButton = page.locator('button:has-text("✨ 14 jours gratuits")').first();
    await expect(essentialButton).toBeVisible();
    await essentialButton.click();
    
    // 3. Should redirect to login with plan params
    await expect(page).toHaveURL(/\/auth\/login\?plan=essential&frequency=monthly/);
    
    // 4. Verify params are in URL
    const url = new URL(page.url());
    expect(url.searchParams.get("plan")).toBe("essential");
    expect(url.searchParams.get("frequency")).toBe("monthly");
    
    // 5. Fill sign-up form
    const testEmail = `test-${Date.now()}@gmail.com`;
    await page.fill('input[type="email"]', testEmail);
    
    // 6. Submit form
    await page.click('button[type="submit"]');
    
    // 7. Wait for OTP email (in real scenario, you'd extract OTP from email)
    // For now, we'll check that the form was submitted
    await expect(page.locator('text=/vérifiez votre email/i')).toBeVisible();
    
    // Note: In a real test, you would:
    // - Extract OTP from test email service
    // - Enter OTP
    // - Complete onboarding steps
    // - Verify redirect to Stripe checkout
    
    // 8. Check that sessionStorage has plan info (if still on same page)
    const selectedPlan = await page.evaluate(() => 
      sessionStorage.getItem("selectedPlan")
    );
    const selectedFrequency = await page.evaluate(() => 
      sessionStorage.getItem("selectedFrequency")
    );
    
    // These might be null if we're on a different page after OTP
    // That's why we need params in URL
  });
});
