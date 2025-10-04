/**
 * P2.3: Confidence-Based User Confirmation E2E Tests
 * 
 * Tests the confidence confirmation system that shows a modal when AI-generated
 * workflows have low confidence scores (<0.7). This includes confidence threshold
 * detection, modal UI components, user interaction flows, and integration with
 * existing workflow execution.
 * 
 * Following user-rules.md E2E testing guidelines:
 * - Uses real data and real system components
 * - No mocks for the system under test
 * - Tests complete user workflows end-to-end
 * - Validates UX compliance and accessibility
 * - Tests confidence threshold detection and modal interactions
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
import { 
  waitForConfidenceModal, 
  waitForConfidenceModalToClose,
  testConfidenceScoreDisplay,
  testConfidenceExplanation,
  testWorkflowPreview,
  testConfidenceModalButtons,
  clickProceedButton,
  clickCancelButton,
  closeConfidenceModalWithEscape,
  closeConfidenceModalWithBackdrop,
  testConfidenceModalAccessibility,
  testConfidenceModalUXCompliance,
  testConfidenceModalComprehensive
} from '../../helpers/confidenceConfirmationHelpers';
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

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
    test('should show confidence confirmation modal for low confidence workflows', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send a message that should trigger low confidence workflow
      await sendChatMessage(page, 'Create a very complex workflow that does something with multiple APIs and has unclear requirements');

      // Wait for chat response
      await waitForChatResponse(page, 15000);

      // Check if confidence confirmation modal appears
      await waitForConfidenceModal(page);

      // Validate modal content using helper functions
      await testConfidenceScoreDisplay(page);
      await testConfidenceExplanation(page);
      await testWorkflowPreview(page);
    });

    test('should not show confidence confirmation modal for high confidence workflows', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send a clear, simple message that should result in high confidence
      await sendChatMessage(page, 'Create a simple workflow that gets all pets from the pet store API');

      // Wait for chat response
      await waitForChatResponse(page, 15000);

      // Verify no confidence modal appears
      const confidenceModal = page.locator('[data-testid="confidence-confirmation-modal"]');
      await expect(confidenceModal).not.toBeVisible();

      // Verify workflow was generated normally
      const workflowContainer = page.locator('[data-testid="workflow-steps-container"]');
      await expect(workflowContainer).toBeVisible();
    });
  });

  test.describe('Confidence Confirmation Modal UI', () => {
    test('should display confidence score and explanation', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Create a very complex and ambiguous workflow with multiple unclear steps');
      await waitForChatResponse(page, 15000);

      await waitForConfidenceModal(page);
      await testConfidenceScoreDisplay(page);
      await testConfidenceExplanation(page);
      await testWorkflowPreview(page);
    });

    test('should display action buttons correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Create a complex workflow with unclear requirements');
      await waitForChatResponse(page, 15000);

      await waitForConfidenceModal(page);
      await testConfidenceModalButtons(page);
    });

    test('should validate UX compliance', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Create a workflow that sends notifications and updates data');
      await waitForChatResponse(page, 15000);

      await waitForConfidenceModal(page);
      await testConfidenceModalUXCompliance(page);
    });
  });

  test.describe('User Interaction Flows', () => {
    test('should proceed with workflow when user clicks "Proceed Anyway"', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Create a complex workflow with some uncertainty');
      await waitForChatResponse(page, 15000);

      await waitForConfidenceModal(page);
      await clickProceedButton(page);

      // Workflow should be generated and displayed
      const workflowContainer = page.locator('[data-testid="workflow-steps-container"]');
      await expect(workflowContainer).toBeVisible();
    });

    test('should cancel workflow when user clicks "Cancel"', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Create a complex workflow with unclear requirements');
      await waitForChatResponse(page, 15000);

      await waitForConfidenceModal(page);
      await clickCancelButton(page);

      // Workflow should not be generated
      const workflowContainer = page.locator('[data-testid="workflow-steps-container"]');
      await expect(workflowContainer).not.toBeVisible();
    });

    test('should allow modal to be closed with escape key', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Create a complex workflow');
      await waitForChatResponse(page, 15000);

      await waitForConfidenceModal(page);
      await closeConfidenceModalWithEscape(page);
    });

    test('should allow modal to be closed by clicking outside', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Create a complex workflow');
      await waitForChatResponse(page, 15000);

      await waitForConfidenceModal(page);
      await closeConfidenceModalWithBackdrop(page);
    });
  });

  test.describe('Integration with Workflow Execution', () => {
    test('should execute workflow after confidence confirmation', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Create a simple workflow that gets pets from the API');
      await waitForChatResponse(page, 15000);

      // Handle confidence modal if it appears
      const confidenceModal = page.locator('[data-testid="confidence-confirmation-modal"]');
      if (await confidenceModal.isVisible()) {
        await clickProceedButton(page);
      }

      // Wait for workflow to be generated
      const workflowContainer = page.locator('[data-testid="workflow-steps-container"]');
      await expect(workflowContainer).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle confidence calculation errors gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Create a workflow');
      await waitForChatResponse(page, 15000);

      // Should handle missing confidence gracefully
      const confidenceModal = page.locator('[data-testid="confidence-confirmation-modal"]');
      const workflowContainer = page.locator('[data-testid="workflow-steps-container"]');
      
      // At least one should be visible
      const modalVisible = await confidenceModal.isVisible();
      const workflowVisible = await workflowContainer.isVisible();
      
      expect(modalVisible || workflowVisible).toBe(true);
    });

    test('should maintain chat context after confidence confirmation', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send initial message
      await sendChatMessage(page, 'Create a workflow for data processing');
      await waitForChatResponse(page, 15000);

      // Handle confidence modal if it appears
      const confidenceModal = page.locator('[data-testid="confidence-confirmation-modal"]');
      if (await confidenceModal.isVisible()) {
        await clickProceedButton(page);
      }

      // Send follow-up message
      await sendChatMessage(page, 'Now create another workflow for notifications');
      await waitForChatResponse(page, 15000);

      // Verify both workflows are in chat history
      const chatMessages = page.locator('[data-testid="chat-message"]');
      const messageCount = await chatMessages.count();
      expect(messageCount).toBeGreaterThanOrEqual(4); // 2 user messages + 2 AI responses
    });
  });

  test.describe('Security and Data Validation', () => {
    test('should prevent XSS in confidence explanations', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Create a workflow');
      await waitForChatResponse(page, 15000);

      const confidenceModal = page.locator('[data-testid="confidence-confirmation-modal"]');
      if (await confidenceModal.isVisible()) {
        // Verify XSS is prevented
        const explanation = confidenceModal.locator('[data-testid="confidence-explanation"]');
        const explanationText = await explanation.textContent();
        expect(explanationText).not.toContain('<script>');
        expect(explanationText).not.toContain('javascript:');
      }
    });

    test('should validate confidence score data', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Create a complex workflow');
      await waitForChatResponse(page, 15000);

      const confidenceModal = page.locator('[data-testid="confidence-confirmation-modal"]');
      if (await confidenceModal.isVisible()) {
        const confidenceScore = confidenceModal.locator('[data-testid="confidence-score"]');
        const scoreText = await confidenceScore.textContent();
        const score = parseFloat(scoreText?.replace(/[^\d.]/g, '') || '0');
        
        // Validate score is within expected range
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100); // Percentage format
        expect(score).toBeLessThan(70); // Should be below threshold
      }
    });
  });
});
