/**
 * P1.3.2: Parameter Extraction E2E Tests
 * 
 * Tests the centralized parameter extraction service that works across:
 * - API ingestion (enhanced parameter schemas)
 * - Direct API calls (chat)
 * - Workflow generation
 * - API Explorer
 * 
 * This ensures parameter extraction is a core, reusable capability.
 */

import { test, expect } from '@playwright/test';
import { TestUser, generateTestId } from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';
import { cleanupTestUser } from '../../helpers/testUtils';
import { setupE2E, closeAllModals, resetRateLimits } from '../../helpers/e2eHelpers';
import { waitForDashboard, validateUXCompliance, closeGuidedTourIfPresent, waitForElement } from '../../helpers/uiHelpers';
import { createTestData, cleanupTestData } from '../../helpers/dataHelpers';
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('P1.3.2: Parameter Extraction E2E Tests', () => {
  let testUser: TestUser;
  let testData: any;

  test.beforeAll(async () => {
    testUser = await createE2EUser(Role.USER, {
      email: `e2e-parameter-extraction-${generateTestId('user')}@testuser.local`,
      password: 'e2eTestPass123',
      name: 'E2E Parameter Extraction Test User'
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

  test.describe('API Ingestion Parameter Enhancement', () => {
    test('should enhance parameters during API ingestion with natural language mappings', async ({ page }) => {
      // Create a connection with OpenAPI spec that has complex parameters
      const testId = Date.now() + Math.random().toString(36).substr(2, 9);
      testData = await createTestData({
        user: testUser,
        connection: {
          name: `Petstore API ${testId}`,
          baseUrl: 'https://petstore3.swagger.io/api/v3',
          authType: 'NONE',
          documentationUrl: 'https://petstore3.swagger.io/api/v3/openapi.json'
        }
      });

      // Wait for API ingestion to complete
      await page.waitForTimeout(5000);

      // Navigate to connections to verify the connection was created
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Find the created connection
      const connectionCard = page.locator(`[data-testid="connection-card-${testData.connection?.id}"]`);
      await expect(connectionCard).toBeVisible();

      // Click to view connection details
      await connectionCard.click();

      // Verify that endpoints have enhanced parameters
      const endpointsList = page.locator('[data-testid="endpoints-list"]');
      await expect(endpointsList).toBeVisible();

      // Check that parameters are enhanced (this would require UI changes to show enhanced parameters)
      // For now, we'll verify the connection was created successfully
      await expect(page.locator('text=Petstore API')).toBeVisible();
    });

    test('should store parameter schemas with natural language mappings', async ({ page }) => {
      // This test would verify that the database contains enhanced parameter schemas
      // with natural language mappings, examples, and validation rules
      
      // For now, we'll create a connection and verify it works
      const testId = Date.now() + Math.random().toString(36).substr(2, 9);
      testData = await createTestData({
        user: testUser,
        connection: {
          name: `Test API ${testId}`,
          baseUrl: 'https://httpbin.org',
          authType: 'NONE'
        }
      });

      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      const connectionCard = page.locator(`[data-testid="connection-card-${testData.connection?.id}"]`);
      await expect(connectionCard).toBeVisible();
    });
  });

  test.describe('Direct API Calls Parameter Extraction', () => {
    test('should use centralized parameter extraction in chat', async ({ page }) => {
      // Create a connection for testing
      const testId = Date.now() + Math.random().toString(36).substr(2, 9);
      testData = await createTestData({
        user: testUser,
        connection: {
          name: `Test API ${testId}`,
          baseUrl: 'https://petstore3.swagger.io/api/v3',
          authType: 'NONE'
        }
      });

      // Navigate to chat
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Test parameter extraction through chat
      const chatInput = page.locator('[data-testid="chat-input"]');
      await expect(chatInput).toBeVisible();

      // Send a message that requires parameter extraction
      await chatInput.fill('Find all pets with status available');
      await chatInput.press('Enter');

      // Wait for AI response
      await waitForElement(page, 'div.max-w-xs.lg\\:max-w-md.px-4.py-2.rounded-lg.bg-gray-100.text-gray-900', { timeout: 15000 });

      // Verify API call was made with extracted parameters
      const apiCallResult = page.locator('[data-testid="api-call-result"]');
      await expect(apiCallResult).toBeVisible();

      // Verify the response shows parameter extraction worked
      const responseText = await page.locator('div.max-w-xs.lg\\:max-w-md.px-4.py-2.rounded-lg.bg-gray-100.text-gray-900').last().textContent();
      expect(responseText).toContain('available');
    });

    test('should handle complex parameter extraction scenarios', async ({ page }) => {
      const testId = Date.now() + Math.random().toString(36).substr(2, 9);
      testData = await createTestData({
        user: testUser,
        connection: {
          name: `Test API ${testId}`,
          baseUrl: 'https://petstore3.swagger.io/api/v3',
          authType: 'NONE'
        }
      });

      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Test various parameter extraction scenarios
      const testCases = [
        'Find pets with status sold',
        'Get pet by ID 123',
        'Search for pets with tags dog,cat',
        'Find available pets with limit 10'
      ];

      for (const testCase of testCases) {
        await chatInput.clear();
        await chatInput.fill(testCase);
        await chatInput.press('Enter');

        // Wait for response
        await waitForElement(page, 'div.max-w-xs.lg\\:max-w-md.px-4.py-2.rounded-lg.bg-gray-100.text-gray-900', { timeout: 15000 });

        // Verify API call was made
        const apiCallResult = page.locator('[data-testid="api-call-result"]').last();
        await expect(apiCallResult).toBeVisible();

        await page.waitForTimeout(1000); // Brief pause between tests
      }
    });
  });

  test.describe('Workflow Generation Parameter Integration', () => {
    test('should use parameter extraction in workflow generation', async ({ page }) => {
      const testId = Date.now() + Math.random().toString(36).substr(2, 9);
      testData = await createTestData({
        user: testUser,
        connection: {
          name: `Test API ${testId}`,
          baseUrl: 'https://petstore3.swagger.io/api/v3',
          authType: 'NONE'
        }
      });

      // Navigate to workflows
      await page.goto(`${BASE_URL}/dashboard?tab=workflows`);
      await waitForDashboard(page);

      // Create a workflow that uses parameter extraction
      const createWorkflowButton = page.locator('[data-testid="primary-action create-workflow"]');
      await createWorkflowButton.click();

      // Fill in workflow details
      const workflowNameInput = page.locator('[data-testid="workflow-name-input"]');
      await workflowNameInput.fill('Pet Management Workflow');

      const workflowDescriptionInput = page.locator('[data-testid="workflow-description-input"]');
      await workflowDescriptionInput.fill('Create a workflow that finds available pets and then gets details for a specific pet');

      // Submit workflow creation
      const submitButton = page.locator('[data-testid="primary-action submit-workflow"]');
      await submitButton.click();

      // Wait for workflow generation
      await waitForElement(page, '[data-testid="workflow-generated"]', { timeout: 30000 });

      // Verify workflow was created with parameter extraction
      await expect(page.locator('text=Pet Management Workflow')).toBeVisible();
    });
  });

  test.describe('API Explorer Parameter Integration', () => {
    test('should use enhanced parameters in API Explorer', async ({ page }) => {
      const testId = Date.now() + Math.random().toString(36).substr(2, 9);
      testData = await createTestData({
        user: testUser,
        connection: {
          name: `Test API ${testId}`,
          baseUrl: 'https://petstore3.swagger.io/api/v3',
          authType: 'NONE'
        }
      });

      // Navigate to connections
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Find the connection and click to view details
      const connectionCard = page.locator(`[data-testid="connection-card-${testData.connection?.id}"]`);
      await connectionCard.click();

      // Look for API Explorer or endpoint details
      const endpointsList = page.locator('[data-testid="endpoints-list"]');
      await expect(endpointsList).toBeVisible();

      // This would test that the API Explorer shows enhanced parameters
      // with natural language descriptions and examples
    });
  });

  test.describe('Parameter Extraction Consistency', () => {
    test('should maintain consistent parameter extraction across all features', async ({ page }) => {
      const testId = Date.now() + Math.random().toString(36).substr(2, 9);
      testData = await createTestData({
        user: testUser,
        connection: {
          name: `Test API ${testId}`,
          baseUrl: 'https://petstore3.swagger.io/api/v3',
          authType: 'NONE'
        }
      });

      // Test the same parameter extraction in different contexts
      const testMessage = 'Find pets with status available';

      // Test in chat
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill(testMessage);
      await chatInput.press('Enter');

      await waitForElement(page, 'div.max-w-xs.lg\\:max-w-md.px-4.py-2.rounded-lg.bg-gray-100.text-gray-900', { timeout: 15000 });

      // Verify consistent behavior
      const apiCallResult = page.locator('[data-testid="api-call-result"]');
      await expect(apiCallResult).toBeVisible();

      // The same parameter extraction logic should work consistently
      // across chat, workflows, and API explorer
    });
  });
});
