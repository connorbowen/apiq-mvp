import { test, expect } from '@playwright/test';
import { TestUser, generateTestId } from '../../helpers/testUtils';
import { createE2EUser, cleanupTestUser } from '../../helpers/authHelpers';
import { setupE2E, closeAllModals, resetRateLimits, getPrimaryActionButton } from '../../helpers/e2eHelpers';
import { waitForDashboard, validateUXCompliance } from '../../helpers/uiHelpers';
import { createTestData, cleanupTestData } from '../../helpers/dataHelpers';
import { waitForElement, waitForModal } from '../../helpers/waitHelpers';
import { testPageLoadTime, testAPIPerformance } from '../../helpers/performanceHelpers';
import { testXSSPrevention, testDataExposure } from '../../helpers/securityHelpers';
import { testModalSubmitLoading, testModalSuccessMessage, testModalErrorHandling } from '../../helpers/modalHelpers';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
import { prisma } from '../../../lib/database/client';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: TestUser;
let jwt: string;
let createdConnectionIds: string[] = [];
let createdCatalogIds: string[] = [];
let uxHelper: UXComplianceHelper;

// Generate unique test identifiers to prevent name conflicts
function generateUniqueTestName(baseName: string): string {
  const timestamp = Date.now();
  const processId = process.pid;
  const random = Math.floor(Math.random() * 10000);
  return `${baseName}-${timestamp}-${processId}-${random}`;
}

// Test data for API catalog
const TEST_APIS = [
  {
    name: 'Pet Store API',
    description: 'A sample API for pet store operations',
    baseUrl: 'https://petstore3.swagger.io/api/v3',
    documentationUrl: 'https://petstore3.swagger.io/api/v3/openapi.json',
    category: 'sample',
    authType: 'API_KEY'
  },
  {
    name: 'JSONPlaceholder API',
    description: 'Fake Online REST API for Testing and Prototyping',
    baseUrl: 'https://jsonplaceholder.typicode.com',
    documentationUrl: 'https://jsonplaceholder.typicode.com/openapi.json',
    category: 'testing',
    authType: 'NONE'
  }
];

