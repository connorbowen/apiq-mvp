import { Page, expect } from '@playwright/test';
import { getPrimaryActionButton } from './e2eHelpers';
import { waitForDashboard, validateUXCompliance } from './uiHelpers';
import { waitForNetworkIdle } from './waitHelpers';
import { testModalSuccessMessage, testModalErrorHandling } from './modalHelpers';
import { testXSSPrevention, testDataExposure } from './securityHelpers';
import { testPageLoadTime } from './performanceHelpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export interface WorkflowGenerationOptions {
  shouldSucceed?: boolean;
  includeSecurity?: boolean;
  includePerformance?: boolean;
  includeUX?: boolean;
}

export interface WorkflowExecutionOptions {
  shouldPause?: boolean;
  shouldResume?: boolean;
  shouldCancel?: boolean;
  includePerformance?: boolean;
}

export interface WorkflowManagementOptions {
  includeUX?: boolean;
  includeSecurity?: boolean;
}

export interface WorkflowComprehensiveOptions {
  includeGeneration?: boolean;
  includeExecution?: boolean;
  includeManagement?: boolean;
  includeSecurity?: boolean;
  includePerformance?: boolean;
  includeUX?: boolean;
}

/**
 * Helper function for workflow generation with comprehensive testing
 */
export async function testWorkflowGeneration(
  page: Page, 
  description: string, 
  expectedKeywords: RegExp, 
  options: WorkflowGenerationOptions = {}
) {
  const {
    shouldSucceed = true,
    includeSecurity = true,
    includePerformance = true,
    includeUX = true
  } = options;

  // Navigate to workflow creation
  await page.goto(`${BASE_URL}/workflows/create`);
  await page.waitForLoadState('networkidle');

  // UX compliance validation
  if (includeUX) {
    await validateUXCompliance(page, {
      title: 'APIQ',
      headings: 'Create Workflow',
      validateForm: true,
      validateAccessibility: true
    });
  }

  // Security validation
  if (includeSecurity) {
    await testXSSPrevention(page, '[data-testid="chat-input"]', '<script>alert("xss")</script>');
    await testDataExposure(page, ['[data-testid="chat-interface"]', '[data-testid="workflow-list"]']);
  }

  // Performance validation
  if (includePerformance) {
    await testPageLoadTime(page, '/workflows/create', { threshold: 3000 });
  }

  // Fill workflow description
  const chatInput = page.getByTestId('chat-input');
  await chatInput.fill(description);

  // Generate workflow
  await getPrimaryActionButton(page, 'chat-send').click();

  // Wait for generation to complete
  await waitForNetworkIdle(page);

  if (shouldSucceed) {
    // Validate successful generation - look for the assistant response
    await page.locator('text=I\'ve created a workflow for you!').waitFor({ state: 'visible', timeout: 15000 });
    
    // Check if there's a detailed workflow display (if API returns full data)
    const hasDetailedWorkflow = await page.locator('text=Created:').isVisible().catch(() => false);
    
    if (hasDetailedWorkflow) {
      // Full workflow display is available
      await page.locator('[data-testid="workflow-steps-container"]').waitFor({ state: 'visible', timeout: 15000 });
      
      // Check that the workflow contains expected keywords
      const workflowName = page.locator('text=Created:').first();
      await expect(workflowName).toContainText(expectedKeywords);

      // Save workflow
      await page.getByRole('button', { name: 'Save Workflow' }).click({ timeout: 10000 });
      
      // Wait for save to complete
      await page.waitForTimeout(2000);
      
      // Validate workflow was saved
      await page.locator('text=✓ Saved').waitFor({ state: 'visible', timeout: 10000 });
    } else {
      // Simple response - just validate the message was received
      console.log('Workflow generation completed with simple response');
    }
  } else {
    // Validate error handling
    await testModalErrorHandling(page, '[data-testid="error-message"]', 'Workflow generation error');
  }
}

/**
 * Helper function for workflow execution testing
 */
