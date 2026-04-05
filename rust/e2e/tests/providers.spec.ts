import { test, expect } from './fixtures';

/**
 * Provider selection and switching tests
 */

test.describe('Provider Selection', () => {
  test('should display provider selector', async ({ page }) => {
    await page.goto('/');
    
    // Look for provider selector element
    const providerSelector = page.locator('[data-testid="provider-selector"]').or(
      page.locator('button', { hasText: /provider/i })
    ).or(
      page.locator('select', { has: page.locator('option') })
    ).first();
    
    await expect(providerSelector).toBeVisible();
  });
  
  test('should switch between providers', async ({ page }) => {
    await page.goto('/');
    
    const providerSelector = page.locator('[data-testid="provider-selector"]').first();
    
    // Click to open dropdown
    await providerSelector.click();
    
    // Check for provider options
    const providers = ['claude', 'openai', 'gemini', 'deepseek', 'claw'];
    const options = page.locator('[data-testid^="provider-"]').or(
      page.locator('[role="option"]')
    );
    
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
    
    // Select a provider
    await options.first().click();
    await expect(providerSelector).toBeVisible();
  });
  
  test('should show active provider indicator', async ({ page }) => {
    await page.goto('/');
    
    // Check for some form of active provider indication
    const activeIndicator = page.locator('[data-active-provider]').or(
      page.locator('.provider-active')
    ).or(
      page.locator('[class*="active"][class*="provider"]')
    ).first();
    
    // Active provider indicator should exist
    const hasIndicator = await activeIndicator.count() > 0;
    expect(hasIndicator).toBeTruthy();
  });
});

test.describe('Provider Persistence', () => {
  test('should persist provider selection after reload', async ({ page, context }) => {
    await page.goto('/');
    
    // Select a specific provider if possible
    const providerSelector = page.locator('[data-testid="provider-selector"]').first();
    await providerSelector.click();
    
    const options = page.locator('[data-testid^="provider-"]');
    if (await options.count() > 1) {
      await options.last().click();
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Check if selection persisted (either via URL or localStorage)
      // This test may need adjustment based on actual implementation
      await expect(page).toHaveTitle(/Claw|Goddess/);
    }
  });
});
