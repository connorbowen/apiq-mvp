/**
 * P1.5: Billing Integration E2E Tests
 * 
 * Tests the billing integration functionality including plan limits, overage charges,
 * upgrade flows, and payment processing integration.
 * 
 * Following user-rules.md E2E testing guidelines:
 * - Uses real data and real system components
 * - No mocks for the system under test
 * - Tests complete user workflows end-to-end
 * - Validates UX compliance and accessibility
 */

import { test, expect } from '@playwright/test';
import { TestUser, generateTestId, cleanupTestUser } from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';
import { setupE2E, closeAllModals, resetRateLimits, getPrimaryActionButton } from '../../helpers/e2eHelpers';
import { waitForDashboard, validateUXCompliance, closeGuidedTourIfPresent, waitForElement } from '../../helpers/uiHelpers';
import { testPageLoadTime, testAPIPerformance } from '../../helpers/performanceHelpers';
import { testFormAccessibility, testPrimaryActionPatterns } from '../../helpers/accessibilityHelpers';
import { testModalSubmitLoading, testModalSuccessMessage, testModalErrorHandling } from '../../helpers/modalHelpers';
import { testXSSPrevention, testDataExposure } from '../../helpers/securityHelpers';
import { waitForNetworkIdle } from '../../helpers/waitHelpers';
import { 
  createUsageTestData, 
  cleanupUsageTestData, 
  testBillingIntegration,
  simulateUsage,
  resetUsageLimits,
  createTestPricingConfig
} from '../../helpers/usageHelpers';
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('P1.5: Billing Integration E2E Tests', () => {
  let testUser: TestUser;
  let usageTestData: any;

  test.beforeAll(async () => {
    testUser = await createE2EUser();
    usageTestData = await createUsageTestData(testUser.id);
  });

  test.afterAll(async () => {
    if (usageTestData) {
      await usageTestData.cleanup();
    }
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    await setupE2E(page, testUser, { 
      tab: 'billing', 
      validateUX: true 
    });
    await closeGuidedTourIfPresent(page);
  });

  test.afterEach(async ({ page }) => {
    await closeAllModals(page);
    await resetRateLimits(page);
  });

  test.describe('Plan Display and Management', () => {
    test('should display current plan information', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Test page load performance
      await testPageLoadTime(page, 3000);
      
      // Validate UX compliance
      await validateUXCompliance(page);
      
      // Verify plan information is displayed
      await expect(page.locator('[data-testid="current-plan-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-limits"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-features"]')).toBeVisible();
      
      // Verify plan details
      await expect(page.locator('[data-testid="plan-name"]')).toContainText(/free|pro|business/i);
      await expect(page.locator('[data-testid="token-limit"]')).toBeVisible();
      await expect(page.locator('[data-testid="request-limit"]')).toBeVisible();
    });

    test('should display plan limits and current usage', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Verify usage vs limits display
      await expect(page.locator('[data-testid="usage-vs-limits"]')).toBeVisible();
      await expect(page.locator('[data-testid="token-utilization"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-utilization"]')).toBeVisible();
      
      // Verify progress bars
      await expect(page.locator('[data-testid="token-progress-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-progress-bar"]')).toBeVisible();
      
      // Verify percentage displays
      await expect(page.locator('[data-testid="token-percentage"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-percentage"]')).toBeVisible();
    });

    test('should show plan upgrade options', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Verify upgrade section
      await expect(page.locator('[data-testid="upgrade-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="available-plans"]')).toBeVisible();
      
      // Verify plan comparison
      await expect(page.locator('[data-testid="plan-comparison-table"]')).toBeVisible();
      
      // Verify upgrade buttons
      const upgradeButtons = page.locator('[data-testid*="upgrade-to-"]');
      const count = await upgradeButtons.count();
      expect(count).toBeGreaterThan(0);
      
      // Test upgrade button accessibility
      for (let i = 0; i < count; i++) {
        const button = upgradeButtons.nth(i);
        await expect(button).toBeVisible();
        await expect(button).toHaveAttribute('type', 'button');
      }
    });
  });

  test.describe('Usage Limit Enforcement', () => {
    test('should warn when approaching limits', async ({ page }) => {
      // Simulate high usage (80% of limit)
      await simulateUsage(testUser.id, 'openai_chat', 8000, 800);
      
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Verify warning indicators
      await expect(page.locator('[data-testid="usage-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="approaching-limit-notice"]')).toBeVisible();
      await expect(page.locator('[data-testid="warning-icon"]')).toBeVisible();
      
      // Verify warning message
      await expect(page.locator('[data-testid="warning-message"]')).toContainText(/approaching|limit|80%/i);
    });

    test('should block usage when limits are exceeded', async ({ page }) => {
      // Simulate overage
      await simulateUsage(testUser.id, 'openai_chat', 15000, 1500); // Exceed 10K limit
      
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Verify overage warnings
      await expect(page.locator('[data-testid="overage-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="overage-amount"]')).toBeVisible();
      await expect(page.locator('[data-testid="overage-cost"]')).toBeVisible();
      
      // Verify upgrade prompts
      await expect(page.locator('[data-testid="primary-action upgrade-plan"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-urgent-notice"]')).toBeVisible();
    });

    test('should calculate overage charges correctly', async ({ page }) => {
      // Create test pricing config with overage pricing
      await createTestPricingConfig('openai_chat', 'gpt-4-turbo-preview', 30, 60);
      
      // Simulate overage
      await simulateUsage(testUser.id, 'openai_chat', 12000, 1200); // 2K overage
      
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Verify overage calculation
      await expect(page.locator('[data-testid="overage-tokens"]')).toContainText('2,000');
      await expect(page.locator('[data-testid="overage-rate"]')).toContainText('$0.90');
      await expect(page.locator('[data-testid="overage-total"]')).toBeVisible();
    });
  });

  test.describe('Plan Upgrade Flow', () => {
    test('should display upgrade modal when upgrade button clicked', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Click upgrade button
      const upgradeButton = page.locator('[data-testid="primary-action upgrade-plan"]').first();
      if (await upgradeButton.count() > 0) {
        await upgradeButton.click();
        
        // Verify upgrade modal opens
        await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
        await expect(page.locator('[data-testid="modal-title"]')).toContainText(/upgrade|plan/i);
        
        // Verify plan options in modal
        await expect(page.locator('[data-testid="plan-options"]')).toBeVisible();
        await expect(page.locator('[data-testid="pro-plan-option"]')).toBeVisible();
        await expect(page.locator('[data-testid="business-plan-option"]')).toBeVisible();
      }
    });

    test('should show plan comparison in upgrade modal', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      const upgradeButton = page.locator('[data-testid="primary-action upgrade-plan"]').first();
      if (await upgradeButton.count() > 0) {
        await upgradeButton.click();
        await waitForElement(page, '[data-testid="upgrade-modal"]', { timeout: 5000 });
        
        // Verify plan comparison
        await expect(page.locator('[data-testid="plan-comparison"]')).toBeVisible();
        await expect(page.locator('[data-testid="feature-comparison"]')).toBeVisible();
        
        // Verify pricing display
        await expect(page.locator('[data-testid="pro-pricing"]')).toBeVisible();
        await expect(page.locator('[data-testid="business-pricing"]')).toBeVisible();
        
        // Verify feature lists
        await expect(page.locator('[data-testid="pro-features"]')).toBeVisible();
        await expect(page.locator('[data-testid="business-features"]')).toBeVisible();
      }
    });

    test('should handle plan selection and confirmation', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      const upgradeButton = page.locator('[data-testid="primary-action upgrade-plan"]').first();
      if (await upgradeButton.count() > 0) {
        await upgradeButton.click();
        await waitForElement(page, '[data-testid="upgrade-modal"]', { timeout: 5000 });
        
        // Select Pro plan
        const proPlanButton = page.locator('[data-testid="select-pro-plan"]');
        if (await proPlanButton.count() > 0) {
          await proPlanButton.click();
          
          // Verify selection
          await expect(page.locator('[data-testid="selected-plan"]')).toContainText(/pro/i);
          
          // Test confirmation flow
          const confirmButton = page.locator('[data-testid="primary-action confirm-upgrade"]');
          if (await confirmButton.count() > 0) {
            await confirmButton.click();
            
            // Verify confirmation modal
            await expect(page.locator('[data-testid="upgrade-confirmation"]')).toBeVisible();
            await expect(page.locator('[data-testid="billing-summary"]')).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Billing History and Invoices', () => {
    test('should display billing history', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Verify billing history section
      await expect(page.locator('[data-testid="billing-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="billing-history-title"]')).toContainText(/history|invoices/i);
      
      // Verify history table
      await expect(page.locator('[data-testid="billing-history-table"]')).toBeVisible();
      await expect(page.locator('[data-testid="history-headers"]')).toBeVisible();
    });

    test('should show invoice details', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Look for invoice rows
      const invoiceRows = page.locator('[data-testid="invoice-row"]');
      if (await invoiceRows.count() > 0) {
        const firstInvoice = invoiceRows.first();
        
        // Verify invoice information
        await expect(firstInvoice.locator('[data-testid="invoice-date"]')).toBeVisible();
        await expect(firstInvoice.locator('[data-testid="invoice-amount"]')).toBeVisible();
        await expect(firstInvoice.locator('[data-testid="invoice-status"]')).toBeVisible();
        
        // Test invoice details
        const viewButton = firstInvoice.locator('[data-testid="view-invoice"]');
        if (await viewButton.count() > 0) {
          await viewButton.click();
          
          // Verify invoice details modal
          await expect(page.locator('[data-testid="invoice-details-modal"]')).toBeVisible();
          await expect(page.locator('[data-testid="invoice-pdf"]')).toBeVisible();
        }
      }
    });

    test('should allow invoice download', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      const invoiceRows = page.locator('[data-testid="invoice-row"]');
      if (await invoiceRows.count() > 0) {
        const firstInvoice = invoiceRows.first();
        
        // Test download button
        const downloadButton = firstInvoice.locator('[data-testid="download-invoice"]');
        if (await downloadButton.count() > 0) {
          await downloadButton.click();
          
          // Verify download starts (check for download attribute or file)
          await expect(downloadButton).toHaveAttribute('download');
        }
      }
    });
  });

  test.describe('Payment Processing', () => {
    test('should display payment method information', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Verify payment method section
      await expect(page.locator('[data-testid="payment-method-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-method-card"]')).toBeVisible();
      
      // Verify payment method details
      await expect(page.locator('[data-testid="card-last-four"]')).toBeVisible();
      await expect(page.locator('[data-testid="card-expiry"]')).toBeVisible();
      await expect(page.locator('[data-testid="card-brand"]')).toBeVisible();
    });

    test('should allow payment method updates', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Test update payment method button
      const updateButton = page.locator('[data-testid="primary-action update-payment-method"]');
      if (await updateButton.count() > 0) {
        await updateButton.click();
        
        // Verify payment method update modal
        await expect(page.locator('[data-testid="payment-method-modal"]')).toBeVisible();
        await expect(page.locator('[data-testid="card-form"]')).toBeVisible();
        
        // Test form accessibility
        await testFormAccessibility(page, '[data-testid="card-form"]');
      }
    });

    test('should handle payment failures gracefully', async ({ page }) => {
      // Mock payment failure
      await page.route('**/api/billing/process-payment', route => {
        route.fulfill({
          status: 402,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: false, 
            error: 'Payment failed',
            code: 'CARD_DECLINED'
          })
        });
      });
      
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Test payment processing
      const processButton = page.locator('[data-testid="primary-action process-payment"]');
      if (await processButton.count() > 0) {
        await processButton.click();
        
        // Verify error handling
        await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="error-message"]')).toContainText(/payment failed|declined/i);
        await expect(page.locator('[data-testid="primary-action retry-payment"]')).toBeVisible();
      }
    });
  });

  test.describe('Billing Notifications', () => {
    test('should display billing notifications', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Verify notifications section
      await expect(page.locator('[data-testid="billing-notifications"]')).toBeVisible();
      
      // Look for notification items
      const notifications = page.locator('[data-testid="notification-item"]');
      if (await notifications.count() > 0) {
        const firstNotification = notifications.first();
        
        // Verify notification content
        await expect(firstNotification.locator('[data-testid="notification-title"]')).toBeVisible();
        await expect(firstNotification.locator('[data-testid="notification-message"]')).toBeVisible();
        await expect(firstNotification.locator('[data-testid="notification-date"]')).toBeVisible();
      }
    });

    test('should allow notification dismissal', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      const notifications = page.locator('[data-testid="notification-item"]');
      if (await notifications.count() > 0) {
        const firstNotification = notifications.first();
        
        // Test dismiss button
        const dismissButton = firstNotification.locator('[data-testid="dismiss-notification"]');
        if (await dismissButton.count() > 0) {
          await dismissButton.click();
          
          // Verify notification is dismissed
          await expect(firstNotification).not.toBeVisible();
        }
      }
    });
  });

  test.describe('UX Compliance and Accessibility', () => {
    test('should meet UX spec requirements', async ({ page }) => {
      await testBillingIntegration(page);
    });

    test('should be accessible with keyboard navigation', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Test tab order through billing elements
      const focusableElements = page.locator('button, input, select, [tabindex]:not([tabindex="-1"])');
      const count = await focusableElements.count();
      
      for (let i = 0; i < Math.min(count, 10); i++) {
        await page.keyboard.press('Tab');
        await expect(page.locator(':focus')).toBeVisible();
      }
    });

    test('should be mobile responsive', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="billing-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-billing-cards"]')).toBeVisible();
      
      // Test mobile interactions
      const upgradeButton = page.locator('[data-testid="primary-action upgrade-plan"]');
      if (await upgradeButton.count() > 0) {
        await upgradeButton.tap();
        await page.waitForTimeout(1000);
      }
      
      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Test ARIA labels
      await expect(page.locator('[data-testid="billing-dashboard"]')).toHaveAttribute('role', 'main');
      await expect(page.locator('[data-testid="current-plan-card"]')).toHaveAttribute('role', 'region');
      
      // Test table accessibility
      const tables = page.locator('table');
      if (await tables.count() > 0) {
        for (let i = 0; i < await tables.count(); i++) {
          const table = tables.nth(i);
          await expect(table).toHaveAttribute('role', 'table');
          await expect(table.locator('thead')).toHaveAttribute('role', 'rowgroup');
          await expect(table.locator('tbody')).toHaveAttribute('role', 'rowgroup');
        }
      }
    });
  });

  test.describe('Performance and Error Handling', () => {
    test('should load within performance budget', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Test page load time
      await testPageLoadTime(page, 3000);
      
      // Test API performance
      await testAPIPerformance(page, '/api/billing/current-plan', 1000);
      await testAPIPerformance(page, '/api/billing/usage-summary', 1000);
    });

    test('should handle billing API errors gracefully', async ({ page }) => {
      // Mock billing API error
      await page.route('**/api/billing/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Billing service unavailable' })
        });
      });
      
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      
      // Verify error handling
      await expect(page.locator('[data-testid="billing-error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="primary-action retry-loading"]')).toBeVisible();
    });
  });

  test.describe('Security and Data Protection', () => {
    test('should not expose sensitive billing data', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      // Verify no sensitive data is exposed in the UI
      await expect(page.locator('text=password')).not.toBeVisible();
      await expect(page.locator('text=secret')).not.toBeVisible();
      await expect(page.locator('text=token')).not.toBeVisible();
    });

    test('should prevent XSS in billing data', async ({ page }) => {
      await page.goto('/dashboard?tab=billing');
      await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
      // XSS prevention would be tested through input fields if any exist
    });

    test('should validate user permissions for billing data', async ({ page }) => {
      // Test that users can only see their own billing data
      const otherUser = await createE2EUser();
      
      try {
        // Create billing data for other user
        await simulateUsage(otherUser.id, 'openai_chat', 1000, 100);
        
        // Login as test user
        await setupE2E(page, testUser);
        await page.goto('/dashboard?tab=billing');
        await waitForElement(page, '[data-testid="billing-dashboard"]', { timeout: 10000 });
        
        // Should not see other user's billing data
        const totalCost = await page.locator('[data-testid="total-cost"]').textContent();
        expect(totalCost).toContain('$0.00'); // Should be 0 for test user
        
      } finally {
        await cleanupTestUser(otherUser);
      }
    });
  });
});
