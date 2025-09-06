/**
 * P1.4: API Connection Guidance in Chat E2E Tests
 * 
 * Tests the ability of the chat interface to guide users through API connection setup
 * when they need APIs for workflows. This includes contextual guidance, redirection
 * to connection setup, and seamless flow from chat to connection management.
 * 
 * Following user-rules.md E2E testing guidelines:
 * - Uses real data and real system components
 * - No mocks for the system under test
 * - Tests complete user workflows end-to-end
 * - Validates UX compliance and accessibility
 */

import { test, expect } from '@playwright/test';
import { TestUser, generateTestId, cleanupTestUser } from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';
import { setupE2E, closeAllModals, resetRateLimits, getPrimaryActionButton } from '../../helpers/e2eHelpers';
import { waitForDashboard, validateUXCompliance, closeGuidedTourIfPresent, waitForElement, sendChatMessage, waitForChatResponse, validateChatResponse } from '../../helpers/uiHelpers';
import { testPageLoadTime, testAPIPerformance } from '../../helpers/performanceHelpers';
import { testFormAccessibility, testPrimaryActionPatterns } from '../../helpers/accessibilityHelpers';
import { testModalSubmitLoading, testModalSuccessMessage, testModalErrorHandling } from '../../helpers/modalHelpers';
import { createTestData, cleanupTestData } from '../../helpers/dataHelpers';
import { testXSSPrevention, testDataExposure } from '../../helpers/securityHelpers';
import { waitForNetworkIdle } from '../../helpers/waitHelpers';
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('P1.4: API Connection Guidance in Chat E2E Tests', () => {
  let testUser: TestUser;
  let testData: any;

  test.beforeAll(async () => {
    testUser = await createE2EUser(Role.USER, {
      email: `e2e-chat-guidance-${generateTestId('user')}@example.com`,
      password: 'e2eTestPass123',
      name: 'E2E Chat Guidance Test User'
    });
    
    // Create test data without any connections initially
    testData = await createTestData({
      user: testUser
    });
  });

  test.afterAll(async () => {
    // Clean up test data
    if (testData) {
      await cleanupTestData(testData);
    }
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    await setupE2E(page, testUser, { 
      tab: 'chat', 
      validateUX: true 
    });
    await closeGuidedTourIfPresent(page);
  });

  test.afterEach(async ({ page }) => {
    await closeAllModals(page);
    await resetRateLimits(page);
  });

  test.describe('Contextual Guidance Detection', () => {
    test('should detect when workflow requires unconnected APIs', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send a message that requires specific APIs
      await sendChatMessage(page, 'Create a workflow that sends a Slack notification when a new GitHub issue is created');

      // Wait for chat response
      await waitForChatResponse(page);

      // Verify guidance is provided
      await expect(page.locator('[data-testid="connection-guidance"]')).toBeVisible();
      await expect(page.locator('[data-testid="missing-apis-list"]')).toBeVisible();
      
      // Verify specific APIs are mentioned
      await expect(page.locator('text=Slack')).toBeVisible();
      await expect(page.locator('text=GitHub')).toBeVisible();
    });

    test('should provide helpful guidance instead of generic errors', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send a message requiring APIs
      await sendChatMessage(page, 'I want to create a workflow that integrates with Stripe and SendGrid');

      await waitForChatResponse(page);

      // Verify helpful guidance is provided
      await expect(page.locator('[data-testid="connection-guidance"]')).toBeVisible();
      
      // Verify guidance is actionable, not just an error
      await expect(page.locator('text=Connect your APIs')).toBeVisible();
      await expect(page.locator('text=Set up connections')).toBeVisible();
      
      // Verify no generic error messages
      await expect(page.locator('text=I cannot help you')).not.toBeVisible();
      await expect(page.locator('text=Error')).not.toBeVisible();
    });

    test('should suggest specific APIs needed for the workflow', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send a complex workflow request
      await sendChatMessage(page, 'Create a workflow that: 1) Monitors Twitter mentions, 2) Analyzes sentiment with OpenAI, 3) Sends results to Slack');

      await waitForChatResponse(page);

      // Verify specific API suggestions
      await expect(page.locator('[data-testid="api-suggestion-Twitter"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-suggestion-OpenAI"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-suggestion-Slack"]')).toBeVisible();
      
      // Verify API descriptions are helpful
      await expect(page.locator('text=Twitter API')).toBeVisible();
      await expect(page.locator('text=OpenAI API')).toBeVisible();
      await expect(page.locator('text=Slack API')).toBeVisible();
    });
  });

  test.describe('Connection Setup Redirection', () => {
    test('should offer to redirect to connection setup', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send message requiring APIs
      await sendChatMessage(page, 'Create a workflow with Google Sheets and Trello integration');

      await waitForChatResponse(page);

      // Verify redirect option is provided
      await expect(page.locator('[data-testid="redirect-to-connections"]')).toBeVisible();
      await expect(page.locator('text=Go to Connections')).toBeVisible();
    });

    test('should redirect to connections tab when requested', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send message requiring APIs
      await sendChatMessage(page, 'I need to connect to Salesforce and HubSpot');

      await waitForChatResponse(page);

      // Click redirect button
      const redirectButton = getPrimaryActionButton(page, 'redirect-to-connections');
      await redirectButton.click();

      // Verify redirect to connections tab
      await expect(page).toHaveURL(/.*tab=connections/);
      await expect(page.locator('[data-testid="connections-tab"]')).toBeVisible();
    });

    test('should maintain context when redirecting back to chat', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send initial message
      await sendChatMessage(page, 'Create a workflow with Mailchimp and Zapier');

      await waitForChatResponse(page);

      // Redirect to connections
      const redirectButton = getPrimaryActionButton(page, 'redirect-to-connections');
      await redirectButton.click();

      // Verify on connections tab
      await expect(page).toHaveURL(/.*tab=connections/);

      // Navigate back to chat
      await page.click('[data-testid="chat-tab"]');

      // Verify context is maintained
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      await expect(page.locator('text=Mailchimp')).toBeVisible();
      await expect(page.locator('text=Zapier')).toBeVisible();
    });
  });

  test.describe('Step-by-Step Connection Instructions', () => {
    test('should provide step-by-step connection instructions', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send message requiring specific API
      await sendChatMessage(page, 'I want to connect to the GitHub API');

      await waitForChatResponse(page);

      // Verify step-by-step instructions are provided
      await expect(page.locator('[data-testid="connection-instructions"]')).toBeVisible();
      await expect(page.locator('[data-testid="instruction-step-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="instruction-step-2"]')).toBeVisible();
      await expect(page.locator('[data-testid="instruction-step-3"]')).toBeVisible();
    });

    test('should provide API-specific connection guidance', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Request OAuth2 API connection
      await sendChatMessage(page, 'How do I connect to Google Drive API?');

      await waitForChatResponse(page);

      // Verify OAuth2-specific guidance
      await expect(page.locator('text=OAuth2')).toBeVisible();
      await expect(page.locator('text=Google Cloud Console')).toBeVisible();
      await expect(page.locator('text=Client ID')).toBeVisible();
      await expect(page.locator('text=Client Secret')).toBeVisible();
    });

    test('should provide API key connection guidance', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Request API key connection
      await sendChatMessage(page, 'How do I connect to the Stripe API?');

      await waitForChatResponse(page);

      // Verify API key-specific guidance
      await expect(page.locator('text=API Key')).toBeVisible();
      await expect(page.locator('text=Stripe Dashboard')).toBeVisible();
      await expect(page.locator('text=Secret Key')).toBeVisible();
    });
  });

  test.describe('Seamless Flow Integration', () => {
    test('should provide seamless flow from chat to connection setup', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send workflow request
      await sendChatMessage(page, 'Create a workflow that syncs data between Airtable and Notion');

      await waitForChatResponse(page);

      // Click "Set up connections" button
      const setupButton = getPrimaryActionButton(page, 'setup-connections');
      await setupButton.click();

      // Verify seamless transition to connection setup
      await expect(page).toHaveURL(/.*tab=connections/);
      await expect(page.locator('[data-testid="create-connection-header"]')).toBeVisible();
      
      // Verify pre-filled API suggestions
      await expect(page.locator('text=Airtable')).toBeVisible();
      await expect(page.locator('text=Notion')).toBeVisible();
    });

    test('should return to chat with updated context after connection setup', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send initial workflow request
      await sendChatMessage(page, 'Create a workflow with Shopify and WooCommerce');

      await waitForChatResponse(page);

      // Go to connections and simulate connection creation
      const setupButton = getPrimaryActionButton(page, 'setup-connections');
      await setupButton.click();

      // Simulate successful connection creation
      await page.click('[data-testid="create-connection-header"]');
      await page.fill('[data-testid="connection-name-input"]', 'Test Shopify Connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.shopify.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
      
      const submitButton = getPrimaryActionButton(page, 'submit-connection');
      await testModalSubmitLoading(page, '[data-testid="primary-action submit-connection"]', {
        validateLoading: true,
        timeout: 10000
      });

      // Return to chat
      await page.click('[data-testid="chat-tab"]');

      // Verify updated context
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      await expect(page.locator('text=Shopify')).toBeVisible();
      await expect(page.locator('text=WooCommerce')).toBeVisible();
    });
  });

  test.describe('Error Handling & Recovery', () => {
    test('should handle connection guidance errors gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send message that might cause guidance errors
      await sendChatMessage(page, 'Create a workflow with some random API that does not exist');

      await waitForChatResponse(page);

      // Verify graceful error handling
      await expect(page.locator('[data-testid="connection-guidance-error"]')).toBeVisible();
      await expect(page.locator('text=Unable to find information')).toBeVisible();
      
      // Verify fallback guidance is provided
      await expect(page.locator('text=Try a different API')).toBeVisible();
      await expect(page.locator('text=Check the API name')).toBeVisible();
    });

    test('should provide recovery options when guidance fails', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send problematic request
      await sendChatMessage(page, 'Create a workflow with <script>alert("xss")</script> API');

      await waitForChatResponse(page);

      // Verify recovery options
      await expect(page.locator('[data-testid="recovery-options"]')).toBeVisible();
      await expect(page.locator('text=Try again')).toBeVisible();
      await expect(page.locator('text=Contact support')).toBeVisible();
    });
  });

  test.describe('UX Compliance & Accessibility', () => {
    test('should maintain UX compliance throughout guidance flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Validate initial UX compliance
      await validateUXCompliance(page, {
        title: 'APIQ Dashboard',
        headings: 'Chat',
        validateForm: true,
        validateAccessibility: true
      });

      // Send message requiring guidance
      await sendChatMessage(page, 'Create a workflow with multiple APIs');

      await waitForChatResponse(page);

      // Validate guidance UX compliance
      await validateUXCompliance(page, {
        title: 'APIQ Dashboard',
        headings: 'Connection Guidance',
        validateForm: true,
        validateAccessibility: true
      });
    });

    test('should support keyboard navigation for guidance actions', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send message requiring guidance
      await sendChatMessage(page, 'Create a workflow with external APIs');

      await waitForChatResponse(page);

      // Test keyboard navigation
      await testPrimaryActionPatterns(page, {
        primaryActions: ['redirect-to-connections', 'setup-connections']
      });

      // Navigate using keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Should activate guidance button
    });

    test('should be mobile responsive for guidance interface', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send message requiring guidance
      await sendChatMessage(page, 'Create a workflow with mobile-friendly APIs');

      await waitForChatResponse(page);

      // Verify mobile responsiveness
      await expect(page.locator('[data-testid="connection-guidance"]')).toBeVisible();
      await expect(page.locator('[data-testid="redirect-to-connections"]')).toBeVisible();
      
      // Verify touch targets are appropriate size
      const guidanceButton = page.locator('[data-testid="redirect-to-connections"]');
      const box = await guidanceButton.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44); // Minimum touch target size
    });
  });

  test.describe('Performance & Security', () => {
    test('should meet performance requirements for guidance generation', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Test page load performance
      await testPageLoadTime(page, 3000);

      // Test guidance generation performance
      const startTime = Date.now();
      
      await sendChatMessage(page, 'Create a complex workflow with many APIs');
      await waitForChatResponse(page);
      
      const endTime = Date.now();
      const guidanceTime = endTime - startTime;

      // Verify guidance is generated quickly
      expect(guidanceTime).toBeLessThan(5000);
    });

    test('should validate input sanitization in guidance responses', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Test XSS prevention in guidance
      await testXSSPrevention(page, '[data-testid="chat-input"]', '<script>alert("xss")</script>');
      
      // Test data exposure prevention
      await testDataExposure(page, ['[data-testid="connection-guidance"]', '[data-testid="chat-interface"]']);
    });
  });
});
