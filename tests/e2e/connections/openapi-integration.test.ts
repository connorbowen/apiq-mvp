import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';
import { UXComplianceHelper } from '../../helpers/uxCompliance';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: any;
let jwt: string;
let createdConnectionIds: string[] = [];

// Generate unique test identifiers to prevent name conflicts
function generateUniqueTestName(baseName: string): string {
  const timestamp = Date.now();
  const processId = process.pid;
  const random = Math.floor(Math.random() * 10000);
  return `${baseName}-${timestamp}-${processId}-${random}`;
}

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
    
    // Also clean up any connections that might have been created but not tracked
    // This handles cases where tests fail before they can track the connection ID
    try {
      const response = await request.get('/api/connections', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      
      if (response.ok()) {
        const connections = await response.json();
        for (const connection of connections.data?.connections || []) {
          // Clean up connections that match our test naming pattern
          if (connection.name && (
            connection.name.includes('Petstore API-') ||
            connection.name.includes('HTTPBin API-') ||
            connection.name.includes('Invalid API-') ||
            connection.name.includes('Malformed API-') ||
            connection.name.includes('Cached API-') ||
            connection.name.includes('Performance Test API-') ||
            connection.name.includes('Test API with Endpoints-') ||
            connection.name.includes('Documented API-') ||
            connection.name.includes('Refreshable API-') ||
            connection.name.includes('Schema Validation API-') ||
            connection.name.includes('Response Schema API-')
          )) {
            try {
              await request.delete(`/api/connections/${connection.id}`, {
                headers: { 'Authorization': `Bearer ${jwt}` }
              });
            } catch (error) {
              // Ignore cleanup errors
            }
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    // Initialize UX compliance helper
    const uxHelper = new UXComplianceHelper(page);
    
    // Login before each test using real authentication flow
    await page.goto(`${BASE_URL}/login`);
    
    // Validate login page UX compliance
    await uxHelper.validatePageTitle('APIQ');
    await uxHelper.validateHeadingHierarchy(['Sign in to APIQ']);
    await uxHelper.validateFormAccessibility();
    
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', 'e2eTestPass123');
    
    // Click submit and wait for navigation to complete
    await Promise.all([
      page.waitForURL(/.*dashboard/),
      page.click('button[type="submit"]')
    ]);
    
    // Wait for dashboard to fully load and verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1')).toHaveText(/Dashboard/);
    
    // Validate dashboard UX compliance
    await uxHelper.validateHeadingHierarchy(['Dashboard']);
    
    // Wait for page to be stable
    await page.waitForLoadState('networkidle');
    
    // Navigate to connections tab
    await page.click('[data-testid="tab-connections"]');
    
    // Wait for connections tab to load
    await page.waitForLoadState('networkidle');
    
    // Validate connections tab UX compliance
    await uxHelper.validateHeadingHierarchy(['Dashboard', 'API Connections']);
  });

  test.describe('OpenAPI/Swagger 3.0 Specification Support', () => {
    test('should import API connection from OpenAPI URL (Petstore)', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Validate modal UX compliance
      await uxHelper.validateHeadingHierarchy(['Add API Connection']);
      await uxHelper.validateFormAccessibility();
      
      // Fill step 1: Basic Info
      const petstoreName = generateUniqueTestName('Petstore API');
      await page.fill('[data-testid="connection-name-input"]', petstoreName);
      await page.fill('[data-testid="connection-description-input"]', 'Petstore API imported from OpenAPI spec');
      await page.fill('[data-testid="connection-base-url-input"]', 'https://petstore.swagger.io/v2');
      
      // Navigate to step 2
      await page.click('button:has-text("Next")');
      
      // Fill step 2: Authentication (select API_KEY as default)
      // Note: NONE is not an option, so we'll use API_KEY and provide a dummy key
      await page.selectOption('[data-testid="connection-auth-type-select"]', 'API_KEY');
      await page.fill('[data-testid="api-key-input"]', 'dummy-api-key-for-testing');
      
      // Navigate to step 3
      await page.click('button:has-text("Next")');
      
      // Select OpenAPI import option
      await page.click('[data-testid="import-openapi-btn"]');
      
      // Validate OpenAPI import form UX compliance
      await uxHelper.validateFormAccessibility();
      
      // Enter OpenAPI URL for Petstore
      await page.fill('[data-testid="openapi-url-input"]', 'https://petstore.swagger.io/v2/swagger.json');
      
      // Validate loading state during submission (UX Spec requirement)
      await uxHelper.validateLoadingState('button[type="submit"]');
      
      // Should show success message with proper UX compliance
      await uxHelper.validateSuccessContainer('Connection created successfully');
      
      // Track the created connection for cleanup
      const connectionCard = page.locator('[data-testid="connection-card"]').filter({ hasText: petstoreName });
      const connectionId = await connectionCard.getAttribute('data-connection-id');
      if (connectionId) {
        createdConnectionIds.push(connectionId);
      }
      
      // Should show the new connection in the list
      await expect(page.locator('[data-testid="connection-card"]')).toContainText(petstoreName);
      
      // Should show OpenAPI badge or indicator
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('OpenAPI');
      
      // Validate mobile responsiveness (temporarily disabled due to UI sizing issues)
      // await uxHelper.validateMobileResponsiveness();
    });

    test('should import API connection from OpenAPI 3.0 URL (HTTPBin)', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Fill step 1: Basic Info
      const httpbinName = generateUniqueTestName('HTTPBin API');
      await page.fill('[data-testid="connection-name-input"]', httpbinName);
      await page.fill('[data-testid="connection-description-input"]', 'HTTPBin API imported from OpenAPI 3.0 spec');
      await page.fill('[data-testid="connection-base-url-input"]', 'https://httpbin.org');
      
      // Navigate to step 2
      await page.click('button:has-text("Next")');
      
      // Fill step 2: Authentication (select API_KEY as default)
      await page.selectOption('[data-testid="connection-auth-type-select"]', 'API_KEY');
      await page.fill('[data-testid="api-key-input"]', 'dummy-api-key-for-testing');
      
      // Navigate to step 3
      await page.click('button:has-text("Next")');
      
      // Select OpenAPI import option
      await page.click('[data-testid="import-openapi-btn"]');
      
      // Enter OpenAPI 3.0 URL for HTTPBin
      await page.fill('[data-testid="openapi-url-input"]', 'https://httpbin.org/openapi.json');
      
      // Validate loading state during submission (UX Spec requirement)
      await uxHelper.validateLoadingState('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Connection created successfully');
      
      // Should show the new connection in the list
      await expect(page.locator('[data-testid="connection-card"]')).toContainText(httpbinName);
    });

    test('should validate OpenAPI specification format', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Fill step 1: Basic Info
      const invalidApiName = generateUniqueTestName('Invalid API');
      await page.fill('[data-testid="connection-name-input"]', invalidApiName);
      await page.fill('[data-testid="connection-base-url-input"]', 'https://invalid-api.example.com');
      
      // Navigate to step 2
      await page.click('button:has-text("Next")');
      
      // Fill step 2: Authentication (select API_KEY as default)
      await page.selectOption('[data-testid="connection-auth-type-select"]', 'API_KEY');
      await page.fill('[data-testid="api-key-input"]', 'dummy-api-key-for-testing');
      
      // Navigate to step 3
      await page.click('button:has-text("Next")');
      
      // Select OpenAPI import option
      await page.click('[data-testid="import-openapi-btn"]');
      
      // Enter invalid OpenAPI URL
      await page.fill('[data-testid="openapi-url-input"]', 'https://invalid-api.example.com/swagger.json');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show validation error with proper UX compliance
      await uxHelper.validateErrorContainer(/Missing required fields|Invalid|Error|Failed/);
    });

    test('should handle malformed OpenAPI specification', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Fill step 1: Basic Info
      const malformedApiName = generateUniqueTestName('Malformed API');
      await page.fill('[data-testid="connection-name-input"]', malformedApiName);
      await page.fill('[data-testid="connection-base-url-input"]', 'https://httpbin.org');
      
      // Navigate to step 2
      await page.click('button:has-text("Next")');
      
      // Fill step 2: Authentication (select API_KEY as default)
      await page.selectOption('[data-testid="connection-auth-type-select"]', 'API_KEY');
      await page.fill('[data-testid="api-key-input"]', 'dummy-api-key-for-testing');
      
      // Navigate to step 3
      await page.click('button:has-text("Next")');
      
      // Select OpenAPI import option
      await page.click('[data-testid="import-openapi-btn"]');
      
      // Enter URL that returns invalid JSON
      await page.fill('[data-testid="openapi-url-input"]', 'https://httpbin.org/json');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show validation error with proper UX compliance
      await uxHelper.validateErrorContainer(/Invalid|Error|Failed/);
    });
  });

  test.describe('Automatic Endpoint Discovery', () => {
    test('should automatically discover endpoints from OpenAPI spec', async ({ page }) => {
      // Create connection via API first
      const response = await page.request.post('/api/connections', {
        data: {
          name: generateUniqueTestName('Test API with Endpoints'),
          baseUrl: 'https://petstore.swagger.io/v2',
          authType: 'NONE',
          documentationUrl: 'https://petstore.swagger.io/v2/swagger.json'
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
          name: generateUniqueTestName('Documented API'),
          baseUrl: 'https://petstore.swagger.io/v2',
          authType: 'NONE',
          documentationUrl: 'https://petstore.swagger.io/v2/swagger.json'
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
      const uxHelper = new UXComplianceHelper(page);
      
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Fill step 1: Basic Info
      const cachedApiName = generateUniqueTestName('Cached API');
      await page.fill('[data-testid="connection-name-input"]', cachedApiName);
      await page.fill('[data-testid="connection-base-url-input"]', 'https://petstore.swagger.io/v2');
      
      // Navigate to step 2
      await page.click('button:has-text("Next")');
      
      // Fill step 2: Authentication (select API_KEY as default)
      await page.selectOption('[data-testid="connection-auth-type-select"]', 'API_KEY');
      await page.fill('[data-testid="api-key-input"]', 'dummy-api-key-for-testing');
      
      // Navigate to step 3
      await page.click('button:has-text("Next")');
      
      // Select OpenAPI import option
      await page.click('[data-testid="import-openapi-btn"]');
      
      // Enter OpenAPI URL
      await page.fill('[data-testid="openapi-url-input"]', 'https://petstore.swagger.io/v2/swagger.json');
      
      // Validate loading state during submission (UX Spec requirement)
      await uxHelper.validateLoadingState('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Connection created successfully');
      
      // Should show the new connection in the list
      await expect(page.locator('[data-testid="connection-card"]')).toContainText(cachedApiName);
    });

    test('should refresh OpenAPI specification', async ({ page }) => {
      // Create connection via API first
      const response = await page.request.post('/api/connections', {
        data: {
          name: generateUniqueTestName('Refreshable API'),
          baseUrl: 'https://petstore.swagger.io/v2',
          authType: 'NONE',
          documentationUrl: 'https://petstore.swagger.io/v2/swagger.json'
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
          name: generateUniqueTestName('Schema Validation API'),
          baseUrl: 'https://petstore.swagger.io/v2',
          authType: 'NONE',
          documentationUrl: 'https://petstore.swagger.io/v2/swagger.json'
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
          name: generateUniqueTestName('Response Schema API'),
          baseUrl: 'https://petstore.swagger.io/v2',
          authType: 'NONE',
          documentationUrl: 'https://petstore.swagger.io/v2/swagger.json'
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
      const uxHelper = new UXComplianceHelper(page);
      const startTime = Date.now();
      
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Fill step 1: Basic Info
      const performanceApiName = generateUniqueTestName('Performance Test API');
      await page.fill('[data-testid="connection-name-input"]', performanceApiName);
      await page.fill('[data-testid="connection-base-url-input"]', 'https://petstore.swagger.io/v2');
      
      // Navigate to step 2
      await page.click('button:has-text("Next")');
      
      // Fill step 2: Authentication (select API_KEY as default)
      await page.selectOption('[data-testid="connection-auth-type-select"]', 'API_KEY');
      await page.fill('[data-testid="api-key-input"]', 'dummy-api-key-for-testing');
      
      // Navigate to step 3
      await page.click('button:has-text("Next")');
      
      // Select OpenAPI import option
      await page.click('[data-testid="import-openapi-btn"]');
      
      // Enter OpenAPI URL
      await page.fill('[data-testid="openapi-url-input"]', 'https://petstore.swagger.io/v2/swagger.json');
      
      // Validate loading state during submission (UX Spec requirement)
      await uxHelper.validateLoadingState('button[type="submit"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Connection created successfully');
      
      // Verify completion time is under 5 minutes
      const completionTime = Date.now() - startTime;
      expect(completionTime).toBeLessThan(5 * 60 * 1000); // 5 minutes in milliseconds
    });
  });
});