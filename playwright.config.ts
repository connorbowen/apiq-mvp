import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2, // Conservative number of workers for stability
  reporter: 'html',
  timeout: 30000, // Increased timeout for multi-worker stability
  expect: {
    timeout: 10000, // Increased expect timeout
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off', // Set to 'on-first-retry' when debugging test failures
    actionTimeout: 15000, // Increased action timeout
    navigationTimeout: 20000, // Increased navigation timeout
    launchOptions: {
      args: [
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox', // Add sandbox disable for stability
        '--disable-setuid-sandbox' // Add setuid sandbox disable
      ]
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      ENCRYPTION_MASTER_KEY: 'test-master-key-32-chars-long-for-secrets',
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
      TEST_MODE: 'true',
      PLAYWRIGHT_TEST: 'true',
      DISABLE_RATE_LIMITING: 'true', // Disable rate limiting for fast E2E testing
      // Add worker-specific environment variables
      WORKER_ID: process.env.WORKER_ID || '1',
      MAX_WORKERS: process.env.MAX_WORKERS || '4',
    }
  },
}); 