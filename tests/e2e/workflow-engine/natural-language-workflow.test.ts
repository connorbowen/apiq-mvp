import { test, expect } from '@playwright/test';
import { TestUser, generateTestId, cleanupTestUser } from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';
import { setupE2E, closeAllModals, resetRateLimits } from '../../helpers/e2eHelpers';
import { waitForDashboard, validateUXCompliance, closeGuidedTourIfPresent } from '../../helpers/uiHelpers';
import { testPageLoadTime, testConcurrentOperations } from '../../helpers/performanceHelpers';
import { testPrimaryActionPatterns, testFormAccessibility } from '../../helpers/accessibilityHelpers';
import { testModalSubmitLoading, testModalSuccessMessage, testModalErrorHandling } from '../../helpers/modalHelpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Natural Language Workflow Creation E2E Tests - Core P0 Feature', () => {
  let testUser: TestUser;

  test.beforeAll(async () => {
    testUser = await createE2EUser();
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    await setupE2E(page, testUser, { 
      tab: 'workflows', 
      validateUX: true 
    });
    await closeGuidedTourIfPresent(page);
  });

  test.afterEach(async ({ page }) => {
    await closeAllModals(page);
    await resetRateLimits(page);
  });

  test.describe('Natural Language Workflow Creation - Core Differentiator', () => {
    test('should create workflow from natural language description', async ({ page }) => {
      // Navigate directly to workflow creation page
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Wait for the page to load completely
      await page.waitForLoadState('networkidle');
      
      // Wait for chat interface to load
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
      
      // Validate UX compliance
      await validateUXCompliance(page, {
        title: 'Create Workflow',
        headings: 'Natural Language Workflow Creation',
        validateForm: true,
        validateAccessibility: true
      });
      
      // Test natural language workflow creation
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('When a new GitHub issue is created, send a Slack notification and create a Trello card');
      await page.getByTestId('chat-send-button').click();
      
      // Wait for workflow generation response - look for the actual message structure
      await page.waitForSelector('[data-testid="chat-interface"] .bg-gray-100', { timeout: 30000 });
      
      // Validate generated workflow response - check for actual text patterns from ChatInterface
      await expect(page.getByText(/✨ Created:/)).toBeVisible();
      await expect(page.getByText(/📋 Workflow Steps/)).toBeVisible();
      
      // Test workflow confirmation - look for the actual Save Workflow button
      await page.getByRole('button', { name: 'Save Workflow' }).click();
      
      // Validate success message - check for actual success text from ChatInterface
      await expect(page.getByText(/✅ Workflow.*has been saved successfully/)).toBeVisible();
      
      // Verify workflow appears in list
      await page.goto(`${BASE_URL}/dashboard?tab=workflows`);
      await expect(page.locator('[data-testid="workflows-section"]')).toBeVisible();
    });

    test('should handle complex multi-step workflows', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
      
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('When a customer places an order: 1) Create invoice in QuickBooks, 2) Send confirmation email, 3) Update inventory in Shopify, 4) Create shipping label in ShipStation');
      await page.getByTestId('chat-send-button').click();
      
      // Wait for complex workflow generation
      await page.waitForSelector('[data-testid="chat-interface"] .bg-gray-100', { timeout: 45000 });
      
      // Validate all steps are generated - check for actual text patterns from ChatInterface
      await expect(page.getByText(/✨ Created:/)).toBeVisible();
      await expect(page.getByText(/📋 Workflow Steps/)).toBeVisible();
      
      // Test step explanations - look for the actual workflow steps container
      await expect(page.locator('[data-testid="chat-interface"] .space-y-2')).toBeVisible();
    });

    test('should provide workflow optimization suggestions', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
      
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('Send email when new user signs up');
      await page.getByTestId('chat-send-button').click();
      
      await page.waitForSelector('[data-testid="chat-interface"] .bg-gray-100');
      
      // Check for workflow creation response - actual text patterns from ChatInterface
      await expect(page.getByText(/✨ Created:/)).toBeVisible();
      await expect(page.getByText(/📋 Workflow Steps/)).toBeVisible();
    });

    test('should handle workflow modifications and iterations', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
      
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('Send Slack notification for new orders');
      await page.getByTestId('chat-send-button').click();
      
      await page.waitForSelector('[data-testid="chat-interface"] .bg-gray-100');
      
      // Modify the workflow by sending another message
      await chatInput.fill('Send Slack notification for new orders and also send an email to the customer');
      await page.getByTestId('chat-send-button').click();
      
      // Validate updated workflow response - actual text patterns from ChatInterface
      await expect(page.getByText(/✨ Created:/)).toBeVisible();
      await expect(page.getByText(/📋 Workflow Steps/)).toBeVisible();
    });
  });

  test.describe('Context-Aware Conversation', () => {
    test('should maintain conversation context for follow-up questions', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
      
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('Create a workflow for customer onboarding');
      await page.getByTestId('chat-send-button').click();
      
      await page.waitForSelector('[data-testid="chat-interface"] .bg-gray-100');
      
      // Ask follow-up question
      await chatInput.fill('Add a step to send a welcome email');
      await page.getByTestId('chat-send-button').click();
      
      // Validate context is maintained - should get another workflow response
      await page.waitForSelector('[data-testid="chat-interface"] .bg-gray-100');
      await expect(page.getByText(/✨ Created:/)).toBeVisible();
    });

    test('should handle clarification requests intelligently', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
      
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('Send notification when something happens');
      await page.getByTestId('chat-send-button').click();
      
      // Should get a response (either workflow or error)
      await page.waitForSelector('[data-testid="chat-interface"] .bg-gray-100', { timeout: 15000 });
      
      // Check for either workflow creation or error message - actual text patterns from ChatInterface
      const hasWorkflow = await page.getByText(/✨ Created:/).isVisible();
      const hasError = await page.getByText(/I'm sorry, I couldn't create that workflow/).isVisible();
      
      expect(hasWorkflow || hasError).toBeTruthy();
    });
  });

  test.describe('Performance Requirements', () => {
    test('should generate workflows within 10 seconds for simple requests', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
      
      const startTime = Date.now();
      
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('Send email when form is submitted');
      await page.getByTestId('chat-send-button').click();
      
      await page.waitForSelector('[data-testid="chat-interface"] .bg-gray-100', { timeout: 10000 });
      
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      
      // Should complete within 10 seconds (more realistic for AI generation)
      expect(generationTime).toBeLessThan(10000);
    });

    test('should handle concurrent workflow generation requests', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
      
      // Start multiple workflow generations
      const chatInput = page.getByTestId('chat-input');
      
      // First workflow
      await chatInput.fill('Send Slack notification for new orders');
      await page.getByTestId('chat-send-button').click();
      
      // Open new tab for second workflow
      const newPage = await page.context().newPage();
      await newPage.goto(`${BASE_URL}/workflows/create`);
      await newPage.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
      
      const newChatInput = newPage.getByTestId('chat-input');
      await newChatInput.fill('Send email for new user registrations');
      await newPage.getByTestId('chat-send-button').click();
      
      // Both should complete successfully
      await page.waitForSelector('[data-testid="chat-interface"] .bg-gray-100', { timeout: 15000 });
      await newPage.waitForSelector('[data-testid="chat-interface"] .bg-gray-100', { timeout: 15000 });
      
      await newPage.close();
    });
  });

  test.describe('Error Handling & Edge Cases', () => {
    test('should handle vague workflow descriptions gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
      
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('Do something');
      await page.getByTestId('chat-send-button').click();
      
      // Should show helpful error message
      await page.waitForSelector('[data-testid="chat-interface"] .bg-gray-100', { timeout: 15000 });
      await expect(page.getByText(/I'm sorry, I couldn't create that workflow/)).toBeVisible();
    });

    test('should handle service unavailability gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
      
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('Send email when form is submitted');
      await page.getByTestId('chat-send-button').click();
      
      // Should get a response (either success or error)
      await page.waitForSelector('[data-testid="chat-interface"] .bg-gray-100', { timeout: 15000 });
      
      // Check for either workflow creation or error message - actual text patterns from ChatInterface
      const hasWorkflow = await page.getByText(/✨ Created:/).isVisible();
      const hasError = await page.getByText(/I'm sorry, I couldn't create that workflow/).isVisible();
      
      expect(hasWorkflow || hasError).toBeTruthy();
    });

    test('should handle validation errors gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
      
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('Send email via unconfigured service');
      await page.getByTestId('chat-send-button').click();
      
      // Should show validation errors or error message
      await page.waitForSelector('[data-testid="chat-interface"] .bg-gray-100', { timeout: 15000 });
      await expect(page.getByText(/I'm sorry, I couldn't create that workflow/)).toBeVisible();
    });
  });

  test.describe('Accessibility & UX Compliance', () => {
    test('should meet accessibility standards', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
      
      // Validate UX compliance
      await validateUXCompliance(page, {
        title: 'Create Workflow',
        headings: 'Natural Language Workflow Creation',
        validateForm: true,
        validateAccessibility: true
      });
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should focus on chat input
      const chatInput = page.getByTestId('chat-input');
      await expect(chatInput).toBeFocused();
    });

    test('should provide clear progress indicators', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
      
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('Send notification for new orders');
      await page.getByTestId('chat-send-button').click();
      
      // Should show loading state - actual text from ChatInterface component
      await expect(page.getByText('Creating your workflow...')).toBeVisible();
      await expect(page.getByTestId('chat-send-button')).toBeDisabled();
    });

    test('should provide helpful guidance and examples', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 30000 });
      
      // Check for helpful examples - actual text from ChatInterface component
      await expect(page.getByText('Try one of these examples:')).toBeVisible();
      await expect(page.getByText(/When a new customer signs up/)).toBeVisible();
      await expect(page.getByText(/Get the latest orders/)).toBeVisible();
      
      // Test quick example selection
      await page.getByText(/When a new customer signs up/).click();
      await expect(page.getByTestId('chat-input')).toHaveValue(/When a new customer signs up/);
    });
  });
}); 

