/**
 * PHASE 2.3: Streamlined authentication flow testing
 * - [x] Test simplified registration in under 2 minutes
 * - [x] Test access without email verification
 * - [x] Test direct redirect to chat interface after signup
 * - [x] Test simplified login flow
 * - [x] Test security while reducing friction
 * 
 * IMPLEMENTATION NOTES:
 * - Test streamlined signup with email + password only
 * - Test optional email verification (don't block access)
 * - Test direct redirect to Chat interface after login
 * - Test simplified validation for faster signup
 */

import { test, expect } from '@playwright/test';

test.describe('UX Simplification - Authentication Flows', () => {
  const testEmail = `auth-test-${Date.now()}@example.com`;
  const testPassword = 'SecurePass123!';

  test.describe('Simplified Registration Flow', () => {
    test('should complete registration in under 2 minutes', async ({ page }) => {
      const startTime = Date.now();
      
      // Navigate to signup
      await page.goto('/signup');
      
      // Verify simplified form
      await expect(page.getByText('Create your account')).toBeVisible();
      await expect(page.getByLabel('Email address')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      
      // Fill simplified registration form
      await page.getByLabel('Email address').fill(testEmail);
      await page.getByLabel('Password').fill(testPassword);
      
      // Submit registration
      await page.getByRole('button', { name: 'Create account' }).click();
      
      // Should redirect to dashboard/chat immediately
      await page.waitForURL(/.*dashboard/);
      await expect(page.getByTestId('chat-interface')).toBeVisible();
      
      const endTime = Date.now();
      const registrationTime = (endTime - startTime) / 1000; // Convert to seconds
      
      // Should complete in under 2 minutes (120 seconds)
      expect(registrationTime).toBeLessThan(120);
    });

    test('should allow access without email verification', async ({ page }) => {
      const unverifiedEmail = `unverified-${Date.now()}@example.com`;
      
      // Register new user
      await page.goto('/signup');
      await page.getByLabel('Email address').fill(unverifiedEmail);
      await page.getByLabel('Password').fill(testPassword);
      await page.getByRole('button', { name: 'Create account' }).click();
      
      // Should redirect to dashboard immediately (no verification required)
      await page.waitForURL(/.*dashboard/);
      await expect(page.getByTestId('chat-interface')).toBeVisible();
      
      // Should show unverified status but not block access
      await expect(page.getByText('Email not verified')).toBeVisible();
      await expect(page.getByText('Verify your email')).toBeVisible();
      
      // Should still have full access to features
      await expect(page.getByTestId('tab-workflows')).toBeVisible();
      await expect(page.getByTestId('tab-settings')).toBeVisible();
    });

    test('should redirect directly to chat interface after signup', async ({ page }) => {
      const chatEmail = `chat-redirect-${Date.now()}@example.com`;
      
      // Register new user
      await page.goto('/signup');
      await page.getByLabel('Email address').fill(chatEmail);
      await page.getByLabel('Password').fill(testPassword);
      await page.getByRole('button', { name: 'Create account' }).click();
      
      // Should redirect to chat tab specifically
      await page.waitForURL(/.*dashboard.*tab=chat/);
      await expect(page.getByTestId('chat-interface')).toBeVisible();
      await expect(page.getByTestId('tab-chat')).toHaveClass(/bg-indigo-100/);
    });

    test('should handle simplified validation', async ({ page }) => {
      // Test with minimal validation
      await page.goto('/signup');
      
      // Test with simple email format
      await page.getByLabel('Email address').fill('simple@test.com');
      await page.getByLabel('Password').fill('password123');
      await page.getByRole('button', { name: 'Create account' }).click();
      
      // Should accept simple validation and redirect
      await page.waitForURL(/.*dashboard/);
      await expect(page.getByTestId('chat-interface')).toBeVisible();
    });

    test('should show welcome message for new users', async ({ page }) => {
      const welcomeEmail = `welcome-${Date.now()}@example.com`;
      
      // Register new user
      await page.goto('/signup');
      await page.getByLabel('Email address').fill(welcomeEmail);
      await page.getByLabel('Password').fill(testPassword);
      await page.getByRole('button', { name: 'Create account' }).click();
      
      // Should show welcome message in chat
      await page.waitForURL(/.*dashboard/);
      await expect(page.getByText('Welcome to APIQ')).toBeVisible();
      await expect(page.getByText('How can I help you create your first workflow?')).toBeVisible();
    });
  });

  test.describe('Simplified Login Flow', () => {
    test('should handle streamlined login process', async ({ page }) => {
      // Login with existing credentials
      await page.goto('/login');
      
      // Verify simplified login form
      await expect(page.getByText('Sign in to your account')).toBeVisible();
      await expect(page.getByLabel('Email address')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      
      // Fill login form
      await page.getByLabel('Email address').fill(testEmail);
      await page.getByLabel('Password').fill(testPassword);
      
      // Submit login
      await page.getByRole('button', { name: 'Sign in' }).click();
      
      // Should redirect to chat interface
      await page.waitForURL(/.*dashboard.*tab=chat/);
      await expect(page.getByTestId('chat-interface')).toBeVisible();
    });

    test('should remember user preferences after login', async ({ page }) => {
      // Login user
      await page.goto('/login');
      await page.getByLabel('Email address').fill(testEmail);
      await page.getByLabel('Password').fill(testPassword);
      await page.getByRole('button', { name: 'Sign in' }).click();
      
      // Navigate to different tab
      await page.getByTestId('tab-workflows').click();
      await expect(page).toHaveURL(/.*tab=workflows/);
      
      // Logout and login again
      await page.getByTestId('user-dropdown-toggle').click();
      await page.getByText('Logout').click();
      
      await page.goto('/login');
      await page.getByLabel('Email address').fill(testEmail);
      await page.getByLabel('Password').fill(testPassword);
      await page.getByRole('button', { name: 'Sign in' }).click();
      
      // Should default to chat tab (not remember previous tab)
      await expect(page).toHaveURL(/.*tab=chat/);
      await expect(page.getByTestId('chat-interface')).toBeVisible();
    });

    test('should handle login errors gracefully', async ({ page }) => {
      await page.goto('/login');
      
      // Test invalid credentials
      await page.getByLabel('Email address').fill('invalid@example.com');
      await page.getByLabel('Password').fill('wrongpassword');
      await page.getByRole('button', { name: 'Sign in' }).click();
      
      // Should show error message
      await expect(page.getByText('Invalid email or password')).toBeVisible();
      
      // Should not redirect
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Email Verification (Optional)', () => {
    test('should provide email verification option', async ({ page }) => {
      const verifyEmail = `verify-${Date.now()}@example.com`;
      
      // Register user
      await page.goto('/signup');
      await page.getByLabel('Email address').fill(verifyEmail);
      await page.getByLabel('Password').fill(testPassword);
      await page.getByRole('button', { name: 'Create account' }).click();
      
      // Should show verification option but not require it
      await page.waitForURL(/.*dashboard/);
      await expect(page.getByText('Verify your email')).toBeVisible();
      await expect(page.getByText('Resend verification email')).toBeVisible();
      
      // Should still have full access
      await expect(page.getByTestId('chat-interface')).toBeVisible();
    });

    test('should handle email verification when completed', async ({ page }) => {
      const verifiedEmail = `verified-${Date.now()}@example.com`;
      
      // Register and verify email
      await page.goto('/signup');
      await page.getByLabel('Email address').fill(verifiedEmail);
      await page.getByLabel('Password').fill(testPassword);
      await page.getByRole('button', { name: 'Create account' }).click();
      
      // Simulate email verification (in real test, would check email)
      await page.goto('/verify?token=test-verification-token');
      await expect(page.getByText('Email verified successfully')).toBeVisible();
      
      // Should redirect to dashboard
      await page.waitForURL(/.*dashboard/);
      await expect(page.getByText('Email verified')).toBeVisible();
    });

    test('should allow resending verification email', async ({ page }) => {
      const resendEmail = `resend-${Date.now()}@example.com`;
      
      // Register user
      await page.goto('/signup');
      await page.getByLabel('Email address').fill(resendEmail);
      await page.getByLabel('Password').fill(testPassword);
      await page.getByRole('button', { name: 'Create account' }).click();
      
      // Click resend verification
      await page.getByText('Resend verification email').click();
      
      // Should show success message
      await expect(page.getByText('Verification email sent')).toBeVisible();
    });
  });

  test.describe('Security and Friction Balance', () => {
    test('should maintain security while reducing friction', async ({ page }) => {
      // Test password requirements
      await page.goto('/signup');
      
      // Try weak password
      await page.getByLabel('Email address').fill('security@test.com');
      await page.getByLabel('Password').fill('weak');
      await page.getByRole('button', { name: 'Create account' }).click();
      
      // Should show password requirements
      await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
      
      // Use strong password
      await page.getByLabel('Password').fill('StrongPass123!');
      await page.getByRole('button', { name: 'Create account' }).click();
      
      // Should accept and redirect
      await page.waitForURL(/.*dashboard/);
    });

    test('should handle session management securely', async ({ page }) => {
      // Login user
      await page.goto('/login');
      await page.getByLabel('Email address').fill(testEmail);
      await page.getByLabel('Password').fill(testPassword);
      await page.getByRole('button', { name: 'Sign in' }).click();
      
      // Verify session is maintained
      await page.waitForURL(/.*dashboard/);
      await expect(page.getByTestId('user-dropdown-toggle')).toBeVisible();
      
      // Test logout
      await page.getByTestId('user-dropdown-toggle').click();
      await page.getByText('Logout').click();
      
      // Should redirect to login
      await page.waitForURL(/.*login/);
      await expect(page.getByText('Sign in to your account')).toBeVisible();
    });

    test('should prevent access to protected routes when not authenticated', async ({ page }) => {
      // Try to access dashboard without login
      await page.goto('/dashboard');
      
      // Should redirect to login
      await page.waitForURL(/.*login/);
      await expect(page.getByText('Sign in to your account')).toBeVisible();
    });
  });

  test.describe('Error Recovery and Support', () => {
    test('should provide helpful error recovery', async ({ page }) => {
      await page.goto('/login');
      
      // Test forgot password flow
      await page.getByText('Forgot your password?').click();
      await expect(page.getByText('Reset your password')).toBeVisible();
      
      await page.getByLabel('Email address').fill(testEmail);
      await page.getByRole('button', { name: 'Send reset email' }).click();
      
      // Should show success message
      await expect(page.getByText('Password reset email sent')).toBeVisible();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network error
      await page.route('**/api/auth/**', route => {
        route.fulfill({ status: 500, body: 'Server Error' });
      });
      
      await page.goto('/login');
      await page.getByLabel('Email address').fill(testEmail);
      await page.getByLabel('Password').fill(testPassword);
      await page.getByRole('button', { name: 'Sign in' }).click();
      
      // Should show error message
      await expect(page.getByText('Unable to sign in')).toBeVisible();
      await expect(page.getByText('Please try again later')).toBeVisible();
    });
  });

  test.describe('Accessibility and UX', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/login');
      
      // Navigate with keyboard
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Email address')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Password')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeFocused();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/login');
      
      // Verify ARIA labels
      await expect(page.getByLabel('Email address')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    });

    test('should provide clear feedback for form validation', async ({ page }) => {
      await page.goto('/signup');
      
      // Try to submit empty form
      await page.getByRole('button', { name: 'Create account' }).click();
      
      // Should show validation errors
      await expect(page.getByText('Email is required')).toBeVisible();
      await expect(page.getByText('Password is required')).toBeVisible();
    });
  });

  test.describe('Performance and Loading', () => {
    test('should load authentication pages quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/login');
      const loadTime = Date.now() - startTime;
      
      // Should load in under 2 seconds
      expect(loadTime).toBeLessThan(2000);
      await expect(page.getByText('Sign in to your account')).toBeVisible();
    });

    test('should handle authentication requests efficiently', async ({ page }) => {
      await page.goto('/login');
      
      const startTime = Date.now();
      await page.getByLabel('Email address').fill(testEmail);
      await page.getByLabel('Password').fill(testPassword);
      await page.getByRole('button', { name: 'Sign in' }).click();
      
      // Should complete authentication in under 3 seconds
      await page.waitForURL(/.*dashboard/, { timeout: 3000 });
      const authTime = Date.now() - startTime;
      expect(authTime).toBeLessThan(3000);
    });
  });
}); 
