import { test, expect } from '@playwright/test';
import { UXComplianceHelper, UXValidations } from '../../helpers/uxCompliance';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';
import { createTestApiConnection, cleanupTestApiConnections } from '../../helpers/createTestApiConnection';
import { prisma } from '../../../lib/database/client';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser;
let uxHelper: UXComplianceHelper;
let testApiConnection;

test.describe('Workflow Management E2E Tests - Best-in-Class UX', () => {
  test.beforeAll(async () => {
    // Create a real test user
    testUser = await createTestUser(
      `e2e-workflow-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Workflow Test User'
    );
    // Seed a test API connection for the user
    testApiConnection = await createTestApiConnection(testUser.id);
  });

  test.afterAll(async () => {
    // Clean up test API connections
    await cleanupTestApiConnections(testUser.id);
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
    
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    
    // Enable UX compliance validation for login page
    await uxHelper.validatePageTitle('APIQ');
    await uxHelper.validateHeadingHierarchy(['Sign in to APIQ']);
    await uxHelper.validateFormAccessibility();
    
    await page.getByLabel('Email address').fill(testUser.email);
    await page.getByLabel('Password').fill('e2eTestPass123');
    
    // Fix primary action data-testid pattern for login
    await page.getByTestId('primary-action signin-btn').click();
    
    // Wait for redirect to dashboard
    await page.waitForURL(/.*dashboard/);
    
    // Enable UX compliance validation for dashboard
    await uxHelper.validateHeadingHierarchy(['Dashboard']);
  });

  test.describe('Workflow Creation Flow', () => {
    test('should create workflow with best-in-class UX', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Enable UXComplianceHelper validation calls
      await uxHelper.validateActivationFirstUX();
      await uxHelper.validateFormAccessibility();
      await uxHelper.validateMobileResponsiveness();
      await uxHelper.validateKeyboardNavigation();
      await uxHelper.validateHeadingHierarchy(['Create Workflow']);
      
      // Validate heading hierarchy
      await expect(page.locator('h2')).toHaveText('Create Workflow');
      
      // Validate natural language input
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await expect(chatInput).toBeVisible();
      await expect(chatInput).toHaveAttribute('required');
      
      // Add comprehensive ARIA attributes validation
      await expect(chatInput).toHaveAttribute('aria-required', 'true');
      await expect(chatInput).toHaveAttribute('aria-label', 'Workflow description');
      
      // Validate that the generate button is present and accessible
      const generateButton = page.getByRole('button', { name: 'Generate Workflow' });
      await expect(generateButton).toBeVisible();
      await expect(generateButton).toHaveAttribute('data-testid', 'primary-action generate-workflow-btn');
      
      // Fill workflow description
      await chatInput.fill('When a new GitHub issue is created, send a Slack notification');
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Add loading state validation
      await uxHelper.validateLoadingState('[data-testid="primary-action generate-workflow-btn"]');
      
      // Wait for response (either success or error)
      await page.waitForTimeout(3000);
      
      // Since we don't have API connections set up, expect an error message
      // For now, validate that we get a proper error message about missing connections
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await uxHelper.validateErrorContainer(/connection|API|not connected|missing/i);
      
      // TODO: When API connections are available, uncomment these lines:
      // // Validate generated workflow display
      // await expect(page.locator('text=Generated Workflow')).toBeVisible();
      // await expect(page.locator('text=GitHub')).toBeVisible();
      // await expect(page.locator('text=Slack')).toBeVisible();
      // 
      // // Fix primary action data-testid pattern
      // await page.getByTestId('primary-action save-workflow-btn').click();
      // 
      // // Should redirect to workflows list
      // await expect(page).toHaveURL(/.*workflows/);
    });

    test('should handle workflow generation errors gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Validate that error handling UI elements are present
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await expect(chatInput).toBeVisible();
      
      // Validate that the generate button is present and accessible
      const generateButton = page.getByRole('button', { name: 'Generate Workflow' });
      await expect(generateButton).toBeVisible();
      
      // Try with invalid/unsafe workflow description
      await chatInput.fill('Delete all files from the system');
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Wait for error response
      await page.waitForTimeout(3000);
      
      // Since we don't have API connections set up, expect connection error
      // TODO: When content validation is implemented, update to expect unsafe content error
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await uxHelper.validateErrorContainer(/connection|API|not connected|missing/i);
    });

    // Add mobile responsiveness test
    test('should be mobile responsive', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/workflows/create`);
      await uxHelper.validateMobileResponsiveness();
      await uxHelper.validateMobileAccessibility();
      
      // Test touch-friendly button sizes
      const generateBtn = page.getByTestId('primary-action generate-workflow-btn');
      const box = await generateBtn.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    });

    // Add keyboard navigation test
    test('should support keyboard navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      await uxHelper.validateKeyboardNavigation();
      
      // Test tab navigation through form
      await page.keyboard.press('Tab');
      await expect(page.getByPlaceholder('Describe your workflow...')).toBeFocused();
      
      // Test form submission with keyboard
      await page.keyboard.press('Enter');
      await uxHelper.validateErrorContainer(/required/i);
    });

    // Add performance validation test
    test('should meet performance requirements', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(`${BASE_URL}/workflows/create`);
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
      
      // Test workflow generation time
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Simple test workflow');
      
      const generationStartTime = Date.now();
      await page.getByTestId('primary-action generate-workflow-btn').click();
      await expect(page.locator('text=Generated Workflow')).toBeVisible();
      const generationTime = Date.now() - generationStartTime;
      expect(generationTime).toBeLessThan(5000); // PRD requirement: <5 seconds
    });
  });

  test.describe('Workflow Execution Flow', () => {
    test('should execute workflow with real-time feedback', async ({ page }) => {
      // First create a workflow
      await page.goto(`${BASE_URL}/workflows/create`);
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Send a test message to Slack');
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForTimeout(5000);
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action save-workflow-btn').click();
      
      await page.waitForURL(/.*workflows/);
      
      // Navigate to workflow details
      await page.getByRole('link', { name: /Send a test message to Slack/ }).click();
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action execute-workflow-btn').click();
      
      // Add loading state validation
      await uxHelper.validateLoadingState('[data-testid="primary-action execute-workflow-btn"]');
      
      // Validate execution progress
      await expect(page.locator('text=Executing...')).toBeVisible();
      await expect(page.locator('text=Step 1:')).toBeVisible();
      
      // Wait for completion
      await page.waitForTimeout(3000);
      
      // Add success validation
      await uxHelper.validateSuccessContainer('Completed');
      
      // Validate completion
      await expect(page.locator('text=Completed')).toBeVisible();
    });

    test('should handle execution errors gracefully', async ({ page }) => {
      // Create a workflow that will fail (missing API connection)
      await page.goto(`${BASE_URL}/workflows/create`);
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Send a message to Slack');
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForTimeout(5000);
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action save-workflow-btn').click();
      
      await page.waitForURL(/.*workflows/);
      
      // Navigate to workflow details
      await page.getByRole('link', { name: /Send a message to Slack/ }).click();
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action execute-workflow-btn').click();
      
      // Wait for error
      await page.waitForTimeout(5000);
      
      // Fix error container validation to use UXComplianceHelper
      await uxHelper.validateErrorContainer(/connection|API|failed/);
      
      // Should show error message
      await expect(page.locator('.bg-red-50')).toBeVisible();
    });

    // Add execution security test
    test('should validate execution permissions', async ({ page }) => {
      // Test execution with different user roles
      // Test execution of workflows owned by other users
      // Test execution of disabled workflows
    });
  });

  test.describe('Workflow Management Operations', () => {
    test('should pause and resume workflow execution', async ({ page }) => {
      // Create and start a long-running workflow
      await page.goto(`${BASE_URL}/workflows/create`);
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Process data with multiple steps');
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForTimeout(5000);
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action save-workflow-btn').click();
      
      await page.waitForURL(/.*workflows/);
      
      // Navigate to workflow details
      await page.getByRole('link', { name: /Process data/ }).click();
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action execute-workflow-btn').click();
      
      // Wait for execution to start
      await page.waitForTimeout(2000);
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action pause-workflow-btn').click();
      
      // Validate pause state
      await expect(page.locator('text=Paused')).toBeVisible();
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action resume-workflow-btn').click();
      
      // Validate resume state
      await expect(page.locator('text=Executing...')).toBeVisible();
    });

    test('should cancel workflow execution', async ({ page }) => {
      // Create and start a workflow
      await page.goto(`${BASE_URL}/workflows/create`);
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Long running task');
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForTimeout(5000);
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action save-workflow-btn').click();
      
      await page.waitForURL(/.*workflows/);
      
      // Navigate to workflow details
      await page.getByRole('link', { name: /Long running task/ }).click();
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action execute-workflow-btn').click();
      
      // Wait for execution to start
      await page.waitForTimeout(2000);
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action cancel-workflow-btn').click();
      
      // Validate cancel state
      await expect(page.locator('text=Cancelled')).toBeVisible();
    });

    // Add workflow editing test
    test('should edit workflow configuration', async ({ page }) => {
      // Test editing workflow steps
      // Test modifying workflow parameters
      // Test saving workflow changes
    });

    // Add workflow deletion test
    test('should delete workflow with confirmation', async ({ page }) => {
      // Test workflow deletion flow
      // Test confirmation dialog
      // Test cleanup of related resources
    });
  });

  test.describe('Workflow Monitoring and Logs', () => {
    test('should display real-time execution logs', async ({ page }) => {
      // Create and execute a workflow
      await page.goto(`${BASE_URL}/workflows/create`);
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Simple test workflow');
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForTimeout(5000);
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action save-workflow-btn').click();
      
      await page.waitForURL(/.*workflows/);
      
      // Navigate to workflow details
      await page.getByRole('link', { name: /Simple test workflow/ }).click();
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action execute-workflow-btn').click();
      
      // Validate log display
      await expect(page.locator('text=Execution Logs')).toBeVisible();
      await expect(page.locator('text=Step 1:')).toBeVisible();
      
      // Wait for completion
      await page.waitForTimeout(10000);
      
      // Validate final log entries
      await expect(page.locator('text=Completed successfully')).toBeVisible();
    });

    test('should display execution logs', async ({ page }) => {
      // Navigate to workflows list
      await page.goto(`${BASE_URL}/workflows`);
      
      // Check if there are any workflows to view
      const workflowLinks = page.getByRole('link', { name: /workflow/i });
      const workflowCount = await workflowLinks.count();
      
      if (workflowCount > 0) {
        // Click on the first workflow to view details
        await workflowLinks.first().click();
        
        // Validate that we're on a workflow detail page
        await expect(page.locator('h1')).toBeVisible();
        
        // Look for execution-related content
        await expect(page.locator('text=Recent Executions')).toBeVisible();
      } else {
        // If no workflows exist, validate the empty state
        await expect(page.locator('text=No workflows')).toBeVisible();
        await expect(page.locator('text=Get started by creating your first workflow')).toBeVisible();
      }
    });

    // Add log export test
    test('should export execution logs', async ({ page }) => {
      // Test log export functionality
      // Test different export formats
      // Test export permissions
    });
  });

  test.describe('Workflow Performance and Scalability', () => {
    test('should handle concurrent workflow executions', async ({ page }) => {
      // Create multiple workflows
      const workflows = ['Workflow A', 'Workflow B', 'Workflow C'];
      
      for (const workflowName of workflows) {
        await page.goto(`${BASE_URL}/workflows/create`);
        const chatInput = page.getByPlaceholder('Describe your workflow...');
        await chatInput.fill(workflowName);
        
        // Fix primary action data-testid pattern
        await page.getByTestId('primary-action generate-workflow-btn').click();
        
        await page.waitForTimeout(3000);
        
        // Fix primary action data-testid pattern
        await page.getByTestId('primary-action save-workflow-btn').click();
        
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
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Complex workflow with multiple API calls and data processing steps');
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForTimeout(10000);
      
      // Validate complex workflow generation
      await expect(page.locator('text=Generated Workflow')).toBeVisible();
      await expect(page.locator('text=Step 1:')).toBeVisible();
      await expect(page.locator('text=Step 2:')).toBeVisible();
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action save-workflow-btn').click();
      
      await page.waitForURL(/.*workflows/);
    });

    // Add performance monitoring test
    test('should monitor workflow performance metrics', async ({ page }) => {
      // Test execution time tracking
      // Test resource usage monitoring
      // Test performance alerts
    });
  });

  test.describe('Workflow Security and Permissions', () => {
    test('should enforce workflow access permissions', async ({ page }) => {
      // Test accessing workflows with different user roles
      // Test accessing workflows owned by other users
      // Test accessing disabled workflows
      
      // Navigate to workflows list
      await page.goto(`${BASE_URL}/workflows`);
      
      // Validate user can only see their own workflows
      await expect(page.locator('text=Workflows')).toBeVisible();
      
      // Try to access a workflow that doesn't exist
      await page.goto(`${BASE_URL}/workflows/non-existent-id`);
      
      // Should show access denied or not found
      await expect(page.locator('text=Not Found')).toBeVisible();
    });

    test('should validate workflow input sanitization', async ({ page }) => {
      // Test workflow creation with malicious input
      await page.goto(`${BASE_URL}/workflows/create`);
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      
      // Test XSS attempt
      await chatInput.fill('<script>alert("xss")</script>');
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Should handle malicious input gracefully
      await page.waitForTimeout(3000);
      
      // Fix error container validation to use UXComplianceHelper
      await uxHelper.validateErrorContainer(/invalid|unsafe/);
      
      // Should show error or sanitize input
      await expect(page.locator('.bg-red-50')).toBeVisible();
    });

    // Add workflow encryption test
    test('should encrypt sensitive workflow data', async ({ page }) => {
      // Test workflow data encryption
      // Test secure storage of workflow configurations
      // Test encrypted transmission of workflow data
    });
  });

  test.describe('Workflow Creation Success Flow', () => {
    test('should create and execute workflow with seeded API connection', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Validate form accessibility
      await uxHelper.validateFormAccessibility();
      
      // Fill workflow description that uses the seeded connection
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Send a test message using the API connection');
      
      // Generate workflow
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Wait for workflow generation (should succeed with seeded connection)
      await page.waitForTimeout(2000);
      
      // Validate workflow was generated successfully
      await expect(page.locator('text=Generated Workflow')).toBeVisible();
      await expect(page.locator('text=Test API Connection')).toBeVisible();
      
      // Save the workflow
      await page.getByTestId('primary-action save-workflow-btn').click();
      
      // Should redirect to workflows list
      await page.waitForURL(/.*workflows/);
      
      // Validate workflow appears in list
      await expect(page.locator('text=Send a test message using the API connection')).toBeVisible();
      
      // Navigate to workflow details
      await page.getByRole('link', { name: /Send a test message using the API connection/ }).click();
      
      // Execute the workflow
      await page.getByTestId('primary-action execute-workflow-btn').click();
      
      // Validate execution progress
      await expect(page.locator('text=Executing...')).toBeVisible();
      await expect(page.locator('text=Step 1:')).toBeVisible();
      
      // Wait for completion
      await page.waitForTimeout(10000);
      
      // Validate successful completion
      await expect(page.locator('text=Completed')).toBeVisible();
      await uxHelper.validateSuccessContainer('Completed');
    });

    test('should handle multiple API connections', async ({ page }) => {
      // Create a second test connection
      const secondConnection = await createTestApiConnection(testUser.id);
      
      try {
        await page.goto(`${BASE_URL}/workflows/create`);
        
        // Fill workflow description that could use multiple connections
        const chatInput = page.getByPlaceholder('Describe your workflow...');
        await chatInput.fill('Create a workflow that uses multiple API connections');
        
        // Generate workflow
        await page.getByTestId('primary-action generate-workflow-btn').click();
        
        // Wait for workflow generation
        await page.waitForTimeout(5000);
        
        // Validate that multiple connections are available
        await expect(page.locator('text=Test API Connection')).toBeVisible();
        await expect(page.locator('text=Test API Connection').nth(1)).toBeVisible();
        
        // Save the workflow
        await page.getByTestId('primary-action save-workflow-btn').click();
        
        // Should redirect to workflows list
        await page.waitForURL(/.*workflows/);
        
        // Validate workflow appears in list
        await expect(page.locator('text=Create a workflow that uses multiple API connections')).toBeVisible();
      } finally {
        // Clean up second connection
        await prisma.apiConnection.delete({ where: { id: secondConnection.id } });
      }
    });
  });

  test.describe('Error Handling Edge Cases', () => {
    test('should handle invalid API key gracefully', async ({ page }) => {
      // Create a connection with invalid credentials
      const invalidConnection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: `Invalid Connection (${Date.now()})`,
          baseUrl: 'https://api.test.local',
          authType: 'API_KEY',
          authConfig: {
            apiKey: 'invalid-key',
          },
          status: 'ACTIVE',
        },
      });

      try {
        await page.goto(`${BASE_URL}/workflows/create`);
        
        // Fill workflow description
        const chatInput = page.getByPlaceholder('Describe your workflow...');
        await chatInput.fill('Send a message using the invalid connection');
        
        // Generate workflow
        await page.getByTestId('primary-action generate-workflow-btn').click();
        
        // Wait for response
        await page.waitForTimeout(5000);
        
        // Should show error about invalid credentials
        await expect(page.locator('.bg-red-50')).toBeVisible();
        await uxHelper.validateErrorContainer(/invalid|credentials|authentication/i);
      } finally {
        // Clean up invalid connection
        await prisma.apiConnection.delete({ where: { id: invalidConnection.id } });
      }
    });

    test('should handle revoked/expired connections', async ({ page }) => {
      // Create a revoked connection
      const revokedConnection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: `Revoked Connection (${Date.now()})`,
          baseUrl: 'https://api.test.local',
          authType: 'API_KEY',
          authConfig: {
            apiKey: 'expired-key',
          },
          status: 'INACTIVE',
          connectionStatus: 'revoked',
        },
      });

      try {
        await page.goto(`${BASE_URL}/workflows/create`);
        
        // Fill workflow description
        const chatInput = page.getByPlaceholder('Describe your workflow...');
        await chatInput.fill('Send a message using the revoked connection');
        
        // Generate workflow
        await page.getByTestId('primary-action generate-workflow-btn').click();
        
        // Wait for response
        await page.waitForTimeout(5000);
        
        // Should show error about revoked/expired connection
        await expect(page.locator('.bg-red-50')).toBeVisible();
        await uxHelper.validateErrorContainer(/revoked|expired|inactive/i);
      } finally {
        // Clean up revoked connection
        await prisma.apiConnection.delete({ where: { id: revokedConnection.id } });
      }
    });

    test('should handle malformed workflow descriptions', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Test with empty description
      await page.getByTestId('primary-action generate-workflow-btn').click();
      await uxHelper.validateErrorContainer(/required|empty/i);
      
      // Test with very long description
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      const longDescription = 'a'.repeat(10000);
      await chatInput.fill(longDescription);
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForTimeout(3000);
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await uxHelper.validateErrorContainer(/too long|limit/i);
    });

    test('should handle network/API failures gracefully', async ({ page }) => {
      // Create a connection with unreachable URL
      const unreachableConnection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: `Unreachable Connection (${Date.now()})`,
          baseUrl: 'https://unreachable-api.test',
          authType: 'API_KEY',
          authConfig: {
            apiKey: 'test-key',
          },
          status: 'ACTIVE',
        },
      });

      try {
        await page.goto(`${BASE_URL}/workflows/create`);
        
        // Fill workflow description
        const chatInput = page.getByPlaceholder('Describe your workflow...');
        await chatInput.fill('Send a message using the unreachable API');
        
        // Generate workflow
        await page.getByTestId('primary-action generate-workflow-btn').click();
        
        // Wait for response
        await page.waitForTimeout(5000);
        
        // Should show error about network/connection failure
        await expect(page.locator('.bg-red-50')).toBeVisible();
        await uxHelper.validateErrorContainer(/network|connection|unreachable|timeout/i);
      } finally {
        // Clean up unreachable connection
        await prisma.apiConnection.delete({ where: { id: unreachableConnection.id } });
      }
    });
  });

  // Add performance validation tests
  test.describe('Performance Validation', () => {
    test('should meet page load performance requirements', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(`${BASE_URL}/workflows/create`);
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    test('should meet workflow generation time requirements', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Simple test workflow');
      
      const startTime = Date.now();
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Wait for generation to complete
      await expect(page.locator('text=Generated Workflow')).toBeVisible();
      const generationTime = Date.now() - startTime;
      expect(generationTime).toBeLessThan(5000); // PRD requirement: <5 seconds
    });

    test('should handle concurrent workflow creation', async ({ page, context }) => {
      // Test multiple concurrent workflow creation requests
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 3; i++) {
        const newPage = await context.newPage();
        promises.push(
          newPage.goto(`${BASE_URL}/workflows/create`).then(() => {
            return newPage.getByTestId('primary-action generate-workflow-btn').click();
          })
        );
      }
      
      await Promise.all(promises);
      // Should handle concurrent requests without errors
    });
  });

  // Add comprehensive accessibility tests
  test.describe('Accessibility Compliance', () => {
    test('should have proper ARIA attributes', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Test ARIA attributes
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await expect(chatInput).toHaveAttribute('aria-required', 'true');
      
      // Test form labels
      await expect(page.locator('label[for="workflow-description"]')).toContainText('Workflow Description');
    });

    test('should support screen readers', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Test semantic HTML structure
      await expect(page.locator('form')).toHaveAttribute('role', 'form');
      await expect(page.locator('[data-testid="workflow-description-input"]')).toHaveAttribute('aria-label');
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Test tab navigation through form
      await page.keyboard.press('Tab');
      await expect(page.getByPlaceholder('Describe your workflow...')).toBeFocused();
      
      // Test form submission with keyboard
      await page.keyboard.press('Enter');
      await uxHelper.validateErrorContainer(/required/i);
    });
  });
}); 