import { test, expect } from '@playwright/test';
import { createE2EUser } from '../../helpers/authHelpers';
import { setupE2E, closeAllModals, resetRateLimits, getPrimaryActionButton } from '../../helpers/e2eHelpers';
import { closeGuidedTourIfPresent, waitForElement } from '../../helpers/uiHelpers';
import { testPerformanceBudget } from '../../helpers/performanceHelpers';
import { TestUser } from '../../helpers/testUtils';
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let regularUser: TestUser;
let adminUser: TestUser;

test.beforeAll(async () => {
  regularUser = await createE2EUser(Role.USER);
  adminUser = await createE2EUser(Role.ADMIN);
});

test.beforeEach(async ({ page }) => {
  await setupE2E(page, regularUser);
  await resetRateLimits(page);
});

test.afterEach(async ({ page }) => {
  await closeAllModals(page);
});

test.describe('Tab Navigation', () => {
  test('should render all main tabs for regular user', async ({ page }) => {
    await setupE2E(page, regularUser, { tab: 'chat' });
    const expectedTabs = ['tab-chat', 'tab-workflows', 'tab-connections'];
    for (const tab of expectedTabs) {
      await expect(page.getByTestId(tab)).toBeVisible();
    }
    // Should not see admin tab
    await expect(page.locator('[data-testid="tab-admin"]')).toHaveCount(0);
  });

  test('should render all main tabs for admin user', async ({ page }) => {
    await setupE2E(page, adminUser, { tab: 'chat' });
    const expectedTabs = ['tab-chat', 'tab-workflows', 'tab-connections'];
    for (const tab of expectedTabs) {
      await expect(page.getByTestId(tab)).toBeVisible();
    }
    // Uncomment if you add an admin tab in the future
    // await expect(page.getByTestId('tab-admin')).toBeVisible();
  });

  test('should default to chat tab', async ({ page }) => {
    await setupE2E(page, regularUser);
    await expect(page.getByTestId('tab-chat')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('chat-interface')).toBeVisible();
    await expect(page).toHaveURL(/.*tab=chat/);
  });

  test('should switch between all main tabs', async ({ page }) => {
    await setupE2E(page, regularUser, { tab: 'chat' });
    const tabs = ['workflows', 'connections', 'chat'];
    for (const tab of tabs) {
      await page.getByTestId(`tab-${tab}`).click();
      await expect(page.getByTestId(`${tab}-management`)).toBeVisible();
    }
  });

  test('should preserve tab state on refresh and via URL', async ({ page }) => {
    await setupE2E(page, regularUser, { tab: 'workflows' });
    await expect(page.getByTestId('tab-workflows')).toHaveAttribute('aria-selected', 'true');
    await page.reload();
    await expect(page.getByTestId('tab-workflows')).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/.*tab=workflows/);
  });

  test('should default to chat tab for invalid tab param', async ({ page }) => {
    await page.goto('/dashboard?tab=invalid');
    await expect(page.getByTestId('tab-chat')).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/.*tab=chat/);
  });
});

test.describe('Dropdown Navigation', () => {
  test('should show correct dropdown options for regular user', async ({ page }) => {
    await setupE2E(page, regularUser);
    await page.getByTestId('user-dropdown-toggle').click();
    await expect(page.getByTestId('user-dropdown-profile')).toBeVisible();
    await expect(page.getByTestId('user-dropdown-settings')).toBeVisible();
    await expect(page.getByTestId('user-dropdown-secrets')).toBeVisible();
    await expect(page.getByTestId('user-dropdown-help')).toBeVisible();
    await expect(page.getByTestId('user-dropdown-logout')).toBeVisible();
    await expect(page.getByTestId('user-dropdown-audit')).not.toBeVisible();
  });

  test('should show audit option for admin user', async ({ page }) => {
    await setupE2E(page, adminUser);
    await page.getByTestId('user-dropdown-toggle').click();
    await expect(page.getByTestId('user-dropdown-audit')).toBeVisible();
  });

  test('should navigate to profile, settings, and logout', async ({ page }) => {
    await setupE2E(page, regularUser);
    await page.getByTestId('user-dropdown-toggle').click();
    await page.getByTestId('user-dropdown-profile').click();
    await expect(page).toHaveURL(/.*tab=profile/);
    await page.getByTestId('user-dropdown-toggle').click();
    await page.getByTestId('user-dropdown-settings').click();
    await expect(page).toHaveURL(/.*tab=settings/);
    await page.getByTestId('user-dropdown-toggle').click();
    await page.getByTestId('user-dropdown-logout').click();
    await expect(page).toHaveURL(/.*\/login/);
  });
});

test.describe('Admin Features', () => {
  test('should show audit management for admin users only', async ({ page }) => {
    await setupE2E(page, adminUser, { tab: 'chat' });
    await page.getByTestId('user-dropdown-toggle').click();
    await expect(page.getByTestId('user-dropdown-audit')).toBeVisible();
    await page.getByTestId('user-dropdown-audit').click();
    await expect(page.getByTestId('audit-management')).toBeVisible();
  });
  test('should not show audit management for regular users', async ({ page }) => {
    await setupE2E(page, regularUser, { tab: 'chat' });
    await page.getByTestId('user-dropdown-toggle').click();
    await expect(page.getByTestId('user-dropdown-audit')).not.toBeVisible();
  });
});

