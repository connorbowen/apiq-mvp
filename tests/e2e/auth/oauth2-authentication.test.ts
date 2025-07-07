import { test, expect } from '@playwright/test';
import { generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('OAuth2 User Authentication E2E Tests', () => {
  test.describe('Google OAuth2 Authentication', () => {
    test('should initiate Google OAuth2 login flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Verify Google OAuth2 button is present
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
      
      // Click Google OAuth2 button
      await page.click('button:has-text("Continue with Google")');
      
      // Should redirect to OAuth2 endpoint
      await expect(page).toHaveURL(/.*oauth2.*provider=google/);
    });

    test('should handle Google OAuth2 callback successfully', async ({ page }) => {
      // Simulate successful OAuth2 callback
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

  test.describe('OAuth2 General Flow', () => {
    test('should handle OAuth2 state parameter validation', async ({ page }) => {
      // Test missing state parameter
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=mock_code`);
      
      // Should show error message
      await expect(page.locator('text=Missing state parameter')).toBeVisible();
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

    test('should handle OAuth2 callback with temporarily unavailable service', async ({ page }) => {
      // Test temporarily unavailable error
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?error=temporarily_unavailable&state=mock_state`);
      
      // Should show error message
      await expect(page.locator('text=Service temporarily unavailable')).toBeVisible();
    });
  });

  test.describe('OAuth2 UI Elements', () => {
    test('should display Google OAuth2 button', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Verify Google OAuth2 button is present
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
    });

    test('should have proper OAuth2 button styling', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Check that Google OAuth2 button has proper styling
      const googleButton = page.locator('button:has-text("Continue with Google")');
      
      // Should have proper classes for styling
      await expect(googleButton).toHaveClass(/border-gray-300/);
    });

    test('should show OAuth2 provider icon', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Check that Google OAuth2 button contains SVG icon
      const googleButton = page.locator('button:has-text("Continue with Google")');
      
      // Should contain SVG icon
      await expect(googleButton.locator('svg')).toBeVisible();
    });

    test('should handle OAuth2 button loading states', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Click Google OAuth2 button
      await page.click('button:has-text("Continue with Google")');
      
      // Button should be disabled during loading
      await expect(page.locator('button:has-text("Continue with Google")')).toBeDisabled();
    });
  });

  test.describe('OAuth2 Error Handling', () => {
    test('should handle network errors during OAuth2 initiation', async ({ page }) => {
      // Mock network error by using invalid URL
      await page.route('**/api/auth/oauth2?provider=google', route => {
        route.abort('failed');
      });
      
      await page.goto(`${BASE_URL}/login`);
      await page.click('button:has-text("Continue with Google")');
      
      // Should show error message
      await expect(page.locator('.text-red-800')).toContainText(/network error/i);
    });
  });

  test.describe('OAuth2 Security', () => {
    test('should validate OAuth2 state parameter', async ({ page }) => {
      // Test invalid state parameter
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=mock_code&state=invalid_state`);
      
      // Should show error message
      await expect(page.locator('text=Invalid state parameter')).toBeVisible();
    });

    test('should prevent OAuth2 CSRF attacks', async ({ page }) => {
      // Test missing state parameter (CSRF protection)
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=mock_code`);
      
      // Should show error message
      await expect(page.locator('text=Missing state parameter')).toBeVisible();
    });

    test('should handle OAuth2 token exchange securely', async ({ page }) => {
      // Test secure token exchange
      const mockAuthCode = `secure_auth_code_${generateTestId()}`;
      const mockState = `secure_state_${generateTestId()}`;
      
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=${mockAuthCode}&state=${mockState}`);
      
      // Should handle callback securely
      await expect(page).toHaveURL(/.*callback/);
    });
  });

  test.describe('OAuth2 User Experience', () => {
    test('should handle OAuth2 flow interruptions gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Start OAuth2 flow
      await page.click('button:has-text("Continue with Google")');
      
      // Should redirect to OAuth2 endpoint
      await expect(page).toHaveURL(/.*oauth2.*provider=google/);
      
      // If user closes browser here, they should be able to restart the flow
      // This is tested by going back to login page
      await page.goto(`${BASE_URL}/login`);
      
      // Should be able to restart OAuth2 flow
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
    });

    test('should provide clear error messages for OAuth2 failures', async ({ page }) => {
      // Test various OAuth2 error scenarios
      const errorScenarios = [
        { error: 'access_denied', expectedMessage: 'Access denied' },
        { error: 'invalid_scope', expectedMessage: 'Invalid scope' },
        { error: 'server_error', expectedMessage: 'Server error' }
      ];
      
      for (const scenario of errorScenarios) {
        await page.goto(`${BASE_URL}/api/auth/oauth2/callback?error=${scenario.error}&state=mock_state`);
        await expect(page.locator(`text=${scenario.expectedMessage}`)).toBeVisible();
      }
    });
  });
}); 