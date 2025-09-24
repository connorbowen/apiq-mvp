import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Disable parallel execution to prevent context conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Retry configuration for stability
  workers: 1, // Force single worker to prevent context conflicts
  reporter: 'html',
  timeout: 60000, // 1 minute per test
  expect: {
    timeout: 15000, // 15 seconds for assertions
  },
  // Add global timeout for better stability
  globalTimeout: 300000, // 5 minutes for entire suite
  // Add global setup for better parallel test isolation
  globalSetup: require.resolve('./tests/helpers/globalSetup.ts'),
  // globalTeardown: require.resolve('./tests/helpers/globalTeardown.ts'), // Disabled to prevent premature cleanup
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off', // Set to 'on-first-retry' when debugging test failures
    actionTimeout: 15000, // 15 seconds for actions
    navigationTimeout: 15000, // 15 seconds for navigation
    // Add context options for better stability
    contextOptions: {
      ignoreHTTPSErrors: true,
      acceptDownloads: true,
    },
    launchOptions: {
      // Add process management options
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
      args: [
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-first-run',
        '--disable-background-networking',
        '--disable-component-extensions-with-background-pages',
        '--disable-ipc-flooding-protection',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-domain-reliability',
        '--disable-features=TranslateUI,BlinkGenPropertyTrees',
        '--disable-print-preview',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-popup-blocking',
        '--disable-windows10-custom-titlebar',
        '--metrics-recording-only',
        '--safebrowsing-disable-auto-update',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain',
        // Additional stability flags
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--disable-ipc-flooding-protection',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-background-timer-throttling',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-domain-reliability',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--disable-translate',
        '--disable-windows10-custom-titlebar',
        '--metrics-recording-only',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain'
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
    command: './scripts/start-test-server.sh',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180000, // Increased timeout to 3 minutes
    stdout: 'pipe', // Capture stdout for debugging
    stderr: 'pipe', // Capture stderr for debugging
    env: {
      ENCRYPTION_MASTER_KEY: `test-master-key-${Date.now()}-32-chars-long-for-secrets`,
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-key-for-e2e-testing-only-never-use-in-production',
      TEST_MODE: 'true',
      PLAYWRIGHT_TEST: 'true',
      DISABLE_RATE_LIMITING: 'true',
      ENABLE_TEST_OAUTH2: 'true',
      E2E: 'true',
    }
  },
}); 