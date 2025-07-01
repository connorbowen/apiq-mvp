import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser;

test.describe('OAuth2 Workflow E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user
    testUser = await createTestUser(
      `e2e-oauth2-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E OAuth2 Test User'
    );
  });

  test.afterAll(async () => {
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.describe('GitHub OAuth2 Flow', () => {
    test.skip('should complete full GitHub OAuth2 workflow', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      
      // Step 3: Create new connection
      await page.click('text=Create Connection');
      
      // Step 4: Fill connection details
      await page.fill('input[name="name"]', 'GitHub API');
      await page.fill('input[name="baseUrl"]', 'https://api.github.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      
      // Step 5: Click OAuth2 setup
      await page.click('text=Setup OAuth2');
      
      // Step 6: Fill OAuth2 details
      await page.fill('input[name="clientId"]', 'test-client-id');
      await page.fill('input[name="clientSecret"]', 'test-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/oauth/callback');
      await page.fill('input[name="scope"]', 'repo user');
      
      // Step 7: Authorize OAuth2
      await page.click('text=Authorize');
      
      // Step 8: Should redirect to GitHub OAuth
      await expect(page).toHaveURL(/.*github\.com.*login\/oauth\/authorize/);
      
      // Step 9: Mock successful authorization (in real test, would complete OAuth flow)
      // For now, just verify we reached the OAuth provider
      expect(page.url()).toContain('github.com');
    });

    test.skip('should handle GitHub OAuth2 authorization cancellation', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      
      // Step 3: Create new connection
      await page.click('text=Create Connection');
      
      // Step 4: Fill connection details
      await page.fill('input[name="name"]', 'GitHub API');
      await page.fill('input[name="baseUrl"]', 'https://api.github.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      
      // Step 5: Click OAuth2 setup
      await page.click('text=Setup OAuth2');
      
      // Step 6: Fill OAuth2 details
      await page.fill('input[name="clientId"]', 'test-client-id');
      await page.fill('input[name="clientSecret"]', 'test-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/oauth/callback');
      await page.fill('input[name="scope"]', 'repo user');
      
      // Step 7: Authorize OAuth2
      await page.click('text=Authorize');
      
      // Step 8: Should redirect to GitHub OAuth
      await expect(page).toHaveURL(/.*github\.com.*login\/oauth\/authorize/);
      
      // Step 9: Mock cancellation by navigating back
      await page.goBack();
      
      // Step 10: Should be back on OAuth2 setup page
      await expect(page).toHaveURL(/.*oauth2.*/);
    });
  });

  test.describe('Google OAuth2 Flow', () => {
    test.skip('should complete full Google OAuth2 workflow', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      
      // Step 3: Create new connection
      await page.click('text=Create Connection');
      
      // Step 4: Fill connection details
      await page.fill('input[name="name"]', 'Google API');
      await page.fill('input[name="baseUrl"]', 'https://www.googleapis.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      
      // Step 5: Click OAuth2 setup
      await page.click('text=Setup OAuth2');
      
      // Step 6: Fill OAuth2 details
      await page.fill('input[name="clientId"]', 'test-client-id');
      await page.fill('input[name="clientSecret"]', 'test-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/oauth/callback');
      await page.fill('input[name="scope"]', 'https://www.googleapis.com/auth/userinfo.profile');
      
      // Step 7: Authorize OAuth2
      await page.click('text=Authorize');
      
      // Step 8: Should redirect to Google OAuth
      await expect(page).toHaveURL(/.*accounts\.google\.com.*oauth2.*auth/);
      
      // Step 9: Mock successful authorization
      expect(page.url()).toContain('accounts.google.com');
    });

    test.skip('should handle Google OAuth2 with Gmail scope', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      
      // Step 3: Create new connection
      await page.click('text=Create Connection');
      
      // Step 4: Fill connection details
      await page.fill('input[name="name"]', 'Gmail API');
      await page.fill('input[name="baseUrl"]', 'https://gmail.googleapis.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      
      // Step 5: Click OAuth2 setup
      await page.click('text=Setup OAuth2');
      
      // Step 6: Fill OAuth2 details with Gmail scope
      await page.fill('input[name="clientId"]', 'test-client-id');
      await page.fill('input[name="clientSecret"]', 'test-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/oauth/callback');
      await page.fill('input[name="scope"]', 'https://www.googleapis.com/auth/gmail.readonly');
      
      // Step 7: Authorize OAuth2
      await page.click('text=Authorize');
      
      // Step 8: Should redirect to Google OAuth
      await expect(page).toHaveURL(/.*accounts\.google\.com.*oauth2.*auth/);
      
      // Step 9: Verify Gmail scope is included
      expect(page.url()).toContain('gmail.readonly');
    });
  });

  test.describe('Slack OAuth2 Flow', () => {
    test.skip('should complete full Slack OAuth2 workflow', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      
      // Step 3: Create new connection
      await page.click('text=Create Connection');
      
      // Step 4: Fill connection details
      await page.fill('input[name="name"]', 'Slack API');
      await page.fill('input[name="baseUrl"]', 'https://slack.com/api');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      
      // Step 5: Click OAuth2 setup
      await page.click('text=Setup OAuth2');
      
      // Step 6: Fill OAuth2 details
      await page.fill('input[name="clientId"]', 'test-client-id');
      await page.fill('input[name="clientSecret"]', 'test-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/oauth/callback');
      await page.fill('input[name="scope"]', 'chat:write,channels:read');
      
      // Step 7: Authorize OAuth2
      await page.click('text=Authorize');
      
      // Step 8: Should redirect to Slack OAuth
      await expect(page).toHaveURL(/.*slack\.com.*oauth.*authorize/);
      
      // Step 9: Mock successful authorization
      expect(page.url()).toContain('slack.com');
    });

    test.skip('should handle Slack OAuth2 with users scope', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      
      // Step 3: Create new connection
      await page.click('text=Create Connection');
      
      // Step 4: Fill connection details
      await page.fill('input[name="name"]', 'Slack Users API');
      await page.fill('input[name="baseUrl"]', 'https://slack.com/api');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      
      // Step 5: Click OAuth2 setup
      await page.click('text=Setup OAuth2');
      
      // Step 6: Fill OAuth2 details with users scope
      await page.fill('input[name="clientId"]', 'test-client-id');
      await page.fill('input[name="clientSecret"]', 'test-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/oauth/callback');
      await page.fill('input[name="scope"]', 'users:read,users:read.email');
      
      // Step 7: Authorize OAuth2
      await page.click('text=Authorize');
      
      // Step 8: Should redirect to Slack OAuth
      await expect(page).toHaveURL(/.*slack\.com.*oauth.*authorize/);
      
      // Step 9: Verify users scope is included
      expect(page.url()).toContain('users:read');
    });
  });

  test.describe('OAuth2 Error Handling', () => {
    test.skip('should handle OAuth2 provider errors gracefully', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      
      // Step 3: Create new connection with invalid OAuth2 config
      await page.click('text=Create Connection');
      await page.fill('input[name="name"]', 'Invalid OAuth2 API');
      await page.fill('input[name="baseUrl"]', 'https://invalid-oauth2-api.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      
      // Step 4: Click OAuth2 setup
      await page.click('text=Setup OAuth2');
      
      // Step 5: Fill invalid OAuth2 details
      await page.fill('input[name="clientId"]', 'invalid-client-id');
      await page.fill('input[name="clientSecret"]', 'invalid-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/oauth/callback');
      await page.fill('input[name="scope"]', 'invalid-scope');
      
      // Step 6: Authorize OAuth2
      await page.click('text=Authorize');
      
      // Step 7: Should show error message
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/OAuth2.*error|Invalid.*configuration/);
    });

    test.skip('should handle unsupported OAuth2 providers', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      
      // Step 3: Create new connection with unsupported provider
      await page.click('text=Create Connection');
      await page.fill('input[name="name"]', 'Unsupported Provider API');
      await page.fill('input[name="baseUrl"]', 'https://unsupported-provider.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      
      // Step 4: Click OAuth2 setup
      await page.click('text=Setup OAuth2');
      
      // Step 5: Try to select unsupported provider
      await page.selectOption('select[name="provider"]', 'unsupported-provider');
      
      // Step 6: Should show unsupported provider error
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/Unsupported.*provider|Provider.*not.*supported/);
    });

    test.skip('should handle network errors during OAuth2 flow', async ({ page }) => {
      // Mock network error by intercepting OAuth2 requests
      await page.route('**/oauth2/authorize', route => {
        route.abort('failed');
      });
      
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      
      // Step 3: Create new connection
      await page.click('text=Create Connection');
      await page.fill('input[name="name"]', 'Network Error API');
      await page.fill('input[name="baseUrl"]', 'https://network-error-api.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      
      // Step 4: Click OAuth2 setup
      await page.click('text=Setup OAuth2');
      
      // Step 5: Fill OAuth2 details
      await page.fill('input[name="clientId"]', 'test-client-id');
      await page.fill('input[name="clientSecret"]', 'test-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/oauth/callback');
      await page.fill('input[name="scope"]', 'read');
      
      // Step 6: Authorize OAuth2 (should fail due to network error)
      await page.click('text=Authorize');
      
      // Step 7: Should show network error message
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/Network.*error|Connection.*failed/);
    });
  });

  test.describe('OAuth2 Security', () => {
    test.skip('should validate OAuth2 state parameter', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      
      // Step 3: Create new connection
      await page.click('text=Create Connection');
      await page.fill('input[name="name"]', 'State Validation API');
      await page.fill('input[name="baseUrl"]', 'https://state-validation-api.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      
      // Step 4: Click OAuth2 setup
      await page.click('text=Setup OAuth2');
      
      // Step 5: Fill OAuth2 details
      await page.fill('input[name="clientId"]', 'test-client-id');
      await page.fill('input[name="clientSecret"]', 'test-client-secret');
      await page.fill('input[name="redirectUri"]', 'http://localhost:3000/oauth/callback');
      await page.fill('input[name="scope"]', 'read');
      
      // Step 6: Authorize OAuth2
      await page.click('text=Authorize');
      
      // Step 7: Should redirect to OAuth provider with state parameter
      await expect(page).toHaveURL(/.*state=.*/);
      
      // Step 8: Verify state parameter is present and valid
      const url = page.url();
      expect(url).toContain('state=');
      const stateParam = new URL(url).searchParams.get('state');
      expect(stateParam).toBeTruthy();
      expect(stateParam.length).toBeGreaterThan(10); // Should be a substantial state value
    });

    test.skip('should require authentication for OAuth2 operations', async ({ page }) => {
      // Try to access OAuth2 authorize endpoint without authentication
      await page.goto(`${BASE_URL}/api/oauth/authorize?provider=github&apiConnectionId=test-id&clientId=test&clientSecret=test&redirectUri=http://localhost:3000/callback&scope=read`);
      
      // Step 2: Verify authentication is required
      await expect(page.locator('body')).toContainText('Unauthorized');
    });
  });

  test.describe('OAuth2 Integration', () => {
    test.skip('should display OAuth2 providers list', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Step 2: Navigate to API connections
      await page.click('text=API Connections');
      
      // Step 3: Create new connection
      await page.click('text=Create Connection');
      await page.fill('input[name="name"]', 'OAuth2 Providers API');
      await page.fill('input[name="baseUrl"]', 'https://oauth2-providers-api.com');
      await page.selectOption('select[name="authType"]', 'OAUTH2');
      
      // Step 4: Click OAuth2 setup
      await page.click('text=Setup OAuth2');
      
      // Step 5: Should display available OAuth2 providers
      await expect(page.locator('select[name="provider"]')).toBeVisible();
      
      // Step 6: Verify common providers are available
      const providerOptions = await page.locator('select[name="provider"] option').allTextContents();
      expect(providerOptions).toContain('GitHub');
      expect(providerOptions).toContain('Google');
      expect(providerOptions).toContain('Slack');
    });

    test.skip('should handle OAuth2 token refresh', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Step 2: Navigate to existing OAuth2 connection
      await page.click('text=API Connections');
      
      // Step 3: Find existing OAuth2 connection
      const oauth2Connection = page.locator('text=OAuth2').first();
      await oauth2Connection.click();
      
      // Step 4: Click refresh token button
      await page.click('text=Refresh Token');
      
      // Step 5: Should show success message
      await expect(page.locator('.bg-green-50')).toBeVisible();
      await expect(page.locator('.text-green-800')).toContainText(/Token.*refreshed|Successfully.*refreshed/);
    });
  });
}); 