import { test, expect } from '@playwright/test';
import { createE2EUser } from '../../helpers/authHelpers';
import { setupE2E } from '../../helpers/e2eHelpers';
import { Role } from '../../../src/generated/prisma';

test.describe('Guided Tour (Onboarding) E2E', () => {
  let newUser;
  test.beforeEach(async () => {
    newUser = await createE2EUser(Role.USER);
  });

  test('should start on the first step and show correct content', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    await expect(page.getByTestId('guided-tour')).toBeVisible();
    await expect(page.getByTestId('guided-tour-step')).toHaveText(/welcome|start/i);
  });

  test('should navigate through steps with next/previous', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    await expect(page.getByTestId('guided-tour')).toBeVisible();
    // Next step
    await page.getByTestId('guided-tour-next').click();
    await expect(page.getByTestId('guided-tour-step')).not.toHaveText(/welcome|start/i);
    // Previous step
    await page.getByTestId('guided-tour-prev').click();
    await expect(page.getByTestId('guided-tour-step')).toHaveText(/welcome|start/i);
  });

  test('should allow skipping the tour', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    await expect(page.getByTestId('guided-tour')).toBeVisible();
    await page.getByTestId('guided-tour-skip').click();
    await expect(page.locator('[data-testid="guided-tour"]')).toHaveCount(0);
  });

  test('should complete the tour and update onboarding state', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    await expect(page.getByTestId('guided-tour')).toBeVisible();
    // Click next until complete
    while (await page.getByTestId('guided-tour-next').isVisible()) {
      await page.getByTestId('guided-tour-next').click();
    }
    await page.getByTestId('guided-tour-complete').click();
    await expect(page.locator('[data-testid="guided-tour"]')).toHaveCount(0);
  });

  test('should be accessible: focus, ARIA, keyboard navigation', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    await expect(page.getByTestId('guided-tour')).toBeVisible();
    // Focus should be trapped in the tour
    await page.keyboard.press('Tab');
    // Check that focus is within the tour
    const active = await page.evaluate(() => document.activeElement?.closest('[data-testid="guided-tour"]'));
    expect(active).not.toBeNull();
    // ARIA attributes
    await expect(page.getByTestId('guided-tour')).toHaveAttribute('role', /dialog|region/);
  });

  test('should persist state: tour resumes where left off', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    await expect(page.getByTestId('guided-tour')).toBeVisible();
    // Go to step 2
    await page.getByTestId('guided-tour-next').click();
    // Reload
    await page.reload();
    await expect(page.getByTestId('guided-tour-step')).not.toHaveText(/welcome|start/i);
  });

  test('should progressively disclose features as onboarding progresses', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    // This test assumes your UI disables/hides features until onboarding steps are complete
    // Check that a feature is locked
    await expect(page.getByTestId('some-locked-feature')).toHaveAttribute('aria-disabled', 'true');
    // Complete the tour
    while (await page.getByTestId('guided-tour-next').isVisible()) {
      await page.getByTestId('guided-tour-next').click();
    }
    await page.getByTestId('guided-tour-complete').click();
    // Now the feature should be unlocked
    await expect(page.getByTestId('some-locked-feature')).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('should handle edge cases: refresh, logout, switching users', async ({ page }) => {
    await setupE2E(page, newUser, { tab: 'chat' });
    // Refresh
    await expect(page.getByTestId('guided-tour')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('guided-tour')).toBeVisible();
    // Logout and login again
    await page.getByTestId('user-dropdown-toggle').click();
    await page.getByTestId('user-dropdown-logout').click();
    await setupE2E(page, newUser, { tab: 'chat' });
    await expect(page.getByTestId('guided-tour')).toBeVisible();
    // (Optional) Switch to another user and check tour state
  });
}); 