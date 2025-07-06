import { test, expect } from '../../helpers/serverHealthCheck';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: any;
let jwt: string;
let createdConnectionIds: (string | undefined)[] = [];

test.describe('Connections Management E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-conn-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Connections Test User'
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
    
    // Validate UX compliance - heading hierarchy
    await expect(page.locator('h1')).toHaveText('Dashboard');
    await expect(page.locator('h2')).toHaveText('API Connections');
  });

  test.describe('Connection CRUD Operations', () => {
    test('should create a new API connection with UX compliance', async ({ page }) => {
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Validate UX compliance - heading hierarchy for create form
      await expect(page.locator('h3:has-text("Add API Connection")')).toBeVisible();
      
      // Validate UX compliance - accessible form fields
      const nameInput = page.locator('[data-testid="connection-name-input"]');
      const descriptionInput = page.locator('[data-testid="connection-description-input"]');
      const baseUrlInput = page.locator('[data-testid="connection-baseurl-input"]');
      
      await expect(nameInput).toBeVisible();
      await expect(descriptionInput).toBeVisible();
      await expect(baseUrlInput).toBeVisible();
      
      // Validate UX compliance - required field indicators
      await expect(nameInput).toHaveAttribute('required');
      await expect(baseUrlInput).toHaveAttribute('required');
      
      // Fill form fields using data-testid selectors
      await nameInput.fill('Test API Connection');
      await descriptionInput.fill('A test API connection');
      await baseUrlInput.fill('https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'test-api-key-123');
      
      // Validate UX compliance - descriptive button text
      await expect(page.locator('[data-testid="submit-connection-btn"]')).toHaveText(/Create|Add|Save/);
      
      // Submit form
      await page.click('[data-testid="submit-connection-btn"]');
      
      // Validate UX compliance - loading state
      await expect(page.locator('[data-testid="submit-connection-btn"]')).toBeDisabled();
      await expect(page.locator('[data-testid="submit-connection-btn"]')).toHaveText(/Creating|Saving/);
      
      // Wait for form processing
      await page.waitForTimeout(2000);
      
      // Validate UX compliance - success message in accessible container
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('.bg-green-50')).toBeVisible();
      
      // Should show the new connection in the list
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Test API Connection');
    });

    test('should create connection with Bearer token auth', async ({ page }) => {
      await page.click('[data-testid="create-connection-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'Bearer Token Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Bearer token test connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'BEARER_TOKEN');
      await page.fill('[data-testid="connection-bearertoken-input"]', 'test-bearer-token-123');
      
      await page.click('[data-testid="submit-connection-btn"]');
      
      // Wait for form processing
      await page.waitForTimeout(2000);
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Bearer Token Connection');
    });

    test('should create connection with Basic auth', async ({ page }) => {
      await page.click('[data-testid="create-connection-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'Basic Auth Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Basic auth test connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'BASIC_AUTH');
      await page.fill('[data-testid="connection-username-input"]', 'testuser');
      await page.fill('[data-testid="connection-password-input"]', 'testpass');
      
      await page.click('[data-testid="submit-connection-btn"]');
      
      // Wait for form processing
      await page.waitForTimeout(2000);
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Basic Auth Connection');
    });

    // TODO: Edit functionality not implemented yet
    // test('should edit an existing connection', async ({ page }) => {
    //   // This test will be implemented when edit functionality is added
    // });

    // TODO: Delete functionality not implemented yet  
    // test('should delete a connection', async ({ page }) => {
    //   // This test will be implemented when delete functionality is added
    // });

    // TODO: Cancel deletion functionality not implemented yet
    // test('should cancel connection deletion', async ({ page }) => {
    //   // This test will be implemented when delete functionality is added
    // });
  });

  test.describe('UX Compliance & Accessibility', () => {
    test('should have accessible form fields and keyboard navigation', async ({ page }) => {
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Validate UX compliance - heading hierarchy
      await expect(page.locator('h3:has-text("Add API Connection")')).toBeVisible();
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      const nameInput = page.locator('[data-testid="connection-name-input"]');
      await expect(nameInput).toBeFocused();
      
      // Test form field accessibility
      await expect(nameInput).toHaveAttribute('aria-required', 'true');
      await expect(nameInput).toHaveAttribute('type', 'text');
      
      // Test ARIA labels
      const descriptionInput = page.locator('[data-testid="connection-description-input"]');
      await expect(descriptionInput).toHaveAttribute('aria-label');
      
      // Test form validation accessibility
      await nameInput.fill('');
      await page.keyboard.press('Tab');
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });

    test('should handle form validation errors with accessible messaging', async ({ page }) => {
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Try to submit empty form
      await page.click('[data-testid="submit-connection-btn"]');
      
      // Validate UX compliance - accessible error containers
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/required|fill in/i);
      await expect(page.locator('[role="alert"]')).toBeVisible();
      
      // Test error message clarity
      await expect(page.locator('.text-red-800')).toContainText(/name.*required|connection name/i);
    });

    test('should have mobile responsive design', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Validate mobile layout
      await expect(page.locator('[data-testid="connection-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="submit-connection-btn"]')).toBeVisible();
      
      // Test mobile form interaction
      await page.locator('[data-testid="connection-name-input"]').fill('Mobile Test Connection');
      await expect(page.locator('[data-testid="connection-name-input"]')).toHaveValue('Mobile Test Connection');
    });
  });

  test.describe('OAuth2 Connection Management', () => {
    test('should create OAuth2 connection with GitHub provider', async ({ page }) => {
      await page.click('[data-testid="create-connection-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'GitHub OAuth2 Connection');
      await page.fill('[data-testid="connection-description-input"]', 'GitHub OAuth2 test connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.github.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      await page.selectOption('[data-testid="connection-provider-select"]', 'github');
      await page.fill('[data-testid="connection-clientid-input"]', 'test-github-client-id');
      await page.fill('[data-testid="connection-clientsecret-input"]', 'test-github-client-secret');
      await page.fill('[data-testid="connection-redirecturi-input"]', 'http://localhost:3000/api/oauth/callback');
      await page.fill('[data-testid="connection-scope-input"]', 'repo user');
      
      await page.click('[data-testid="submit-connection-btn"]');
      
      // Wait for form processing
      await page.waitForTimeout(2000);
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Should show the connection in the list
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('GitHub OAuth2 Connection');
    });

    test('should create OAuth2 connection with Google provider', async ({ page }) => {
      await page.click('[data-testid="create-connection-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'Google OAuth2 Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Google OAuth2 test connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://www.googleapis.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      await page.selectOption('[data-testid="connection-provider-select"]', 'google');
      await page.fill('[data-testid="connection-clientid-input"]', 'test-google-client-id');
      await page.fill('[data-testid="connection-clientsecret-input"]', 'test-google-client-secret');
      await page.fill('[data-testid="connection-redirecturi-input"]', 'http://localhost:3000/api/oauth/callback');
      await page.fill('[data-testid="connection-scope-input"]', 'https://www.googleapis.com/auth/calendar');
      
      await page.click('[data-testid="submit-connection-btn"]');
      
      // Wait for form processing
      await page.waitForTimeout(2000);
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Google OAuth2 Connection');
    });

    // TODO: OAuth2 callback functionality not fully implemented yet
    // test('should handle OAuth2 callback and complete connection', async ({ page }) => {
    //   // This test will be implemented when OAuth2 callback is fully implemented
    // });

    // TODO: OAuth2 token refresh functionality not implemented yet
    // test('should handle OAuth2 token refresh', async ({ page }) => {
    //   // This test will be implemented when token refresh is implemented
    // });
  });

  test.describe('Connection Testing', () => {
    test('should test API connection successfully', async ({ page }) => {
      // First create a connection
      await page.click('[data-testid="create-connection-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'Test Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Connection for testing');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
      await page.click('[data-testid="submit-connection-btn"]');
      
      // Wait for connection to be created
      await page.waitForTimeout(2000);
      
      // TODO: Test connection functionality not implemented yet
      // await page.click('[data-testid="test-connection-${connectionId}"]');
      // await expect(page.locator('[data-testid="test-result"]')).toContainText('Connection successful');
    });

    test('should handle connection test failure', async ({ page }) => {
      // First create a connection with invalid URL
      await page.click('[data-testid="create-connection-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'Invalid Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Connection with invalid URL');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://invalid-api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'invalid-key');
      await page.click('[data-testid="submit-connection-btn"]');
      
      // Wait for connection to be created
      await page.waitForTimeout(2000);
      
      // TODO: Test connection functionality not implemented yet
      // await page.click('[data-testid="test-connection-${connectionId}"]');
      // await expect(page.locator('[data-testid="test-result"]')).toContainText('Connection failed');
    });
  });

  test.describe('Connection Search and Filter', () => {
    test('should search connections by name', async ({ page }) => {
      // Create multiple connections first
      const connections = [
        { name: 'Search Test Connection 1', description: 'First test connection' },
        { name: 'Search Test Connection 2', description: 'Second test connection' },
        { name: 'Different Name Connection', description: 'Third test connection' }
      ];

      for (const connection of connections) {
        await page.click('[data-testid="create-connection-btn"]');
        await page.fill('[data-testid="connection-name-input"]', connection.name);
        await page.fill('[data-testid="connection-description-input"]', connection.description);
        await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
        await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
        await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
        await page.click('[data-testid="submit-connection-btn"]');
        await page.waitForTimeout(1000);
      }

      // Search for connections containing "Search Test"
      await page.fill('[data-testid="search-connections"]', 'Search Test');
      
      // Should show only connections with "Search Test" in the name
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Search Test Connection 1');
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Search Test Connection 2');
      await expect(page.locator('[data-testid="connection-card"]')).not.toContainText('Different Name Connection');
    });

    test('should filter connections by auth type', async ({ page }) => {
      // Create connections with different auth types
      const authTypes = [
        { type: 'API_KEY', name: 'API Key Connection' },
        { type: 'BEARER_TOKEN', name: 'Bearer Token Connection' },
        { type: 'BASIC_AUTH', name: 'Basic Auth Connection' }
      ];

      for (const auth of authTypes) {
        await page.click('[data-testid="create-connection-btn"]');
        await page.fill('[data-testid="connection-name-input"]', auth.name);
        await page.fill('[data-testid="connection-description-input"]', `${auth.type} test connection`);
        await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
        await page.selectOption('[data-testid="connection-authtype-select"]', auth.type);
        
        // Fill auth-specific fields
        if (auth.type === 'API_KEY') {
          await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
        } else if (auth.type === 'BEARER_TOKEN') {
          await page.fill('[data-testid="connection-bearertoken-input"]', 'test-token');
        } else if (auth.type === 'BASIC_AUTH') {
          await page.fill('[data-testid="connection-username-input"]', 'testuser');
          await page.fill('[data-testid="connection-password-input"]', 'testpass');
        }
        
        await page.click('[data-testid="submit-connection-btn"]');
        await page.waitForTimeout(1000);
      }

      // Filter by API Key
      await page.click('[data-testid="filter-dropdown"]');
      await page.click('[data-testid="filter-api-key"]');
      
      // Should show only API Key connections
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('API Key Connection');
      await expect(page.locator('[data-testid="connection-card"]')).not.toContainText('Bearer Token Connection');
      await expect(page.locator('[data-testid="connection-card"]')).not.toContainText('Basic Auth Connection');
    });
  });

  test.describe('Connection Status Monitoring', () => {
    test('should monitor connection status and health', async ({ page }) => {
      // Create a connection
      await page.click('[data-testid="create-connection-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'Status Test Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Connection for status monitoring');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
      await page.click('[data-testid="submit-connection-btn"]');
      
      // Wait for connection to be created
      await page.waitForTimeout(2000);
      
      // Should show connection with ACTIVE status
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('ACTIVE');
    });

    test('should handle connection status errors gracefully', async ({ page }) => {
      // Create a connection with invalid URL
      await page.click('[data-testid="create-connection-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'Error Test Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Connection with potential errors');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://invalid-api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'invalid-key');
      await page.click('[data-testid="submit-connection-btn"]');
      
      // Wait for connection to be created
      await page.waitForTimeout(2000);
      
      // Should still show the connection (even if it has errors)
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Error Test Connection');
    });
  });

  test.describe('Connection Performance Testing', () => {
    test('should measure connection response time', async ({ page }) => {
      // Create a connection
      await page.click('[data-testid="create-connection-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'Performance Test Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Connection for performance testing');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
      await page.click('[data-testid="submit-connection-btn"]');
      
      // Wait for connection to be created
      await page.waitForTimeout(2000);
      
      // TODO: Performance testing functionality not implemented yet
      // await page.click('[data-testid="test-connection-${connectionId}"]');
      // await expect(page.locator('[data-testid="response-time"]')).toBeVisible();
    });
  });
}); 