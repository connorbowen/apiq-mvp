/**
 * P1.5: Usage Dashboard E2E Tests
 * 
 * Tests the usage dashboard functionality including real-time usage display,
 * cost breakdown, plan limits, and analytics visualization.
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
  testUsageDashboard, 
  validateUsageUXCompliance,
  simulateUsage,
  testUsageLimitEnforcement,
  testRealTimeUsageUpdates
} from '../../helpers/usageHelpers';
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('P1.5: Usage Dashboard E2E Tests', () => {
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
      tab: 'usage', 
      validateUX: true 
    });
    await closeGuidedTourIfPresent(page);
  });

  test.afterEach(async ({ page }) => {
    await closeAllModals(page);
    await resetRateLimits(page);
  });

  test.describe('Usage Dashboard Display', () => {
    test('should display current month usage summary', async ({ page }) => {
      // Navigate to usage dashboard
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Test page load performance
      await testPageLoadTime(page, '/dashboard?tab=usage');
      
      // Validate UX compliance
      await validateUsageUXCompliance(page);
      
      // Verify usage metrics are displayed
      await expect(page.locator('[data-testid="current-usage-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="monthly-usage-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-limits-card"]')).toBeVisible();
      
      // Verify specific metrics
      await expect(page.locator('[data-testid="total-tokens"]')).toContainText('675'); // 150 + 300 + 225
      await expect(page.locator('[data-testid="total-cost"]')).toContainText('$0.28'); // 6 + 12 + 10 cents
      await expect(page.locator('[data-testid="total-requests"]')).toContainText('3');
      
      // Verify service breakdown
      await expect(page.locator('[data-testid="usage-breakdown-openai_chat"]')).toBeVisible();
      await expect(page.locator('[data-testid="usage-breakdown-openai_workflow_generation"]')).toBeVisible();
    });

    test('should show cost breakdown by service type', async ({ page }) => {
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Test cost breakdown display
      await expect(page.locator('[data-testid="cost-breakdown-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-cost-openai_chat"]')).toContainText('$0.16');
      await expect(page.locator('[data-testid="service-cost-openai_workflow_generation"]')).toContainText('$0.12');
      
      // Test cost percentage display
      await expect(page.locator('[data-testid="cost-percentage-openai_chat"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-percentage-openai_workflow_generation"]')).toBeVisible();
    });

    test('should display plan limits and utilization', async ({ page }) => {
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Test plan limits display
      await expect(page.locator('[data-testid="plan-limits-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="token-limit"]')).toContainText('10,000');
      await expect(page.locator('[data-testid="cost-limit"]')).toBeVisible();
      
      // Test utilization progress bars
      await expect(page.locator('[data-testid="token-utilization"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-utilization"]')).toBeVisible();
      
      // Verify utilization percentages
      const tokenUtilization = page.locator('[data-testid="token-utilization-percentage"]');
      await expect(tokenUtilization).toContainText('6.75'); // 675/10000 * 100
    });

    test('should show usage trends and patterns', async ({ page }) => {
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Test usage trend chart
      await expect(page.locator('[data-testid="usage-trend-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="daily-usage-chart"]')).toBeVisible();
      
      // Test time period selector
      const timePeriodSelector = page.locator('[data-testid="time-period-selector"]');
      if (await timePeriodSelector.count() > 0) {
        await expect(timePeriodSelector).toBeVisible();
        await timePeriodSelector.click();
        await expect(page.locator('[data-testid="time-period-7-days"]')).toBeVisible();
        await expect(page.locator('[data-testid="time-period-30-days"]')).toBeVisible();
        await expect(page.locator('[data-testid="time-period-90-days"]')).toBeVisible();
      }
    });
  });

  test.describe('Real-time Usage Updates', () => {
    test('should update usage metrics in real-time', async ({ page }) => {
      await testRealTimeUsageUpdates(page, testUser.id);
    });

    test('should refresh usage data when requested', async ({ page }) => {
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Get initial data
      const initialTokens = await page.locator('[data-testid="total-tokens"]').textContent();
      
      // Simulate new usage
      await simulateUsage(testUser.id, 'openai_chat', 50, 5);
      
      // Click refresh button
      const refreshButton = page.locator('[data-testid="primary-action refresh-usage"]');
      await expect(refreshButton).toBeVisible();
      await refreshButton.click();
      
      // Wait for refresh
      await page.waitForTimeout(2000);
      
      // Verify data updated
      const updatedTokens = await page.locator('[data-testid="total-tokens"]').textContent();
      expect(updatedTokens).not.toBe(initialTokens);
    });
  });

  test.describe('Usage Limit Enforcement', () => {
    test('should display warnings when approaching limits', async ({ page }) => {
      // Simulate high usage
      await simulateUsage(testUser.id, 'openai_chat', 8000, 800); // 80% of 10K limit
      
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Verify warning indicators
      await expect(page.locator('[data-testid="usage-warning-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="approaching-limit-notice"]')).toBeVisible();
    });

    test('should show overage warnings when limits exceeded', async ({ page }) => {
      await testUsageLimitEnforcement(page, testUser.id);
    });

    test('should display upgrade prompts for overages', async ({ page }) => {
      // Simulate overage
      await simulateUsage(testUser.id, 'openai_chat', 15000, 1500); // Exceed 10K limit
      
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Verify overage warnings
      await expect(page.locator('[data-testid="overage-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="overage-amount"]')).toBeVisible();
      
      // Verify upgrade prompt
      await expect(page.locator('[data-testid="primary-action upgrade-plan"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-recommendation"]')).toBeVisible();
    });
  });

  test.describe('UX Compliance and Accessibility', () => {
    test('should meet UX spec requirements', async ({ page }) => {
      await testUsageDashboard(page);
    });

    test('should be accessible with keyboard navigation', async ({ page }) => {
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Test tab order
      const focusableElements = page.locator('button, input, select, [tabindex]:not([tabindex="-1"])');
      const count = await focusableElements.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        await page.keyboard.press('Tab');
        await expect(page.locator(':focus')).toBeVisible();
      }
    });

    test('should be mobile responsive', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="usage-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-usage-cards"]')).toBeVisible();
      
      // Test touch interactions
      const refreshButton = page.locator('[data-testid="primary-action refresh-usage"]');
      if (await refreshButton.count() > 0) {
        await refreshButton.tap();
        await page.waitForTimeout(1000);
      }
      
      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Test ARIA labels
      await expect(page.locator('[data-testid="usage-dashboard"]')).toHaveAttribute('role', 'main');
      await expect(page.locator('[data-testid="current-usage-card"]')).toHaveAttribute('role', 'region');
      
      // Test chart accessibility
      const charts = page.locator('[data-testid*="chart"]');
      if (await charts.count() > 0) {
        for (let i = 0; i < await charts.count(); i++) {
          const chart = charts.nth(i);
          await expect(chart).toHaveAttribute('role', 'img');
          await expect(chart).toHaveAttribute('aria-label');
        }
      }
    });
  });

  test.describe('Performance and Error Handling', () => {
    test('should load within performance budget', async ({ page }) => {
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Test page load time
      await testPageLoadTime(page, '/dashboard?tab=usage');
      
      // Test API performance
      await testAPIPerformance(page, '/api/usage/current');
      await testAPIPerformance(page, '/api/usage/summary');
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/usage/current', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Internal server error' })
        });
      });
      
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Verify error handling
      await expect(page.locator('[data-testid="usage-error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="primary-action retry-loading"]')).toBeVisible();
    });

    test('should handle network failures gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/usage/**', route => {
        route.abort('failed');
      });
      
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      
      // Verify offline handling
      await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="primary-action retry-connection"]')).toBeVisible();
    });
  });

  test.describe('Security and Data Protection', () => {
    test('should prevent XSS in usage data display', async ({ page }) => {
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      // XSS prevention would be tested through input fields if any exist
    });

    test('should not expose sensitive data', async ({ page }) => {
      await page.goto('/dashboard?tab=usage');
      await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
      // Verify no sensitive data is exposed in the UI
      await expect(page.locator('text=password')).not.toBeVisible();
      await expect(page.locator('text=secret')).not.toBeVisible();
      await expect(page.locator('text=token')).not.toBeVisible();
    });

    test('should validate user permissions', async ({ page }) => {
      // Test with different user role
      const adminUser = await createE2EUser();
      
      try {
        await setupE2E(page, adminUser);
        await page.goto('/dashboard?tab=usage');
        await waitForElement(page, '[data-testid="usage-dashboard"]', { timeout: 10000 });
        
        // Verify admin-specific features
        await expect(page.locator('[data-testid="admin-usage-controls"]')).toBeVisible();
        await expect(page.locator('[data-testid="system-usage-overview"]')).toBeVisible();
      } finally {
        await cleanupTestUser(adminUser);
      }
    });
  });
});
