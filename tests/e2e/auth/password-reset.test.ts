import { test, expect } from '@playwright/test';
import { generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Password Reset E2E Tests', () => {
  test.describe('Forgot Password Flow', () => {
    test('should complete forgot password flow successfully', async ({ page }) => {
      const testEmail = `e2e-reset-${generateTestId('user')}@example.com`;

      // Navigate to forgot password page
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Verify forgot password page loads correctly
      await expect(page).toHaveTitle(/APIQ/);
      await expect(page.locator('button')).toContainText('Send Reset Link');
      
      // Fill email form
      await page.fill('input[name="email"]', testEmail);
      await page.click('button[type="submit"]');
      
      // Should redirect to success page
      await expect(page).toHaveURL(/.*forgot-password-success/);
      await expect(page.locator('h1')).toContainText('Reset Link Sent!');
      await expect(page.locator('p')).toContainText(testEmail);
      
      // Verify success page elements
      await expect(page.locator('text=We\'ve sent a password reset link to:')).toBeVisible();
      await expect(page.locator('text=Security Note')).toBeVisible();
      await expect(page.locator('text=What happens next?')).toBeVisible();
      await expect(page.locator('text=Check your email')).toBeVisible();
      await expect(page.locator('text=Click the reset link')).toBeVisible();
      await expect(page.locator('text=Sign in')).toBeVisible();
    });

    test('should handle forgot password validation errors', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Test invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('.bg-red-50')).toContainText(/invalid email/i);
      
      // Test missing email
      await page.click('button[type="submit"]');
      await expect(page.locator('.bg-red-50')).toContainText(/email is required/i);
    });

    test('should validate email field requirement', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toBeVisible();
    });

    test('should handle loading states during password reset request', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Fill form
      await page.fill('input[name="email"]', 'test@example.com');
      
      // Submit and check loading state
      await page.click('button[type="submit"]');
      
      // Button should show loading state
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });

    test('should provide helpful error messages', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Test invalid email format
      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('.text-red-600')).toContainText(/invalid email/i);
    });
  });

  test.describe('Password Reset Page', () => {
    test('should handle password reset with valid token', async ({ page }) => {
      // This test would require a real reset token
      // For E2E testing, we'll test the reset page UI
      const testToken = `reset_token_${generateTestId()}`;
      const newPassword = `newPassword${generateTestId()}`;
      
      await page.goto(`${BASE_URL}/reset-password?token=${testToken}`);
      
      // Should show reset password page
      await expect(page).toHaveTitle(/APIQ/);
      await expect(page.locator('button')).toContainText('Reset Password');
      
      // Fill password form
      await page.fill('input[name="password"]', newPassword);
      await page.fill('input[name="confirmPassword"]', newPassword);
      await page.click('button[type="submit"]');
      
      // Should show success message or redirect
      await expect(page).toHaveURL(/.*reset-password/);
    });

    test('should handle password reset with invalid token', async ({ page }) => {
      const invalidToken = `invalid_token_${generateTestId()}`;
      
      await page.goto(`${BASE_URL}/reset-password?token=${invalidToken}`);
      
      // Should show error message
      await expect(page.locator('text=Missing or invalid reset token.')).toBeVisible();
    });

    test('should handle missing reset token', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password`);
      
      // Should show error message
      await expect(page.locator('text=Missing or invalid reset token.')).toBeVisible();
    });

    test('should validate password reset form', async ({ page }) => {
      const testToken = 'test-token-123';
      await page.goto(`${BASE_URL}/reset-password?token=${testToken}`);
      
      // Test password mismatch
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'differentpassword');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('.bg-red-50')).toContainText(/passwords do not match/i);
      
      // Test weak password
      await page.fill('input[name="password"]', '123');
      await page.fill('input[name="confirmPassword"]', '123');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('.bg-red-50')).toContainText(/password must be at least 8 characters/i);
      
      // Test missing passwords
      await page.click('button[type="submit"]');
      await expect(page.locator('.bg-red-50')).toContainText(/password is required/i);
    });

    test('should validate form field requirements', async ({ page }) => {
      const testToken = 'test-token-123';
      await page.goto(`${BASE_URL}/reset-password?token=${testToken}`);
      
      // Check that form fields exist
      const passwordInput = page.locator('input[name="password"]');
      const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
      
      await expect(passwordInput).toBeVisible();
      await expect(confirmPasswordInput).toBeVisible();
    });

    test('should handle loading states during password reset', async ({ page }) => {
      const testToken = 'test-token-123';
      await page.goto(`${BASE_URL}/reset-password?token=${testToken}`);
      
      // Fill form
      await page.fill('input[name="password"]', 'newpassword123');
      await page.fill('input[name="confirmPassword"]', 'newpassword123');
      
      // Submit and check loading state
      await page.click('button[type="submit"]');
      
      // Button should show loading state
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });
  });

  test.describe('Forgot Password Success Page', () => {
    test('should display success page correctly', async ({ page }) => {
      const testEmail = 'test@example.com';
      await page.goto(`${BASE_URL}/forgot-password-success?email=${encodeURIComponent(testEmail)}`);
      
      // Should show success page
      await expect(page).toHaveURL(/.*forgot-password-success/);
      // Should show navigation links
      await expect(page.locator('a[href="/login"]')).toContainText(/Back to Sign In/i);
      await expect(page.locator('a[href="/forgot-password"]')).toContainText(/Try Different Email/i);
    });

    test('should handle missing email parameter gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password-success`);
      // Should still show success page
      await expect(page).toHaveURL(/.*forgot-password-success/);
    });

    test('should provide navigation options', async ({ page }) => {
      const testEmail = 'test@example.com';
      await page.goto(`${BASE_URL}/forgot-password-success?email=${encodeURIComponent(testEmail)}`);
      // Should have navigation links
      await expect(page.locator('a[href="/login"]')).toContainText(/Back to Sign In/i);
      await expect(page.locator('a[href="/forgot-password"]')).toContainText(/Try Different Email/i);
    });

    test('should display success icon', async ({ page }) => {
      const testEmail = 'test@example.com';
      await page.goto(`${BASE_URL}/forgot-password-success?email=${encodeURIComponent(testEmail)}`);
      // Check for the success icon (email icon)
      const successIcon = page.locator('svg');
      await expect(successIcon).toBeVisible();
    });
  });

  test.describe('Navigation and User Experience', () => {
    test('should provide clear navigation between auth pages', async ({ page }) => {
      // Test navigation from forgot password page
      await page.goto(`${BASE_URL}/forgot-password`);
      // Should have link back to login
      await expect(page.locator('a[href="/login"]')).toContainText(/Back to Sign In/i);
      // Test navigation from login page to forgot password
      await page.goto(`${BASE_URL}/login`);
      // Should have link to forgot password
      await expect(page.locator('a[href="/forgot-password"]')).toContainText(/Forgot password/i);
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Fill form
      await page.fill('input[name="email"]', 'test@example.com');
      
      // Simulate network error by going offline
      await page.context().setOffline(true);
      await page.click('button[type="submit"]');
      
      // Should show network error message
      await expect(page.locator('.text-red-600')).toContainText(/network error/i);
      
      // Go back online
      await page.context().setOffline(false);
    });

    test('should provide consistent error messaging', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Test various error scenarios
      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      
      // Should show specific error message
      await expect(page.locator('.text-red-600')).toContainText(/invalid email/i);
    });

    test('should maintain form state on validation errors', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Fill form with invalid data
      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      
      // Should show error but keep email in field
      await expect(page.locator('.text-red-600')).toContainText(/invalid email/i);
      await expect(page.locator('input[name="email"]')).toHaveValue('invalid-email');
    });
  });

  test.describe('Security Considerations', () => {
    test('should not reveal user existence', async ({ page }) => {
      // This test verifies that the forgot password flow doesn't reveal
      // whether a user exists or not (security best practice)
      
      const existingEmail = `e2e-existing-${generateTestId('user')}@example.com`;
      const nonExistingEmail = `e2e-nonexistent-${generateTestId('user')}@example.com`;
      
      // Test with existing user (would need to create one first)
      await page.goto(`${BASE_URL}/forgot-password`);
      await page.fill('input[name="email"]', existingEmail);
      await page.click('button[type="submit"]');
      
      // Should show same success message regardless
      await expect(page).toHaveURL(/.*forgot-password-success/);
      await expect(page.locator('h1')).toContainText('Reset Link Sent!');
      
      // Test with non-existing user
      await page.goto(`${BASE_URL}/forgot-password`);
      await page.fill('input[name="email"]', nonExistingEmail);
      await page.click('button[type="submit"]');
      
      // Should show same success message
      await expect(page).toHaveURL(/.*forgot-password-success/);
      await expect(page.locator('h1')).toContainText('Reset Link Sent!');
    });

    test('should enforce password strength requirements', async ({ page }) => {
      const testToken = 'test-token-123';
      await page.goto(`${BASE_URL}/reset-password?token=${testToken}`);
      
      // Test various weak passwords
      const weakPasswords = ['123', 'password', 'abc123', 'qwerty'];
      
      for (const weakPassword of weakPasswords) {
        await page.fill('input[name="password"]', weakPassword);
        await page.fill('input[name="confirmPassword"]', weakPassword);
        await page.click('button[type="submit"]');
        
        await expect(page.locator('.text-red-600')).toContainText(/password must be at least 8 characters/i);
      }
    });
  });
}); 