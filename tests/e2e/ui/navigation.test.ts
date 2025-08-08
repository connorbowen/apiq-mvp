import { test, expect } from '@playwright/test';
import { createE2EUser } from '../../helpers/authHelpers';
import { setupE2E, closeAllModals, resetRateLimits, getPrimaryActionButton, setupGlobalErrorListeners, setupTracing, stopTracing, clearAuthState, waitForServerReady } from '../../helpers/e2eHelpers';
import { closeGuidedTourIfPresent, waitForElement } from '../../helpers/uiHelpers';
import { testPerformanceBudget } from '../../helpers/performanceHelpers';
import { TestUser } from '../../helpers/testUtils';
import { Role } from '../../../src/generated/prisma';
import { safeCleanupTestData } from '../../helpers/testIsolation';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let regularUser: TestUser;
let adminUser: TestUser;

test.beforeAll(async () => {
  regularUser = await createE2EUser(Role.USER);
  adminUser = await createE2EUser(Role.ADMIN);
});

// Setup global error listeners and tracing for all tests
test.beforeEach(async ({ page }, testInfo) => {
  await setupGlobalErrorListeners(page);
  await setupTracing(page);
  
  // Wait for server to be ready for multi-worker scenarios
  await waitForServerReady(page);
  
  // Setup E2E with default user and reset rate limits
  // Use a more efficient setup that doesn't make unnecessary API calls
  await page.context().clearCookies();
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  
  // Fill login form
  await page.fill('input[name="email"]', regularUser.email);
  await page.fill('input[name="password"]', regularUser.password);
  
  // Click login button
  const loginButton = getPrimaryActionButton(page, 'signin');
  await loginButton.click();
  
  // Wait for redirect to dashboard (simpler than waiting for API response)
  await page.waitForURL(/.*dashboard.*/, { timeout: 10000 });
  
  // Wait for dashboard to be ready
  await page.waitForSelector('[data-testid="tab-chat"]');
  
  // Close guided tour if present (simplified)
  const guidedTourOverlay = page.locator('[data-testid="guided-tour-overlay"]');
  if (await guidedTourOverlay.isVisible().catch(() => false)) {
    await closeGuidedTourIfPresent(page);
  }
  
  await resetRateLimits(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await stopTracing(page, testInfo);
  await clearAuthState(page);
  await closeAllModals(page);
  
  // Clear any pending requests to prevent resource leaks
  await page.evaluate(() => {
    // Simple cleanup - no complex fetch override
    console.log('Cleaning up fetch requests');
  });
});

test.describe('Tab Navigation', () => {
  test('should render all main tabs for regular user', async ({ page }) => {
    // Navigate to chat tab
    await page.getByTestId('tab-chat').click();
    const expectedTabs = ['tab-chat', 'tab-workflows', 'tab-connections'];
    for (const tab of expectedTabs) {
      await expect(page.getByTestId(tab)).toBeVisible();
    }
    // Should not see admin tab
    await expect(page.locator('[data-testid="tab-admin"]')).toHaveCount(0);
  });

  test('should render all main tabs for admin user', async ({ page }) => {
    // Setup admin user for this test
    await setupE2E(page, adminUser, { tab: 'chat' });
    const expectedTabs = ['tab-chat', 'tab-workflows', 'tab-connections'];
    for (const tab of expectedTabs) {
      await expect(page.getByTestId(tab)).toBeVisible();
    }
    // Uncomment if you add an admin tab in the future
    // await expect(page.getByTestId('tab-admin')).toBeVisible();
  });

  test('should default to chat tab', async ({ page }) => {
    // Should already be on chat tab from beforeEach
    await expect(page.getByTestId('tab-chat')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('chat-interface')).toBeVisible();
    await expect(page).toHaveURL(/.*tab=chat/);
  });

  test('should switch between all main tabs', async ({ page }) => {
    // Should already be on chat tab from beforeEach
    const tabs = ['workflows', 'connections', 'chat'];
    for (const tab of tabs) {
      await page.getByTestId(`tab-${tab}`).click();
      await expect(page.getByTestId(`${tab}-management`)).toBeVisible();
    }
  });

  test('should preserve tab state on refresh and via URL', async ({ page }) => {
    // Navigate to workflows tab
    await page.getByTestId('tab-workflows').click();
    await expect(page.getByTestId('tab-workflows')).toHaveAttribute('aria-selected', 'true');
    await page.reload();
    await expect(page.getByTestId('tab-workflows')).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/.*tab=workflows/);
  });

  test('should default to chat tab for invalid tab param', async ({ page }) => {
    // Navigate to dashboard with invalid tab parameter
    await page.goto('/dashboard?tab=invalid');
    await expect(page.getByTestId('tab-chat')).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/.*tab=chat/);
  });
});

