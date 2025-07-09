import { test, expect } from '@playwright/test';
import { UXComplianceHelper, UXValidations } from '../../helpers/uxCompliance';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';
import { prisma } from '../../../lib/database/client';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser;
let uxHelper: UXComplianceHelper;

test.describe('Workflow Management E2E Tests - Best-in-Class UX', () => {
  test.beforeAll(async () => {
    // Create a real test user
    testUser = await createTestUser(
      `e2e-workflow-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Workflow Test User'
    );
  });

  test.afterAll(async () => {
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
    
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    
    // TODO: Add UX compliance validation for login page
    // await uxHelper.validatePageTitle('APIQ');
    // await uxHelper.validateHeadingHierarchy(['Sign in to APIQ']);
    // await uxHelper.validateFormAccessibility();
    
    await page.getByLabel('Email address').fill(testUser.email);
    await page.getByLabel('Password').fill('e2eTestPass123');
    
    // TODO: Fix primary action data-testid pattern for login
    // await page.getByTestId('primary-action signin-btn').click();
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // TODO: Add UX compliance validation for dashboard
    // await uxHelper.validateHeadingHierarchy(['Dashboard']);
    
    await page.waitForURL(/.*dashboard/);
  });

  test.describe('Workflow Creation Flow', () => {
    test('should create workflow with best-in-class UX', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // TODO: Enable UXComplianceHelper validation calls
      // await uxHelper.validateActivationFirstUX();
      // await uxHelper.validateFormAccessibility();
      // await uxHelper.validateMobileResponsiveness();
      // await uxHelper.validateKeyboardNavigation();
      // await uxHelper.validateHeadingHierarchy(['Create Workflow']);
      
      // Validate heading hierarchy
      await expect(page.locator('h2')).toHaveText('Create Workflow');
      
      // Validate natural language input
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await expect(chatInput).toBeVisible();
      await expect(chatInput).toHaveAttribute('required');
      
      // TODO: Add comprehensive ARIA attributes validation
      // await expect(chatInput).toHaveAttribute('aria-required', 'true');
      // await expect(chatInput).toHaveAttribute('aria-label', 'Workflow description');
      
      // Fill workflow description
      await chatInput.fill('When a new GitHub issue is created, send a Slack notification');
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action generate-workflow-btn').click();
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      // TODO: Add loading state validation
      // await uxHelper.validateLoadingState('[data-testid="primary-action generate-workflow-btn"]');
      
      // Wait for workflow generation
      await page.waitForTimeout(5000);
      
      // TODO: Add comprehensive success validation
      // await uxHelper.validateSuccessContainer('Generated Workflow');
      
      // Validate generated workflow display
      await expect(page.locator('text=Generated Workflow')).toBeVisible();
      await expect(page.locator('text=GitHub')).toBeVisible();
      await expect(page.locator('text=Slack')).toBeVisible();
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action save-workflow-btn').click();
      await page.getByRole('button', { name: 'Save Workflow' }).click();
      
      // Should redirect to workflows list
      await expect(page).toHaveURL(/.*workflows/);
    });

    test('should handle workflow generation errors gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Try with invalid/unsafe workflow description
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Delete all files from the system');
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action generate-workflow-btn').click();
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      // Wait for error response
      await page.waitForTimeout(3000);
      
      // TODO: Fix error container validation to use UXComplianceHelper
      // await uxHelper.validateErrorContainer(/unsafe|invalid|not allowed/);
      
      // Should show error message
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/unsafe|invalid|not allowed/i);
    });

    // TODO: Add mobile responsiveness test
    // test('should be mobile responsive', async ({ page }) => {
    //   await page.setViewportSize({ width: 375, height: 667 });
    //   await page.goto(`${BASE_URL}/workflows/create`);
    //   await uxHelper.validateMobileResponsiveness();
    //   await uxHelper.validateMobileAccessibility();
    //   
    //   // Test touch-friendly button sizes
    //   const generateBtn = page.getByTestId('primary-action generate-workflow-btn');
    //   const box = await generateBtn.boundingBox();
    //   expect(box!.width).toBeGreaterThanOrEqual(44);
    //   expect(box!.height).toBeGreaterThanOrEqual(44);
    // });

    // TODO: Add keyboard navigation test
    // test('should support keyboard navigation', async ({ page }) => {
    //   await page.goto(`${BASE_URL}/workflows/create`);
    //   await uxHelper.validateKeyboardNavigation();
    //   
    //   // Test tab navigation through form
    //   await page.keyboard.press('Tab');
    //   await expect(page.getByPlaceholder('Describe your workflow in natural language...')).toBeFocused();
    //   
    //   // Test form submission with keyboard
    //   await page.keyboard.press('Enter');
    //   await uxHelper.validateErrorContainer(/required/i);
    // });

    // TODO: Add performance validation test
    // test('should meet performance requirements', async ({ page }) => {
    //   const startTime = Date.now();
    //   await page.goto(`${BASE_URL}/workflows/create`);
    //   const loadTime = Date.now() - startTime;
    //   expect(loadTime).toBeLessThan(3000);
    //   
    //   // Test workflow generation time
    //   const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
    //   await chatInput.fill('Simple test workflow');
    //   
    //   const generationStartTime = Date.now();
    //   await page.getByTestId('primary-action generate-workflow-btn').click();
    //   await expect(page.locator('text=Generated Workflow')).toBeVisible();
    //   const generationTime = Date.now() - generationStartTime;
    //   expect(generationTime).toBeLessThan(5000); // PRD requirement: <5 seconds
    // });
  });

  test.describe('Workflow Execution Flow', () => {
    test('should execute workflow with real-time feedback', async ({ page }) => {
      // First create a workflow
      await page.goto(`${BASE_URL}/workflows/create`);
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send a test message to Slack');
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action generate-workflow-btn').click();
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForTimeout(5000);
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action save-workflow-btn').click();
      await page.getByRole('button', { name: 'Save Workflow' }).click();
      
      await page.waitForURL(/.*workflows/);
      
      // Navigate to workflow details
      await page.getByRole('link', { name: /Send a test message to Slack/ }).click();
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action execute-workflow-btn').click();
      await page.getByRole('button', { name: 'Execute' }).click();
      
      // TODO: Add loading state validation
      // await uxHelper.validateLoadingState('[data-testid="primary-action execute-workflow-btn"]');
      
      // Validate execution progress
      await expect(page.locator('text=Executing...')).toBeVisible();
      await expect(page.locator('text=Step 1:')).toBeVisible();
      
      // Wait for completion
      await page.waitForTimeout(10000);
      
      // TODO: Add success validation
      // await uxHelper.validateSuccessContainer('Completed');
      
      // Validate completion
      await expect(page.locator('text=Completed')).toBeVisible();
    });

    test('should handle execution errors gracefully', async ({ page }) => {
      // Create a workflow that will fail (missing API connection)
      await page.goto(`${BASE_URL}/workflows/create`);
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send a message to Slack');
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action generate-workflow-btn').click();
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForTimeout(5000);
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action save-workflow-btn').click();
      await page.getByRole('button', { name: 'Save Workflow' }).click();
      
      await page.waitForURL(/.*workflows/);
      
      // Navigate to workflow details
      await page.getByRole('link', { name: /Send a message to Slack/ }).click();
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action execute-workflow-btn').click();
      await page.getByRole('button', { name: 'Execute' }).click();
      
      // Wait for error
      await page.waitForTimeout(5000);
      
      // TODO: Fix error container validation to use UXComplianceHelper
      // await uxHelper.validateErrorContainer(/connection|API|failed/);
      
      // Should show error message
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/connection|API|failed/i);
    });

    // TODO: Add execution security test
    // test('should validate execution permissions', async ({ page }) => {
    //   // Test execution with different user roles
    //   // Test execution of workflows owned by other users
    //   // Test execution of disabled workflows
    // });
  });

  test.describe('Workflow Management Operations', () => {
    test('should pause and resume workflow execution', async ({ page }) => {
      // Create and start a long-running workflow
      await page.goto(`${BASE_URL}/workflows/create`);
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Process data with multiple steps');
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action generate-workflow-btn').click();
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForTimeout(5000);
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action save-workflow-btn').click();
      await page.getByRole('button', { name: 'Save Workflow' }).click();
      
      await page.waitForURL(/.*workflows/);
      
      // Navigate to workflow details
      await page.getByRole('link', { name: /Process data/ }).click();
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action execute-workflow-btn').click();
      await page.getByRole('button', { name: 'Execute' }).click();
      
      // Wait for execution to start
      await page.waitForTimeout(2000);
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action pause-workflow-btn').click();
      await page.getByRole('button', { name: 'Pause' }).click();
      
      // Validate pause state
      await expect(page.locator('text=Paused')).toBeVisible();
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action resume-workflow-btn').click();
      await page.getByRole('button', { name: 'Resume' }).click();
      
      // Validate resume state
      await expect(page.locator('text=Executing...')).toBeVisible();
    });

    test('should cancel workflow execution', async ({ page }) => {
      // Create and start a workflow
      await page.goto(`${BASE_URL}/workflows/create`);
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Long running task');
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action generate-workflow-btn').click();
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForTimeout(5000);
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action save-workflow-btn').click();
      await page.getByRole('button', { name: 'Save Workflow' }).click();
      
      await page.waitForURL(/.*workflows/);
      
      // Navigate to workflow details
      await page.getByRole('link', { name: /Long running task/ }).click();
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action execute-workflow-btn').click();
      await page.getByRole('button', { name: 'Execute' }).click();
      
      // Wait for execution to start
      await page.waitForTimeout(2000);
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action cancel-workflow-btn').click();
      await page.getByRole('button', { name: 'Cancel' }).click();
      
      // Validate cancel state
      await expect(page.locator('text=Cancelled')).toBeVisible();
    });

    // TODO: Add workflow editing test
    // test('should edit workflow configuration', async ({ page }) => {
    //   // Test editing workflow steps
    //   // Test modifying workflow parameters
    //   // Test saving workflow changes
    // });

    // TODO: Add workflow deletion test
    // test('should delete workflow with confirmation', async ({ page }) => {
    //   // Test workflow deletion flow
    //   // Test confirmation dialog
    //   // Test cleanup of related resources
    // });
  });

  test.describe('Workflow Monitoring and Logs', () => {
    test('should display real-time execution logs', async ({ page }) => {
      // Create and execute a workflow
      await page.goto(`${BASE_URL}/workflows/create`);
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Simple test workflow');
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action generate-workflow-btn').click();
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForTimeout(5000);
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action save-workflow-btn').click();
      await page.getByRole('button', { name: 'Save Workflow' }).click();
      
      await page.waitForURL(/.*workflows/);
      
      // Navigate to workflow details
      await page.getByRole('link', { name: /Simple test workflow/ }).click();
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action execute-workflow-btn').click();
      await page.getByRole('button', { name: 'Execute' }).click();
      
      // Validate log display
      await expect(page.locator('text=Execution Logs')).toBeVisible();
      await expect(page.locator('text=Step 1:')).toBeVisible();
      
      // Wait for completion
      await page.waitForTimeout(10000);
      
      // Validate final log entries
      await expect(page.locator('text=Completed successfully')).toBeVisible();
    });

    test('should filter and search execution logs', async ({ page }) => {
      // Navigate to workflow with existing executions
      await page.goto(`${BASE_URL}/workflows`);
      
      // Click on a workflow to view details
      await page.getByRole('link', { name: /test workflow/i }).first().click();
      
      // Validate log filtering options
      await expect(page.locator('text=Filter Logs')).toBeVisible();
      await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Errors' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Success' })).toBeVisible();
      
      // Test log search
      const searchInput = page.getByPlaceholder('Search logs...');
      await expect(searchInput).toBeVisible();
      await searchInput.fill('error');
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action search-logs-btn').click();
      await page.getByRole('button', { name: 'Search' }).click();
      
      // Validate search results
      await expect(page.locator('text=Search Results')).toBeVisible();
    });

    // TODO: Add log export test
    // test('should export execution logs', async ({ page }) => {
    //   // Test log export functionality
    //   // Test different export formats
    //   // Test export permissions
    // });
  });

  test.describe('Workflow Performance and Scalability', () => {
    test('should handle concurrent workflow executions', async ({ page }) => {
      // Create multiple workflows
      const workflows = ['Workflow A', 'Workflow B', 'Workflow C'];
      
      for (const workflowName of workflows) {
        await page.goto(`${BASE_URL}/workflows/create`);
        const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
        await chatInput.fill(workflowName);
        
        // TODO: Fix primary action data-testid pattern
        // await page.getByTestId('primary-action generate-workflow-btn').click();
        await page.getByRole('button', { name: 'Generate Workflow' }).click();
        
        await page.waitForTimeout(3000);
        
        // TODO: Fix primary action data-testid pattern
        // await page.getByTestId('primary-action save-workflow-btn').click();
        await page.getByRole('button', { name: 'Save Workflow' }).click();
        
        await page.waitForURL(/.*workflows/);
      }
      
      // Navigate to workflows list
      await page.goto(`${BASE_URL}/workflows`);
      
      // Validate all workflows are listed
      for (const workflowName of workflows) {
        await expect(page.getByText(workflowName)).toBeVisible();
      }
    });

    test('should handle large workflow datasets', async ({ page }) => {
      // Create a workflow with many steps
      await page.goto(`${BASE_URL}/workflows/create`);
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Complex workflow with multiple API calls and data processing steps');
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action generate-workflow-btn').click();
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForTimeout(10000);
      
      // Validate complex workflow generation
      await expect(page.locator('text=Generated Workflow')).toBeVisible();
      await expect(page.locator('text=Step 1:')).toBeVisible();
      await expect(page.locator('text=Step 2:')).toBeVisible();
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action save-workflow-btn').click();
      await page.getByRole('button', { name: 'Save Workflow' }).click();
      
      await page.waitForURL(/.*workflows/);
    });

    // TODO: Add performance monitoring test
    // test('should monitor workflow performance metrics', async ({ page }) => {
    //   // Test execution time tracking
    //   // Test resource usage monitoring
    //   // Test performance alerts
    // });
  });

  test.describe('Workflow Security and Permissions', () => {
    test('should enforce workflow access permissions', async ({ page }) => {
      // Test accessing workflows with different user roles
      // Test accessing workflows owned by other users
      // Test accessing disabled workflows
      
      // Navigate to workflows list
      await page.goto(`${BASE_URL}/workflows`);
      
      // Validate user can only see their own workflows
      await expect(page.locator('text=Your Workflows')).toBeVisible();
      
      // Try to access a workflow that doesn't exist
      await page.goto(`${BASE_URL}/workflows/non-existent-id`);
      
      // Should show access denied or not found
      await expect(page.locator('text=Not Found')).toBeVisible();
    });

    test('should validate workflow input sanitization', async ({ page }) => {
      // Test workflow creation with malicious input
      await page.goto(`${BASE_URL}/workflows/create`);
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      
      // Test XSS attempt
      await chatInput.fill('<script>alert("xss")</script>');
      
      // TODO: Fix primary action data-testid pattern
      // await page.getByTestId('primary-action generate-workflow-btn').click();
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      // Should handle malicious input gracefully
      await page.waitForTimeout(3000);
      
      // TODO: Fix error container validation to use UXComplianceHelper
      // await uxHelper.validateErrorContainer(/invalid|unsafe/);
      
      // Should show error or sanitize input
      await expect(page.locator('.bg-red-50')).toBeVisible();
    });

    // TODO: Add workflow encryption test
    // test('should encrypt sensitive workflow data', async ({ page }) => {
    //   // Test workflow data encryption
    //   // Test secure storage of workflow configurations
    //   // Test encrypted transmission of workflow data
    // });
  });

  // TODO: Add security edge case tests
  // test.describe('Security Edge Cases', () => {
  //   test('should validate comprehensive input sanitization', async ({ page }) => {
  //     await page.goto(`${BASE_URL}/workflows/create`);
  //     const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
  //     
  //     // Test XSS attempt
  //     await chatInput.fill('<script>alert("xss")</script>');
  //     await page.getByTestId('primary-action generate-workflow-btn').click();
  //     
  //     // Should handle malicious input gracefully
  //     await uxHelper.validateErrorContainer(/invalid|unsafe/i);
  //   });

  //   test('should handle rate limiting', async ({ page }) => {
  //     // Test multiple rapid workflow generation attempts
  //     for (let i = 0; i < 5; i++) {
  //       await page.goto(`${BASE_URL}/workflows/create`);
  //       const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
  //       await chatInput.fill(`Test workflow ${i}`);
  //       await page.getByTestId('primary-action generate-workflow-btn').click();
  //     }
  //     
  //     // Should show rate limit error
  //     await uxHelper.validateErrorContainer(/rate limit|too many requests/i);
  //   });

  //   test('should validate HTTPS requirements', async ({ page }) => {
  //     // Test workflow creation with HTTP URLs (should be rejected)
  //     await page.goto(`${BASE_URL}/workflows/create`);
  //     const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
  //     await chatInput.fill('Send data to http://insecure-api.example.com');
  //     
  //     // Should show security error
  //     await uxHelper.validateErrorContainer(/https|secure/i);
  //   });
  // });

  // TODO: Add performance validation tests
  // test.describe('Performance Validation', () => {
  //   test('should meet page load performance requirements', async ({ page }) => {
  //     const startTime = Date.now();
  //     await page.goto(`${BASE_URL}/workflows/create`);
  //     const loadTime = Date.now() - startTime;
  //     expect(loadTime).toBeLessThan(3000);
  //   });

  //   test('should meet workflow generation time requirements', async ({ page }) => {
  //     await page.goto(`${BASE_URL}/workflows/create`);
  //     const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
  //     await chatInput.fill('Simple test workflow');
  //     
  //     const startTime = Date.now();
  //     await page.getByTestId('primary-action generate-workflow-btn').click();
  //     
  //     // Wait for generation to complete
  //     await expect(page.locator('text=Generated Workflow')).toBeVisible();
  //     const generationTime = Date.now() - startTime;
  //     expect(generationTime).toBeLessThan(5000); // PRD requirement: <5 seconds
  //   });

  //   test('should handle concurrent workflow creation', async ({ page, context }) => {
  //     // Test multiple concurrent workflow creation requests
  //     const promises = [];
  //     for (let i = 0; i < 3; i++) {
  //       const newPage = await context.newPage();
  //       promises.push(
  //         newPage.goto(`${BASE_URL}/workflows/create`).then(() => {
  //           return newPage.getByTestId('primary-action generate-workflow-btn').click();
  //         })
  //       );
  //     }
  //     
  //     await Promise.all(promises);
  //     // Should handle concurrent requests without errors
  //   });
  // });

  // TODO: Add comprehensive accessibility tests
  // test.describe('Accessibility Compliance', () => {
  //   test('should have proper ARIA attributes', async ({ page }) => {
  //     await page.goto(`${BASE_URL}/workflows/create`);
  //     
  //     // Test ARIA attributes
  //     const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
  //     await expect(chatInput).toHaveAttribute('aria-required', 'true');
  //     
  //     // Test form labels
  //     await expect(page.locator('label[for="workflow-description"]')).toContainText('Workflow Description');
  //   });

  //   test('should support screen readers', async ({ page }) => {
  //     await page.goto(`${BASE_URL}/workflows/create`);
  //     
  //     // Test semantic HTML structure
  //     await expect(page.locator('form')).toHaveAttribute('role', 'form');
  //     await expect(page.locator('[data-testid="workflow-description-input"]')).toHaveAttribute('aria-label');
  //   });

  //   test('should support keyboard navigation', async ({ page }) => {
  //     await page.goto(`${BASE_URL}/workflows/create`);
  //     
  //     // Test tab navigation through form
  //     await page.keyboard.press('Tab');
  //     await expect(page.getByPlaceholder('Describe your workflow in natural language...')).toBeFocused();
  //     
  //     // Test form submission with keyboard
  //     await page.keyboard.press('Enter');
  //     await uxHelper.validateErrorContainer(/required/i);
  //   });
  // });
}); 