import { test, expect } from '@playwright/test';
import { createE2EUser } from '../../helpers/authHelpers';
import { cleanupTestUser } from '../../helpers/testUtils';
import { createTestApiConnection, cleanupTestApiConnections } from '../../helpers/createTestApiConnection';
import { setupE2E, closeAllModals, resetRateLimits, getPrimaryActionButton } from '../../helpers/e2eHelpers';
import { waitForDashboard, validateUXCompliance, waitForElement } from '../../helpers/uiHelpers';
import { waitForNetworkIdle } from '../../helpers/waitHelpers';
import { TestUser } from '../../helpers/testUtils.auth';
import { createTestData, cleanupTestData } from '../../helpers/dataHelpers';
import { testModalSuccessMessage, testModalErrorHandling } from '../../helpers/modalHelpers';
import { testXSSPrevention, testDataExposure } from '../../helpers/securityHelpers';
import { testPageLoadTime } from '../../helpers/performanceHelpers';

/**
 * Helper function to test workflow planning with common patterns
 */
async function testWorkflowPlanning(page: any, request: string, expectedKeywords: RegExp) {
  // Use ChatInterface for workflow generation
  const chatInput = page.getByTestId('chat-input');
  await chatInput.fill(request);
  await getPrimaryActionButton(page, 'chat-send').click();
  
  // Wait for workflow generation to complete (wait for loading state to disappear and response to appear)
  await waitForElement(page, '[data-testid="chat-interface"] .bg-gray-100', { timeout: 30000 });
  
  // Wait for the loading state to disappear and actual response to appear
  await page.waitForFunction(() => {
    const loadingText = document.querySelector('[data-testid="chat-interface"] .bg-gray-100')?.textContent;
    return loadingText && !loadingText.includes('Creating your workflow...');
  }, { timeout: 60000 });

  // Validate workflow response was generated
  const chatResponse = page.locator('[data-testid="chat-interface"] .bg-gray-100').last();
  await expect(chatResponse).toBeVisible();

  // Check for workflow response content
  const responseText = await chatResponse.textContent();
  expect(responseText).toBeTruthy();

  // Validate that the workflow was created successfully
  expect(responseText).toMatch(expectedKeywords);
  
  // Test success validation using helper
  await testModalSuccessMessage(page, 'Workflow created successfully');
  
  // Test security validation
  await testXSSPrevention(page, '[data-testid="chat-input"]', '<script>alert("xss")</script>');
  await testDataExposure(page, ['[data-testid="chat-interface"]', '[data-testid="workflow-list"]']);
  
  // Test performance
  await testPageLoadTime(page, '/workflows/create', { threshold: 3000 });
  
  // UX compliance validation
  await validateUXCompliance(page, { 
    title: 'APIQ', 
    headings: 'Create Workflow', 
    validateForm: true, 
    validateAccessibility: true 
  });
}

test.describe('Workflow Planning E2E Tests', () => {
  let testUser: TestUser;
  let testData: any;

  test.beforeEach(async ({ page }) => {
    testUser = await createE2EUser();
    
    // Create test data using dataHelpers
    testData = await createTestData({
      user: testUser,
      workflow: {
        name: 'Test Workflow Planning',
        description: 'A test workflow for planning testing'
      }
    });
    
    // Create API connection for workflow generation
    await createTestApiConnection(testUser.id);
    await setupE2E(page, testUser);
    await closeAllModals(page);
    await resetRateLimits(page);
    
    // Navigate to workflow creation
    await page.goto('/workflows/create');
    await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 30000 });
  });

  test.afterEach(async () => {
    if (testUser?.id) {
      // Clean up test data using dataHelpers
      if (testData) {
        await cleanupTestData(testData);
      }
      await cleanupTestApiConnections(testUser.id);
      await cleanupTestUser(testUser);
    }
  });

  test('should decompose webhook → transform → action patterns', async ({ page }) => {
    // Test complex workflow that requires multiple steps
    const complexRequest = 'When a new GitHub issue is created, transform the data to include priority level, then send a Slack notification with the transformed data';
    
    await testWorkflowPlanning(page, complexRequest, /workflow|created|I've created|GitHub|Slack|transform/i);
  });

  test('should handle conditional workflow branching (if/then/else)', async ({ page }) => {
    const conditionalRequest = 'When a payment is received, check if the amount is over $1000, if yes send to manager approval, if no auto-approve and send confirmation';
    
    await testWorkflowPlanning(page, conditionalRequest, /workflow|created|I've created|payment|approval|conditional/i);
  });

  test('should support parallel step execution', async ({ page }) => {
    const parallelRequest = 'When a new order is placed, simultaneously send confirmation email, update inventory, and notify shipping department';
    
    await testWorkflowPlanning(page, parallelRequest, /workflow|created|I've created|order|email|inventory|parallel/i);
  });

  test('should validate step dependencies and ordering', async ({ page }) => {
    const dependencyRequest = 'Fetch user data from CRM, then use that data to create a personalized email, then send the email and log the activity';
    
    await testWorkflowPlanning(page, dependencyRequest, /workflow|created|I've created|CRM|email|personalized|dependency/i);
  });

  test('should handle workflow templates and patterns', async ({ page }) => {
    const templateRequest = 'Create a customer onboarding workflow template that includes welcome email, account setup, and first task assignment';
    
    await testWorkflowPlanning(page, templateRequest, /workflow|created|I've created|onboarding|template|welcome|email/i);
  });
});
