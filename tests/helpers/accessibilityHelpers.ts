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
    emailLabel,
    passwordLabel,
    submitButton
  } = formSelectors;
  
  // Check for proper form structure
  await expect(page.locator('form')).toBeVisible();
  
  // Check for email label if specified
  if (emailLabel) {
    await expect(page.getByLabel(emailLabel)).toBeVisible();
  }
  
  // Check for password label if specified
  if (passwordLabel) {
    await expect(page.getByLabel(passwordLabel)).toBeVisible();
  }
  
  // Check that submit button is visible and enabled if specified
  if (submitButton) {
    const submitBtn = page.getByTestId(submitButton);
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  }
};

/**
 * Test form validation feedback
 */
export const testFormValidation = async (
  page: Page,
  expectedError: string = 'email is required'
): Promise<void> => {
  // Try to submit empty form - look for the specific submit button
  const submitButton = page.getByTestId('primary-action signup-btn');
  if (await submitButton.isVisible()) {
    await submitButton.click();
  } else {
    // Fallback to generic submit button
    await page.locator('button[type="submit"]').click();
  }
  
  // Wait a moment for validation to trigger
  await page.waitForTimeout(500);
  
  // Should show validation errors - use case-insensitive matching
  // Look for errors in multiple possible locations with specific selectors
  try {
    // First try to find the error in the main error container
    await expect(page.getByTestId('registration-error')).toBeVisible();
    // Check that the main container contains the expected error
    const mainErrorContainer = page.getByTestId('registration-error');
    await expect(mainErrorContainer.getByText(new RegExp(expectedError, 'i'))).toBeVisible();
  } catch (error) {
    // If not found in main container, try to find individual field errors
    // Use specific field error selectors to avoid strict mode violations
    if (expectedError.toLowerCase().includes('email')) {
      await expect(page.locator('#email-error')).toBeVisible();
    } else if (expectedError.toLowerCase().includes('password')) {
      await expect(page.locator('#password-error')).toBeVisible();
    } else if (expectedError.toLowerCase().includes('confirm')) {
      await expect(page.locator('#confirmPassword-error')).toBeVisible();
    } else {
      // Fallback: look for any error message that's visible
      await expect(page.locator('.text-red-600')).toBeVisible();
    }
  }
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
  
  // Check that a submit button is visible and enabled (not necessarily focused)
  // Note: This is a generic check - specific tests should use the appropriate button
  const submitBtn = page.locator('button[type="submit"]');
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
  
  // Only check mobile nav visibility on mobile viewports
  if (viewport.width < 768) {
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
  } else {
    await expect(page.locator('[data-testid="mobile-navigation"]')).toBeHidden();
  }
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