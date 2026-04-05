/**
 * Utility functions for E2E tests
 */

import type { Page, Locator } from '@playwright/test';

/**
 * Wait for a locator to be stable (not moving)
 */
export async function waitForStable(
  page: Page,
  locator: Locator,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();
  
  let lastRect: DOMRect | null = null;
  
  while (Date.now() - startTime < timeout) {
    const rect = await locator.evaluate((el) => el.getBoundingClientRect());
    
    if (lastRect !== null) {
      const isStable =
        rect.x === lastRect.x &&
        rect.y === lastRect.y &&
        rect.width === lastRect.width &&
        rect.height === lastRect.height;
      
      if (isStable) {
        return;
      }
    }
    
    lastRect = rect;
    await page.waitForTimeout(interval);
  }
  
  throw new Error('Element did not stabilize in time');
}

/**
 * Wait for all network requests to complete
 */
export async function waitForNetworkIdle(
  page: Page,
  options: { timeout?: number; idleTime?: number } = {}
): Promise<void> {
  const { timeout = 30000, idleTime = 500 } = options;
  await page.waitForLoadState('networkidle', { timeout });
  await page.waitForTimeout(idleTime);
}

/**
 * Get text content from a locator with retry
 */
export async function getTextContent(
  locator: Locator,
  options: { timeout?: number; pollInterval?: number } = {}
): Promise<string | null> {
  const { timeout = 5000, pollInterval = 100 } = options;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const text = await locator.textContent();
    if (text !== null) {
      return text;
    }
    await locator.page().waitForTimeout(pollInterval);
  }
  
  return null;
}

/**
 * Retry an async function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delay?: number } = {}
): Promise<T> {
  const { retries = 3, delay = 100 } = options;
  
  let lastError: Error | undefined;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}

/**
 * Check if an element is visible (handles detached elements)
 */
export async function isVisible(locator: Locator): Promise<boolean> {
  try {
    return await locator.isVisible({ timeout: 100 });
  } catch {
    return false;
  }
}

/**
 * Type text into an input character by character (useful for autocomplete)
 */
export async function typeSlowly(
  locator: Locator,
  text: string,
  options: { delay?: number } = {}
): Promise<void> {
  const { delay = 50 } = options;
  
  for (const char of text) {
    await locator.type(char, { delay });
  }
}

/**
 * Wait for the streaming indicator to complete
 */
export async function waitForStreamingComplete(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 60000 } = options;
  
  // Wait for the absence of streaming indicators
  const streamingIndicator = page.locator('[data-streaming], .streaming, [class*="streaming"]');
  
  await Promise.race([
    page.waitForTimeout(timeout),
    streamingIndicator.waitFor({ state: 'hidden', timeout }),
  ]);
}

/**
 * Wait for images to load
 */
export async function waitForImages(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;
  
  await page.evaluate(async (timeout) => {
    const images = Array.from(document.querySelectorAll('img'));
    const promises = images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener('load', resolve);
        img.addEventListener('error', resolve);
        setTimeout(resolve, timeout);
      });
    });
    await Promise.all(promises);
  }, timeout);
}

/**
 * Get all accessible ARIA labels and text content for an element
 */
export async function getAccessibleInfo(
  locator: Locator
): Promise<{ label?: string; title?: string; text?: string }> {
  return await locator.evaluate((el) => {
    const label = el.getAttribute('aria-label') || (el as HTMLLabelElement).textContent?.slice(0, 100);
    const title = el.getAttribute('title') || undefined;
    const text = el.textContent?.slice(0, 100) || undefined;
    return { label, title, text };
  });
}
