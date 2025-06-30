import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser;
let jwt;
let createdConnectionIds: string[] = [];

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
  });

  test.describe('Connection CRUD Operations', () => {
    test('should create a new API connection', async ({ page }) => {
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Fill connection form
      await page.fill('input[name="name"]', 'Test API Connection');
      await page.fill('input[name="baseUrl"]', 'https://api.example.com');
      await page.selectOption('select[name="authType"]', 'API_KEY');
      await page.fill('input[name="apiKey"]', 'test-api-key-123');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Connection created successfully');
      
      // Should redirect to connections list
      await expect(page).toHaveURL(/.*connections/);
      
      // Should show new connection in list
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Test API Connection');
    });

    test('should create connection with Bearer token auth', async ({ page }) => {
      await page.click('[data-testid="create-connection-btn"]');
      
      await page.fill('input[name="name"]', 'Bearer Token Connection');
      await page.fill('input[name="baseUrl"]', 'https://api.example.com');
      await page.selectOption('select[name="authType"]', 'BEARER_TOKEN');
      await page.fill('input[name="bearerToken"]', 'test-bearer-token-123');
      
      await page.click('button[type="submit"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Connection created successfully');
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Bearer Token Connection');
    });

    test('should create connection with Basic auth', async ({ page }) => {
      await page.click('[data-testid="create-connection-btn"]');
      
      await page.fill('input[name="name"]', 'Basic Auth Connection');
      await page.fill('input[name="baseUrl"]', 'https://api.example.com');
      await page.selectOption('select[name="authType"]', 'BASIC');
      await page.fill('input[name="username"]', 'testuser');
      await page.fill('input[name="password"]', 'testpass');
      
      await page.click('button[type="submit"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Connection created successfully');
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Basic Auth Connection');
    });

    test('should edit an existing connection', async ({ page }) => {
      // Create a connection first via API
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Connection to Edit',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY',
          config: {
            apiKey: 'original-key'
          }
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await response.json();
      createdConnectionIds.push(connection.data.id);
      
      // Refresh page to see new connection
      await page.reload();
      
      // Click edit button on the connection
      await page.click(`[data-testid="edit-connection-${connection.data.id}"]`);
      
      // Update connection details
      await page.fill('input[name="name"]', 'Updated Connection Name');
      await page.fill('input[name="apiKey"]', 'updated-api-key');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Connection updated successfully');
      
      // Should show updated name in list
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Updated Connection Name');
    });

    test('should delete a connection', async ({ page }) => {
      // Create a connection first via API
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Connection to Delete',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY',
          config: {
            apiKey: 'delete-test-key'
          }
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await response.json();
      createdConnectionIds.push(connection.data.id);
      
      // Refresh page to see new connection
      await page.reload();
      
      // Click delete button on the connection
      await page.click(`[data-testid="delete-connection-${connection.data.id}"]`);
      
      // Confirm deletion in modal
      await page.click('[data-testid="confirm-delete-btn"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Connection deleted successfully');
      
      // Should not show deleted connection in list
      await expect(page.locator('[data-testid="connection-card"]')).not.toContainText('Connection to Delete');
    });

    test('should cancel connection deletion', async ({ page }) => {
      // Create a connection first via API
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Connection to Keep',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY',
          config: {
            apiKey: 'keep-test-key'
          }
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await response.json();
      createdConnectionIds.push(connection.data.id);
      
      // Refresh page to see new connection
      await page.reload();
      
      // Click delete button on the connection
      await page.click(`[data-testid="delete-connection-${connection.data.id}"]`);
      
      // Cancel deletion in modal
      await page.click('[data-testid="cancel-delete-btn"]');
      
      // Should close modal and keep connection
      await expect(page.locator('[data-testid="delete-modal"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Connection to Keep');
    });
  });

  test.describe('OAuth2 Connection Management', () => {
    test('should create OAuth2 connection with GitHub provider', async ({ page }) => {
      await page.click('[data-testid="create-connection-btn"]');
      
      await page.fill('input[name="name"]', 'GitHub OAuth2 Connection');
      await page.fill('input[name="baseUrl"]', 'https://api.github.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      await page.selectOption('select[name="provider"]', 'github');
      await page.fill('input[name="clientId"]', 'test-github-client-id');
      await page.fill('input[name="clientSecret"]', 'test-github-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/api/oauth/callback');
      await page.fill('input[name="scope"]', 'repo user');
      
      await page.click('button[type="submit"]');
      
      // Should redirect to OAuth2 authorization
      await expect(page).toHaveURL(/.*github\.com.*login\/oauth\/authorize/);
      
      // Verify OAuth2 parameters
      const url = page.url();
      expect(url).toContain('client_id=test-github-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Foauth%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=repo%20user');
    });

    test('should create OAuth2 connection with Google provider', async ({ page }) => {
      await page.click('[data-testid="create-connection-btn"]');
      
      await page.fill('input[name="name"]', 'Google OAuth2 Connection');
      await page.fill('input[name="baseUrl"]', 'https://www.googleapis.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      await page.selectOption('select[name="provider"]', 'google');
      await page.fill('input[name="clientId"]', 'test-google-client-id');
      await page.fill('input[name="clientSecret"]', 'test-google-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/api/oauth/callback');
      await page.fill('input[name="scope"]', 'https://www.googleapis.com/auth/calendar');
      
      await page.click('button[type="submit"]');
      
      // Should redirect to Google OAuth2 authorization
      await expect(page).toHaveURL(/.*accounts\.google\.com.*oauth2.*auth/);
      
      // Verify OAuth2 parameters
      const url = page.url();
      expect(url).toContain('client_id=test-google-client-id');
      expect(url).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar');
    });

    test('should handle OAuth2 callback and complete connection', async ({ page }) => {
      // Mock successful OAuth2 callback
      await page.route('**/api/oauth/callback**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              accessToken: 'mock-oauth-token',
              refreshToken: 'mock-refresh-token',
              expiresIn: 3600
            }
          })
        });
      });
      
      // Create OAuth2 connection via API
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'OAuth2 Test Connection',
          baseUrl: 'https://api.example.com',
          authType: 'OAUTH2',
          config: {
            provider: 'github',
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            redirectUri: 'http://localhost:3000/api/oauth/callback',
            scope: 'repo user'
          }
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await response.json();
      createdConnectionIds.push(connection.data.id);
      
      // Navigate to OAuth2 callback
      await page.goto(`${BASE_URL}/api/oauth/callback?code=valid-code&state=valid-state`);
      
      // Should redirect back to connections with success
      await expect(page).toHaveURL(/.*connections/);
      await expect(page.locator('[data-testid="success-message"]')).toContainText('OAuth2 connection completed');
    });

    test('should handle OAuth2 token refresh', async ({ page }) => {
      // Create OAuth2 connection with expired token
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'OAuth2 Refresh Test',
          baseUrl: 'https://api.example.com',
          authType: 'OAUTH2',
          config: {
            provider: 'github',
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            accessToken: 'expired-token',
            refreshToken: 'valid-refresh-token'
          }
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await response.json();
      createdConnectionIds.push(connection.data.id);
      
      // Mock token refresh
      await page.route('**/api/connections/*/refresh**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              accessToken: 'new-access-token',
              expiresIn: 3600
            }
          })
        });
      });
      
      // Click refresh token button
      await page.click(`[data-testid="refresh-token-${connection.data.id}"]`);
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Token refreshed successfully');
    });
  });

  test.describe('Connection Testing', () => {
    test('should test API connection successfully', async ({ page }) => {
      // Create a connection first
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Test Connection',
          baseUrl: 'https://httpbin.org',
          authType: 'NONE'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await response.json();
      createdConnectionIds.push(connection.data.id);
      
      // Refresh page to see new connection
      await page.reload();
      
      // Click test connection button
      await page.click(`[data-testid="test-connection-${connection.data.id}"]`);
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Connection test successful');
    });

    test('should handle connection test failure', async ({ page }) => {
      // Create a connection with invalid URL
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Invalid Connection',
          baseUrl: 'https://invalid-api.example.com',
          authType: 'NONE'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const connection = await response.json();
      createdConnectionIds.push(connection.data.id);
      
      // Refresh page to see new connection
      await page.reload();
      
      // Click test connection button
      await page.click(`[data-testid="test-connection-${connection.data.id}"]`);
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Connection test failed');
    });
  });

  test.describe('Connection Validation', () => {
    test('should validate required fields', async ({ page }) => {
      await page.click('[data-testid="create-connection-btn"]');
      
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Should show validation errors
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
      await expect(page.locator('[data-testid="baseUrl-error"]')).toContainText('Base URL is required');
    });

    test('should validate URL format', async ({ page }) => {
      await page.click('[data-testid="create-connection-btn"]');
      
      // Fill invalid URL
      await page.fill('input[name="baseUrl"]', 'invalid-url');
      await page.click('button[type="submit"]');
      
      // Should show URL validation error
      await expect(page.locator('[data-testid="baseUrl-error"]')).toContainText('Invalid URL format');
    });

    test('should validate OAuth2 required fields', async ({ page }) => {
      await page.click('[data-testid="create-connection-btn"]');
      
      // Select OAuth2 auth type
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      
      // Try to submit without required OAuth2 fields
      await page.click('button[type="submit"]');
      
      // Should show OAuth2 validation errors
      await expect(page.locator('[data-testid="clientId-error"]')).toContainText('Client ID is required');
      await expect(page.locator('[data-testid="clientSecret-error"]')).toContainText('Client Secret is required');
      await expect(page.locator('[data-testid="redirectUri-error"]')).toContainText('Redirect URI is required');
    });
  });

  test.describe('Connection Search and Filter', () => {
    test('should search connections by name', async ({ page }) => {
      // Create multiple connections
      const connections = [];
      for (let i = 0; i < 3; i++) {
        const response = await page.request.post('/api/connections', {
          data: {
            name: `Test Connection ${i + 1}`,
            baseUrl: 'https://api.example.com',
            authType: 'API_KEY',
            config: { apiKey: `key-${i}` }
          },
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          }
        });
        const connection = await response.json();
        connections.push(connection.data);
        createdConnectionIds.push(connection.data.id);
      }
      
      // Refresh page to see new connections
      await page.reload();
      
      // Search for specific connection
      await page.fill('[data-testid="search-connections"]', 'Test Connection 2');
      
      // Should show only matching connection
      await expect(page.locator('[data-testid="connection-card"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Test Connection 2');
    });

    test('should filter connections by auth type', async ({ page }) => {
      // Create connections with different auth types
      const connections = [];
      const authTypes = ['API_KEY', 'BEARER_TOKEN', 'BASIC'];
      
      for (const authType of authTypes) {
        const response = await page.request.post('/api/connections', {
          data: {
            name: `${authType} Connection`,
            baseUrl: 'https://api.example.com',
            authType,
            config: { apiKey: 'test-key' }
          },
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          }
        });
        const connection = await response.json();
        connections.push(connection.data);
        createdConnectionIds.push(connection.data.id);
      }
      
      // Refresh page to see new connections
      await page.reload();
      
      // Filter by API_KEY auth type
      await page.click('[data-testid="filter-dropdown"]');
      await page.click('[data-testid="filter-api-key"]');
      
      // Should show only API_KEY connections
      await expect(page.locator('[data-testid="connection-card"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('API_KEY Connection');
    });
  });
}); 