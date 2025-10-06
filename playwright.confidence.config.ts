import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration specifically for confidence confirmation tests
 * Uses a higher confidence threshold to trigger confidence confirmations
 */
export default defineConfig({
  testDir: './tests/e2e/chat',
  testMatch: 'confidence-confirmation.test.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      // Load the confidence-specific environment file
      DOTENV_CONFIG_PATH: '.env.test-confidence',
      // Explicitly set the confidence threshold
      CONFIDENCE_THRESHOLD: '0.95',
    },
  },
});
