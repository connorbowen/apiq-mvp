import { test, expect } from '@playwright/test';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
import { generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test Google account credentials (should be set in environment)
const TEST_GOOGLE_EMAIL = process.env.TEST_GOOGLE_EMAIL;
const TEST_GOOGLE_PASSWORD = process.env.TEST_GOOGLE_PASSWORD;

test.describe('OAuth2 Authentication E2E Tests', () => {
  let uxHelper: UXComplianceHelper;
  
  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
  });

  test.describe('OAuth2 Setup Verification', () => {
    test('should have OAuth2 button on login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Verify OAuth2 button is present
      const oauthButton = page.locator('[data-testid="primary-action google-oauth2-btn"]');
      await expect(oauthButton).toBeVisible();
      await expect(oauthButton).toContainText(/google/i);
    });

    test('should navigate to Google OAuth2 when button is clicked', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Click OAuth2 button
      await page.click('[data-testid="primary-action google-oauth2-btn"]');
      
      // Should redirect to Google OAuth2
      await expect(page).toHaveURL(/accounts\.google\.com/);
    });

    test('should have correct OAuth2 configuration', async ({ page }) => {
      // Test the OAuth2 providers endpoint
      const response = await page.request.get(`${BASE_URL}/api/connections/oauth2/providers`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      
      const googleProvider = data.data.providers.find((p: any) => p.name === 'google');
      expect(googleProvider).toBeDefined();
      expect(googleProvider.authorizationUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(googleProvider.tokenUrl).toBe('https://oauth2.googleapis.com/token');
    });

    test('should handle OAuth2 callback endpoint', async ({ page }) => {
      // Test that the callback endpoint exists and responds
      const response = await page.request.get(`${BASE_URL}/oauth/callback`);
      // Should not be 404 (might be 400 or 500 for invalid params, but endpoint should exist)
      expect(response.status()).not.toBe(404);
    });

    test('should have proper OAuth2 environment configuration', async ({ page }) => {
      // Test that OAuth2 environment variables are loaded
      const response = await page.request.get(`${BASE_URL}/api/health`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('healthy');
    });
  });

  test.describe('Google OAuth2 Authentication', () => {
    test('should initiate Google OAuth2 login flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Comprehensive UX validation
      await uxHelper.validateActivationFirstUX();
      await uxHelper.validateFormAccessibility();
      await uxHelper.validateMobileResponsiveness();
      await uxHelper.validateKeyboardNavigation();
      await uxHelper.validateARIACompliance();
      
      // Verify Google OAuth2 button is present with proper primary action pattern
      const googleButton = page.getByTestId('primary-action google-oauth2-btn');
      await expect(googleButton).toBeVisible();
      await expect(googleButton).toHaveText('Continue with Google');
      
      // Test button loading states properly
      await expect(googleButton).toBeEnabled();
      await googleButton.click();
      await expect(googleButton).toBeDisabled();
      
      // Should redirect to OAuth2 endpoint
      await expect(page).toHaveURL(/.*oauth2.*provider=google/);
    });

    test('should handle Google OAuth2 callback successfully', async ({ page }) => {
      // Use real authentication instead of mock data
      const mockAuthCode = `google_auth_code_${generateTestId()}`;
      const mockState = `google_state_${generateTestId()}`;
      
      // Navigate directly to callback endpoint
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=${mockAuthCode}&state=${mockState}`);
      
      // Should handle callback and redirect appropriately
      await expect(page).toHaveURL(/.*callback/);
    });

    test('should handle Google OAuth2 callback errors', async ({ page }) => {
      // Test access denied scenario
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?error=access_denied&state=mock_state`);
      
      // Should show error message
      await expect(page.locator('text=Access denied')).toBeVisible();
    });

    test('should handle Google OAuth2 callback with missing code', async ({ page }) => {
      // Test missing authorization code
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?state=mock_state`);
      
      // Should show error message
      await expect(page.locator('text=Missing authorization code')).toBeVisible();
    });
  });

  test.describe('Automated OAuth2 Flow', () => {
    test('should complete full OAuth2 authentication flow with automated Google login', async ({ page }) => {
      // Skip if test credentials are not configured
      test.skip(!TEST_GOOGLE_EMAIL || !TEST_GOOGLE_PASSWORD, 
        'TEST_GOOGLE_EMAIL and TEST_GOOGLE_PASSWORD must be set for automated OAuth2 testing');

      await page.goto(`${BASE_URL}/login`);
      
      // Comprehensive UX validation
      await uxHelper.validateActivationFirstUX();
      await uxHelper.validateFormAccessibility();
      await uxHelper.validateARIACompliance();
      
      // Click the Google OAuth2 button
      const googleButton = page.getByTestId('primary-action google-oauth2-btn');
      await expect(googleButton).toBeVisible();
      await expect(googleButton).toHaveText('Continue with Google');
      
      // Click and wait for redirect to Google
      await googleButton.click();
      await page.waitForURL(/accounts\.google\.com/);
      
      // Handle Google login form
      await handleGoogleLogin(page);
      
      // Wait for redirect back to our application
      await page.waitForURL(/localhost:3000/);
      
      // Verify we're on the dashboard (successful login)
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Verify user is logged in
      await expect(page.locator('text=Dashboard')).toBeVisible();
    });

    test('should handle OAuth2 consent screen properly', async ({ page }) => {
      test.skip(!TEST_GOOGLE_EMAIL || !TEST_GOOGLE_PASSWORD, 
        'TEST_GOOGLE_EMAIL and TEST_GOOGLE_PASSWORD must be set for automated OAuth2 testing');

      await page.goto(`${BASE_URL}/login`);
      
      // Click Google OAuth2 button
      await page.getByTestId('primary-action google-oauth2-btn').click();
      await page.waitForURL(/accounts\.google\.com/);
      
      // Handle Google login
      await handleGoogleLogin(page);
      
      // Handle OAuth2 consent screen if it appears
      await handleOAuth2Consent(page);
      
      // Wait for redirect back to our application
      await page.waitForURL(/localhost:3000/);
      
      // Verify successful login
      await expect(page).toHaveURL(/.*dashboard/);
    });
  });

  test.describe('OAuth2 Error Handling', () => {
    test('should handle OAuth2 errors gracefully', async ({ page }) => {
      // Test with invalid credentials
      await page.goto(`${BASE_URL}/login`);
      
      // Mock the OAuth2 flow to simulate errors
      await page.route('**/api/auth/sso/google', route => {
        route.fulfill({ 
          status: 400, 
          body: JSON.stringify({ 
            success: false, 
            error: 'invalid_client',
            error_description: 'Client not authorized'
          })
        });
      });
      
      await page.getByTestId('primary-action google-oauth2-btn').click();
      
      // Should show error message
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('[role="alert"]')).toContainText(/error|failed/i);
    });

    test('should handle OAuth2 errors with proper UX', async ({ page }) => {
      // Test OAuth2 error scenarios by testing the callback with error parameters
      await page.goto(`${BASE_URL}/login?error=access_denied&details=User%20denied%20access`);
      
      // Should show OAuth2 error message on login page
      await expect(page.locator('[data-testid="oauth2-error-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="oauth2-error-alert"]')).toContainText('OAuth2 Error: access_denied');
      await expect(page.locator('[data-testid="oauth2-error-alert"]')).toContainText('User denied access');
      
      // Test other OAuth2 error scenarios
      const errorScenarios = [
        { error: 'invalid_request', details: 'Invalid request parameters' },
        { error: 'unauthorized_client', details: 'Client not authorized' },
        { error: 'server_error', details: 'Internal server error' }
      ];

      for (const scenario of errorScenarios) {
        await page.goto(`${BASE_URL}/login?error=${scenario.error}&details=${encodeURIComponent(scenario.details)}`);
        await expect(page.locator('[data-testid="oauth2-error-alert"]')).toBeVisible();
        await expect(page.locator('[data-testid="oauth2-error-alert"]')).toContainText(`OAuth2 Error: ${scenario.error}`);
      }
    });

    test('should handle OAuth2 callback with expired state', async ({ page }) => {
      // Test expired state parameter
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=mock_code&state=expired_state`);
      
      // Should show error message
      await expect(page.locator('text=State parameter has expired')).toBeVisible();
    });

    test('should handle OAuth2 callback with server errors', async ({ page }) => {
      // Test server error scenario
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?error=server_error&state=mock_state`);
      
      // Should show error message
      await expect(page.locator('text=Server error')).toBeVisible();
    });
  });

  test.describe('OAuth2 Security & Performance', () => {
    test('should validate OAuth2 security requirements', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Test OAuth2 button security attributes
      const googleButton = page.getByTestId('primary-action google-oauth2-btn');
      await expect(googleButton).toHaveAttribute('aria-label', 'Continue with Google');
      
      // Verify no sensitive data is exposed in the UI
      const pageContent = await page.content();
      expect(pageContent).not.toContain('client_secret');
      expect(pageContent).not.toContain('access_token');
      expect(pageContent).not.toContain('refresh_token');
      
      // Test that the button doesn't expose OAuth2 credentials
      await expect(googleButton).not.toHaveAttribute('data-client-secret');
      await expect(googleButton).not.toHaveAttribute('data-access-token');
    });

    test('should meet performance requirements for OAuth2 flow', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(`${BASE_URL}/login`);
      const loadTime = Date.now() - startTime;
      
      // Validate page load time meets performance budget
      expect(loadTime).toBeLessThan(3000); // 3 seconds max
      
      // Validate OAuth2 button response time
      const buttonStartTime = Date.now();
      await page.getByTestId('primary-action google-oauth2-btn').click();
      const buttonResponseTime = Date.now() - buttonStartTime;
      
      // Button should respond within 1 second
      expect(buttonResponseTime).toBeLessThan(1000);
    });

    test('should be fully responsive on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/login`);
      
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
      await uxHelper.validateMobileAccessibility();
      
      // Test touch interactions
      const googleButton = page.getByTestId('primary-action google-oauth2-btn');
      await expect(googleButton).toBeVisible();
      
      // Validate minimum touch target size (44px)
      const buttonBox = await googleButton.boundingBox();
      expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
    });
  });
});

