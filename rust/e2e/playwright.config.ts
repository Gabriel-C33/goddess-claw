import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Claw E2E testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on failure in CI for flaky tests */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use: 
   * - 'list' for terminal output
   * - 'html' for interactive HTML report
   * - 'github' for GitHub Actions annotations
   */
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ...(process.env.CI ? [['github']] : [])
  ],
  
  /* Global test settings */
  use: {
    /* Base URL for the web application */
    baseURL: 'http://localhost:8080',
    
    /* Collect trace when retrying failed tests: 
     * - 'on' for all tests
     * - 'retain-on-failure' to keep traces for failed tests
     * - 'on-first-retry' to collect trace on first retry
     */
    trace: 'retain-on-failure',
    
    /* Screenshot on test failure */
    screenshot: 'only-on-failure',
    
    /* Video recording on failure */
    video: 'retain-on-failure',
    
    /* Action timeout */
    actionTimeout: 15000,
    
    /* Navigation timeout */
    navigationTimeout: 30000,
  },
  
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    /* Mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  
  /* Run local dev server before starting the tests */
  webServer: {
    command: 'cargo run --bin goddess-claw',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  
  /* Global timeout per test */
  timeout: 30_000,
  
  /* Expect timeout */
  expect: {
    timeout: 5000,
  },
});
