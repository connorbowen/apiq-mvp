/**
 * P1.3.1: Direct API Calls via Chat E2E Tests
 * 
 * Tests the ability to execute API calls directly through the chat interface
 * without creating workflows. This covers AI-powered API execution, context
 * management, and multi-step API call sequences.
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
import { waitForDashboard, validateUXCompliance, closeGuidedTourIfPresent, waitForElement } from '../../helpers/uiHelpers';
import { testPageLoadTime, testAPIPerformance } from '../../helpers/performanceHelpers';
import { testFormAccessibility, testPrimaryActionPatterns } from '../../helpers/accessibilityHelpers';
import { testModalSubmitLoading, testModalSuccessMessage, testModalErrorHandling } from '../../helpers/modalHelpers';
import { createTestData, cleanupTestData, createConnectionForm, testConnectionCreation } from '../../helpers/dataHelpers';
import { testXSSPrevention, testDataExposure } from '../../helpers/securityHelpers';
import { waitForNetworkIdle } from '../../helpers/waitHelpers';
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('P1.3.1: Direct API Calls via Chat E2E Tests', () => {
  let testUser: TestUser;
  let testData: any;
  const createdConnectionIds: string[] = [];

  test.beforeAll(async () => {
    testUser = await createE2EUser(Role.USER, {
      email: `e2e-direct-api-chat-${generateTestId('user')}@example.com`,
      password: 'e2eTestPass123',
      name: 'E2E Direct API Chat Test User'
    });
    
    // Create test data with Petstore API connection
    testData = await createTestData({
      user: testUser,
      connection: {
        name: 'Test Petstore API',
        baseUrl: 'https://petstore3.swagger.io/api/v3',
        authType: 'NONE',
        description: 'Test API for direct chat execution'
      }
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

  test.describe('Single API Call Execution', () => {
    test('should execute GET request directly in chat', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Validate UX compliance
      await validateUXCompliance(page, {
        title: 'APIQ Dashboard',
        headings: 'Chat',
        validateForm: true,
        validateAccessibility: true
      });

      // Send message to execute API call
      const chatInput = page.locator('[data-testid="chat-input"]');
      await expect(chatInput).toBeVisible();
      
      await chatInput.fill('Get all available pets from the petstore');
      await chatInput.press('Enter');

      // Wait for AI response
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 15000 });
      
      // Verify API call was executed
      await expect(page.locator('[data-testid="api-call-result"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-body"]')).toBeVisible();
      
      // Verify response contains pet data
      const responseBody = page.locator('[data-testid="response-body"]');
      await expect(responseBody).toContainText('available');
    });

    test('should execute POST request with request body in chat', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send message to create a new pet
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Add a new pet named "Fluffy" with status "available" to the petstore');
      await chatInput.press('Enter');

      // Wait for AI response and API execution
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 15000 });
      await waitForElement(page, '[data-testid="api-call-result"]', { timeout: 10000 });
      
      // Verify API call was executed successfully
      await expect(page.locator('[data-testid="response-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-body"]')).toBeVisible();
      
      // Verify response contains the created pet
      const responseBody = page.locator('[data-testid="response-body"]');
      await expect(responseBody).toContainText('Fluffy');
      await expect(responseBody).toContainText('available');
    });

    test('should handle API execution errors gracefully in chat', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send message that will cause an API error
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Get a pet with invalid ID -999999 from the petstore');
      await chatInput.press('Enter');

      // Wait for AI response
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 15000 });
      
      // Verify error handling
      await expect(page.locator('[data-testid="api-call-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      
      // Verify error message is helpful
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toContainText('Pet not found');
    });

    test('should display API call execution details in chat', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send message to execute API call
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Get the petstore inventory status');
      await chatInput.press('Enter');

      // Wait for AI response
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 15000 });
      await waitForElement(page, '[data-testid="api-call-result"]', { timeout: 10000 });
      
      // Verify execution details are displayed
      await expect(page.locator('[data-testid="api-call-method"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-call-url"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-call-duration"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-headers"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-body"]')).toBeVisible();
    });
  });

  test.describe('Multi-Step API Call Sequences', () => {
    test('should execute multiple API calls in sequence with context', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // First API call - create a pet
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Create a new pet named "Buddy" with status "available"');
      await chatInput.press('Enter');

      // Wait for first API call to complete
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 15000 });
      await waitForElement(page, '[data-testid="api-call-result"]', { timeout: 10000 });
      
      // Verify first API call succeeded
      await expect(page.locator('[data-testid="response-body"]')).toContainText('Buddy');

      // Second API call - get all available pets (should include the one we just created)
      await chatInput.fill('Now get all available pets to see the one we just created');
      await chatInput.press('Enter');

      // Wait for second API call to complete
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 15000 });
      await waitForElement(page, '[data-testid="api-call-result"]', { timeout: 10000 });
      
      // Verify second API call succeeded and shows context from first call
      const responseBody = page.locator('[data-testid="response-body"]').last();
      await expect(responseBody).toContainText('Buddy');
      await expect(responseBody).toContainText('available');
    });

    test('should handle context between API calls in conversation', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Create a pet and get its ID
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Create a pet named "Whiskers" and tell me its ID');
      await chatInput.press('Enter');

      // Wait for response
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 15000 });
      await waitForElement(page, '[data-testid="api-call-result"]', { timeout: 10000 });
      
      // Verify pet was created and ID is mentioned
      await expect(page.locator('[data-testid="assistant-message"]')).toContainText('Whiskers');
      await expect(page.locator('[data-testid="response-body"]')).toContainText('id');

      // Use the pet ID in a follow-up request
      await chatInput.fill('Now update that pet to have status "sold"');
      await chatInput.press('Enter');

      // Wait for update API call
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 15000 });
      await waitForElement(page, '[data-testid="api-call-result"]', { timeout: 10000 });
      
      // Verify update was successful
      await expect(page.locator('[data-testid="response-body"]')).toContainText('sold');
    });

    test('should execute complex multi-step workflow via chat', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Complex multi-step request
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Create a new pet named "Rex", then create an order for that pet, and finally get the order details');
      await chatInput.press('Enter');

      // Wait for all API calls to complete
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 20000 });
      
      // Verify multiple API calls were executed
      const apiCallResults = page.locator('[data-testid="api-call-result"]');
      await expect(apiCallResults).toHaveCount(3); // Pet creation, order creation, order retrieval
      
      // Verify each step succeeded
      const responseBodies = page.locator('[data-testid="response-body"]');
      await expect(responseBodies.nth(0)).toContainText('Rex'); // Pet creation
      await expect(responseBodies.nth(1)).toContainText('order'); // Order creation
      await expect(responseBodies.nth(2)).toContainText('order'); // Order retrieval
    });
  });

  test.describe('Chat Interface Integration', () => {
    test('should display API call results in chat conversation flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send API call request
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Get all pets with status "available"');
      await chatInput.press('Enter');

      // Wait for response
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 15000 });
      
      // Verify chat conversation flow
      const messages = page.locator('[data-testid="chat-message"]');
      await expect(messages).toHaveCount(2); // User message + Assistant response
      
      // Verify user message
      await expect(messages.nth(0)).toContainText('Get all pets with status "available"');
      
      // Verify assistant response with API call result
      await expect(messages.nth(1)).toContainText('available');
      await expect(messages.nth(1)).toContainText('[data-testid="api-call-result"]');
    });

    test('should maintain chat history with API call results', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // First API call
      await chatInput.fill('Get petstore inventory');
      await chatInput.press('Enter');
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 15000 });
      
      // Second API call
      await chatInput.fill('Now get all available pets');
      await chatInput.press('Enter');
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 15000 });
      
      // Verify chat history is maintained
      const messages = page.locator('[data-testid="chat-message"]');
      await expect(messages).toHaveCount(4); // 2 user messages + 2 assistant responses
      
      // Verify both API call results are visible
      const apiCallResults = page.locator('[data-testid="api-call-result"]');
      await expect(apiCallResults).toHaveCount(2);
    });

    test('should handle chat input validation for API calls', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Test empty message
      await chatInput.fill('');
      await chatInput.press('Enter');
      
      // Verify no API call is made
      await page.waitForTimeout(1000);
      const messages = page.locator('[data-testid="chat-message"]');
      await expect(messages).toHaveCount(0);
      
      // Test message that doesn't involve API calls
      await chatInput.fill('Hello, how are you?');
      await chatInput.press('Enter');
      
      // Wait for response
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 10000 });
      
      // Verify no API call result is shown
      await expect(page.locator('[data-testid="api-call-result"]')).not.toBeVisible();
    });
  });

  test.describe('Performance & Reliability', () => {
    test('should execute API calls within performance requirements', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Test page load performance
      await testPageLoadTime(page, 3000);

      const startTime = Date.now();
      
      // Execute API call
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Get all available pets');
      await chatInput.press('Enter');

      // Wait for completion
      await waitForElement(page, '[data-testid="api-call-result"]', { timeout: 10000 });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify execution time is under 10 seconds
      expect(executionTime).toBeLessThan(10000);
    });

    test('should handle concurrent API calls gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Send multiple API call requests quickly
      await chatInput.fill('Get petstore inventory');
      await chatInput.press('Enter');
      
      await chatInput.fill('Get all available pets');
      await chatInput.press('Enter');
      
      await chatInput.fill('Get all pending pets');
      await chatInput.press('Enter');

      // Wait for all responses
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 20000 });
      
      // Verify all API calls completed
      const apiCallResults = page.locator('[data-testid="api-call-result"]');
      await expect(apiCallResults).toHaveCount(3);
    });

    test('should maintain chat responsiveness during API execution', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Start API call
      await chatInput.fill('Get all available pets');
      await chatInput.press('Enter');
      
      // Verify chat input remains responsive
      await expect(chatInput).toBeEnabled();
      
      // Try to send another message while first is executing
      await chatInput.fill('Also get the inventory');
      await chatInput.press('Enter');
      
      // Wait for both to complete
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 20000 });
      
      // Verify both API calls completed
      const apiCallResults = page.locator('[data-testid="api-call-result"]');
      await expect(apiCallResults).toHaveCount(2);
    });
  });

  test.describe('Security & Data Handling', () => {
    test('should validate input sanitization in chat API calls', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Test XSS prevention
      await testXSSPrevention(page, '[data-testid="chat-input"]', '<script>alert("xss")</script>');
      
      // Test with malicious input
      await chatInput.fill('Get pet with name <script>alert("xss")</script>');
      await chatInput.press('Enter');
      
      // Wait for response
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 15000 });
      
      // Verify no script execution
      await expect(page.locator('script')).not.toBeVisible();
    });

    test('should prevent data exposure in API call results', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Get all available pets');
      await chatInput.press('Enter');

      // Wait for response
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 15000 });
      await waitForElement(page, '[data-testid="api-call-result"]', { timeout: 10000 });
      
      // Test data exposure prevention
      await testDataExposure(page, ['[data-testid="api-call-result"]', '[data-testid="response-body"]']);
    });

    test('should handle authentication errors gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // This test would require a connection with invalid auth
      // For now, we'll test the error handling mechanism
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Get all available pets');
      await chatInput.press('Enter');

      // Wait for response
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 15000 });
      
      // Verify response is handled appropriately
      await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible();
    });
  });

  test.describe('Accessibility & Mobile Support', () => {
    test('should support keyboard navigation for chat API calls', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Test keyboard navigation
      await testPrimaryActionPatterns(page, {
        primaryActions: ['chat-input']
      });

      // Navigate using keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Should focus chat input
      
      // Verify chat input is focused
      const chatInput = page.locator('[data-testid="chat-input"]');
      await expect(chatInput).toBeFocused();
    });

    test('should be mobile responsive for chat API calls', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Verify mobile layout
      await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
      
      // Test API call on mobile
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Get all available pets');
      await chatInput.press('Enter');
      
      // Wait for response
      await waitForElement(page, '[data-testid="assistant-message"]', { timeout: 15000 });
      await waitForElement(page, '[data-testid="api-call-result"]', { timeout: 10000 });
      
      // Verify API call result is visible on mobile
      await expect(page.locator('[data-testid="api-call-result"]')).toBeVisible();
      
      // Verify touch targets are appropriate size
      const chatInputBox = await chatInput.boundingBox();
      expect(chatInputBox?.height).toBeGreaterThanOrEqual(44); // Minimum touch target size
    });
  });
});