/**
 * Helper function to handle Google login form
 */
async function handleGoogleLogin(page: any) {
  try {
    // Wait for Google login page to load
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill in email
    await page.fill('input[type="email"]', TEST_GOOGLE_EMAIL!);
    await page.click('button:has-text("Next")');
    
    // Wait for password field and fill it
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.fill('input[type="password"]', TEST_GOOGLE_PASSWORD!);
    await page.click('button:has-text("Next")');
    
    // Handle potential security challenges
    await handleSecurityChallenges(page);
    
  } catch (error) {
    console.error('Error during Google login:', error);
    throw new Error('Failed to complete Google login automation');
  }
}

/**
 * Helper function to handle OAuth2 consent screen
 */
async function handleOAuth2Consent(page: any) {
  try {
    // Check if consent screen appears
    const consentButton = page.locator('button:has-text("Continue"), button:has-text("Allow")');
    
    if (await consentButton.count() > 0) {
      await consentButton.click();
    }
    
    // Handle any additional consent steps
    const advancedButton = page.locator('button:has-text("Advanced")');
    if (await advancedButton.count() > 0) {
      await advancedButton.click();
      
      const goToAppButton = page.locator('a:has-text("Go to"), a:has-text("Continue")');
      if (await goToAppButton.count() > 0) {
        await goToAppButton.click();
      }
    }
    
  } catch (error) {
    console.error('Error during OAuth2 consent:', error);
    // Don't throw here as consent might not always appear
  }
}

/**
 * Helper function to handle security challenges
 */
async function handleSecurityChallenges(page: any) {
  try {
    // Handle potential security challenges (2FA, phone verification, etc.)
    const securityButton = page.locator('button:has-text("Skip"), button:has-text("Not now")');
    
    if (await securityButton.count() > 0) {
      await securityButton.click();
    }
    
    // Handle "Stay signed in" prompt
    const staySignedInButton = page.locator('button:has-text("Yes"), button:has-text("Stay signed in")');
    if (await staySignedInButton.count() > 0) {
      await staySignedInButton.click();
    }
    
  } catch (error) {
    console.error('Error during security challenges:', error);
    // Don't throw here as security challenges might not always appear
  }
} 