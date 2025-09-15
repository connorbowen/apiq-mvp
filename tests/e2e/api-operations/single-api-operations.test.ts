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

  test('should display Explore button in connections tab', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard?tab=connections`);
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Verify the Explore button is visible for the test connection (Try It Out is now in Explore page)
    await expect(page.locator(`[data-testid="explore-api-${testData.connection.id}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="explore-api-${testData.connection.id}"]`)).toContainText('Explore');
  });

  test('should navigate to Explore page for API testing', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard?tab=connections`);
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Wait for the connection to be visible
    await expect(page.locator(`[data-testid="connection-card"]`)).toBeVisible();
    
    // Check if the Explore button exists
    const exploreButton = page.locator(`[data-testid="explore-api-${testData.connection.id}"]`);
    await expect(exploreButton).toBeVisible();
    
    // Click the Explore button to navigate to API Explorer
    await exploreButton.click();

    // Wait for navigation to complete
    await page.waitForTimeout(1000);

    // Verify we're on the API Explorer page
    await expect(page).toHaveURL(/\/connections\/[^\/]+$/);
    await expect(page.locator('h1:has-text("API Explorer")')).toBeVisible();
    
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

  test('should execute API call from Explore page', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard?tab=connections`);
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Navigate to Explore page for API testing
    await page.locator(`[data-testid="explore-api-${testData.connection.id}"]`).click();
    await expect(page).toHaveURL(/\/connections\/[^\/]+$/);

    // Check if there are endpoints available in the API Explorer
    const executeButton = page.locator('[data-testid="primary-action execute-api-btn"]');
    const noEndpointsMessage = page.locator('text=No endpoints available');
    
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

  test('should navigate back from API Explorer', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard?tab=connections`);
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Navigate to API Explorer
    await page.locator(`[data-testid="explore-api-${testData.connection.id}"]`).click();
    await expect(page).toHaveURL(/\/connections\/[^\/]+$/);

    // Navigate back to connections tab
    await page.goBack();
    await expect(page).toHaveURL(/dashboard.*tab=connections/);
  });
});
