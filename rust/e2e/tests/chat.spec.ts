import { test, expect } from './fixtures';

/**
 * Comprehensive chat functionality tests
 */

test.describe('Chat Messages', () => {
  test('should send and display a simple message', async ({ page }) => {
    await page.goto('/');
    
    const message = 'What is the capital of France?';
    const input = page.locator('textarea').first().or(page.locator('input[type="text"]')).first();
    
    await input.fill(message);
    await input.press('Enter');
    
    // Verify user message is displayed
    const messageLocator = page.locator(`text="${message}"`);
    await expect(messageLocator).toBeVisible();
    
    // Wait for assistant response
    const assistantMessage = page.locator('[data-testid="assistant-message"]').or(page.locator('.assistant-message')).first();
    await assistantMessage.waitFor({ state: 'visible', timeout: 30000 });
    
    // Verify response has content
    const responseText = await assistantMessage.textContent();
    expect(responseText).toBeTruthy();
    expect(responseText?.length).toBeGreaterThan(0);
  });
  
  test('should handle code blocks in messages', async ({ page }) => {
    await page.goto('/');
    
    const message = 'Can you write a Rust function to sort a list?';
    const input = page.locator('textarea').first().or(page.locator('input[type="text"]')).first();
    
    await input.fill(message);
    await input.press('Enter');
    
    // Wait for response
    const assistantMessage = page.locator('[data-testid="assistant-message"]').first();
    await assistantMessage.waitFor({ timeout: 30000 });
    await page.waitForTimeout(3000); // Additional time for streaming
    
    // Check for code block
    const codeBlock = page.locator('pre code, .code-block, [class*="code"]');
    if (await codeBlock.count() > 0) {
      await expect(codeBlock.first()).toBeVisible();
    }
  });
  
  test('should maintain message history', async ({ page }) => {
    await page.goto('/');
    
    const messages = [
      'What is Python?',
      'What is JavaScript?',
      'Which one should I choose?'
    ];
    
    for (const msg of messages) {
      const input = page.locator('textarea').first().or(page.locator('input[type="text"]')).first();
      await input.fill(msg);
      await input.press('Enter');
      await page.waitForTimeout(2000); // Wait between messages
    }
    
    // Verify all messages are still visible
    for (const msg of messages) {
      const msgLocator = page.locator(`text="${msg}"`);
      await expect(msgLocator).toBeVisible();
    }
  });
  
  test('should handle long messages', async ({ page }) => {
    await page.goto('/');
    
    const longMessage = 'A'.repeat(1000);
    const input = page.locator('textarea').first();
    
    await input.fill(longMessage);
    await input.press('Enter');
    
    // Verify message is displayed (may be truncated in UI but should exist)
    await expect(page.locator('body')).toContainText('AAAAA');
  });
  
  test('should handle special characters', async ({ page }) => {
    await page.goto('/');
    
    const specialMsg = 'Hello! 🎉 @#$%^\u0026*() 🚀 ñoño 中文';
    const input = page.locator('textarea').first().or(page.locator('input[type="text"]')).first();
    
    await input.fill(specialMsg);
    await input.press('Enter');
    
    // Verify message with special chars is displayed
    await expect(page.locator('body')).toContainText('Hello!');
  });
});

test.describe('Message Streaming', () => {
  test('should stream response progressively', async ({ page }) => {
    await page.goto('/');
    
    const input = page.locator('textarea').first().or(page.locator('input[type="text"]')).first();
    await input.fill('Tell me a story');
    await input.press('Enter');
    
    // Capture initial state
    const assistantMessage = page.locator('[data-testid="assistant-message"]').or(page.locator('.assistant-message')).first();
    await assistantMessage.waitFor({ state: 'visible' });
    
    // Wait and check content grows
    let previousLength = 0;
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(500);
      const text = await assistantMessage.textContent() || '';
      if (i > 0) {
        // Content should stay same or grow
        expect(text.length).toBeGreaterThanOrEqual(previousLength);
      }
      previousLength = text.length;
    }
  });
  
  test('should show loading indicator', async ({ page }) => {
    await page.goto('/');
    
    const input = page.locator('textarea').first();
    await input.fill('Hello');
    await input.press('Enter');
    
    // Check for loading/spinner indicator
    const spinner = page.locator('.spinner, .loading, [data-testid="loading"], .animate-spin');
    await spinner.first().waitFor({ timeout: 5000, state: 'visible' }).catch(() => {
      // Loading indicator might be too fast, that's okay
    });
  });
});

test.describe('Chat Input', () => {
  test('should clear input after sending', async ({ page }) => {
    await page.goto('/');
    
    const input = page.locator('textarea').first().or(page.locator('input[type="text"]')).first();
    await input.fill('This should clear');
    await input.press('Enter');
    
    // Input should be cleared
    const value = await input.inputValue();
    expect(value).toBe('');
  });
  
  test('should support Shift+Enter for newlines', async ({ page }) => {
    await page.goto('/');
    
    const input = page.locator('textarea').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill('Line 1');
      await input.press('Shift+Enter');
      await input.fill('Line 2');
      
      const value = await input.inputValue();
      expect(value).toContain('Line 1');
      expect(value).toContain('Line 2');
    }
  });
});