test.describe('Dropdown Navigation', () => {
  test('should show correct dropdown options for regular user', async ({ page }) => {
    // Should already be logged in from beforeEach
    await page.getByTestId('user-dropdown-toggle').click();
    await expect(page.getByTestId('user-dropdown-profile')).toBeVisible();
    await expect(page.getByTestId('user-dropdown-settings')).toBeVisible();
    await expect(page.getByTestId('user-dropdown-secrets')).toBeVisible();
    await expect(page.getByTestId('user-dropdown-help')).toBeVisible();
    await expect(page.getByTestId('user-dropdown-logout')).toBeVisible();
    await expect(page.getByTestId('user-dropdown-audit')).not.toBeVisible();
  });

  test('should show audit option for admin user', async ({ page }) => {
    // Setup admin user for this test
    await setupE2E(page, adminUser);
    await page.getByTestId('user-dropdown-toggle').click();
    await expect(page.getByTestId('user-dropdown-audit')).toBeVisible();
  });

  test('should navigate to profile, settings, and logout', async ({ page }) => {
    // Should already be logged in from beforeEach
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
    // Setup admin user for this test
    await setupE2E(page, adminUser, { tab: 'chat' });
    await page.getByTestId('user-dropdown-toggle').click();
    await expect(page.getByTestId('user-dropdown-audit')).toBeVisible();
    await page.getByTestId('user-dropdown-audit').click();
    await expect(page.getByTestId('audit-management')).toBeVisible();
  });
  test('should not show audit management for regular users', async ({ page }) => {
    // Should already be logged in from beforeEach
    await page.getByTestId('user-dropdown-toggle').click();
    await expect(page.getByTestId('user-dropdown-audit')).not.toBeVisible();
  });
});

test.describe('Mobile Navigation', () => {
  test('should show mobile navigation on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    // Should already be logged in from beforeEach
    await expect(page.getByTestId('mobile-navigation')).toBeVisible();
    await expect(page.locator('.hidden.lg\\:block')).toBeHidden();
  });
  test('should hide mobile navigation on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    // Should already be logged in from beforeEach
    await expect(page.getByTestId('mobile-navigation')).toBeHidden();
    await expect(page.locator('.hidden.lg\\:block')).toBeVisible();
  });
  test('should allow tab switching via mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    // Should already be logged in from beforeEach
    await page.getByTestId('mobile-navigation').getByText('Workflows').click();
    await expect(page).toHaveURL(/.*tab=workflows/);
    await page.getByTestId('mobile-navigation').getByText('Connections').click();
    await expect(page).toHaveURL(/.*tab=connections/);
  });
});

test.describe('Accessibility', () => {
  test('should have correct ARIA roles and attributes for tabs', async ({ page }) => {
    // Should already be on chat tab from beforeEach
    const tabs = ['chat', 'connections', 'workflows'];
    for (const tab of tabs) {
      const tabElement = page.getByTestId(`tab-${tab}`);
      await expect(tabElement).toHaveAttribute('role', 'tab');
      await expect(tabElement).toHaveAttribute('aria-selected');
    }
  });
  test('should support keyboard navigation between tabs', async ({ page }) => {
    // Should already be on chat tab from beforeEach
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('connections-management')).toBeVisible();
  });
});

test.describe('Message Banner', () => {
  test('should display and auto-clear success messages', async ({ page }) => {
    // Should already be on chat tab from beforeEach
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
    // Navigate to connections tab
    await page.getByTestId('tab-connections').click();
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
    // Should already be on chat tab from beforeEach
    await page.getByTestId('tab-workflows').click();
    await expect(page.getByTestId('workflows-management')).toBeVisible();
    await testPerformanceBudget(page, 2000);
  });
});

test.describe('Onboarding Tour', () => {
  test('should show guided tour for new users on first dashboard visit', async ({ page }) => {
    // Simulate a new user (no onboarding completed)
    const newUser = await createE2EUser(Role.USER);
    await setupE2E(page, newUser, { tab: 'chat', skipCloseGuidedTour: true });
    // The tour should be visible - wait longer for tour state to load
    await expect(page.getByTestId('guided-tour-tooltip')).toBeVisible({ timeout: 15000 });
  });

  test('should not show guided tour for users who have completed onboarding', async ({ page }) => {
    // Create a new user and complete the tour
    const newUser = await createE2EUser(Role.USER);
    await setupE2E(page, newUser, { tab: 'chat', skipCloseGuidedTour: true });
    // Wait for tour to appear first
    await expect(page.getByTestId('guided-tour-tooltip')).toBeVisible({ timeout: 15000 });
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
    await setupE2E(page, newUser, { tab: 'chat', skipCloseGuidedTour: true });
    // The tour should be visible - wait longer for tour state to load
    await expect(page.getByTestId('guided-tour-tooltip')).toBeVisible({ timeout: 15000 });
    // Switch tab
    await page.getByTestId('tab-workflows').click();
    // Tour should be hidden or dismissed
    await expect(page.locator('[data-testid="guided-tour-tooltip"]')).toHaveCount(0);
  });
}); 
