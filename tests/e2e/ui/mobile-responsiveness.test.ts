import { test, expect } from '@playwright/test';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: any;
let jwt: string;

test.describe('Mobile Responsiveness E2E Tests - P1 High Priority', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-mobile-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Mobile Test User'
    );
    jwt = testUser.accessToken;
  });

  test.afterAll(async () => {
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  let uxHelper: UXComplianceHelper;

  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    // Set authentication token directly instead of using UI login
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Set the JWT token in localStorage to authenticate the user
    await page.evaluate((data) => {
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }, { token: jwt, user: testUser });
    
    // Reload the page to apply authentication
    await page.reload();
    
    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });
  });

  test.describe('Mobile Navigation & Layout', () => {
    test('should display mobile menu and navigation', async ({ page }) => {
      // Check for mobile menu button
      await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Open mobile menu
      await page.getByRole('button', { name: 'Menu' }).click();
      
      // Check mobile menu items
      await expect(page.getByText('Dashboard')).toBeVisible();
      await expect(page.getByText('Workflows')).toBeVisible();
      await expect(page.getByText('Connections')).toBeVisible();
      await expect(page.getByText('Secrets')).toBeVisible();
      await expect(page.getByText('Settings')).toBeVisible();
      await expect(page.getByText('Sign Out')).toBeVisible();
      
      // Test menu navigation
      await page.getByText('Workflows').click();
      await expect(page).toHaveURL(/.*workflows/);
      await expect(page.getByText('Workflows')).toBeVisible();
      
      // Menu should close after navigation
      await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
      await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible();
    });

    test('should handle mobile tab navigation', async ({ page }) => {
      // Check for mobile tab bar
      await expect(page.locator('[data-testid="mobile-tab-bar"]')).toBeVisible();
      
      // Test tab navigation
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await expect(page.getByText('Workflows')).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Workflows' })).toHaveAttribute('aria-selected', 'true');
      
      await page.getByRole('tab', { name: 'Connections' }).click();
      await expect(page.getByText('Connections')).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Connections' })).toHaveAttribute('aria-selected', 'true');
      
      await page.getByRole('tab', { name: 'Secrets' }).click();
      await expect(page.getByText('Secrets')).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Secrets' })).toHaveAttribute('aria-selected', 'true');
      
      await page.getByRole('tab', { name: 'Overview' }).click();
      await expect(page.getByText('Dashboard')).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    });

    test('should display responsive dashboard layout', async ({ page }) => {
      // Check dashboard layout on mobile
      await expect(page.getByText('Dashboard')).toBeVisible();
      
      // Check for mobile-optimized cards
      await expect(page.locator('[data-testid="mobile-card"]')).toBeVisible();
      
      // Check for responsive grid layout
      const cards = page.locator('[data-testid="dashboard-card"]');
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);
      
      // Cards should stack vertically on mobile
      for (let i = 0; i < cardCount; i++) {
        const card = cards.nth(i);
        const box = await card.boundingBox();
        expect(box?.width).toBeLessThanOrEqual(375); // Should fit mobile width
      }
    });
  });

  test.describe('Mobile Form Interactions', () => {
    test('should handle mobile form input and validation', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      // Test mobile form input
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send mobile notification for new orders');
      
      // Check input is properly sized for mobile
      const inputBox = await chatInput.boundingBox();
      expect(inputBox?.width).toBeGreaterThan(300); // Should use most of mobile width
      
      // Test mobile keyboard interaction
      await chatInput.focus();
      await page.keyboard.type(' with priority handling');
      
      // Submit form
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      // Wait for response
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Check mobile-optimized workflow preview
      await expect(page.getByText('Mobile Order Notification')).toBeVisible();
      await expect(page.getByText('Send Mobile Notification')).toBeVisible();
    });

    test('should handle mobile touch interactions', async ({ page }) => {
      await page.getByRole('tab', { name: 'Connections' }).click();
      await page.getByRole('button', { name: 'Add Connection' }).click();
      
      // Test mobile touch targets
      const buttons = page.locator('button');
      for (let i = 0; i < await buttons.count(); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box) {
          // Touch targets should be at least 44x44 pixels
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
      
      // Test mobile scrolling
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Should be able to scroll to bottom
      const scrollPosition = await page.evaluate(() => window.scrollY);
      expect(scrollPosition).toBeGreaterThan(0);
    });

    test('should handle mobile form validation errors', async ({ page }) => {
      await page.getByRole('tab', { name: 'Connections' }).click();
      await page.getByRole('button', { name: 'Add Connection' }).click();
      
      // Try to submit empty form
      await page.getByRole('button', { name: 'Create Connection' }).click();
      
      // Check mobile-optimized error display
      await uxHelper.validateErrorContainer('Please fill in all required fields');
      
      // Error messages should be clearly visible on mobile
      const errorMessages = page.locator('.text-red-600');
      for (let i = 0; i < await errorMessages.count(); i++) {
        const error = errorMessages.nth(i);
        const box = await error.boundingBox();
        expect(box?.width).toBeGreaterThan(200); // Should be readable on mobile
      }
    });
  });

  test.describe('Mobile Workflow Management', () => {
    test('should handle mobile workflow creation and editing', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      // Test mobile workflow creation
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Mobile-friendly workflow for order processing');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]');
      
      // Check mobile-optimized workflow preview
      await expect(page.getByText('Order Processing Workflow')).toBeVisible();
      
      // Test mobile workflow editing
      await page.getByRole('button', { name: 'Edit' }).click();
      
      // Check mobile editing interface
      await expect(page.getByText('Edit Workflow')).toBeVisible();
      
      // Test mobile step reordering
      await page.getByRole('button', { name: 'Reorder Steps' }).click();
      await expect(page.getByText('Drag to reorder steps')).toBeVisible();
      
      // Save workflow
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await uxHelper.validateSuccessContainer('Workflow updated successfully');
    });

    test('should handle mobile workflow execution and monitoring', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Create a workflow first
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Simple mobile test workflow');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      await page.waitForSelector('[data-testid="workflow-preview"]');
      await page.getByRole('button', { name: 'Save Workflow' }).click();
      
      // Navigate back to workflows list
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Test mobile workflow execution
      await page.getByText('Simple mobile test workflow').click();
      await page.getByRole('button', { name: 'Run Workflow' }).click();
      
      // Check mobile execution monitoring
      await expect(page.getByText('Executing Workflow')).toBeVisible();
      await expect(page.getByText('Step 1: Processing')).toBeVisible();
      
      // Wait for completion
      await page.waitForSelector('[data-testid="execution-complete"]', { timeout: 30000 });
      await expect(page.getByText('Workflow completed successfully')).toBeVisible();
      
      // Test mobile execution history
      await page.getByRole('button', { name: 'View History' }).click();
      await expect(page.getByText('Execution History')).toBeVisible();
      
      // Check mobile-optimized history display
      const historyItems = page.locator('[data-testid="execution-item"]');
      expect(await historyItems.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Mobile API Connection Management', () => {
    test('should handle mobile API connection setup', async ({ page }) => {
      await page.getByRole('tab', { name: 'Connections' }).click();
      await page.getByRole('button', { name: 'Add Connection' }).click();
      
      // Test mobile connection form
      await page.getByLabel('Connection Name').fill('Mobile Test API');
      await page.getByLabel('API URL').fill('https://api.example.com');
      await page.getByLabel('Authentication Type').selectOption('API Key');
      await page.getByLabel('API Key').fill('test-api-key');
      
      // Test mobile form submission
      await page.getByRole('button', { name: 'Test Connection' }).click();
      
      // Wait for test result
      await page.waitForSelector('[data-testid="connection-test-result"]');
      await expect(page.getByText('Connection successful')).toBeVisible();
      
      // Save connection
      await page.getByRole('button', { name: 'Save Connection' }).click();
      await uxHelper.validateSuccessContainer('Connection created successfully');
    });

    test('should handle mobile OAuth2 flows', async ({ page }) => {
      // On mobile, we need to open the mobile menu first
      await page.getByTestId('mobile-menu-toggle').click();
      // Use the mobile menu button specifically (first button with this text)
      await page.locator('[data-testid="mobile-menu"] button:has-text("API Connections")').first().click();
      // Use the specific data-testid to avoid ambiguity
      await page.getByTestId('primary-action create-connection-btn').first().click();
      
      // Fill basic connection details
      await page.fill('[data-testid="connection-name-input"]', 'Mobile Slack API');
      await page.fill('[data-testid="connection-description-input"]', 'Slack API via OAuth2 on mobile');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://slack.com/api');
      
      // Select OAuth2 authentication type
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      
      // Select Slack provider
      await page.selectOption('[data-testid="connection-provider-select"]', 'slack');
      
      // Fill OAuth2 credentials
      await page.fill('[data-testid="connection-clientid-input"]', 'test-slack-client-id');
      await page.fill('[data-testid="connection-clientsecret-input"]', 'test-slack-client-secret');
      
      // Submit form
      const submitButton = page.locator('[data-testid="primary-action submit-connection-btn"]');
      await submitButton.click();
      
      // Wait for success message and connection card
      await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-card"]:has-text("Mobile Slack API")')).toBeVisible();
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('OAuth2');
      
      // As a final check, ensure the dashboard heading is visible
      await expect(page.locator('h1')).toContainText('Dashboard');
    });
  });

  test.describe('Mobile Secrets Management', () => {
    test('should handle mobile secrets vault operations', async ({ page }) => {
      await page.getByRole('tab', { name: 'Secrets' }).click();
              await page.getByRole('button', { name: 'Create Secret' }).click();
      
      // Test mobile secrets form
      await page.getByLabel('Secret Name').fill('Mobile Test Secret');
      await page.getByLabel('Secret Type').selectOption('API Key');
      await page.getByLabel('Secret Value').fill('mobile-secret-value');
      await page.getByLabel('Description').fill('Test secret for mobile');
      
      // Save secret
      await page.getByRole('button', { name: 'Save Secret' }).click();
      await uxHelper.validateSuccessContainer('Secret created successfully');
      
      // Test mobile secret management
      await page.getByText('Mobile Test Secret').click();
      await expect(page.getByText('Secret Details')).toBeVisible();
      
      // Test mobile secret editing
      await page.getByRole('button', { name: 'Edit' }).click();
      await page.getByLabel('Description').fill('Updated mobile test secret');
      await page.getByRole('button', { name: 'Save Changes' }).click();
      await uxHelper.validateSuccessContainer('Secret updated successfully');
    });
  });

  test.describe('Mobile Performance & Optimization', () => {
    test('should load quickly on mobile devices', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // Should load in under 3 seconds on mobile
      expect(loadTime).toBeLessThan(3000);
      
      // Check for mobile optimizations
      await expect(page.locator('[data-testid="mobile-optimized"]')).toBeVisible();
    });

    test('should handle mobile network conditions', async ({ page }) => {
      // Simulate slow 3G network
      await page.route('**/*', route => {
        // Add delay using setTimeout to simulate slow network
        setTimeout(() => {
          route.continue();
        }, 1000);
      });
      
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Should show loading states
      await expect(page.getByText('Loading workflows...')).toBeVisible();
      
      // Should handle slow loading gracefully
      await page.waitForSelector('[data-testid="workflow-list"]', { timeout: 10000 });
      await expect(page.getByText('Workflows')).toBeVisible();
    });

    test('should work offline with basic functionality', async ({ page }) => {
      // Simulate offline mode
      await page.route('**/*', route => {
        route.abort();
      });
      
      // Should show offline indicator
      await expect(page.getByText('You\'re offline')).toBeVisible();
      await expect(page.getByText('Some features may be unavailable')).toBeVisible();
      
      // Basic navigation should still work
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await expect(page.getByText('Workflows')).toBeVisible();
      
      // Should show cached content
      await expect(page.getByText('Offline Mode')).toBeVisible();
    });
  });

  test.describe('Mobile Accessibility & UX', () => {
    test('should meet mobile accessibility standards', async ({ page }) => {
      // Test mobile accessibility
      await uxHelper.validateMobileAccessibility();
      
      // Test touch target sizes
      const buttons = page.locator('button');
      for (let i = 0; i < await buttons.count(); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box) {
          // Mobile touch targets should be at least 44x44 pixels
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
      
      // Test mobile keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
    });

    test('should provide mobile-friendly error handling', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      // Test mobile error display
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('test');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      // Should show mobile-optimized error message
      await uxHelper.validateErrorContainer('Please provide more details');
      
      // Error should be clearly visible and actionable on mobile
      await expect(page.getByText('Try describing the specific actions')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
    });

    test('should provide mobile-optimized success feedback', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send mobile notification for new orders');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]');
      await page.getByRole('button', { name: 'Save Workflow' }).click();
      
      // Should show mobile-optimized success message
      await uxHelper.validateSuccessContainer('Workflow created successfully');
      
      // Success message should be prominent on mobile
      const successMessage = page.locator('.bg-green-50');
      const box = await successMessage.boundingBox();
      expect(box?.width).toBeGreaterThan(300); // Should be clearly visible
    });
  });

  test.describe('Mobile Device Compatibility', () => {
    test('should work on different mobile screen sizes', async ({ page }) => {
      const screenSizes = [
        { width: 320, height: 568, name: 'iPhone SE' },
        { width: 375, height: 667, name: 'iPhone 8' },
        { width: 414, height: 896, name: 'iPhone 11' },
        { width: 360, height: 640, name: 'Android Small' },
        { width: 412, height: 915, name: 'Android Large' }
      ];
      
      for (const size of screenSizes) {
        await page.setViewportSize(size);
        
        // Test basic functionality on each screen size
        await page.goto(`${BASE_URL}/dashboard`);
        await expect(page.getByText('Dashboard')).toBeVisible();
        
        // Test navigation
        await page.getByRole('tab', { name: 'Workflows' }).click();
        await expect(page.getByText('Workflows')).toBeVisible();
        
        // Test menu functionality
        await page.getByRole('button', { name: 'Menu' }).click();
        await expect(page.getByText('Dashboard')).toBeVisible();
        await page.getByRole('button', { name: 'Menu' }).click(); // Close menu
        
        console.log(`✅ ${size.name} (${size.width}x${size.height}) - All tests passed`);
      }
    });

    test('should handle mobile orientation changes', async ({ page }) => {
      // Start in portrait mode
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/dashboard`);
      await expect(page.getByText('Dashboard')).toBeVisible();
      
      // Switch to landscape mode
      await page.setViewportSize({ width: 667, height: 375 });
      
      // Should adapt layout for landscape
      await expect(page.getByText('Dashboard')).toBeVisible();
      
      // Test navigation in landscape
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await expect(page.getByText('Workflows')).toBeVisible();
      
      // Switch back to portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.getByText('Workflows')).toBeVisible();
    });
  });
}); 