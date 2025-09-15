import { test, expect } from '@playwright/test';
import { 
  getPrimaryActionButton,
  setupE2E
} from '../../helpers/e2eHelpers';
import { 
  waitForNetworkIdle
} from '../../helpers/waitHelpers';
import { 
  waitForElement,
  validateUXCompliance
} from '../../helpers/uiHelpers';
import { testFormAccessibility } from '../../helpers/accessibilityHelpers';
import { 
  testXSSPrevention,
  testDataExposure
} from '../../helpers/securityHelpers';
import { 
  cleanupTestUser, 
  TestUser 
} from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Visual Workflow Builder E2E Tests', () => {
  let testUser: TestUser;

  test.beforeAll(async () => {
    // Create a real test user
    testUser = await createE2EUser(Role.USER, {
      email: `workflow-test-${Date.now()}@testuser.local`,
      password: 'testpass123',
      name: 'Workflow Test User'
    });
  });

  test.afterAll(async () => {
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    // Setup E2E environment
    await setupE2E(page, testUser, { tab: 'workflows' });
  });

  test.describe('Visual Workflow Builder Access', () => {
    test('should navigate to visual workflow builder from workflows tab', async ({ page }) => {
      // Navigate to workflows tab
      await page.goto(`${BASE_URL}/dashboard?tab=workflows`);
      await waitForNetworkIdle(page);

      // Click create workflow button
      const createButton = page.getByTestId('primary-action create-workflow-btn');
      await expect(createButton).toBeVisible();
      await createButton.click();

      // Should navigate to visual builder
      await expect(page).toHaveURL(/.*workflows\/new/);
      
      // Validate page content
      await expect(page.locator('h1:has-text("Create New Workflow")')).toBeVisible();
      await expect(page.locator('h2:has-text("Visual Workflow Builder")')).toBeVisible();
    });

    test('should navigate to visual workflow builder from workflows page', async ({ page }) => {
      // Navigate to workflows page
      await page.goto(`${BASE_URL}/workflows`);
      await waitForNetworkIdle(page);

      // Click create workflow button
      const createButton = page.getByTestId('create-workflow-btn');
      await expect(createButton).toBeVisible();
      await createButton.click();

      // Should navigate to visual builder
      await expect(page).toHaveURL(/.*workflows\/new/);
      
      // Validate page content
      await expect(page.locator('h1:has-text("Create New Workflow")')).toBeVisible();
      await expect(page.locator('h2:has-text("Visual Workflow Builder")')).toBeVisible();
    });

    test('should navigate to visual workflow builder from overview tab', async ({ page }) => {
      // Navigate to dashboard overview
      await page.goto(`${BASE_URL}/dashboard`);
      await waitForNetworkIdle(page);

      // Click create workflow button in quick actions
      const createButton = page.locator('button:has-text("Create Workflow")');
      await expect(createButton).toBeVisible();
      await createButton.click();

      // Should navigate to visual builder
      await expect(page).toHaveURL(/.*workflows\/new/);
      
      // Validate page content
      await expect(page.locator('h1:has-text("Create New Workflow")')).toBeVisible();
      await expect(page.locator('h2:has-text("Visual Workflow Builder")')).toBeVisible();
    });
  });

  test.describe('Visual Workflow Builder Functionality', () => {
    test('should display workflow builder form with proper UX compliance', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/new`);
      await waitForNetworkIdle(page);

      // Validate UX compliance
      await validateUXCompliance(page, {
        title: 'Create New Workflow',
        headings: 'Create New Workflow',
        validateForm: true,
        validateAccessibility: true
      });

      // Validate form elements are present
      await expect(page.locator('input[placeholder="Enter workflow name"]')).toBeVisible();
      await expect(page.locator('textarea[placeholder="Describe what this workflow does"]')).toBeVisible();
      await expect(page.locator('select')).toBeVisible(); // Status dropdown
    });

    test('should allow creating a basic workflow', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/new`);
      await waitForNetworkIdle(page);

      // Fill in basic workflow information
      await page.fill('input[placeholder="Enter workflow name"]', 'Test Visual Workflow');
      await page.fill('textarea[placeholder="Describe what this workflow does"]', 'A test workflow created via visual builder');

      // Select status
      await page.selectOption('select', 'DRAFT');

      // Validate form accessibility
      await testFormAccessibility(page, {
        submitButton: 'primary-action save-workflow-btn'
      });

      // Test security validation
      await testXSSPrevention(page, 'input[placeholder="Enter workflow name"]', '<script>alert("xss")</script>');
      await testDataExposure(page, ['input[placeholder="Enter workflow name"]', 'textarea[placeholder="Describe what this workflow does"]']);

      // Look for save button (it should be present in the WorkflowBuilder component)
      const saveButton = page.locator('button:has-text("Save Workflow")');
      await expect(saveButton).toBeVisible();
    });

    test('should allow adding workflow steps', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/new`);
      await waitForNetworkIdle(page);

      // Fill in basic information
      await page.fill('input[placeholder="Enter workflow name"]', 'Multi-Step Visual Workflow');
      await page.fill('textarea[placeholder="Describe what this workflow does"]', 'A workflow with multiple steps');

      // Look for add step button
      const addStepButton = page.locator('button:has-text("Add Step")');
      await expect(addStepButton).toBeVisible();
      
      // Click add step
      await addStepButton.click();

      // Should show step configuration form
      await expect(page.locator('input[placeholder*="Step"]')).toBeVisible();
    });

    test('should handle form validation', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/new`);
      await waitForNetworkIdle(page);

      // Try to save without filling required fields
      const saveButton = page.locator('button:has-text("Save Workflow")');
      await expect(saveButton).toBeVisible();
      
      // Click save without filling name
      await saveButton.click();

      // Should show validation error
      await expect(page.locator('text=Workflow name is required')).toBeVisible();
    });

    test('should allow canceling workflow creation', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/new`);
      await waitForNetworkIdle(page);

      // Look for cancel button
      const cancelButton = page.locator('button:has-text("Cancel")');
      await expect(cancelButton).toBeVisible();
      
      // Click cancel
      await cancelButton.click();

      // Should navigate back to workflows list
      await expect(page).toHaveURL(/.*workflows/);
    });
  });

  test.describe('Visual Workflow Builder Integration', () => {
    test('should integrate with existing API connections', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/new`);
      await waitForNetworkIdle(page);

      // Add a step
      const addStepButton = page.locator('button:has-text("Add Step")');
      await addStepButton.click();

      // Should show connection selection dropdown
      await expect(page.locator('select[name*="connection"]')).toBeVisible();
    });

    test('should maintain form state during navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/new`);
      await waitForNetworkIdle(page);

      // Fill in some data
      await page.fill('input[placeholder="Enter workflow name"]', 'Persistent Workflow');
      await page.fill('textarea[placeholder="Describe what this workflow does"]', 'Testing form persistence');

      // Navigate away and back (simulate browser back/forward)
      await page.goto(`${BASE_URL}/workflows`);
      await page.goBack();

      // Form should maintain state (this depends on implementation)
      // Note: This test might need adjustment based on actual form state management
      await expect(page.locator('input[placeholder="Enter workflow name"]')).toHaveValue('Persistent Workflow');
    });
  });

  test.describe('Visual Workflow Builder Performance', () => {
    test('should load visual builder within 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/workflows/new`);
      await waitForNetworkIdle(page);
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle multiple rapid form interactions', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/new`);
      await waitForNetworkIdle(page);

      // Rapidly interact with form elements
      const nameInput = page.locator('input[placeholder="Enter workflow name"]');
      const descriptionTextarea = page.locator('textarea[placeholder="Describe what this workflow does"]');
      
      await nameInput.fill('Rapid Test');
      await descriptionTextarea.fill('Testing rapid interactions');
      await nameInput.clear();
      await nameInput.fill('Updated Name');
      await descriptionTextarea.clear();
      await descriptionTextarea.fill('Updated description');

      // Form should still be responsive
      await expect(nameInput).toHaveValue('Updated Name');
      await expect(descriptionTextarea).toHaveValue('Updated description');
    });
  });
});

