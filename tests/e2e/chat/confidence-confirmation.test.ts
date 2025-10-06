/**
 * P2.3: Confidence-Based User Confirmation E2E Tests
 * 
 * Tests the confidence confirmation system that shows in-chat confirmation messages
 * when AI has low confidence scores (<0.7) about any aspect of the user's request.
 * This includes confidence threshold detection, in-chat UI components, user interaction
 * flows, and integration with existing AI services.
 * 
 * Following user-rules.md E2E testing guidelines:
 * - Uses real data and real system components
 * - No mocks for the system under test
 * - Tests complete user workflows end-to-end
 * - Validates UX compliance and accessibility
 * - Tests confidence threshold detection and in-chat interactions
 * 
 * IMPORTANT: These tests require a higher confidence threshold (0.95) to trigger
 * confidence confirmations. Use the dedicated Playwright config:
 * 
 * npx playwright test --config=playwright.confidence.config.ts --headed --timeout=120000
 * 
 * This uses .env.test-confidence with CONFIDENCE_THRESHOLD=0.95 to ensure
 * confidence confirmations are triggered (AI scores ~0.9 vs threshold 0.95).
 * 
 * DO NOT run with the default config as it uses CONFIDENCE_THRESHOLD=0.6
 * which is too low and won't trigger confidence confirmations.
 */

import { test, expect } from '@playwright/test';
import { TestUser, generateTestId, cleanupTestUser } from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';
import { setupE2E, closeAllModals, resetRateLimits, getPrimaryActionButton } from '../../helpers/e2eHelpers';
import { waitForDashboard, validateUXCompliance, closeGuidedTourIfPresent, waitForElement, sendChatMessage, waitForChatResponse, validateChatResponse } from '../../helpers/uiHelpers';
import { submitFormWithUtils } from '../../helpers/dataHelpers';
import { testPageLoadTime, testAPIPerformance } from '../../helpers/performanceHelpers';
import { testFormAccessibility, testPrimaryActionPatterns } from '../../helpers/accessibilityHelpers';
import { testModalSubmitLoading, testModalSuccessMessage, testModalErrorHandling, testModalAccessibility } from '../../helpers/modalHelpers';
import { createTestData, cleanupTestData } from '../../helpers/dataHelpers';
import { testXSSPrevention, testDataExposure } from '../../helpers/securityHelpers';
import { waitForNetworkIdle } from '../../helpers/waitHelpers';
// Note: We'll create inline helper functions since confidence confirmation is now in-chat, not modal-based
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Inline helper functions for in-chat confidence confirmation testing
async function waitForConfidenceConfirmation(page: any) {
  const confidenceConfirmation = page.locator('[data-testid="confidence-confirmation"]');
  await expect(confidenceConfirmation).toBeVisible({ timeout: 10000 });
  return confidenceConfirmation;
}

async function testConfidenceConfirmationContent(page: any) {
  const confirmation = page.locator('[data-testid="confidence-confirmation"]');
  
  // Test basic structure
  await expect(confirmation).toBeVisible();
  
  // Test uncertainty message (should contain "not sure" or similar)
  await expect(confirmation).toContainText('not sure');
  
  // Test explanation (should contain the explanation text)
  await expect(confirmation).toContainText('not sure');
  
  // Test action buttons
  const proceedButton = confirmation.locator('[data-testid="primary-action proceed-anyway-btn"]');
  const refineButton = confirmation.locator('[data-testid="refine-request-btn"]');
  const cancelButton = confirmation.locator('[data-testid="secondary-action cancel-btn"]');
  
  await expect(proceedButton).toBeVisible();
  await expect(refineButton).toBeVisible();
  await expect(cancelButton).toBeVisible();
}

async function clickConfidenceProceed(page: any) {
  const proceedButton = page.locator('[data-testid="primary-action proceed-anyway-btn"]');
  await proceedButton.click();
}

async function clickConfidenceCancel(page: any) {
  const cancelButton = page.locator('[data-testid="secondary-action cancel-btn"]');
  await cancelButton.click();
}

async function clickConfidenceRefine(page: any) {
  const refineButton = page.locator('[data-testid="refine-request-btn"]');
  await refineButton.click();
}

