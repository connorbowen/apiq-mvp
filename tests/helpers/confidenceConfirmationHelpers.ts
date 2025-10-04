// Confidence confirmation testing helpers for APIQ E2E tests
// See docs/e2e-helpers-refactor-plan.md for details

import { Page, expect } from '@playwright/test';

export interface ConfidenceTestOptions {
  timeout?: number;
  validateUX?: boolean;
  validateAccessibility?: boolean;
}

/**
 * Wait for confidence confirmation modal to appear
 */
export const waitForConfidenceModal = async (
  page: Page,
  options: ConfidenceTestOptions = {}
): Promise<void> => {
  const { timeout = 10000 } = options;
  const modal = page.locator('[data-testid="confidence-confirmation-modal"]');
  await expect(modal).toBeVisible({ timeout });
};

/**
 * Wait for confidence confirmation modal to disappear
 */
export const waitForConfidenceModalToClose = async (
  page: Page,
  options: ConfidenceTestOptions = {}
): Promise<void> => {
  const { timeout = 5000 } = options;
  const modal = page.locator('[data-testid="confidence-confirmation-modal"]');
  await expect(modal).not.toBeVisible({ timeout });
};

/**
 * Test confidence score display
 */
export const testConfidenceScoreDisplay = async (
  page: Page,
  expectedMinScore?: number,
  expectedMaxScore?: number
): Promise<void> => {
  const modal = page.locator('[data-testid="confidence-confirmation-modal"]');
  const scoreElement = modal.locator('[data-testid="confidence-score"]');
  
  await expect(scoreElement).toBeVisible();
  
  const scoreText = await scoreElement.textContent();
  expect(scoreText).toMatch(/[0-9]+%/); // Should contain percentage
  
  if (expectedMinScore !== undefined || expectedMaxScore !== undefined) {
    const score = parseFloat(scoreText?.replace(/[^\d.]/g, '') || '0');
    
    if (expectedMinScore !== undefined) {
      expect(score).toBeGreaterThanOrEqual(expectedMinScore);
    }
    
    if (expectedMaxScore !== undefined) {
      expect(score).toBeLessThanOrEqual(expectedMaxScore);
    }
  }
};

/**
 * Test confidence explanation display
 */
export const testConfidenceExplanation = async (
  page: Page,
  expectedContent?: string
): Promise<void> => {
  const modal = page.locator('[data-testid="confidence-confirmation-modal"]');
  const explanation = modal.locator('[data-testid="confidence-explanation"]');
  
  await expect(explanation).toBeVisible();
  await expect(explanation).not.toBeEmpty();
  
  if (expectedContent) {
    await expect(explanation).toContainText(expectedContent);
  }
  
  // Verify no XSS content
  const explanationText = await explanation.textContent();
  expect(explanationText).not.toContain('<script>');
  expect(explanationText).not.toContain('javascript:');
};

/**
 * Test workflow preview display
 */
export const testWorkflowPreview = async (
  page: Page,
  expectedStepCount?: number
): Promise<void> => {
  const modal = page.locator('[data-testid="confidence-confirmation-modal"]');
  const preview = modal.locator('[data-testid="workflow-preview"]');
  
  await expect(preview).toBeVisible();
  
  const workflowSteps = modal.locator('[data-testid^="workflow-step-"]');
  const stepCount = await workflowSteps.count();
  
  if (expectedStepCount !== undefined) {
    expect(stepCount).toBe(expectedStepCount);
  } else {
    expect(stepCount).toBeGreaterThan(0);
  }
  
  // Verify first step has content
  if (stepCount > 0) {
    const firstStep = workflowSteps.first();
    await expect(firstStep).toBeVisible();
    await expect(firstStep).not.toBeEmpty();
  }
};

/**
 * Test confidence modal buttons
 */
export const testConfidenceModalButtons = async (
  page: Page
): Promise<void> => {
  const modal = page.locator('[data-testid="confidence-confirmation-modal"]');
  
  // Test proceed button
  const proceedButton = modal.locator('[data-testid="primary-action proceed-anyway-btn"]');
  await expect(proceedButton).toBeVisible();
  await expect(proceedButton).toContainText('Proceed Anyway');
  
  // Test cancel button
  const cancelButton = modal.locator('[data-testid="secondary-action cancel-btn"]');
  await expect(cancelButton).toBeVisible();
  await expect(cancelButton).toContainText('Cancel');
  
  // Test button accessibility
  await expect(proceedButton).toBeEnabled();
  await expect(cancelButton).toBeEnabled();
};

/**
 * Click proceed button in confidence modal
 */
export const clickProceedButton = async (
  page: Page,
  options: ConfidenceTestOptions = {}
): Promise<void> => {
  const modal = page.locator('[data-testid="confidence-confirmation-modal"]');
  const proceedButton = modal.locator('[data-testid="primary-action proceed-anyway-btn"]');
  
  await proceedButton.click();
  
  // Wait for modal to close
  await waitForConfidenceModalToClose(page, options);
};

/**
 * Click cancel button in confidence modal
 */
export const clickCancelButton = async (
  page: Page,
  options: ConfidenceTestOptions = {}
): Promise<void> => {
  const modal = page.locator('[data-testid="confidence-confirmation-modal"]');
  const cancelButton = modal.locator('[data-testid="secondary-action cancel-btn"]');
  
  await cancelButton.click();
  
  // Wait for modal to close
  await waitForConfidenceModalToClose(page, options);
};

/**
 * Close confidence modal with escape key
 */
