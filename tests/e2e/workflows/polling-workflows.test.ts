import { test, expect, Page } from '@playwright/test';
import { 
  setupTestUser, 
  cleanupTestUser, 
  loginUser, 
  createTestApiConnection,
  getPrimaryActionButton,
  waitForElementToBeVisible,
  waitForElementToDisappear
} from '../helpers/e2eHelpers.setup';
import { 
  testWorkflowGeneration,
  testWorkflowExecution,
  testWorkflowManagement
} from '../helpers/workflowHelpers';

test.describe('Polling-Based Workflow Triggers', () => {
  let page: Page;
  let testUserId: string;
  let testConnectionId: string;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    testUserId = await setupTestUser();
    await loginUser(page, testUserId);
    
    // Create a test API connection for polling workflows
    testConnectionId = await createTestApiConnection(testUserId, {
      name: 'Test API for Polling',
      baseUrl: 'https://jsonplaceholder.typicode.com',
      authType: 'NONE',
      status: 'ACTIVE'
    });
  });

  test.afterEach(async () => {
    if (testUserId) {
      await cleanupTestUser(testUserId);
    }
  });

  test.describe('Polling Workflow Creation', () => {
    test('should create polling workflow with simple interval selection', async () => {
      // Navigate to chat interface
      await page.goto('/dashboard?tab=chat');
      await waitForElementToBeVisible(page, '[data-testid="chat-input"]');

      // Request polling workflow creation
      await page.fill('[data-testid="chat-input"]', 'Create a workflow that checks for new posts every 15 minutes and sends me a notification');
      await page.click(getPrimaryActionButton('send-message'));

      // Wait for AI response with polling configuration
      await waitForElementToBeVisible(page, '[data-testid="polling-configuration"]');
      
      // Verify polling configuration UI elements
      await expect(page.locator('[data-testid="polling-interval-select"]')).toBeVisible();
      await expect(page.locator('[data-testid="polling-interval-15min"]')).toBeVisible();
      await expect(page.locator('[data-testid="data-change-detection"]')).toBeVisible();
      
      // Select polling interval
      await page.click('[data-testid="polling-interval-15min"]');
      
      // Configure data change detection
      await page.click('[data-testid="enable-data-change-detection"]');
      await page.fill('[data-testid="change-detection-field"]', 'id');
      
      // Test polling configuration
      await page.click(getPrimaryActionButton('test-polling'));
      await waitForElementToBeVisible(page, '[data-testid="polling-test-success"]');
      
      // Save polling workflow
      await page.click(getPrimaryActionButton('save-polling-workflow'));
      await waitForElementToBeVisible(page, '[data-testid="workflow-saved-success"]');
      
      // Verify workflow was created with polling trigger
      await page.goto('/dashboard?tab=workflows');
      await waitForElementToBeVisible(page, '[data-testid="workflows-list"]');
      
      const workflowItem = page.locator('[data-testid="workflow-item"]').first();
      await expect(workflowItem).toBeVisible();
      await expect(workflowItem.locator('[data-testid="polling-indicator"]')).toBeVisible();
      await expect(workflowItem.locator('[data-testid="polling-interval-display"]')).toContainText('15 minutes');
    });

    test('should show polling status and health monitoring', async () => {
      // Create a polling workflow first
      await page.goto('/dashboard?tab=chat');
      await page.fill('[data-testid="chat-input"]', 'Create a workflow that monitors inventory levels every hour');
      await page.click(getPrimaryActionButton('send-message'));
      
      await waitForElementToBeVisible(page, '[data-testid="polling-configuration"]');
      await page.click('[data-testid="polling-interval-1hr"]');
      await page.click(getPrimaryActionButton('save-polling-workflow'));
      
      // Navigate to workflows tab
      await page.goto('/dashboard?tab=workflows');
      await waitForElementToBeVisible(page, '[data-testid="workflows-list"]');
      
      // Click on polling workflow to view details
      await page.click('[data-testid="workflow-item"]:has([data-testid="polling-indicator"])');
      await waitForElementToBeVisible(page, '[data-testid="workflow-details"]');
      
      // Verify polling status display
      await expect(page.locator('[data-testid="polling-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="last-poll-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="next-poll-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="polling-health-indicator"]')).toBeVisible();
      
      // Test polling manually
      await page.click(getPrimaryActionButton('test-polling-now'));
      await waitForElementToBeVisible(page, '[data-testid="polling-test-in-progress"]');
      await waitForElementToBeVisible(page, '[data-testid="polling-test-complete"]');
    });

    test('should handle polling configuration errors gracefully', async () => {
      await page.goto('/dashboard?tab=chat');
      await page.fill('[data-testid="chat-input"]', 'Create a workflow that checks a broken API every 5 minutes');
      await page.click(getPrimaryActionButton('send-message'));
      
      await waitForElementToBeVisible(page, '[data-testid="polling-configuration"]');
      await page.click('[data-testid="polling-interval-5min"]');
      
      // Test with invalid API endpoint
      await page.fill('[data-testid="api-endpoint"]', 'https://invalid-api.com/nonexistent');
      await page.click(getPrimaryActionButton('test-polling'));
      
      // Verify error handling
      await waitForElementToBeVisible(page, '[data-testid="polling-test-error"]');
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Unable to connect to API');
      
      // Verify user can retry or modify configuration
      await expect(page.locator(getPrimaryActionButton('retry-polling-test'))).toBeVisible();
      await expect(page.locator(getPrimaryActionButton('modify-configuration'))).toBeVisible();
    });
  });

  test.describe('Polling Workflow Execution', () => {
    test('should execute polling workflow when data changes', async () => {
      // Create polling workflow
      await page.goto('/dashboard?tab=chat');
      await page.fill('[data-testid="chat-input"]', 'Create a workflow that checks for new users every 10 minutes and logs them');
      await page.click(getPrimaryActionButton('send-message'));
      
      await waitForElementToBeVisible(page, '[data-testid="polling-configuration"]');
      await page.click('[data-testid="polling-interval-10min"]');
      await page.click('[data-testid="enable-data-change-detection"]');
      await page.fill('[data-testid="change-detection-field"]', 'id');
      await page.click(getPrimaryActionButton('save-polling-workflow'));
      
      // Navigate to workflows and activate polling
      await page.goto('/dashboard?tab=workflows');
      await waitForElementToBeVisible(page, '[data-testid="workflows-list"]');
      
      const workflowItem = page.locator('[data-testid="workflow-item"]:has([data-testid="polling-indicator"])');
      await workflowItem.click();
      await page.click(getPrimaryActionButton('activate-polling'));
      
      // Verify polling is active
      await expect(page.locator('[data-testid="polling-status-active"]')).toBeVisible();
      
      // Simulate data change by triggering manual execution
      await page.click(getPrimaryActionButton('trigger-polling-now'));
      await waitForElementToBeVisible(page, '[data-testid="polling-execution-started"]');
      await waitForElementToBeVisible(page, '[data-testid="polling-execution-complete"]');
      
      // Verify execution results
      await expect(page.locator('[data-testid="execution-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="data-changes-detected"]')).toBeVisible();
    });

    test('should handle polling execution failures with retry logic', async () => {
      // Create polling workflow with potentially failing API
      await page.goto('/dashboard?tab=chat');
      await page.fill('[data-testid="chat-input"]', 'Create a workflow that checks an unreliable API every 5 minutes');
      await page.click(getPrimaryActionButton('send-message'));
      
      await waitForElementToBeVisible(page, '[data-testid="polling-configuration"]');
      await page.click('[data-testid="polling-interval-5min"]');
      await page.click(getPrimaryActionButton('save-polling-workflow'));
      
      // Activate polling
      await page.goto('/dashboard?tab=workflows');
      const workflowItem = page.locator('[data-testid="workflow-item"]:has([data-testid="polling-indicator"])');
      await workflowItem.click();
      await page.click(getPrimaryActionButton('activate-polling'));
      
      // Simulate API failure
      await page.click(getPrimaryActionButton('simulate-api-failure'));
      await waitForElementToBeVisible(page, '[data-testid="polling-execution-failed"]');
      
      // Verify retry logic
      await expect(page.locator('[data-testid="retry-countdown"]')).toBeVisible();
      await expect(page.locator('[data-testid="next-retry-time"]')).toBeVisible();
      
      // Test manual retry
      await page.click(getPrimaryActionButton('retry-polling-now'));
      await waitForElementToBeVisible(page, '[data-testid="polling-retry-in-progress"]');
    });

    test('should respect rate limiting for polling requests', async () => {
      // Create high-frequency polling workflow
      await page.goto('/dashboard?tab=chat');
      await page.fill('[data-testid="chat-input"]', 'Create a workflow that checks an API every 30 seconds');
      await page.click(getPrimaryActionButton('send-message'));
      
      await waitForElementToBeVisible(page, '[data-testid="polling-configuration"]');
      
      // Try to select very frequent polling
      await page.click('[data-testid="polling-interval-30sec"]');
      
      // Verify rate limiting warning
      await expect(page.locator('[data-testid="rate-limit-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="rate-limit-message"]')).toContainText('30 seconds is too frequent');
      
      // Verify system suggests appropriate interval
      await expect(page.locator('[data-testid="suggested-interval"]')).toContainText('5 minutes');
      
      // Select suggested interval
      await page.click('[data-testid="use-suggested-interval"]');
      await expect(page.locator('[data-testid="polling-interval-5min"]')).toHaveClass(/selected/);
    });
  });

  test.describe('Polling Workflow Management', () => {
    test('should pause and resume polling workflows', async () => {
      // Create and activate polling workflow
      await page.goto('/dashboard?tab=chat');
      await page.fill('[data-testid="chat-input"]', 'Create a workflow that monitors orders every hour');
      await page.click(getPrimaryActionButton('send-message'));
      
      await waitForElementToBeVisible(page, '[data-testid="polling-configuration"]');
      await page.click('[data-testid="polling-interval-1hr"]');
      await page.click(getPrimaryActionButton('save-polling-workflow'));
      
      await page.goto('/dashboard?tab=workflows');
      const workflowItem = page.locator('[data-testid="workflow-item"]:has([data-testid="polling-indicator"])');
      await workflowItem.click();
      await page.click(getPrimaryActionButton('activate-polling'));
      
      // Pause polling
      await page.click(getPrimaryActionButton('pause-polling'));
      await waitForElementToBeVisible(page, '[data-testid="polling-paused-confirmation"]');
      await page.click(getPrimaryActionButton('confirm-pause'));
      
      // Verify polling is paused
      await expect(page.locator('[data-testid="polling-status-paused"]')).toBeVisible();
      await expect(page.locator('[data-testid="pause-reason"]')).toBeVisible();
      
      // Resume polling
      await page.click(getPrimaryActionButton('resume-polling'));
      await waitForElementToBeVisible(page, '[data-testid="polling-resumed-confirmation"]');
      
      // Verify polling is active again
      await expect(page.locator('[data-testid="polling-status-active"]')).toBeVisible();
    });

    test('should edit polling configuration', async () => {
      // Create polling workflow
      await page.goto('/dashboard?tab=chat');
      await page.fill('[data-testid="chat-input"]', 'Create a workflow that checks inventory every 2 hours');
      await page.click(getPrimaryActionButton('send-message'));
      
      await waitForElementToBeVisible(page, '[data-testid="polling-configuration"]');
      await page.click('[data-testid="polling-interval-2hr"]');
      await page.click(getPrimaryActionButton('save-polling-workflow'));
      
      // Edit polling configuration
      await page.goto('/dashboard?tab=workflows');
      const workflowItem = page.locator('[data-testid="workflow-item"]:has([data-testid="polling-indicator"])');
      await workflowItem.click();
      await page.click(getPrimaryActionButton('edit-polling-config'));
      
      // Modify polling interval
      await page.click('[data-testid="polling-interval-30min"]');
      await page.click('[data-testid="enable-data-change-detection"]');
      await page.fill('[data-testid="change-detection-field"]', 'updatedAt');
      
      // Save changes
      await page.click(getPrimaryActionButton('save-polling-changes'));
      await waitForElementToBeVisible(page, '[data-testid="polling-config-updated"]');
      
      // Verify changes
      await expect(page.locator('[data-testid="polling-interval-display"]')).toContainText('30 minutes');
      await expect(page.locator('[data-testid="change-detection-enabled"]')).toBeVisible();
    });

    test('should delete polling workflows with confirmation', async () => {
      // Create polling workflow
      await page.goto('/dashboard?tab=chat');
      await page.fill('[data-testid="chat-input"]', 'Create a workflow that monitors sales every day');
      await page.click(getPrimaryActionButton('send-message'));
      
      await waitForElementToBeVisible(page, '[data-testid="polling-configuration"]');
      await page.click('[data-testid="polling-interval-1day"]');
      await page.click(getPrimaryActionButton('save-polling-workflow'));
      
      // Delete polling workflow
      await page.goto('/dashboard?tab=workflows');
      const workflowItem = page.locator('[data-testid="workflow-item"]:has([data-testid="polling-indicator"])');
      await workflowItem.click();
      await page.click(getPrimaryActionButton('delete-polling-workflow'));
      
      // Confirm deletion
      await waitForElementToBeVisible(page, '[data-testid="delete-polling-confirmation"]');
      await expect(page.locator('[data-testid="delete-warning"]')).toContainText('This will stop all polling and delete the workflow');
      await page.click(getPrimaryActionButton('confirm-delete-polling'));
      
      // Verify deletion
      await waitForElementToBeVisible(page, '[data-testid="polling-workflow-deleted"]');
      await expect(page.locator('[data-testid="workflows-list"]')).not.toContainText('monitors sales');
    });
  });

  test.describe('Polling Workflow Performance', () => {
    test('should handle multiple polling workflows efficiently', async () => {
      // Create multiple polling workflows
      const workflows = [
        { name: 'Check orders every 15 minutes', interval: '15min' },
        { name: 'Monitor inventory every hour', interval: '1hr' },
        { name: 'Check users every 6 hours', interval: '6hr' }
      ];
      
      for (const workflow of workflows) {
        await page.goto('/dashboard?tab=chat');
        await page.fill('[data-testid="chat-input"]', `Create a workflow that ${workflow.name}`);
        await page.click(getPrimaryActionButton('send-message'));
        
        await waitForElementToBeVisible(page, '[data-testid="polling-configuration"]');
        await page.click(`[data-testid="polling-interval-${workflow.interval}"]`);
        await page.click(getPrimaryActionButton('save-polling-workflow'));
      }
      
      // Navigate to workflows and verify all are created
      await page.goto('/dashboard?tab=workflows');
      await waitForElementToBeVisible(page, '[data-testid="workflows-list"]');
      
      const pollingWorkflows = page.locator('[data-testid="workflow-item"]:has([data-testid="polling-indicator"])');
      await expect(pollingWorkflows).toHaveCount(3);
      
      // Activate all polling workflows
      for (let i = 0; i < 3; i++) {
        await pollingWorkflows.nth(i).click();
        await page.click(getPrimaryActionButton('activate-polling'));
        await page.goBack();
      }
      
      // Verify all are active
      await expect(page.locator('[data-testid="polling-status-active"]')).toHaveCount(3);
    });

    test('should show polling performance metrics', async () => {
      // Create and activate polling workflow
      await page.goto('/dashboard?tab=chat');
      await page.fill('[data-testid="chat-input"]', 'Create a workflow that checks API status every 5 minutes');
      await page.click(getPrimaryActionButton('send-message'));
      
      await waitForElementToBeVisible(page, '[data-testid="polling-configuration"]');
      await page.click('[data-testid="polling-interval-5min"]');
      await page.click(getPrimaryActionButton('save-polling-workflow'));
      
      // Activate and run some executions
      await page.goto('/dashboard?tab=workflows');
      const workflowItem = page.locator('[data-testid="workflow-item"]:has([data-testid="polling-indicator"])');
      await workflowItem.click();
      await page.click(getPrimaryActionButton('activate-polling'));
      
      // Trigger a few executions
      for (let i = 0; i < 3; i++) {
        await page.click(getPrimaryActionButton('trigger-polling-now'));
        await waitForElementToBeVisible(page, '[data-testid="polling-execution-complete"]');
        await page.waitForTimeout(1000);
      }
      
      // View performance metrics
      await page.click(getPrimaryActionButton('view-polling-metrics'));
      await waitForElementToBeVisible(page, '[data-testid="polling-metrics"]');
      
      // Verify metrics display
      await expect(page.locator('[data-testid="total-executions"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-response-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="last-execution-time"]')).toBeVisible();
    });
  });

  test.describe('Polling Workflow UX Compliance', () => {
    test('should have clear headings and navigation for polling features', async () => {
      await page.goto('/dashboard?tab=chat');
      await page.fill('[data-testid="chat-input"]', 'Create a polling workflow');
      await page.click(getPrimaryActionButton('send-message'));
      
      await waitForElementToBeVisible(page, '[data-testid="polling-configuration"]');
      
      // Verify clear headings
      await expect(page.locator('h2:has-text("Configure Polling")')).toBeVisible();
      await expect(page.locator('h3:has-text("Polling Interval")')).toBeVisible();
      await expect(page.locator('h3:has-text("Data Change Detection")')).toBeVisible();
      
      // Verify form labels
      await expect(page.locator('label[for="polling-interval"]')).toBeVisible();
      await expect(page.locator('label[for="change-detection"]')).toBeVisible();
      
      // Verify accessibility
      await expect(page.locator('[data-testid="polling-interval-select"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="change-detection-field"]')).toHaveAttribute('aria-describedby');
    });

    test('should provide clear error messages and recovery options', async () => {
      await page.goto('/dashboard?tab=chat');
      await page.fill('[data-testid="chat-input"]', 'Create a workflow that checks a broken API');
      await page.click(getPrimaryActionButton('send-message'));
      
      await waitForElementToBeVisible(page, '[data-testid="polling-configuration"]');
      await page.click('[data-testid="polling-interval-5min"]');
      
      // Test with invalid configuration
      await page.fill('[data-testid="api-endpoint"]', 'invalid-url');
      await page.click(getPrimaryActionButton('test-polling'));
      
      // Verify clear error message
      await waitForElementToBeVisible(page, '[data-testid="polling-test-error"]');
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Please check the API endpoint URL');
      
      // Verify recovery options
      await expect(page.locator(getPrimaryActionButton('retry-polling-test'))).toBeVisible();
      await expect(page.locator(getPrimaryActionButton('modify-configuration'))).toBeVisible();
      await expect(page.locator('[data-testid="help-link"]')).toBeVisible();
    });

    test('should be mobile responsive for polling configuration', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/dashboard?tab=chat');
      await page.fill('[data-testid="chat-input"]', 'Create a polling workflow');
      await page.click(getPrimaryActionButton('send-message'));
      
      await waitForElementToBeVisible(page, '[data-testid="polling-configuration"]');
      
      // Verify mobile-friendly layout
      await expect(page.locator('[data-testid="polling-interval-select"]')).toBeVisible();
      await expect(page.locator('[data-testid="polling-interval-options"]')).toHaveCSS('flex-direction', 'column');
      
      // Verify touch targets are appropriately sized
      const intervalButtons = page.locator('[data-testid^="polling-interval-"]');
      const firstButton = intervalButtons.first();
      const buttonBox = await firstButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44); // Minimum touch target size
    });
  });
});