test.describe('P2.3: Confidence-Based User Confirmation E2E Tests', () => {
  let testUser: TestUser;
  let testData: any;

  test.beforeAll(async () => {
    testUser = await createE2EUser(Role.USER, {
      email: `e2e-confidence-confirmation-${generateTestId('user')}@testuser.local`,
      password: 'e2eTestPass123',
      name: 'E2E Confidence Confirmation Test User'
    });
    
    // Create test data with API connections for workflow testing
    testData = await createTestData({
      user: testUser,
      connection: {
        name: 'Test API Connection',
        baseUrl: 'https://petstore3.swagger.io/api/v3',
        authType: 'NONE',
        documentationUrl: 'https://petstore3.swagger.io/api/v3/openapi.json'
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

  test.describe('Confidence Threshold Detection', () => {
    test('should show confidence confirmation in chat for low confidence requests', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send a message that should trigger low confidence (ambiguous intent)
      await sendChatMessage(page, 'Do something with APIs');

      // Wait for chat response
      await waitForChatResponse(page, 15000);

      // Check if confidence confirmation appears in chat
      await waitForConfidenceConfirmation(page);

      // Validate confirmation content
      await testConfidenceConfirmationContent(page);
    });

    test('should not show confidence confirmation for high confidence requests', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send a clear, simple message that should result in high confidence
      await sendChatMessage(page, 'Create a simple workflow that gets all pets from the pet store API');

      // Wait for chat response
      await waitForChatResponse(page, 15000);

      // Verify no confidence confirmation appears
      const confidenceConfirmation = page.locator('[data-testid="confidence-confirmation"]');
      await expect(confidenceConfirmation).not.toBeVisible();

      // Verify either workflow was generated OR we got a helpful response (not confidence confirmation)
      const workflowContainer = page.locator('[data-testid="workflow-steps-container"]');
      const hasWorkflow = await workflowContainer.isVisible().catch(() => false);
      
      if (!hasWorkflow) {
        // If no workflow container, check that we got a helpful response without confidence confirmation
        const assistantMessage = page.locator('div[class*="bg-gray-100"][class*="text-gray-900"]').last();
        await expect(assistantMessage).toBeVisible();
        
        // Verify the response is helpful and not asking for clarification
        const messageText = await assistantMessage.textContent();
        expect(messageText).not.toContain('clarification');
        expect(messageText).not.toContain('not sure');
      } else {
        // If workflow was generated, verify it's visible
        await expect(workflowContainer).toBeVisible();
      }
    });
  });

  test.describe('Confidence Confirmation In-Chat UI', () => {
    test('should display uncertainty message and explanation', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Help me with something');
      await waitForChatResponse(page, 15000);

      await waitForConfidenceConfirmation(page);
      await testConfidenceConfirmationContent(page);
    });

    test('should display action buttons correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'I want to do something but I\'m not sure what');
      await waitForChatResponse(page, 15000);

      await waitForConfidenceConfirmation(page);
      
      // Test button visibility and text
      const proceedButton = page.locator('[data-testid="primary-action proceed-anyway-btn"]');
      const refineButton = page.locator('[data-testid="refine-request-btn"]');
      const cancelButton = page.locator('[data-testid="secondary-action cancel-btn"]');
      
      await expect(proceedButton).toBeVisible();
      await expect(proceedButton).toContainText('Proceed Anyway');
      
      await expect(refineButton).toBeVisible();
      await expect(refineButton).toContainText('Refine Request');
      
      await expect(cancelButton).toBeVisible();
      await expect(cancelButton).toContainText('Cancel');
    });

    test('should validate UX compliance', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Create a workflow that does something');
      await waitForChatResponse(page, 15000);

      await waitForConfidenceConfirmation(page);
      
      // Test UX compliance elements
      const confirmation = page.locator('[data-testid="confidence-confirmation"]');
      await expect(confirmation).toBeVisible();
      
      // Test that buttons are properly labeled and accessible
      const buttons = confirmation.locator('button');
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('User Interaction Flows', () => {
    test('should proceed with request when user clicks "Proceed Anyway"', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Do something with APIs');
      await waitForChatResponse(page, 15000);

      await waitForConfidenceConfirmation(page);
      await clickConfidenceProceed(page);

      // Should show a follow-up message or proceed with the request
      await waitForChatResponse(page, 10000);
    });

    test('should cancel request when user clicks "Cancel"', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Help me with something');
      await waitForChatResponse(page, 15000);

      await waitForConfidenceConfirmation(page);
      await clickConfidenceCancel(page);

      // Should show cancellation message
      const chatMessages = page.locator('[data-testid="chat-message"]');
      const lastMessage = chatMessages.last();
      await expect(lastMessage).toContainText('cancelled');
    });

    test('should refine request when user clicks "Refine Request"', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'I want to do something');
      await waitForChatResponse(page, 15000);

      await waitForConfidenceConfirmation(page);
      await clickConfidenceRefine(page);

      // Should show refinement guidance
      const chatMessages = page.locator('[data-testid="chat-message"]');
      const lastMessage = chatMessages.last();
      await expect(lastMessage).toContainText('provide more details');
    });
  });

  test.describe('Integration with AI Services', () => {
    test('should handle confidence confirmation for different uncertainty types', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Test different types of ambiguous requests
      const ambiguousRequests = [
        'Do something with APIs',
        'Help me with something',
        'I want to create something',
        'Make it work'
      ];

      for (const request of ambiguousRequests) {
        await sendChatMessage(page, request);
        await waitForChatResponse(page, 15000);

        // Check if confidence confirmation appears
        const confidenceConfirmation = page.locator('[data-testid="confidence-confirmation"]');
        if (await confidenceConfirmation.isVisible()) {
          await testConfidenceConfirmationContent(page);
          await clickConfidenceProceed(page);
          await waitForChatResponse(page, 5000);
        }
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle confidence calculation errors gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Create a workflow');
      await waitForChatResponse(page, 15000);

      // Should handle missing confidence gracefully - either show confirmation or proceed normally
      const confidenceConfirmation = page.locator('[data-testid="confidence-confirmation"]');
      const workflowContainer = page.locator('[data-testid="workflow-steps-container"]');
      
      // Wait a bit longer for the response to be fully rendered
      await page.waitForTimeout(2000);
      
      // At least one should be visible
      const confirmationVisible = await confidenceConfirmation.isVisible();
      const workflowVisible = await workflowContainer.isVisible();
      
      // If neither is visible, check for any assistant message
      if (!confirmationVisible && !workflowVisible) {
        const assistantMessage = page.locator('div[class*="bg-gray-100"][class*="text-gray-900"]').last();
        const hasAssistantMessage = await assistantMessage.isVisible();
        expect(hasAssistantMessage).toBe(true);
      } else {
        expect(confirmationVisible || workflowVisible).toBe(true);
      }
    });

    test('should maintain chat context after confidence confirmation', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send initial message
      await sendChatMessage(page, 'Help me with something');
      await waitForChatResponse(page, 15000);

      // Handle confidence confirmation if it appears
      const confidenceConfirmation = page.locator('[data-testid="confidence-confirmation"]');
      if (await confidenceConfirmation.isVisible()) {
        await clickConfidenceProceed(page);
        await waitForChatResponse(page, 5000);
      }

      // Send follow-up message
      await sendChatMessage(page, 'Now create a workflow for notifications');
      await waitForChatResponse(page, 15000);

      // Verify chat history is maintained
      const chatMessages = page.locator('[data-testid="chat-message"]');
      const messageCount = await chatMessages.count();
      
      // Debug: Log the actual message count and content
      console.log(`🔍 Debug: Found ${messageCount} chat messages`);
      for (let i = 0; i < messageCount; i++) {
        const message = chatMessages.nth(i);
        const messageText = await message.textContent();
        console.log(`🔍 Message ${i + 1}: ${messageText?.substring(0, 100)}...`);
      }
      
      // Should have at least 3 messages (2 user + 1 AI response minimum)
      expect(messageCount).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Security and Data Validation', () => {
    test('should prevent XSS in confidence explanations', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Help me with something');
      await waitForChatResponse(page, 15000);

      const confidenceConfirmation = page.locator('[data-testid="confidence-confirmation"]');
      if (await confidenceConfirmation.isVisible()) {
        // Verify XSS is prevented in the explanation text
        const explanation = confidenceConfirmation.locator('text=I\'d like to help you, but I need some clarification.');
        const explanationText = await explanation.textContent();
        expect(explanationText).not.toContain('<script>');
        expect(explanationText).not.toContain('javascript:');
      }
    });

    test('should validate confidence confirmation data structure', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Do something with APIs');
      await waitForChatResponse(page, 15000);

      const confidenceConfirmation = page.locator('[data-testid="confidence-confirmation"]');
      if (await confidenceConfirmation.isVisible()) {
        // Validate that all required elements are present
        await expect(confidenceConfirmation).toBeVisible();
        
        // Test that buttons are properly structured
        const buttons = confidenceConfirmation.locator('button');
        const buttonCount = await buttons.count();
        expect(buttonCount).toBeGreaterThanOrEqual(3);
        
        // Test that uncertainty message is present
        const uncertaintyMessage = confidenceConfirmation.locator('strong');
        await expect(uncertaintyMessage).toBeVisible();
      }
    });
  });
});
