import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/ui',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // Reduced retries for faster feedback
  workers: process.env.CI ? 2 : undefined, // More workers for parallel execution
  reporter: 'html',
  timeout: 20000, // Shorter timeout for UI tests
  expect: {
    timeout: 5000, // Faster expect timeout
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off', // Disable tracing for faster execution
    // Optimized settings for faster UI testing
    actionTimeout: 5000,
    navigationTimeout: 10000,
    // Chromium-specific optimizations
    launchOptions: {
      args: [
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images', // Disable images for faster loading
        '--disable-javascript-harmony-shipping',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-field-trial-config',
        '--disable-ipc-flooding-protection',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Optimized viewport for UI testing
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        // Disable animations for faster testing
        javaScriptEnabled: true,
        bypassCSP: true,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60000, // 1 minute to start server
  },
}); 