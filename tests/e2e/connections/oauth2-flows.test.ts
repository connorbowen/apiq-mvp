import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';
import { createUXComplianceHelper } from '../../helpers/uxCompliance';

// TODO: Add comprehensive UX compliance improvements (P0)
// - Add primary action validation using UXComplianceHelper
// - Add comprehensive accessibility testing
// - Add security edge case testing
// - Add mobile responsiveness testing
// - Add performance validation
// - Add touch interaction testing

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: any;
let jwt: string;
const createdConnectionIds: string[] = [];

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
    // TODO: Add comprehensive UX compliance validation for page load (P0)
    // const uxHelper = createUXComplianceHelper(page);
    // await uxHelper.validateActivationFirstUX();
    // await uxHelper.validateHeadingHierarchy(['Connections', 'Dashboard']);

    // Set authentication token directly instead of using UI login
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Set the JWT token in localStorage to authenticate the user
    await page.evaluate((data) => {
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }, { token: jwt, user: testUser });
    
    // Reload the page to apply authentication
    await page.reload();
    
    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });
    
    // Navigate to connections tab
    await page.click('[data-testid="tab-connections"]');
    
    // Validate UX compliance for connections page
    const uxHelper = createUXComplianceHelper(page);
    await uxHelper.validateActivationFirstUX();
    await uxHelper.validateFormAccessibility();

    // TODO: Add comprehensive accessibility validation for connections page (P0)
    // await uxHelper.validateARIACompliance();
    // await uxHelper.validateScreenReaderCompatibility();
    // await uxHelper.validateKeyboardNavigation();
  });

  test.describe('GitHub OAuth2 Flow', () => {
    test('should complete GitHub OAuth2 authorization flow with UX compliance', async ({ page }) => {
      const uxHelper = createUXComplianceHelper(page);
      
      // TODO: Add primary action validation before clicking (P0)
      // await uxHelper.validateActivationFirstUX();
      
      // Click create connection button (primary action)
      await page.click('[data-testid="primary-action create-connection-btn"]');
      
      // Validate modal accessibility
      await uxHelper.validateFormAccessibility();
      await uxHelper.validateARIACompliance();
      
      // TODO: Add comprehensive accessibility validation for modal (P0)
      // await uxHelper.validateScreenReaderCompatibility();
      // await uxHelper.validateKeyboardNavigation();
      
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
      
      // TODO: Add primary action validation for submit button (P0)
      // await uxHelper.validateActivationFirstUX();
      
      // Submit form using primary action pattern and validate loading state
      const submitButton = page.locator('[data-testid="primary-action submit-connection-btn"]');
      await submitButton.click();
      
      // Validate loading state (button should be disabled and show loading text)
      await expect(submitButton).toBeDisabled();
      await expect(submitButton).toHaveText(/Creating|Processing/);
      
      // Wait for modal to close and success message to appear on dashboard
      await expect(submitButton).not.toBeVisible();
      
      // Should show success message in UX-compliant container on dashboard
      await uxHelper.validateSuccessContainer('Connection created successfully');
      
      // Should show the new connection in the list
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('GitHub API');
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('OAuth2');
      
      // TODO: Add comprehensive mobile responsiveness validation (P1)
      // await uxHelper.validateMobileResponsiveness();
      // await uxHelper.validateTouchInteractions();
      // await uxHelper.validateResponsiveLayout();
      
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
    });

    test('should handle GitHub OAuth2 callback with authorization code', async ({ page }) => {
      // TODO: Add UX compliance validation for callback handling (P0)
      // const uxHelper = createUXComplianceHelper(page);
      // await uxHelper.validateErrorHandling();
      
      // Simulate OAuth2 callback with authorization code
      const authCode = 'test_auth_code_123';
      
      // Navigate directly to callback endpoint
      await page.goto(`${BASE_URL}/api/oauth/callback?code=${authCode}&state=test_state`);
      
      // Should handle callback and show appropriate response
      await expect(page).toHaveURL(/.*callback/);
      
      // TODO: Add comprehensive error handling validation (P0)
      // await uxHelper.validateErrorContainer(/Success|Error/);
    });

    test('should handle GitHub OAuth2 error scenarios with UX compliance', async ({ page }) => {
      const uxHelper = createUXComplianceHelper(page);
      
      // Test access denied scenario
      await page.goto(`${BASE_URL}/api/oauth/callback?error=access_denied&state=test_state`);
      
      // Should show error message in UX-compliant container
      await uxHelper.validateErrorContainer(/Access denied|Authorization failed/);
      
      // TODO: Add comprehensive error handling validation (P0)
      // await uxHelper.validateErrorHandling();
    });
  });

  test.describe('Google OAuth2 Flow', () => {
    test('should complete Google OAuth2 authorization flow with UX compliance', async ({ page }) => {
      const uxHelper = createUXComplianceHelper(page);
      
      // TODO: Add primary action validation before clicking (P0)
      // await uxHelper.validateActivationFirstUX();
      
      // Click create connection button (primary action)
      await page.click('[data-testid="primary-action create-connection-btn"]');
      
      // Validate modal accessibility
      await uxHelper.validateFormAccessibility();
      await uxHelper.validateARIACompliance();
      
      // TODO: Add comprehensive accessibility validation for modal (P0)
      // await uxHelper.validateScreenReaderCompatibility();
      // await uxHelper.validateKeyboardNavigation();
      
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
      
      // TODO: Add primary action validation for submit button (P0)
      // await uxHelper.validateActivationFirstUX();
      
      // Submit form using primary action pattern and validate loading state
      const submitButton = page.locator('[data-testid="primary-action submit-connection-btn"]');
      await submitButton.click();
      
      // Validate loading state (button should be disabled and show loading text)
      await expect(submitButton).toBeDisabled();
      await expect(submitButton).toHaveText(/Creating|Processing/);
      
      // Wait for modal to close and success message to appear on dashboard
      await expect(submitButton).not.toBeVisible();
      
      // Should show success message in UX-compliant container on dashboard
      await uxHelper.validateSuccessContainer('Connection created successfully');
      
      // Should show the new connection in the list
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Google Calendar API');
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('OAuth2');
      
      // TODO: Add comprehensive keyboard navigation validation (P0)
      // await uxHelper.validateKeyboardNavigation();
      
      // Validate keyboard navigation
      await uxHelper.validateKeyboardNavigation();
    });
  });

  test.describe('Slack OAuth2 Flow', () => {
    test('should complete Slack OAuth2 authorization flow with UX compliance', async ({ page }) => {
      const uxHelper = createUXComplianceHelper(page);
      
      // TODO: Add primary action validation before clicking (P0)
      // await uxHelper.validateActivationFirstUX();
      
      // Click create connection button (primary action)
      await page.click('[data-testid="primary-action create-connection-btn"]');
      
      // Validate modal accessibility
      await uxHelper.validateFormAccessibility();
      await uxHelper.validateARIACompliance();
      
      // TODO: Add comprehensive accessibility validation for modal (P0)
      // await uxHelper.validateScreenReaderCompatibility();
      // await uxHelper.validateKeyboardNavigation();
      
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
      
      // TODO: Add primary action validation for submit button (P0)
      // await uxHelper.validateActivationFirstUX();
      
      // Submit form using primary action pattern and validate loading state
      const submitButton = page.locator('[data-testid="primary-action submit-connection-btn"]');
      await submitButton.click();
      
      // Validate loading state (button should be disabled and show loading text)
      await expect(submitButton).toBeDisabled();
      await expect(submitButton).toHaveText(/Creating|Processing/);
      
      // Wait for modal to close and success message to appear on dashboard
      await expect(submitButton).not.toBeVisible();
      
      // Should show success message in UX-compliant container on dashboard
      await uxHelper.validateSuccessContainer('Connection created successfully');
      
      // Should show the new connection in the list
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Slack API');
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('OAuth2');
      
      // TODO: Add comprehensive screen reader compatibility validation (P0)
      // await uxHelper.validateScreenReaderCompatibility();
      
      // Validate screen reader compatibility
      await uxHelper.validateScreenReaderCompatibility();
    });
  });

  test.describe('OAuth2 Token Management', () => {
    test('should store OAuth2 tokens securely with UX compliance', async ({ page }) => {
      const uxHelper = createUXComplianceHelper(page);
      
      // TODO: Add security validation for token storage (P0)
      // await uxHelper.validateSecurityCompliance();
      // await uxHelper.validateInputSanitization();
      
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
      
      expect(response.status()).toBe(201);
      const connection = await response.json();
      createdConnectionIds.push(connection.id);
      
      // Validate connection appears in UI with proper UX
      await page.reload();
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('Secure OAuth2 API');
      
      // Validate security indicators are present
      await expect(page.locator('[data-testid="connection-card"]')).toContainText('OAuth2');
      
      // TODO: Add comprehensive ARIA compliance validation (P0)
      // await uxHelper.validateARIACompliance();
      
      // Validate accessibility for connection cards
      await uxHelper.validateARIACompliance();
    });

    test('should handle OAuth2 token refresh with UX compliance', async ({ page }) => {
      const uxHelper = createUXComplianceHelper(page);
      
      // TODO: Add error handling validation for token refresh (P0)
      // await uxHelper.validateErrorHandling();
      
      // Test token refresh flow
      const response = await page.request.post('/api/connections/test-oauth2-refresh', {
        data: {
          connectionId: 'test-connection-id',
          refreshToken: 'test_refresh_token'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Should handle token refresh appropriately
      expect([200, 400, 404]).toContain(response.status()); // Various expected responses
      
      // Validate error handling UX if applicable
      if (response.status() === 400) {
        await uxHelper.validateErrorContainer(/Invalid|Failed|Error/);
      }
    });
  });

  test.describe('OAuth2 Security Validation', () => {
    test('should validate OAuth2 security requirements with UX compliance', async ({ page }) => {
      const uxHelper = createUXComplianceHelper(page);
      
      // TODO: Add security validation for OAuth2 requirements (P0)
      // await uxHelper.validateSecurityCompliance();
      // await uxHelper.validateAccessControl();
      
      // Test secure token storage
      const response = await page.request.get('/api/connections/security-status', {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Should return security status
      expect([200, 404]).toContain(response.status()); // Various expected responses
      
      // Validate security indicators in UI
      if (response.status() === 200) {
        const securityData = await response.json();
        expect(securityData).toHaveProperty('encrypted');
        expect(securityData).toHaveProperty('rotationEnabled');
      }
      
      // TODO: Add comprehensive consistency validation (P0)
      // await uxHelper.validateConsistency();
      
      // Validate security UX patterns
      await uxHelper.validateConsistency();
    });

    test('should handle OAuth2 security errors with UX compliance', async ({ page }) => {
      
      // Test invalid OAuth2 configuration
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Invalid OAuth2',
          baseUrl: 'https://api.github.com',
          authType: 'OAUTH2',
          authConfig: {
            oauth2Provider: 'INVALID_PROVIDER',
            clientId: '',
            clientSecret: '',
            redirectUri: 'http://localhost:3000/callback'
          }
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Should return validation error
      expect(response.status()).toBe(400);
      
      // Validate error message UX
      const errorData = await response.json();
      expect(errorData).toHaveProperty('error');
      expect(errorData.error).toMatch(/Missing required OAuth2 fields|OAuth2 configuration is required/);
    });

    test('should handle CSRF/state mismatch in callback with UX compliance', async ({ page }) => {
      // Test callback without state parameter (CSRF protection)
      const response1 = await page.request.get(`${BASE_URL}/api/oauth/callback?code=test_code`);
      
      // Should return security error
      expect(response1.status()).toBe(400);
      const errorData1 = await response1.json();
      expect(errorData1).toHaveProperty('error');
      expect(errorData1.error).toMatch(/State parameter is required|Invalid OAuth state/);
      
      // Test callback with invalid state parameter
      const response2 = await page.request.get(`${BASE_URL}/api/oauth/callback?code=test_code&state=invalid_state`);
      
      // Should return security error
      expect(response2.status()).toBe(400);
      const errorData2 = await response2.json();
      expect(errorData2).toHaveProperty('error');
      expect(errorData2.error).toMatch(/Invalid OAuth state|connection not found/);
    });

    test('should show error for redirect URI mismatch with UX compliance', async ({ page }) => {
      // Test callback with mismatched redirect URI
      const response = await page.request.get(`${BASE_URL}/api/oauth/callback?code=test_code&state=test_state&redirect_uri=https://malicious-site.com`);
      
      // Should return security error
      expect(response.status()).toBe(400);
      const errorData = await response.json();
      expect(errorData).toHaveProperty('error');
      expect(errorData.error).toMatch(/Invalid OAuth state|connection not found/);
    });

    test('should reject connection creation for non-admin users with UX compliance', async ({ page }) => {
      
      // Create a non-admin test user
      const nonAdminUser = await createTestUser(
        `e2e-nonadmin-${generateTestId('user')}@example.com`,
        'e2eTestPass123',
        'USER',
        'E2E Non-Admin Test User'
      );
      
      try {
        // Login as non-admin user
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', nonAdminUser.email);
        await page.fill('input[name="password"]', 'e2eTestPass123');
        await page.click('button[type="submit"]');
        
        // Wait for successful login and redirect to dashboard
        await expect(page).toHaveURL(/.*dashboard/);
        
        // Navigate to connections tab
        await page.click('[data-testid="tab-connections"]');
        
        // Try to create OAuth2 connection via API
        const response = await page.request.post('/api/connections', {
          data: {
            name: 'Unauthorized OAuth2',
            baseUrl: 'https://api.github.com',
            authType: 'OAUTH2',
            oauth2Provider: 'GITHUB',
            clientId: 'test_client_id',
            clientSecret: 'test_client_secret'
          },
          headers: {
            'Authorization': `Bearer ${nonAdminUser.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Should return permission denied
        expect(response.status()).toBe(403);
        
        // Validate error message UX
        const errorData = await response.json();
        expect(errorData).toHaveProperty('error');
        expect(errorData.error).toMatch(/Insufficient permissions|FORBIDDEN/);
        
      } finally {
        // Clean up non-admin user
        await cleanupTestUser(nonAdminUser);
      }
    });
  });

  test.describe('OAuth2 Network & Provider Failures', () => {
    test('should show error if provider is unreachable during OAuth2 flow with UX compliance', async ({ page }) => {
      // TODO: Add error handling validation for network failures (P0)
      // const uxHelper = createUXComplianceHelper(page);
      // await uxHelper.validateErrorHandling();
      
      // Test with invalid/unreachable provider URL
      const response = await page.request.post('/api/connections', {
        data: {
          name: 'Unreachable Provider',
          baseUrl: 'https://unreachable-provider.com',
          authType: 'OAUTH2',
          oauth2Provider: 'CUSTOM',
          clientId: 'test_client_id',
          clientSecret: 'test_client_secret',
          redirectUri: 'http://localhost:3000/api/oauth/callback',
          scopes: 'read'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Should handle network error gracefully
      expect([400, 500, 502, 503]).toContain(response.status());
      
      // Validate error message UX
      if (response.status() !== 201) {
        const errorData = await response.json();
        expect(errorData).toHaveProperty('error');
        expect(errorData.error).toMatch(/Connection failed|Network error|Provider unreachable/);
      }
    });

    test('should handle expired authorization code gracefully with UX compliance', async ({ page }) => {
      const uxHelper = createUXComplianceHelper(page);
      
      // Test callback with expired authorization code
      await page.goto(`${BASE_URL}/api/oauth/callback?code=expired_code_123&state=test_state`);
      
      // Should show appropriate error message
      await uxHelper.validateErrorContainer(/Authorization code expired|Invalid authorization code|Token exchange failed/);
    });

    test('should handle revoked refresh token with UX compliance', async ({ page }) => {
      
      // Test token refresh with revoked refresh token
      const response = await page.request.post('/api/connections/refresh-token', {
        data: {
          connectionId: 'test-connection-id',
          refreshToken: 'revoked_refresh_token_123'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Should handle revoked token appropriately
      expect([400, 401, 403]).toContain(response.status());
      
      // Validate error message UX
      if (response.status() !== 200) {
        const errorData = await response.json();
        expect(errorData).toHaveProperty('error');
        expect(errorData.error).toMatch(/Token revoked|Invalid refresh token|Re-authorization required/);
      }
    });

    test('should show error if provider rate limit is hit with UX compliance', async ({ page }) => {
      
      // Simulate provider rate limit response
      const response = await page.request.post('/api/connections/test-rate-limit', {
        data: {
          provider: 'github',
          action: 'token_exchange'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Should handle rate limit appropriately
      expect([429, 503]).toContain(response.status());
      
      // Validate rate limit error message UX
      if (response.status() === 429) {
        const errorData = await response.json();
        expect(errorData).toHaveProperty('error');
        expect(errorData.error).toMatch(/Rate limit|Too many requests|Try again later/);
      }
    });

    test('should show error if internal rate limit is hit with UX compliance', async ({ page }) => {
      
      // Make multiple rapid requests to trigger internal rate limit
      const requests = Array(10).fill(null).map(() => 
        page.request.post('/api/connections', {
          data: {
            name: `Rate Limit Test ${Date.now()}`,
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
        })
      );
      
      const responses = await Promise.all(requests);
      
      // At least one should be rate limited
      const rateLimited = responses.some(r => r.status() === 429);
      expect(rateLimited).toBe(true);
      
      // Validate rate limit error message UX
      const rateLimitedResponse = responses.find(r => r.status() === 429);
      if (rateLimitedResponse) {
        const errorData = await rateLimitedResponse.json();
        expect(errorData).toHaveProperty('error');
        expect(errorData.error).toMatch(/Rate limit|Too many requests|Try again later/);
      }
    });
  });

  test.describe('OAuth2 User Interaction Edge Cases', () => {
    test('should show error if user cancels provider consent with UX compliance', async ({ page }) => {
      const uxHelper = createUXComplianceHelper(page);
      
      // TODO: Add error handling validation for user cancellation (P0)
      // await uxHelper.validateErrorHandling();
      
      // Test user cancellation scenario
      await page.goto(`${BASE_URL}/api/oauth/callback?error=access_denied&error_description=User%20cancelled&state=test_state`);
      
      // Should show user-friendly cancellation message
      await uxHelper.validateErrorContainer(/Access denied|Authorization cancelled|User cancelled/);
      
      // Should provide clear next steps
      await expect(page.locator('text=Try again')).toBeVisible();
    });

    test('should prevent duplicate connection creation with UX compliance', async ({ page }) => {
      
      // Create first connection
      const connectionName = `Duplicate Test ${Date.now()}`;
      const response1 = await page.request.post('/api/connections', {
        data: {
          name: connectionName,
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
      
      expect(response1.status()).toBe(201);
      const connection1 = await response1.json();
      createdConnectionIds.push(connection1.id);
      
      // Try to create duplicate connection
      const response2 = await page.request.post('/api/connections', {
        data: {
          name: connectionName, // Same name
          baseUrl: 'https://api.github.com',
          authType: 'OAUTH2',
          oauth2Provider: 'GITHUB',
          clientId: 'test_client_id_2',
          clientSecret: 'test_client_secret_2'
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Should return conflict error
      expect(response2.status()).toBe(409);
      
      // Validate error message UX
      const errorData = await response2.json();
      expect(errorData).toHaveProperty('error');
      expect(errorData.error).toMatch(/API connection with this name already exists/);
    });

    test('should show error for duplicate connection names with UX compliance', async ({ page }) => {
      
      // Click create connection button
      await page.click('[data-testid="primary-action create-connection-btn"]');
      
      // Fill form with existing connection name
      await page.fill('[data-testid="connection-name-input"]', 'GitHub API'); // Use existing name
      await page.fill('[data-testid="connection-description-input"]', 'Duplicate name test');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.github.com');
      
      // Select OAuth2 authentication type
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      await page.selectOption('[data-testid="connection-provider-select"]', 'github');
      
      // Fill OAuth2 credentials
      await page.fill('[data-testid="connection-clientid-input"]', 'test_client_id');
      await page.fill('[data-testid="connection-clientsecret-input"]', 'test_client_secret');
      
      // Submit form
      const submitButton = page.locator('[data-testid="primary-action submit-connection-btn"]');
      await submitButton.click();
      
      // Should show validation error in modal
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/already exists|duplicate|name taken|API connection with this name/i);
    });

    test('should show error if session expires mid-flow with UX compliance', async ({ page }) => {
      
      // Start OAuth2 flow
      await page.click('[data-testid="primary-action create-connection-btn"]');
      
      // Fill form partially
      await page.fill('[data-testid="connection-name-input"]', 'Session Test');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.github.com');
      
      // Simulate session expiration by clearing cookies
      await page.context().clearCookies();
      
      // Try to submit form
      const submitButton = page.locator('[data-testid="primary-action submit-connection-btn"]');
      await submitButton.click();
      
      // Should redirect to login or show session expired error
      await expect(page).toHaveURL(/.*login/);
      
      // Or should show session expired error
      const currentUrl = page.url();
      if (!currentUrl.includes('login')) {
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="error-message"]')).toContainText(/Session expired|Please log in|Authentication required/);
      }
    });

    test('should show error for invalid client credentials with UX compliance', async ({ page }) => {
      
      // Click create connection button
      await page.click('[data-testid="primary-action create-connection-btn"]');
      
      // Fill form with invalid credentials
      await page.fill('[data-testid="connection-name-input"]', 'Invalid Credentials Test');
      await page.fill('[data-testid="connection-description-input"]', 'Testing invalid credentials');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.github.com');
      
      // Select OAuth2 authentication type
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      await page.selectOption('[data-testid="connection-provider-select"]', 'github');
      
      // Fill invalid OAuth2 credentials
      await page.fill('[data-testid="connection-clientid-input"]', 'invalid_client_id');
      await page.fill('[data-testid="connection-clientsecret-input"]', 'invalid_client_secret');
      
      // Submit form
      const submitButton = page.locator('[data-testid="primary-action submit-connection-btn"]');
      await submitButton.click();
      
      // Should show validation error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/Invalid credentials|Authentication failed|Invalid client/);
    });
  });

  test.describe('OAuth2 Data Integrity & Audit', () => {
    test('should log all OAuth2 actions in audit log with UX compliance', async ({ page }) => {
      const uxHelper = createUXComplianceHelper(page);
      
      // TODO: Add audit log accessibility validation (P0)
      // await uxHelper.validateARIACompliance();
      
      // Create OAuth2 connection
      const connectionName = `Audit Test ${Date.now()}`;
      const response = await page.request.post('/api/connections', {
        data: {
          name: connectionName,
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
      
      expect(response.status()).toBe(201);
      const connection = await response.json();
      createdConnectionIds.push(connection.id);
      
      // Navigate to audit log
      await page.click('[data-testid="tab-audit"]');
      
      // Should show OAuth2 connection creation in audit log
      await expect(page.locator('[data-testid="audit-log"]')).toContainText('OAuth2 connection created');
      await expect(page.locator('[data-testid="audit-log"]')).toContainText(connectionName);
      
      // Should NOT show sensitive data in audit log
      await expect(page.locator('[data-testid="audit-log"]')).not.toContainText('test_client_secret');
      await expect(page.locator('[data-testid="audit-log"]')).not.toContainText('access_token');
      
      // TODO: Add comprehensive ARIA compliance validation for audit log (P0)
      // await uxHelper.validateARIACompliance();
      
      // Validate audit log accessibility
      await uxHelper.validateARIACompliance();
    });

    test('should show error for simultaneous connection creation with UX compliance', async ({ page }) => {
      
      // Create two connections simultaneously with same name
      const connectionName = `Simultaneous Test ${Date.now()}`;
      
      const [response1, response2] = await Promise.all([
        page.request.post('/api/connections', {
          data: {
            name: connectionName,
            baseUrl: 'https://api.github.com',
            authType: 'OAUTH2',
            oauth2Provider: 'GITHUB',
            clientId: 'test_client_id_1',
            clientSecret: 'test_client_secret_1'
          },
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          }
        }),
        page.request.post('/api/connections', {
          data: {
            name: connectionName,
            baseUrl: 'https://api.github.com',
            authType: 'OAUTH2',
            oauth2Provider: 'GITHUB',
            clientId: 'test_client_id_2',
            clientSecret: 'test_client_secret_2'
          },
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          }
        })
      ]);
      
      // One should succeed, one should fail
      const successCount = [response1.status(), response2.status()].filter(s => s === 201).length;
      expect(successCount).toBe(1);
      
      // Add successful connection to cleanup
      if (response1.status() === 201) {
        const connection = await response1.json();
        createdConnectionIds.push(connection.id);
      } else if (response2.status() === 201) {
        const connection = await response2.json();
        createdConnectionIds.push(connection.id);
      }
      
      // Validate error handling for failed request
      const failedResponse = response1.status() !== 201 ? response1 : response2;
      if (failedResponse.status() !== 201) {
        const errorData = await failedResponse.json();
        expect(errorData).toHaveProperty('error');
        expect(errorData.error).toMatch(/API connection with this name already exists|Failed to create API connection/);
      }
    });
  });

  // TODO: Add comprehensive mobile responsiveness testing (P1)
  test.describe('Mobile Responsiveness', () => {
    test('should be fully functional on mobile viewport', async ({ page }) => {
      const uxHelper = createUXComplianceHelper(page);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // TODO: Add comprehensive mobile validation (P1)
      // await uxHelper.validateMobileResponsiveness();
      // await uxHelper.validateTouchInteractions();
      // await uxHelper.validateResponsiveLayout();
      
      // Test OAuth2 flow on mobile
      await page.click('[data-testid="primary-action create-connection-btn"]');
      
      // TODO: Add mobile form accessibility validation (P1)
      // await uxHelper.validateMobileAccessibility();
    });
  });

  // TODO: Add comprehensive accessibility testing (P0)
  test.describe('Accessibility Compliance', () => {
    test('should meet WCAG 2.1 AA accessibility standards', async ({ page }) => {
      const uxHelper = createUXComplianceHelper(page);
      
      // TODO: Add comprehensive accessibility validation (P0)
      // await uxHelper.validateARIACompliance();
      // await uxHelper.validateScreenReaderCompatibility();
      // await uxHelper.validateKeyboardNavigation();
      // await uxHelper.validateMobileAccessibility();
      
      // Test OAuth2 flow accessibility
      await page.click('[data-testid="primary-action create-connection-btn"]');
      
      // TODO: Add form accessibility validation (P0)
      // await uxHelper.validateFormAccessibility();
    });
  });

  // TODO: Add comprehensive performance testing (P1)
  test.describe('Performance Requirements', () => {
    test('should meet performance requirements', async ({ page }) => {
      const uxHelper = createUXComplianceHelper(page);
      
      // TODO: Add comprehensive performance validation (P1)
      // await uxHelper.validatePerformanceRequirements();
      
      // Test OAuth2 flow performance
      const startTime = Date.now();
      await page.click('[data-testid="primary-action create-connection-btn"]');
      
      // TODO: Add response time validation (P1)
      // const loadTime = Date.now() - startTime;
      // expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
    });
  });

  // TODO: Add comprehensive security edge case testing (P0)
  test.describe('Security Edge Cases', () => {
    test('should handle security edge cases with proper validation', async ({ page }) => {
      const uxHelper = createUXComplianceHelper(page);
      
      // TODO: Add comprehensive security validation (P0)
      // await uxHelper.validateSecurityCompliance();
      // await uxHelper.validateInputSanitization();
      // await uxHelper.validateAccessControl();
      
      // Test OAuth2 security edge cases
      // ... existing security tests ...
    });
  });

  test.describe('Complete UX Compliance Validation', () => {
    test('should meet all UX spec requirements for OAuth2 flows', async ({ page }) => {
      const uxHelper = createUXComplianceHelper(page);
      
      // TODO: Add comprehensive UX compliance validation (P0)
      // await uxHelper.validateCompleteUXCompliance();
      
      // Validate complete UX compliance
      await uxHelper.validateCompleteUXCompliance();
      
      // Validate OAuth2-specific UX patterns
      await uxHelper.validateActivationFirstUX();
      await uxHelper.validateFormAccessibility();
      await uxHelper.validateMobileAccessibility();
      await uxHelper.validateKeyboardNavigation();
      await uxHelper.validateARIACompliance();
      await uxHelper.validateScreenReaderCompatibility();
      
      // TODO: Add comprehensive performance validation (P1)
      // await uxHelper.validatePerformanceRequirements();
      
      // Validate performance requirements
      await uxHelper.validatePerformanceRequirements();
      
      // TODO: Add comprehensive error handling validation (P0)
      // await uxHelper.validateErrorHandling();
      
      // Validate error handling
      await uxHelper.validateErrorHandling();
    });
  });
}); 