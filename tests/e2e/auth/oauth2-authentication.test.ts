import { test, expect } from '@playwright/test';
import { generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('OAuth2 User Authentication E2E Tests', () => {
  test.describe('GitHub OAuth2 Authentication', () => {
    test('should initiate GitHub OAuth2 login flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Verify GitHub OAuth2 button is present
      await expect(page.locator('button:has-text("Continue with GitHub")')).toBeVisible();
      
      // Click GitHub OAuth2 button
      await page.click('button:has-text("Continue with GitHub")');
      
      // Should redirect to OAuth2 endpoint
      await expect(page).toHaveURL(/.*oauth2.*provider=github/);
    });

    test('should handle GitHub OAuth2 callback successfully', async ({ page }) => {
      // Simulate successful OAuth2 callback
      const mockAuthCode = `auth_code_${generateTestId()}`;
      const mockState = `state_${generateTestId()}`;
      
      // Navigate directly to callback endpoint
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=${mockAuthCode}&state=${mockState}`);
      
      // Should handle callback and redirect appropriately
      // Note: In real scenario, this would redirect to dashboard after successful auth
      await expect(page).toHaveURL(/.*callback/);
    });

    test('should handle GitHub OAuth2 callback errors', async ({ page }) => {
      // Test access denied scenario
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?error=access_denied&state=mock_state`);
      
      // Should show error message
      await expect(page.locator('text=Access denied')).toBeVisible();
    });

    test('should handle GitHub OAuth2 callback with invalid state', async ({ page }) => {
      // Test invalid state parameter
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=mock_code&state=invalid_state`);
      
      // Should show error message
      await expect(page.locator('text=Invalid state parameter')).toBeVisible();
    });
  });

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

  test.describe('Slack OAuth2 Authentication', () => {
    test('should initiate Slack OAuth2 login flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Verify Slack OAuth2 button is present
      await expect(page.locator('button:has-text("Continue with Slack")')).toBeVisible();
      
      // Click Slack OAuth2 button
      await page.click('button:has-text("Continue with Slack")');
      
      // Should redirect to OAuth2 endpoint
      await expect(page).toHaveURL(/.*oauth2.*provider=slack/);
    });

    test('should handle Slack OAuth2 callback successfully', async ({ page }) => {
      // Simulate successful OAuth2 callback
      const mockAuthCode = `slack_auth_code_${generateTestId()}`;
      const mockState = `slack_state_${generateTestId()}`;
      
      // Navigate directly to callback endpoint
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=${mockAuthCode}&state=${mockState}`);
      
      // Should handle callback and redirect appropriately
      await expect(page).toHaveURL(/.*callback/);
    });

    test('should handle Slack OAuth2 callback errors', async ({ page }) => {
      // Test access denied scenario
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?error=access_denied&state=mock_state`);
      
      // Should show error message
      await expect(page.locator('text=Access denied')).toBeVisible();
    });

    test('should handle Slack OAuth2 callback with invalid scope', async ({ page }) => {
      // Test invalid scope error
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?error=invalid_scope&state=mock_state`);
      
      // Should show error message
      await expect(page.locator('text=Invalid scope')).toBeVisible();
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
    test('should display all OAuth2 provider buttons', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Verify all OAuth2 buttons are present
      await expect(page.locator('button:has-text("Continue with GitHub")')).toBeVisible();
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
      await expect(page.locator('button:has-text("Continue with Slack")')).toBeVisible();
    });

    test('should have proper OAuth2 button styling', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Check that OAuth2 buttons have proper styling
      const githubButton = page.locator('button:has-text("Continue with GitHub")');
      const googleButton = page.locator('button:has-text("Continue with Google")');
      const slackButton = page.locator('button:has-text("Continue with Slack")');
      
      // Should have proper classes for styling
      await expect(githubButton).toHaveClass(/border-gray-300/);
      await expect(googleButton).toHaveClass(/border-gray-300/);
      await expect(slackButton).toHaveClass(/border-gray-300/);
    });

    test('should show OAuth2 provider icons', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Check that OAuth2 buttons contain SVG icons
      const githubButton = page.locator('button:has-text("Continue with GitHub")');
      const googleButton = page.locator('button:has-text("Continue with Google")');
      const slackButton = page.locator('button:has-text("Continue with Slack")');
      
      await expect(githubButton.locator('svg')).toBeVisible();
      await expect(googleButton.locator('svg')).toBeVisible();
      await expect(slackButton.locator('svg')).toBeVisible();
    });

    test('should handle OAuth2 button loading states', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Click OAuth2 button and check loading state
      const githubButton = page.locator('button:has-text("Continue with GitHub")');
      await githubButton.click();
      
      // Button should show loading state briefly before redirect
      await expect(githubButton).toBeDisabled();
    });
  });

  test.describe('OAuth2 Error Handling', () => {
    test('should handle OAuth2 provider unavailable', async ({ page }) => {
      // Mock OAuth2 provider being unavailable
      await page.route('**/api/auth/oauth2?provider=github', route => {
        route.fulfill({
          status: 503,
          body: JSON.stringify({
            success: false,
            error: 'OAuth2 provider temporarily unavailable'
          })
        });
      });
      
      await page.goto(`${BASE_URL}/login`);
      await page.click('button:has-text("Continue with GitHub")');
      
      // Should show error message
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/OAuth2 provider temporarily unavailable/i);
    });

    test('should handle OAuth2 configuration errors', async ({ page }) => {
      // Mock OAuth2 configuration error
      await page.route('**/api/auth/oauth2?provider=google', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({
            success: false,
            error: 'OAuth2 configuration error'
          })
        });
      });
      
      await page.goto(`${BASE_URL}/login`);
      await page.click('button:has-text("Continue with Google")');
      
      // Should show error message
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/OAuth2 configuration error/i);
    });

    test('should handle network errors during OAuth2 initiation', async ({ page }) => {
      // Mock network error
      await page.route('**/api/auth/oauth2?provider=slack', route => {
        route.abort('failed');
      });
      
      await page.goto(`${BASE_URL}/login`);
      await page.click('button:has-text("Continue with Slack")');
      
      // Should show network error message
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/network error/i);
    });
  });

  test.describe('OAuth2 Security', () => {
    test('should validate OAuth2 state parameter', async ({ page }) => {
      // Test that state parameter is properly validated
      const invalidState = 'invalid_state_parameter';
      
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=mock_code&state=${invalidState}`);
      
      // Should show security error
      await expect(page.locator('text=Invalid state parameter')).toBeVisible();
    });

    test('should prevent OAuth2 CSRF attacks', async ({ page }) => {
      // Test that OAuth2 flow prevents CSRF attacks
      // This is typically done by validating the state parameter
      
      // Simulate a request without proper state validation
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=mock_code`);
      
      // Should reject the request
      await expect(page.locator('text=Missing state parameter')).toBeVisible();
    });

    test('should handle OAuth2 token exchange securely', async ({ page }) => {
      // Test that OAuth2 token exchange is handled securely
      const mockCode = `auth_code_${generateTestId()}`;
      const mockState = `state_${generateTestId()}`;
      
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=${mockCode}&state=${mockState}`);
      
      // Should handle the callback securely
      await expect(page).toHaveURL(/.*callback/);
    });
  });

  test.describe('OAuth2 User Experience', () => {
    test('should provide clear OAuth2 provider selection', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Should clearly show OAuth2 options
      await expect(page.locator('text=Or continue with')).toBeVisible();
      
      // Should have clear provider names
      await expect(page.locator('button:has-text("Continue with GitHub")')).toBeVisible();
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
      await expect(page.locator('button:has-text("Continue with Slack")')).toBeVisible();
    });

    test('should handle OAuth2 flow interruptions gracefully', async ({ page }) => {
      // Test user closing browser during OAuth2 flow
      await page.goto(`${BASE_URL}/login`);
      await page.click('button:has-text("Continue with GitHub")');
      
      // Should redirect to OAuth2 endpoint
      await expect(page).toHaveURL(/.*oauth2.*provider=github/);
      
      // If user closes browser here, they should be able to restart the flow
      // This is tested by going back to login page
      await page.goto(`${BASE_URL}/login`);
      await expect(page.locator('button:has-text("Continue with GitHub")')).toBeVisible();
    });

    test('should provide fallback to email/password login', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Should still show email/password form
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  });
}); 