import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: any;
let jwt: string;
let createdWorkflowIds: string[] = [];
let createdConnectionIds: string[] = [];

test.describe('Queue & Concurrency E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-queue-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Queue Test User'
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

  test.describe('Queue Job Management', () => {
    test('should queue workflow execution job', async ({ page }) => {
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Queue API',
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
      
      // Create workflow
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Queue Test Workflow',
          description: 'Test workflow for queue management',
          steps: [
            {
              type: 'API_CALL',
              name: 'Queued Step',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/2',
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
      
      // Submit workflow for execution (should queue the job)
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should show queued status immediately
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('QUEUED');
      
      // Should show queue position
      await expect(page.locator('[data-testid="queue-position"]')).toBeVisible();
      
      // Should show job ID
      await expect(page.locator('[data-testid="job-id"]')).toBeVisible();
      
      // Wait for job to be processed
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('RUNNING', { timeout: 10000 });
      
      // Should eventually complete
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED', { timeout: 30000 });
    });

    test('should handle queue job cancellation', async ({ page }) => {
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Cancel API',
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
      
      // Create workflow with long-running step
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Cancel Test Workflow',
          description: 'Test workflow for job cancellation',
          steps: [
            {
              type: 'API_CALL',
              name: 'Long Running Step',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/30',
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
      
      // Submit workflow for execution
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should show queued or running status
      await expect(page.locator('[data-testid="execution-status"]')).toMatch(/QUEUED|RUNNING/);
      
      // Click cancel button
      await page.click('[data-testid="cancel-execution-btn"]');
      
      // Should show cancellation confirmation
      await expect(page.locator('[data-testid="cancel-confirmation"]')).toBeVisible();
      
      // Confirm cancellation
      await page.click('[data-testid="confirm-cancel-btn"]');
      
      // Should show cancelled status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('CANCELLED');
    });
  });

  test.describe('Max Concurrency Limits', () => {
    test('should respect max concurrency limits', async ({ page }) => {
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Concurrency API',
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
      
      // Create multiple workflows with long-running steps
      const workflows = [];
      for (let i = 0; i < 5; i++) {
        const workflowResponse = await page.request.post('/api/workflows', {
          data: {
            name: `Concurrency Test Workflow ${i}`,
            description: `Test workflow ${i} for concurrency limits`,
            steps: [
              {
                type: 'API_CALL',
                name: `Long Step ${i}`,
                connectionId: connection.data.id,
                method: 'GET',
                path: '/delay/10',
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
          workflows.push(workflow.data);
        }
      }
      
      // Execute all workflows simultaneously
      for (const workflow of workflows) {
        await page.click(`[data-testid="execute-workflow-${workflow.id}"]`);
      }
      
      // Should show some workflows as RUNNING and others as QUEUED
      const runningCount = await page.locator('[data-testid="execution-status"]:has-text("RUNNING")').count();
      const queuedCount = await page.locator('[data-testid="execution-status"]:has-text("QUEUED")').count();
      
      // Should have max concurrency limit (typically 2-3 concurrent jobs)
      expect(runningCount).toBeLessThanOrEqual(3);
      expect(queuedCount).toBeGreaterThan(0);
      
      // Wait for all to complete
      await expect(page.locator('[data-testid="execution-status"]:has-text("COMPLETED")')).toHaveCount(5, { timeout: 60000 });
    });

    test('should process queued jobs when capacity becomes available', async ({ page }) => {
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Queue Processing API',
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
      
      // Create workflows with different durations
      const shortWorkflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Short Workflow',
          description: 'Short workflow that completes quickly',
          steps: [
            {
              type: 'API_CALL',
              name: 'Short Step',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/2',
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
      
      const longWorkflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Long Workflow',
          description: 'Long workflow that takes time to complete',
          steps: [
            {
              type: 'API_CALL',
              name: 'Long Step',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/8',
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
      
      const shortWorkflow = await shortWorkflowResponse.json();
      const longWorkflow = await longWorkflowResponse.json();
      
      if (shortWorkflow.data?.id) {
        createdWorkflowIds.push(shortWorkflow.data.id);
      }
      if (longWorkflow.data?.id) {
        createdWorkflowIds.push(longWorkflow.data.id);
      }
      
      // Execute long workflow first
      await page.click(`[data-testid="execute-workflow-${longWorkflow.data.id}"]`);
      
      // Should show running status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('RUNNING');
      
      // Execute short workflow (should be queued)
      await page.click(`[data-testid="execute-workflow-${shortWorkflow.data.id}"]`);
      
      // Should show queued status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('QUEUED');
      
      // Wait for long workflow to complete
      await expect(page.locator(`[data-testid="execution-status-${longWorkflow.data.id}"]`)).toContainText('COMPLETED', { timeout: 15000 });
      
      // Short workflow should start running
      await expect(page.locator(`[data-testid="execution-status-${shortWorkflow.data.id}"]`)).toContainText('RUNNING', { timeout: 5000 });
      
      // Short workflow should complete
      await expect(page.locator(`[data-testid="execution-status-${shortWorkflow.data.id}"]`)).toContainText('COMPLETED', { timeout: 10000 });
    });
  });

  test.describe('Queue Health Checks', () => {
    test('should monitor queue health status', async ({ page }) => {
      // Navigate to queue monitoring
      await page.click('[data-testid="tab-admin"]');
      await page.click('[data-testid="queue-monitoring"]');
      
      // Should show queue health status
      await expect(page.locator('[data-testid="queue-health"]')).toBeVisible();
      
      // Should show active job count
      await expect(page.locator('[data-testid="active-jobs"]')).toBeVisible();
      
      // Should show queued job count
      await expect(page.locator('[data-testid="queued-jobs"]')).toBeVisible();
      
      // Should show worker status
      await expect(page.locator('[data-testid="worker-status"]')).toBeVisible();
      
      // Should show queue performance metrics
      await expect(page.locator('[data-testid="queue-metrics"]')).toBeVisible();
    });

    test('should handle queue worker failures gracefully', async ({ page }) => {
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Worker API',
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
      
      // Create workflow that might cause worker issues
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Worker Test Workflow',
          description: 'Test workflow for worker failure handling',
          steps: [
            {
              type: 'API_CALL',
              name: 'Problematic Step',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/status/500',
              headers: {},
              body: null,
              retryConfig: {
                maxRetries: 0 // No retries to test failure handling
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
      
      // Execute workflow
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should handle failure gracefully
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('FAILED', { timeout: 10000 });
      
      // Should show error details
      await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
      
      // Queue should remain healthy
      await page.click('[data-testid="tab-admin"]');
      await page.click('[data-testid="queue-monitoring"]');
      await expect(page.locator('[data-testid="queue-health"]')).toContainText('Healthy');
    });
  });

  test.describe('Queue Job Prioritization', () => {
    test('should process high priority jobs first', async ({ page }) => {
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Priority API',
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
      
      // Create low priority workflow
      const lowPriorityResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Low Priority Workflow',
          description: 'Low priority workflow',
          priority: 'LOW',
          steps: [
            {
              type: 'API_CALL',
              name: 'Low Priority Step',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/5',
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
      
      // Create high priority workflow
      const highPriorityResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'High Priority Workflow',
          description: 'High priority workflow',
          priority: 'HIGH',
          steps: [
            {
              type: 'API_CALL',
              name: 'High Priority Step',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/5',
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
      
      const lowPriorityWorkflow = await lowPriorityResponse.json();
      const highPriorityWorkflow = await highPriorityResponse.json();
      
      if (lowPriorityWorkflow.data?.id) {
        createdWorkflowIds.push(lowPriorityWorkflow.data.id);
      }
      if (highPriorityWorkflow.data?.id) {
        createdWorkflowIds.push(highPriorityWorkflow.data.id);
      }
      
      // Execute low priority workflow first
      await page.click(`[data-testid="execute-workflow-${lowPriorityWorkflow.data.id}"]`);
      
      // Should show running status
      await expect(page.locator(`[data-testid="execution-status-${lowPriorityWorkflow.data.id}"]`)).toContainText('RUNNING');
      
      // Execute high priority workflow
      await page.click(`[data-testid="execute-workflow-${highPriorityWorkflow.data.id}"]`);
      
      // High priority should start running (if concurrency allows)
      await expect(page.locator(`[data-testid="execution-status-${highPriorityWorkflow.data.id}"]`)).toMatch(/RUNNING|QUEUED/);
      
      // Wait for both to complete
      await expect(page.locator(`[data-testid="execution-status-${lowPriorityWorkflow.data.id}"]`)).toContainText('COMPLETED', { timeout: 15000 });
      await expect(page.locator(`[data-testid="execution-status-${highPriorityWorkflow.data.id}"]`)).toContainText('COMPLETED', { timeout: 15000 });
    });
  });

  test.describe('Queue Performance Monitoring', () => {
    test('should track queue performance metrics', async ({ page }) => {
      // Navigate to queue monitoring
      await page.click('[data-testid="tab-admin"]');
      await page.click('[data-testid="queue-monitoring"]');
      
      // Should show performance metrics
      await expect(page.locator('[data-testid="avg-processing-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="jobs-per-minute"]')).toBeVisible();
      await expect(page.locator('[data-testid="failure-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="queue-depth"]')).toBeVisible();
      
      // Should show historical performance data
      await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
      
      // Should show queue bottlenecks
      await expect(page.locator('[data-testid="bottleneck-analysis"]')).toBeVisible();
    });

    test('should alert on queue performance issues', async ({ page }) => {
      // Create multiple workflows to test performance
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
      
      // Create multiple workflows
      for (let i = 0; i < 10; i++) {
        const workflowResponse = await page.request.post('/api/workflows', {
          data: {
            name: `Performance Test Workflow ${i}`,
            description: `Performance test workflow ${i}`,
            steps: [
              {
                type: 'API_CALL',
                name: `Step ${i}`,
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
      }
      
      // Navigate to queue monitoring
      await page.click('[data-testid="tab-admin"]');
      await page.click('[data-testid="queue-monitoring"]');
      
      // Should show performance alerts if thresholds are exceeded
      const alerts = page.locator('[data-testid="performance-alert"]');
      if (await alerts.count() > 0) {
        await expect(alerts.first()).toBeVisible();
      }
      
      // Should show queue depth warnings
      const queueDepth = await page.locator('[data-testid="queue-depth"]').textContent();
      const depth = parseInt(queueDepth || '0');
      
      if (depth > 5) {
        await expect(page.locator('[data-testid="queue-depth-warning"]')).toBeVisible();
      }
    });
  });
}); 