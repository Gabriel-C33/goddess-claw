import { test, expect } from './fixtures';

/**
 * @smoke Suite of smoke tests for basic application functionality
 * These tests verify the core features are working
 */

test.describe('@smoke App Load', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // Verify page loads without errors
    await expect(page).toHaveTitle(/Claw|Goddess/);
    
    // Check main container exists
    const mainContainer = page.locator('#root, main, .app, [data-testid="app"]').first();
    await expect(mainContainer).toBeVisible();
  });
  
  test('should display chat interface', async ({ page }) => {
    await page.goto('/');
    
    // Check for input area
    const input = page.locator('textarea, input[type="text"]').first();
    await expect(input).toBeVisible();
    
    // Check for send button or enter functionality
    const submitBtn = page.locator('button[type="submit"], [data-testid="send-button"]');
    if (await submitBtn.isVisible().catch(() => false)) {
      await expect(submitBtn).toBeEnabled();
    }
  });
});

test.describe('@smoke Chat Functionality', () => {
  test('should display user message after sending', async ({ page }) => {
    await page.goto('/');
    
    const message = 'Hello, this is a test message';
    const input = page.locator('textarea').or(page.locator('input[type="text"]')).first();
    
    await input.fill(message);
    await input.press('Enter');
    
    // Verify message appears
    const userMessage = page.locator(`text=${message}`);
    await expect(userMessage).toBeVisible();
  });
  
  test('should handle empty messages gracefully', async ({ page }) => {
    await page.goto('/');
    
    const input = page.locator('textarea').or(page.locator('input[type="text"]')).first();
    await input.press('Enter');
    
    // Should not crash or show error
    await expect(page).toHaveTitle(/Claw|Goddess/);
  });
});

test.describe('@smoke Responsive Design', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check main elements are visible
    const input = page.locator('textarea').or(page.locator('input[type="text"]')).first();
    await expect(input).toBeVisible();
    
    // Verify no horizontal overflow
    const html = await page.locator('html').evaluate(el => el.scrollWidth);
    const viewport = await page.viewportSize();
    expect(html).toBeLessThanOrEqual(viewport?.width || 375);
  });
});

test.describe('@smoke WebSocket Connection', () => {
  test('should establish WebSocket connection', async ({ page }) => {
    // Listen for errors
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('requestfailed', req => errors.push(req.url()));
    
    await page.goto('/');
    
    // Wait a moment for WebSocket to attempt connection
    await page.waitForTimeout(2000);
    
    // Check for WebSocket errors
    const wsErrors = errors.filter(e => e.includes('websocket') || e.includes('ws:'));
    expect(wsErrors).toHaveLength(0);
  });
});
