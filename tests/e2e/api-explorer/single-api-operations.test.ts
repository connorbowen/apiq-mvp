/**
 * P1.3: Single API Operations E2E Tests
 * 
 * Tests the ability to execute individual API calls without creating workflows.
 * This covers the "Try it out" functionality in API Explorer and quick-execute mode.
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
import { createTestData, cleanupTestData, createConnectionForm, testConnectionCreation } from '../../helpers/dataHelpers';
import { testXSSPrevention, testDataExposure } from '../../helpers/securityHelpers';
import { waitForNetworkIdle } from '../../helpers/waitHelpers';
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('P1.3: Single API Operations E2E Tests', () => {
  let testUser: TestUser;
  let testData: any;
  const createdConnectionIds: string[] = [];

  test.beforeAll(async () => {
    testUser = await createE2EUser(Role.USER, {
      email: `e2e-api-ops-${generateTestId('user')}@testuser.local`,
      password: 'e2eTestPass123',
      name: 'E2E API Operations Test User'
    });
    
    // Create test data
    testData = await createTestData({
      user: testUser,
      connection: {
        name: 'Test Petstore API',
        baseUrl: 'https://petstore3.swagger.io/api/v3',
        authType: 'NONE'
      }
    });
  });

  test.afterAll(async () => {
    // Clean up test data
    if (testData) {
      await cleanupTestData(testData);
    }
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    await setupE2E(page, testUser, { 
      tab: 'connections', 
      validateUX: true 
    });
    await closeGuidedTourIfPresent(page);
  });

  test.afterEach(async ({ page }) => {
    await closeAllModals(page);
    await resetRateLimits(page);
  });

  test.describe('API Explorer - Try It Out Functionality', () => {
    test('should display API Explorer with available endpoints', async ({ page }) => {
      // Navigate to connections tab
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Validate UX compliance
      await validateUXCompliance(page, {
        title: 'APIQ Dashboard',
        headings: 'Connections',
        validateForm: true,
        validateAccessibility: true
      });

      // Look for API Explorer section
      await expect(page.locator('[data-testid="api-explorer-section"]')).toBeVisible();
      
      // Verify endpoints are displayed
      await expect(page.locator('[data-testid="endpoint-list"]')).toBeVisible();
      
      // Check for "Try it out" buttons
      const tryItOutButtons = page.locator('[data-testid="try-it-out-btn"]');
      await expect(tryItOutButtons.first()).toBeVisible();
    });

    test('should execute GET endpoint without creating workflow', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Click on first "Try it out" button
      const firstTryButton = page.locator('[data-testid="try-it-out-btn"]').first();
      await firstTryButton.click();

      // Wait for parameter input form
      await waitForElement(page, '[data-testid="parameter-form"]', { timeout: 10000 });

      // Validate form accessibility
      await testFormAccessibility(page, {
        submitButton: 'primary-action execute-api-btn'
      });

      // Fill required parameters (if any)
      const requiredInputs = page.locator('[data-testid="parameter-form"] input[required]');
      const inputCount = await requiredInputs.count();
      
      if (inputCount > 0) {
        for (let i = 0; i < inputCount; i++) {
          const input = requiredInputs.nth(i);
          const placeholder = await input.getAttribute('placeholder');
          if (placeholder?.includes('ID') || placeholder?.includes('id')) {
            await input.fill('1');
          } else {
            await input.fill('test-value');
          }
        }
      }

      // Execute API call
      const executeButton = getPrimaryActionButton(page, 'execute-api-btn');
      await testModalSubmitLoading(page, '[data-testid="primary-action execute-api-btn"]', {
        validateLoading: true,
        timeout: 15000
      });

      // Wait for response
      await waitForElement(page, '[data-testid="api-response"]', { timeout: 15000 });

      // Validate response display
      await expect(page.locator('[data-testid="api-response"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-body"]')).toBeVisible();

      // Validate success message
      await testModalSuccessMessage(page, 'API call executed successfully');
    });

    test('should handle POST endpoint with request body', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Find a POST endpoint
      const postTryButton = page.locator('[data-testid="endpoint-method-POST"] + [data-testid="try-it-out-btn"]').first();
      await postTryButton.click();

      // Wait for parameter form
      await waitForElement(page, '[data-testid="parameter-form"]', { timeout: 10000 });

      // Fill request body if present
      const bodyTextarea = page.locator('[data-testid="request-body-textarea"]');
      if (await bodyTextarea.isVisible()) {
        await bodyTextarea.fill(JSON.stringify({
          name: 'Test Pet',
          status: 'available'
        }));
      }

      // Execute API call
      const executeButton = getPrimaryActionButton(page, 'execute-api-btn');
      await testModalSubmitLoading(page, '[data-testid="primary-action execute-api-btn"]', {
        validateLoading: true,
        timeout: 15000
      });

      // Validate response
      await waitForElement(page, '[data-testid="api-response"]', { timeout: 15000 });
      await expect(page.locator('[data-testid="response-status"]')).toBeVisible();
    });

    test('should validate API response format and display', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Execute a simple GET request
      const firstTryButton = page.locator('[data-testid="try-it-out-btn"]').first();
      await firstTryButton.click();

      await waitForElement(page, '[data-testid="parameter-form"]', { timeout: 10000 });
      
      const executeButton = getPrimaryActionButton(page, 'execute-api-btn');
      await testModalSubmitLoading(page, '[data-testid="primary-action execute-api-btn"]', {
        validateLoading: true,
        timeout: 15000
      });

      // Validate response structure
      await waitForElement(page, '[data-testid="api-response"]', { timeout: 15000 });
      
      // Check response status
      const statusElement = page.locator('[data-testid="response-status"]');
      await expect(statusElement).toBeVisible();
      
      // Check response body
      const bodyElement = page.locator('[data-testid="response-body"]');
      await expect(bodyElement).toBeVisible();
      
      // Check response headers
      const headersElement = page.locator('[data-testid="response-headers"]');
      await expect(headersElement).toBeVisible();
      
      // Validate JSON formatting
      const responseText = await bodyElement.textContent();
      expect(responseText).toBeTruthy();
    });
  });

  test.describe('Quick Execute Mode', () => {
    test('should provide quick-execute mode for one-off operations', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Look for quick-execute mode toggle
      const quickExecuteToggle = page.locator('[data-testid="quick-execute-toggle"]');
      if (await quickExecuteToggle.isVisible()) {
        await quickExecuteToggle.click();
      }

      // Verify quick-execute mode is active
      await expect(page.locator('[data-testid="quick-execute-mode"]')).toBeVisible();
      
      // Verify no workflow creation is required
      await expect(page.locator('[data-testid="workflow-creation-form"]')).not.toBeVisible();
    });

    test('should execute API call in quick-execute mode', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Enable quick-execute mode
      const quickExecuteToggle = page.locator('[data-testid="quick-execute-toggle"]');
      if (await quickExecuteToggle.isVisible()) {
        await quickExecuteToggle.click();
      }

      // Select an endpoint
      const firstTryButton = page.locator('[data-testid="try-it-out-btn"]').first();
      await firstTryButton.click();

      // Fill parameters
      await waitForElement(page, '[data-testid="parameter-form"]', { timeout: 10000 });
      
      const executeButton = getPrimaryActionButton(page, 'execute-api-btn');
      await testModalSubmitLoading(page, '[data-testid="primary-action execute-api-btn"]', {
        validateLoading: true,
        timeout: 15000
      });

      // Verify execution completed without workflow creation
      await waitForElement(page, '[data-testid="api-response"]', { timeout: 15000 });
      await expect(page.locator('[data-testid="workflow-creation-form"]')).not.toBeVisible();
    });

    test('should complete quick-execute in under 5 seconds', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      const startTime = Date.now();

      // Execute API call
      const firstTryButton = page.locator('[data-testid="try-it-out-btn"]').first();
      await firstTryButton.click();

      await waitForElement(page, '[data-testid="parameter-form"]', { timeout: 10000 });
      
      const executeButton = getPrimaryActionButton(page, 'execute-api-btn');
      await testModalSubmitLoading(page, '[data-testid="primary-action execute-api-btn"]', {
        validateLoading: true,
        timeout: 15000
      });

      await waitForElement(page, '[data-testid="api-response"]', { timeout: 15000 });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Verify execution time is under 5 seconds
      expect(executionTime).toBeLessThan(5000);
    });
  });

  test.describe('UI/UX Compliance', () => {
    test('should clearly distinguish Workflow vs Single Call modes', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Verify mode indicators are visible
      await expect(page.locator('[data-testid="workflow-mode-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="single-call-mode-indicator"]')).toBeVisible();

      // Verify current mode is clearly indicated
      const activeMode = page.locator('[data-testid="active-mode-indicator"]');
      await expect(activeMode).toBeVisible();
    });

    test('should provide clear visual feedback for API execution', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Execute API call
      const firstTryButton = page.locator('[data-testid="try-it-out-btn"]').first();
      await firstTryButton.click();

      await waitForElement(page, '[data-testid="parameter-form"]', { timeout: 10000 });
      
      const executeButton = getPrimaryActionButton(page, 'execute-api-btn');
      
      // Verify loading state
      await expect(executeButton).toHaveText(/Executing|Loading/);
      
      await testModalSubmitLoading(page, '[data-testid="primary-action execute-api-btn"]', {
        validateLoading: true,
        timeout: 15000
      });

      // Verify success state
      await waitForElement(page, '[data-testid="api-response"]', { timeout: 15000 });
      await expect(page.locator('[data-testid="execution-success"]')).toBeVisible();
    });

    test('should handle API execution errors gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Try to execute with invalid parameters to trigger error
      const firstTryButton = page.locator('[data-testid="try-it-out-btn"]').first();
      await firstTryButton.click();

      await waitForElement(page, '[data-testid="parameter-form"]', { timeout: 10000 });
      
      // Fill with invalid data
      const inputs = page.locator('[data-testid="parameter-form"] input');
      const inputCount = await inputs.count();
      for (let i = 0; i < inputCount; i++) {
        await inputs.nth(i).fill('invalid-data-that-will-cause-error');
      }

      const executeButton = getPrimaryActionButton(page, 'execute-api-btn');
      await executeButton.click();

      // Verify error handling
      await testModalErrorHandling(page, 'API execution failed');
    });
  });

  test.describe('Security & Performance', () => {
    test('should validate input sanitization in parameter forms', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      const firstTryButton = page.locator('[data-testid="try-it-out-btn"]').first();
      await firstTryButton.click();

      await waitForElement(page, '[data-testid="parameter-form"]', { timeout: 10000 });

      // Test XSS prevention
      await testXSSPrevention(page, '[data-testid="parameter-form"] input', '<script>alert("xss")</script>');
      
      // Test data exposure prevention
      await testDataExposure(page, ['[data-testid="api-response"]', '[data-testid="parameter-form"]']);
    });

    test('should meet performance requirements for API execution', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Test page load performance
      await testPageLoadTime(page, '/dashboard?tab=connections', { threshold: 3000 });

      // Test API execution performance
      const firstTryButton = page.locator('[data-testid="try-it-out-btn"]').first();
      await firstTryButton.click();

      await waitForElement(page, '[data-testid="parameter-form"]', { timeout: 10000 });
      
      const executeButton = getPrimaryActionButton(page, 'execute-api-btn');
      await testAPIPerformance(page, '/api/operations/execute', { threshold: 5000 });
    });
  });

  test.describe('Accessibility & Mobile Support', () => {
    test('should support keyboard navigation for API execution', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Test keyboard navigation
      const tryItOutVisible = await testPrimaryActionPatterns(page, 'try-it-out-btn');
      const executeApiVisible = await testPrimaryActionPatterns(page, 'execute-api-btn');
      
      expect(tryItOutVisible).toBe(true);
      expect(executeApiVisible).toBe(true);

      // Navigate using keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Should activate first try-it-out button
    });

    test('should be mobile responsive', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Verify mobile layout
      await expect(page.locator('[data-testid="api-explorer-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="try-it-out-btn"]').first()).toBeVisible();
      
      // Verify touch targets are appropriate size
      const tryButton = page.locator('[data-testid="try-it-out-btn"]').first();
      const box = await tryButton.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44); // Minimum touch target size
    });
  });
});
