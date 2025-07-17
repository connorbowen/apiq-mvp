// E2E-specific helpers for APIQ project
// See docs/e2e-helpers-refactor-plan.md for details

import { Page, Locator, expect } from '@playwright/test';
import { TestUser } from './testUtils';
import { UXComplianceHelper } from './uxCompliance';

export interface E2ESetupOptions {
  tab?: string;
  section?: string;
  validateUX?: boolean;
}

export interface TestArtifacts {
  userIds?: string[];
  connectionIds?: string[];
  workflowIds?: string[];
  secretIds?: string[];
}

/**
 * Complete E2E setup with login, navigation, and optional UX validation
 */
export const setupE2E = async (
  page: Page,
  user: TestUser,
  options: E2ESetupOptions = {}
): Promise<void> => {
  await closeAllModals(page);
  await loginAndNavigate(page, user, options);
  if (options.validateUX) {
    const uxHelper = new UXComplianceHelper(page);
    await uxHelper.validatePageTitle('APIQ');
    await uxHelper.validateHeadingHierarchy(['Dashboard']);
    await uxHelper.validateFormAccessibility();
  }
};

/**
 * Login and navigate to a specific tab/section
 */
export const loginAndNavigate = async (
  page: Page,
  user: TestUser,
  options: E2ESetupOptions = {}
): Promise<void> => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  const loginButton = getPrimaryActionButton(page, 'signin');
  await expect(loginButton).toBeEnabled();
  await loginButton.click();
  await expect(page).toHaveURL(/.*dashboard/);
  
  // Wait for dashboard to be fully loaded - check for any tab to confirm dashboard loaded
  await page.waitForSelector('[data-testid^="tab-"]', { timeout: 10000 });
  
  if (options.tab) {
    // Wait for the specific tab to be visible before clicking
    await page.waitForSelector(`[data-testid="tab-${options.tab}"]`, { timeout: 10000 });
    await page.click(`[data-testid="tab-${options.tab}"]`);
    await page.waitForLoadState('networkidle');
  }
  if (options.section) {
    // Handle section navigation within tabs
    if (options.section === 'connections') {
      // Connections are in the Settings tab, so we need to navigate there first
      if (options.tab !== 'settings') {
        await page.waitForSelector('[data-testid="tab-settings"]', { timeout: 10000 });
        await page.click('[data-testid="tab-settings"]');
        await page.waitForLoadState('networkidle');
      }
      // The connections section is the default in Settings tab, so no additional click needed
    } else if (options.section === 'secrets') {
      // Secrets are also in the Settings tab
      if (options.tab !== 'settings') {
        await page.waitForSelector('[data-testid="tab-settings"]', { timeout: 10000 });
        await page.click('[data-testid="tab-settings"]');
        await page.waitForLoadState('networkidle');
      }
      // Click on the Secrets section button (it's a text button, not a data-testid)
      await page.click('button:has-text("Secrets")');
      await page.waitForLoadState('networkidle');
    } else {
      // For other sections, try the original pattern
      try {
        await page.click(`[data-testid="${options.section}-section"]`);
        await page.waitForLoadState('networkidle');
      } catch (error) {
        console.warn(`Section ${options.section} not found with data-testid, continuing...`);
      }
    }
  }
};

/**
 * Close all open modals to prevent test isolation issues
 */
export const closeAllModals = async (page: Page): Promise<void> => {
  const modalOverlay = page.locator('.fixed.inset-0.bg-gray-600.bg-opacity-50');
  if (await modalOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
    const closeButton = page.locator('button[aria-label="Close modal"]');
    const cancelButton = page.locator('button:has-text("Cancel")');
    if (await closeButton.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeButton.click();
    } else if (await cancelButton.isVisible({ timeout: 500 }).catch(() => false)) {
      await cancelButton.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await modalOverlay.isHidden({ timeout: 2000 }).catch(() => {});
  }
};

/**
 * Reset rate limits for test isolation (client and server)
 */
export const resetRateLimits = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    (window as any).lastConnectionSubmission = 0;
    (window as any).connectionSubmissionCount = 0;
    (window as any).lastRateLimitReset = 0;
  });
  try {
    await page.request.post('/api/test/reset-rate-limits');
  } catch (error) {
    // Ignore if endpoint doesn't exist in non-test environment
  }
};

/**
 * Get primary action button by action name
 */
export const getPrimaryActionButton = (
  page: Page,
  action: string
): Locator => {
  return page.getByTestId(`primary-action ${action}-btn`);
};

/**
 * Clean up test artifacts (users, connections, workflows, secrets)
 */
export const cleanupE2E = async (
  page: Page,
  artifacts: TestArtifacts
): Promise<void> => {
  // This function should call backend cleanup endpoints or use direct DB access in test env
  // For now, just a placeholder for integration with dataHelpers
}; 