// E2E-specific helpers for APIQ project
// See docs/e2e-helpers-refactor-plan.md for details

import { Page, Locator, expect } from '@playwright/test';
import { TestUser } from './testUtils';
import { UXComplianceHelper } from './uxCompliance';
import { closeGuidedTourIfPresent } from './uiHelpers';

export interface E2ESetupOptions {
  tab?: string;
  section?: string;
  validateUX?: boolean;
  skipCloseGuidedTour?: boolean;
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
  
  // Handle guided tour timing - it appears 1 second after dashboard load
  // Only skip if explicitly requested (for tests that need to test guided tour)
  if (!options.skipCloseGuidedTour) {
    console.log('🔍 E2E DEBUG: Checking for guided tour...');
    
    // Wait for guided tour to potentially appear (reduced timeout)
    await page.waitForTimeout(200);
    
    // Check if guided tour is visible
    const guidedTourOverlay = page.locator('[data-testid="guided-tour-overlay"]');
    const isTourVisible = await guidedTourOverlay.isVisible().catch(() => false);
    console.log('🔍 E2E DEBUG: Guided tour visible after 0.5s:', isTourVisible);
    
    if (isTourVisible) {
      console.log('🔍 E2E DEBUG: Closing guided tour...');
      await closeGuidedTourIfPresent(page);
      console.log('🔍 E2E DEBUG: Guided tour closed');
    }
    
    // Wait a bit more to ensure tour is fully closed and doesn't reappear
    await page.waitForTimeout(100);
    
    // Final check
    const isTourStillVisible = await guidedTourOverlay.isVisible().catch(() => false);
    console.log('🔍 E2E DEBUG: Guided tour still visible after close:', isTourStillVisible);
  }
  
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
  console.log('🔍 E2E DEBUG: Starting login process for user:', user.email);
  
  // Clear any existing authentication state first
  await page.context().clearCookies();
  
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  // Clear localStorage after page has loaded
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  console.log('🔍 E2E DEBUG: Filling login form');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  
  const loginButton = getPrimaryActionButton(page, 'signin-btn');
  console.log('🔍 E2E DEBUG: Looking for login button with testid: primary-action signin-btn');
  
  await expect(loginButton).toBeEnabled();
  console.log('🔍 E2E DEBUG: Login button is enabled, clicking...');
  
  // Wait for the login API request to complete
  const loginPromise = page.waitForResponse(
    response => response.url().includes('/api/auth/login') && response.status() === 200
  );
  
  await loginButton.click();
  
  // Wait for the login API response
  await loginPromise;
  
  console.log('🔍 E2E DEBUG: Waiting for redirect to dashboard...');
  
  try {
    // Wait for redirect to dashboard with extended timeout for signup redirects
    await page.waitForURL(/.*dashboard/, { timeout: 20000 });
    console.log('🔍 E2E DEBUG: Successfully redirected to dashboard');
  } catch (error) {
    console.error('🔍 E2E DEBUG: Login failed - current URL:', page.url());
    
    // Check for error messages on the page
    const errorElement = page.locator('[role="alert"], .bg-red-50, .text-red-800');
    if (await errorElement.isVisible().catch(() => false)) {
      const errorText = await errorElement.textContent();
      console.error('🔍 E2E DEBUG: Error message found:', errorText);
    }
    
    // Check if we're still on login page
    if (page.url().includes('/login')) {
      console.error('🔍 E2E DEBUG: Still on login page - login may have failed');
    }
    
    throw error;
  }
  
  // Wait for dashboard to be fully loaded
  // Note: Profile and settings tabs are not in the main tab navigation, so we need to check differently
  if (options.tab === 'profile' || options.tab === 'settings') {
    // For profile/settings tabs, just wait for the dashboard to load
    await page.waitForSelector('[data-testid="user-dropdown-toggle"]', { timeout: 20000 });
    console.log('🔍 E2E DEBUG: Dashboard loaded (profile/settings mode)');
  } else {
    // For main tabs, wait for tab navigation to be visible
    await page.waitForSelector('[data-testid^="tab-"]', { timeout: 20000 });
    console.log('🔍 E2E DEBUG: Dashboard tabs loaded');
  }
  
