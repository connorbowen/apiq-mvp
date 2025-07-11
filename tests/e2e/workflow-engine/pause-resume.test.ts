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