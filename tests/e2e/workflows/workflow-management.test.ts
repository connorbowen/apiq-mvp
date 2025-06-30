import { test, expect } from '@playwright/test';

test.describe('Workflow Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-token', 'mock-token');
    });
    await page.goto('/dashboard');
  });

  test('Create new workflow', async ({ page }) => {
    // Navigate to workflows page
    await page.getByRole('link', { name: /workflows/i }).click();
    await expect(page.getByRole('heading', { name: /workflows/i })).toBeVisible();
    
    // Click create workflow button
    await page.getByRole('button', { name: /create workflow/i }).click();
    
    // Fill workflow details
    await page.getByLabel(/workflow name/i).fill('Test Workflow');
    await page.getByLabel(/description/i).fill('A test workflow for automation');
    await page.getByLabel(/status/i).selectOption('DRAFT');
    
    // Add a step
    await page.getByRole('button', { name: /add step/i }).click();
    await page.getByRole('textbox', { name: /name/i }).nth(1).fill('Get Users');
    await page.getByLabel(/description/i).nth(1).fill('Fetch users from API');
    await page.getByLabel(/action/i).fill('GET /users');
    
    // Save workflow
    await page.getByRole('button', { name: /save workflow/i }).click();
    
    // Verify workflow was created
    await expect(page.getByText('Test Workflow')).toBeVisible();
    await expect(page.getByText('A test workflow for automation')).toBeVisible();
  });

  test('Edit existing workflow', async ({ page }) => {
    // Navigate to workflows and select existing workflow
    await page.getByRole('link', { name: /workflows/i }).click();
    await page.getByText('Test Workflow').click();
    
    // Click edit button
    await page.getByRole('button', { name: /edit/i }).click();
    
    // Modify workflow details
    await page.getByLabel(/workflow name/i).fill('Updated Test Workflow');
    await page.getByLabel(/description/i).fill('Updated description');
    
    // Save changes
    await page.getByRole('button', { name: /save workflow/i }).click();
    
    // Verify changes were saved
    await expect(page.getByText('Updated Test Workflow')).toBeVisible();
    await expect(page.getByText('Updated description')).toBeVisible();
  });

  test('Execute workflow', async ({ page }) => {
    // Mock workflow execution API
    await page.route('**/api/workflows/*/execute', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          executionId: 'exec-123',
          status: 'RUNNING'
        })
      });
    });
    
    // Navigate to workflows and execute
    await page.getByRole('link', { name: /workflows/i }).click();
    await page.getByText('Test Workflow').click();
    await page.getByRole('button', { name: /run|execute/i }).click();
    
    // Verify execution started
    await expect(page.getByText(/execution started/i)).toBeVisible();
    await expect(page.getByText(/exec-123/i)).toBeVisible();
  });

  test('Monitor workflow execution', async ({ page }) => {
    // Mock execution status API
    await page.route('**/api/workflows/*/executions/*', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          execution: {
            id: 'exec-123',
            status: 'COMPLETED',
            steps: [
              { name: 'Get Users', status: 'SUCCESS', duration: 1200 },
              { name: 'Process Data', status: 'SUCCESS', duration: 800 }
            ],
            startedAt: '2024-01-01T10:00:00Z',
            completedAt: '2024-01-01T10:02:00Z'
          }
        })
      });
    });
    
    // Navigate to execution details
    await page.goto('/workflows/wf-1/executions/exec-123');
    
    // Verify execution details
    await expect(page.getByText(/execution details/i)).toBeVisible();
    await expect(page.getByText(/completed/i)).toBeVisible();
    await expect(page.getByText(/get users/i)).toBeVisible();
    await expect(page.getByText(/process data/i)).toBeVisible();
  });

  test('Delete workflow', async ({ page }) => {
    // Mock delete API
    await page.route('**/api/workflows/*', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      }
    });
    
    // Navigate to workflows and delete
    await page.getByRole('link', { name: /workflows/i }).click();
    await page.getByText('Test Workflow').click();
    await page.getByRole('button', { name: /delete/i }).click();
    
    // Confirm deletion
    await page.getByRole('button', { name: /confirm/i }).click();
    
    // Verify workflow was deleted
    await expect(page.getByText('Test Workflow')).not.toBeVisible();
  });

  test('Workflow validation', async ({ page }) => {
    // Navigate to create workflow
    await page.getByRole('link', { name: /workflows/i }).click();
    await page.getByRole('button', { name: /create workflow/i }).click();
    
    // Try to save without required fields
    await page.getByRole('button', { name: /save workflow/i }).click();
    
    // Verify validation errors
    await expect(page.getByText(/workflow name is required/i)).toBeVisible();
    await expect(page.getByText(/at least one step is required/i)).toBeVisible();
  });

  test('Workflow step management', async ({ page }) => {
    // Navigate to create workflow
    await page.getByRole('link', { name: /workflows/i }).click();
    await page.getByRole('button', { name: /create workflow/i }).click();
    
    // Fill basic info
    await page.getByLabel(/workflow name/i).fill('Step Test Workflow');
    
    // Add multiple steps
    await page.getByRole('button', { name: /add step/i }).click();
    await page.getByRole('textbox', { name: /name/i }).nth(1).fill('Step 1: Get Data');
    
    await page.getByRole('button', { name: /add step/i }).click();
    await page.getByRole('textbox', { name: /name/i }).nth(2).fill('Step 2: Process Data');
    
    await page.getByRole('button', { name: /add step/i }).click();
    await page.getByRole('textbox', { name: /name/i }).nth(3).fill('Step 3: Send Results');
    
    // Remove middle step
    await page.getByRole('button', { name: /remove/i }).nth(1).click();
    
    // Verify step reordering
    await expect(page.getByText('Step 1: Get Data')).toBeVisible();
    await expect(page.getByText('Step 2: Send Results')).toBeVisible();
    await expect(page.getByText('Step 3: Send Results')).not.toBeVisible();
  });
}); 