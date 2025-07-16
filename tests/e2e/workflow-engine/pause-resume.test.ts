import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

import { UXComplianceHelper } from '../../helpers/uxCompliance';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: any;
let jwt: string;
let createdWorkflowIds: string[] = [];
let createdConnectionIds: string[] = [];

test.describe('Pause/Resume E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-pause-resume-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Pause/Resume Test User'
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

  test.describe('Workflow Pause Functionality', () => {
    test('should pause running workflow execution', async ({ page }) => {
      // Validate screen reader compatibility
      await uxHelper.validateScreenReaderCompatibility();
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Pause API',
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
          name: 'Pause Test Workflow',
          description: 'Test workflow for pause functionality',
          steps: [
            {
              type: 'API_CALL',
              name: 'Long Running Step',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/15',
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
      
      // Execute workflow
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should show running status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('RUNNING');
      
      // Wait a moment for execution to start
      await page.waitForTimeout(2000);
      
      // Click pause button
      await page.click('[data-testid="pause-execution-btn"]');
      
      // Should show pause confirmation
      await expect(page.locator('[data-testid="pause-confirmation"]')).toBeVisible();
      
      // Confirm pause
      await page.click('[data-testid="confirm-pause-btn"]');
      
      // Should show paused status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('PAUSED');
      
      // Should show pause timestamp
      await expect(page.locator('[data-testid="pause-timestamp"]')).toBeVisible();
      
      // Should show resume button
      await expect(page.locator('[data-testid="resume-execution-btn"]')).toBeVisible();
    });

    test('should pause workflow at specific step', async ({ page }) => {
      // Validate screen reader compatibility
      await uxHelper.validateScreenReaderCompatibility();
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Step Pause API',
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
      
      // Create workflow with multiple steps
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Step Pause Test Workflow',
          description: 'Test workflow for step-specific pause',
          steps: [
            {
              type: 'API_CALL',
              name: 'Step 1',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/3',
              headers: {},
              body: null
            },
            {
              type: 'API_CALL',
              name: 'Step 2',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/3',
              headers: {},
              body: null
            },
            {
              type: 'API_CALL',
              name: 'Step 3',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/3',
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
      
      // Execute workflow
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should show running status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('RUNNING');
      
      // Wait for Step 1 to complete and Step 2 to start
      await page.waitForTimeout(4000);
      
      // Click pause button
      await page.click('[data-testid="pause-execution-btn"]');
      await page.click('[data-testid="confirm-pause-btn"]');
      
      // Should show paused status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('PAUSED');
      
      // Should show current step (Step 2)
      await expect(page.locator('[data-testid="current-step"]')).toContainText('Step 2');
      
      // Should show completed steps
      await expect(page.locator('[data-testid="completed-steps"]')).toContainText('Step 1');
      
      // Should show pending steps
      await expect(page.locator('[data-testid="pending-steps"]')).toContainText('Step 3');
    });
  });

  test.describe('Workflow Resume Functionality', () => {
    test('should resume paused workflow execution', async ({ page }) => {
      // Validate screen reader compatibility
      await uxHelper.validateScreenReaderCompatibility();
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Resume API',
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
          name: 'Resume Test Workflow',
          description: 'Test workflow for resume functionality',
          steps: [
            {
              type: 'API_CALL',
              name: 'Resumable Step',
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
      }
      
      // Execute workflow
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Wait for execution to start
      await page.waitForTimeout(2000);
      
      // Pause workflow
      await page.click('[data-testid="pause-execution-btn"]');
      await page.click('[data-testid="confirm-pause-btn"]');
      
      // Should show paused status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('PAUSED');
      
      // Click resume button
      await page.click('[data-testid="resume-execution-btn"]');
      
      // Should show resume confirmation
      await expect(page.locator('[data-testid="resume-confirmation"]')).toBeVisible();
      
      // Confirm resume
      await page.click('[data-testid="confirm-resume-btn"]');
      
      // Should show running status again
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('RUNNING');
      
      // Should eventually complete
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED', { timeout: 20000 });
    });

    test('should resume workflow from correct step', async ({ page }) => {
      // Validate screen reader compatibility
      await uxHelper.validateScreenReaderCompatibility();
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Step Resume API',
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
      
      // Create workflow with multiple steps
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Step Resume Test Workflow',
          description: 'Test workflow for step-specific resume',
          steps: [
            {
              type: 'API_CALL',
              name: 'Step 1',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/2',
              headers: {},
              body: null
            },
            {
              type: 'API_CALL',
              name: 'Step 2',
              connectionId: connection.data.id,
              method: 'GET',
              path: '/delay/2',
              headers: {},
              body: null
            },
            {
              type: 'API_CALL',
              name: 'Step 3',
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
      
      // Execute workflow
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Wait for Step 1 to complete and Step 2 to start
      await page.waitForTimeout(3000);
      
      // Pause workflow
      await page.click('[data-testid="pause-execution-btn"]');
      await page.click('[data-testid="confirm-pause-btn"]');
      
      // Should show paused status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('PAUSED');
      
      // Resume workflow
      await page.click('[data-testid="resume-execution-btn"]');
      await page.click('[data-testid="confirm-resume-btn"]');
      
      // Should show running status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('RUNNING');
      
      // Should continue from Step 2 (not restart from Step 1)
      await expect(page.locator('[data-testid="current-step"]')).toContainText('Step 2');
      
      // Should eventually complete
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED', { timeout: 15000 });
      
      // Should show all steps completed
      await expect(page.locator('[data-testid="completed-steps"]')).toContainText('Step 1');
      await expect(page.locator('[data-testid="completed-steps"]')).toContainText('Step 2');
      await expect(page.locator('[data-testid="completed-steps"]')).toContainText('Step 3');
    });
  });

  test.describe('Worker Pause/Resume Handling', () => {
    test('should handle worker pause status checks', async ({ page }) => {
      // Validate screen reader compatibility
      await uxHelper.validateScreenReaderCompatibility();
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
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
      
      // Create workflow
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Worker Pause Test Workflow',
          description: 'Test workflow for worker pause handling',
          steps: [
            {
              type: 'API_CALL',
              name: 'Worker Step',
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
      
      const workflow = await workflowResponse.json();
      if (workflow.data?.id) {
        createdWorkflowIds.push(workflow.data.id);
      }
      
      // Execute workflow
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Should show running status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('RUNNING');
      
      // Simulate worker pause by setting system pause status
      await page.request.post('/api/admin/pause-system', {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Wait for worker to detect pause status
      await page.waitForTimeout(3000);
      
      // Should show paused status (worker detected system pause)
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('PAUSED');
      
      // Resume system
      await page.request.post('/api/admin/resume-system', {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Should resume execution
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('RUNNING', { timeout: 10000 });
      
      // Should eventually complete
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED', { timeout: 20000 });
    });

    test('should requeue jobs when worker detects pause status', async ({ page }) => {
      // Validate screen reader compatibility
      await uxHelper.validateScreenReaderCompatibility();
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Requeue API',
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
      const workflows = [];
      for (let i = 0; i < 3; i++) {
        const workflowResponse = await page.request.post('/api/workflows', {
          data: {
            name: `Requeue Test Workflow ${i}`,
            description: `Test workflow ${i} for requeue functionality`,
            steps: [
              {
                type: 'API_CALL',
                name: `Step ${i}`,
                connectionId: connection.data.id,
                method: 'GET',
                path: '/delay/3',
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
      
      // Execute all workflows
      for (const workflow of workflows) {
        await page.click(`[data-testid="execute-workflow-${workflow.id}"]`);
      }
      
      // Should show some running
      await expect(page.locator('[data-testid="execution-status"]:has-text("RUNNING")')).toHaveCount(1);
      
      // Pause system
      await page.request.post('/api/admin/pause-system', {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Wait for workers to detect pause
      await page.waitForTimeout(5000);
      
      // Should show paused status for running workflows
      await expect(page.locator('[data-testid="execution-status"]:has-text("PAUSED")')).toHaveCount(1);
      
      // Should show queued status for others
      await expect(page.locator('[data-testid="execution-status"]:has-text("QUEUED")')).toHaveCount(2);
      
      // Resume system
      await page.request.post('/api/admin/resume-system', {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Should resume execution
      await expect(page.locator('[data-testid="execution-status"]:has-text("RUNNING")')).toHaveCount(1, { timeout: 10000 });
      
      // Should eventually complete all
      await expect(page.locator('[data-testid="execution-status"]:has-text("COMPLETED")')).toHaveCount(3, { timeout: 30000 });
    });
  });

  test.describe('Pause/Resume State Persistence', () => {
    test('should persist pause state across page refreshes', async ({ page }) => {
      // Validate screen reader compatibility
      await uxHelper.validateScreenReaderCompatibility();
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Persistence API',
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
          name: 'Persistence Test Workflow',
          description: 'Test workflow for pause state persistence',
          steps: [
            {
              type: 'API_CALL',
              name: 'Persistent Step',
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
      }
      
      // Execute workflow
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Wait for execution to start
      await page.waitForTimeout(2000);
      
      // Pause workflow
      await page.click('[data-testid="pause-execution-btn"]');
      await page.click('[data-testid="confirm-pause-btn"]');
      
      // Should show paused status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('PAUSED');
      
      // Refresh page
      await page.reload();
      
      // Should still show paused status after refresh
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('PAUSED');
      
      // Should show resume button
      await expect(page.locator('[data-testid="resume-execution-btn"]')).toBeVisible();
      
      // Resume workflow
      await page.click('[data-testid="resume-execution-btn"]');
      await page.click('[data-testid="confirm-resume-btn"]');
      
      // Should show running status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('RUNNING');
      
      // Should eventually complete
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED', { timeout: 20000 });
    });

    test('should persist pause state across browser sessions', async ({ page, context }) => {
      // Validate screen reader compatibility
      await uxHelper.validateScreenReaderCompatibility();
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Session API',
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
          name: 'Session Test Workflow',
          description: 'Test workflow for pause state across sessions',
          steps: [
            {
              type: 'API_CALL',
              name: 'Session Step',
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
      }
      
      // Execute workflow
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Wait for execution to start
      await page.waitForTimeout(2000);
      
      // Pause workflow
      await page.click('[data-testid="pause-execution-btn"]');
      await page.click('[data-testid="confirm-pause-btn"]');
      
      // Should show paused status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('PAUSED');
      
      // Close current context and create new one
      await context.close();
      const newContext = await page.context().browser()?.newContext();
      const newPage = await newContext?.newPage();
      
      if (newPage) {
        // Login in new session
        await newPage.goto(`${BASE_URL}/login`);
        await newPage.fill('input[name="email"]', testUser.email);
        await newPage.fill('input[name="password"]', 'e2eTestPass123');
        await newPage.click('button[type="submit"]');
        
        // Navigate to workflows
        await newPage.click('[data-testid="tab-workflows"]');
        
        // Should still show paused status in new session
        await expect(newPage.locator('[data-testid="execution-status"]')).toContainText('PAUSED');
        
        // Should show resume button
        await expect(newPage.locator('[data-testid="resume-execution-btn"]')).toBeVisible();
        
        // Resume workflow
        await newPage.click('[data-testid="resume-execution-btn"]');
        await newPage.click('[data-testid="confirm-resume-btn"]');
        
        // Should show running status
        await expect(newPage.locator('[data-testid="execution-status"]')).toContainText('RUNNING');
        
        // Should eventually complete
        await expect(newPage.locator('[data-testid="execution-status"]')).toContainText('COMPLETED', { timeout: 20000 });
        
        await newContext?.close();
      }
    });
  });

  test.describe('Pause/Resume Error Handling', () => {
    test('should handle pause during error conditions', async ({ page }) => {
      // Validate screen reader compatibility
      await uxHelper.validateScreenReaderCompatibility();
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Error Pause API',
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
          name: 'Error Pause Test Workflow',
          description: 'Test workflow for pause during errors',
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
                maxRetries: 2,
                retryDelay: 2000
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
      
      // Wait for retry attempts to start
      await page.waitForTimeout(3000);
      
      // Try to pause during error retries
      await page.click('[data-testid="pause-execution-btn"]');
      await page.click('[data-testid="confirm-pause-btn"]');
      
      // Should handle pause gracefully even during errors
      await expect(page.locator('[data-testid="execution-status"]')).toMatch(/PAUSED|FAILED/);
      
      // If paused, should be able to resume
      if (await page.locator('[data-testid="execution-status"]').textContent()?.includes('PAUSED')) {
        await page.click('[data-testid="resume-execution-btn"]');
        await page.click('[data-testid="confirm-resume-btn"]');
        
        // Should continue retry attempts
        await expect(page.locator('[data-testid="execution-status"]')).toContainText('RUNNING');
      }
    });

    test('should handle resume after long pause periods', async ({ page }) => {
      // Validate screen reader compatibility
      await uxHelper.validateScreenReaderCompatibility();
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
      // Create HTTPBin connection via API first
      const connectionResponse = await page.request.post('/api/connections', {
        data: {
          name: 'HTTPBin Long Pause API',
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
          name: 'Long Pause Test Workflow',
          description: 'Test workflow for long pause periods',
          steps: [
            {
              type: 'API_CALL',
              name: 'Long Pause Step',
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
      
      const workflow = await workflowResponse.json();
      if (workflow.data?.id) {
        createdWorkflowIds.push(workflow.data.id);
      }
      
      // Execute workflow
      await page.click(`[data-testid="execute-workflow-${workflow.data.id}"]`);
      
      // Wait for execution to start
      await page.waitForTimeout(2000);
      
      // Pause workflow
      await page.click('[data-testid="pause-execution-btn"]');
      await page.click('[data-testid="confirm-pause-btn"]');
      
      // Should show paused status
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('PAUSED');
      
      // Wait for a longer period (simulating long pause)
      await page.waitForTimeout(5000);
      
      // Resume workflow
      await page.click('[data-testid="resume-execution-btn"]');
      await page.click('[data-testid="confirm-resume-btn"]');
      
      // Should handle resume after long pause
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('RUNNING');
      
      // Should eventually complete
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('COMPLETED', { timeout: 15000 });
    });
  });
}); 

  test.describe('Error Handling & Edge Cases', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      // Validate screen reader compatibility
      await uxHelper.validateScreenReaderCompatibility();
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
      // TODO: Implement network failure testing
      // - Test offline scenarios
      // - Test timeout scenarios
      // - Test retry logic
    });

    test('should handle invalid input validation', async ({ page }) => {
      // Validate screen reader compatibility
      await uxHelper.validateScreenReaderCompatibility();
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
      // TODO: Implement invalid input testing
      // - Test form validation errors
      // - Test API error responses
      // - Test boundary conditions
    });

    test('should handle rate limiting scenarios', async ({ page }) => {
      // Validate screen reader compatibility
      await uxHelper.validateScreenReaderCompatibility();
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
      // TODO: Implement rate limiting testing
      // - Test rate limit responses
      // - Test retry after rate limit
      // - Test user feedback for rate limits
    });
  });
// TODO: Add UXComplianceHelper integration (P0)
// import { UXComplianceHelper } from '../../helpers/uxCompliance';
// 
// test.beforeEach(async ({ page }) => {
//   const uxHelper = new UXComplianceHelper(page);
//   await uxHelper.validateActivationFirstUX();
//   await uxHelper.validateFormAccessibility();
//   await uxHelper.validateMobileResponsiveness();
//   await uxHelper.validateKeyboardNavigation();
// });

// TODO: Add cookie-based authentication testing (P0)
// - Test HTTP-only cookie authentication
// - Test secure cookie settings
// - Test cookie expiration and cleanup
// - Test cookie-based session management
// - Test authentication state persistence via cookies

// TODO: Replace localStorage with cookie-based authentication (P0)
// Application now uses cookie-based authentication instead of localStorage
// 
// Anti-patterns to remove:
// - localStorage.getItem('token')
// - localStorage.setItem('token', value)
// - localStorage.removeItem('token')
// 
// Replace with cookie-based patterns:
// - Test authentication via HTTP-only cookies
// - Test session management via secure cookies
// - Test logout by clearing authentication cookies

// TODO: Add data cleanup patterns (P0)
// - Clean up test users: await prisma.user.deleteMany({ where: { email: { contains: 'e2e-test' } } });
// - Clean up test connections: await prisma.connection.deleteMany({ where: { name: { contains: 'Test' } } });
// - Clean up test workflows: await prisma.workflow.deleteMany({ where: { name: { contains: 'Test' } } });
// - Clean up test secrets: await prisma.secret.deleteMany({ where: { name: { contains: 'Test' } } });

// TODO: Add deterministic test data (P0)
// - Create predictable test data with unique identifiers
// - Use timestamps or UUIDs to avoid conflicts
// - Example: const testUser = await createTestUser({ email: `e2e-test-${Date.now()}@example.com` });
// - Ensure test data is isolated and doesn't interfere with other tests

// TODO: Ensure test independence (P0)
// - Each test should be able to run in isolation
// - No dependencies on other test execution order
// - Clean state before and after each test
// - Use unique identifiers for all test data
// - Avoid global state modifications

// TODO: Remove API calls from E2E tests (P0)
// E2E tests should ONLY test user interactions through the UI
// API testing should be done in integration tests
// 
// Anti-patterns to remove:
// - page.request.post('/api/connections', {...})
// - fetch('/api/connections')
// - axios.post('/api/connections')
// 
// Replace with UI interactions:
// - await page.click('[data-testid="create-connection-btn"]')
// - await page.fill('[data-testid="connection-name-input"]', 'Test API')
// - await page.click('[data-testid="primary-action submit-btn"]')

// TODO: Remove all API testing from E2E tests (P0)
// E2E tests should ONLY test user interactions through the UI
// API testing belongs in integration tests
// 
// Anti-patterns detected and must be removed:
// - page.request.post('/api/connections', {...})
// - fetch('/api/connections')
// - axios.post('/api/connections')
// - request.get('/api/connections')
// 
// Replace with UI interactions:
// - await page.click('[data-testid="create-connection-btn"]')
// - await page.fill('[data-testid="connection-name-input"]', 'Test API')
// - await page.click('[data-testid="primary-action submit-btn"]')
// - await expect(page.locator('[data-testid="success-message"]')).toBeVisible()

// TODO: Add robust waiting patterns for dynamic elements (P0)
// - Use waitForSelector() instead of hardcoded delays
// - Use expect().toBeVisible() for element visibility checks
// - Use waitForLoadState() for page load completion
// - Use waitForResponse() for API calls
// - Use waitForFunction() for custom conditions
// 
// Example patterns:
// await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
// await expect(page.locator('[data-testid="submit-btn"]')).toBeVisible();
// await page.waitForLoadState('networkidle');
// await page.waitForResponse(response => response.url().includes('/api/'));
// await page.waitForFunction(() => document.querySelector('.loading').style.display === 'none');

// TODO: Replace hardcoded delays with robust waiting (P0)
// Anti-patterns to replace:
// - setTimeout(5000) → await page.waitForSelector(selector, { timeout: 5000 })
// - sleep(3000) → await expect(page.locator(selector)).toBeVisible({ timeout: 3000 })
// - delay(2000) → await page.waitForLoadState('networkidle')
// 
// Best practices:
// - Wait for specific elements to appear
// - Wait for network requests to complete
// - Wait for page state changes
// - Use appropriate timeouts for different operations

// TODO: Add XSS prevention testing (P0)
// - Test input sanitization
// - Test script injection prevention
// - Test HTML escaping
// - Test content security policy compliance

// TODO: Add CSRF protection testing (P0)
// - Test CSRF token validation
// - Test cross-site request forgery prevention
// - Test cookie-based CSRF protection
// - Test secure form submission

// TODO: Add data exposure testing (P0)
// - Test sensitive data handling
// - Test privacy leak prevention
// - Test information disclosure prevention
// - Test data encryption and protection

// TODO: Add authentication flow testing (P0)
// - Test OAuth integration
// - Test SSO (Single Sign-On) flows
// - Test MFA (Multi-Factor Authentication)
// - Test authentication state management

// TODO: Add session management testing (P0)
// - Test cookie-based session management
// - Test session expiration handling
// - Test login state persistence
// - Test logout and session cleanup

// TODO: Add UI interaction testing (P0)
// E2E tests should focus on user interactions through the UI
// - Test clicking buttons and links
// - Test filling forms
// - Test navigation flows
// - Test user workflows end-to-end

// TODO: Add primary action button patterns (P0)
// - Use data-testid="primary-action {action}-btn" pattern
// - Test primary action presence with UXComplianceHelper
// - Validate button text matches standardized patterns

// TODO: Add form accessibility testing (P0)
// - Test form labels and ARIA attributes
// - Test keyboard navigation
// - Test screen reader compatibility
// - Use UXComplianceHelper.validateFormAccessibility()

// TODO: Add workflow execution engine testing (P0)
// - Test workflow execution from start to finish
// - Test step-by-step execution
// - Test execution state management
// - Test execution error handling
// - Test execution monitoring and logging

// TODO: Add natural language workflow creation testing (P0)
// - Test workflow generation from natural language descriptions
// - Test complex multi-step workflow creation
// - Test workflow parameter mapping
// - Test workflow validation and error handling
