// Modal behavior helpers for APIQ E2E tests
// See docs/e2e-helpers-refactor-plan.md for details

import { Page, expect } from '@playwright/test';

export interface ModalOptions {
  timeout?: number;
  validateLoading?: boolean;
  validateSuccess?: boolean;
  validateError?: boolean;
}

/**
 * Test modal submit button loading states
 */
export const testModalSubmitLoading = async (
  page: Page,
  submitButtonSelector: string,
  options: ModalOptions = {}
): Promise<void> => {
  const { timeout = 5000 } = options;
  const button = page.locator(submitButtonSelector);
  await button.click();
  // Validate loading state
  await expect(button).toBeDisabled({ timeout });
  await expect(button).toHaveText(/Loading|Saving|Creating|Processing|Success!/i, { timeout });
};

/**
 * Test minimum loading state duration (default 800ms)
 */
export const testMinimumLoadingDuration = async (
  page: Page,
  loadingSelector: string,
  minDuration: number = 800
): Promise<void> => {
  const start = Date.now();
  await page.waitForSelector(loadingSelector, { state: 'visible' });
  await page.waitForSelector(loadingSelector, { state: 'hidden' });
  const elapsed = Date.now() - start;
  if (elapsed < minDuration) {
    throw new Error(`Loading state was too short: ${elapsed}ms < ${minDuration}ms`);
  }
};

/**
 * Test success message in modal
 */
export const testModalSuccessMessage = async (
  page: Page,
  successSelector: string,
  expectedMessage?: string
): Promise<void> => {
  const success = page.locator(successSelector);
  await expect(success).toBeVisible();
  if (expectedMessage) {
    await expect(success).toContainText(expectedMessage);
  }
};

/**
 * Test modal delay before closing (default 1.5s)
 */
export const testModalDelayBeforeClosing = async (
  page: Page,
  modalSelector: string,
  delayMs: number = 1500
): Promise<void> => {
  await page.waitForSelector(modalSelector, { state: 'visible' });
  const start = Date.now();
  await page.waitForSelector(modalSelector, { state: 'hidden' });
  const elapsed = Date.now() - start;
  if (elapsed < delayMs) {
    throw new Error(`Modal closed too quickly: ${elapsed}ms < ${delayMs}ms`);
  }
};

/**
 * Test modal error handling
 */
export const testModalErrorHandling = async (
  page: Page,
  errorSelector: string,
  expectedError?: string
): Promise<void> => {
  const error = page.locator(errorSelector);
  await expect(error).toBeVisible();
  if (expectedError) {
    await expect(error).toContainText(expectedError);
  }
};

/**
 * Test modal accessibility
 */
export const testModalAccessibility = async (
  page: Page,
  modalSelector: string
): Promise<void> => {
  // Check for ARIA role
  const modal = page.locator(modalSelector);
  await expect(modal).toHaveAttribute('role', 'dialog');
  // Check for focus trap (at least one focusable element)
  const focusable = await modal.evaluateAll((nodes) =>
    nodes.some(node => (node as HTMLElement).tabIndex >= 0 || (node as HTMLElement).focus)
  );
  if (!focusable) {
    throw new Error('Modal does not contain any focusable elements');
  }
}; 