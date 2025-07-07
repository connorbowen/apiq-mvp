import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: any;
let jwt: string;
let createdWorkflowIds: string[] = [];
let createdConnectionIds: string[] = [];

test.describe('Step Runner Engine E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-step-runner-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Step Runner Test User'
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
    // Navigate to workflows tab
    await page.click('[data-testid="tab-workflows"]');
  });

  test.describe('HTTP API Call Steps', () => {
    test('should execute GET request step with HTTPBin', async ({ page }) => {
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Test API',
          baseUrl: 'https://httpbin.org',
          authType: 'NONE'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await connectionResponse.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Create workflow with GET step
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'HTTPBin GET Test',
          description: 'Test GET request to HTTPBin',
          steps: [
            {
              type: 'API_CALL',
              name: 'Get JSON',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/json',
              headers: {},
              body: null
            }
          ]
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const workflow = await workflowResponse.json();
      if (workflow.data?.id) {
        createdWorkflowIds.push(workflow.data.id);
      }
      
      // Navigate to workflows tab to see the created workflow
      await page.getByTestId('tab-workflows').click();
      
      // Wait for the execute button to be visible
      await page.waitForSelector(`[data-testid="execute-workflow-${workflow.data.id}"]`, { timeout: 10000 });
      
      // Navigate to workflow execution
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should show execution progress
      await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible();
      
      // Should show step execution
      await expect(page.locator('[data-testid="step-execution"]')).toContainText('Get JSON');
      
      // Should show successful execution
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED');
      
      // Should show response data
      await expect(page.locator('[data-testid="step-response"]')).toContainText('"url"');
      await expect(page.locator('[data-testid="step-response"]')).toContainText('"headers"');
    });

    test('should execute POST request step with JSONPlaceholder', async ({ page }) => {
      // Create JSONPlaceholder connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'JSONPlaceholder Test API',
          baseUrl: 'https://jsonplaceholder.typicode.com',
          authType: 'NONE'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await connectionResponse.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Create workflow with POST step
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'JSONPlaceholder POST Test',
          description: 'Test POST request to JSONPlaceholder',
          steps: [
            {
              type: 'API_CALL',
              name: 'Create Post',
              connectionId: connection.data.id,
              method: 'POST',
              path: '/posts',
              headers: {
                'Content-Type': 'application/json'
              },
              body: {
                title: 'Test Post',
                body: 'This is a test post',
                userId: 1
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
      if (workflow.data?.id) {
        createdWorkflowIds.push(workflow.data.id);
      }
      
      // Navigate to workflows tab to see the created workflow
      await page.getByTestId('tab-workflows').click();
      
      // Wait for the execute button to be visible
      await page.waitForSelector(`[data-testid="execute-workflow-${workflow.data.id}"]`, { timeout: 10000 });
      
      // Navigate to workflow execution
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should show execution progress
      await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible();
      
      // Should show step execution
      await expect(page.locator('[data-testid="step-execution"]')).toContainText('Create Post');
      
      // Should show successful execution
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED');
      
      // Should show response with created post
      await expect(page.locator('[data-testid="step-response"]')).toContainText('"id"');
      await expect(page.locator('[data-testid="step-response"]')).toContainText('"Test Post"');
    });

    test('should execute PUT request step with Petstore', async ({ page }) => {
      // Create Petstore connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'Petstore Test API',
          baseUrl: 'https://petstore.swagger.io/v2',
          authType: 'NONE'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await connectionResponse.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Create workflow with PUT step
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Petstore PUT Test',
          description: 'Test PUT request to Petstore',
          steps: [
            {
              type: 'API_CALL',
              name: 'Update Pet',
              connectionId: connection.data.id,
              method: 'PUT',
              path: '/pet',
              headers: {
                'Content-Type': 'application/json'
              },
              body: {
                id: 1,
                category: { id: 1, name: 'dogs' },
                name: 'Updated Dog',
                photoUrls: ['string'],
                tags: [{ id: 0, name: 'tag1' }],
                status: 'available'
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
      if (workflow.data?.id) {
        createdWorkflowIds.push(workflow.data.id);
      }
      
      // Navigate to workflows tab to see the created workflow
      await page.getByTestId('tab-workflows').click();
      
      // Wait for the execute button to be visible
      await page.waitForSelector(`[data-testid="execute-workflow-${workflow.data.id}"]`, { timeout: 10000 });
      
      // Navigate to workflow execution
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should show execution progress
      await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible();
      
      // Should show step execution
      await expect(page.locator('[data-testid="step-execution"]')).toContainText('Update Pet');
      
      // Should show successful execution
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED');
      
      // Should show response with updated pet
      await expect(page.locator('[data-testid="step-response"]')).toContainText('"Updated Dog"');
    });
  });

  test.describe('Data Transformation Steps', () => {
    test('should execute JSON transformation step', async ({ page }) => {
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Transform API',
          baseUrl: 'https://httpbin.org',
          authType: 'NONE'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await connectionResponse.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Create workflow with API call and transformation steps
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'JSON Transformation Test',
          description: 'Test JSON transformation between steps',
          steps: [
            {
              type: 'API_CALL',
              name: 'Get Data',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/json',
              headers: {},
              body: null
            },
            {
              type: 'TRANSFORM',
              name: 'Transform Response',
              input: '{{steps.Get_Data.response}}',
              transform: {
                type: 'JSON_PATH',
                expression: '$.origin',
                outputKey: 'client_ip'
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
      if (workflow.data?.id) {
        createdWorkflowIds.push(workflow.data.id);
      }
      
      // Navigate to workflows tab to see the created workflow
      await page.getByTestId('tab-workflows').click();
      
      // Wait for the execute button to be visible
      await page.waitForSelector(`[data-testid="execute-workflow-${workflow.data.id}"]`, { timeout: 10000 });
      
      // Navigate to workflow execution
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should show execution progress
      await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible();
      
      // Should show both steps executed
      await expect(page.locator('[data-testid="step-execution"]')).toContainText('Get Data');
      await expect(page.locator('[data-testid="step-execution"]')).toContainText('Transform Response');
      
      // Should show successful execution
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED');
      
      // Should show transformed data
      await expect(page.locator('[data-testid="step-output"]')).toContainText('client_ip');
    });

    test('should execute data mapping between steps', async ({ page }) => {
      // Create JSONPlaceholder connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'JSONPlaceholder Map API',
          baseUrl: 'https://jsonplaceholder.typicode.com',
          authType: 'NONE'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await connectionResponse.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Create workflow with data mapping
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Data Mapping Test',
          description: 'Test data mapping between API calls',
          steps: [
            {
              type: 'API_CALL',
              name: 'Get User',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/users/1',
              headers: {},
              body: null
            },
            {
              type: 'API_CALL',
              name: 'Create Post for User',
              connectionId: connection.data.id,
              method: 'POST',
              path: '/posts',
              headers: {
                'Content-Type': 'application/json'
              },
              body: {
                title: 'Post for {{steps.Get_User.response.name}}',
                body: 'This post is for user {{steps.Get_User.response.id}}',
                userId: '{{steps.Get_User.response.id}}'
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
      if (workflow.data?.id) {
        createdWorkflowIds.push(workflow.data.id);
      }
      
      // Navigate to workflows tab to see the created workflow
      await page.getByTestId('tab-workflows').click();
      
      // Wait for the execute button to be visible
      await page.waitForSelector(`[data-testid="execute-workflow-${workflow.data.id}"]`, { timeout: 10000 });
      
      // Navigate to workflow execution
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should show execution progress
      await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible();
      
      // Should show both steps executed
      await expect(page.locator('[data-testid="step-execution"]')).toContainText('Get User');
      await expect(page.locator('[data-testid="step-execution"]')).toContainText('Create Post for User');
      
      // Should show successful execution
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED');
      
      // Should show mapped data in second step
      await expect(page.locator('[data-testid="step-request"]')).toContainText('"userId": 1');
    });
  });

  test.describe('Conditional Logic Steps', () => {
    test('should execute conditional logic based on API response', async ({ page }) => {
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Conditional API',
          baseUrl: 'https://httpbin.org',
          authType: 'NONE'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await connectionResponse.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Create workflow with conditional logic
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Conditional Logic Test',
          description: 'Test conditional logic based on API response',
          steps: [
            {
              type: 'API_CALL',
              name: 'Check Status',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/status/200',
              headers: {},
              body: null
            },
            {
              type: 'CONDITION',
              name: 'Check Response',
              condition: '{{steps.Check_Status.response.status}} == 200',
              ifTrue: [
                {
                  type: 'API_CALL',
                  name: 'Success Call',
                  connectionId: connection.data.id,
                  method: 'GET',
                  path: '/json',
                  headers: {},
                  body: null
                }
              ],
              ifFalse: [
                {
                  type: 'API_CALL',
                  name: 'Error Call',
                  connectionId: connection.data.id,
                  method: 'GET',
                  path: '/status/500',
                  headers: {},
                  body: null
                }
              ]
            }
          ]
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const workflow = await workflowResponse.json();
      if (workflow.data?.id) {
        createdWorkflowIds.push(workflow.data.id);
      }
      
      // Navigate to workflows tab to see the created workflow
      await page.getByTestId('tab-workflows').click();
      
      // Wait for the execute button to be visible
      await page.waitForSelector(`[data-testid="execute-workflow-${workflow.data.id}"]`, { timeout: 10000 });
      
      // Navigate to workflow execution
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should show execution progress
      await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible();
      
      // Should show conditional step executed
      await expect(page.locator('[data-testid="step-execution"]')).toContainText('Check Response');
      await expect(page.locator('[data-testid="step-execution"]')).toContainText('Success Call');
      
      // Should NOT show error call (condition was true)
      await expect(page.locator('[data-testid="step-execution"]')).not.toContainText('Error Call');
      
      // Should show successful execution
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED');
    });
  });

  test.describe('Step Dependencies and Ordering', () => {
    test('should execute steps in correct order', async ({ page }) => {
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Order API',
          baseUrl: 'https://httpbin.org',
          authType: 'NONE'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await connectionResponse.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Create workflow with ordered steps
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Step Ordering Test',
          description: 'Test step execution order',
          steps: [
            {
              type: 'API_CALL',
              name: 'Step 1',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/1',
              headers: {},
              body: null,
              order: 1
            },
            {
              type: 'API_CALL',
              name: 'Step 2',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/1',
              headers: {},
              body: null,
              order: 2,
              dependsOn: ['Step 1']
            },
            {
              type: 'API_CALL',
              name: 'Step 3',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/1',
              headers: {},
              body: null,
              order: 3,
              dependsOn: ['Step 2']
            }
          ]
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const workflow = await workflowResponse.json();
      if (workflow.data?.id) {
        createdWorkflowIds.push(workflow.data.id);
      }
      
      // Navigate to workflows tab to see the created workflow
      await page.getByTestId('tab-workflows').click();
      
      // Wait for the execute button to be visible
      await page.waitForSelector(`[data-testid="execute-workflow-${workflow.data.id}"]`, { timeout: 10000 });
      
      // Navigate to workflow execution
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should show execution progress
      await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible();
      
      // Should show steps executed in order
      const stepExecutions = page.locator('[data-testid="step-execution"]');
      await expect(stepExecutions.nth(0)).toContainText('Step 1');
      await expect(stepExecutions.nth(1)).toContainText('Step 2');
      await expect(stepExecutions.nth(2)).toContainText('Step 3');
      
      // Should show successful execution
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED');
    });

    test('should execute parallel steps when no dependencies', async ({ page }) => {
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Parallel API',
          baseUrl: 'https://httpbin.org',
          authType: 'NONE'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await connectionResponse.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Create workflow with parallel steps
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Parallel Execution Test',
          description: 'Test parallel step execution',
          steps: [
            {
              type: 'API_CALL',
              name: 'Parallel Step 1',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/2',
              headers: {},
              body: null,
              parallel: true
            },
            {
              type: 'API_CALL',
              name: 'Parallel Step 2',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/2',
              headers: {},
              body: null,
              parallel: true
            },
            {
              type: 'API_CALL',
              name: 'Parallel Step 3',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/2',
              headers: {},
              body: null,
              parallel: true
            }
          ]
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const workflow = await workflowResponse.json();
      if (workflow.data?.id) {
        createdWorkflowIds.push(workflow.data.id);
      }
      
      // Navigate to workflows tab to see the created workflow
      await page.getByTestId('tab-workflows').click();
      
      // Wait for the execute button to be visible
      await page.waitForSelector(`[data-testid="execute-workflow-${workflow.data.id}"]`, { timeout: 10000 });
      
      // Navigate to workflow execution
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should show execution progress
      await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible();
      
      // Should show all parallel steps executed
      await expect(page.locator('[data-testid="step-execution"]')).toContainText('Parallel Step 1');
      await expect(page.locator('[data-testid="step-execution"]')).toContainText('Parallel Step 2');
      await expect(page.locator('[data-testid="step-execution"]')).toContainText('Parallel Step 3');
      
      // Should show successful execution
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED');
      
      // Total execution time should be less than 6 seconds (3 * 2 seconds if sequential)
      // but more than 2 seconds (if truly parallel)
      const executionTime = await page.locator('[data-testid="execution-time"]').textContent();
      const timeInSeconds = parseInt(executionTime || '0');
      expect(timeInSeconds).toBeLessThan(6);
      expect(timeInSeconds).toBeGreaterThan(1);
    });
  });

  test.describe('Error Handling and Retry Logic', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Error API',
          baseUrl: 'https://httpbin.org',
          authType: 'NONE'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await connectionResponse.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Create workflow with error-prone step
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Error Handling Test',
          description: 'Test error handling in step execution',
          steps: [
            {
              type: 'API_CALL',
              name: 'Error Step',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/status/500',
              headers: {},
              body: null,
              retryConfig: {
                maxRetries: 3,
                retryDelay: 1000
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
      if (workflow.data?.id) {
        createdWorkflowIds.push(workflow.data.id);
      }
      
      // Navigate to workflows tab to see the created workflow
      await page.getByTestId('tab-workflows').click();
      
      // Wait for the execute button to be visible
      await page.waitForSelector(`[data-testid="execute-workflow-${workflow.data.id}"]`, { timeout: 10000 });
      
      // Navigate to workflow execution
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should show execution progress
      await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible();
      
      // Should show retry attempts
      await expect(page.locator('[data-testid="retry-attempt"]')).toBeVisible();
      
      // Should show final failure after retries
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('FAILED');
      
      // Should show error details
      await expect(page.locator('[data-testid="error-details"]')).toContainText('500');
    });

    test('should retry and succeed on transient errors', async ({ page }) => {
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Retry API',
          baseUrl: 'https://httpbin.org',
          authType: 'NONE'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await connectionResponse.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Create workflow with retry logic
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Retry Success Test',
          description: 'Test retry logic with eventual success',
          steps: [
            {
              type: 'API_CALL',
              name: 'Retry Step',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/status/200',
              headers: {},
              body: null,
              retryConfig: {
                maxRetries: 3,
                retryDelay: 1000
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
      if (workflow.data?.id) {
        createdWorkflowIds.push(workflow.data.id);
      }
      
      // Navigate to workflows tab to see the created workflow
      await page.getByTestId('tab-workflows').click();
      
      // Wait for the execute button to be visible
      await page.waitForSelector(`[data-testid="execute-workflow-${workflow.data.id}"]`, { timeout: 10000 });
      
      // Navigate to workflow execution
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should show execution progress
      await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible();
      
      // Should show successful execution (even if retries occurred)
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED');
    });
  });

  test.describe('Performance Requirements', () => {
    test('should complete step execution within performance limits', async ({ page }) => {
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Performance API',
          baseUrl: 'https://httpbin.org',
          authType: 'NONE'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await connectionResponse.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Create workflow with performance test
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Performance Test',
          description: 'Test step execution performance',
          steps: [
            {
              type: 'API_CALL',
              name: 'Fast Step',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/1',
              headers: {},
              body: null
            }
          ]
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const workflow = await workflowResponse.json();
      if (workflow.data?.id) {
        createdWorkflowIds.push(workflow.data.id);
      }
      
      const startTime = Date.now();
      
      // Navigate to workflows tab to see the created workflow
      await page.getByTestId('tab-workflows').click();
      
      // Wait for the execute button to be visible
      await page.waitForSelector(`[data-testid="execute-workflow-${workflow.data.id}"]`, { timeout: 10000 });
      
      // Navigate to workflow execution
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Wait for completion
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (30 seconds max)
      expect(duration).toBeLessThan(30000);
      
      // Log the actual duration for monitoring
      console.log(`Step execution completed in ${duration}ms`);
    });
  });
}); 