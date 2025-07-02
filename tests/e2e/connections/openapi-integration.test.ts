import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: any;
let jwt: string;
let createdConnectionIds: string[] = [];

test.describe('OpenAPI/Swagger 3.0 Integration E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-openapi-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E OpenAPI Test User'
    );
    jwt = testUser.accessToken;
  });

  test.afterAll(async ({ request }) => {
    // Clean up created connections
    for (const id of createdConnectionIds) {
      try {
        await request.delete(`/api/connections/${id}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', 'e2eTestPass123');
    await page.click('button[type="submit"]');
    
    // Wait for successful login and redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    // Navigate to connections tab
    await page.click('[data-testid="tab-connections"]');
  });

  test.describe('OpenAPI/Swagger 3.0 Specification Support', () => {
    test('should import API connection from OpenAPI URL (Petstore)', async ({ page }) => {
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Select OpenAPI import option
      await page.click('[data-testid="import-openapi-btn"]');
      
      // Enter OpenAPI URL for Petstore
      await page.fill('[data-testid="openapi-url-input"]', 'https://petstore.swagger.io/v2/swagger.json');
      
      // Fill basic connection details
      await page.fill('[data-testid="connection-name-input"]', 'Petstore API');
      await page.fill('[data-testid="connection-description-input"]', 'Petstore API imported from OpenAPI spec');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('API imported successfully');
      
      // Should show the new connection in the list
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Petstore API');
      
      // Should show OpenAPI badge or indicator
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('OpenAPI');
    });

    test('should import API connection from OpenAPI 3.0 URL (HTTPBin)', async ({ page }) => {
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Select OpenAPI import option
      await page.click('[data-testid="import-openapi-btn"]');
      
      // Enter OpenAPI 3.0 URL for HTTPBin
      await page.fill('[data-testid="openapi-url-input"]', 'https://httpbin.org/openapi.json');
      
      // Fill basic connection details
      await page.fill('[data-testid="connection-name-input"]', 'HTTPBin API');
      await page.fill('[data-testid="connection-description-input"]', 'HTTPBin API imported from OpenAPI 3.0 spec');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('API imported successfully');
      
      // Should show the new connection in the list
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('HTTPBin API');
    });

    test('should validate OpenAPI specification format', async ({ page }) => {
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Select OpenAPI import option
      await page.click('[data-testid="import-openapi-btn"]');
      
      // Enter invalid OpenAPI URL
      await page.fill('[data-testid="openapi-url-input"]', 'https://invalid-api.example.com/swagger.json');
      
      // Fill basic connection details
      await page.fill('[data-testid="connection-name-input"]', 'Invalid API');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show validation error
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/Invalid OpenAPI specification|Failed to fetch|Not found/);
    });

    test('should handle malformed OpenAPI specification', async ({ page }) => {
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Select OpenAPI import option
      await page.click('[data-testid="import-openapi-btn"]');
      
      // Enter URL that returns invalid JSON
      await page.fill('[data-testid="openapi-url-input"]', 'https://httpbin.org/json');
      
      // Fill basic connection details
      await page.fill('[data-testid="connection-name-input"]', 'Malformed API');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show validation error for malformed spec
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/Invalid OpenAPI specification|Malformed JSON/);
    });
  });

  test.describe('Automatic Endpoint Discovery', () => {
    test('should automatically discover endpoints from OpenAPI spec', async ({ page }) => {
      // Create connection via API first
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Test API with Endpoints',
          baseUrl: 'https://petstore.swagger.io/v2',
          authType: 'NONE',
          openApiUrl: 'https://petstore.swagger.io/v2/swagger.json'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await response.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Navigate to API Explorer
      await page.click(`[data-testid="explore-api-${connection.data.id}"]`);
      
      // Should show discovered endpoints
      await expect(page.locator('[data-testid="endpoint-list"]')).toBeVisible();
      
      // Should show multiple endpoints (Petstore has many)
      const endpointCount = await page.locator('[data-testid="endpoint-item"]').count();
      expect(endpointCount).toBeGreaterThan(10);
      
      // Should show endpoint details
      await expect(page.locator('[data-testid="endpoint-item"]').first()).toContainText('GET');
      await expect(page.locator('[data-testid="endpoint-item"]').first()).toContainText('/pet');
    });

    test('should display endpoint documentation from OpenAPI spec', async ({ page }) => {
      // Create connection via API first
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Documented API',
          baseUrl: 'https://petstore.swagger.io/v2',
          authType: 'NONE',
          openApiUrl: 'https://petstore.swagger.io/v2/swagger.json'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await response.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Navigate to API Explorer
      await page.click(`[data-testid="explore-api-${connection.data.id}"]`);
      
      // Click on an endpoint to view details
      await page.locator('[data-testid="endpoint-item"]').first().click();
      
      // Should show endpoint documentation
      await expect(page.locator('[data-testid="endpoint-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="endpoint-parameters"]')).toBeVisible();
      await expect(page.locator('[data-testid="endpoint-responses"]')).toBeVisible();
    });
  });

  test.describe('OpenAPI Caching System', () => {
    test('should cache OpenAPI specifications for performance', async ({ page }) => {
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Select OpenAPI import option
      await page.click('[data-testid="import-openapi-btn"]');
      
      // Enter OpenAPI URL
      await page.fill('[data-testid="openapi-url-input"]', 'https://petstore.swagger.io/v2/swagger.json');
      await page.fill('[data-testid="connection-name-input"]', 'Cached API');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('API imported successfully');
      
      // Navigate to admin cache management (if available)
      await page.goto(`${BASE_URL}/admin/openapi-cache`);
      
      // Should show cached specification
      await expect(page.locator('[data-testid="cached-spec"]')).toContainText('petstore.swagger.io');
    });

    test('should refresh OpenAPI specification', async ({ page }) => {
      // Create connection via API first
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Refreshable API',
          baseUrl: 'https://petstore.swagger.io/v2',
          authType: 'NONE',
          openApiUrl: 'https://petstore.swagger.io/v2/swagger.json'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await response.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Navigate to connection details
      await page.click(`[data-testid="connection-details-${connection.data.id}"]`);
      
      // Click refresh specification button
      await page.click('[data-testid="refresh-spec-btn"]');
      
      // Should show refresh success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Specification refreshed successfully');
    });
  });

  test.describe('Schema Validation', () => {
    test('should validate request schemas from OpenAPI spec', async ({ page }) => {
      // Create connection via API first
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Schema Validation API',
          baseUrl: 'https://petstore.swagger.io/v2',
          authType: 'NONE',
          openApiUrl: 'https://petstore.swagger.io/v2/swagger.json'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await response.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Navigate to API Explorer
      await page.click(`[data-testid="explore-api-${connection.data.id}"]`);
      
      // Click on POST endpoint
      await page.locator('[data-testid="endpoint-item"]:has-text("POST")').first().click();
      
      // Should show request schema validation
      await expect(page.locator('[data-testid="request-schema"]')).toBeVisible();
      await expect(page.locator('[data-testid="required-fields"]')).toBeVisible();
    });

    test('should validate response schemas from OpenAPI spec', async ({ page }) => {
      // Create connection via API first
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Response Schema API',
          baseUrl: 'https://petstore.swagger.io/v2',
          authType: 'NONE',
          openApiUrl: 'https://petstore.swagger.io/v2/swagger.json'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await response.json();
      if (connection.data?.id) {
        createdConnectionIds.push(connection.data.id);
      }
      
      // Navigate to API Explorer
      await page.click(`[data-testid="explore-api-${connection.data.id}"]`);
      
      // Click on GET endpoint
      await page.locator('[data-testid="endpoint-item"]:has-text("GET")').first().click();
      
      // Should show response schema
      await expect(page.locator('[data-testid="response-schema"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-examples"]')).toBeVisible();
    });
  });

  test.describe('Performance Requirements', () => {
    test('should complete OpenAPI import in under 5 minutes', async ({ page }) => {
      const startTime = Date.now();
      
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Select OpenAPI import option
      await page.click('[data-testid="import-openapi-btn"]');
      
      // Enter OpenAPI URL
      await page.fill('[data-testid="openapi-url-input"]', 'https://petstore.swagger.io/v2/swagger.json');
      await page.fill('[data-testid="connection-name-input"]', 'Performance Test API');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('API imported successfully');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in under 5 minutes (300,000ms)
      expect(duration).toBeLessThan(300000);
      
      // Log the actual duration for monitoring
      console.log(`OpenAPI import completed in ${duration}ms`);
    });
  });
}); 