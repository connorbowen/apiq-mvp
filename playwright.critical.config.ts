// @ts-nocheck
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  grep: /@critical/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for fastest feedback
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list', // Simple list reporter for faster output
  timeout: 15000, // Very short timeout
  expect: {
    timeout: 3000, // Very fast expect timeout
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off', // Disable tracing
    // Ultra-fast settings
    actionTimeout: 3000,
    navigationTimeout: 8000,
    // Maximum Chromium optimizations
    launchOptions: {
      args: [
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-javascript-harmony-shipping',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-field-trial-config',
        '--disable-ipc-flooding-protection',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-first-run',
        '--disable-background-networking',
        '--disable-component-extensions-with-background-pages',
        '--disable-background-mode',
        '--disable-client-side-phishing-detection',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-domain-reliability',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--no-default-browser-check',
        '--no-experiments',
        '--disable-logging',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-zygote',
        '--single-process'
      ]
    }
  },
  globalTeardown: './playwright.global.teardown',
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Minimal viewport
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        javaScriptEnabled: true,
        bypassCSP: true,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30000, // 30 seconds to start server
  },
}); 