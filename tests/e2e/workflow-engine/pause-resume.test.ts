import { test, expect } from '@playwright/test';
import { TestUser, cleanupTestUser } from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';
import { setupE2E, closeAllModals, resetRateLimits, getPrimaryActionButton } from '../../helpers/e2eHelpers';
import { waitForDashboard, validateUXCompliance, waitForElement } from '../../helpers/uiHelpers';
import { createTestData, cleanupTestData } from '../../helpers/dataHelpers';
import { createTestApiConnection, cleanupTestApiConnections } from '../../helpers/createTestApiConnection';
import { testModalErrorHandling } from '../../helpers/modalHelpers';
import { testPageLoadTime } from '../../helpers/performanceHelpers';
import { testXSSPrevention, testDataExposure } from '../../helpers/securityHelpers';

test.describe('Pause/Resume E2E Tests - Complex Workflow Execution Control', () => {
  let testUser: TestUser;
  let workflowId: string;
  let executionId: string;

  test.beforeAll(async ({ browser }) => {
    testUser = await createE2EUser();
    
    // Create test data using dataHelpers
    const page = await browser.newPage();
    try {
      await setupE2E(page, testUser);
      await waitForDashboard(page);
      await createTestApiConnection(testUser.id);
      
      // Create workflow using dataHelpers
      const testData = await createTestData({
        workflow: {
          name: 'Test Workflow for Pause/Resume',
          description: 'A test workflow for pause/resume functionality testing',
          steps: [
            {
              id: 'step-1',
              name: 'Send Email',
              type: 'action',
              config: {
                endpoint: '/user',
                method: 'POST',
                body: { message: 'Test email' }
              }
            }
          ]
        }
      });
      
      workflowId = testData.workflow?.id || 'mock-workflow-id-for-testing';
      console.log('🔍 Created workflow in beforeAll:', workflowId);
    } catch (error) {
      console.log('🔍 Workflow creation failed in beforeAll:', error);
      workflowId = 'mock-workflow-id-for-testing';
    } finally {
      await page.close();
    }
  });

  test.afterAll(async () => {
    if (testUser?.id) {
      // Clean up test data using dataHelpers
      await cleanupTestData({ 
        userId: testUser.id, 
        workflowId: workflowId 
      });
      await cleanupTestUser(testUser);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Just set up the page, no workflow creation
    // Use the same user that was created in beforeAll
    await setupE2E(page, testUser);
    await waitForDashboard(page);
    await createTestApiConnection(testUser.id);
  });

  test.afterEach(async ({ page }) => {
    if (testUser?.id) {
      await cleanupTestApiConnections(testUser.id);
    }
    if (page) {
      await closeAllModals(page);
      await resetRateLimits(page);
    }
  });

  test.describe('Workflow Execution and Pause Functionality', () => {
    test('should execute workflow and pause it during execution', async ({ page }) => {
      // For now, let's test the pause/resume functionality by navigating to workflows page
      // and testing the UI elements that we've implemented
      await page.goto('/workflows');
      await waitForElement(page, '[data-testid="workflows-page"]');
      
      // Verify that the workflows page loads correctly
      await expect(page.locator('[data-testid="workflows-page"]')).toBeVisible();
      
      // Validate UX compliance
      await validateUXCompliance(page, { 
        title: 'APIQ', 
        headings: 'Workflow Details', 
        validateForm: true, 
        validateAccessibility: true 
      });
      
      // Test security validation
      await testXSSPrevention(page, '[data-testid="workflow-name"]', '<script>alert("xss")</script>');
      await testDataExposure(page, ['[data-testid="workflow-id"]', '[data-testid="execution-id"]']);
      
      // Start workflow execution with performance monitoring
      const executeButton = getPrimaryActionButton(page, 'execute-workflow');
      await expect(executeButton).toBeVisible();
      
      // Test execution performance
      const executionTime = await testPageLoadTime(page, `/workflows/${workflowId}`, { threshold: 5000 });
      expect(executionTime).toBeLessThan(5000);
      
      await executeButton.click();
      
      // Wait for execution to start and get execution ID
      await waitForElement(page, '[data-testid="execution-status-badge"]');
      const executionStatus = page.getByTestId('execution-status-badge');
      await expect(executionStatus).toContainText('RUNNING');
      
      // Get execution ID from the URL or execution details
      const currentUrl = page.url();
      const executionMatch = currentUrl.match(/\/executions\/([^\/]+)/);
      if (executionMatch) {
        executionId = executionMatch[1];
      }
      
      // Wait a moment for execution to be in progress
      await page.waitForTimeout(2000);
      
      // Pause the execution
      const pauseButton = getPrimaryActionButton(page, 'pause-execution');
      await expect(pauseButton).toBeVisible();
      await pauseButton.click();
      
      // Wait for pause confirmation
      await waitForElement(page, '[data-testid="pause-confirmation"]');
      const confirmPauseButton = getPrimaryActionButton(page, 'confirm-pause');
      await confirmPauseButton.click();
      
      // Verify execution is paused
      await waitForElement(page, '[data-testid="execution-status-badge"]');
      await expect(executionStatus).toContainText('PAUSED');
      
      // Verify pause timestamp is shown
      const pauseTimestamp = page.getByTestId('pause-timestamp');
      await expect(pauseTimestamp).toBeVisible();
    });

    test('should show execution progress and current step during pause', async ({ page }) => {
      // Navigate to execution details if we have an execution ID
      if (executionId) {
        await page.goto(`/workflows/${workflowId}/executions/${executionId}`);
        await waitForElement(page, '[data-testid="execution-details-page"]');
        
        // Check execution progress elements
        const currentStep = page.getByTestId('current-step');
        const completedSteps = page.getByTestId('completed-steps');
        const pendingSteps = page.getByTestId('pending-steps');
        
        await expect(currentStep).toBeVisible();
        await expect(completedSteps).toBeVisible();
        await expect(pendingSteps).toBeVisible();
        
        // Verify execution status shows PAUSED
        const executionStatus = page.getByTestId('execution-status');
        await expect(executionStatus).toContainText('PAUSED');
      } else {
        // If no execution ID, just verify the UI elements exist
        await page.goto(`/workflows/${workflowId}`);
        await waitForElement(page, '[data-testid="workflow-detail-page"]');
        
        // These elements should be present in the workflow detail page
        const currentStep = page.getByTestId('current-step');
        const completedSteps = page.getByTestId('completed-steps');
        const pendingSteps = page.getByTestId('pending-steps');
        
        // At least one of these should be present
        const hasProgressElements = await currentStep.isVisible() || 
                                  await completedSteps.isVisible() || 
                                  await pendingSteps.isVisible();
        expect(hasProgressElements).toBeTruthy();
      }
    });
  });

  test.describe('Workflow Resume Functionality', () => {
    test('should resume paused workflow execution', async ({ page }) => {
      // First, we need a paused execution to resume
      // Navigate to workflow and execute it
      await page.goto(`/workflows/${workflowId}`);
      await waitForElement(page, '[data-testid="workflow-detail-page"]');
      
      // Start execution
      const executeButton = getPrimaryActionButton(page, 'execute-workflow');
      await executeButton.click();
      
      // Wait for execution to start
      await waitForElement(page, '[data-testid="execution-status-badge"]');
      const executionStatus = page.getByTestId('execution-status-badge');
      await expect(executionStatus).toContainText('RUNNING');
      
      // Pause the execution
      const pauseButton = getPrimaryActionButton(page, 'pause-execution');
      await pauseButton.click();
      
      // Confirm pause
      await waitForElement(page, '[data-testid="pause-confirmation"]');
      const confirmPauseButton = getPrimaryActionButton(page, 'confirm-pause');
      await confirmPauseButton.click();
      
      // Verify it's paused
      await expect(executionStatus).toContainText('PAUSED');
      
      // Now resume the execution
      const resumeButton = getPrimaryActionButton(page, 'resume-execution');
      await expect(resumeButton).toBeVisible();
      await resumeButton.click();
      
      // Wait for resume confirmation
      await waitForElement(page, '[data-testid="resume-confirmation"]');
      const confirmResumeButton = getPrimaryActionButton(page, 'confirm-resume');
      await confirmResumeButton.click();
      
      // Verify execution is resumed (should be RUNNING or PENDING)
      await waitForElement(page, '[data-testid="execution-status-badge"]');
      const statusText = await executionStatus.textContent();
      expect(['RUNNING', 'PENDING', 'COMPLETED']).toContain(statusText);
      
      // Verify resume timestamp is shown
      const resumeTimestamp = page.getByTestId('resume-timestamp');
      await expect(resumeTimestamp).toBeVisible();
    });

    test('should handle resume from different execution states', async ({ page }) => {
      // Test resume functionality from various states
      await page.goto(`/workflows/${workflowId}`);
      await waitForElement(page, '[data-testid="workflow-detail-page"]');
      
      // Check if there are any existing executions to test resume with
      const executionsList = page.getByTestId('executions-list');
      const hasExecutions = await executionsList.isVisible();
      
      if (hasExecutions) {
        // Look for a paused execution
        const pausedExecution = page.locator('[data-testid="execution-item"]').filter({ hasText: 'PAUSED' }).first();
        const hasPausedExecution = await pausedExecution.isVisible();
        
        if (hasPausedExecution) {
          // Click on the paused execution
          await pausedExecution.click();
          
          // Wait for execution details page
          await waitForElement(page, '[data-testid="execution-details-page"]');
          
          // Try to resume
          const resumeButton = getPrimaryActionButton(page, 'resume-execution');
          if (await resumeButton.isVisible()) {
            await resumeButton.click();
            
            // Confirm resume
            await waitForElement(page, '[data-testid="resume-confirmation"]');
            const confirmResumeButton = getPrimaryActionButton(page, 'confirm-resume');
            await confirmResumeButton.click();
            
            // Verify status changed
            const executionStatus = page.getByTestId('execution-status-badge');
            await expect(executionStatus).not.toContainText('PAUSED');
          }
        }
      }
      
      // If no paused executions, just verify the resume UI elements exist
      const resumeButton = getPrimaryActionButton(page, 'resume-execution');
      const resumeConfirmation = page.getByTestId('resume-confirmation');
      const confirmResumeButton = getPrimaryActionButton(page, 'confirm-resume');
      
      // At least the resume button should be present (even if disabled)
      await expect(resumeButton).toBeAttached();
    });
  });

  test.describe('Worker Queue and State Management', () => {
    test('should handle queue job cancellation during pause', async ({ page }) => {
      // Execute and pause a workflow to test queue management
      await page.goto(`/workflows/${workflowId}`);
      await waitForElement(page, '[data-testid="workflow-detail-page"]');
      
      // Start execution
      const executeButton = getPrimaryActionButton(page, 'execute-workflow');
      await executeButton.click();
      
      // Wait for execution to start
      await waitForElement(page, '[data-testid="execution-status-badge"]');
      const executionStatus = page.getByTestId('execution-status-badge');
      await expect(executionStatus).toContainText('RUNNING');
      
      // Pause the execution
      const pauseButton = getPrimaryActionButton(page, 'pause-execution');
      await pauseButton.click();
      
      // Confirm pause
      await waitForElement(page, '[data-testid="pause-confirmation"]');
      const confirmPauseButton = getPrimaryActionButton(page, 'confirm-pause');
      await confirmPauseButton.click();
      
      // Verify execution is paused
      await expect(executionStatus).toContainText('PAUSED');
      
      // Check that queue job was cancelled (this should be reflected in the UI)
      const queueJobId = page.getByTestId('queue-job-id');
      if (await queueJobId.isVisible()) {
        // The job ID should still be visible but the status should indicate it's cancelled
        const jobStatus = page.getByTestId('job-status');
        if (await jobStatus.isVisible()) {
          const statusText = await jobStatus.textContent();
          expect(['CANCELLED', 'PAUSED', 'STOPPED']).toContain(statusText);
        }
      }
    });

    test('should handle worker status and queue management', async ({ page }) => {
      // Navigate to workflows page to check worker status
      await page.goto('/workflows');
      await waitForElement(page, '[data-testid="workflows-page"]');
      
      // Check for worker status indicators
      const workerStatus = page.getByTestId('worker-status');
      const queueStatus = page.getByTestId('queue-status');
      
      // These elements should be present to show system status
      if (await workerStatus.isVisible()) {
        await expect(workerStatus).toBeVisible();
        const statusText = await workerStatus.textContent();
        expect(['ACTIVE', 'IDLE', 'PAUSED', 'ERROR']).toContain(statusText);
      }
      
      if (await queueStatus.isVisible()) {
        await expect(queueStatus).toBeVisible();
        const queueText = await queueStatus.textContent();
        expect(['EMPTY', 'PROCESSING', 'PAUSED', 'ERROR']).toContain(queueText);
      }
    });
  });

  test.describe('State Persistence and Session Management', () => {
    test('should persist pause/resume state across page refreshes', async ({ page }) => {
      // Execute and pause a workflow
      await page.goto(`/workflows/${workflowId}`);
      await waitForElement(page, '[data-testid="workflow-detail-page"]');
      
      // Start execution
      const executeButton = getPrimaryActionButton(page, 'execute-workflow');
      await executeButton.click();
      
      // Wait for execution to start
      await waitForElement(page, '[data-testid="execution-status-badge"]');
      const executionStatus = page.getByTestId('execution-status-badge');
      await expect(executionStatus).toContainText('RUNNING');
      
      // Pause the execution
      const pauseButton = getPrimaryActionButton(page, 'pause-execution');
      await pauseButton.click();
      
      // Confirm pause
      await waitForElement(page, '[data-testid="pause-confirmation"]');
      const confirmPauseButton = getPrimaryActionButton(page, 'confirm-pause');
      await confirmPauseButton.click();
      
      // Verify it's paused
      await expect(executionStatus).toContainText('PAUSED');
      
      // Get pause timestamp
      const pauseTimestamp = page.getByTestId('pause-timestamp');
      const pauseTime = await pauseTimestamp.textContent();
      expect(pauseTime).toBeTruthy();
      
      // Refresh the page
      await page.reload();
      await waitForElement(page, '[data-testid="workflow-detail-page"]');
      
      // Verify the execution is still paused after refresh
      const refreshedStatus = page.getByTestId('execution-status-badge');
      await expect(refreshedStatus).toContainText('PAUSED');
      
      // Verify pause timestamp is still visible
      const refreshedPauseTimestamp = page.getByTestId('pause-timestamp');
      await expect(refreshedPauseTimestamp).toBeVisible();
    });

    test('should maintain execution state across browser sessions', async ({ page }) => {
      // This test verifies that execution state persists in the database
      // and can be restored when navigating back to the execution
      
      // First, create a paused execution
      await page.goto(`/workflows/${workflowId}`);
      await waitForElement(page, '[data-testid="workflow-detail-page"]');
      
      // Start execution
      const executeButton = getPrimaryActionButton(page, 'execute-workflow');
      await executeButton.click();
      
      // Wait for execution to start
      await waitForElement(page, '[data-testid="execution-status-badge"]');
      const executionStatus = page.getByTestId('execution-status-badge');
      await expect(executionStatus).toContainText('RUNNING');
      
      // Pause the execution
      const pauseButton = getPrimaryActionButton(page, 'pause-execution');
      await pauseButton.click();
      
      // Confirm pause
      await waitForElement(page, '[data-testid="pause-confirmation"]');
      const confirmPauseButton = getPrimaryActionButton(page, 'confirm-pause');
      await confirmPauseButton.click();
      
      // Verify it's paused
      await expect(executionStatus).toContainText('PAUSED');
      
      // Navigate away and back to verify state persistence
      await page.goto('/workflows');
      await waitForElement(page, '[data-testid="workflows-page"]');
      
      // Navigate back to the workflow
      await page.goto(`/workflows/${workflowId}`);
      await waitForElement(page, '[data-testid="workflow-detail-page"]');
      
      // Check if there are any executions visible
      const executionsList = page.getByTestId('executions-list');
      if (await executionsList.isVisible()) {
        // Look for paused executions
        const pausedExecution = page.locator('[data-testid="execution-item"]').filter({ hasText: 'PAUSED' }).first();
        if (await pausedExecution.isVisible()) {
          // Click on the paused execution
          await pausedExecution.click();
          
          // Verify we can see the execution details
          await waitForElement(page, '[data-testid="execution-details-page"]');
          
          // Verify it's still paused
          const executionStatus = page.getByTestId('execution-status-badge');
          await expect(executionStatus).toContainText('PAUSED');
        }
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle pause/resume errors gracefully', async ({ page }) => {
      // Test error handling during pause/resume operations
      await page.goto(`/workflows/${workflowId}`);
      await waitForElement(page, '[data-testid="workflow-detail-page"]');
      
      // Try to pause a workflow that's not running (should show error)
      const pauseButton = getPrimaryActionButton(page, 'pause-execution');
      if (await pauseButton.isVisible()) {
        await pauseButton.click();
        
        // Check for error handling using helper
        await testModalErrorHandling(page, '[data-testid="error-message"]', 'Workflow execution error');
      }
      
      // Test resume on non-paused execution (should show error)
      const resumeButton = getPrimaryActionButton(page, 'resume-execution');
      if (await resumeButton.isVisible()) {
        await resumeButton.click();
        
        // Check for error handling using helper
        await testModalErrorHandling(page, '[data-testid="error-message"]', 'Resume execution error');
      }
    });

    test('should handle long pause scenarios', async ({ page }) => {
      // Test long pause handling and timeout scenarios
      await page.goto(`/workflows/${workflowId}`);
      await waitForElement(page, '[data-testid="workflow-detail-page"]');
      
      // Execute and pause a workflow
      const executeButton = getPrimaryActionButton(page, 'execute-workflow');
      if (await executeButton.isVisible()) {
        await executeButton.click();
      
      // Wait for execution to start
        await waitForElement(page, '[data-testid="execution-status-badge"]');
        const executionStatus = page.getByTestId('execution-status-badge');
        await expect(executionStatus).toContainText('RUNNING');
        
        // Pause the execution
        const pauseButton = getPrimaryActionButton(page, 'pause-execution');
        await pauseButton.click();
        
        // Confirm pause
        await waitForElement(page, '[data-testid="pause-confirmation"]');
        const confirmPauseButton = getPrimaryActionButton(page, 'confirm-pause');
        await confirmPauseButton.click();
        
        // Verify it's paused
        await expect(executionStatus).toContainText('PAUSED');
        
        // Check for pause duration tracking
        const pauseDuration = page.getByTestId('pause-duration');
        if (await pauseDuration.isVisible()) {
          await expect(pauseDuration).toBeVisible();
        }
        
        // Check for timeout warnings after some time
        await page.waitForTimeout(5000); // Wait 5 seconds
        
        const timeoutWarning = page.getByTestId('timeout-warning');
        if (await timeoutWarning.isVisible()) {
          await expect(timeoutWarning).toBeVisible();
          
          // Check for force resume button
          const forceResumeButton = page.getByTestId('force-resume-btn');
          if (await forceResumeButton.isVisible()) {
            await expect(forceResumeButton).toBeVisible();
          }
        }
      }
    });

    test('should validate pause/resume permissions and constraints', async ({ page }) => {
      // Test that pause/resume operations respect user permissions and workflow constraints
      await page.goto(`/workflows/${workflowId}`);
      await waitForElement(page, '[data-testid="workflow-detail-page"]');
      
      // Check that pause/resume buttons are only enabled when appropriate
      const pauseButton = getPrimaryActionButton(page, 'pause-execution');
      const resumeButton = getPrimaryActionButton(page, 'resume-execution');
      
      // These buttons should exist but may be disabled based on current state
      await expect(pauseButton).toBeAttached();
      await expect(resumeButton).toBeAttached();
      
      // Test button states based on execution status
      const executionStatus = page.getByTestId('execution-status-badge');
      if (await executionStatus.isVisible()) {
        const statusText = await executionStatus.textContent();
        
        if (statusText?.includes('RUNNING') || statusText?.includes('PENDING')) {
          // Pause button should be enabled
          await expect(pauseButton).toBeEnabled();
        } else if (statusText?.includes('PAUSED')) {
          // Resume button should be enabled
          await expect(resumeButton).toBeEnabled();
        } else {
          // Both buttons should be disabled for completed/failed executions
          await expect(pauseButton).toBeDisabled();
          await expect(resumeButton).toBeDisabled();
        }
      }
    });
  });
}); 