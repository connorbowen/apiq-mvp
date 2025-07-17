// Wait helpers for APIQ E2E tests
// See docs/e2e-helpers-refactor-plan.md for details

import { Page, expect } from '@playwright/test';

/**
 * Wait for dashboard to be fully loaded with proper validation
 */
export const waitForDashboard = async (page: Page, timeout: number = 10000): Promise<void> => {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('h1:has-text("Dashboard")', { timeout });
};

/**
 * Wait for URL to match pattern (common in navigation tests)
 */
export const waitForURL = async (page: Page, urlPattern: RegExp, timeout: number = 10000): Promise<void> => {
  await page.waitForURL(urlPattern, { timeout });
};

/**
 * Wait for API response with request interception
 */
export const waitForAPIResponse = async (
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 10000): Promise<any> => {
  const response = await page.waitForResponse(
    response => response.url().includes(urlPattern.toString().replace(/[.*+?^$[object Object]}()|[\]\\]/g, '\\$&')),
    { timeout }
  );
  return response.json();
};

/**
 * Wait for modal to appear and be interactive
 */
export const waitForModal = async (page: Page, modalId?: string, timeout: number = 5000): Promise<void> => {
  const modalSelector = modalId ? `[data-testid="${modalId}"]` : 'role="dialog"]';
  await page.waitForSelector(modalSelector, { timeout });
  // Wait a bit more for modal to be fully interactive
  await page.waitForTimeout(100);
};

/**
 * Wait for success or error message with timeout
 */
export const waitForMessage = async (
  page: Page,
  messageType: 'success' | 'error',
  timeout: number = 5000): Promise<void> => {
  const selector = `[data-testid="${messageType}-message"]`;
  await page.waitForSelector(selector, { timeout });
};

/**
 * Wait for loading state to complete
 */
export const waitForLoadingComplete = async (page: Page, timeout: number = 10000): Promise<void> => {
  await page.waitForLoadState('networkidle', { timeout });
  // Wait for any loading spinners to disappear
  await page.waitForFunction(
    () => !document.querySelector('.loading, [data-testid="loading"]'),
    { timeout }
  );
};

/**
 * Wait for element to be visible with custom timeout
 */
export const waitForVisible = async (
  page: Page,
  selector: string,
  timeout: number = 5000): Promise<void> => {
  await page.waitForSelector(selector, { state: 'visible', timeout });
};

/**
 * Wait for element to be hidden with custom timeout
 */
export const waitForHidden = async (
  page: Page,
  selector: string,
  timeout: number = 5000): Promise<void> => {
  await page.waitForSelector(selector, { state: 'hidden', timeout });
};

/**
 * Wait for network to be idle with custom timeout
 */
export const waitForNetworkIdle = async (
  page: Page,
  timeout: number = 5000): Promise<void> => {
  await page.waitForLoadState('networkidle', { timeout });
};

/**
 * Wait for specific data-testid to be present
 */
export const waitForTestId = async (
  page: Page,
  testId: string,
  timeout: number = 10000): Promise<void> => {
  await page.waitForSelector(`[data-testid="${testId}"]`, { timeout });
};

/**
 * Wait for form to be ready (all inputs loaded)
 */
export const waitForFormReady = async (page: Page, timeout: number = 5000): Promise<void> => {
  await page.waitForFunction(
    () => {
      const inputs = document.querySelectorAll('input, select, textarea');
      return Array.from(inputs).every(input => !(input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).disabled);
    },
    { timeout }
  );
}; 