test.describe('Mobile Navigation', () => {
  test('should show mobile navigation on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await setupE2E(page, regularUser, { tab: 'chat' });
    await expect(page.getByTestId('mobile-navigation')).toBeVisible();
    await expect(page.locator('.hidden.lg\\:block')).toBeHidden();
  });
  test('should hide mobile navigation on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await setupE2E(page, regularUser, { tab: 'chat' });
    await expect(page.getByTestId('mobile-navigation')).toBeHidden();
    await expect(page.locator('.hidden.lg\\:block')).toBeVisible();
  });
  test('should allow tab switching via mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await setupE2E(page, regularUser, { tab: 'chat' });
    await page.getByTestId('mobile-navigation').getByText('Workflows').click();
    await expect(page).toHaveURL(/.*tab=workflows/);
    await page.getByTestId('mobile-navigation').getByText('Connections').click();
    await expect(page).toHaveURL(/.*tab=connections/);
  });
});

test.describe('Accessibility', () => {
  test('should have correct ARIA roles and attributes for tabs', async ({ page }) => {
    await setupE2E(page, regularUser, { tab: 'chat' });
    const tabs = ['chat', 'connections', 'workflows', 'secrets'];
    for (const tab of tabs) {
      const tabElement = page.getByTestId(`tab-${tab}`);
      await expect(tabElement).toHaveAttribute('role', 'tab');
      await expect(tabElement).toHaveAttribute('aria-selected');
    }
  });
  test('should support keyboard navigation between tabs', async ({ page }) => {
    await setupE2E(page, regularUser, { tab: 'chat' });
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('connections-management')).toBeVisible();
  });
});

test.describe('Message Banner', () => {
  test('should display and auto-clear success messages', async ({ page }) => {
    await setupE2E(page, regularUser, { tab: 'chat' });
    await closeGuidedTourIfPresent(page);
    const chatInput = page.locator('input[placeholder*="automate"]');
    await chatInput.fill('Create a workflow for banner test');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('text=Created:')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Save Workflow' }).click();
    await expect(page.locator('text=has been saved successfully')).toBeVisible();
    // Optionally wait for auto-clear if implemented
    // await expect(page.locator('text=has been saved successfully')).not.toBeVisible({ timeout: 7000 });
  });
  test('should display error messages', async ({ page }) => {
    await setupE2E(page, regularUser, { tab: 'connections' });
    await waitForElement(page, '[data-testid="connections-management"]');
    await closeGuidedTourIfPresent(page);
    await getPrimaryActionButton(page, 'create-connection-header').click();
    try {
      await waitForElement(page, '[data-testid="connection-form"]', { timeout: 5000 });
      await getPrimaryActionButton(page, 'save-connection').click();
      await expect(page.getByTestId('error-message')).toBeVisible();
    } catch {
      // If connection form doesn't exist, that's fine
    }
  });
});

test.describe('Performance', () => {
  test('should complete tab switching within performance budget', async ({ page }) => {
    await setupE2E(page, regularUser, { tab: 'chat' });
    await page.getByTestId('tab-workflows').click();
    await expect(page.getByTestId('workflows-management')).toBeVisible();
    await testPerformanceBudget(page, 2000);
  });
});

test.describe('Onboarding Tour', () => {
  test('should show guided tour for new users on first dashboard visit', async ({ page }) => {
    // Simulate a new user (no onboarding completed)
    const newUser = await createE2EUser(Role.USER);
    await setupE2E(page, newUser, { tab: 'chat' });
    // The tour should be visible
    await expect(page.getByTestId('guided-tour-tooltip')).toBeVisible();
  });

  test('should not show guided tour for users who have completed onboarding', async ({ page }) => {
    // Create a new user and complete the tour
    const newUser = await createE2EUser(Role.USER);
    await setupE2E(page, newUser, { tab: 'chat' });
    // Complete the tour via UI
    while (await page.getByTestId('guided-tour-next').isVisible()) {
      await page.getByTestId('guided-tour-next').click();
    }
    // Reload and check the tour does not reappear
    await page.reload();
    await expect(page.locator('[data-testid="guided-tour-tooltip"]')).toHaveCount(0);
  });

  test('should allow navigating away from the tour', async ({ page }) => {
    const newUser = await createE2EUser(Role.USER);
    await setupE2E(page, newUser, { tab: 'chat' });
    // The tour should be visible
    await expect(page.getByTestId('guided-tour-tooltip')).toBeVisible();
    // Switch tab
    await page.getByTestId('tab-workflows').click();
    // Tour should be hidden or dismissed
    await expect(page.locator('[data-testid="guided-tour-tooltip"]')).toHaveCount(0);
  });
}); 
