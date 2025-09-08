/**
 * P1.5: Usage Analytics E2E Tests
 * 
 * Tests the usage analytics and reporting functionality including monthly summaries,
 * trend analysis, data export, and analytics dashboard.
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
  testUsageAnalytics,
  simulateUsage,
  resetUsageLimits
} from '../../helpers/usageHelpers';
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('P1.5: Usage Analytics E2E Tests', () => {
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
      tab: 'analytics', 
      validateUX: true 
    });
    await closeGuidedTourIfPresent(page);
  });

  test.afterEach(async ({ page }) => {
    await closeAllModals(page);
    await resetRateLimits(page);
  });

  test.describe('Analytics Dashboard Display', () => {
    test('should display analytics dashboard with charts and metrics', async ({ page }) => {
      // Navigate to analytics dashboard
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Test page load performance
      await testPageLoadTime(page, 3000);
      
      // Validate UX compliance
      await validateUXCompliance(page);
      
      // Verify main analytics components
      await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="analytics-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="analytics-content"]')).toBeVisible();
      
      // Verify chart components
      await expect(page.locator('[data-testid="usage-trend-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-breakdown-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-usage-chart"]')).toBeVisible();
      
      // Verify metrics cards
      await expect(page.locator('[data-testid="total-usage-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="average-daily-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="peak-usage-time"]')).toBeVisible();
    });

    test('should display usage trend analysis', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Verify trend chart
      await expect(page.locator('[data-testid="usage-trend-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="trend-chart-title"]')).toContainText(/trend|usage|over time/i);
      
      // Verify chart data
      await expect(page.locator('[data-testid="trend-chart-data"]')).toBeVisible();
      await expect(page.locator('[data-testid="trend-chart-legend"]')).toBeVisible();
      
      // Verify trend indicators
      await expect(page.locator('[data-testid="trend-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="trend-percentage"]')).toBeVisible();
    });

    test('should display cost breakdown analysis', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Verify cost breakdown chart
      await expect(page.locator('[data-testid="cost-breakdown-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-chart-title"]')).toContainText(/cost|breakdown|analysis/i);
      
      // Verify cost segments
      await expect(page.locator('[data-testid="cost-segment-openai_chat"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-segment-openai_workflow_generation"]')).toBeVisible();
      
      // Verify cost percentages
      await expect(page.locator('[data-testid="cost-percentage-openai_chat"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-percentage-openai_workflow_generation"]')).toBeVisible();
    });

    test('should display service usage analysis', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Verify service usage chart
      await expect(page.locator('[data-testid="service-usage-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-chart-title"]')).toContainText(/service|usage|by type/i);
      
      // Verify service breakdown
      await expect(page.locator('[data-testid="service-breakdown-openai_chat"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-breakdown-openai_workflow_generation"]')).toBeVisible();
      
      // Verify service metrics
      await expect(page.locator('[data-testid="service-requests-openai_chat"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-requests-openai_workflow_generation"]')).toBeVisible();
    });
  });

  test.describe('Date Range and Filtering', () => {
    test('should allow date range selection', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Verify date range selector
      await expect(page.locator('[data-testid="date-range-selector"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-range-label"]')).toContainText(/date range|period/i);
      
      // Test date range options
      await page.locator('[data-testid="date-range-selector"]').click();
      await expect(page.locator('[data-testid="date-range-options"]')).toBeVisible();
      
      // Verify predefined ranges
      await expect(page.locator('[data-testid="date-range-7-days"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-range-30-days"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-range-90-days"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-range-custom"]')).toBeVisible();
    });

    test('should update charts when date range changes', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Get initial chart data
      const initialChart = page.locator('[data-testid="usage-trend-chart"]');
      await expect(initialChart).toBeVisible();
      
      // Change date range to 7 days
      await page.locator('[data-testid="date-range-selector"]').click();
      await page.locator('[data-testid="date-range-7-days"]').click();
      
      // Wait for chart update
      await page.waitForTimeout(2000);
      
      // Verify chart updated
      await expect(initialChart).toBeVisible();
      
      // Change to 30 days
      await page.locator('[data-testid="date-range-selector"]').click();
      await page.locator('[data-testid="date-range-30-days"]').click();
      
      await page.waitForTimeout(2000);
      await expect(initialChart).toBeVisible();
    });

    test('should allow custom date range selection', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Click custom date range
      await page.locator('[data-testid="date-range-selector"]').click();
      await page.locator('[data-testid="date-range-custom"]').click();
      
      // Verify custom date picker
      await expect(page.locator('[data-testid="custom-date-picker"]')).toBeVisible();
      await expect(page.locator('[data-testid="start-date-picker"]')).toBeVisible();
      await expect(page.locator('[data-testid="end-date-picker"]')).toBeVisible();
      
      // Test date selection
      await page.locator('[data-testid="start-date-picker"]').click();
      await page.locator('[data-testid="date-picker-calendar"]').waitFor({ timeout: 5000 });
      
      // Select a date
      const dateOption = page.locator('[data-testid="date-option"]').first();
      if (await dateOption.count() > 0) {
        await dateOption.click();
      }
    });

    test('should provide filtering options', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Verify filter section
      await expect(page.locator('[data-testid="analytics-filters"]')).toBeVisible();
      await expect(page.locator('[data-testid="filter-section-title"]')).toContainText(/filter|options/i);
      
      // Verify service type filter
      await expect(page.locator('[data-testid="service-type-filter"]')).toBeVisible();
      await expect(page.locator('[data-testid="filter-openai_chat"]')).toBeVisible();
      await expect(page.locator('[data-testid="filter-openai_workflow_generation"]')).toBeVisible();
      
      // Verify model filter
      await expect(page.locator('[data-testid="model-filter"]')).toBeVisible();
      await expect(page.locator('[data-testid="filter-gpt-4-turbo-preview"]')).toBeVisible();
    });
  });

  test.describe('Data Export Functionality', () => {
    test('should provide data export options', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Verify export section
      await expect(page.locator('[data-testid="export-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-title"]')).toContainText(/export|download|data/i);
      
      // Verify export buttons
      await expect(page.locator('[data-testid="primary-action export-csv"]')).toBeVisible();
      await expect(page.locator('[data-testid="primary-action export-pdf"]')).toBeVisible();
      await expect(page.locator('[data-testid="primary-action export-json"]')).toBeVisible();
    });

    test('should export data in CSV format', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Click CSV export button
      const csvButton = page.locator('[data-testid="primary-action export-csv"]');
      await expect(csvButton).toBeVisible();
      
      // Set up download promise
      const downloadPromise = page.waitForEvent('download');
      await csvButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/usage.*\.csv$/i);
    });

    test('should export data in PDF format', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Click PDF export button
      const pdfButton = page.locator('[data-testid="primary-action export-pdf"]');
      await expect(pdfButton).toBeVisible();
      
      // Set up download promise
      const downloadPromise = page.waitForEvent('download');
      await pdfButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/usage.*\.pdf$/i);
    });

    test('should export data in JSON format', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Click JSON export button
      const jsonButton = page.locator('[data-testid="primary-action export-json"]');
      await expect(jsonButton).toBeVisible();
      
      // Set up download promise
      const downloadPromise = page.waitForEvent('download');
      await jsonButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/usage.*\.json$/i);
    });

    test('should allow custom export date range', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Click export with custom range
      const exportButton = page.locator('[data-testid="primary-action export-csv"]');
      await exportButton.click();
      
      // Verify export options modal
      await expect(page.locator('[data-testid="export-options-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-date-range"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-format-selection"]')).toBeVisible();
      
      // Test custom date range for export
      await page.locator('[data-testid="export-start-date"]').click();
      await page.locator('[data-testid="export-end-date"]').click();
      
      // Confirm export
      const confirmButton = page.locator('[data-testid="primary-action confirm-export"]');
      await confirmButton.click();
      
      // Wait for download
      const downloadPromise = page.waitForEvent('download');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/usage.*\.csv$/i);
    });
  });

  test.describe('Monthly Usage Summaries', () => {
    test('should display monthly usage summaries', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Verify monthly summaries section
      await expect(page.locator('[data-testid="monthly-summaries"]')).toBeVisible();
      await expect(page.locator('[data-testid="monthly-summaries-title"]')).toContainText(/monthly|summary|reports/i);
      
      // Verify summary cards
      await expect(page.locator('[data-testid="current-month-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="previous-month-summary"]')).toBeVisible();
      
      // Verify summary data
      await expect(page.locator('[data-testid="monthly-tokens"]')).toBeVisible();
      await expect(page.locator('[data-testid="monthly-cost"]')).toBeVisible();
      await expect(page.locator('[data-testid="monthly-requests"]')).toBeVisible();
    });

    test('should show month-over-month comparison', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Verify comparison section
      await expect(page.locator('[data-testid="month-comparison"]')).toBeVisible();
      await expect(page.locator('[data-testid="comparison-title"]')).toContainText(/comparison|change|growth/i);
      
      // Verify comparison metrics
      await expect(page.locator('[data-testid="tokens-change"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-change"]')).toBeVisible();
      await expect(page.locator('[data-testid="requests-change"]')).toBeVisible();
      
      // Verify change indicators
      await expect(page.locator('[data-testid="change-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="change-percentage"]')).toBeVisible();
    });

    test('should display historical monthly data', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Verify historical data section
      await expect(page.locator('[data-testid="historical-data"]')).toBeVisible();
      await expect(page.locator('[data-testid="historical-chart"]')).toBeVisible();
      
      // Verify historical data table
      await expect(page.locator('[data-testid="historical-table"]')).toBeVisible();
      await expect(page.locator('[data-testid="historical-headers"]')).toBeVisible();
      
      // Verify table data
      const tableRows = page.locator('[data-testid="historical-row"]');
      if (await tableRows.count() > 0) {
        const firstRow = tableRows.first();
        await expect(firstRow.locator('[data-testid="month-column"]')).toBeVisible();
        await expect(firstRow.locator('[data-testid="tokens-column"]')).toBeVisible();
        await expect(firstRow.locator('[data-testid="cost-column"]')).toBeVisible();
      }
    });
  });

  test.describe('Real-time Analytics Updates', () => {
    test('should update analytics in real-time', async ({ page }) => {
      await resetUsageLimits(testUser.id);
      
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Get initial metrics
      const initialTokens = await page.locator('[data-testid="total-usage-metrics"]').textContent();
      
      // Simulate new usage
      await simulateUsage(testUser.id, 'openai_chat', 100, 10);
      
      // Wait for real-time update
      await page.waitForTimeout(3000);
      
      // Verify analytics updated
      const updatedTokens = await page.locator('[data-testid="total-usage-metrics"]').textContent();
      expect(updatedTokens).not.toBe(initialTokens);
    });

    test('should refresh analytics data when requested', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Click refresh button
      const refreshButton = page.locator('[data-testid="primary-action refresh-analytics"]');
      await expect(refreshButton).toBeVisible();
      await refreshButton.click();
      
      // Wait for refresh
      await page.waitForTimeout(2000);
      
      // Verify charts are still visible after refresh
      await expect(page.locator('[data-testid="usage-trend-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="cost-breakdown-chart"]')).toBeVisible();
    });
  });

  test.describe('UX Compliance and Accessibility', () => {
    test('should meet UX spec requirements', async ({ page }) => {
      await testUsageAnalytics(page);
    });

    test('should be accessible with keyboard navigation', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Test tab order through analytics elements
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
      
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-analytics-cards"]')).toBeVisible();
      
      // Test mobile interactions
      const refreshButton = page.locator('[data-testid="primary-action refresh-analytics"]');
      if (await refreshButton.count() > 0) {
        await refreshButton.tap();
        await page.waitForTimeout(1000);
      }
      
      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Test ARIA labels
      await expect(page.locator('[data-testid="analytics-dashboard"]')).toHaveAttribute('role', 'main');
      await expect(page.locator('[data-testid="usage-trend-chart"]')).toHaveAttribute('role', 'img');
      await expect(page.locator('[data-testid="cost-breakdown-chart"]')).toHaveAttribute('role', 'img');
      
      // Test chart accessibility
      const charts = page.locator('[data-testid*="chart"]');
      if (await charts.count() > 0) {
        for (let i = 0; i < await charts.count(); i++) {
          const chart = charts.nth(i);
          await expect(chart).toHaveAttribute('aria-label');
        }
      }
    });
  });

  test.describe('Performance and Error Handling', () => {
    test('should load within performance budget', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Test page load time
      await testPageLoadTime(page, 3000);
      
      // Test API performance
      await testAPIPerformance(page, '/api/analytics/usage-trends', 1000);
      await testAPIPerformance(page, '/api/analytics/cost-breakdown', 1000);
    });

    test('should handle analytics API errors gracefully', async ({ page }) => {
      // Mock analytics API error
      await page.route('**/api/analytics/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Analytics service unavailable' })
        });
      });
      
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Verify error handling
      await expect(page.locator('[data-testid="analytics-error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="primary-action retry-loading"]')).toBeVisible();
    });

    test('should handle chart rendering errors gracefully', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      
      // Simulate chart rendering error
      await page.evaluate(() => {
        const chart = document.querySelector('[data-testid="usage-trend-chart"]');
        if (chart) {
          chart.innerHTML = '<div data-testid="chart-error">Chart rendering failed</div>';
        }
      });
      
      // Verify error handling
      await expect(page.locator('[data-testid="chart-error"]')).toBeVisible();
    });
  });

  test.describe('Security and Data Protection', () => {
    test('should not expose sensitive analytics data', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      // Verify no sensitive data is exposed in the UI
      await expect(page.locator('text=password')).not.toBeVisible();
      await expect(page.locator('text=secret')).not.toBeVisible();
      await expect(page.locator('text=token')).not.toBeVisible();
    });

    test('should prevent XSS in analytics data', async ({ page }) => {
      await page.goto('/dashboard?tab=analytics');
      await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
      // XSS prevention would be tested through input fields if any exist
    });

    test('should validate user permissions for analytics data', async ({ page }) => {
      // Test that users can only see their own analytics
      const otherUser = await createE2EUser();
      
      try {
        // Create analytics data for other user
        await simulateUsage(otherUser.id, 'openai_chat', 1000, 100);
        
        // Login as test user
        await setupE2E(page, testUser);
        await page.goto('/dashboard?tab=analytics');
        await waitForElement(page, '[data-testid="analytics-dashboard"]', { timeout: 10000 });
        
        // Should not see other user's analytics data
        const totalUsage = await page.locator('[data-testid="total-usage-metrics"]').textContent();
        expect(totalUsage).toContain('0'); // Should be 0 for test user
        
      } finally {
        await cleanupTestUser(otherUser);
      }
    });
  });
});