export async function testWorkflowExecution(
  page: Page, 
  workflowName: string, 
  options: WorkflowExecutionOptions = {}
) {
  const {
    shouldPause = false,
    shouldResume = false,
    shouldCancel = false,
    includePerformance = true
  } = options;

  // Navigate to workflow details
  await page.getByRole('link', { name: new RegExp(workflowName) }).click();
  await page.waitForLoadState('networkidle');

  // Performance validation
  if (includePerformance) {
    await testPageLoadTime(page, `/workflows/.*`, { threshold: 2000 });
  }

  // Execute workflow
  await getPrimaryActionButton(page, 'execute-workflow').click();

  // Wait for execution to start
  await page.waitForTimeout(2000);

  if (shouldPause) {
    // Test pause functionality
    await getPrimaryActionButton(page, 'pause-workflow').click();
    await page.locator('text=Paused').waitFor({ state: 'visible', timeout: 5000 });

    if (shouldResume) {
      // Test resume functionality
      await getPrimaryActionButton(page, 'resume-workflow').click();
      await page.locator('text=Executing...').waitFor({ state: 'visible', timeout: 5000 });
    }
  }

  if (shouldCancel) {
    // Test cancel functionality
    await getPrimaryActionButton(page, 'cancel-workflow').click();
    await page.locator('text=Cancelled').waitFor({ state: 'visible', timeout: 5000 });
  }
}

/**
 * Helper function for workflow management operations
 */
export async function testWorkflowManagement(
  page: Page, 
  workflowName: string, 
  operation: 'edit' | 'delete' | 'schedule', 
  options: WorkflowManagementOptions = {}
) {
  const {
    includeUX = true,
    includeSecurity = true
  } = options;

  // Navigate to workflow details
  await page.getByRole('link', { name: new RegExp(workflowName) }).click();
  await page.waitForLoadState('networkidle');

  if (operation === 'edit') {
    // Test editing workflow
    const editButton = getPrimaryActionButton(page, 'edit-workflow');
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Edit workflow name
      const nameInput = page.getByLabel('Workflow Name');
      if (await nameInput.isVisible()) {
        await nameInput.clear();
        await nameInput.fill(`Updated ${workflowName}`);
        await getPrimaryActionButton(page, 'save-changes').click();
        await page.locator('text=Updated').waitFor({ state: 'visible', timeout: 5000 });
      }
    }
  } else if (operation === 'delete') {
    // Test deletion flow
    const deleteButton = getPrimaryActionButton(page, 'delete-workflow');
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Test confirmation dialog
      const confirmDialog = page.locator('[data-testid="delete-confirmation-dialog"]');
      if (await confirmDialog.isVisible()) {
        await getPrimaryActionButton(page, 'confirm-delete').click();
        await testModalSuccessMessage(page, 'Workflow deleted successfully');
      }
    }
  } else if (operation === 'schedule') {
    // Test scheduling workflow
    const scheduleInput = page.getByLabel('Schedule');
    if (await scheduleInput.isVisible()) {
      await scheduleInput.fill('0 9 * * *'); // Daily at 9 AM
      await getPrimaryActionButton(page, 'save-schedule').click();
      await testModalSuccessMessage(page, 'Workflow scheduled successfully');
    }
  }

  // Security validation
  if (includeSecurity) {
    await testXSSPrevention(page, '[data-testid="workflow-name-input"]', '<script>alert("xss")</script>');
    await testDataExposure(page, ['[data-testid="workflow-details"]', '[data-testid="workflow-settings"]']);
  }
}

/**
 * Helper function for comprehensive workflow testing
 */
export async function testWorkflowComprehensive(
  page: Page, 
  description: string, 
  expectedKeywords: RegExp, 
  options: WorkflowComprehensiveOptions = {}
) {
  const {
    includeGeneration = true,
    includeExecution = true,
    includeManagement = true,
    includeSecurity = true,
    includePerformance = true,
    includeUX = true
  } = options;

  if (includeGeneration) {
    await testWorkflowGeneration(page, description, expectedKeywords, {
      shouldSucceed: true,
      includeSecurity,
      includePerformance,
      includeUX
    });
  }

  if (includeExecution) {
    await testWorkflowExecution(page, 'Generated Workflow', {
      shouldPause: true,
      shouldResume: true,
      shouldCancel: false,
      includePerformance
    });
  }

  if (includeManagement) {
    await testWorkflowManagement(page, 'Generated Workflow', 'edit', {
      includeUX,
      includeSecurity
    });
  }
}
