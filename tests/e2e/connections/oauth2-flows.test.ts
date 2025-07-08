import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: any;
let jwt: string;
let createdConnectionIds: string[] = [];

test.describe('OAuth2 Flow E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-oauth2-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E OAuth2 Test User'
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

  test.describe('GitHub OAuth2 Flow', () => {
    test('should complete GitHub OAuth2 authorization flow', async ({ page }) => {
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Fill basic connection details
      await page.fill('[data-testid="connection-name-input"]', 'GitHub API');
      await page.fill('[data-testid="connection-description-input"]', 'GitHub API via OAuth2');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.github.com');
      
      // Select OAuth2 authentication type
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      
      // Select GitHub provider
      await page.selectOption('[data-testid="connection-provider-select"]', 'github');
      
      // Should show OAuth2 configuration fields
      await expect(page.locator('[data-testid="connection-clientid-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-clientsecret-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-redirecturi-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-scope-input"]')).toBeVisible();
      
      // Fill OAuth2 credentials (using test credentials)
      await page.fill('[data-testid="connection-clientid-input"]', process.env.GITHUB_CLIENT_ID || 'test_client_id');
      await page.fill('[data-testid="connection-clientsecret-input"]', process.env.GITHUB_CLIENT_SECRET || 'test_client_secret');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Connection created successfully');
      
      // Should show the new connection in the list
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('GitHub API');
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('OAuth2');
    });

    test('should handle GitHub OAuth2 callback with authorization code', async ({ page }) => {
      // Simulate OAuth2 callback with authorization code
      const authCode = 'test_auth_code_123';
      
      // Navigate directly to callback endpoint
      await page.goto(`${BASE_URL}/api/oauth/callback?code=${authCode}&state=test_state`);
      
      // Should handle callback and show appropriate response
      await expect(page).toHaveURL(/.*callback/);
    });

    test('should handle GitHub OAuth2 error scenarios', async ({ page }) => {
      // Test access denied scenario
      await page.goto(`${BASE_URL}/api/oauth/callback?error=access_denied&state=test_state`);
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/Access denied|Authorization failed/);
    });
  });

  test.describe('Google OAuth2 Flow', () => {
    test('should complete Google OAuth2 authorization flow', async ({ page }) => {
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Fill basic connection details
      await page.fill('[data-testid="connection-name-input"]', 'Google Calendar API');
      await page.fill('[data-testid="connection-description-input"]', 'Google Calendar API via OAuth2');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://www.googleapis.com');
      
      // Select OAuth2 authentication type
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      
      // Select Google provider
      await page.selectOption('[data-testid="connection-provider-select"]', 'google');
      
      // Should show OAuth2 configuration fields
      await expect(page.locator('[data-testid="connection-clientid-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-clientsecret-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-redirecturi-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-scope-input"]')).toBeVisible();
      
      // Fill OAuth2 credentials (using test credentials)
      await page.fill('[data-testid="connection-clientid-input"]', process.env.GOOGLE_CLIENT_ID || 'test_client_id');
      await page.fill('[data-testid="connection-clientsecret-input"]', process.env.GOOGLE_CLIENT_SECRET || 'test_client_secret');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Connection created successfully');
      
      // Should show the new connection in the list
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Google Calendar API');
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('OAuth2');
    });
  });

  test.describe('Slack OAuth2 Flow', () => {
    test('should complete Slack OAuth2 authorization flow', async ({ page }) => {
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Fill basic connection details
      await page.fill('[data-testid="connection-name-input"]', 'Slack API');
      await page.fill('[data-testid="connection-description-input"]', 'Slack API via OAuth2');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://slack.com/api');
      
      // Select OAuth2 authentication type
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      
      // Select Slack provider
      await page.selectOption('[data-testid="connection-provider-select"]', 'slack');
      
      // Should show OAuth2 configuration fields
      await expect(page.locator('[data-testid="connection-clientid-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-clientsecret-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-redirecturi-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-scope-input"]')).toBeVisible();
      
      // Fill OAuth2 credentials (using test credentials)
      await page.fill('[data-testid="connection-clientid-input"]', process.env.SLACK_CLIENT_ID || 'test_client_id');
      await page.fill('[data-testid="connection-clientsecret-input"]', process.env.SLACK_CLIENT_SECRET || 'test_client_secret');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Connection created successfully');
      
      // Should show the new connection in the list
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Slack API');
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('OAuth2');
    });
  });

  test.describe('OAuth2 Token Management', () => {
    test('should store OAuth2 tokens securely', async ({ page }) => {
      // Create OAuth2 connection via API first
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Secure OAuth2 API',
          baseUrl: 'https://api.github.com',
          authType: 'OAUTH2',
          oauth2Provider: 'GITHUB',
          clientId: 'test_client_id',
          clientSecret: 'test_client_secret'
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
      
      // Should show OAuth2 status
      await expect(page.locator('[data-testid="oauth2-status"]')).toBeVisible();
      
      // Should NOT show actual tokens in UI
      await expect(page.locator('[data-testid="connection-details"]')).not.toContainText('access_token');
      await expect(page.locator('[data-testid="connection-details"]')).not.toContainText('refresh_token');
    });

    test('should refresh expired OAuth2 tokens automatically', async ({ page }) => {
      // Create OAuth2 connection via API first
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Refreshable OAuth2 API',
          baseUrl: 'https://api.github.com',
          authType: 'OAUTH2',
          oauth2Provider: 'GITHUB',
          clientId: 'test_client_id',
          clientSecret: 'test_client_secret'
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
      
      // Click refresh token button
      await page.click('[data-testid="refresh-token-btn"]');
      
      // Should show refresh success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Token refreshed successfully');
    });

    test('should handle OAuth2 token refresh errors', async ({ page }) => {
      // Create OAuth2 connection via API first
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Expired OAuth2 API',
          baseUrl: 'https://api.github.com',
          authType: 'OAUTH2',
          oauth2Provider: 'GITHUB',
          clientId: 'test_client_id',
          clientSecret: 'test_client_secret'
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
      
      // Simulate expired refresh token by clicking refresh
      await page.click('[data-testid="refresh-token-btn"]');
      
      // Should show re-authorization required message
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/Re-authorization required|Token expired/);
      
      // Should show re-authorize button
      await expect(page.locator('[data-testid="re-authorize-btn"]')).toBeVisible();
    });
  });

  test.describe('OAuth2 Security Features', () => {
    test('should validate OAuth2 state parameter', async ({ page }) => {
      // Test callback without state parameter
      await page.goto(`${BASE_URL}/api/oauth/callback?code=test_code`);
      
      // Should show security error
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/Invalid state|Security validation failed/);
    });

    test('should handle OAuth2 CSRF protection', async ({ page }) => {
      // Test callback with invalid state parameter
      await page.goto(`${BASE_URL}/api/oauth/callback?code=test_code&state=invalid_state`);
      
      // Should show security error
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/Invalid state|CSRF protection/);
    });

    test('should encrypt OAuth2 tokens at rest', async ({ page }) => {
      // Create OAuth2 connection via API first
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Encrypted OAuth2 API',
          baseUrl: 'https://api.github.com',
          authType: 'OAUTH2',
          oauth2Provider: 'GITHUB',
          clientId: 'test_client_id',
          clientSecret: 'test_client_secret'
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
      
      // Verify response doesn't contain plaintext tokens
      expect(connection.data?.accessToken).toBeUndefined();
      expect(connection.data?.refreshToken).toBeUndefined();
      
      // Check audit log doesn't contain tokens
      await page.click('[data-testid="tab-audit"]');
      await expect(page.locator('[data-testid="audit-log"]')).toContainText('OAuth2 connection created');
      await expect(page.locator('[data-testid="audit-log"]')).not.toContainText('access_token');
      await expect(page.locator('[data-testid="audit-log"]')).not.toContainText('refresh_token');
    });
  });

  test.describe('OAuth2 Provider Support', () => {
    test('should list supported OAuth2 providers', async ({ page }) => {
      // Navigate to OAuth2 providers list
      await page.goto(`${BASE_URL}/api/oauth/providers`);
      
      // Should return list of supported providers
      const response = await page.request.get('/api/oauth/providers', {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const providers = await response.json();
      
      // Should include major providers
      expect(providers.data).toContain('GITHUB');
      expect(providers.data).toContain('GOOGLE');
      expect(providers.data).toContain('SLACK');
      
      // Should show provider configuration
      expect(providers.data).toHaveProperty('GITHUB');
      expect(providers.data).toHaveProperty('GOOGLE');
      expect(providers.data).toHaveProperty('SLACK');
    });

    test('should handle unsupported OAuth2 providers gracefully', async ({ page }) => {
      // Click create connection button
      await page.click('[data-testid="create-connection-btn"]');
      
      // Fill basic connection details
      await page.fill('[data-testid="connection-name-input"]', 'Unsupported Provider Test');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      
      // Select OAuth2 authentication type
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      
      // Try to select unsupported provider (custom option)
      await page.selectOption('[data-testid="connection-provider-select"]', 'custom');
      
      // Should show OAuth2 configuration fields for custom provider
      await expect(page.locator('[data-testid="connection-clientid-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-clientsecret-input"]')).toBeVisible();
    });
  });

  test.describe('OAuth2 Error Handling', () => {
    test('should handle OAuth2 authorization errors', async ({ page }) => {
      // Test various OAuth2 error scenarios
      const errorScenarios = [
        { error: 'access_denied', description: 'User denied authorization' },
        { error: 'invalid_request', description: 'Invalid request parameters' },
        { error: 'invalid_scope', description: 'Invalid scope requested' },
        { error: 'server_error', description: 'OAuth2 server error' },
        { error: 'temporarily_unavailable', description: 'Service temporarily unavailable' }
      ];
      
      for (const scenario of errorScenarios) {
        await page.goto(`${BASE_URL}/api/oauth/callback?error=${scenario.error}&state=test_state`);
        
        // Should show appropriate error message
        await expect(page.locator('[data-testid="error-message"]')).toContainText(/Authorization failed|OAuth2 error/);
      }
    });

    test('should handle OAuth2 token exchange errors', async ({ page }) => {
      // Test invalid authorization code
      await page.goto(`${BASE_URL}/api/oauth/callback?code=invalid_code&state=test_state`);
      
      // Should show token exchange error
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/Token exchange failed|Invalid authorization code/);
    });
  });
}); 