export const closeConfidenceModalWithEscape = async (
  page: Page,
  options: ConfidenceTestOptions = {}
): Promise<void> => {
  await page.keyboard.press('Escape');
  await waitForConfidenceModalToClose(page, options);
};

/**
 * Close confidence modal by clicking backdrop
 */
export const closeConfidenceModalWithBackdrop = async (
  page: Page,
  options: ConfidenceTestOptions = {}
): Promise<void> => {
  const modal = page.locator('[data-testid="confidence-confirmation-modal"]');
  const backdrop = modal.locator('.fixed.inset-0');
  
  await backdrop.click();
  await waitForConfidenceModalToClose(page, options);
};

/**
 * Test confidence modal accessibility
 */
export const testConfidenceModalAccessibility = async (
  page: Page
): Promise<void> => {
  const modal = page.locator('[data-testid="confidence-confirmation-modal"]');
  
  // Check ARIA attributes
  await expect(modal).toHaveAttribute('role', 'dialog');
  await expect(modal).toHaveAttribute('aria-modal', 'true');
  await expect(modal).toHaveAttribute('aria-labelledby');
  await expect(modal).toHaveAttribute('aria-describedby');
  
  // Check focus management
  const proceedButton = modal.locator('[data-testid="primary-action proceed-anyway-btn"]');
  await expect(proceedButton).toBeFocused();
  
  // Check keyboard navigation
  await page.keyboard.press('Tab');
  const cancelButton = modal.locator('[data-testid="secondary-action cancel-btn"]');
  await expect(cancelButton).toBeFocused();
};

/**
 * Test confidence modal UX compliance
 */
export const testConfidenceModalUXCompliance = async (
  page: Page
): Promise<void> => {
  const modal = page.locator('[data-testid="confidence-confirmation-modal"]');
  
  // Check headings
  const title = modal.locator('h3');
  await expect(title).toBeVisible();
  await expect(title).toContainText('Workflow Confidence');
  
  // Check form elements have labels
  const scoreElement = modal.locator('[data-testid="confidence-score"]');
  await expect(scoreElement).toBeVisible();
  
  // Check button text is descriptive
  const proceedButton = modal.locator('[data-testid="primary-action proceed-anyway-btn"]');
  await expect(proceedButton).toContainText('Proceed Anyway');
  
  const cancelButton = modal.locator('[data-testid="secondary-action cancel-btn"]');
  await expect(cancelButton).toContainText('Cancel');
};

/**
 * Test confidence modal loading states
 */
export const testConfidenceModalLoadingStates = async (
  page: Page
): Promise<void> => {
  const modal = page.locator('[data-testid="confidence-confirmation-modal"]');
  
  // Test proceed button loading state
  const proceedButton = modal.locator('[data-testid="primary-action proceed-anyway-btn"]');
  await proceedButton.click();
  
  // Should show loading state
  await expect(proceedButton).toContainText(/Proceeding|Loading/i);
  await expect(proceedButton).toBeDisabled();
  
  // Cancel button should also be disabled during loading
  const cancelButton = modal.locator('[data-testid="secondary-action cancel-btn"]');
  await expect(cancelButton).toBeDisabled();
};

/**
 * Test confidence modal error handling
 */
export const testConfidenceModalErrorHandling = async (
  page: Page,
  errorMessage?: string
): Promise<void> => {
  const modal = page.locator('[data-testid="confidence-confirmation-modal"]');
  
  // Look for error indicators
  const errorElement = modal.locator('[data-testid="error-message"]');
  if (await errorElement.isVisible()) {
    if (errorMessage) {
      await expect(errorElement).toContainText(errorMessage);
    }
  }
  
  // Verify buttons are still functional
  const proceedButton = modal.locator('[data-testid="primary-action proceed-anyway-btn"]');
  const cancelButton = modal.locator('[data-testid="secondary-action cancel-btn"]');
  
  await expect(proceedButton).toBeEnabled();
  await expect(cancelButton).toBeEnabled();
};

/**
 * Comprehensive confidence modal test
 */
export const testConfidenceModalComprehensive = async (
  page: Page,
  options: ConfidenceTestOptions = {}
): Promise<void> => {
  const { validateUX = true, validateAccessibility = true } = options;
  
  // Wait for modal to appear
  await waitForConfidenceModal(page, options);
  
  // Test all modal components
  await testConfidenceScoreDisplay(page);
  await testConfidenceExplanation(page);
  await testWorkflowPreview(page);
  await testConfidenceModalButtons(page);
  
  // Test UX compliance if requested
  if (validateUX) {
    await testConfidenceModalUXCompliance(page);
  }
  
  // Test accessibility if requested
  if (validateAccessibility) {
    await testConfidenceModalAccessibility(page);
  }
};

/**
 * Test confidence modal with different confidence levels
 */
export const testConfidenceModalWithScore = async (
  page: Page,
  expectedScore: number,
  options: ConfidenceTestOptions = {}
): Promise<void> => {
  await waitForConfidenceModal(page, options);
  
  // Test score display
  await testConfidenceScoreDisplay(page, expectedScore, expectedScore);
  
  // Test appropriate messaging based on score
  const modal = page.locator('[data-testid="confidence-confirmation-modal"]');
  const explanation = modal.locator('[data-testid="confidence-explanation"]');
  
  if (expectedScore < 0.3) {
    await expect(explanation).toContainText(/low|very low/i);
  } else if (expectedScore < 0.5) {
    await expect(explanation).toContainText(/below average|moderate/i);
  } else if (expectedScore < 0.7) {
    await expect(explanation).toContainText(/moderate|uncertain/i);
  }
};
