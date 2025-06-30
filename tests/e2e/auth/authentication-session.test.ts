import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser;
let jwt;

test.describe('Authentication & Session E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-auth-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Auth Test User'
    );
    jwt = testUser.accessToken;
  });

  test.afterAll(async () => {
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.describe('Login Flow', () => {
    test('should handle successful login', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill login form
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Should show user info
      await expect(page.locator('[data-testid="user-menu"]')).toContainText('E2E Auth Test User');
    });

    test('should handle invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill login form with wrong password
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
      
      // Should stay on login page
      await expect(page).toHaveURL(/.*login/);
    });

    test('should handle non-existent user', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill login form with non-existent user
      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('User not found');
    });

    test('should validate form fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Should show validation errors
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');
      
      // Fill invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      
      // Should show email validation error
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format');
    });

    test('should handle password visibility toggle', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill password field
      await page.fill('input[name="password"]', 'testpassword');
      
      // Password should be hidden by default
      await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
      
      // Click password visibility toggle
      await page.click('[data-testid="password-toggle"]');
      
      // Password should be visible
      await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'text');
      
      // Click again to hide
      await page.click('[data-testid="password-toggle"]');
      
      // Password should be hidden again
      await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Refresh the page
      await page.reload();
      
      // Should still be on dashboard (session maintained)
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.locator('[data-testid="user-menu"]')).toContainText('E2E Auth Test User');
    });

    test('should handle session expiration', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Simulate session expiration by clearing localStorage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Try to access protected page
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*login/);
    });

    test('should handle logout', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Click logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Should redirect to login page
      await expect(page).toHaveURL(/.*login/);
      
      // Try to access dashboard again
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should still be on login page
      await expect(page).toHaveURL(/.*login/);
    });

    test('should handle concurrent sessions', async ({ page, context }) => {
      // Login in first context
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Create second context and login
      const context2 = await context.browser()?.newContext();
      const page2 = await context2?.newPage();
      
      if (page2) {
        await page2.goto(`${BASE_URL}/login`);
        await page2.fill('input[name="email"]', testUser.email);
        await page2.fill('input[name="password"]', 'e2eTestPass123');
        await page2.click('button[type="submit"]');
        
        // Both should be logged in
        await expect(page2).toHaveURL(/.*dashboard/);
        await expect(page).toHaveURL(/.*dashboard/);
        
        await context2.close();
      }
    });
  });

  test.describe('SSO Integration', () => {
    test('should display SSO login options', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Should show SSO options
      await expect(page.locator('[data-testid="sso-google"]')).toBeVisible();
      await expect(page.locator('[data-testid="sso-github"]')).toBeVisible();
      await expect(page.locator('[data-testid="sso-slack"]')).toBeVisible();
    });

    test('should handle Google SSO flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Click Google SSO button
      await page.click('[data-testid="sso-google"]');
      
      // Should redirect to Google OAuth
      await expect(page).toHaveURL(/.*accounts\.google\.com.*oauth2.*auth/);
      
      // Verify OAuth parameters
      const url = page.url();
      expect(url).toContain('client_id=');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=');
    });

    test('should handle GitHub SSO flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Click GitHub SSO button
      await page.click('[data-testid="sso-github"]');
      
      // Should redirect to GitHub OAuth
      await expect(page).toHaveURL(/.*github\.com.*login\/oauth\/authorize/);
      
      // Verify OAuth parameters
      const url = page.url();
      expect(url).toContain('client_id=');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=');
    });

    test('should handle SSO callback with valid code', async ({ page }) => {
      // Mock successful SSO callback
      await page.route('**/api/auth/oauth2/callback**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              user: {
                id: 'test-user-id',
                email: 'sso-test@example.com',
                name: 'SSO Test User'
              },
              accessToken: 'mock-sso-token'
            }
          })
        });
      });
      
      // Navigate to callback URL with mock code
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=valid-code&state=valid-state`);
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should handle SSO callback with invalid code', async ({ page }) => {
      // Mock failed SSO callback
      await page.route('**/api/auth/oauth2/callback**', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Invalid authorization code'
          })
        });
      });
      
      // Navigate to callback URL with invalid code
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=invalid-code&state=valid-state`);
      
      // Should redirect to login with error
      await expect(page).toHaveURL(/.*login/);
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid authorization code');
    });

    test('should handle SSO callback with missing state', async ({ page }) => {
      // Navigate to callback URL without state
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=valid-code`);
      
      // Should redirect to login with error
      await expect(page).toHaveURL(/.*login/);
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid state parameter');
    });
  });

  test.describe('Password Reset', () => {
    test('should handle password reset request', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Click forgot password link
      await page.click('[data-testid="forgot-password-link"]');
      
      // Should navigate to password reset page
      await expect(page).toHaveURL(/.*reset-password/);
      
      // Fill email
      await page.fill('input[name="email"]', testUser.email);
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Password reset email sent');
    });

    test('should handle password reset with invalid email', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password`);
      
      // Fill invalid email
      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('User not found');
    });

    test('should handle password reset token validation', async ({ page }) => {
      // Navigate to reset password with token
      await page.goto(`${BASE_URL}/reset-password?token=valid-token`);
      
      // Should show password reset form
      await expect(page.locator('[data-testid="new-password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="confirm-password-input"]')).toBeVisible();
      
      // Fill new password
      await page.fill('input[name="newPassword"]', 'newpassword123');
      await page.fill('input[name="confirmPassword"]', 'newpassword123');
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Password updated successfully');
    });

    test('should handle password reset with invalid token', async ({ page }) => {
      // Navigate to reset password with invalid token
      await page.goto(`${BASE_URL}/reset-password?token=invalid-token`);
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid or expired token');
    });
  });

  test.describe('Account Security', () => {
    test('should handle account lockout after failed attempts', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Try to login with wrong password multiple times
      for (let i = 0; i < 5; i++) {
        await page.fill('input[name="email"]', testUser.email);
        await page.fill('input[name="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
        
        // Wait for error message
        await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
      }
      
      // Should show account locked message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Account temporarily locked');
      
      // Try to login with correct password (should still be locked)
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Should still show locked message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Account temporarily locked');
    });

    test('should handle two-factor authentication', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Should show 2FA prompt
      await expect(page.locator('[data-testid="2fa-prompt"]')).toBeVisible();
      
      // Enter 2FA code
      await page.fill('input[name="totpCode"]', '123456');
      await page.click('button[type="submit"]');
      
      // Should proceed to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
    });
  });
}); 