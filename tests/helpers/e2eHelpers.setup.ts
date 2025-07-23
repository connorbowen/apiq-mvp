// E2E setup helpers - extracted from e2eHelpers.ts
// Focused on login, navigation, and initial setup

import { Page, Locator, expect } from '@playwright/test';
import { TestUser } from './testUtils.auth';
import { UXComplianceHelper } from './uxCompliance';
import { closeGuidedTourIfPresent } from './uiHelpers';
import { getPrimaryActionButton, navigateToSettings, navigateToProfile } from './e2eHelpers.navigation';

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
  await page.waitForLoadState('domcontentloaded');
  
  console.log('🔍 E2E DEBUG: Filling login form');
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.waitForSelector('input[name="password"]', { timeout: 10000 });
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  
  const loginButton = getPrimaryActionButton(page, 'signin');
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
    // Check if we're on mobile viewport (width < 768px)
    const viewport = page.viewportSize();
    const isMobile = viewport && viewport.width < 768;
    
    if (isMobile) {
      // On mobile, wait for mobile navigation instead of desktop tabs
      await page.waitForSelector('[data-testid="mobile-navigation"]', { timeout: 20000 });
      console.log('🔍 E2E DEBUG: Mobile navigation loaded');
    } else {
      // On desktop, wait for desktop tabs
      await page.waitForSelector('[data-testid^="tab-"]', { timeout: 20000 });
      console.log('🔍 E2E DEBUG: Dashboard tabs loaded');
    }
  }
  
  if (options.tab) {
    // Handle special cases for tabs that are not in main navigation
    if (options.tab === 'settings') {
      await navigateToSettings(page);
    } else if (options.tab === 'profile') {
      await navigateToProfile(page);
    } else {
      // Wait for and click the specified tab
      const viewport = page.viewportSize();
      const isMobile = viewport && viewport.width < 768;
      
      if (isMobile) {
        // On mobile, use mobile navigation
        await page.waitForSelector(`[data-testid="mobile-tab-${options.tab}"]`, { timeout: 10000 });
        await page.click(`[data-testid="mobile-tab-${options.tab}"]`);
      } else {
        // On desktop, use desktop tabs
        await page.waitForSelector(`[data-testid="tab-${options.tab}"]`, { timeout: 10000 });
        await page.click(`[data-testid="tab-${options.tab}"]`);
      }
      await page.waitForLoadState('domcontentloaded');
    }
  }
  if (options.section) {
    // Handle section navigation within tabs
    if (options.section === 'connections') {
      // Connections are in the Settings tab, so we need to navigate there first
      if (options.tab !== 'settings') {
        await page.waitForSelector('[data-testid="tab-settings"]', { timeout: 10000 });
        await page.click('[data-testid="tab-settings"]');
        await page.waitForLoadState('domcontentloaded');
      }
      // The connections section is the default in Settings tab, so no additional click needed
    } else if (options.section === 'secrets') {
      // Secrets are also in the Settings tab
      if (options.tab !== 'settings') {
        await page.waitForSelector('[data-testid="tab-settings"]', { timeout: 10000 });
        await page.click('[data-testid="tab-settings"]');
        await page.waitForLoadState('domcontentloaded');
      }
      // Click on the Secrets section button (it's a text button, not a data-testid)
      await page.click('button:has-text("Secrets")');
      await page.waitForLoadState('domcontentloaded');
    } else {
      // For other sections, try the original pattern
      try {
        await page.click(`[data-testid="${options.section}-section"]`);
        await page.waitForLoadState('domcontentloaded');
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
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(100);
    }
  }
};

/**
 * Reset rate limits for testing
 */
export const resetRateLimits = async (page: Page): Promise<void> => {
  try {
    await page.request.post('/api/test/reset-rate-limits');
  } catch (error) {
    console.warn('Failed to reset rate limits:', error);
  }
};

/**
 * Clean up E2E test artifacts
 */
export const cleanupE2E = async (
  page: Page,
  artifacts: TestArtifacts
): Promise<void> => {
  // Clean up test data in reverse order of creation
  if (artifacts.workflowIds?.length) {
    for (const id of artifacts.workflowIds) {
      try {
        await page.request.delete(`/api/workflows/${id}`);
      } catch (error) {
        console.warn(`Failed to cleanup workflow ${id}:`, error);
      }
    }
  }
  
  if (artifacts.connectionIds?.length) {
    for (const id of artifacts.connectionIds) {
      try {
        await page.request.delete(`/api/connections/${id}`);
      } catch (error) {
        console.warn(`Failed to cleanup connection ${id}:`, error);
      }
    }
  }
  
  if (artifacts.userIds?.length) {
    for (const id of artifacts.userIds) {
      try {
        await page.request.delete(`/api/admin/users/${id}`);
      } catch (error) {
        console.warn(`Failed to cleanup user ${id}:`, error);
      }
    }
  }
}; 