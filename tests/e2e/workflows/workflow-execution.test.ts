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

  test.describe('Workflow Execution Success', () => {
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

    test('should execute workflow with multiple steps', async ({ page }) => {
      // Create a workflow with multiple steps
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Multi-Step Workflow',
          description: 'A workflow with multiple steps',
          steps: [
            {
              type: 'api_call',
              name: 'First API Call',
              config: {
                method: 'GET',
                url: 'https://httpbin.org/get',
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            },
            {
              type: 'api_call',
              name: 'Second API Call',
              config: {
                method: 'POST',
                url: 'https://httpbin.org/post',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: {
                  message: 'Hello from workflow'
                }
              }
            },
            {
              type: 'condition',
              name: 'Check Response',
              config: {
                condition: 'response.status === 200'
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
      await expect(page.locator('[data-testid="step-result"]').nth(0)).toContainText('First API Call');
      await expect(page.locator('[data-testid="step-result"]').nth(1)).toContainText('Second API Call');
      await expect(page.locator('[data-testid="step-result"]').nth(2)).toContainText('Check Response');
      
      // All steps should be successful
      const stepStatuses = page.locator('[data-testid="step-status"]');
      await expect(stepStatuses.nth(0)).toContainText('Success');
      await expect(stepStatuses.nth(1)).toContainText('Success');
      await expect(stepStatuses.nth(2)).toContainText('Success');
    });

    test('should execute workflow with data transformation', async ({ page }) => {
      // Create a workflow with data transformation
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Data Transformation Workflow',
          description: 'A workflow with data transformation steps',
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
              name: 'Send Transformed Data',
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
      
      // Wait for execution to complete
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Completed', { timeout: 30000 });
      
      // Should show transformation step result
      await expect(page.locator('[data-testid="step-result"]').nth(1)).toContainText('Transform Data');
      await expect(page.locator('[data-testid="step-status"]').nth(1)).toContainText('Success');
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

    test('should execute workflow with OAuth2 connection', async ({ page }) => {
      // Create an OAuth2 connection
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'OAuth2 Test Connection',
          baseUrl: 'https://api.github.com',
          authType: 'OAUTH2',
          config: {
            provider: 'github',
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            accessToken: 'mock-oauth-token'
          }
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await connectionResponse.json();
      createdConnectionIds.push(connection.data.id);
      
      // Create a workflow using the OAuth2 connection
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'OAuth2 Workflow',
          description: 'A workflow using OAuth2 connection',
          connectionId: connection.data.id,
          steps: [
            {
              type: 'api_call',
              name: 'GitHub API Call',
              config: {
                method: 'GET',
                path: '/user',
                headers: {
                  'Accept': 'application/vnd.github.v3+json'
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
      
      // Should handle OAuth2 token refresh if needed
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Completed', { timeout: 30000 });
    });
  });

  test.describe('Workflow Execution Error Handling', () => {
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
      
      // Should show execution failed
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Failed', { timeout: 30000 });
      
      // Should show error details
      await expect(page.locator('[data-testid="step-status"]')).toContainText('Failed');
      await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
    });

    test('should handle workflow with conditional logic', async ({ page }) => {
      // Create a workflow with conditional logic
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Conditional Workflow',
          description: 'A workflow with conditional logic',
          steps: [
            {
              type: 'api_call',
              name: 'Get Status',
              config: {
                method: 'GET',
                url: 'https://httpbin.org/status/404',
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            },
            {
              type: 'condition',
              name: 'Check Status',
              config: {
                condition: 'response.status === 200'
              }
            },
            {
              type: 'api_call',
              name: 'Success Action',
              config: {
                method: 'POST',
                url: 'https://httpbin.org/post',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: {
                  action: 'success'
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
      
      // Should show conditional step result
      await expect(page.locator('[data-testid="step-result"]').nth(1)).toContainText('Check Status');
      await expect(page.locator('[data-testid="step-status"]').nth(1)).toContainText('Condition Failed');
      
      // Success action should be skipped
      await expect(page.locator('[data-testid="step-result"]').nth(2)).toContainText('Success Action');
      await expect(page.locator('[data-testid="step-status"]').nth(2)).toContainText('Skipped');
    });

    test('should handle workflow timeout', async ({ page }) => {
      // Create a workflow with slow API call
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Timeout Workflow',
          description: 'A workflow that tests timeout handling',
          timeout: 5000, // 5 second timeout
          steps: [
            {
              type: 'api_call',
              name: 'Slow API Call',
              config: {
                method: 'GET',
                url: 'https://httpbin.org/delay/10', // 10 second delay
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
      
      // Should show timeout error
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Failed', { timeout: 10000 });
      await expect(page.locator('[data-testid="error-details"]')).toContainText('Timeout');
    });
  });

  test.describe('Real-time Execution Updates', () => {
    test('should show real-time execution progress', async ({ page }) => {
      // Create a workflow with multiple steps
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Real-time Test Workflow',
          description: 'A workflow for testing real-time updates',
          steps: [
            {
              type: 'api_call',
              name: 'Step 1',
              config: {
                method: 'GET',
                url: 'https://httpbin.org/delay/2',
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            },
            {
              type: 'api_call',
              name: 'Step 2',
              config: {
                method: 'GET',
                url: 'https://httpbin.org/delay/2',
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            },
            {
              type: 'api_call',
              name: 'Step 3',
              config: {
                method: 'GET',
                url: 'https://httpbin.org/delay/2',
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
      
      // Should show progress indicator
      await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible();
      
      // Should show current step being executed
      await expect(page.locator('[data-testid="current-step"]')).toContainText('Step 1');
      
      // Wait for all steps to complete
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Completed', { timeout: 30000 });
      
      // Should show final progress
      await expect(page.locator('[data-testid="execution-progress"]')).toContainText('100%');
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
                url: 'https://httpbin.org/delay/30', // 30 second delay
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
    test('should display execution history', async ({ page }) => {
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
      
      // Execute workflow multiple times
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="execute-workflow-btn"]');
        await expect(page.locator('[data-testid="execution-status"]')).toContainText('Completed', { timeout: 30000 });
      }
      
      // Navigate to execution history tab
      await page.click('[data-testid="execution-history-tab"]');
      
      // Should show execution history
      await expect(page.locator('[data-testid="execution-history"]')).toBeVisible();
      
      // Should show multiple executions
      await expect(page.locator('[data-testid="execution-record"]')).toHaveCount(3);
      
      // Should show execution details
      await expect(page.locator('[data-testid="execution-record"]').first()).toContainText('Completed');
      await expect(page.locator('[data-testid="execution-record"]').first()).toContainText('History Test Workflow');
    });

    test('should allow viewing execution details', async ({ page }) => {
      // Create and execute a workflow
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Details Test Workflow',
          description: 'A workflow for testing execution details',
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
      
      // Execute workflow
      await page.click('[data-testid="execute-workflow-btn"]');
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Completed', { timeout: 30000 });
      
      // Navigate to execution history
      await page.click('[data-testid="execution-history-tab"]');
      
      // Click on execution record to view details
      await page.click('[data-testid="execution-record"]').first();
      
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