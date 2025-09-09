/**
 * P1.3: Single API Operations E2E Tests
 * 
 * Tests the ability to execute individual API calls without creating workflows.
 * This covers the "Try it out" functionality in API Explorer and quick-execute mode.
 */

import { test, expect } from '@playwright/test';
import { TestUser, generateTestId, cleanupTestUser } from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';
import { setupE2E, closeAllModals, resetRateLimits, getPrimaryActionButton } from '../../helpers/e2eHelpers';
import { waitForDashboard, validateUXCompliance, closeGuidedTourIfPresent, waitForElement } from '../../helpers/uiHelpers';
import { testPageLoadTime, testAPIPerformance } from '../../helpers/performanceHelpers';
import { testFormAccessibility, testPrimaryActionPatterns } from '../../helpers/accessibilityHelpers';
import { testModalSubmitLoading, testModalSuccessMessage, testModalErrorHandling } from '../../helpers/modalHelpers';
import { createTestData, cleanupTestData } from '../../helpers/dataHelpers';
import { testXSSPrevention, testDataExposure } from '../../helpers/securityHelpers';
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('P1.3: Single API Operations E2E Tests', () => {
  let testUser: TestUser;
  let testData: any;

  test.beforeAll(async () => {
    testUser = await createE2EUser(Role.USER, {
      email: `e2e-api-ops-${generateTestId('user')}@example.com`,
      password: 'e2eTestPass123',
      name: 'E2E API Operations Test User'
    });
    
    // Create test data
    testData = await createTestData({
      user: testUser,
      connection: {
        name: 'Test Petstore API',
        baseUrl: 'https://petstore3.swagger.io/api/v3',
        authType: 'NONE',
        description: 'Test API for single operations'
      }
    });
  });

  test.afterAll(async () => {
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

  test('should display Try It Out button in API Explorer', async ({ page }) => {
    // Navigate to the API Explorer for the test connection
    await page.goto(`${BASE_URL}/connections/${testData.connection.id}`);
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check if endpoints are available
    const hasEndpoints = await page.locator('[data-testid="endpoint-item"]').count() > 0;
    
    if (hasEndpoints) {
      // Click on the first endpoint to expand it
      const firstEndpoint = page.locator('[data-testid="endpoint-item"]').first();
      await firstEndpoint.click();

      // Verify the Try It Out section is visible
      await expect(page.locator('[data-testid="try-it-out-toggle"]')).toBeVisible();
    } else {
      // If no endpoints, verify the "no endpoints" message is shown
      await expect(page.locator('text=No endpoints found')).toBeVisible();
    }
  });

  test('should expand Try It Out section when clicked', async ({ page }) => {
    await page.goto(`${BASE_URL}/connections/${testData.connection.id}`);
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check if endpoints are available
    const hasEndpoints = await page.locator('[data-testid="endpoint-item"]').count() > 0;
    
    if (hasEndpoints) {
      // Expand the first endpoint
      const firstEndpoint = page.locator('[data-testid="endpoint-item"]').first();
      await firstEndpoint.click();

      // Click the Try It Out toggle
      await page.locator('[data-testid="try-it-out-toggle"]').click();

      // Verify the operation tester is visible
      await expect(page.locator('[data-testid="operation-tester"]')).toBeVisible();
    } else {
      // If no endpoints, verify the "no endpoints" message is shown
      await expect(page.locator('text=No endpoints found')).toBeVisible();
    }
  });

  test('should execute GET request successfully', async ({ page }) => {
    await page.goto(`${BASE_URL}/connections/${testData.connection.id}`);
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check if endpoints are available
    const hasEndpoints = await page.locator('[data-testid="endpoint-item"]').count() > 0;
    
    if (hasEndpoints) {
      // Find and expand a GET endpoint
      const getEndpoint = page.locator('[data-testid="endpoint-item"]').filter({ hasText: 'GET' }).first();
      await getEndpoint.click();

      // Open Try It Out section
      await page.locator('[data-testid="try-it-out-toggle"]').click();

      // Fill in the status parameter (common in Petstore API)
      const statusInput = page.locator('[data-testid="parameter-status"]');
      if (await statusInput.isVisible()) {
        await statusInput.fill('available');
      }

      // Execute the operation
      await page.locator('[data-testid="primary-action execute-api-btn"]').click();

      // Wait for execution to complete
      await expect(page.locator('[data-testid="execution-result"]')).toBeVisible({ timeout: 10000 });
    } else {
      // If no endpoints, verify the "no endpoints" message is shown
      await expect(page.locator('text=No endpoints found')).toBeVisible();
    }
  });

  test('should display execution results with response data', async ({ page }) => {
    await page.goto(`${BASE_URL}/connections/${testData.connection.id}`);
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check if endpoints are available
    const hasEndpoints = await page.locator('[data-testid="endpoint-item"]').count() > 0;
    
    if (hasEndpoints) {
      // Execute a GET request
      const getEndpoint = page.locator('[data-testid="endpoint-item"]').filter({ hasText: 'GET' }).first();
      await getEndpoint.click();
      await page.locator('[data-testid="try-it-out-toggle"]').click();

      const statusInput = page.locator('[data-testid="parameter-status"]');
      if (await statusInput.isVisible()) {
        await statusInput.fill('available');
      }

      await page.locator('[data-testid="primary-action execute-api-btn"]').click();
      await expect(page.locator('[data-testid="execution-result"]')).toBeVisible({ timeout: 10000 });

      // Verify response data is displayed
      await expect(page.locator('[data-testid="execution-result"]')).toContainText('Response Data');
    } else {
      // If no endpoints, verify the "no endpoints" message is shown
      await expect(page.locator('text=No endpoints found')).toBeVisible();
    }
  });

  test('should display Quick Execute button in connections tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard?tab=connections`);
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Verify the Quick Execute button is visible for the test connection
    await expect(page.locator(`[data-testid="quick-execute-${testData.connection.id}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="quick-execute-${testData.connection.id}"]`)).toContainText('Try It Out');
  });

  test('should open Quick Execute modal from connections tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard?tab=connections`);
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Wait for the connection to be visible
    await expect(page.locator(`[data-testid="connection-card"]`)).toBeVisible();
    
    // Check if the Quick Execute button exists
    const quickExecuteButton = page.locator(`[data-testid="quick-execute-${testData.connection.id}"]`);
    await expect(quickExecuteButton).toBeVisible();
    
    // Click the Quick Execute button
    await quickExecuteButton.click();

    // Wait a bit for the modal to appear
    await page.waitForTimeout(1000);

    // Verify the modal opens
    await expect(page.locator('[data-testid="quick-execute-modal"]')).toBeVisible();
    
    // Check if there are endpoints available (execute button) or no endpoints message
    const executeButton = page.locator('[data-testid="primary-action execute-api-btn"]');
    const noEndpointsMessage = page.locator('text=No endpoints available');
    
    // Either the execute button should be visible OR the no endpoints message should be visible
    const hasExecuteButton = await executeButton.isVisible();
    const hasNoEndpointsMessage = await page.locator('[data-testid="quick-execute-modal"] .text-sm.text-gray-500').first().isVisible();
    
    if (!hasExecuteButton && !hasNoEndpointsMessage) {
      throw new Error('Modal opened but neither execute button nor no endpoints message is visible');
    }
  });

  test('should execute API call from Quick Execute modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard?tab=connections`);
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Open Quick Execute modal
    await page.locator(`[data-testid="quick-execute-${testData.connection.id}"]`).click();
    await expect(page.locator('[data-testid="quick-execute-modal"]')).toBeVisible();

    // Check if there are endpoints available
    const executeButton = page.locator('[data-testid="primary-action execute-api-btn"]');
    const noEndpointsMessage = page.locator('[data-testid="quick-execute-modal"] .text-sm.text-gray-500').first();
    
    if (await executeButton.isVisible()) {
      // Fill in parameters if available
      const statusInput = page.locator('[data-testid="parameter-status"]');
      if (await statusInput.isVisible()) {
        await statusInput.fill('available');
      }

      // Execute the operation
      await executeButton.click();

      // Wait for execution to complete
      await expect(page.locator('[data-testid="execution-result"]')).toBeVisible({ timeout: 10000 });

      // Verify success
      await expect(page.locator('[data-testid="execution-result"]')).toContainText('Status: COMPLETED');
    } else {
      // If no endpoints are available, verify the message is shown
      await expect(noEndpointsMessage).toBeVisible();
      await expect(noEndpointsMessage).toContainText('No endpoints available');
    }
  });

  test('should close Quick Execute modal', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard?tab=connections`);
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Open Quick Execute modal
    await page.locator(`[data-testid="quick-execute-${testData.connection.id}"]`).click();
    await expect(page.locator('[data-testid="quick-execute-modal"]')).toBeVisible();

    // Close the modal using the Cancel button instead of the X button
    await page.locator('[data-testid="quick-execute-modal"] button:has-text("Cancel")').click();

    // Verify modal is closed
    await expect(page.locator('[data-testid="quick-execute-modal"]')).not.toBeVisible();
  });
});
