import { defineConfig, devices } from '@playwright/test';

/**
 * TDD-Optimized Playwright Configuration
 * 
 * This configuration is designed for Test-Driven Development (TDD) workflows,
 * prioritizing speed and reliability for critical path tests that serve as
 * development guardrails.
 * 
 * Target execution time: < 2 minutes for complete suite
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // TDD Critical Path Tests - only the most essential user journeys
  testMatch: [
    '**/ui/ui-compliance.test.ts',           // Core UI/UX compliance
    '**/auth/authentication-session.test.ts', // Login/logout flows
    '**/connections/connections-core.test.ts', // Basic API connectivity  
    '**/workflow-engine/workflow-core.test.ts', // Essential workflow functions
    '**/security/security-core.test.ts'      // Critical security checks
  ],

  // Speed optimizations for TDD
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries in TDD - fail fast for immediate feedback
  workers: process.env.CI ? 2 : 4, // More workers locally for speed
  
  // Fast reporting
  reporter: [
    ['list'], // Simple list for quick console output
    ['html', { outputFolder: 'tdd-report', open: 'never' }] // Quick HTML report
  ],

  // Aggressive timeouts for fast feedback
  timeout: 15000, // 15s max per test
  expect: {
    timeout: 3000, // 3s max for assertions
  },

  use: {
    // Base configuration
    baseURL: 'http://localhost:3000',
    
    // Speed optimizations
    trace: 'off', // No tracing in TDD mode for speed
    video: 'off', // No video recording for speed
    screenshot: 'only-on-failure', // Minimal screenshots
    
    // Fast timeouts
    actionTimeout: 5000, // 5s for actions
    navigationTimeout: 10000, // 10s for navigation
    
    // Browser optimizations for speed
    launchOptions: {
      args: [
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images', // Skip images for speed
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-first-run',
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
        '--disable-accelerated-2d-canvas',
        '--single-process' // Fastest option for simple tests
      ]
    }
  },

  projects: [
    {
      name: 'chromium-tdd',
      use: { 
        ...devices['Desktop Chrome'],
        // Minimal viewport for speed
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        javaScriptEnabled: true,
        bypassCSP: true, // Skip CSP for speed
      },
    },
  ],

  // Fast server startup
  webServer: {
    command: 'npm run dev:direct', // Direct Next.js start for speed
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 20000, // 20s to start server
    env: {
      // Optimize for TDD speed
      DISABLE_RATE_LIMITING: 'true',
      NODE_ENV: 'test',
      // Disable slower development features
      NEXT_TELEMETRY_DISABLED: '1',
    }
  },

  // Global test setup for TDD
  globalSetup: require.resolve('./tests/helpers/tdd-setup.ts'),
  globalTeardown: require.resolve('./tests/helpers/tdd-teardown.ts'),
});