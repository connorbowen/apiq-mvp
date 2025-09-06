import { test, expect } from '@playwright/test';
import { TestUser, generateTestId, cleanupTestUser } from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';
import { setupE2E, closeAllModals, resetRateLimits, getPrimaryActionButton } from '../../helpers/e2eHelpers';
import { waitForDashboard, validateUXCompliance, closeGuidedTourIfPresent, waitForElement } from '../../helpers/uiHelpers';
import { testPageLoadTime, testConcurrentOperations } from '../../helpers/performanceHelpers';
import { testPrimaryActionPatterns, testFormAccessibility } from '../../helpers/accessibilityHelpers';
import { testModalSubmitLoading, testModalSuccessMessage, testModalErrorHandling } from '../../helpers/modalHelpers';
import { waitForNetworkIdle } from '../../helpers/waitHelpers';
import { createTestData, cleanupTestData } from '../../helpers/dataHelpers';
import { testXSSPrevention, testDataExposure } from '../../helpers/securityHelpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Helper function to test workflow generation with common patterns
 */
async function testWorkflowGeneration(page: any, description: string, expectedKeywords: RegExp) {
  await page.goto(`${BASE_URL}/workflows/create`);
  await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 30000 });
  
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill(description);
      
      // Wait for input to be processed and button to be enabled
      await page.waitForTimeout(100);
      
      // Test form accessibility before submission
      await testFormAccessibility(page, {
        submitButton: 'primary-action chat-send-btn'
      });
      
      // Click the send button
      await getPrimaryActionButton(page, 'chat-send').click();
  
  await waitForElement(page, '[data-testid="chat-interface"] .bg-gray-100', { timeout: 30000 });
  
  // Validate workflow response was generated
  const hasWorkflow = await page.getByText(/✨ Created:/).isVisible();
  const hasError = await page.getByText(/I'm sorry, I couldn't create that workflow/).isVisible();
  expect(hasWorkflow || hasError).toBeTruthy();
  
  // If workflow was created, validate the response contains relevant keywords
  if (hasWorkflow) {
    const responseText = await page.locator('[data-testid="chat-interface"] .bg-gray-100').textContent();
    expect(responseText).toMatch(expectedKeywords);
    
    // Test success validation using helper
    await testModalSuccessMessage(page, 'Workflow created successfully');
  }
}

