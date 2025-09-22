/**
 * E2E Tests: Usage Tracking and Plan Enforcement
 * 
 * These tests validate the usage tracking system and plan limit enforcement
 * across all user actions (API connections, workflow executions, direct API calls).
 * 
 * Test Strategy:
 * - Usage tracking validation for all user actions
 * - Plan limit enforcement testing
 * - Real-time usage updates
 * - Error handling for limit violations
 */

import { test, expect, Page } from '@playwright/test';
import { 
  setupE2E,
  loginAndNavigate,
  getPrimaryActionButton
} from '../../helpers/e2eHelpers';
import { cleanupTestUser } from '../../helpers/testUtils';
import { TestUser, createTestUser } from '../../helpers/testUtils.auth';

test.describe('Usage Tracking and Plan Enforcement', () => {
  let page: Page;
  let testUser: TestUser;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    testUser = await createTestUser();
    await loginAndNavigate(page, testUser);
  });

  test.afterEach(async () => {
    await cleanupTestUser(testUser);
    await page.close();
  });

  test.describe('API Connection Usage Tracking', () => {
    test('should track API connection creation', async () => {
      // Mock initial usage state
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 0, limit: 5 },
            workflowExecutions: { used: 0, limit: 50 },
            directApiCalls: { used: 0, limit: 50 },
            totalExecutions: { used: 0, limit: 100 }
          })
        });
      });

      await page.goto('/dashboard?tab=connections');
      await page.waitForLoadState('networkidle');

      // Create new API connection
      await page.click('[data-testid="create-connection-btn"]');
      await page.waitForSelector('[data-testid="create-connection-modal"]');

      // Fill connection form
      await page.fill('[data-testid="connection-name-input"]', 'Test API');
      await page.fill('[data-testid="connection-base-url-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="auth-type-select"]', 'API_KEY');
      await page.fill('[data-testid="api-key-input"]', 'test-key-123');

      // Submit connection
      await page.click('[data-testid="primary-action save-connection"]');

      // Verify connection was created
      await expect(page.locator('[data-testid="connection-success-message"]')).toBeVisible();

      // Verify usage was tracked
      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Check updated usage display
      await expect(page.locator('[data-testid="api-connections-text"]')).toContainText('1 / 5 connections');
    });

    test('should block API connection creation when limit reached', async () => {
      // Mock user at connection limit
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 5, limit: 5 },
            workflowExecutions: { used: 0, limit: 50 },
            directApiCalls: { used: 0, limit: 50 },
            totalExecutions: { used: 0, limit: 100 }
          })
        });
      });

      await page.goto('/dashboard?tab=connections');
      await page.waitForLoadState('networkidle');

      // Try to create new connection
      await page.click('[data-testid="create-connection-btn"]');

      // Verify limit reached modal
      await expect(page.locator('[data-testid="limit-reached-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="limit-reached-title"]')).toContainText('API Connection Limit Reached');
      await expect(page.locator('[data-testid="limit-reached-message"]')).toContainText('You have reached your limit of 5 API connections');
      
      // Verify upgrade prompt
      await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-to-starter-btn"]')).toBeVisible();
    });

    test('should show warning when approaching connection limit', async () => {
      // Mock user with 4/5 connections
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 4, limit: 5 },
            workflowExecutions: { used: 0, limit: 50 },
            directApiCalls: { used: 0, limit: 50 },
            totalExecutions: { used: 0, limit: 100 }
          })
        });
      });

      await page.goto('/dashboard?tab=connections');
      await page.waitForLoadState('networkidle');

      // Verify warning banner is shown
      await expect(page.locator('[data-testid="connection-limit-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-limit-warning"]')).toContainText('You are approaching your connection limit');
    });
  });

  test.describe('Workflow Execution Usage Tracking', () => {
    test('should track workflow execution', async () => {
      // Mock initial usage state
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 1, limit: 5 },
            workflowExecutions: { used: 0, limit: 50 },
            directApiCalls: { used: 0, limit: 50 },
            totalExecutions: { used: 0, limit: 100 }
          })
        });
      });

      await page.goto('/dashboard?tab=workflows');
      await page.waitForLoadState('networkidle');

      // Create and execute a workflow
      await page.click('[data-testid="create-workflow-btn"]');
      await page.waitForSelector('[data-testid="workflow-creation-modal"]');

      // Fill workflow details
      await page.fill('[data-testid="workflow-name-input"]', 'Test Workflow');
      await page.fill('[data-testid="workflow-description-input"]', 'Test workflow description');

      // Submit workflow
      await page.click('[data-testid="primary-action create-workflow"]');

      // Execute workflow
      await page.click('[data-testid="execute-workflow-btn"]');

      // Verify execution was tracked
      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Check updated usage display
      await expect(page.locator('[data-testid="workflow-executions-text"]')).toContainText('1 / 50 executions');
      await expect(page.locator('[data-testid="total-executions-text"]')).toContainText('1 / 100 total executions');
    });

    test('should block workflow execution when limit reached', async () => {
      // Mock user at execution limit
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 1, limit: 5 },
            workflowExecutions: { used: 50, limit: 50 },
            directApiCalls: { used: 0, limit: 50 },
            totalExecutions: { used: 50, limit: 100 }
          })
        });
      });

      await page.goto('/dashboard?tab=workflows');
      await page.waitForLoadState('networkidle');

      // Try to execute workflow
      await page.click('[data-testid="execute-workflow-btn"]');

      // Verify limit reached modal
      await expect(page.locator('[data-testid="limit-reached-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="limit-reached-title"]')).toContainText('Workflow Execution Limit Reached');
      await expect(page.locator('[data-testid="limit-reached-message"]')).toContainText('You have reached your limit of 50 workflow executions');
    });
  });

  test.describe('Direct API Call Usage Tracking', () => {
    test('should track direct API calls from chat interface', async () => {
      // Mock initial usage state
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 1, limit: 5 },
            workflowExecutions: { used: 0, limit: 50 },
            directApiCalls: { used: 0, limit: 50 },
            totalExecutions: { used: 0, limit: 100 }
          })
        });
      });

      await page.goto('/dashboard?tab=chat');
      await page.waitForLoadState('networkidle');

      // Send direct API call via chat
      await page.fill('[data-testid="chat-input"]', 'Get all pets from the pet store API');
      await page.click('[data-testid="primary-action send-message"]');

      // Wait for API call to complete
      await page.waitForSelector('[data-testid="api-call-result"]');

      // Verify usage was tracked
      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Check updated usage display
      await expect(page.locator('[data-testid="direct-api-calls-text"]')).toContainText('1 / 50 calls');
      await expect(page.locator('[data-testid="total-executions-text"]')).toContainText('1 / 100 total executions');
    });

    test('should block direct API calls when limit reached', async () => {
      // Mock user at direct API call limit
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 1, limit: 5 },
            workflowExecutions: { used: 0, limit: 50 },
            directApiCalls: { used: 50, limit: 50 },
            totalExecutions: { used: 50, limit: 100 }
          })
        });
      });

      await page.goto('/dashboard?tab=chat');
      await page.waitForLoadState('networkidle');

      // Try to send direct API call
      await page.fill('[data-testid="chat-input"]', 'Get all pets from the pet store API');
      await page.click('[data-testid="primary-action send-message"]');

      // Verify limit reached message in chat
      await expect(page.locator('[data-testid="limit-reached-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="limit-reached-message"]')).toContainText('You have reached your limit of 50 direct API calls');
    });
  });

  test.describe('Total Execution Limit Enforcement', () => {
    test('should block any execution when total limit reached', async () => {
      // Mock user at total execution limit
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 1, limit: 5 },
            workflowExecutions: { used: 50, limit: 50 },
            directApiCalls: { used: 50, limit: 50 },
            totalExecutions: { used: 100, limit: 100 }
          })
        });
      });

      // Test workflow execution blocking
      await page.goto('/dashboard?tab=workflows');
      await page.waitForLoadState('networkidle');

      await page.click('[data-testid="execute-workflow-btn"]');
      await expect(page.locator('[data-testid="limit-reached-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="limit-reached-title"]')).toContainText('Total Execution Limit Reached');

      // Test direct API call blocking
      await page.goto('/dashboard?tab=chat');
      await page.waitForLoadState('networkidle');

      await page.fill('[data-testid="chat-input"]', 'Get all pets');
      await page.click('[data-testid="primary-action send-message"]');
      await expect(page.locator('[data-testid="limit-reached-message"]')).toBeVisible();
    });
  });

  test.describe('Real-time Usage Updates', () => {
    test('should update usage display in real-time', async () => {
      // Mock initial usage
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 0, limit: 5 },
            workflowExecutions: { used: 0, limit: 50 },
            directApiCalls: { used: 0, limit: 50 },
            totalExecutions: { used: 0, limit: 100 }
          })
        });
      });

      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Verify initial usage display
      await expect(page.locator('[data-testid="api-connections-text"]')).toContainText('0 / 5 connections');

      // Mock updated usage after action
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 1, limit: 5 },
            workflowExecutions: { used: 0, limit: 50 },
            directApiCalls: { used: 0, limit: 50 },
            totalExecutions: { used: 0, limit: 100 }
          })
        });
      });

      // Simulate usage update (in real app, this would happen after an action)
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify updated usage display
      await expect(page.locator('[data-testid="api-connections-text"]')).toContainText('1 / 5 connections');
    });

    test('should show progress bars with correct percentages', async () => {
      // Mock usage at 80% of limits
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 4, limit: 5 },
            workflowExecutions: { used: 40, limit: 50 },
            directApiCalls: { used: 40, limit: 50 },
            totalExecutions: { used: 80, limit: 100 }
          })
        });
      });

      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Verify progress bars show correct percentages
      await expect(page.locator('[data-testid="api-connections-progress"]')).toHaveAttribute('aria-valuenow', '80');
      await expect(page.locator('[data-testid="workflow-executions-progress"]')).toHaveAttribute('aria-valuenow', '80');
      await expect(page.locator('[data-testid="direct-api-calls-progress"]')).toHaveAttribute('aria-valuenow', '80');
      await expect(page.locator('[data-testid="total-executions-progress"]')).toHaveAttribute('aria-valuenow', '80');
    });
  });

  test.describe('Plan Upgrade from Limit Reached', () => {
    test('should allow immediate upgrade from limit reached modal', async () => {
      // Mock user at limit
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 5, limit: 5 },
            workflowExecutions: { used: 0, limit: 50 },
            directApiCalls: { used: 0, limit: 50 },
            totalExecutions: { used: 0, limit: 100 }
          })
        });
      });

      await page.goto('/dashboard?tab=connections');
      await page.waitForLoadState('networkidle');

      // Try to create connection (should show limit modal)
      await page.click('[data-testid="create-connection-btn"]');
      await expect(page.locator('[data-testid="limit-reached-modal"]')).toBeVisible();

      // Click upgrade button in modal
      await page.click('[data-testid="upgrade-to-starter-btn"]');

      // Verify upgrade modal opens
      await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-modal-title"]')).toContainText('Upgrade to Starter Plan');
    });

    test('should show plan comparison in upgrade flow', async () => {
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 5, limit: 5 },
            workflowExecutions: { used: 0, limit: 50 },
            directApiCalls: { used: 0, limit: 50 },
            totalExecutions: { used: 0, limit: 100 }
          })
        });
      });

      await page.goto('/dashboard?tab=connections');
      await page.waitForLoadState('networkidle');

      // Trigger limit modal and upgrade
      await page.click('[data-testid="create-connection-btn"]');
      await page.click('[data-testid="upgrade-to-starter-btn"]');

      // Verify plan comparison shows current vs new limits
      await expect(page.locator('[data-testid="current-plan-connections"]')).toContainText('5 connections');
      await expect(page.locator('[data-testid="new-plan-connections"]')).toContainText('25 connections');
    });
  });

  test.describe('Error Handling for Usage Tracking', () => {
    test('should handle usage API errors gracefully', async () => {
      // Mock API error
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Verify error message is shown
      await expect(page.locator('[data-testid="usage-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="usage-error"]')).toContainText('Unable to load usage data');
    });

    test('should allow actions when usage API is unavailable', async () => {
      // Mock API error
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await page.goto('/dashboard?tab=connections');
      await page.waitForLoadState('networkidle');

      // Should still allow connection creation when usage API fails
      await page.click('[data-testid="create-connection-btn"]');
      await expect(page.locator('[data-testid="create-connection-modal"]')).toBeVisible();
    });
  });
});
