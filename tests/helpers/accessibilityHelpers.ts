// Accessibility testing helpers for APIQ E2E tests
// See docs/e2e-helpers-refactor-plan.md for details

import { Page, expect } from '@playwright/test';

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
 * Test form accessibility (labels, ARIA, required fields)
 */
export const testFormAccessibility = async (
  page: Page,
  formSelector: string,
  options: AccessibilityOptions = {}
): Promise<void> => {
  const form = page.locator(formSelector);
  // Check for labels
  const inputs = form.locator('input, select, textarea');
  for (let i = 0; i < await inputs.count(); i++) {
    const input = inputs.nth(i);
    const id = await input.getAttribute('id');
    if (id) {
      await expect(form.locator(`label[for="${id}"]`)).toBeVisible();
    }
  }
  // Check ARIA if requested
  if (options.validateARIA) {
    await expect(form).toHaveAttribute('role', 'form');
  }
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