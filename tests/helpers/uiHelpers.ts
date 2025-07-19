// UI interaction helpers for APIQ E2E tests
// See docs/e2e-helpers-refactor-plan.md for details

import { Page, expect } from '@playwright/test';
import { UXComplianceHelper } from './uxCompliance';

/**
 * Options for waiting for elements
 */
export interface WaitOptions {
  timeout?: number;
  state?: 'load' | 'domcontentloaded' | 'networkidle';
}

/**
 * UX expectations for compliance validation
 */
export interface UXExpectations {
  title?: string;
  headings?: string;
  validateForm?: boolean;
  validateAccessibility?: boolean;
}

/**
 * Wait for dashboard to be fully loaded
 * 
 * Accounts for the 1.5-second delay from signup page redirects
 * Updated to handle ongoing API calls and guided tour
 */
export const waitForDashboard = async (page: Page): Promise<void> => {
  // Wait for DOM to be ready (more reliable than networkidle for dashboard)
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for dashboard loading state to disappear first
  await page.waitForSelector('[data-testid="dashboard-loading"]', { state: 'hidden', timeout: 15000 }).catch(() => {
    // If loading element doesn't exist, that's fine
  });
  
  // Wait for dashboard heading with extended timeout for signup redirects
  await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 20000 });
  
  // Wait for user dropdown to be available (important for navigation)
  await page.waitForSelector('[data-testid="user-dropdown-toggle"]', { timeout: 20000 });
  
  // Wait for at least one main tab to be visible
  await page.waitForSelector('[data-testid^="tab-"]', { timeout: 20000 });
  
  // Additional wait to ensure all components are fully loaded
  await page.waitForTimeout(1000);
};

/**
 * Wait for modal to appear
 */
export const waitForModal = async (page: Page, modalId?: string): Promise<void> => {
  const modalSelector = modalId ? `[data-testid="${modalId}"]` : '.fixed.inset-0.bg-gray-600.bg-opacity-50';
  await page.waitForSelector(modalSelector, { timeout: 5000 });
};

/**
 * Robust waiting for elements with configurable options
 */
export const waitForElement = async (
  page: Page,
  selector: string,
  options: WaitOptions = {}
): Promise<void> => {
  const { timeout = 5000, state = 'domcontentloaded' } = options;
  await page.waitForLoadState(state);
  await page.waitForSelector(selector, { timeout });
};

/**
 * Validate UX compliance for a page
 */
export const validateUXCompliance = async (
  page: Page,
  expectations: UXExpectations
): Promise<void> => {
  const uxHelper = new UXComplianceHelper(page);
  
  if (expectations.title) {
    await uxHelper.validatePageTitle(expectations.title);
  }
  
  if (expectations.headings) {
    // Split headings by pipe character to handle multiple headings
    const headingArray = expectations.headings.split('|').map(h => h.trim());
    await uxHelper.validateHeadingHierarchy(headingArray);
  }
  
  if (expectations.validateForm) {
    await uxHelper.validateFormAccessibility();
  }
  
  if (expectations.validateAccessibility) {
    await uxHelper.validateARIACompliance();
  }
}; 

/**
 * Close the guided tour overlay if present
 * 
 * This helper function handles the common E2E testing issue where guided tour overlays
 * can block user interactions. It attempts to close the overlay using multiple strategies:
 * 1. First tries to find and click a close button
 * 2. Falls back to pressing the Escape key
 * 3. Waits for the overlay to disappear
 * 
 * @param page - Playwright Page object
 * @returns Promise<void> - Resolves when overlay is closed or not present
 * 
 * @example
 * ```typescript
 * // Use before any UI interaction that might be blocked
 * await closeGuidedTourIfPresent(page);
 * await page.click('[data-testid="primary-action create-connection-btn"]');
 * ```
 * 
 * @example
 * ```typescript
 * // Use in test setup to ensure clean state
 * test.beforeEach(async ({ page }) => {
 *   await setupE2E(page, testUser);
 *   await closeGuidedTourIfPresent(page);
 * });
 * ```
 * 
 * @remarks
 * - Uses graceful error handling - won't fail if overlay is not present
 * - Multiple fallback strategies ensure robust overlay dismissal
 * - 5-second timeout for overlay disappearance
 * - Safe to call multiple times in the same test
 */
export const closeGuidedTourIfPresent = async (page: Page): Promise<void> => {
  const overlay = page.locator('[data-testid="guided-tour-overlay"]');
  if (await overlay.isVisible().catch(() => false)) {
    // Try clicking the close button if it exists
    const closeBtn = page.locator('[data-testid="close-guided-tour-btn"]');
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    } else {
      // Fallback: press Escape
      await page.keyboard.press('Escape');
    }
    // Wait for overlay to disappear
    await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}; 

/**
 * Fill signup form with provided data
 */
export const fillSignupForm = async (
  page: Page,
  email: string,
  password: string = 'testpass123'
): Promise<void> => {
  await page.getByLabel('Email address').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);
};

/**
 * Fill login form with provided data
 */
export const fillLoginForm = async (
  page: Page,
  email: string,
  password: string
): Promise<void> => {
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
};

/**
 * Submit signup form and wait for redirect
 */
export const submitSignupForm = async (
  page: Page,
  email: string,
  password: string = 'testpass123',
  options: {
    timeout?: number;
    validateURL?: RegExp;
  } = {}
): Promise<void> => {
  const { timeout = 20000, validateURL = /.*dashboard.*/ } = options;
  
  // Fill and submit form
  await fillSignupForm(page, email, password);
  await page.getByTestId('primary-action signup-btn').click();
  
  // Wait for redirect
  await page.waitForURL(validateURL, { timeout });
}; 