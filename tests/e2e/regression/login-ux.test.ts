// @ts-nocheck
import { test, expect } from '../helpers/coverageFixture';
import { UXComplianceHelper } from '../../helpers/uxCompliance';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let uxHelper: UXComplianceHelper;

test.describe('@regression Login UX Compliance', () => {
  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
    await page.goto(`${BASE_URL}/login`);
  });

  test('activation & adoption UX patterns', async ({ page }) => {
    // Global title
    await expect(page).toHaveTitle(/APIQ/);

    // Validate helper checks
    await uxHelper.validateActivationFirstUX();
    await uxHelper.validateFormAccessibility();
    await uxHelper.validateKeyboardNavigation();

    // Headings & marketing copy
    await expect(page.locator('h2')).toHaveText('Sign in to APIQ');
    await expect(page.locator('p')).toContainText('Multi-API Orchestrator');

    // Primary button & OAuth2 buttons visible
    await expect(page.getByTestId('primary-action signin-btn')).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });

  test('accessible form validation states', async ({ page }) => {
    const emailInput = page.getByLabel('Email address');
    const passwordInput = page.getByLabel('Password');

    // Submit empty form
    await page.getByTestId('primary-action signin-btn').click();
    await expect(page.locator('[role="alert"]')).toBeVisible();

    // Invalid email
    await emailInput.fill('invalid-email');
    await passwordInput.fill('password123');
    await page.getByTestId('primary-action signin-btn').click();
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('mobile responsive & keyboard navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await uxHelper.validateMobileResponsiveness();
    await uxHelper.validateKeyboardNavigation();
  });
});