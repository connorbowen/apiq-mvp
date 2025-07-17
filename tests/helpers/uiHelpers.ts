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
 */
export const waitForDashboard = async (page: Page): Promise<void> => {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });
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
  const { timeout = 5000, state = 'networkidle' } = options;
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
    await uxHelper.validateHeadingHierarchy([expectations.headings]);
  }
  
  if (expectations.validateForm) {
    await uxHelper.validateFormAccessibility();
  }
  
  if (expectations.validateAccessibility) {
    await uxHelper.validateARIACompliance();
  }
}; 