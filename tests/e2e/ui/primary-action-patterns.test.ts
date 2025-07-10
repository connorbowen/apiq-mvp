import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser } from '../../helpers/testUtils';
import { createUXComplianceHelper } from '../../helpers/uxCompliance';

test.describe('Primary Action Button Patterns - UX Compliance', () => {
  let testUser: any;

  test.beforeAll(async () => {
    testUser = await createTestUser();
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser);
  });

  test('should have consistent primary action patterns across all pages', async ({ page }) => {
    // Test login page primary actions
    await page.goto('/login');
    await expect(page.getByTestId('primary-action signin-submit')).toBeVisible();
    await expect(page.getByTestId('primary-action signin-submit')).toHaveText('Sign in');
    
    // Test signup page primary actions
    await page.goto('/signup');
    await expect(page.getByTestId('primary-action signup-submit')).toBeVisible();
    await expect(page.getByTestId('primary-action signup-submit')).toHaveText('Create account');
    
    // Login to test dashboard primary actions
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.getByTestId('primary-action signin-submit').click();
    
    // Wait for dashboard to load
    await page.waitForURL('/dashboard');
    
    // Test workflows tab primary actions
    await page.getByTestId('tab-workflows').click();
    await expect(page.getByTestId('primary-action create-workflow-btn')).toBeVisible();
    await expect(page.getByTestId('primary-action create-workflow-btn')).toHaveText('Create Workflow');
    
    // Test connections tab primary actions
    await page.getByTestId('tab-connections').click();
    await expect(page.getByTestId('primary-action create-connection-header-btn')).toBeVisible();
    await expect(page.getByTestId('primary-action create-connection-header-btn')).toHaveText('Add Connection');
    
    // Test secrets tab primary actions
    await page.getByTestId('tab-secrets').click();
    await expect(page.getByTestId('primary-action create-secret-btn')).toBeVisible();
    await expect(page.getByTestId('primary-action create-secret-btn')).toHaveText('Create Secret');
  });

  test('should validate UX compliance for primary actions', async ({ page }) => {
    const uxHelper = createUXComplianceHelper(page);
    
    // Test login page UX compliance
    await page.goto('/login');
    await uxHelper.validateActivationFirstUX();
    
    // Test signup page UX compliance
    await page.goto('/signup');
    await uxHelper.validateActivationFirstUX();
    
    // Login and test dashboard UX compliance
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.getByTestId('primary-action signin-submit').click();
    await page.waitForURL('/dashboard');
    
    // Test each tab for UX compliance
    await page.getByTestId('tab-workflows').click();
    await uxHelper.validateActivationFirstUX();
    
    await page.getByTestId('tab-connections').click();
    await uxHelper.validateActivationFirstUX();
    
    await page.getByTestId('tab-secrets').click();
    await uxHelper.validateActivationFirstUX();
  });

  test('should have proper styling for primary action buttons', async ({ page }) => {
    // Login to access dashboard
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.getByTestId('primary-action signin-submit').click();
    await page.waitForURL('/dashboard');
    
    // Test workflows tab button styling
    await page.getByTestId('tab-workflows').click();
    const workflowButton = page.getByTestId('primary-action create-workflow-btn');
    await expect(workflowButton).toHaveClass(/bg-green-600/);
    await expect(workflowButton).toHaveClass(/hover:bg-green-700/);
    await expect(workflowButton).toHaveClass(/min-h-\[44px\]/);
    
    // Test connections tab button styling
    await page.getByTestId('tab-connections').click();
    const connectionButton = page.getByTestId('primary-action create-connection-header-btn');
    await expect(connectionButton).toHaveClass(/bg-indigo-600/);
    await expect(connectionButton).toHaveClass(/hover:bg-indigo-700/);
    await expect(connectionButton).toHaveClass(/min-h-\[44px\]/);
    
    // Test secrets tab button styling
    await page.getByTestId('tab-secrets').click();
    const secretButton = page.getByTestId('primary-action create-secret-btn');
    await expect(secretButton).toHaveClass(/bg-indigo-600/);
    await expect(secretButton).toHaveClass(/hover:bg-indigo-700/);
    await expect(secretButton).toHaveClass(/min-h-\[44px\]/);
  });

  test('should have empty state primary actions with consistent patterns', async ({ page }) => {
    // Login to access dashboard
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.getByTestId('primary-action signin-submit').click();
    await page.waitForURL('/dashboard');
    
    // Test empty state for workflows (if no workflows exist)
    await page.getByTestId('tab-workflows').click();
    const workflowCards = page.getByTestId('workflow-card');
    if (await workflowCards.count() === 0) {
      // Should show empty state with primary action
      await expect(page.getByText('No workflows')).toBeVisible();
      await expect(page.getByTestId('primary-action create-workflow-btn')).toBeVisible();
    }
    
    // Test empty state for connections (if no connections exist)
    await page.getByTestId('tab-connections').click();
    const connectionCards = page.getByTestId('connection-card');
    if (await connectionCards.count() === 0) {
      // Should show empty state with primary action
      await expect(page.getByText('No connections')).toBeVisible();
      await expect(page.getByTestId('primary-action create-connection-header-btn')).toBeVisible();
    }
    
    // Test empty state for secrets (if no secrets exist)
    await page.getByTestId('tab-secrets').click();
    const secretCards = page.getByTestId('secret-card');
    if (await secretCards.count() === 0) {
      // Should show empty state with primary action
      await expect(page.getByText('No secrets')).toBeVisible();
      await expect(page.getByTestId('primary-action create-secret-btn')).toBeVisible();
    }
  });

  test('should not have primary-action attributes on utility buttons', async ({ page }) => {
    // Login to access dashboard
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.getByTestId('primary-action signin-submit').click();
    await page.waitForURL('/dashboard');
    
    // Test that utility buttons don't have primary-action attributes
    const utilityButtons = page.locator('button');
    for (let i = 0; i < await utilityButtons.count(); i++) {
      const button = utilityButtons.nth(i);
      const text = await button.textContent();
      const testId = await button.getAttribute('data-testid');
      
      // Skip buttons without data-testid
      if (!testId) continue;
      
      // Check if this is a utility button
      const isUtilityButton = /Cancel|Close|Back|Previous|Next|Menu|Settings|Profile|Account|Overview|Connections|Secrets|Admin|Audit|Chat|Pause|Resume|Delete|View|Refresh|Execute|Edit|Test|Explore/i.test(text || '');
      
      if (isUtilityButton) {
        // Utility buttons should NOT have primary-action in their data-testid
        expect(testId).not.toContain('primary-action');
      }
    }
  });

  test('should have accessible primary action buttons', async ({ page }) => {
    // Test login page accessibility
    await page.goto('/login');
    const signinButton = page.getByTestId('primary-action signin-submit');
    await expect(signinButton).toBeVisible();
    await expect(signinButton).toBeEnabled();
    
    // Test focus management
    await signinButton.focus();
    await expect(signinButton).toBeFocused();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(signinButton).toBeFocused();
    
    // Login and test dashboard accessibility
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await signinButton.click();
    await page.waitForURL('/dashboard');
    
    // Test workflows tab accessibility
    await page.getByTestId('tab-workflows').click();
    const workflowButton = page.getByTestId('primary-action create-workflow-btn');
    await expect(workflowButton).toBeVisible();
    await expect(workflowButton).toBeEnabled();
    await workflowButton.focus();
    await expect(workflowButton).toBeFocused();
  });
}); 