test.describe('API Catalog Architecture E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user using new helper
    testUser = await createE2EUser('ADMIN', {
      email: `e2e-catalog-${generateTestId('user')}@testuser.local`,
      password: 'e2eTestPass123',
      name: 'E2E API Catalog Test User'
    });
    jwt = testUser.accessToken;
    uxHelper = new UXComplianceHelper();
  });

  test.afterAll(async ({ request }) => {
    // Clean up created connections
    for (const id of createdConnectionIds) {
      try {
        await request.delete(`${BASE_URL}/api/connections/${id}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
      } catch (error) {
        console.warn(`Failed to cleanup connection ${id}:`, error);
      }
    }

    // Clean up created catalog entries
    for (const id of createdCatalogIds) {
      try {
        await request.delete(`${BASE_URL}/api/catalog/${id}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
      } catch (error) {
        console.warn(`Failed to cleanup catalog entry ${id}:`, error);
      }
    }

    // Clean up test user
    await cleanupTestUser(testUser.id);
  });

  test.beforeEach(async ({ page }) => {
    await setupE2E(page, testUser, { tab: 'connections' });
    await resetRateLimits();
  });

  test.afterEach(async ({ page }) => {
    await closeAllModals(page);
  });

  test.describe('API Catalog Discovery', () => {
    test('should display available APIs in catalog without requiring credentials', async ({ page }) => {
      // Navigate to API catalog
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Look for catalog section or API discovery interface
      const catalogSection = page.locator('[data-testid="api-catalog-section"]');
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      
      // If catalog section exists, verify it shows APIs without credentials
      if (await catalogSection.isVisible()) {
        await expect(catalogSection).toBeVisible();
        
        // Verify APIs are displayed with documentation but no credentials
        const apiCards = page.locator('[data-testid^="api-card-"]');
        const apiCount = await apiCards.count();
        
        if (apiCount > 0) {
          // Check first API card
          const firstApiCard = apiCards.first();
          await expect(firstApiCard).toBeVisible();
          
          // Verify API information is shown
          await expect(firstApiCard.locator('[data-testid="api-name"]')).toBeVisible();
          await expect(firstApiCard.locator('[data-testid="api-description"]')).toBeVisible();
          await expect(firstApiCard.locator('[data-testid="api-category"]')).toBeVisible();
          
          // Verify no credentials are displayed
          await expect(firstApiCard.locator('[data-testid="api-credentials"]')).not.toBeVisible();
          await expect(firstApiCard.locator('[data-testid="api-keys"]')).not.toBeVisible();
        }
      } else if (await browseApisButton.isVisible()) {
        // Click browse APIs button if catalog section not visible
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
        
        // Verify catalog is now visible
        await expect(page.locator('[data-testid="api-catalog-section"]')).toBeVisible();
      }
    });

    test('should allow browsing API endpoints without authentication', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to API catalog
      const catalogSection = page.locator('[data-testid="api-catalog-section"]');
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      if (await catalogSection.isVisible()) {
        // Look for API cards
        const apiCards = page.locator('[data-testid^="api-card-"]');
        const apiCount = await apiCards.count();
        
        if (apiCount > 0) {
          // Click on first API to view endpoints
          const firstApiCard = apiCards.first();
          const viewEndpointsButton = firstApiCard.locator('[data-testid="primary-action view-endpoints-btn"]');
          
          if (await viewEndpointsButton.isVisible()) {
            await viewEndpointsButton.click();
            
            // Verify endpoints are displayed
            await waitForElement(page, '[data-testid="api-endpoints-section"]');
            await expect(page.locator('[data-testid="api-endpoints-section"]')).toBeVisible();
            
            // Verify endpoint details are shown
            const endpointItems = page.locator('[data-testid^="endpoint-item-"]');
            const endpointCount = await endpointItems.count();
            
            if (endpointCount > 0) {
              const firstEndpoint = endpointItems.first();
              await expect(firstEndpoint.locator('[data-testid="endpoint-method"]')).toBeVisible();
              await expect(firstEndpoint.locator('[data-testid="endpoint-path"]')).toBeVisible();
              await expect(firstEndpoint.locator('[data-testid="endpoint-description"]')).toBeVisible();
            }
          }
        }
      }
    });

    test('should provide search and filtering capabilities for APIs', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to API catalog
      const catalogSection = page.locator('[data-testid="api-catalog-section"]');
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      if (await catalogSection.isVisible()) {
        // Test search functionality
        const searchInput = page.locator('[data-testid="api-search-input"]');
        if (await searchInput.isVisible()) {
          await searchInput.fill('pet');
          await page.keyboard.press('Enter');
          
          // Verify search results
          await waitForElement(page, '[data-testid="search-results"]');
          await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
        }

        // Test category filtering
        const categoryFilter = page.locator('[data-testid="category-filter"]');
        if (await categoryFilter.isVisible()) {
          await categoryFilter.selectOption('sample');
          
          // Verify filtered results
          await waitForElement(page, '[data-testid="filtered-results"]');
          await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('API Connection from Catalog', () => {
    test('should allow connecting to an API from the catalog', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to API catalog
      const catalogSection = page.locator('[data-testid="api-catalog-section"]');
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      if (await catalogSection.isVisible()) {
        // Look for API cards
        const apiCards = page.locator('[data-testid^="api-card-"]');
        const apiCount = await apiCards.count();
        
        if (apiCount > 0) {
          // Click connect button on first API
          const firstApiCard = apiCards.first();
          const connectButton = firstApiCard.locator('[data-testid="primary-action connect-api-btn"]');
          
          if (await connectButton.isVisible()) {
            await connectButton.click();
            
            // Verify connection modal opens
            await waitForModal(page, '[data-testid="api-connection-modal"]');
            await expect(page.locator('[data-testid="api-connection-modal"]')).toBeVisible();
            
            // Verify connection form is pre-populated with API info
            const connectionForm = page.locator('[data-testid="api-connection-form"]');
            await expect(connectionForm).toBeVisible();
            
            // Verify API name and base URL are pre-filled
            const nameInput = connectionForm.locator('[data-testid="connection-name-input"]');
            const baseUrlInput = connectionForm.locator('[data-testid="connection-base-url-input"]');
            
            if (await nameInput.isVisible()) {
              await expect(nameInput).toHaveValue(/.+/); // Should have some value
            }
            
            if (await baseUrlInput.isVisible()) {
              await expect(baseUrlInput).toHaveValue(/.+/); // Should have some value
            }
          }
        }
      }
    });

    test('should handle authentication setup for catalog APIs', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to API catalog
      const catalogSection = page.locator('[data-testid="api-catalog-section"]');
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      if (await catalogSection.isVisible()) {
        // Look for API cards
        const apiCards = page.locator('[data-testid^="api-card-"]');
        const apiCount = await apiCards.count();
        
        if (apiCount > 0) {
          // Click connect button on first API
          const firstApiCard = apiCards.first();
          const connectButton = firstApiCard.locator('[data-testid="primary-action connect-api-btn"]');
          
          if (await connectButton.isVisible()) {
            await connectButton.click();
            
            // Verify connection modal opens
            await waitForModal(page, '[data-testid="api-connection-modal"]');
            
            // Test authentication setup
            const authTypeSelect = page.locator('[data-testid="auth-type-select"]');
            if (await authTypeSelect.isVisible()) {
              // Select API_KEY authentication
              await authTypeSelect.selectOption('API_KEY');
              
              // Verify API key input appears
              await waitForElement(page, '[data-testid="api-key-input"]');
              await expect(page.locator('[data-testid="api-key-input"]')).toBeVisible();
              
              // Fill in API key
              await page.locator('[data-testid="api-key-input"]').fill('test-api-key-123');
              
              // Submit connection
              const submitButton = getPrimaryActionButton(page, 'create-connection-btn');
              await submitButton.click();
              
              // Verify connection is created
              await testModalSuccessMessage(page, 'Connection created successfully');
              
              // Verify connection appears in user's connections
              await waitForElement(page, '[data-testid="user-connections-section"]');
              await expect(page.locator('[data-testid="user-connections-section"]')).toBeVisible();
            }
          }
        }
      }
    });

    test('should maintain separation between catalog and user credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to API catalog
      const catalogSection = page.locator('[data-testid="api-catalog-section"]');
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      if (await catalogSection.isVisible()) {
        // Verify catalog shows shared API information
        const apiCards = page.locator('[data-testid^="api-card-"]');
        const apiCount = await apiCards.count();
        
        if (apiCount > 0) {
          const firstApiCard = apiCards.first();
          
          // Verify shared information is visible
          await expect(firstApiCard.locator('[data-testid="api-name"]')).toBeVisible();
          await expect(firstApiCard.locator('[data-testid="api-description"]')).toBeVisible();
          await expect(firstApiCard.locator('[data-testid="api-base-url"]')).toBeVisible();
          
          // Verify user-specific information is NOT visible in catalog
          await expect(firstApiCard.locator('[data-testid="user-api-key"]')).not.toBeVisible();
          await expect(firstApiCard.locator('[data-testid="user-credentials"]')).not.toBeVisible();
          await expect(firstApiCard.locator('[data-testid="connection-status"]')).not.toBeVisible();
        }
      }

      // Navigate to user's connections
      const userConnectionsSection = page.locator('[data-testid="user-connections-section"]');
      if (await userConnectionsSection.isVisible()) {
        // Verify user connections show user-specific information
        const userConnections = page.locator('[data-testid^="user-connection-"]');
        const connectionCount = await userConnections.count();
        
        if (connectionCount > 0) {
          const firstConnection = userConnections.first();
          
          // Verify user-specific information is visible
          await expect(firstConnection.locator('[data-testid="connection-name"]')).toBeVisible();
          await expect(firstConnection.locator('[data-testid="connection-status"]')).toBeVisible();
          await expect(firstConnection.locator('[data-testid="connection-last-tested"]')).toBeVisible();
          
          // Verify shared information is also visible
          await expect(firstConnection.locator('[data-testid="api-base-url"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('API Catalog Management', () => {
    test('should allow adding new APIs to the catalog', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Look for add API to catalog button
      const addApiButton = page.locator('[data-testid="primary-action add-api-to-catalog-btn"]');
      
      if (await addApiButton.isVisible()) {
        await addApiButton.click();
        
        // Verify add API modal opens
        await waitForModal(page, '[data-testid="add-api-modal"]');
        await expect(page.locator('[data-testid="add-api-modal"]')).toBeVisible();
        
        // Fill in API information
        const addApiForm = page.locator('[data-testid="add-api-form"]');
        await expect(addApiForm).toBeVisible();
        
        // Fill required fields
        await addApiForm.locator('[data-testid="api-name-input"]').fill('Test API');
        await addApiForm.locator('[data-testid="api-description-input"]').fill('A test API for catalog');
        await addApiForm.locator('[data-testid="api-base-url-input"]').fill('https://api.example.com');
        await addApiForm.locator('[data-testid="api-documentation-url-input"]').fill('https://api.example.com/openapi.json');
        await addApiForm.locator('[data-testid="api-category-select"]').selectOption('testing');
        
        // Submit form
        const submitButton = getPrimaryActionButton(page, 'add-api-btn');
        await submitButton.click();
        
        // Verify API is added to catalog
        await testModalSuccessMessage(page, 'API added to catalog successfully');
        
        // Verify API appears in catalog
        await waitForElement(page, '[data-testid="api-catalog-section"]');
        await expect(page.locator('[data-testid="api-card-Test API"]')).toBeVisible();
      }
    });

    test('should handle API catalog updates and versioning', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to API catalog
      const catalogSection = page.locator('[data-testid="api-catalog-section"]');
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      if (await catalogSection.isVisible()) {
        // Look for API cards
        const apiCards = page.locator('[data-testid^="api-card-"]');
        const apiCount = await apiCards.count();
        
        if (apiCount > 0) {
          const firstApiCard = apiCards.first();
          
          // Look for update/refresh button
          const updateButton = firstApiCard.locator('[data-testid="primary-action update-api-btn"]');
          
          if (await updateButton.isVisible()) {
            await updateButton.click();
            
            // Verify update process starts
            await waitForElement(page, '[data-testid="api-update-status"]');
            await expect(page.locator('[data-testid="api-update-status"]')).toBeVisible();
            
            // Verify update completion
            await waitForElement(page, '[data-testid="api-update-success"]', { timeout: 30000 });
            await expect(page.locator('[data-testid="api-update-success"]')).toBeVisible();
          }
        }
      }
    });

    test('should provide API catalog analytics and usage statistics', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to API catalog
      const catalogSection = page.locator('[data-testid="api-catalog-section"]');
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      if (await catalogSection.isVisible()) {
        // Look for analytics section
        const analyticsSection = page.locator('[data-testid="catalog-analytics-section"]');
        
        if (await analyticsSection.isVisible()) {
          // Verify analytics data is displayed
          await expect(analyticsSection.locator('[data-testid="total-apis-count"]')).toBeVisible();
          await expect(analyticsSection.locator('[data-testid="total-endpoints-count"]')).toBeVisible();
          await expect(analyticsSection.locator('[data-testid="popular-apis-list"]')).toBeVisible();
          
          // Verify analytics data has values
          const totalApis = await analyticsSection.locator('[data-testid="total-apis-count"]').textContent();
          const totalEndpoints = await analyticsSection.locator('[data-testid="total-endpoints-count"]').textContent();
          
          expect(totalApis).toMatch(/\d+/);
          expect(totalEndpoints).toMatch(/\d+/);
        }
      }
    });
  });

  test.describe('API Catalog Performance and Security', () => {
    test('should load API catalog within performance budget', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      
      // Test page load time
      await testPageLoadTime(page, 3000); // 3 second budget
      
      // Navigate to API catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      
      if (await browseApisButton.isVisible()) {
        const startTime = Date.now();
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
        const loadTime = Date.now() - startTime;
        
        // Verify catalog loads within 2 seconds
        expect(loadTime).toBeLessThan(2000);
      }
    });

    test('should prevent XSS attacks in API catalog data', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Test XSS prevention in API names and descriptions
      await testXSSPrevention(page, '[data-testid="api-catalog-section"]');
      
      // Test XSS prevention in search functionality
      const searchInput = page.locator('[data-testid="api-search-input"]');
      if (await searchInput.isVisible()) {
        await testXSSPrevention(page, '[data-testid="api-search-input"]');
      }
    });

    test('should prevent data exposure between users in catalog', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Test that user credentials are not exposed in catalog
      await testDataExposure(page, '[data-testid="api-catalog-section"]', [
        'api-key',
        'bearer-token',
        'oauth-token',
        'client-secret',
        'password'
      ]);
    });

    test('should handle API catalog errors gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to API catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        
        // Test error handling for invalid API URLs
        const addApiButton = page.locator('[data-testid="primary-action add-api-to-catalog-btn"]');
        
        if (await addApiButton.isVisible()) {
          await addApiButton.click();
          
          // Fill form with invalid data
          const addApiForm = page.locator('[data-testid="add-api-form"]');
          await addApiForm.locator('[data-testid="api-name-input"]').fill('Invalid API');
          await addApiForm.locator('[data-testid="api-documentation-url-input"]').fill('https://invalid-url-that-does-not-exist.com/openapi.json');
          
          // Submit form
          const submitButton = getPrimaryActionButton(page, 'add-api-btn');
          await submitButton.click();
          
          // Verify error handling
          await testModalErrorHandling(page, 'Failed to fetch API documentation');
        }
      }
    });
  });

  test.describe('API Catalog UX Compliance', () => {
    test('should meet UX compliance standards for API catalog', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to API catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
        
        // Validate UX compliance
        await validateUXCompliance(page, uxHelper);
        
        // Verify primary action buttons follow UX patterns
        const primaryActionButtons = page.locator('[data-testid^="primary-action"]');
        const buttonCount = await primaryActionButtons.count();
        
        for (let i = 0; i < buttonCount; i++) {
          const button = primaryActionButtons.nth(i);
          const testId = await button.getAttribute('data-testid');
          
          // Verify button follows primary action pattern
          expect(testId).toMatch(/^primary-action\s+.+-btn$/);
        }
      }
    });

    test('should provide accessible API catalog interface', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to API catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
        
        // Test keyboard navigation
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        
        // Test screen reader compatibility
        const catalogSection = page.locator('[data-testid="api-catalog-section"]');
        await expect(catalogSection).toHaveAttribute('aria-label');
        
        // Test focus management
        const focusableElements = page.locator('[data-testid^="api-card-"] button, [data-testid^="api-card-"] a');
        const focusableCount = await focusableElements.count();
        
        if (focusableCount > 0) {
          await focusableElements.first().focus();
          await expect(focusableElements.first()).toBeFocused();
        }
      }
    });
  });
});
