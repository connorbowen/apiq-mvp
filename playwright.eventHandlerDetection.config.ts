/**
 * Playwright Configuration for Event Handler Detection
 * 
 * This configuration enables automated detection of conflicting event handlers
 * during E2E test execution.
 */

import { defineConfig, devices } from '@playwright/test';

const baseConfig = require('./playwright.config.ts').default;

export default defineConfig({
  ...baseConfig,
  
  // Test configuration
  testDir: './tests/e2e',
  testMatch: [
    '**/eventHandlerDetection.simple.test.ts'
  ],
  
  // Use the same global setup as base config
  globalSetup: require.resolve('./tests/helpers/globalSetup.ts'),
  
  // Test timeout for detection tests - increased for stability
  timeout: 60000,
  
  // Retry configuration
  retries: process.env.CI ? 2 : 0,
  
  // Workers configuration
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report/eventHandlerDetection' }],
    ['json', { outputFile: 'test-results/eventHandlerDetection.json' }],
    ['junit', { outputFile: 'test-results/eventHandlerDetection.xml' }]
  ],
  
  // Use configuration
  use: {
    ...baseConfig.use,
    
    // Base URL
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Trace configuration for debugging
    trace: 'on-first-retry',
    
    // Screenshot configuration
    screenshot: 'only-on-failure',
    
    // Video configuration
    video: 'retain-on-failure',
    
    // Additional context options for event handler detection
    contextOptions: {
      ...baseConfig.use?.contextOptions,
    }
  },
  
  // Project configuration for different browsers
  projects: [
    {
      name: 'chromium-eventHandlerDetection',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional Chromium-specific options for detection
        launchOptions: {
          args: [
            '--enable-logging',
            '--log-level=0',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      },
    },
    {
      name: 'firefox-eventHandlerDetection',
      use: { 
        ...devices['Desktop Firefox'],
        // Additional Firefox-specific options for detection
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': false,
            'dom.push.enabled': false
          }
        }
      },
    },
    {
      name: 'webkit-eventHandlerDetection',
      use: { 
        ...devices['Desktop Safari'],
        // Additional WebKit-specific options for detection
      },
    },
  ],
  
  // Web server configuration - use same as base config
  webServer: {
    command: './scripts/start-test-server.sh',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180000, // 3 minutes
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ENCRYPTION_MASTER_KEY: `test-master-key-${Date.now()}-32-chars-long-for-secrets`,
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-key-for-e2e-testing-only-never-use-in-production',
      TEST_MODE: 'true',
      PLAYWRIGHT_TEST: 'true',
      DISABLE_RATE_LIMITING: 'true',
      ENABLE_TEST_OAUTH2: 'true',
      E2E: 'true',
      EVENT_HANDLER_DETECTION: 'true',
      FAIL_ON_CRITICAL_CONFLICTS: 'true',
      FAIL_ON_HIGH_CONFLICTS: 'true',
      WARN_ON_MEDIUM_CONFLICTS: 'true',
      EVENT_HANDLER_LOG_LEVEL: 'warn',
    }
  },
  
  // Use the same global teardown as base config
  // globalTeardown: require.resolve('./tests/helpers/globalTeardown.ts'), // Disabled to prevent premature cleanup
  
  // Test configuration
  expect: {
    // Timeout for assertions - increased for stability
    timeout: 15000,
    
    // Custom matchers for event handler detection
    toHaveNoCriticalConflicts: async (page: any, expected: any) => {
      const { detectEventConflicts } = await import('./tests/helpers/eventHandlerDetection');
      const conflicts = await detectEventConflicts(page);
      const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
      
      if (criticalConflicts.length > 0) {
        throw new Error(`Critical event handler conflicts detected: ${criticalConflicts.map(c => c.element).join(', ')}`);
      }
    },
    
    toHaveProperFormPatterns: async (page: any, expected: any) => {
      const { validateFormPatterns } = await import('./tests/helpers/eventHandlerDetection');
      const isValid = await validateFormPatterns(page);
      
      if (!isValid) {
        throw new Error('Form submission patterns are not properly configured');
      }
    }
  }
});
