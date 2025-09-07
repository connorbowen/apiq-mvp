/**
 * P1.5: Real Usage Tracking E2E Tests
 * 
 * Tests the live usage tracking functionality including OpenAI chat usage,
 * workflow generation usage, API execution usage, and real-time cost calculation.
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
import { waitForDashboard, validateUXCompliance, closeGuidedTourIfPresent, waitForElement, sendChatMessage, waitForChatResponse } from '../../helpers/uiHelpers';
import { testPageLoadTime, testAPIPerformance } from '../../helpers/performanceHelpers';
import { testFormAccessibility, testPrimaryActionPatterns } from '../../helpers/accessibilityHelpers';
import { testModalSubmitLoading, testModalSuccessMessage, testModalErrorHandling } from '../../helpers/modalHelpers';
import { createTestData, cleanupTestData, createTestApiConnection, cleanupTestApiConnections } from '../../helpers/dataHelpers';
import { testXSSPrevention, testDataExposure } from '../../helpers/securityHelpers';
import { waitForNetworkIdle } from '../../helpers/waitHelpers';
import { 
  createUsageTestData, 
  cleanupUsageTestData, 
  verifyUsageTracking,
  simulateUsage,
  resetUsageLimits,
  testRealTimeUsageUpdates
} from '../../helpers/usageHelpers';
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('P1.5: Real Usage Tracking E2E Tests', () => {
  let testUser: TestUser;
  let usageTestData: any;
  let testData: any;

  test.beforeAll(async () => {
    testUser = await createE2EUser();
    usageTestData = await createUsageTestData(testUser.id);
    
    // Create test data for workflow generation
    testData = await createTestData({
      user: testUser,
      workflow: {
        name: 'Test Usage Tracking Workflow',
        description: 'A test workflow for usage tracking'
      }
    });
    
    // Create API connection for workflow generation
    await createTestApiConnection(testUser.id);
  });

  test.afterAll(async () => {
    if (usageTestData) {
      await usageTestData.cleanup();
    }
    if (testData) {
      await cleanupTestData(testData);
    }
    await cleanupTestApiConnections(testUser.id);
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

  test.describe('OpenAI Chat Usage Tracking', () => {
    test('should track chat message usage in real-time', async ({ page }) => {
      // Reset usage for clean test
      await resetUsageLimits(testUser.id);
      
      // Navigate to chat interface
      await page.goto('/dashboard?tab=chat');
      await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 10000 });
      
      // Send a chat message
      const testMessage = 'Hello, can you help me create a workflow?';
      await sendChatMessage(page, testMessage);
      await waitForChatResponse(page);
      
      // Wait for usage to be tracked
      await page.waitForTimeout(3000);
      
      // Navigate to usage dashboard to verify tracking
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Verify usage was tracked
      await expect(page.locator('[data-testid="total-requests"]')).toContainText('1');
      await expect(page.locator('[data-testid="usage-breakdown-openai_chat"]')).toBeVisible();
      
      // Verify token usage is displayed
      const tokenCount = await page.locator('[data-testid="total-tokens"]').textContent();
      expect(parseInt(tokenCount || '0')).toBeGreaterThan(0);
      
      // Verify cost calculation
      const costDisplay = await page.locator('[data-testid="total-cost"]').textContent();
      expect(costDisplay).toMatch(/\$\d+\.\d{2}/);
    });

    test('should track multiple chat messages correctly', async ({ page }) => {
      await resetUsageLimits(testUser.id);
      
      await page.goto('/dashboard?tab=chat');
      await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 10000 });
      
      // Send multiple messages
      const messages = [
        'What is APIQ?',
        'How do I create a workflow?',
        'Can you help me with API connections?'
      ];
      
      for (const message of messages) {
        await sendChatMessage(page, message);
        await waitForChatResponse(page);
        await page.waitForTimeout(1000); // Wait between messages
      }
      
      // Wait for all usage to be tracked
      await page.waitForTimeout(5000);
      
      // Verify cumulative usage
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      await expect(page.locator('[data-testid="total-requests"]')).toContainText('3');
      
      // Verify token accumulation
      const tokenCount = await page.locator('[data-testid="total-tokens"]').textContent();
      expect(parseInt(tokenCount || '0')).toBeGreaterThan(100); // Should have significant token usage
    });

    test('should track different chat conversation types', async ({ page }) => {
      await resetUsageLimits(testUser.id);
      
      await page.goto('/dashboard?tab=chat');
      await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 10000 });
      
      // Test different types of conversations
      const conversationTypes = [
        { type: 'workflow_help', message: 'Help me create a GitHub to Slack workflow' },
        { type: 'api_question', message: 'What APIs can I connect to?' },
        { type: 'troubleshooting', message: 'My workflow is not working, can you help?' },
        { type: 'general_question', message: 'What is the best way to use APIQ?' }
      ];
      
      for (const conversation of conversationTypes) {
        await sendChatMessage(page, conversation.message);
        await waitForChatResponse(page);
        await page.waitForTimeout(1000);
      }
      
      await page.waitForTimeout(5000);
      
      // Verify all conversations were tracked
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      await expect(page.locator('[data-testid="total-requests"]')).toContainText('4');
    });
  });

  test.describe('Workflow Generation Usage Tracking', () => {
    test('should track workflow generation usage', async ({ page }) => {
      await resetUsageLimits(testUser.id);
      
      // Navigate to workflow creation
      await page.goto('/workflows/create');
      await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 30000 });
      
      // Generate a workflow
      const workflowRequest = 'Create a workflow that sends a Slack notification when a new GitHub issue is created';
      await sendChatMessage(page, workflowRequest);
      await waitForChatResponse(page);
      
      // Wait for workflow generation to complete
      await page.waitForTimeout(5000);
      
      // Verify usage was tracked
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Should have both chat and workflow generation usage
      await expect(page.locator('[data-testid="usage-breakdown-openai_chat"]')).toBeVisible();
      await expect(page.locator('[data-testid="usage-breakdown-openai_workflow_generation"]')).toBeVisible();
      
      // Verify total requests include both types
      const totalRequests = await page.locator('[data-testid="total-requests"]').textContent();
      expect(parseInt(totalRequests || '0')).toBeGreaterThanOrEqual(2);
    });

    test('should track complex workflow generation usage', async ({ page }) => {
      await resetUsageLimits(testUser.id);
      
      await page.goto('/workflows/create');
      await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 30000 });
      
      // Generate a complex multi-step workflow
      const complexWorkflowRequest = 'Create a workflow that: 1) Monitors GitHub issues, 2) Filters by label "bug", 3) Creates a Trello card, 4) Sends a Slack notification, and 5) Updates a Google Sheet';
      await sendChatMessage(page, complexWorkflowRequest);
      await waitForChatResponse(page);
      
      await page.waitForTimeout(8000); // Longer wait for complex workflow
      
      // Verify usage tracking
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Complex workflows should generate more tokens
      const tokenCount = await page.locator('[data-testid="total-tokens"]').textContent();
      expect(parseInt(tokenCount || '0')).toBeGreaterThan(500); // Complex workflow should use more tokens
      
      // Verify cost reflects complexity
      const costDisplay = await page.locator('[data-testid="total-cost"]').textContent();
      const cost = parseFloat(costDisplay?.replace('$', '') || '0');
      expect(cost).toBeGreaterThan(0.01); // Should have meaningful cost
    });

    test('should track workflow generation errors as usage', async ({ page }) => {
      await resetUsageLimits(testUser.id);
      
      await page.goto('/workflows/create');
      await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 30000 });
      
      // Try to generate an invalid workflow
      const invalidRequest = 'Create a workflow that does something impossible with APIs that don\'t exist';
      await sendChatMessage(page, invalidRequest);
      await waitForChatResponse(page);
      
      await page.waitForTimeout(3000);
      
      // Even failed generations should be tracked as usage
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      await expect(page.locator('[data-testid="total-requests"]')).toContainText('1');
      
      // Should still have token usage even for failed generation
      const tokenCount = await page.locator('[data-testid="total-tokens"]').textContent();
      expect(parseInt(tokenCount || '0')).toBeGreaterThan(0);
    });
  });

  test.describe('API Execution Usage Tracking', () => {
    test('should track workflow execution usage', async ({ page }) => {
      await resetUsageLimits(testUser.id);
      
      // First create a simple workflow
      await page.goto('/workflows/create');
      await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 30000 });
      
      const workflowRequest = 'Create a simple workflow that gets the current weather';
      await sendChatMessage(page, workflowRequest);
      await waitForChatResponse(page);
      
      await page.waitForTimeout(5000);
      
      // Navigate to workflows tab to execute
      await page.goto('/dashboard?tab=workflows');
      await waitForElement(page, '[data-testid="workflows-tab"]', { timeout: 10000 });
      
      // Find and execute the workflow
      const executeButton = page.locator('[data-testid="primary-action execute-workflow"]').first();
      if (await executeButton.count() > 0) {
        await executeButton.click();
        await page.waitForTimeout(3000);
      }
      
      // Verify execution usage was tracked
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Should have chat, generation, and execution usage
      const totalRequests = await page.locator('[data-testid="total-requests"]').textContent();
      expect(parseInt(totalRequests || '0')).toBeGreaterThanOrEqual(2);
    });

    test('should track step-by-step execution usage', async ({ page }) => {
      await resetUsageLimits(testUser.id);
      
      // Create a multi-step workflow
      await page.goto('/workflows/create');
      await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 30000 });
      
      const multiStepRequest = 'Create a workflow with 3 steps: 1) Get weather data, 2) Process the data, 3) Send an email';
      await sendChatMessage(page, multiStepRequest);
      await waitForChatResponse(page);
      
      await page.waitForTimeout(8000);
      
      // Execute the workflow
      await page.goto('/dashboard?tab=workflows');
      await waitForElement(page, '[data-testid="workflows-tab"]', { timeout: 10000 });
      
      const executeButton = page.locator('[data-testid="primary-action execute-workflow"]').first();
      if (await executeButton.count() > 0) {
        await executeButton.click();
        await page.waitForTimeout(5000); // Wait for multi-step execution
      }
      
      // Verify usage tracking
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Multi-step execution should generate more usage
      const tokenCount = await page.locator('[data-testid="total-tokens"]').textContent();
      expect(parseInt(tokenCount || '0')).toBeGreaterThan(200);
    });
  });

  test.describe('Real-time Usage Updates', () => {
    test('should update usage metrics in real-time', async ({ page }) => {
      await testRealTimeUsageUpdates(page, testUser.id);
    });

    test('should show live usage counter', async ({ page }) => {
      await resetUsageLimits(testUser.id);
      
      // Open usage dashboard in one tab
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Get initial count
      const initialTokens = await page.locator('[data-testid="total-tokens"]').textContent();
      
      // Open chat in new tab
      const chatPage = await page.context().newPage();
      await setupE2E(chatPage, testUser);
      await chatPage.goto('/dashboard?tab=chat');
      await waitForElement(chatPage, '[data-testid="chat-interface"]', { timeout: 10000 });
      
      // Send message in chat tab
      await sendChatMessage(chatPage, 'Test real-time usage tracking');
      await waitForChatResponse(chatPage);
      
      // Switch back to usage tab
      await page.bringToFront();
      await page.waitForTimeout(3000);
      
      // Verify usage updated
      const updatedTokens = await page.locator('[data-testid="total-tokens"]').textContent();
      expect(updatedTokens).not.toBe(initialTokens);
      
      await chatPage.close();
    });
  });

  test.describe('Usage Accuracy and Validation', () => {
    test('should accurately count tokens and costs', async ({ page }) => {
      await resetUsageLimits(testUser.id);
      
      // Send a known message and verify tracking
      await page.goto('/dashboard?tab=chat');
      await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 10000 });
      
      const testMessage = 'Count the tokens in this message: "Hello, world!"';
      await sendChatMessage(page, testMessage);
      await waitForChatResponse(page);
      
      await page.waitForTimeout(3000);
      
      // Verify usage accuracy
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Should have exactly 1 request
      await expect(page.locator('[data-testid="total-requests"]')).toContainText('1');
      
      // Token count should be reasonable for the message
      const tokenCount = await page.locator('[data-testid="total-tokens"]').textContent();
      const tokens = parseInt(tokenCount || '0');
      expect(tokens).toBeGreaterThan(10); // Should have reasonable token count
      expect(tokens).toBeLessThan(1000); // Should not be excessive
    });

    test('should handle concurrent usage correctly', async ({ page }) => {
      await resetUsageLimits(testUser.id);
      
      // Simulate concurrent usage
      const concurrentMessages = [
        'Message 1',
        'Message 2', 
        'Message 3'
      ];
      
      await page.goto('/dashboard?tab=chat');
      await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 10000 });
      
      // Send messages rapidly
      for (const message of concurrentMessages) {
        await sendChatMessage(page, message);
        await page.waitForTimeout(500); // Short delay between messages
      }
      
      await waitForChatResponse(page);
      await page.waitForTimeout(5000);
      
      // Verify all concurrent usage was tracked
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      const totalRequests = await page.locator('[data-testid="total-requests"]').textContent();
      expect(parseInt(totalRequests || '0')).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Performance and Error Handling', () => {
    test('should track usage without impacting performance', async ({ page }) => {
      await resetUsageLimits(testUser.id);
      
      // Test performance during usage tracking
      const startTime = Date.now();
      
      await page.goto('/dashboard?tab=chat');
      await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 10000 });
      
      await sendChatMessage(page, 'Performance test message');
      await waitForChatResponse(page);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within reasonable time
      expect(responseTime).toBeLessThan(10000); // 10 seconds max
      
      // Verify usage was still tracked despite performance test
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      await expect(page.locator('[data-testid="total-requests"]')).toContainText('1');
    });

    test('should handle usage tracking errors gracefully', async ({ page }) => {
      // Mock usage tracking API to return error
      await page.route('**/api/usage/track', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Usage tracking failed' })
        });
      });
      
      await page.goto('/dashboard?tab=chat');
      await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 10000 });
      
      // Chat should still work even if usage tracking fails
      await sendChatMessage(page, 'Test message with tracking error');
      await waitForChatResponse(page);
      
      // Should not break the chat functionality
      await expect(page.locator('[data-testid="chat-message"]')).toBeVisible();
    });
  });

  test.describe('Security and Data Protection', () => {
    test('should not expose sensitive usage data', async ({ page }) => {
      await testDataExposure(page, '/dashboard?tab=usage');
    });

    test('should prevent XSS in usage data', async ({ page }) => {
      await testXSSPrevention(page, '/dashboard?tab=usage');
    });

    test('should validate user permissions for usage data', async ({ page }) => {
      // Test that users can only see their own usage
      const otherUser = await createE2EUser();
      
      try {
        // Create usage for other user
        await simulateUsage(otherUser.id, 'openai_chat', 1000, 100);
        
        // Login as test user
        await setupE2E(page, testUser);
        await page.goto('/dashboard?tab=usage');
        await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
        
        // Should not see other user's usage
        const totalRequests = await page.locator('[data-testid="total-requests"]').textContent();
        expect(parseInt(totalRequests || '0')).toBe(0); // Should be 0 for test user
        
      } finally {
        await cleanupTestUser(otherUser);
      }
    });
  });
});
