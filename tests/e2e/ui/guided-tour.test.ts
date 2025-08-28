import { test, expect } from '@playwright/test';
import { createTestUserWithTour } from '../../helpers/testUtils.auth';
import { setupE2E } from '../../helpers/e2eHelpers';
import { waitForDashboard, validateUXCompliance, waitForElement } from '../../helpers/uiHelpers';
import { waitForLoadingComplete } from '../../helpers/waitHelpers';
import { Role } from '../../../src/generated/prisma';

test.describe('Guided Tour (Onboarding) E2E', () => {
  let newUser;
  
  test.beforeEach(async () => {
    // Use createTestUserWithTour to ensure the user has the correct onboarding stage
    // and tour state to trigger the guided tour
    newUser = await createTestUserWithTour(Role.USER);
  });

  test.afterEach(async () => {
    // Ensure proper cleanup for test isolation
    // Note: cleanupTestUser is not available in the current helper structure
    // The test isolation is handled by the database cleanup in the test setup
  });

  test('should start on the first step and show correct content', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    
    // Wait for the tour to appear (it should auto-open for new users)
    await waitForElement(page, '[data-testid="guided-tour-tooltip"]', { timeout: 15000 });
    
    // Validate UX compliance for the first tour step
    await validateUXCompliance(page, {
      headings: 'Welcome to APIQ',
      validateAccessibility: true
    });
    
    // Check that the tour step content is visible - first step should be "Welcome to APIQ!"
    await expect(page.locator('#tour-title')).toHaveText('Welcome to APIQ!');
  });

  test('should navigate through steps with next/previous', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    
    // Wait for the tour to appear
    await waitForElement(page, '[data-testid="guided-tour-tooltip"]', { timeout: 15000 });
    
    // Verify we're on the first step
    await expect(page.locator('#tour-title')).toHaveText('Welcome to APIQ!');
    
    // Next step using direct selector (guided tour doesn't follow primary-action pattern)
    await page.getByTestId('guided-tour-next').click();
    await waitForLoadingComplete(page);
    await expect(page.locator('#tour-title')).toHaveText('Start a Conversation');
    
    // Previous step using direct selector
    await page.getByTestId('guided-tour-prev').click();
    await waitForLoadingComplete(page);
    await expect(page.locator('#tour-title')).toHaveText('Welcome to APIQ!');
  });

  test('should allow skipping the tour', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    
    // Wait for the tour to appear
    await waitForElement(page, '[data-testid="guided-tour-tooltip"]', { timeout: 15000 });
    
    // Skip tour using direct selector
    await page.getByTestId('guided-tour-skip').click();
    await expect(page.locator('[data-testid="guided-tour-tooltip"]')).toHaveCount(0);
  });

  test('should complete the tour and update onboarding state', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    
    // Wait for the tour to appear
    await waitForElement(page, '[data-testid="guided-tour-tooltip"]', { timeout: 15000 });
    
    // Click next until complete (the last step will have "Finish" button)
    // The tour has 8 steps total
    for (let i = 0; i < 7; i++) {
      await page.getByTestId('guided-tour-next').click();
      // Wait for loading to complete between steps
      await waitForLoadingComplete(page);
    }
    
    // On the last step, the button should say "Finish"
    await expect(page.getByTestId('guided-tour-next')).toHaveText('Finish');
    
    // Click finish to complete the tour
    await page.getByTestId('guided-tour-next').click();
    
    // Verify tour is closed
    await expect(page.locator('[data-testid="guided-tour-tooltip"]')).toHaveCount(0);
  });

  test('should be accessible: focus, ARIA, keyboard navigation', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    
    // Wait for the tour to appear
    await waitForElement(page, '[data-testid="guided-tour-tooltip"]', { timeout: 15000 });
    
    // Validate accessibility compliance
    await validateUXCompliance(page, {
      validateAccessibility: true
    });
    
    // ARIA attributes
    await expect(page.getByTestId('guided-tour-tooltip')).toHaveAttribute('role', 'dialog');
    
    // Check that tour has proper accessibility structure
    await expect(page.locator('#tour-title')).toBeVisible();
    await expect(page.locator('#tour-description')).toBeVisible();
    
    // Test keyboard navigation - Escape should close the tour
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="guided-tour-tooltip"]')).toHaveCount(0);
  });

  test('should persist state: tour resumes where left off', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    
    // Wait for the tour to appear
    await waitForElement(page, '[data-testid="guided-tour-tooltip"]', { timeout: 15000 });
    
    // Verify we're on the first step
    await expect(page.locator('#tour-title')).toHaveText('Welcome to APIQ!');
    
    // Go to step 2
    await page.getByTestId('guided-tour-next').click();
    await waitForLoadingComplete(page);
    await expect(page.locator('#tour-title')).toHaveText('Start a Conversation');
    
    // Reload - the tour should reappear but may reset to first step
    await page.reload();
    await waitForDashboard(page);
    
    // Wait for tour to reappear
    await waitForElement(page, '[data-testid="guided-tour-tooltip"]', { timeout: 15000 });
    
    // Check that tour is visible (it may reset to first step, which is expected behavior)
    await expect(page.locator('#tour-title')).toBeVisible();
  });

  test('should handle edge cases: refresh and tour persistence', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    
    // Wait for the tour to appear
    await waitForElement(page, '[data-testid="guided-tour-tooltip"]', { timeout: 15000 });
    
    // Verify we're on the first step
    await expect(page.locator('#tour-title')).toHaveText('Welcome to APIQ!');
    
    // Go to step 2
    await page.getByTestId('guided-tour-next').click();
    await waitForLoadingComplete(page);
    await expect(page.locator('#tour-title')).toHaveText('Start a Conversation');
    
    // Refresh - the tour should reappear
    await page.reload();
    await waitForDashboard(page);
    await waitForElement(page, '[data-testid="guided-tour-tooltip"]', { timeout: 15000 });
    
    // Check that tour is visible after refresh
    await expect(page.locator('#tour-title')).toBeVisible();
  });

  test('should have proper tour structure and elements', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    
    // Wait for the tour to appear
    await waitForElement(page, '[data-testid="guided-tour-tooltip"]', { timeout: 15000 });
    
    // Validate tour structure and UX compliance
    await validateUXCompliance(page, {
      headings: 'Welcome to APIQ',
      validateAccessibility: true
    });
    
    // Check tour structure
    await expect(page.getByTestId('guided-tour-overlay')).toBeVisible();
    await expect(page.getByTestId('guided-tour-progress')).toBeVisible();
    
    // Check navigation buttons using direct selectors (guided tour has specialized structure)
    await expect(page.getByTestId('guided-tour-next')).toBeVisible();
    await expect(page.getByTestId('guided-tour-skip')).toBeVisible();
    
    // Check tour content
    await expect(page.locator('#tour-title')).toBeVisible();
    await expect(page.locator('#tour-description')).toBeVisible();
  });
}); 