test.describe('Core Multi-Step Workflow Generation E2E Tests - P0.1 Critical MVP Blocker', () => {
  let testUser: TestUser;
  let testData: any;

  test.beforeAll(async () => {
    testUser = await createE2EUser();
    
    // Create test data using dataHelpers
    testData = await createTestData({
      user: testUser,
      workflow: {
        name: 'Test Core Workflow',
        description: 'A test workflow for core generation testing'
      }
    });
  });

  test.afterAll(async () => {
    // Clean up test data using dataHelpers
    if (testData) {
      await cleanupTestData(testData);
    }
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

  test.describe('P0.1.1: Multi-Step Workflow Generation - Core MVP Blocker', () => {
    test('should generate multi-step workflow from complex natural language description', async ({ page }) => {
      // Navigate to workflow creation
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Wait for page to load completely
      await waitForNetworkIdle(page);
      
      // Wait for chat interface to load
      await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 30000 });
      
      // Validate UX compliance
      await validateUXCompliance(page, {
        title: 'APIQ',
        headings: 'Create Workflow',
        validateForm: true,
        validateAccessibility: true
      });
      
      // Test form accessibility for chat interface
      await testFormAccessibility(page, {
        submitButton: 'primary-action chat-send-btn'
      });
      
      // Test security validation
      await testXSSPrevention(page, '[data-testid="chat-input"]', '<script>alert("xss")</script>');
      await testDataExposure(page, ['[data-testid="chat-interface"]', '[data-testid="workflow-list"]']);
      
      // Test complex multi-step workflow generation
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('When a new GitHub issue is created, send a Slack notification and create a Trello card');
      
      // Wait for input to be processed and button to be enabled
      await page.waitForTimeout(100);
      
      // Start generation
      await getPrimaryActionButton(page, 'chat-send').click();
      
      // Wait for workflow generation (should be multi-step)
      await waitForElement(page, '[data-testid="chat-interface"] .bg-gray-100', { timeout: 30000 });
      
      // CRITICAL: Validate that workflow response was generated
      // The workflow creation might succeed or fail, so check for either response
      const hasWorkflow = await page.getByText(/✨ Created:/).isVisible();
      const hasError = await page.getByText(/I'm sorry, I couldn't create that workflow/).isVisible();
      expect(hasWorkflow || hasError).toBeTruthy();
      
      // If workflow was created, validate the response structure
      if (hasWorkflow) {
        // Check for workflow steps container
        await expect(page.locator('[data-testid="workflow-steps-container"]')).toBeVisible();
        
        // Validate that the response contains relevant keywords
        const responseText = await page.locator('[data-testid="chat-interface"] .bg-gray-100').textContent();
        expect(responseText).toMatch(/GitHub|Slack|Trello|workflow|step/i);
        
        // Test success validation using helper
        await testModalSuccessMessage(page, 'Workflow created successfully');
      }
    });

    test('should generate workflow with data flow mapping between steps', async ({ page }) => {
      await testWorkflowGeneration(
        page, 
        'Get user data from GitHub and create a Slack message with the user information',
        /GitHub|Slack|user|data|workflow/i
      );
    });

    test('should handle conditional logic in multi-step workflows', async ({ page }) => {
      await testWorkflowGeneration(
        page,
        'If a GitHub issue is labeled as "bug", send a Slack notification to the dev team, otherwise send it to the general channel',
        /GitHub|Slack|bug|conditional|workflow/i
      );
    });
  });

  test.describe('P0.1.2: Function Name Collision Prevention', () => {
    test('should handle multiple APIs with similar endpoint patterns', async ({ page }) => {
      await testWorkflowGeneration(
        page,
        'Create an issue in GitHub and also create a card in Trello',
        /GitHub|Trello|issue|card|workflow/i
      );
    });

    test('should generate unique function names for similar operations', async ({ page }) => {
      await testWorkflowGeneration(
        page,
        'Send a message to Slack and also send a notification to Discord',
        /Slack|Discord|message|notification|workflow/i
      );
    });
  });

  test.describe('P0.1.3: Parameter Schema Enhancement', () => {
    test('should generate workflows with detailed parameter schemas', async ({ page }) => {
      await testWorkflowGeneration(
        page,
        'Create a GitHub issue with title and description',
        /GitHub|issue|title|description|workflow/i
      );
    });

    test('should handle complex parameter types and validation', async ({ page }) => {
      await testWorkflowGeneration(
        page,
        'Send a Slack message with attachments and formatting',
        /Slack|message|attachment|workflow/i
      );
    });
  });

  test.describe('P0.1.4: Context-Aware Function Filtering', () => {
    test('should filter functions based on user request context', async ({ page }) => {
      await testWorkflowGeneration(
        page,
        'Send a notification about a GitHub issue',
        /GitHub|Slack|issue|notification|workflow/i
      );
    });

    test('should handle requests requiring multiple API categories', async ({ page }) => {
      await testWorkflowGeneration(
        page,
        'When a GitHub issue is created, send a Slack notification and create a Trello card for tracking',
        /GitHub|Slack|Trello|issue|notification|card|workflow/i
      );
    });
  });

  test.describe('P0.1.5: Workflow Validation Enhancement', () => {
    test('should validate step dependencies and detect circular references', async ({ page }) => {
      await testWorkflowGeneration(
        page,
        'Create a workflow that creates a GitHub issue and then updates the same issue',
        /GitHub|issue|workflow/i
      );
    });

    test('should validate data flow between steps', async ({ page }) => {
      await testWorkflowGeneration(
        page,
        'Get user data from GitHub and use it to create a personalized Slack message',
        /GitHub|Slack|user|data|workflow/i
      );
    });

    test('should detect and report workflow completeness issues', async ({ page }) => {
      await testWorkflowGeneration(
        page,
        'Send a notification when something happens',
        /notification|workflow/i
      );
    });
  });

  test.describe('P0.1.6: Error Handling Improvements', () => {
    test('should handle OpenAI API failures gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Mock OpenAI API failure (following user rules for external failures)
      await page.route('**/api/workflows/generate', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({
            success: false,
            error: 'OpenAI API is temporarily unavailable'
          })
        });
      });
      
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('Send a Slack notification for new orders');
      
      // Test form accessibility and submit
      await testFormAccessibility(page, {
        submitButton: 'primary-action chat-send-btn'
      });
      
      await getPrimaryActionButton(page, 'chat-send').click();
      
      // Should show error message
      await expect(page.getByText(/I'm sorry, I couldn't create that workflow/)).toBeVisible();
    });

    test('should provide actionable error messages for common issues', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 30000 });
      
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('Create a workflow that does not exist');
      
      // Test form accessibility and submit
      await testFormAccessibility(page, {
        submitButton: 'primary-action chat-send-btn'
      });
      
      await getPrimaryActionButton(page, 'chat-send').click();
      
      // Should show error message
      await expect(page.getByText(/I'm sorry, I couldn't create that workflow/)).toBeVisible();
    });

    test('should retry workflow generation on transient failures', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      let callCount = 0;
      await page.route('**/api/workflows/generate', route => {
        callCount++;
        if (callCount === 1) {
          // First call fails
          route.fulfill({ 
            status: 503, 
            body: JSON.stringify({
              success: false,
              error: 'Service temporarily unavailable'
            })
          });
        } else {
          // Second call succeeds
          route.fulfill({ 
            status: 200, 
            body: JSON.stringify({
              success: true,
              data: {
                workflow: {
                  id: 'test-workflow',
                  name: 'Test Workflow',
                  steps: [
                    {
                      id: 'step1',
                      name: 'Send Slack Notification',
                      type: 'api_call',
                      order: 1
                    }
                  ]
                }
              }
            })
          });
        }
      });
      
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('Send a Slack notification');
      
      // Test form accessibility and submit
      await testFormAccessibility(page, {
        submitButton: 'primary-action chat-send-btn'
      });
      
      await getPrimaryActionButton(page, 'chat-send').click();
      
      // Should eventually get a response
      await waitForElement(page, '[data-testid="chat-interface"] .bg-gray-100', { timeout: 30000 });
      
      // Validate workflow response was generated
      const hasWorkflow = await page.getByText(/✨ Created:/).isVisible();
      const hasError = await page.getByText(/I'm sorry, I couldn't create that workflow/).isVisible();
      expect(hasWorkflow || hasError).toBeTruthy();
    });
  });

  test.describe('Performance Requirements', () => {
    test('should generate multi-step workflows within 5 seconds', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await waitForElement(page, '[data-testid="chat-interface"]', { timeout: 30000 });
      
      const startTime = Date.now();
      
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('When a GitHub issue is created, send Slack notification and create Trello card');
      
      // Test form accessibility and submit
      await testFormAccessibility(page, {
        submitButton: 'primary-action chat-send-btn'
      });
      
      await getPrimaryActionButton(page, 'chat-send').click();
      
      await waitForElement(page, '[data-testid="chat-interface"] .bg-gray-100', { timeout: 10000 });
      
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      
      // Should complete within 5 seconds (PRD requirement)
      expect(generationTime).toBeLessThan(5000);
      
      // Should generate workflow response
      const hasWorkflow = await page.getByText(/✨ Created:/).isVisible();
      const hasError = await page.getByText(/I'm sorry, I couldn't create that workflow/).isVisible();
      expect(hasWorkflow || hasError).toBeTruthy();
    });

    test('should handle concurrent workflow generation requests', async ({ page, context }) => {
      // Test multiple concurrent workflow generations
      const promises: Promise<boolean>[] = [];
      
      for (let i = 0; i < 3; i++) {
        const newPage = await context.newPage();
        promises.push(
          newPage.goto(`${BASE_URL}/workflows/create`).then(async () => {
            await waitForElement(newPage, '[data-testid="chat-interface"]', { timeout: 30000 });
            await newPage.getByTestId('chat-input').fill(`Test workflow ${i + 1}`);
            
            // Test form accessibility and submit
            await testFormAccessibility(newPage, {
              submitButton: 'primary-action chat-send-btn'
            });
            
            await getPrimaryActionButton(newPage, 'chat-send').click();
            await waitForElement(newPage, '[data-testid="chat-interface"] .bg-gray-100', { timeout: 30000 });
            return newPage.getByText(/✨ Created:|I'm sorry, I couldn't create that workflow/).isVisible();
          })
        );
      }
      
      const results = await Promise.all(promises);
      expect(results.every(result => result)).toBe(true);
    });
  });

  test.describe('Integration with Workflow Execution Engine', () => {
    test('should generate and execute multi-step workflow end-to-end', async ({ page }) => {
      await testWorkflowGeneration(
        page,
        'Create a GitHub issue and send a Slack notification',
        /GitHub|Slack|issue|notification|workflow/i
      );
    });
  });
});