  if (options.tab) {
    // Handle special cases for tabs that are not in main navigation
    if (options.tab === 'settings') {
      await navigateToSettings(page);
    } else if (options.tab === 'profile') {
      await navigateToProfile(page);
    } else {
      // Wait for the specific tab to be visible before clicking
      await page.waitForSelector(`[data-testid="tab-${options.tab}"]`, { timeout: 10000 });
      await page.click(`[data-testid="tab-${options.tab}"]`);
      await page.waitForLoadState('networkidle');
    }
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
 * Navigate to a user dropdown item by test ID, with retries for async menu rendering
 */
export const navigateToUserDropdownItem = async (page: Page, item: string): Promise<void> => {
  const maxAttempts = 3;
  let attempt = 0;
  let success = false;
  while (attempt < maxAttempts && !success) {
    attempt++;
    // Wait for dropdown toggle to be available
    await page.waitForSelector('[data-testid="user-dropdown-toggle"]', { timeout: 10000 });
    await page.getByTestId('user-dropdown-toggle').click();
    await page.waitForTimeout(150); // Small delay for menu animation
    // Wait for the specific dropdown item to be visible and attached
    const itemLocator = page.getByTestId(`user-dropdown-${item}`);
    try {
      await itemLocator.waitFor({ state: 'visible', timeout: 2000 });
      await itemLocator.waitFor({ state: 'attached', timeout: 2000 });
      await itemLocator.click();
      success = true;
    } catch (e) {
      // If not visible, try again
      if (attempt === maxAttempts) throw e;
      await page.waitForTimeout(200);
    }
  }
};

/**
 * Navigate to settings through user dropdown
 */
export const navigateToSettings = async (page: Page): Promise<void> => {
  console.log('🔍 E2E DEBUG: Navigating to settings via user dropdown');
  
  // Open user dropdown and click settings
  await navigateToUserDropdownItem(page, 'settings');
  
  // Wait for URL to change to settings tab
  await page.waitForURL(/.*tab=settings/, { timeout: 25000 });
  console.log('🔍 E2E DEBUG: URL changed to settings tab');
  
  // Wait for settings tab content to load (accounting for Suspense)
  // Try multiple selectors to handle different loading states
  await Promise.race([
    page.waitForSelector('[data-testid="settings-tab"]', { timeout: 20000 }),
    page.waitForSelector('[data-testid="settings-sentinel"]', { timeout: 20000 }),
  ]);
  console.log('🔍 E2E DEBUG: Settings tab content loaded');
  
  // Wait for any loading spinners to disappear
  await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 }).catch(() => {});
  
  // Wait for settings content to be fully loaded
  await page.waitForLoadState('networkidle');
  
  console.log('🔍 E2E DEBUG: Successfully navigated to settings');
};

/**
 * Navigate to profile page through user dropdown
 * 
 * Note: Profile is accessed via user dropdown, not as a main navigation tab.
 * This navigates to /dashboard?tab=profile which renders the ProfileTab component.
 */
export const navigateToProfile = async (page: Page): Promise<void> => {
  console.log('🔍 E2E DEBUG: Navigating to profile page via user dropdown');
  
  // Open user dropdown and click profile
  await navigateToUserDropdownItem(page, 'profile');

  // Wait for URL to change to profile page
  await page.waitForURL(/.*tab=profile/, { timeout: 25000 });
  console.log('🔍 E2E DEBUG: URL changed to profile page');

  // Wait for the profile page content to load
  console.log('🔍 E2E DEBUG: Waiting for profile page content to load...');
  
  // Wait for the profile page element to be present and visible
  await page.waitForSelector('[data-testid="profile-tab"]', { timeout: 20000 });
  console.log('🔍 E2E DEBUG: Profile page element found');
  
  // Wait for the profile content to be visible
  await page.waitForSelector('[data-testid="profile-tab"]', { state: 'visible', timeout: 10000 });
  console.log('🔍 E2E DEBUG: Profile page is now visible');
  
  // Wait for the specific profile content to be visible
  await page.waitForSelector('h3:has-text("Profile Settings")', { timeout: 10000 });
  console.log('🔍 E2E DEBUG: Profile page content loaded successfully');
};

/**
 * Get primary action button by action name
 */
export const getPrimaryActionButton = (
  page: Page,
  action: string
): Locator => {
  return page.getByTestId(`primary-action ${action}`);
};

/**
 * Robust keyboard navigation helper that ensures proper focus management
 */
export const navigateWithKeyboard = async (page: Page, selectors: string[]): Promise<void> => {
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Focus the first element explicitly to ensure proper focus management
  const firstSelector = selectors[0];
  await page.locator(firstSelector).focus();
  
  // Verify the first element is focused
  await expect(page.locator(firstSelector)).toBeFocused();
  
  // Navigate through each element with Tab
  for (let i = 1; i < selectors.length; i++) {
    await page.keyboard.press('Tab');
    await expect(page.locator(selectors[i])).toBeFocused();
  }
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