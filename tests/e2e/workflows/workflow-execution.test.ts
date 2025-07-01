import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser;
let jwt;
let createdWorkflowIds: string[] = [];
let createdConnectionIds: string[] = [];

test.describe('Workflow Execution E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-exec-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Execution Test User'
    );
    jwt = testUser.accessToken;
  });

  test.afterAll(async ({ request }) => {
    // Clean up created workflows
    for (const id of createdWorkflowIds) {
      try {
        await request.delete(`/api/workflows/${id}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    // Clean up created connections
    for (const id of createdConnectionIds) {
      try {
        await request.delete(`/api/connections/${id}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', 'e2eTestPass123');
    await page.click('button[type="submit"]');
    
    // Wait for successful login and redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test.describe('Core Workflow Execution', () => {
    test('should execute simple workflow successfully', async ({ page }) => {
      // Create a simple workflow
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Simple Test Workflow',
          description: 'A simple workflow for testing execution',
          steps: [
            {
              type: 'api_call',
              name: 'Test API Call',
              config: {
                method: 'GET',
                url: 'https://httpbin.org/get',
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            }
          ]
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const workflow = await workflowResponse.json();
      createdWorkflowIds.push(workflow.data.id);
      
      // Navigate to workflow details
      await page.goto(`${BASE_URL}/workflows/${workflow.data.id}`);
      
      // Click execute button
      await page.click('[data-testid="execute-workflow-btn"]');
      
      // Should show execution started
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Running');
      
      // Wait for execution to complete
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Completed', { timeout: 30000 });
      
      // Should show execution results
      await expect(page.locator('[data-testid="execution-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="step-result"]')).toContainText('Test API Call');
      await expect(page.locator('[data-testid="step-status"]')).toContainText('Success');
    });

    test('should execute workflow with multiple steps and data flow', async ({ page }) => {
      // Create a workflow with multiple steps including data transformation
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Multi-Step Data Workflow',
          description: 'A workflow with multiple steps and data transformation',
          steps: [
            {
              type: 'api_call',
              name: 'Fetch Data',
              config: {
                method: 'GET',
                url: 'https://httpbin.org/json',
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            },
            {
              type: 'transform',
              name: 'Transform Data',
              config: {
                transform: 'data.slideshow.author = "Transformed Author"'
              }
            },
            {
              type: 'api_call',
              name: 'Send Data',
              config: {
                method: 'POST',
                url: 'https://httpbin.org/post',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: '{{previous_step.data}}'
              }
            }
          ]
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const workflow = await workflowResponse.json();
      createdWorkflowIds.push(workflow.data.id);
      
      // Navigate to workflow details
      await page.goto(`${BASE_URL}/workflows/${workflow.data.id}`);
      
      // Click execute button
      await page.click('[data-testid="execute-workflow-btn"]');
      
      // Should show execution started
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Running');
      
      // Wait for execution to complete
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Completed', { timeout: 30000 });
      
      // Should show all step results
      await expect(page.locator('[data-testid="step-result"]')).toHaveCount(3);
      await expect(page.locator('[data-testid="step-result"]').nth(0)).toContainText('Fetch Data');
      await expect(page.locator('[data-testid="step-result"]').nth(1)).toContainText('Transform Data');
      await expect(page.locator('[data-testid="step-result"]').nth(2)).toContainText('Send Data');
      
      // All steps should be successful
      const stepStatuses = page.locator('[data-testid="step-status"]');
      await expect(stepStatuses.nth(0)).toContainText('Success');
      await expect(stepStatuses.nth(1)).toContainText('Success');
      await expect(stepStatuses.nth(2)).toContainText('Success');
    });
  });

  test.describe('Workflow Execution with Connections', () => {
    test('should execute workflow using API connection', async ({ page }) => {
      // Create an API connection
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'Test API Connection',
          baseUrl: 'https://httpbin.org',
          authType: 'NONE'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await connectionResponse.json();
      createdConnectionIds.push(connection.data.id);
      
      // Create a workflow using the connection
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Connection-Based Workflow',
          description: 'A workflow using an API connection',
          connectionId: connection.data.id,
          steps: [
            {
              type: 'api_call',
              name: 'Test Connection',
              config: {
                method: 'GET',
                path: '/get',
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            }
          ]
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const workflow = await workflowResponse.json();
      createdWorkflowIds.push(workflow.data.id);
      
      // Navigate to workflow details
      await page.goto(`${BASE_URL}/workflows/${workflow.data.id}`);
      
      // Click execute button
      await page.click('[data-testid="execute-workflow-btn"]');
      
      // Wait for execution to complete
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Completed', { timeout: 30000 });
      
      // Should show successful execution
      await expect(page.locator('[data-testid="step-status"]')).toContainText('Success');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle API call failure gracefully', async ({ page }) => {
      // Create a workflow with invalid API call
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Error Handling Workflow',
          description: 'A workflow that tests error handling',
          steps: [
            {
              type: 'api_call',
              name: 'Failing API Call',
              config: {
                method: 'GET',
                url: 'https://invalid-api.example.com/endpoint',
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            }
          ]
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const workflow = await workflowResponse.json();
      createdWorkflowIds.push(workflow.data.id);
      
      // Navigate to workflow details
      await page.goto(`${BASE_URL}/workflows/${workflow.data.id}`);
      
      // Click execute button
      await page.click('[data-testid="execute-workflow-btn"]');
      
      // Should show execution started
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Running');
      
      // Should eventually show failure
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Failed', { timeout: 30000 });
      
      // Should show error details
      await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="step-status"]')).toContainText('Failed');
    });

    test('should allow canceling execution', async ({ page }) => {
      // Create a workflow with long-running step
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Cancelable Workflow',
          description: 'A workflow that can be canceled',
          steps: [
            {
              type: 'api_call',
              name: 'Long Running Step',
              config: {
                method: 'GET',
                url: 'https://httpbin.org/delay/10', // 10 second delay (reduced from 30)
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            }
          ]
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const workflow = await workflowResponse.json();
      createdWorkflowIds.push(workflow.data.id);
      
      // Navigate to workflow details
      await page.goto(`${BASE_URL}/workflows/${workflow.data.id}`);
      
      // Click execute button
      await page.click('[data-testid="execute-workflow-btn"]');
      
      // Should show execution started
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Running');
      
      // Click cancel button
      await page.click('[data-testid="cancel-execution-btn"]');
      
      // Should show execution canceled
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Canceled');
    });
  });

  test.describe('Execution History', () => {
    test('should display execution history and details', async ({ page }) => {
      // Create and execute a workflow
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'History Test Workflow',
          description: 'A workflow for testing execution history',
          steps: [
            {
              type: 'api_call',
              name: 'Test Step',
              config: {
                method: 'GET',
                url: 'https://httpbin.org/get',
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            }
          ]
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const workflow = await workflowResponse.json();
      createdWorkflowIds.push(workflow.data.id);
      
      // Navigate to workflow details
      await page.goto(`${BASE_URL}/workflows/${workflow.data.id}`);
      
      // Execute workflow twice
      for (let i = 0; i < 2; i++) {
        await page.click('[data-testid="execute-workflow-btn"]');
        await expect(page.locator('[data-testid="execution-status"]')).toContainText('Completed', { timeout: 30000 });
      }
      
      // Navigate to execution history tab
      await page.click('[data-testid="execution-history-tab"]');
      
      // Should show execution history
      await expect(page.locator('[data-testid="execution-history"]')).toBeVisible();
      
      // Should show multiple executions
      await expect(page.locator('[data-testid="execution-record"]')).toHaveCount(2);
      
      // Should show execution details
      await expect(page.locator('[data-testid="execution-record"]').first()).toContainText('Completed');
      await expect(page.locator('[data-testid="execution-record"]').first()).toContainText('History Test Workflow');
      
      // Click on execution record to view details
      await page.locator('[data-testid="execution-record"]').first().click();
      
      // Should show execution details modal
      await expect(page.locator('[data-testid="execution-details-modal"]')).toBeVisible();
      
      // Should show step details
      await expect(page.locator('[data-testid="step-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="step-details"]')).toContainText('Test Step');
      
      // Close modal
      await page.click('[data-testid="close-modal-btn"]');
      await expect(page.locator('[data-testid="execution-details-modal"]')).not.toBeVisible();
    });
  });
}); 