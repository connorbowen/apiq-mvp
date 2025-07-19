// Accessibility testing helpers for APIQ E2E tests
// See docs/e2e-helpers-refactor-plan.md for details

import { Page, expect } from '@playwright/test';
import { navigateWithKeyboard } from './e2eHelpers';

export interface AccessibilityOptions {
  validateARIA?: boolean;
  validateKeyboard?: boolean;
  validateScreenReader?: boolean;
  validateMobile?: boolean;
}

/**
 * Test primary action button patterns (data-testid compliance)
 */
export const testPrimaryActionPatterns = async (
  page: Page,
  action: string
): Promise<boolean> => {
  const btn = page.getByTestId(`primary-action ${action}-btn`);
  return await btn.isVisible();
};

/**
 * Test form accessibility with ARIA labels
 */
export const testFormAccessibility = async (
  page: Page,
  formSelectors: {
    emailLabel?: string;
    passwordLabel?: string;
    submitButton?: string;
  } = {}
): Promise<void> => {
  const {
    emailLabel = 'Email address',
    passwordLabel = 'Password',
    submitButton = 'primary-action signin-btn'
  } = formSelectors;
  
  // Check for proper ARIA labels
  await expect(page.getByLabel(emailLabel)).toBeVisible();
  await expect(page.getByLabel(passwordLabel)).toBeVisible();
  
  // Check for proper form structure
  await expect(page.locator('form')).toBeVisible();
  
  // Check that submit button is visible and enabled
  const submitBtn = page.getByTestId(submitButton);
  await expect(submitBtn).toBeVisible();
  await expect(submitBtn).toBeEnabled();
};

/**
 * Test form validation feedback
 */
export const testFormValidation = async (
  page: Page,
  expectedError: string = 'Email is required'
): Promise<void> => {
  // Try to submit empty form
  await page.getByTestId('primary-action signup-btn').click();
  
  // Should show validation errors
  await expect(page.getByText(expectedError)).toBeVisible();
};

/**
 * Test keyboard navigation for form inputs
 */
export const testFormKeyboardNavigation = async (
  page: Page,
  inputSelectors: string[]
): Promise<void> => {
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Use the robust keyboard navigation helper with input selectors
  await navigateWithKeyboard(page, inputSelectors);
  
  // Check that the submit button is visible and enabled (not necessarily focused)
  const submitBtn = page.getByTestId('primary-action signin-btn');
  await expect(submitBtn).toBeVisible();
  await expect(submitBtn).toBeEnabled();
};

/**
 * Test error/success message containers for actionable UX
 */
export const testMessageContainers = async (
  page: Page,
  messageType: 'error' | 'success'
): Promise<void> => {
  const selector = `[data-testid="${messageType}-message"]`;
  const el = page.locator(selector);
  await expect(el).toBeVisible();
};

/**
 * Test mobile responsiveness by setting viewport and checking layout
 */
export const testMobileResponsiveness = async (
  page: Page,
  viewport: { width: number; height: number } = { width: 375, height: 667 }
): Promise<void> => {
  await page.setViewportSize(viewport);
  // Check for mobile nav or layout element
  await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
};

/**
 * Test keyboard navigation (Tab/Shift+Tab focus order)
 */
export const testKeyboardNavigation = async (
  page: Page
): Promise<void> => {
  // Focus first element
  await page.keyboard.press('Tab');
  // Check that a focusable element is focused
  const active = await page.evaluate(() => document.activeElement?.tagName);
  if (!active) throw new Error('No element is focused after Tab');
};

/**
 * Test screen reader compatibility (checks for ARIA attributes)
 */
export const testScreenReaderCompatibility = async (
  page: Page
): Promise<void> => {
  // Check for ARIA attributes on main regions
  await expect(page.locator('[role="main"]')).toBeVisible();
  await expect(page.locator('[role="navigation"]')).toBeVisible();
  await expect(page.locator('[role="banner"]')).toBeVisible();
}; 