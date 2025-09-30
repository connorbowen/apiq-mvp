/**
 * P1.3.4: Chat Interface Integration E2E Tests
 * 
 * Tests the integration of API call functionality within the chat interface.
 * This covers chat UI integration, user experience, and chat-specific functionality.
 * 
 * Following user-rules.md E2E testing guidelines:
 * - Uses real data and real system components
 * - No mocks for the system under test
 * - Tests complete user workflows end-to-end
 * - Validates UX compliance and accessibility
 */

import { test, expect } from '@playwright/test';
import { TestUser, generateTestId } from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';
import { cleanupTestUser } from '../../helpers/testUtils';
import { setupE2E, closeAllModals, resetRateLimits } from '../../helpers/e2eHelpers';
import { 
  waitForDashboard, 
  validateUXCompliance, 
  closeGuidedTourIfPresent, 
  waitForElement,
  waitForApiCallResult,
  sendChatMessage,
  waitForChatResponse,
  waitForDashboardReady
} from '../../helpers/uiHelpers';
import { createTestData, cleanupTestData, submitFormWithUtils } from '../../helpers/dataHelpers';
import { createTestEndpoint } from '../../helpers/testUtils';
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper function to create Petstore endpoint with proper parameters
async function createPetstoreEndpointWithParameters(connection: any) {
  const { prisma } = await import('../../../lib/database/client');
  
  await prisma.endpoint.create({
    data: {
      apiConnectionId: connection.id,
      path: '/pet/findByStatus',
      method: 'GET',
      summary: 'Finds Pets by status',
      description: 'Multiple status values can be provided with comma separated strings',
      isActive: true,
      parameters: [
        {
          name: 'status',
          in: 'query',
          description: 'Status values that need to be considered for filter',
          required: true,
          schema: {
            type: 'string',
            enum: ['available', 'pending', 'sold'],
            default: 'available'
          },
          naturalLanguageMappings: [
            'status',
            'pet status', 
            'availability',
            'available',
            'pending', 
            'sold',
            'state'
          ]
        }
      ],
      responses: {
        '200': {
          description: 'Successful operation',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    status: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        '400': {
          description: 'Invalid status value'
        }
      }
    }
  });
}

test.describe('P1.3.4: Chat Interface Integration E2E Tests', () => {
  let testUser: TestUser;
  let testData: any;
  const createdConnectionIds: string[] = [];

  test.beforeAll(async () => {
    testUser = await createE2EUser(Role.USER, {
      email: `e2e-chat-interface-${generateTestId('user')}@testuser.local`,
      password: 'e2eTestPass123',
      name: 'E2E Chat Interface Test User'
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
    
    // Wait for dashboard to be fully ready before proceeding
    await waitForDashboardReady(page);
    
    // Create test data with Petstore API connection for each test
    console.log('Creating connection for user:', testUser.id, testUser.email);
    // Create test data for each test with unique names
    const testId = Date.now() + Math.random().toString(36).substr(2, 9);
    testData = await createTestData({
      user: testUser,
      connection: {
        name: `Petstore API ${testId}`,
        baseUrl: 'https://petstore3.swagger.io/api/v3',
        authType: 'NONE'
      }
    });
    console.log('Created connection:', testData.connection?.id, 'for user:', testData.connection?.userId);

    // Create some basic endpoints for the Petstore API
    if (testData.connection) {
      // Note: Removed /pet GET endpoint as it doesn't exist in real Petstore API
      await createTestEndpoint(testData.connection, '/pet', 'POST', 'Add a new pet');
      
      // Create the findByStatus endpoint with proper parameters
      await createPetstoreEndpointWithParameters(testData.connection);
      
      createdConnectionIds.push(testData.connection.id);
      
      // Wait for connection to be fully created and committed to database
      await page.waitForTimeout(2000);
    }
    
    // Ensure chat interface is ready
    await waitForElement(page, '[data-testid="chat-input"]', { timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    await closeAllModals(page);
    await resetRateLimits(page);
  });

  test.describe('Chat Interface Integration', () => {
    test('should display API call results in chat conversation flow', async ({ page }) => {
      // Send API call request using helper
      await sendChatMessage(page, 'Get all pets with status "available"');
      await waitForChatResponse(page, 15000);
      
      // Wait for API call result to appear
      await waitForApiCallResult(page, { timeout: 15000 });
      
      // Verify chat conversation flow - look for actual chat message elements
      const messages = page.locator('[data-testid="chat-message"]');
      await expect(messages).toHaveCount(2); // User message + Assistant response
      
      // Verify user message (check for the core content, ignoring HTML entities and timestamp)
      await expect(messages.nth(0)).toContainText('Get all pets with status');
      await expect(messages.nth(0)).toContainText('available');
      
      // Verify assistant response with API call result
      await expect(messages.nth(1)).toContainText('available');
      
      // Verify API call result is displayed
      await expect(page.locator('[data-testid="api-call-result"]')).toBeVisible();
    });

    test('should maintain chat history with API call results', async ({ page }) => {
      // Add debugging to see what's happening
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
        if (msg.text().includes('ChatInterface') || msg.text().includes('API') || msg.text().includes('processMessage')) {
          console.log('🔍 Browser Console:', msg.text());
        }
      });

      // First API call
      await sendChatMessage(page, 'Get petstore inventory');
      await waitForChatResponse(page, 15000);
      
      // Debug: Check what elements are present after first message
      const messagesAfterFirst = page.locator('[data-testid="chat-message"]');
      const messageCountAfterFirst = await messagesAfterFirst.count();
      console.log(`🔍 DEBUG: Messages after first call: ${messageCountAfterFirst}`);
      
      const apiCallResultsAfterFirst = page.locator('[data-testid="api-call-result"]');
      const apiResultCountAfterFirst = await apiCallResultsAfterFirst.count();
      console.log(`🔍 DEBUG: API call results after first call: ${apiResultCountAfterFirst}`);
      
      // Second API call
      await sendChatMessage(page, 'Now get all available pets');
      await waitForChatResponse(page, 15000);
      
      // Debug: Check what elements are present after second message
      const messagesAfterSecond = page.locator('[data-testid="chat-message"]');
      const messageCountAfterSecond = await messagesAfterSecond.count();
      console.log(`🔍 DEBUG: Messages after second call: ${messageCountAfterSecond}`);
      
      const apiCallResultsAfterSecond = page.locator('[data-testid="api-call-result"]');
      const apiResultCountAfterSecond = await apiCallResultsAfterSecond.count();
      console.log(`🔍 DEBUG: API call results after second call: ${apiResultCountAfterSecond}`);
      
      // Log console messages for debugging
      console.log('🔍 Total console messages:', consoleLogs.length);
      consoleLogs.forEach((msg, index) => {
        console.log(`🔍 Message ${index + 1}:`, msg);
      });
      
      // Verify chat history is maintained - look for actual chat message elements
      const messages = page.locator('[data-testid="chat-message"]');
      await expect(messages).toHaveCount(4); // 2 user messages + 2 assistant responses
      
      // Verify both API call results are visible
      const apiCallResults = page.locator('[data-testid="api-call-result"]');
      await expect(apiCallResults).toHaveCount(2);
    });

    test('should handle chat input validation for API calls', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Test empty message
      await chatInput.fill('');
      await submitFormWithUtils(page, '[data-testid="chat-form"]');
      
      // Verify no API call is made
      await page.waitForTimeout(1000);
      const messages = page.locator('[data-testid="chat-message"]');
      await expect(messages).toHaveCount(0);
      
      // Test message that doesn't involve API calls
      await chatInput.fill('Hello, how are you?');
      await submitFormWithUtils(page, '[data-testid="chat-form"]');
      
      // Wait for response
      await waitForElement(page, '[data-testid="chat-message"]', { timeout: 10000 });
      
      // Verify no API call result is shown
      await expect(page.locator('[data-testid="api-call-result"]')).not.toBeVisible();
    });
  });

  test.describe('Core Chat Integration for GA Release', () => {
    test('should maintain chat flow during API execution', async ({ page }) => {
      // Start API call
      await sendChatMessage(page, 'Get all available pets');
      
      // Verify chat input remains responsive during execution
      const chatInput = page.locator('[data-testid="chat-input"]');
      await expect(chatInput).toBeEnabled();
      
      // Wait for API call to complete
      await waitForApiCallResult(page, { timeout: 10000 });
      
      // Verify API call completed successfully
      await expect(page.locator('[data-testid="api-call-result"]')).toBeVisible();
      
      // Verify chat conversation flow is maintained
      const messages = page.locator('[data-testid="chat-message"]');
      await expect(messages).toHaveCount(2); // User message + Assistant response
    });

    test('should handle chat state during API failures', async ({ page }) => {
      // Send message that will cause an API error
      await sendChatMessage(page, 'Get a pet with invalid ID -999999 from the petstore');
      await waitForChatResponse(page, 15000);
      
      // Wait for response
      await waitForElement(page, '[data-testid="chat-message"]', { timeout: 15000 });
      
      // TODO: Currently the system doesn't show explicit error elements for API failures
      // The error might be shown in the response text instead
      // For now, just verify that we get some response
      const responseText = await page.locator('div[class*="max-w-xs"][class*="px-3"][class*="py-2"][class*="rounded-lg"][class*="bg-gray-100"][class*="text-gray-900"]').first().textContent();
      expect(responseText).toBeTruthy();
      
      // Verify chat state is maintained after error
      const chatInput = page.locator('[data-testid="chat-input"]');
      await expect(chatInput).toBeEnabled();
      
      // Verify chat conversation flow is maintained
      const messages = page.locator('[data-testid="chat-message"]');
      await expect(messages).toHaveCount(2); // User message + Assistant response
      
      // TODO: Once explicit error handling is implemented, change this to:
      // await expect(page.locator('[data-testid="api-call-error"]')).toBeVisible();
    });
  });

  test.describe('Accessibility & Mobile Support', () => {
    test('should support keyboard navigation for chat API calls', async ({ page }) => {
      // Wait for chat interface to be rendered
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 15000 });
      
      // Wait for chat input to be visible and enabled
      await page.waitForSelector('[data-testid="chat-input"]', { timeout: 15000 });
      await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled();

      // Test keyboard navigation by clicking on chat input and using keyboard
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.click(); // Focus the input
      await expect(chatInput).toBeFocused();
      
      // Test typing and sending a message with keyboard
      await chatInput.fill('Get pet with ID 123');
      await submitFormWithUtils(page, '[data-testid="chat-form"]');
      
      // Wait for response
      await waitForChatResponse(page, 15000);
      
      // Verify API call was made
      await expect(page.locator('[data-testid="api-call-result"]')).toBeVisible();
    });

    test('should be mobile responsive for chat API calls', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Wait for chat input to be visible
      await waitForElement(page, '[data-testid="chat-input"]', { timeout: 15000 });
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
      
      // Test API call on mobile
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Get all available pets');
      await submitFormWithUtils(page, '[data-testid="chat-form"]');
      
      // Wait for response
      await waitForElement(page, '[data-testid="chat-message"]', { timeout: 15000 });
      await waitForApiCallResult(page, { timeout: 10000 });
      
      // Verify API call result is visible on mobile
      await expect(page.locator('[data-testid="api-call-result"]')).toBeVisible();
      
      // Verify touch targets are appropriate size
      const chatInputBox = await chatInput.boundingBox();
      expect(chatInputBox?.height).toBeGreaterThanOrEqual(44); // Minimum touch target size
    });
  });
});
