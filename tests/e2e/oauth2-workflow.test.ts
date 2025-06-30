import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('OAuth2 Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);
  });

  test.describe('GitHub OAuth2 Flow', () => {
    test('should complete full GitHub OAuth2 workflow', async ({ page }) => {
      // Step 1: Login to the application
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', 'test-user@example.com');
      await page.fill('input[name="password"]', 'test-password-123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);

      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      await expect(page).toHaveURL(/.*connections/);

      // Step 3: Create new API connection with OAuth2
      await page.click('text=Add Connection');
      await page.fill('input[name="name"]', 'GitHub API OAuth2 Test');
      await page.fill('input[name="baseUrl"]', 'https://api.github.com');
      
      // Select OAuth2 auth type
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      
      // Fill OAuth2 configuration
      await page.fill('input[name="clientId"]', 'test-github-client-id');
      await page.fill('input[name="clientSecret"]', 'test-github-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/api/oauth/callback');
      await page.fill('input[name="scope"]', 'repo user');
      
      // Select GitHub provider
      await page.selectOption('select[name="provider"]', 'github');
      
      await page.click('button[type="submit"]');

      // Step 4: Verify OAuth2 authorization URL generation
      await expect(page).toHaveURL(/.*github\.com.*login\/oauth\/authorize/);
      
      // Verify authorization URL parameters
      const url = page.url();
      expect(url).toContain('client_id=test-github-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Foauth%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=repo%20user');
      expect(url).toContain('state=');
    });

    test('should handle GitHub OAuth2 authorization cancellation', async ({ page }) => {
      // Step 1: Login to the application
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', 'test-user@example.com');
      await page.fill('input[name="password"]', 'test-password-123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);

      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      await expect(page).toHaveURL(/.*connections/);

      // Step 3: Create new API connection with OAuth2
      await page.click('text=Add Connection');
      await page.fill('input[name="name"]', 'GitHub API OAuth2 Test');
      await page.fill('input[name="baseUrl"]', 'https://api.github.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      await page.fill('input[name="clientId"]', 'test-github-client-id');
      await page.fill('input[name="clientSecret"]', 'test-github-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/api/oauth/callback');
      await page.fill('input[name="scope"]', 'repo user');
      await page.selectOption('select[name="provider"]', 'github');
      await page.click('button[type="submit"]');

      // Step 4: Simulate OAuth2 cancellation by navigating back
      await page.goBack();
      
      // Step 5: Verify user is back on the connections page
      await expect(page).toHaveURL(/.*connections/);
      
      // Step 6: Verify error message is displayed
      await expect(page.locator('.error-message')).toContainText('OAuth2 authorization was cancelled');
    });
  });

  test.describe('Google OAuth2 Flow', () => {
    test('should complete full Google OAuth2 workflow', async ({ page }) => {
      // Step 1: Login to the application
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', 'test-user@example.com');
      await page.fill('input[name="password"]', 'test-password-123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);

      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      await expect(page).toHaveURL(/.*connections/);

      // Step 3: Create new API connection with OAuth2
      await page.click('text=Add Connection');
      await page.fill('input[name="name"]', 'Google Calendar API OAuth2 Test');
      await page.fill('input[name="baseUrl"]', 'https://www.googleapis.com');
      
      // Select OAuth2 auth type
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      
      // Fill OAuth2 configuration
      await page.fill('input[name="clientId"]', 'test-google-client-id');
      await page.fill('input[name="clientSecret"]', 'test-google-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/api/oauth/callback');
      await page.fill('input[name="scope"]', 'https://www.googleapis.com/auth/calendar');
      
      // Select Google provider
      await page.selectOption('select[name="provider"]', 'google');
      
      await page.click('button[type="submit"]');

      // Step 4: Verify OAuth2 authorization URL generation
      await expect(page).toHaveURL(/.*accounts\.google\.com.*oauth2.*auth/);
      
      // Verify authorization URL parameters
      const url = page.url();
      expect(url).toContain('client_id=test-google-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Foauth%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar');
      expect(url).toContain('state=');
    });

    test('should handle Google OAuth2 with Gmail scope', async ({ page }) => {
      // Step 1: Login to the application
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', 'test-user@example.com');
      await page.fill('input[name="password"]', 'test-password-123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);

      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      await expect(page).toHaveURL(/.*connections/);

      // Step 3: Create new API connection with OAuth2
      await page.click('text=Add Connection');
      await page.fill('input[name="name"]', 'Gmail API OAuth2 Test');
      await page.fill('input[name="baseUrl"]', 'https://www.googleapis.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      await page.fill('input[name="clientId"]', 'test-google-client-id');
      await page.fill('input[name="clientSecret"]', 'test-google-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/api/oauth/callback');
      await page.fill('input[name="scope"]', 'https://www.googleapis.com/auth/gmail.readonly');
      await page.selectOption('select[name="provider"]', 'google');
      await page.click('button[type="submit"]');

      // Step 4: Verify OAuth2 authorization URL generation
      await expect(page).toHaveURL(/.*accounts\.google\.com.*oauth2.*auth/);
      
      // Verify Gmail scope is included
      const url = page.url();
      expect(url).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.readonly');
    });
  });

  test.describe('Slack OAuth2 Flow', () => {
    test('should complete full Slack OAuth2 workflow', async ({ page }) => {
      // Step 1: Login to the application
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', 'test-user@example.com');
      await page.fill('input[name="password"]', 'test-password-123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);

      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      await expect(page).toHaveURL(/.*connections/);

      // Step 3: Create new API connection with OAuth2
      await page.click('text=Add Connection');
      await page.fill('input[name="name"]', 'Slack API OAuth2 Test');
      await page.fill('input[name="baseUrl"]', 'https://slack.com/api');
      
      // Select OAuth2 auth type
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      
      // Fill OAuth2 configuration
      await page.fill('input[name="clientId"]', 'test-slack-client-id');
      await page.fill('input[name="clientSecret"]', 'test-slack-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/api/oauth/callback');
      await page.fill('input[name="scope"]', 'channels:read chat:write');
      
      // Select Slack provider
      await page.selectOption('select[name="provider"]', 'slack');
      
      await page.click('button[type="submit"]');

      // Step 4: Verify OAuth2 authorization URL generation
      await expect(page).toHaveURL(/.*slack\.com.*oauth.*authorize/);
      
      // Verify authorization URL parameters
      const url = page.url();
      expect(url).toContain('client_id=test-slack-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Foauth%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=channels%3Aread%20chat%3Awrite');
      expect(url).toContain('state=');
    });

    test('should handle Slack OAuth2 with users scope', async ({ page }) => {
      // Step 1: Login to the application
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', 'test-user@example.com');
      await page.fill('input[name="password"]', 'test-password-123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);

      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      await expect(page).toHaveURL(/.*connections/);

      // Step 3: Create new API connection with OAuth2
      await page.click('text=Add Connection');
      await page.fill('input[name="name"]', 'Slack Users API OAuth2 Test');
      await page.fill('input[name="baseUrl"]', 'https://slack.com/api');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      await page.fill('input[name="clientId"]', 'test-slack-client-id');
      await page.fill('input[name="clientSecret"]', 'test-slack-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/api/oauth/callback');
      await page.fill('input[name="scope"]', 'users:read');
      await page.selectOption('select[name="provider"]', 'slack');
      await page.click('button[type="submit"]');

      // Step 4: Verify OAuth2 authorization URL generation
      await expect(page).toHaveURL(/.*slack\.com.*oauth.*authorize/);
      
      // Verify users scope is included
      const url = page.url();
      expect(url).toContain('scope=users%3Aread');
    });
  });

  test.describe('OAuth2 Error Handling', () => {
    test('should handle OAuth2 provider errors gracefully', async ({ page }) => {
      // Step 1: Login to the application
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', 'test-user@example.com');
      await page.fill('input[name="password"]', 'test-password-123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);

      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      await expect(page).toHaveURL(/.*connections/);

      // Step 3: Create new API connection with invalid OAuth2 config
      await page.click('text=Add Connection');
      await page.fill('input[name="name"]', 'Invalid OAuth2 Test');
      await page.fill('input[name="baseUrl"]', 'https://api.example.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      await page.fill('input[name="clientId"]', ''); // Invalid: empty clientId
      await page.fill('input[name="clientSecret"]', 'test-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/api/oauth/callback');
      await page.selectOption('select[name="provider"]', 'github');
      await page.click('button[type="submit"]');

      // Step 4: Verify error message is displayed
      await expect(page.locator('.error-message')).toContainText('clientId is required');
    });

    test('should handle unsupported OAuth2 providers', async ({ page }) => {
      // Step 1: Login to the application
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', 'test-user@example.com');
      await page.fill('input[name="password"]', 'test-password-123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);

      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      await expect(page).toHaveURL(/.*connections/);

      // Step 3: Create new API connection with unsupported provider
      await page.click('text=Add Connection');
      await page.fill('input[name="name"]', 'Unsupported Provider Test');
      await page.fill('input[name="baseUrl"]', 'https://api.example.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      await page.fill('input[name="clientId"]', 'test-client-id');
      await page.fill('input[name="clientSecret"]', 'test-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/api/oauth/callback');
      
      // Try to select unsupported provider (if available in UI)
      // This test assumes the UI doesn't allow unsupported providers
      await page.click('button[type="submit"]');

      // Step 4: Verify error message is displayed
      await expect(page.locator('.error-message')).toContainText('Unsupported OAuth2 provider');
    });

    test('should handle network errors during OAuth2 flow', async ({ page }) => {
      // Step 1: Login to the application
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', 'test-user@example.com');
      await page.fill('input[name="password"]', 'test-password-123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);

      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      await expect(page).toHaveURL(/.*connections/);

      // Step 3: Create new API connection with OAuth2
      await page.click('text=Add Connection');
      await page.fill('input[name="name"]', 'Network Error OAuth2 Test');
      await page.fill('input[name="baseUrl"]', 'https://api.example.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      await page.fill('input[name="clientId"]', 'test-client-id');
      await page.fill('input[name="clientSecret"]', 'test-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/api/oauth/callback');
      await page.selectOption('select[name="provider"]', 'github');
      await page.click('button[type="submit"]');

      // Step 4: Simulate network error by going offline
      await page.context().setOffline(true);
      
      // Step 5: Try to complete OAuth2 flow
      await page.reload();
      
      // Step 6: Verify error handling
      await expect(page.locator('.error-message')).toContainText('Network error');
      
      // Step 7: Go back online
      await page.context().setOffline(false);
    });
  });

  test.describe('OAuth2 Security', () => {
    test('should validate OAuth2 state parameter', async ({ page }) => {
      // Step 1: Login to the application
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', 'test-user@example.com');
      await page.fill('input[name="password"]', 'test-password-123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);

      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      await expect(page).toHaveURL(/.*connections/);

      // Step 3: Create new API connection with OAuth2
      await page.click('text=Add Connection');
      await page.fill('input[name="name"]', 'Security Test OAuth2');
      await page.fill('input[name="baseUrl"]', 'https://api.example.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      await page.fill('input[name="clientId"]', 'test-client-id');
      await page.fill('input[name="clientSecret"]', 'test-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/api/oauth/callback');
      await page.selectOption('select[name="provider"]', 'github');
      await page.click('button[type="submit"]');

      // Step 4: Verify state parameter is present in URL
      const url = page.url();
      expect(url).toContain('state=');
      
      // Step 5: Try to access callback with invalid state
      const invalidCallbackUrl = `${BASE_URL}/api/oauth/callback?code=test_code&state=invalid_state`;
      await page.goto(invalidCallbackUrl);
      
      // Step 6: Verify error message
      await expect(page.locator('body')).toContainText('Invalid state parameter');
    });

    test('should require authentication for OAuth2 operations', async ({ page }) => {
      // Step 1: Try to access OAuth2 authorize endpoint without authentication
      await page.goto(`${BASE_URL}/api/oauth/authorize?provider=github&clientId=test&clientSecret=test&redirectUri=test`);
      
      // Step 2: Verify authentication is required
      await expect(page.locator('body')).toContainText('Unauthorized');
    });
  });

  test.describe('OAuth2 Integration', () => {
    test('should display OAuth2 providers list', async ({ page }) => {
      // Step 1: Login to the application
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', 'test-user@example.com');
      await page.fill('input[name="password"]', 'test-password-123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);

      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      await expect(page).toHaveURL(/.*connections/);

      // Step 3: Create new API connection
      await page.click('text=Add Connection');
      await page.fill('input[name="name"]', 'OAuth2 Providers Test');
      await page.fill('input[name="baseUrl"]', 'https://api.example.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');

      // Step 4: Verify OAuth2 providers are available
      const providerSelect = page.locator('select[name="provider"]');
      await expect(providerSelect).toContainText('GitHub');
      await expect(providerSelect).toContainText('Google');
      await expect(providerSelect).toContainText('Slack');
    });

    test('should handle OAuth2 token refresh', async ({ page }) => {
      // Step 1: Login to the application
      await page.click('text=Sign In');
      await page.fill('input[name="email"]', 'test-user@example.com');
      await page.fill('input[name="password"]', 'test-password-123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);

      // Step 2: Navigate to existing OAuth2 connection
      await page.click('text=API Connections');
      await expect(page).toHaveURL(/.*connections/);

      // Step 3: Find and click on an existing OAuth2 connection
      const oauth2Connection = page.locator('.connection-item').filter({ hasText: 'OAuth2' }).first();
      await oauth2Connection.click();

      // Step 4: Click refresh token button
      await page.click('text=Refresh Token');
      
      // Step 5: Verify token refresh success
      await expect(page.locator('.success-message')).toContainText('Token refreshed successfully');
    });
  });
}); 