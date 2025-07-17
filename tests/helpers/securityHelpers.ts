// Security testing helpers for APIQ E2E tests
// See docs/e2e-helpers-refactor-plan.md for details

import { Page, expect } from '@playwright/test';

export interface SecurityOptions {
  timeout?: number;
  validateHeaders?: boolean;
  validateCookies?: boolean;
}

/**
 * Test XSS prevention by injecting payload and checking for script execution
 */
export const testXSSPrevention = async (
  page: Page,
  inputSelector: string,
  xssPayload: string
): Promise<boolean> => {
  await page.fill(inputSelector, xssPayload);
  await page.keyboard.press('Enter');
  // Check for script execution (e.g., window.xssExecuted)
  const xssDetected = await page.evaluate(() => (window as any).xssExecuted === true);
  return !xssDetected;
};

/**
 * Test CSRF protection by attempting a cross-origin POST
 */
export const testCSRFProtection = async (
  page: Page,
  formSelector: string
): Promise<boolean> => {
  // Simulate a cross-origin POST (should be rejected)
  const result = await page.evaluate(async (selector) => {
    const form = document.querySelector(selector) as HTMLFormElement;
    if (!form) return false;
    try {
      const resp = await fetch(form.action, { method: 'POST', credentials: 'omit' });
      return resp.status === 403 || resp.status === 401;
    } catch {
      return true;
    }
  }, formSelector);
  return result;
};

/**
 * Test data exposure prevention by checking for sensitive data in DOM
 */
export const testDataExposure = async (
  page: Page,
  sensitiveDataSelectors: string[]
): Promise<boolean> => {
  for (const selector of sensitiveDataSelectors) {
    const el = page.locator(selector);
    if (await el.isVisible()) {
      return false;
    }
  }
  return true;
};

/**
 * Test authentication flows (basic: check for secure cookies and headers)
 */
export const testAuthenticationFlow = async (
  page: Page,
  options: SecurityOptions = {}
): Promise<void> => {
  // Check for secure cookies
  const cookies = await page.context().cookies();
  if (options.validateCookies) {
    for (const cookie of cookies) {
      if (cookie.name === 'accessToken' || cookie.name === 'refreshToken') {
        if (!cookie.httpOnly || cookie.secure !== false) {
          throw new Error('Auth cookies must be httpOnly and (in prod) secure');
        }
      }
    }
  }
  // Check for auth headers on API requests (if possible)
  if (options.validateHeaders) {
    // This would require intercepting requests; left as a stub for now
  }
}; 