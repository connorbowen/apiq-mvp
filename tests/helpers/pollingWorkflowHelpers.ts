import { Page, expect } from '@playwright/test';
import { waitForElement } from './uiHelpers';
import { getPrimaryActionButton } from './e2eHelpers.navigation';

/**
 * Polling Workflow Test Helpers
 * 
 * Comprehensive helper functions for testing polling-based workflow triggers
 * following user-rules.md testing requirements and UX compliance standards.
 */

export interface PollingWorkflowConfig {
  name: string;
  interval: '30sec' | '5min' | '15min' | '30min' | '1hr' | '2hr' | '6hr' | '12hr' | '1day';
  apiEndpoint?: string;
  changeDetection?: {
    enabled: boolean;
    field: string;
    threshold?: number;
  };
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface PollingExecutionResult {
  success: boolean;
  executionId: string;
  dataChanges: boolean;
  responseTime: number;
  error?: string;
}

/**
 * Creates a polling workflow through the chat interface
 */
export async function createPollingWorkflow(
  page: Page,
  config: PollingWorkflowConfig
): Promise<string> {
  // Navigate to chat interface
  await page.goto('/dashboard?tab=chat');
  await waitForElement(page, '[data-testid="chat-input"]');

  // Request polling workflow creation
  const workflowDescription = `Create a workflow that ${config.name}`;
  await page.fill('[data-testid="chat-input"]', workflowDescription);
  await getPrimaryActionButton(page, 'send-message').click();

  // Wait for polling configuration UI
  await waitForElement(page, '[data-testid="polling-configuration"]');
  
  // Configure polling interval
  await page.click(`[data-testid="polling-interval-${config.interval}"]`);
  
  // Configure API endpoint if provided
  if (config.apiEndpoint) {
    await page.fill('[data-testid="api-endpoint"]', config.apiEndpoint);
  }
  
  // Configure data change detection if enabled
  if (config.changeDetection?.enabled) {
    await page.click('[data-testid="enable-data-change-detection"]');
    await page.fill('[data-testid="change-detection-field"]', config.changeDetection.field);
    
    if (config.changeDetection.threshold) {
      await page.fill('[data-testid="change-threshold"]', config.changeDetection.threshold.toString());
    }
  }
  
  // Test polling configuration
  await getPrimaryActionButton(page, 'test-polling').click();
  await waitForElement(page, '[data-testid="polling-test-success"]');
  
  // Save polling workflow
  await getPrimaryActionButton(page, 'save-polling-workflow').click();
  await waitForElement(page, '[data-testid="workflow-saved-success"]');
  
  // Extract workflow ID from success message
  const successMessage = await page.textContent('[data-testid="workflow-saved-success"]');
  const workflowIdMatch = successMessage?.match(/workflow-([a-zA-Z0-9-]+)/);
  return workflowIdMatch ? workflowIdMatch[1] : 'unknown';
}

/**
 * Activates a polling workflow
 */
export async function activatePollingWorkflow(page: Page, workflowId: string): Promise<void> {
  await page.goto('/dashboard?tab=workflows');
  await waitForElement(page, '[data-testid="workflows-list"]');
  
  // Find and click the polling workflow
  const workflowItem = page.locator(`[data-testid="workflow-item"][data-workflow-id="${workflowId}"]`);
  await expect(workflowItem).toBeVisible();
  await workflowItem.click();
  
  // Activate polling
  await getPrimaryActionButton(page, 'activate-polling').click();
  await waitForElement(page, '[data-testid="polling-status-active"]');
}

/**
 * Pauses a polling workflow
 */
export async function pausePollingWorkflow(page: Page, workflowId: string): Promise<void> {
  await page.goto('/dashboard?tab=workflows');
  const workflowItem = page.locator(`[data-testid="workflow-item"][data-workflow-id="${workflowId}"]`);
  await workflowItem.click();
  
  // Pause polling
  await getPrimaryActionButton(page, 'pause-polling').click();
  await waitForElement(page, '[data-testid="polling-paused-confirmation"]');
  await getPrimaryActionButton(page, 'confirm-pause').click();
  
  // Verify polling is paused
  await expect(page.locator('[data-testid="polling-status-paused"]')).toBeVisible();
}

/**
 * Resumes a paused polling workflow
 */
export async function resumePollingWorkflow(page: Page, workflowId: string): Promise<void> {
  await page.goto('/dashboard?tab=workflows');
  const workflowItem = page.locator(`[data-testid="workflow-item"][data-workflow-id="${workflowId}"]`);
  await workflowItem.click();
  
  // Resume polling
  await getPrimaryActionButton(page, 'resume-polling').click();
  await waitForElement(page, '[data-testid="polling-resumed-confirmation"]');
  
  // Verify polling is active
  await expect(page.locator('[data-testid="polling-status-active"]')).toBeVisible();
}

/**
 * Triggers a manual polling execution
 */
export async function triggerPollingExecution(page: Page, workflowId: string): Promise<PollingExecutionResult> {
  await page.goto('/dashboard?tab=workflows');
  const workflowItem = page.locator(`[data-testid="workflow-item"][data-workflow-id="${workflowId}"]`);
  await workflowItem.click();
  
  // Trigger manual execution
  await getPrimaryActionButton(page, 'trigger-polling-now').click();
  await waitForElement(page, '[data-testid="polling-execution-started"]');
  
  // Wait for execution to complete
  await waitForElement(page, '[data-testid="polling-execution-complete"]');
  
  // Extract execution results
  const executionId = await page.textContent('[data-testid="execution-id"]') || 'unknown';
  const success = await page.locator('[data-testid="execution-success"]').isVisible();
  const dataChanges = await page.locator('[data-testid="data-changes-detected"]').isVisible();
  const responseTime = parseInt(await page.textContent('[data-testid="response-time"]') || '0');
  
  let error: string | undefined;
  if (!success) {
    error = await page.textContent('[data-testid="execution-error"]') || 'Unknown error';
  }
  
  return {
    success,
    executionId,
    dataChanges,
    responseTime,
    error
  };
}

/**
 * Tests polling configuration with various scenarios
 */
export async function testPollingConfiguration(
  page: Page,
  config: PollingWorkflowConfig,
  testScenarios: ('valid' | 'invalid-endpoint' | 'rate-limit' | 'auth-error')[]
): Promise<void> {
  await page.goto('/dashboard?tab=chat');
  await page.fill('[data-testid="chat-input"]', `Create a workflow that ${config.name}`);
  await getPrimaryActionButton(page, 'send-message').click();
  
  await waitForElement(page, '[data-testid="polling-configuration"]');
  await page.click(`[data-testid="polling-interval-${config.interval}"]`);
  
  for (const scenario of testScenarios) {
    switch (scenario) {
      case 'valid':
        await page.fill('[data-testid="api-endpoint"]', 'https://jsonplaceholder.typicode.com/posts');
        break;
      case 'invalid-endpoint':
        await page.fill('[data-testid="api-endpoint"]', 'https://invalid-api.com/nonexistent');
        break;
      case 'rate-limit':
        await page.fill('[data-testid="api-endpoint"]', 'https://httpbin.org/rate-limit/1');
        break;
      case 'auth-error':
        await page.fill('[data-testid="api-endpoint"]', 'https://httpbin.org/status/401');
        break;
    }
    
    await getPrimaryActionButton(page, 'test-polling').click();
    
    if (scenario === 'valid') {
      await waitForElement(page, '[data-testid="polling-test-success"]');
    } else {
      await waitForElement(page, '[data-testid="polling-test-error"]');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    }
  }
}

/**
 * Verifies polling workflow performance metrics
 */
export async function verifyPollingMetrics(
  page: Page,
  workflowId: string,
  expectedMetrics: {
    minExecutions?: number;
    minSuccessRate?: number;
    maxResponseTime?: number;
  }
): Promise<void> {
  await page.goto('/dashboard?tab=workflows');
  const workflowItem = page.locator(`[data-testid="workflow-item"][data-workflow-id="${workflowId}"]`);
  await workflowItem.click();
  
  // View performance metrics
  await getPrimaryActionButton(page, 'view-polling-metrics').click();
  await waitForElement(page, '[data-testid="polling-metrics"]');
  
  // Verify metrics are displayed
  await expect(page.locator('[data-testid="total-executions"]')).toBeVisible();
  await expect(page.locator('[data-testid="success-rate"]')).toBeVisible();
  await expect(page.locator('[data-testid="average-response-time"]')).toBeVisible();
  await expect(page.locator('[data-testid="last-execution-time"]')).toBeVisible();
  
  // Verify metric values if provided
  if (expectedMetrics.minExecutions) {
    const totalExecutions = parseInt(await page.textContent('[data-testid="total-executions"]') || '0');
    expect(totalExecutions).toBeGreaterThanOrEqual(expectedMetrics.minExecutions);
  }
  
  if (expectedMetrics.minSuccessRate) {
    const successRate = parseFloat(await page.textContent('[data-testid="success-rate"]') || '0');
    expect(successRate).toBeGreaterThanOrEqual(expectedMetrics.minSuccessRate);
  }
  
  if (expectedMetrics.maxResponseTime) {
    const responseTime = parseInt(await page.textContent('[data-testid="average-response-time"]') || '0');
    expect(responseTime).toBeLessThanOrEqual(expectedMetrics.maxResponseTime);
  }
}

/**
 * Tests polling workflow error handling and recovery
 */
export async function testPollingErrorHandling(
  page: Page,
  workflowId: string,
  errorType: 'network' | 'timeout' | 'auth' | 'rate-limit'
): Promise<void> {
  await page.goto('/dashboard?tab=workflows');
  const workflowItem = page.locator(`[data-testid="workflow-item"][data-workflow-id="${workflowId}"]`);
  await workflowItem.click();
  
  // Simulate different error types
  switch (errorType) {
    case 'network':
      await getPrimaryActionButton(page, 'simulate-network-error').click();
      break;
    case 'timeout':
      await getPrimaryActionButton(page, 'simulate-timeout').click();
      break;
    case 'auth':
      await getPrimaryActionButton(page, 'simulate-auth-error').click();
      break;
    case 'rate-limit':
      await getPrimaryActionButton(page, 'simulate-rate-limit').click();
      break;
  }
  
  // Verify error handling
  await waitForElement(page, '[data-testid="polling-execution-failed"]');
  await expect(page.locator('[data-testid="error-type"]')).toContainText(errorType);
  await expect(page.locator('[data-testid="retry-countdown"]')).toBeVisible();
  await expect(page.locator('[data-testid="next-retry-time"]')).toBeVisible();
  
  // Test retry functionality
  await getPrimaryActionButton(page, 'retry-polling-now').click();
  await waitForElement(page, '[data-testid="polling-retry-in-progress"]');
}

/**
 * Verifies UX compliance for polling workflows
 */
export async function verifyPollingUXCompliance(page: Page): Promise<void> {
  await page.goto('/dashboard?tab=chat');
  await page.fill('[data-testid="chat-input"]', 'Create a polling workflow');
  await getPrimaryActionButton(page, 'send-message').click();
  
  await waitForElement(page, '[data-testid="polling-configuration"]');
  
  // Verify clear headings
  await expect(page.locator('h2:has-text("Configure Polling")')).toBeVisible();
  await expect(page.locator('h3:has-text("Polling Interval")')).toBeVisible();
  await expect(page.locator('h3:has-text("Data Change Detection")')).toBeVisible();
  
  // Verify form labels
  await expect(page.locator('label[for="polling-interval"]')).toBeVisible();
  await expect(page.locator('label[for="change-detection"]')).toBeVisible();
  
  // Verify accessibility attributes
  await expect(page.locator('[data-testid="polling-interval-select"]')).toHaveAttribute('aria-label');
  await expect(page.locator('[data-testid="change-detection-field"]')).toHaveAttribute('aria-describedby');
  
  // Verify button states
  await expect(getPrimaryActionButton(page, 'test-polling')).toBeVisible();
  await expect(getPrimaryActionButton(page, 'save-polling-workflow')).toBeVisible();
  
  // Verify error states
  await page.fill('[data-testid="api-endpoint"]', 'invalid-url');
  await getPrimaryActionButton(page, 'test-polling').click();
  await waitForElement(page, '[data-testid="polling-test-error"]');
  
  // Verify error message is accessible
  await expect(page.locator('[data-testid="error-message"]')).toHaveAttribute('role', 'alert');
  await expect(page.locator('[data-testid="error-message"]')).toHaveAttribute('aria-live', 'polite');
}

/**
 * Tests mobile responsiveness for polling workflows
 */
export async function testPollingMobileResponsiveness(page: Page): Promise<void> {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  
  await page.goto('/dashboard?tab=chat');
  await page.fill('[data-testid="chat-input"]', 'Create a polling workflow');
  await getPrimaryActionButton(page, 'send-message').click();
  
  await waitForElement(page, '[data-testid="polling-configuration"]');
  
  // Verify mobile-friendly layout
  await expect(page.locator('[data-testid="polling-interval-select"]')).toBeVisible();
  await expect(page.locator('[data-testid="polling-interval-options"]')).toHaveCSS('flex-direction', 'column');
  
  // Verify touch targets are appropriately sized
  const intervalButtons = page.locator('[data-testid^="polling-interval-"]');
  const firstButton = intervalButtons.first();
  const buttonBox = await firstButton.boundingBox();
  expect(buttonBox?.height).toBeGreaterThanOrEqual(44); // Minimum touch target size
  
  // Verify mobile navigation
  await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
  await expect(page.locator('[data-testid="mobile-back-button"]')).toBeVisible();
}

/**
 * Comprehensive polling workflow test suite
 */
export async function testPollingWorkflowComprehensive(
  page: Page,
  config: PollingWorkflowConfig
): Promise<void> {
  // 1. Create polling workflow
  const workflowId = await createPollingWorkflow(page, config);
  expect(workflowId).toBeTruthy();
  
  // 2. Activate polling
  await activatePollingWorkflow(page, workflowId);
  
  // 3. Test manual execution
  const executionResult = await triggerPollingExecution(page, workflowId);
  expect(executionResult.success).toBe(true);
  
  // 4. Test pause/resume
  await pausePollingWorkflow(page, workflowId);
  await resumePollingWorkflow(page, workflowId);
  
  // 5. Test error handling
  await testPollingErrorHandling(page, workflowId, 'network');
  
  // 6. Verify metrics
  await verifyPollingMetrics(page, workflowId, {
    minExecutions: 1,
    minSuccessRate: 0.8,
    maxResponseTime: 5000
  });
  
  // 7. Test UX compliance
  await verifyPollingUXCompliance(page);
  
  // 8. Test mobile responsiveness
  await testPollingMobileResponsiveness(page);
}
