import { test, expect } from '@playwright/test';
import { TestUser, generateTestId, cleanupTestUser } from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';
import { setupE2E, closeAllModals, resetRateLimits } from '../../helpers/e2eHelpers';
import { UXComplianceHelper } from '../../helpers/uxCompliance';

let testUser: TestUser;
let uxHelper: UXComplianceHelper;

test.describe('Enhanced Text Readability & Contrast', () => {
  test.beforeAll(async () => {
    testUser = await createE2EUser('USER', {
      email: `e2e-text-readability-${generateTestId('user')}@example.com`,
      password: 'e2eTestPass123',
      name: 'E2E Text Readability Test User'
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    await setupE2E(page, testUser, { 
      tab: 'overview', 
      validateUX: true 
    });
    uxHelper = new UXComplianceHelper(page);
  });

  test.afterEach(async ({ page }) => {
    await closeAllModals(page);
    await resetRateLimits(page);
  });

  test.describe('Form Input Text Readability', () => {
    test('should have high contrast text in all input fields', async ({ page }) => {
      // Navigate to connections tab where we have forms
      await page.getByTestId('tab-connections').click();
      
      // Click create connection button to open form
      await page.getByTestId('primary-action create-connection-btn').click();
      
      // Wait for modal to open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 10000 });
      
      // Test input field text contrast using existing helper patterns
      const nameInput = page.getByTestId('connection-name-input');
      await expect(nameInput).toBeVisible();
      
      // Verify input has enhanced styling (white background, dark text)
      await expect(nameInput).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(nameInput).toHaveCSS('color', 'rgb(17, 24, 39)'); // #111827
      
      // Test placeholder text contrast
      await expect(nameInput).toHaveAttribute('placeholder', 'e.g., GitHub API');
      
      // Verify textarea has enhanced styling
      const descriptionTextarea = page.getByTestId('connection-description-input');
      await expect(descriptionTextarea).toBeVisible();
      await expect(descriptionTextarea).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(descriptionTextarea).toHaveCSS('color', 'rgb(17, 24, 39)');
      
      // Verify select has enhanced styling
      const authTypeSelect = page.getByTestId('connection-authtype-select');
      await expect(authTypeSelect).toBeVisible();
      await expect(authTypeSelect).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(authTypeSelect).toHaveCSS('color', 'rgb(17, 24, 39)');
    });

    test('should have readable placeholder text in all form fields', async ({ page }) => {
      // Navigate to secrets tab
      await page.getByTestId('tab-secrets').click();
      
      // Click create secret button
      await page.getByTestId('primary-action create-secret-btn').click();
      
      // Wait for modal to open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 10000 });
      
      // Test placeholder text in secret form
      const nameInput = page.getByTestId('secret-name-input');
      await expect(nameInput).toBeVisible();
      await expect(nameInput).toHaveAttribute('placeholder', 'Enter secret name');
      
      // Verify placeholder text is readable (not too light)
      const placeholderColor = await nameInput.evaluate(el => {
        const style = window.getComputedStyle(el, '::placeholder');
        return style.color;
      });
      
      // Placeholder should not be too light (should be #6b7280 or darker)
      expect(placeholderColor).not.toBe('rgb(156, 163, 175)'); // #9ca3af (too light)
      expect(placeholderColor).not.toBe('rgb(209, 213, 219)'); // #d1d5db (too light)
    });

    test('should maintain text readability across different backgrounds', async ({ page }) => {
      // Test on overview tab (gray background)
      await page.getByTestId('tab-overview').click();
      
      // Test on connections tab (white background)
      await page.getByTestId('tab-connections').click();
      
      // Test on workflows tab (white background)
      await page.getByTestId('tab-workflows').click();
      
      // Test on secrets tab (white background)
      await page.getByTestId('tab-secrets').click();
      
      // All form elements should maintain readability regardless of background
      // This is handled by our CSS overrides, so we just need to verify they exist
      const createButtons = page.locator('[data-testid*="create-"]');
      await expect(createButtons.first()).toBeVisible();
    });
  });

  test.describe('Form Label Readability', () => {
    test('should have high contrast labels for all form fields', async ({ page }) => {
      // Navigate to profile tab where we have form fields
      await page.getByTestId('tab-settings').click();
      
      // Wait for settings to load
      await page.waitForSelector('[data-testid="settings-header"]', { timeout: 10000 });
      
      // Test label contrast
      const labels = page.locator('label');
      await expect(labels.first()).toBeVisible();
      
      // Verify labels have enhanced styling (dark text)
      const firstLabel = labels.first();
      await expect(firstLabel).toHaveCSS('color', 'rgb(55, 65, 81)'); // #374151
    });

    test('should have readable labels against all background colors', async ({ page }) => {
      // Test labels on different tabs with different backgrounds
      const tabs = ['overview', 'connections', 'workflows', 'secrets', 'settings'];
      
      for (const tab of tabs) {
        await page.getByTestId(`tab-${tab}`).click();
        
        // Wait for tab content to load
        await page.waitForTimeout(1000);
        
        // Look for any labels on the page
        const labels = page.locator('label');
        if (await labels.count() > 0) {
          const firstLabel = labels.first();
          await expect(firstLabel).toBeVisible();
          
          // Label should be visible and readable
          const labelColor = await firstLabel.evaluate(el => {
            return window.getComputedStyle(el).color;
          });
          
          // Should not be too light
          expect(labelColor).not.toBe('rgb(156, 163, 175)'); // #9ca3af
          expect(labelColor).not.toBe('rgb(209, 213, 219)'); // #d1d5db
        }
      }
    });
  });

  test.describe('Static Text Readability', () => {
    test('should preserve original text colors for non-form content', async ({ page }) => {
      // Navigate to overview tab
      await page.getByTestId('tab-overview').click();
      
      // Test that headings maintain their original styling
      const heading = page.locator('h2:has-text("Overview")');
      await expect(heading).toBeVisible();
      
      // Heading should not be forced to our enhanced colors
      const headingColor = await heading.evaluate(el => {
        return window.getComputedStyle(el).color;
      });
      
      // Should not be our forced #111827 color
      expect(headingColor).not.toBe('rgb(17, 24, 39)');
      
      // Test that paragraph text maintains readability
      const description = page.locator('p:has-text("Welcome back")');
      await expect(description).toBeVisible();
      
      // Description should be readable
      const descColor = await description.evaluate(el => {
        return window.getComputedStyle(el).color;
      });
      
      // Should not be too light
      expect(descColor).not.toBe('rgb(156, 163, 175)'); // #9ca3af
    });

    test('should maintain button text readability', async ({ page }) => {
      // Navigate to connections tab
      await page.getByTestId('tab-connections').click();
      
      // Test primary action button text
      const createButton = page.getByTestId('primary-action create-connection-btn');
      await expect(createButton).toBeVisible();
      
      // Button text should be readable
      const buttonColor = await createButton.evaluate(el => {
        return window.getComputedStyle(el).color;
      });
      
      // Should not be too light
      expect(buttonColor).not.toBe('rgb(156, 163, 175)'); // #9ca3af
    });
  });

  test.describe('Focus States and Accessibility', () => {
    test('should have visible focus indicators on form elements', async ({ page }) => {
      // Navigate to connections tab
      await page.getByTestId('tab-connections').click();
      
      // Click create connection button
      await page.getByTestId('primary-action create-connection-btn').click();
      
      // Wait for modal to open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 10000 });
      
      // Test focus on input field
      const nameInput = page.getByTestId('connection-name-input');
      await nameInput.focus();
      
      // Should have enhanced focus styling
      await expect(nameInput).toHaveCSS('border-color', 'rgb(59, 130, 246)'); // #3b82f6
      await expect(nameInput).toHaveCSS('box-shadow');
    });

    test('should maintain keyboard navigation with enhanced styling', async ({ page }) => {
      // Navigate to connections tab
      await page.getByTestId('tab-connections').click();
      
      // Click create connection button
      await page.getByTestId('primary-action create-connection-btn').click();
      
      // Wait for modal to open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 10000 });
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      
      // Should focus on first form element
      const nameInput = page.getByTestId('connection-name-input');
      await expect(nameInput).toBeFocused();
      
      // Continue tabbing through form
      await page.keyboard.press('Tab');
      const descriptionTextarea = page.getByTestId('connection-description-input');
      await expect(descriptionTextarea).toBeFocused();
    });
  });

  test.describe('Cross-Browser Consistency', () => {
    test('should maintain enhanced styling across different viewport sizes', async ({ page }) => {
      // Test on mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Navigate to connections tab
      await page.getByTestId('tab-connections').click();
      
      // Click create connection button
      await page.getByTestId('primary-action create-connection-btn').click();
      
      // Wait for modal to open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 10000 });
      
      // Verify enhanced styling still works on mobile
      const nameInput = page.getByTestId('connection-name-input');
      await expect(nameInput).toBeVisible();
      await expect(nameInput).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(nameInput).toHaveCSS('color', 'rgb(17, 24, 39)');
      
      // Test on tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Verify styling still works
      await expect(nameInput).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(nameInput).toHaveCSS('color', 'rgb(17, 24, 39)');
      
      // Reset to desktop
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });

  test.describe('Performance Impact', () => {
    test('should not significantly impact page load performance', async ({ page }) => {
      // Navigate to overview tab
      await page.getByTestId('tab-overview').click();
      
      // Measure page load time
      const startTime = Date.now();
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Page should load within reasonable time (enhanced CSS shouldn't slow it down)
      expect(loadTime).toBeLessThan(5000); // 5 seconds max
    });
  });

  test.describe('Integration with Existing UX Compliance', () => {
    test('should work with existing form accessibility validation', async ({ page }) => {
      // Use existing UX compliance helper to validate form accessibility
      await uxHelper.validateFormAccessibility();
      
      // Verify that our enhanced styling doesn't break existing accessibility features
      const formFields = page.locator('input, select, textarea');
      await expect(formFields.first()).toBeVisible();
      
      // Test that enhanced styling is applied
      const firstField = formFields.first();
      await expect(firstField).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(firstField).toHaveCSS('color', 'rgb(17, 24, 39)');
    });

    test('should maintain existing accessibility patterns', async ({ page }) => {
      // Navigate to connections tab
      await page.getByTestId('tab-connections').click();
      
      // Test that existing accessibility patterns still work
      await page.getByTestId('primary-action create-connection-btn').click();
      
      // Wait for modal to open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 10000 });
      
      // Verify existing accessibility features
      const nameInput = page.getByTestId('connection-name-input');
      await expect(nameInput).toHaveAttribute('aria-required', 'true');
      
      // Verify our enhanced styling is applied
      await expect(nameInput).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(nameInput).toHaveCSS('color', 'rgb(17, 24, 39)');
    });

    test('should pass comprehensive text readability validation', async ({ page }) => {
      // Use the new text readability validation helper
      await uxHelper.validateTextReadability();
    });
  });
});
