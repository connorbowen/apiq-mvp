import { test, expect } from '@playwright/test';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser;
let uxHelper: UXComplianceHelper;

test.describe('Core Multi-Step Workflow Generation E2E Tests - P0.1 Critical MVP Blocker', () => {
  test.beforeAll(async () => {
    // Create a real test user (following no-mock-data policy)
    testUser = await createTestUser(
      `e2e-core-workflow-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Core Workflow Test User'
    );
  });

  test.afterAll(async () => {
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
    
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Email address').fill(testUser.email);
    await page.getByLabel('Password').fill('e2eTestPass123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Wait for dashboard to load
    await Promise.all([
      page.waitForURL(/.*dashboard/),
      page.waitForSelector('h1:has-text("Dashboard")')
    ]);
  });

  test.describe('P0.1.1: Multi-Step Workflow Generation - Core MVP Blocker', () => {
    test('should generate multi-step workflow from complex natural language description', async ({ page }) => {
      // Navigate to workflow creation
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Test complex multi-step workflow generation
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('When a new GitHub issue is created, send a Slack notification and create a Trello card');
      
      // Start generation
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Wait for workflow generation (should be multi-step)
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // CRITICAL: Validate that multiple steps were generated
      await expect(page.getByText('Step 1:')).toBeVisible();
      await expect(page.getByText('Step 2:')).toBeVisible();
      await expect(page.getByText('Step 3:')).toBeVisible();
      
      // Validate specific steps were created
      await expect(page.getByText(/GitHub.*issue/i)).toBeVisible();
      await expect(page.getByText(/Slack.*notification/i)).toBeVisible();
      await expect(page.getByText(/Trello.*card/i)).toBeVisible();
      
      // Validate step explanations
      await page.getByText('Step 1:').click();
      await expect(page.getByText(/monitors.*GitHub.*issues/i)).toBeVisible();
      
      await page.getByText('Step 2:').click();
      await expect(page.getByText(/sends.*Slack.*message/i)).toBeVisible();
      
      await page.getByText('Step 3:').click();
      await expect(page.getByText(/creates.*Trello.*card/i)).toBeVisible();
    });

    test('should generate workflow with data flow mapping between steps', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Get user data from GitHub and create a Slack message with the user information');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate data flow mapping
      await expect(page.getByText('Data Flow:')).toBeVisible();
      await expect(page.getByText('GitHub user data → Slack message')).toBeVisible();
      
      // Validate step dependencies
      await expect(page.getByText('Step 1: Get User Data')).toBeVisible();
      await expect(page.getByText('Step 2: Create Slack Message')).toBeVisible();
      
      // Validate that Step 2 depends on Step 1
      await page.getByText('Step 2: Create Slack Message').click();
      await expect(page.getByText('Depends on: Step 1')).toBeVisible();
      await expect(page.getByText('Uses data from: GitHub user response')).toBeVisible();
    });

    test('should handle conditional logic in multi-step workflows', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('If a GitHub issue is labeled as "bug", send a Slack notification to the dev team, otherwise send it to the general channel');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate conditional logic
      await expect(page.getByText('Condition:')).toBeVisible();
      await expect(page.getByText('If issue has "bug" label')).toBeVisible();
      
      // Validate branching
      await expect(page.getByText('Then: Send to dev team')).toBeVisible();
      await expect(page.getByText('Else: Send to general channel')).toBeVisible();
      
      // Validate step structure
      await expect(page.getByText('Step 1: Check Issue Labels')).toBeVisible();
      await expect(page.getByText('Step 2A: Send to Dev Team')).toBeVisible();
      await expect(page.getByText('Step 2B: Send to General Channel')).toBeVisible();
    });
  });

  test.describe('P0.1.2: Function Name Collision Prevention', () => {
    test('should handle multiple APIs with similar endpoint patterns', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Create an issue in GitHub and also create a card in Trello');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate that different APIs are properly distinguished
      await expect(page.getByText('GitHub_create_issue')).toBeVisible();
      await expect(page.getByText('Trello_create_card')).toBeVisible();
      
      // Validate no function name collisions
      const functionNames = await page.locator('[data-testid="function-name"]').allTextContents();
      const uniqueNames = new Set(functionNames);
      expect(functionNames.length).toBe(uniqueNames.size);
    });

    test('should generate unique function names for similar operations', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Send a message to Slack and also send a notification to Discord');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate unique function names
      await expect(page.getByText('Slack_send_message')).toBeVisible();
      await expect(page.getByText('Discord_send_notification')).toBeVisible();
      
      // Validate function names are descriptive and unique
      const functionNames = await page.locator('[data-testid="function-name"]').allTextContents();
      expect(functionNames).toContain('Slack_send_message');
      expect(functionNames).toContain('Discord_send_notification');
    });
  });

  test.describe('P0.1.3: Parameter Schema Enhancement', () => {
    test('should generate workflows with detailed parameter schemas', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Create a GitHub issue with title and description');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate parameter details
      await page.getByText('Step 1: Create GitHub Issue').click();
      await expect(page.getByText('Parameters:')).toBeVisible();
      await expect(page.getByText('title (required): Issue title')).toBeVisible();
      await expect(page.getByText('body (optional): Issue description')).toBeVisible();
      await expect(page.getByText('owner (required): Repository owner')).toBeVisible();
      await expect(page.getByText('repo (required): Repository name')).toBeVisible();
    });

    test('should handle complex parameter types and validation', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Send a Slack message with attachments and formatting');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate complex parameter handling
      await page.getByText('Step 1: Send Slack Message').click();
      await expect(page.getByText('Parameters:')).toBeVisible();
      await expect(page.getByText('channel (required): Target channel')).toBeVisible();
      await expect(page.getByText('text (required): Message content')).toBeVisible();
      await expect(page.getByText('attachments (optional): Array of attachments')).toBeVisible();
      await expect(page.getByText('blocks (optional): Message blocks for formatting')).toBeVisible();
    });
  });

  test.describe('P0.1.4: Context-Aware Function Filtering', () => {
    test('should filter functions based on user request context', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Send a notification about a GitHub issue');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate that only relevant functions are used
      await expect(page.getByText('GitHub_get_issue')).toBeVisible();
      await expect(page.getByText('Slack_send_message')).toBeVisible();
      
      // Validate that irrelevant functions are not included
      await expect(page.getByText('Trello_create_card')).not.toBeVisible();
    });

    test('should handle requests requiring multiple API categories', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('When a GitHub issue is created, send a Slack notification and create a Trello card for tracking');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate that functions from multiple categories are included
      await expect(page.getByText('GitHub_create_issue')).toBeVisible();
      await expect(page.getByText('Slack_send_message')).toBeVisible();
      await expect(page.getByText('Trello_create_card')).toBeVisible();
      
      // Validate function categorization
      await expect(page.getByText('Source APIs: GitHub')).toBeVisible();
      await expect(page.getByText('Communication APIs: Slack')).toBeVisible();
      await expect(page.getByText('Project Management APIs: Trello')).toBeVisible();
    });
  });

  test.describe('P0.1.5: Workflow Validation Enhancement', () => {
    test('should validate step dependencies and detect circular references', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Create a workflow that creates a GitHub issue and then updates the same issue');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate dependency analysis
      await expect(page.getByText('Dependency Analysis:')).toBeVisible();
      await expect(page.getByText('Step 2 depends on Step 1')).toBeVisible();
      await expect(page.getByText('No circular dependencies detected')).toBeVisible();
    });

    test('should validate data flow between steps', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Get user data from GitHub and use it to create a personalized Slack message');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate data flow validation
      await expect(page.getByText('Data Flow Validation:')).toBeVisible();
      await expect(page.getByText('✓ User data flows from GitHub to Slack')).toBeVisible();
      await expect(page.getByText('✓ Required fields are mapped correctly')).toBeVisible();
    });

    test('should detect and report workflow completeness issues', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Send a notification when something happens');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Should show validation issues
      await expect(page.getByText('Workflow Validation Issues:')).toBeVisible();
      await expect(page.getByText('⚠️ Trigger event is not specified')).toBeVisible();
      await expect(page.getByText('⚠️ Notification target is not specified')).toBeVisible();
      
      // Should provide suggestions
      await expect(page.getByText('Suggestions:')).toBeVisible();
      await expect(page.getByText('Specify what event should trigger the notification')).toBeVisible();
      await expect(page.getByText('Specify where to send the notification')).toBeVisible();
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
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Send a Slack notification for new orders');
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Should show specific error message
      await expect(page.getByText('OpenAI API is temporarily unavailable')).toBeVisible();
      await expect(page.getByText('Please try again in a few minutes')).toBeVisible();
      await expect(page.getByText('If the problem persists, contact support')).toBeVisible();
    });

    test('should provide actionable error messages for common issues', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Create a workflow that does not exist');
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Should show helpful error message
      await expect(page.getByText('Unable to generate workflow')).toBeVisible();
      await expect(page.getByText('Please provide more specific details')).toBeVisible();
      await expect(page.getByText('Try describing the specific actions and triggers')).toBeVisible();
      
      // Should provide examples
      await expect(page.getByText('Examples:')).toBeVisible();
      await expect(page.getByText('"Send Slack notification when new GitHub issue is created"')).toBeVisible();
      await expect(page.getByText('"Create Trello card when customer places order"')).toBeVisible();
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
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Send a Slack notification');
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Should show retry message
      await expect(page.getByText('Retrying...')).toBeVisible();
      
      // Should eventually succeed
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      await expect(page.getByText('Test Workflow')).toBeVisible();
    });
  });

  test.describe('Performance Requirements', () => {
    test('should generate multi-step workflows within 5 seconds', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const startTime = Date.now();
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('When a GitHub issue is created, send Slack notification and create Trello card');
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 10000 });
      
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      
      // Should complete within 5 seconds (PRD requirement)
      expect(generationTime).toBeLessThan(5000);
      
      // Should generate multiple steps
      await expect(page.getByText('Step 1:')).toBeVisible();
      await expect(page.getByText('Step 2:')).toBeVisible();
      await expect(page.getByText('Step 3:')).toBeVisible();
    });

    test('should handle concurrent workflow generation requests', async ({ page, context }) => {
      // Test multiple concurrent workflow generations
      const promises: Promise<boolean>[] = [];
      
      for (let i = 0; i < 3; i++) {
        const newPage = await context.newPage();
        promises.push(
          newPage.goto(`${BASE_URL}/workflows/create`).then(async () => {
            await newPage.getByPlaceholder('Describe your workflow...').fill(`Test workflow ${i + 1}`);
            await newPage.getByTestId('primary-action generate-workflow-btn').click();
            await newPage.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
            return newPage.getByText(`Test workflow ${i + 1}`).isVisible();
          })
        );
      }
      
      const results = await Promise.all(promises);
      expect(results.every(result => result)).toBe(true);
    });
  });

  test.describe('Integration with Workflow Execution Engine', () => {
    test('should generate and execute multi-step workflow end-to-end', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Create a GitHub issue and send a Slack notification');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Save the workflow
      await page.getByTestId('primary-action save-workflow-btn').click();
      
      // Navigate to workflows list
      await page.waitForURL(/.*workflows/);
      await expect(page.getByText('Create a GitHub issue and send a Slack notification')).toBeVisible();
      
      // Execute the workflow
      await page.getByTestId('primary-action execute-workflow-btn').click();
      
      // Validate execution progress
      await expect(page.getByText('Executing...')).toBeVisible();
      await expect(page.getByText('Step 1: Create GitHub Issue')).toBeVisible();
      await expect(page.getByText('Step 2: Send Slack Notification')).toBeVisible();
      
      // Wait for completion
      await page.waitForTimeout(10000);
      
      // Validate successful execution
      await expect(page.getByText('Completed')).toBeVisible();
      await expect(page.getByText('All steps executed successfully')).toBeVisible();
    });
  });
}); 