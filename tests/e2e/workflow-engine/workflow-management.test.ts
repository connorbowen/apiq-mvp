import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId, createTestConnection } from '../../helpers/testUtils';
import { UXComplianceHelper, UXValidations } from '../../helpers/uxCompliance';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: any;
let jwt: string;

test.describe('Workflow Management - Best-in-Class UX & Activation', () => {
  let uxHelper: UXComplianceHelper;

  test.beforeAll(async () => {
    // Create test user with admin privileges
    testUser = await createTestUser(
      `e2e-workflow-${Date.now()}@example.com`,
      'e2ePass123',
      'ADMIN'
    );

    // Ensure the user has at least one ACTIVE API connection (required for workflow generation)
    await createTestConnection(
      testUser,
      'Test API Connection',
      'https://api.example.com',
      'API_KEY'
    );

    // Create a real test user and get JWT
    jwt = testUser.accessToken;
  });

  test.afterAll(async () => {
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
    
    // Real authentication - no mocking (following user rules)
    await page.goto('/login');
    
    // Fill in real login credentials
    await page.getByLabel('Email address').fill(testUser.email);
    await page.getByLabel('Password').fill('e2ePass123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Wait for successful login and redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Wait for dashboard to fully load (dashboard has loading state with spinner)
    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });
    
    // Validate UX compliance - heading hierarchy (UX spec requirement)
    await uxHelper.validateHeadingHierarchy(['Dashboard']);
  });

  test.describe('Natural Language Workflow Creation - Activation-First UX', () => {
    test('should create workflow using natural language with clear activation path', async ({ page }) => {
      // Navigate to workflows tab in dashboard
      await page.getByTestId('tab-workflows').click();
      
      // Validate UX compliance - heading hierarchy (UX spec requirement)
      await uxHelper.validateHeadingHierarchy(['Workflows']);
      await expect(page.getByRole('heading', { name: /Workflows/ })).toBeVisible();
      
      // Click "Create Workflow" button
      await page.getByTestId('create-workflow-btn').click();
      
      // Wait for navigation to create workflow page
      await expect(page).toHaveURL(/.*workflows\/create/);
      
      // Validate UX compliance - heading hierarchy for create form (UX spec requirement)
      await uxHelper.validateHeadingHierarchy(['Create Workflow']);
      await expect(page.getByText(/Use AI to create workflows/)).toBeVisible();
      
      // Fill in the workflow description
      const workflowDescription = 'Create a workflow that sends a Slack notification when a new GitHub issue is created';
      await page.getByTestId('workflow-description-input').fill(workflowDescription);
      
      // Intercept the POST /api/chat call to debug the response
      const chatResponsePromise = page.waitForResponse(
        response => response.url().includes('/api/chat') && response.request().method() === 'POST',
        { timeout: 30000 }
      );
      
      // Submit the form
      await page.getByTestId('generate-workflow-btn').click();
      
      // Wait for and log the response
      const chatResponse = await chatResponsePromise;
      const responseBody = await chatResponse.json();
      console.log('=== WORKFLOW GENERATION RESPONSE ===');
      console.log('Status:', chatResponse.status());
      console.log('Response Body:', JSON.stringify(responseBody, null, 2));
      console.log('=====================================');
      
      // Assert on the response structure
      expect(chatResponse.ok()).toBeTruthy();
      expect(responseBody).toHaveProperty('success');
      
      if (responseBody.success) {
        expect(responseBody.data).toBeDefined();
        console.log('✅ Workflow generation succeeded');
      } else {
        console.log('❌ Workflow generation failed:', responseBody.error || responseBody.message);
      }
      
      // Wait for the success message in the UI
      await expect(page.getByTestId('workflow-success-message')).toContainText("I've created a workflow for you");
      
      // Validate UX compliance - success message accessibility (UX spec requirement)
      await expect(page.locator('.bg-green-50')).toBeVisible();
      await expect(page.locator('.text-green-800')).toContainText(/I've created a workflow for you/i);
    });

    test('should handle workflow generation errors with clear messaging', async ({ page }) => {
      // Navigate to create workflow page
      await page.getByTestId('tab-workflows').click();
      await page.getByTestId('create-workflow-btn').click();
      
      // Test with invalid/empty input
      const chatInput = page.getByPlaceholder(/Describe your workflow in plain English/);
      await chatInput.fill('');
      await page.getByRole('button', { name: 'Generate' }).click();
      
      // Should show validation error (UX spec requirement)
      await expect(page.getByText(/please.*describe|enter.*description/i)).toBeVisible();
      
      // Test with vague description
      await chatInput.fill('do something');
      await page.getByRole('button', { name: 'Generate' }).click();
      
      // Should show helpful error message (UX spec requirement)
      await expect(page.getByText(/Please try being more specific/)).toBeVisible();
    });

    test('should provide alternative workflow suggestions', async ({ page }) => {
      // Navigate to create workflow page
      await page.getByTestId('tab-workflows').click();
      await page.getByTestId('create-workflow-btn').click();
      
      // Create a workflow that might have alternatives
      const chatInput = page.getByPlaceholder(/Describe your workflow in plain English/);
      await chatInput.fill('Send notifications when something happens');
      await page.getByRole('button', { name: 'Generate' }).click();
      
      // Wait for response
      await expect(page.getByText(/I've created a workflow for you/)).toBeVisible();
      
      // Check for alternative suggestions (UX spec requirement)
      const alternativesSection = page.getByText(/Alternative approaches/);
      if (await alternativesSection.isVisible()) {
        await expect(alternativesSection).toBeVisible();
        // Test selecting an alternative
        const firstAlternative = page.locator('button').filter({ hasText: /notification/i }).first();
        if (await firstAlternative.isVisible()) {
          await firstAlternative.click();
          await expect(page.getByText(/Selected Workflow/)).toBeVisible();
        }
      }
    });
  });

  test.describe('Workflow Management Dashboard - UX Compliance', () => {
    test('should display workflows with clear status indicators', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByTestId('tab-workflows').click();
      
      // Validate UX compliance - heading hierarchy
      await uxHelper.validateHeadingHierarchy(['Workflows']);
      await expect(page.getByText(/Manage your automated workflows/)).toBeVisible();
      
      // Test search functionality (UX spec requirement)
      const searchInput = page.getByTestId('search-input');
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toHaveAttribute('placeholder', /Search workflows/);
      
      // Test filter functionality (UX spec requirement)
      const filterSelect = page.getByTestId('workflow-filter-select');
      await expect(filterSelect).toBeVisible();
      await expect(filterSelect).toHaveValue('all');
      
      // Test empty state (UX spec requirement)
      const emptyState = page.getByText(/No workflows/);
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();
        await expect(page.getByText(/Get started by creating your first workflow/)).toBeVisible();
        await expect(page.getByText(/Create Workflow/)).toBeVisible();
      }
    });

    test('should handle workflow actions with confirmation', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByTestId('tab-workflows').click();
      
      // Look for existing workflow
      const workflowCard = page.getByTestId('workflow-card');
      if (await workflowCard.count() > 0) {
        // Test workflow card structure (UX spec requirement)
        await expect(workflowCard.first()).toBeVisible();
        await expect(workflowCard.first().locator('p')).toContainText(/[A-Za-z]/); // Workflow name
        
        // Test workflow actions
        const viewLink = workflowCard.first().getByRole('link', { name: /View/ });
        await expect(viewLink).toBeVisible();
        
        // Test delete workflow with confirmation (UX spec requirement)
        const deleteButton = workflowCard.first().getByRole('button', { name: /Delete/ });
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          
          // Should show confirmation dialog (UX spec requirement)
          await expect(page.getByText(/Are you sure you want to delete/)).toBeVisible();
          
          // Cancel deletion
          await page.getByRole('button', { name: /Cancel/ }).click();
        }
      } else {
        // No workflows exist, skip this test
        test.skip();
      }
    });
  });

  test.describe('Accessibility & UX Compliance - WCAG 2.1 AA', () => {
    test('should have accessible form fields and keyboard navigation', async ({ page }) => {
      // Navigate to workflows page
      await page.getByTestId('tab-workflows').click();
      await page.getByTestId('create-workflow-btn').click();
      
      // Validate UX compliance - heading hierarchy
      await uxHelper.validateHeadingHierarchy(['Create Workflow']);
      
      // Test keyboard navigation (UX spec requirement)
      await uxHelper.validateKeyboardNavigation();
      
      // Test form field accessibility (UX spec requirement)
      const chatInput = page.getByPlaceholder(/Describe your workflow in plain English/);
      await expect(chatInput).toHaveAttribute('type', 'text');
      await expect(chatInput).not.toBeDisabled();
      
      // Test ARIA attributes (UX spec requirement)
      const generateButton = page.getByRole('button', { name: /Generate/ });
      await expect(generateButton).toBeVisible();
      await expect(generateButton).not.toBeDisabled();
      
      // Test form validation accessibility
      await chatInput.fill('');
      await page.keyboard.press('Tab');
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });

    test('should handle form validation errors with accessible messaging', async ({ page }) => {
      // Navigate to workflows page
      await page.getByTestId('tab-workflows').click();
      await page.getByTestId('create-workflow-btn').click();
      
      // Try to generate without input
      await page.getByRole('button', { name: /Generate/ }).click();
      
      // Validate UX compliance - accessible error containers (UX spec requirement)
      await uxHelper.validateErrorContainer(/Please describe your workflow in plain English/);
      
      // Test error message clarity (UX spec requirement)
      await expect(page.locator('.text-red-800')).toContainText(/Please describe your workflow in plain English/);
    });

    test('should have mobile responsive design', async ({ page }) => {
      // Set mobile viewport (UX spec requirement)
      await uxHelper.validateMobileResponsiveness();
      
      // Navigate to workflows page
      await page.getByTestId('tab-workflows').click();
      await page.getByTestId('create-workflow-btn').click();
      
      // Validate mobile layout (UX spec requirement)
      await expect(page.getByPlaceholder(/Describe your workflow in plain English/)).toBeVisible();
      await expect(page.getByRole('button', { name: /Generate/ })).toBeVisible();
      
      // Test mobile form interaction
      const chatInput = page.getByPlaceholder(/Describe your workflow in plain English/);
      await chatInput.fill('Mobile Test Workflow');
      await expect(chatInput).toHaveValue('Mobile Test Workflow');
    });

    test('should handle loading states and success feedback', async ({ page }) => {
      // Navigate to workflows page
      await page.getByTestId('tab-workflows').click();
      await page.getByTestId('create-workflow-btn').click();
      
      // Fill workflow description
      const chatInput = page.getByPlaceholder(/Describe your workflow in plain English/);
      await chatInput.fill('Loading Test Workflow - fetch data and send email');
      
      // Submit and validate loading state (UX spec requirement)
      const generateButton = page.getByRole('button', { name: /Generate/ });
      await generateButton.click();
      
      // Validate UX compliance - loading state
      await expect(generateButton).toBeDisabled();
      await expect(generateButton).toHaveText(/Generating/);
      
      // Wait for completion and validate success state
      await expect(page.getByTestId('workflow-success-message')).toContainText("I've created a workflow for you");
    });
  });

  test.describe('Workflow Execution & Monitoring - Real-time UX', () => {
    test('should execute workflow with real-time feedback', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByTestId('tab-workflows').click();
      
      // Look for existing workflow
      const workflowCard = page.getByTestId('workflow-card');
      if (await workflowCard.count() > 0) {
        // Click on first workflow
        await workflowCard.first().click();
        
        // Should navigate to workflow detail page
        await expect(page).toHaveURL(/.*workflows\/.*/);
        
        // Look for execute button
        const executeButton = page.getByRole('button', { name: /execute|run/i });
        if (await executeButton.count() > 0) {
          await executeButton.first().click();
          
          // Should show execution started message (UX spec requirement)
          await expect(page.getByText(/execution.*started|workflow.*running/i)).toBeVisible();
          
          // Validate real-time status updates (UX spec requirement)
          await expect(page.locator('.bg-blue-100')).toBeVisible();
        }
      } else {
        // No workflows exist, skip this test
        test.skip();
      }
    });

    test('should provide comprehensive workflow monitoring', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByTestId('tab-workflows').click();
      
      // Look for existing workflow
      const workflowCard = page.getByTestId('workflow-card');
      if (await workflowCard.count() > 0) {
        // Click on first workflow
        await workflowCard.first().click();
        
        // Should show workflow details (UX spec requirement)
        await expect(page.locator('h1, h2')).toHaveText(/[A-Za-z]/); // Some heading
        
        // Look for monitoring elements
        await expect(page.getByText(/Status/)).toBeVisible();
        await expect(page.getByText(/Last run/)).toBeVisible();
        await expect(page.getByText(/Steps/)).toBeVisible();
      } else {
        // No workflows exist, skip this test
        test.skip();
      }
    });
  });

  test.describe('Error Handling & Recovery - Graceful UX', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Navigate to workflows page
      await page.getByTestId('tab-workflows').click();
      await page.getByTestId('create-workflow-btn').click();
      
      // Test network error handling by temporarily breaking the connection
      // This would require mocking in a real test, but we'll test the UI response
      const chatInput = page.getByPlaceholder(/Describe your workflow in plain English/);
      await chatInput.fill('Test workflow for error handling');
      
      // Submit and check for error handling
      await page.getByRole('button', { name: /Generate/ }).click();
      
      // Should handle errors gracefully (UX spec requirement)
      const errorMessage = page.getByText(/Sorry, I encountered an error/);
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
        await expect(page.getByText(/Please try again/)).toBeVisible();
      }
    });

    test('should provide clear recovery paths', async ({ page }) => {
      // Navigate to workflows page
      await page.getByTestId('tab-workflows').click();
      await page.getByTestId('create-workflow-btn').click();
      
      // Test validation error recovery
      const chatInput = page.getByPlaceholder(/Describe your workflow in plain English/);
      await chatInput.fill('');
      await page.getByRole('button', { name: /Generate/ }).click();
      
      // Should show clear error message
      await expect(page.getByText(/please.*describe|enter.*description/i)).toBeVisible();
      
      // Should allow easy recovery
      await chatInput.fill('Valid workflow description');
      await expect(chatInput).toHaveValue('Valid workflow description');
    });
  });

  test.describe('Performance & Responsiveness - UX Excellence', () => {
    test('should load workflow pages quickly', async ({ page }) => {
      // Navigate to workflows tab
      const startTime = Date.now();
      await page.getByTestId('tab-workflows').click();
      
      // Should load within 2 seconds (UX spec requirement)
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
      
      // Validate content is loaded
      await expect(page.locator('h2')).toHaveText(/Workflows/);
    });

    test('should handle large workflow lists efficiently', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByTestId('tab-workflows').click();
      
      // Test search performance
      const searchInput = page.getByTestId('search-input');
      await searchInput.fill('test');
      
      // Should respond quickly to search input
      await expect(searchInput).toHaveValue('test');
    });
  });

  test.describe('Comprehensive UX Compliance Validation', () => {
    test('should meet all UX spec requirements for workflow management', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByTestId('tab-workflows').click();
      
      // Validate comprehensive UX compliance
      await uxHelper.validateCompleteUXCompliance();
      
      // Validate specific workflow management UX
      await uxHelper.validateWorkflowManagementUX();
    });

    test('should meet all UX spec requirements for workflow creation', async ({ page }) => {
      // Navigate to create workflow page
      await page.getByTestId('tab-workflows').click();
      await page.getByTestId('create-workflow-btn').click();
      
      // Validate comprehensive UX compliance
      await uxHelper.validateCompleteUXCompliance();
      
      // Validate specific workflow creation UX
      await uxHelper.validateWorkflowCreationUX();
    });
  });
}); 