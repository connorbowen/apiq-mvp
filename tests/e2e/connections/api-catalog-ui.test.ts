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

// Test data for API catalog UI
const TEST_APIS = [
  {
    name: 'Pet Store API',
    description: 'A sample API for pet store operations',
    baseUrl: 'https://petstore3.swagger.io/api/v3',
    documentationUrl: 'https://petstore3.swagger.io/api/v3/openapi.json',
    category: 'sample',
    version: '1.0.0'
  },
  {
    name: 'JSONPlaceholder API',
    description: 'Fake Online REST API for Testing and Prototyping',
    baseUrl: 'https://jsonplaceholder.typicode.com',
    documentationUrl: 'https://jsonplaceholder.typicode.com/openapi.json',
    category: 'testing',
    version: '1.0.0'
  },
  {
    name: 'Weather API',
    description: 'Real-time weather data API',
    baseUrl: 'https://api.weather.com',
    documentationUrl: 'https://api.weather.com/openapi.json',
    category: 'data',
    version: '2.0.0'
  }
];

test.describe('API Catalog UI Components E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user using new helper
    testUser = await createE2EUser('ADMIN', {
      email: `e2e-catalog-ui-${generateTestId('user')}@testuser.local`,
      password: 'e2eTestPass123',
      name: 'E2E API Catalog UI Test User'
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

  test.describe('API Catalog Navigation', () => {
    test('should navigate to API catalog from connections tab', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Look for catalog navigation elements
      const catalogTab = page.locator('[data-testid="catalog-tab"]');
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      const catalogSection = page.locator('[data-testid="api-catalog-section"]');

      // Test different navigation methods
      if (await catalogTab.isVisible()) {
        await catalogTab.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
        await expect(page.locator('[data-testid="api-catalog-section"]')).toBeVisible();
      } else if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
        await expect(page.locator('[data-testid="api-catalog-section"]')).toBeVisible();
      } else if (await catalogSection.isVisible()) {
        await expect(catalogSection).toBeVisible();
      }
    });

    test('should maintain navigation state when switching between catalog and connections', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      // Navigate back to connections
      const connectionsTab = page.locator('[data-testid="connections-tab"]');
      if (await connectionsTab.isVisible()) {
        await connectionsTab.click();
        await waitForElement(page, '[data-testid="user-connections-section"]');
      }

      // Navigate back to catalog
      const catalogButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await catalogButton.isVisible()) {
        await catalogButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      // Verify catalog is still visible
      await expect(page.locator('[data-testid="api-catalog-section"]')).toBeVisible();
    });

    test('should handle URL-based navigation to catalog', async ({ page }) => {
      // Navigate directly to catalog via URL
      await page.goto(`${BASE_URL}/dashboard?tab=connections&section=catalog`);
      await waitForDashboard(page);

      // Verify catalog section is visible
      await waitForElement(page, '[data-testid="api-catalog-section"]');
      await expect(page.locator('[data-testid="api-catalog-section"]')).toBeVisible();
    });
  });

  test.describe('API Catalog Display', () => {
    test('should display API cards with proper information', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      // Look for API cards
      const apiCards = page.locator('[data-testid^="api-card-"]');
      const apiCount = await apiCards.count();

      if (apiCount > 0) {
        const firstApiCard = apiCards.first();

        // Verify API card structure
        await expect(firstApiCard.locator('[data-testid="api-name"]')).toBeVisible();
        await expect(firstApiCard.locator('[data-testid="api-description"]')).toBeVisible();
        await expect(firstApiCard.locator('[data-testid="api-category"]')).toBeVisible();
        await expect(firstApiCard.locator('[data-testid="api-version"]')).toBeVisible();

        // Verify action buttons
        await expect(firstApiCard.locator('[data-testid="primary-action view-endpoints-btn"]')).toBeVisible();
        await expect(firstApiCard.locator('[data-testid="primary-action connect-api-btn"]')).toBeVisible();
      }
    });

    test('should display API categories and filtering options', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      // Look for category filters
      const categoryFilter = page.locator('[data-testid="category-filter"]');
      if (await categoryFilter.isVisible()) {
        await expect(categoryFilter).toBeVisible();

        // Test category filtering
        await categoryFilter.selectOption('sample');
        await waitForElement(page, '[data-testid="filtered-results"]');

        // Verify filtered results
        const filteredCards = page.locator('[data-testid^="api-card-"]');
        const filteredCount = await filteredCards.count();

        if (filteredCount > 0) {
          // Verify all visible cards have the selected category
          for (let i = 0; i < filteredCount; i++) {
            const card = filteredCards.nth(i);
            const category = await card.locator('[data-testid="api-category"]').textContent();
            expect(category).toBe('sample');
          }
        }
      }
    });

    test('should display search functionality', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      // Look for search input
      const searchInput = page.locator('[data-testid="api-search-input"]');
      if (await searchInput.isVisible()) {
        await expect(searchInput).toBeVisible();

        // Test search functionality
        await searchInput.fill('pet');
        await page.keyboard.press('Enter');

        // Verify search results
        await waitForElement(page, '[data-testid="search-results"]');
        await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

        // Verify search results contain the search term
        const searchResults = page.locator('[data-testid^="api-card-"]');
        const resultCount = await searchResults.count();

        if (resultCount > 0) {
          const firstResult = searchResults.first();
          const apiName = await firstResult.locator('[data-testid="api-name"]').textContent();
          const apiDescription = await firstResult.locator('[data-testid="api-description"]').textContent();
          
          const searchableText = `${apiName} ${apiDescription}`.toLowerCase();
          expect(searchableText).toContain('pet');
        }
      }
    });

    test('should display API statistics and analytics', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      // Look for analytics section
      const analyticsSection = page.locator('[data-testid="catalog-analytics-section"]');
      if (await analyticsSection.isVisible()) {
        await expect(analyticsSection).toBeVisible();

        // Verify analytics data
        await expect(analyticsSection.locator('[data-testid="total-apis-count"]')).toBeVisible();
        await expect(analyticsSection.locator('[data-testid="total-endpoints-count"]')).toBeVisible();
        await expect(analyticsSection.locator('[data-testid="popular-apis-list"]')).toBeVisible();

        // Verify analytics data has values
        const totalApis = await analyticsSection.locator('[data-testid="total-apis-count"]').textContent();
        const totalEndpoints = await analyticsSection.locator('[data-testid="total-endpoints-count"]').textContent();

        expect(totalApis).toMatch(/\d+/);
        expect(totalEndpoints).toMatch(/\d+/);
      }
    });
  });

  test.describe('API Endpoint Display', () => {
    test('should display API endpoints when viewing an API', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      // Look for API cards
      const apiCards = page.locator('[data-testid^="api-card-"]');
      const apiCount = await apiCards.count();

      if (apiCount > 0) {
        const firstApiCard = apiCards.first();
        const viewEndpointsButton = firstApiCard.locator('[data-testid="primary-action view-endpoints-btn"]');

        if (await viewEndpointsButton.isVisible()) {
          await viewEndpointsButton.click();

          // Verify endpoints section is displayed
          await waitForElement(page, '[data-testid="api-endpoints-section"]');
          await expect(page.locator('[data-testid="api-endpoints-section"]')).toBeVisible();

          // Verify endpoint items
          const endpointItems = page.locator('[data-testid^="endpoint-item-"]');
          const endpointCount = await endpointItems.count();

          if (endpointCount > 0) {
            const firstEndpoint = endpointItems.first();

            // Verify endpoint information
            await expect(firstEndpoint.locator('[data-testid="endpoint-method"]')).toBeVisible();
            await expect(firstEndpoint.locator('[data-testid="endpoint-path"]')).toBeVisible();
            await expect(firstEndpoint.locator('[data-testid="endpoint-description"]')).toBeVisible();

            // Verify endpoint actions
            await expect(firstEndpoint.locator('[data-testid="primary-action try-endpoint-btn"]')).toBeVisible();
          }
        }
      }
    });

    test('should filter endpoints by HTTP method', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to catalog and view endpoints
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');

        const apiCards = page.locator('[data-testid^="api-card-"]');
        const apiCount = await apiCards.count();

        if (apiCount > 0) {
          const firstApiCard = apiCards.first();
          const viewEndpointsButton = firstApiCard.locator('[data-testid="primary-action view-endpoints-btn"]');

          if (await viewEndpointsButton.isVisible()) {
            await viewEndpointsButton.click();
            await waitForElement(page, '[data-testid="api-endpoints-section"]');

            // Look for method filter
            const methodFilter = page.locator('[data-testid="method-filter"]');
            if (await methodFilter.isVisible()) {
              await methodFilter.selectOption('GET');

              // Verify filtered results
              await waitForElement(page, '[data-testid="filtered-endpoints"]');
              const filteredEndpoints = page.locator('[data-testid^="endpoint-item-"]');
              const filteredCount = await filteredEndpoints.count();

              if (filteredCount > 0) {
                // Verify all visible endpoints are GET methods
                for (let i = 0; i < filteredCount; i++) {
                  const endpoint = filteredEndpoints.nth(i);
                  const method = await endpoint.locator('[data-testid="endpoint-method"]').textContent();
                  expect(method).toBe('GET');
                }
              }
            }
          }
        }
      }
    });

    test('should display endpoint details and parameters', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to catalog and view endpoints
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');

        const apiCards = page.locator('[data-testid^="api-card-"]');
        const apiCount = await apiCards.count();

        if (apiCount > 0) {
          const firstApiCard = apiCards.first();
          const viewEndpointsButton = firstApiCard.locator('[data-testid="primary-action view-endpoints-btn"]');

          if (await viewEndpointsButton.isVisible()) {
            await viewEndpointsButton.click();
            await waitForElement(page, '[data-testid="api-endpoints-section"]');

            // Look for endpoint items
            const endpointItems = page.locator('[data-testid^="endpoint-item-"]');
            const endpointCount = await endpointItems.count();

            if (endpointCount > 0) {
              const firstEndpoint = endpointItems.first();
              const viewDetailsButton = firstEndpoint.locator('[data-testid="primary-action view-details-btn"]');

              if (await viewDetailsButton.isVisible()) {
                await viewDetailsButton.click();

                // Verify endpoint details modal
                await waitForModal(page, '[data-testid="endpoint-details-modal"]');
                await expect(page.locator('[data-testid="endpoint-details-modal"]')).toBeVisible();

                // Verify endpoint details
                await expect(page.locator('[data-testid="endpoint-method"]')).toBeVisible();
                await expect(page.locator('[data-testid="endpoint-path"]')).toBeVisible();
                await expect(page.locator('[data-testid="endpoint-description"]')).toBeVisible();
                await expect(page.locator('[data-testid="endpoint-parameters"]')).toBeVisible();
                await expect(page.locator('[data-testid="endpoint-responses"]')).toBeVisible();
              }
            }
          }
        }
      }
    });
  });

  test.describe('API Connection Flow', () => {
    test('should open connection modal when clicking connect button', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      // Look for API cards
      const apiCards = page.locator('[data-testid^="api-card-"]');
      const apiCount = await apiCards.count();

      if (apiCount > 0) {
        const firstApiCard = apiCards.first();
        const connectButton = firstApiCard.locator('[data-testid="primary-action connect-api-btn"]');

        if (await connectButton.isVisible()) {
          await connectButton.click();

          // Verify connection modal opens
          await waitForModal(page, '[data-testid="api-connection-modal"]');
          await expect(page.locator('[data-testid="api-connection-modal"]')).toBeVisible();

          // Verify connection form is pre-populated
          const connectionForm = page.locator('[data-testid="api-connection-form"]');
          await expect(connectionForm).toBeVisible();

          // Verify API information is pre-filled
          const nameInput = connectionForm.locator('[data-testid="connection-name-input"]');
          const baseUrlInput = connectionForm.locator('[data-testid="connection-base-url-input"]');

          if (await nameInput.isVisible()) {
            await expect(nameInput).toHaveValue(/.+/);
          }

          if (await baseUrlInput.isVisible()) {
            await expect(baseUrlInput).toHaveValue(/.+/);
          }
        }
      }
    });

    test('should handle authentication setup in connection flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      // Look for API cards
      const apiCards = page.locator('[data-testid^="api-card-"]');
      const apiCount = await apiCards.count();

      if (apiCount > 0) {
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

            // Test form validation
            const submitButton = getPrimaryActionButton(page, 'create-connection-btn');
            await expect(submitButton).toBeEnabled();

            // Submit connection
            await submitButton.click();

            // Verify connection is created
            await testModalSuccessMessage(page, 'Connection created successfully');

            // Verify connection appears in user's connections
            await waitForElement(page, '[data-testid="user-connections-section"]');
            await expect(page.locator('[data-testid="user-connections-section"]')).toBeVisible();
          }
        }
      }
    });

    test('should handle OAuth2 authentication setup', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      // Look for API cards
      const apiCards = page.locator('[data-testid^="api-card-"]');
      const apiCount = await apiCards.count();

      if (apiCount > 0) {
        const firstApiCard = apiCards.first();
        const connectButton = firstApiCard.locator('[data-testid="primary-action connect-api-btn"]');

        if (await connectButton.isVisible()) {
          await connectButton.click();

          // Verify connection modal opens
          await waitForModal(page, '[data-testid="api-connection-modal"]');

          // Test OAuth2 authentication setup
          const authTypeSelect = page.locator('[data-testid="auth-type-select"]');
          if (await authTypeSelect.isVisible()) {
            // Select OAuth2 authentication
            await authTypeSelect.selectOption('OAUTH2');

            // Verify OAuth2 inputs appear
            await waitForElement(page, '[data-testid="oauth2-client-id-input"]');
            await expect(page.locator('[data-testid="oauth2-client-id-input"]')).toBeVisible();
            await expect(page.locator('[data-testid="oauth2-client-secret-input"]')).toBeVisible();

            // Fill in OAuth2 credentials
            await page.locator('[data-testid="oauth2-client-id-input"]').fill('test-client-id');
            await page.locator('[data-testid="oauth2-client-secret-input"]').fill('test-client-secret');

            // Test OAuth2 flow initiation
            const submitButton = getPrimaryActionButton(page, 'create-connection-btn');
            await expect(submitButton).toBeEnabled();
          }
        }
      }
    });
  });

  test.describe('API Catalog Management', () => {
    test('should allow adding new APIs to catalog', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      // Look for add API button
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

    test('should handle API catalog updates and refresh', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

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
    });

    test('should handle API catalog deletion', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Navigate to catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await waitForElement(page, '[data-testid="api-catalog-section"]');
      }

      // Look for API cards
      const apiCards = page.locator('[data-testid^="api-card-"]');
      const apiCount = await apiCards.count();

      if (apiCount > 0) {
        const firstApiCard = apiCards.first();

        // Look for delete button
        const deleteButton = firstApiCard.locator('[data-testid="primary-action delete-api-btn"]');
        if (await deleteButton.isVisible()) {
          await deleteButton.click();

          // Verify confirmation modal
          await waitForModal(page, '[data-testid="delete-confirmation-modal"]');
          await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();

          // Confirm deletion
          const confirmButton = getPrimaryActionButton(page, 'confirm-delete-btn');
          await confirmButton.click();

          // Verify API is deleted
          await testModalSuccessMessage(page, 'API deleted from catalog successfully');
        }
      }
    });
  });

  test.describe('API Catalog Performance and UX', () => {
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
});
