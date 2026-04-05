import { test as base, expect, Page } from '@playwright/test';

/**
 * Type definitions for Claw API client
 */
export type ClawProvider = 'claw' | 'claude' | 'openai' | 'deepseek' | 'google' | 'anthropic';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ConversationSession {
  id: string;
  title?: string;
  messages: ChatMessage[];
}

/**
 * Extended playwright test with custom fixtures
 */
type ClawFixtures = {
  clawPage: Page;
  sendMessage: (message: string, provider?: ClawProvider) => Promise<void>;
  waitForResponse: () => Promise<string>;
  clearChat: () => Promise<void>;
  switchProvider: (provider: ClawProvider) => Promise<void>;
};

/**
 * Custom test fixture with Claw-specific helpers
 */
export const test = base.extend<ClawFixtures>({
  clawPage: async ({ page }, use) => {
    // Navigate and ensure page is ready
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await use(page);
  },
  
  sendMessage: async ({ page }, use) => {
    await use(async (message: string, provider?: ClawProvider) => {
      // Select provider if specified
      if (provider) {
        await page.click('[data-testid="provider-selector"]');
        await page.click(`[data-testid="provider-${provider}"]`);
      }
      
      // Type and send message
      const input = page.locator('[data-testid="chat-input"]').or(page.locator('textarea[placeholder*="message"]')).or(page.locator('input[type="text"]'));
      await input.fill(message);
      await input.press('Enter');
    });
  },
  
  waitForResponse: async ({ page }, use) => {
    await use(async () => {
      const responseLocator = page.locator('[data-testid="assistant-message"]').last();
      await responseLocator.waitFor({ timeout: 30000 });
      return responseLocator.textContent() || '';
    });
  },
  
  clearChat: async ({ page }, use) => {
    await use(async () => {
      const clearButton = page.locator('[data-testid="clear-chat"]').or(page.locator('button[title*="clear"]'));
      if (await clearButton.isVisible().catch(() => false)) {
        await clearButton.click();
        await page.locator('[data-testid="chat-messages"]').or(page.locator('.chat-container')).waitFor({ state: 'hidden' });
      }
    });
  },
  
  switchProvider: async ({ page }, use) => {
    await use(async (provider: ClawProvider) => {
      await page.click('[data-testid="provider-selector"]');
      await page.click(`[data-testid="provider-${provider}"]`);
      // Wait for provider indicator to update
      await page.waitForSelector(`[data-active-provider="${provider}"]`, { timeout: 5000 });
    });
  },
});

export { expect };
