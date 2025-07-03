import { test, expect } from '@playwright/test';
import { generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Registration & Email Verification E2E Tests', () => {
  test.describe('User Registration Flow', () => {
    test('should complete full registration flow successfully', async ({ page }) => {
      const testEmail = `e2e-reg-${generateTestId('user')}@example.com`;
      const testName = `E2E Test User ${generateTestId()}`;
      const testPassword = 'e2eTestPass123';

      // Navigate to signup page
      await page.goto(`${BASE_URL}/signup`);
      
      // Verify signup page loads correctly
      await expect(page).toHaveTitle(/APIQ/);
      await expect(page.locator('h2')).toContainText('Create your account');
      
      // Fill registration form
      await page.fill('input[name="name"]', testName);
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.fill('input[name="confirmPassword"]', testPassword);
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should redirect to success page
      await expect(page).toHaveURL(/.*signup-success/);
      await expect(page.locator('h1')).toContainText('Account Created Successfully!');
      await expect(page.locator('p')).toContainText(testEmail);
      
      // Verify success page elements
      await expect(page.locator('text=Welcome to APIQ!')).toBeVisible();
      await expect(page.locator('text=Check your email')).toBeVisible();
      await expect(page.locator('text=Resend verification email')).toBeVisible();
    });

    test('should handle registration validation errors', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Test weak password
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', '123');
      await page.fill('input[name="confirmPassword"]', '123');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('.bg-red-50')).toContainText(/password must be at least 8 characters/i);
      
      // Test invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'validpassword123');
      await page.fill('input[name="confirmPassword"]', 'validpassword123');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('.bg-red-50')).toContainText(/invalid email/i);
      
      // Test password mismatch
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'differentpassword');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('.bg-red-50')).toContainText(/passwords do not match/i);
    });

    test('should handle missing required fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Should show validation errors
      await expect(page.locator('.bg-red-50')).toContainText(/name is required/i);
      await expect(page.locator('.bg-red-50')).toContainText(/email is required/i);
      await expect(page.locator('.bg-red-50')).toContainText(/password is required/i);
    });

    test('should handle duplicate email registration', async ({ page }) => {
      // First, register a user
      const testEmail = `e2e-duplicate-${generateTestId('user')}@example.com`;
      const testName = `E2E Test User ${generateTestId()}`;
      const testPassword = 'e2eTestPass123';

      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="name"]', testName);
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.fill('input[name="confirmPassword"]', testPassword);
      await page.click('button[type="submit"]');
      
      // Should redirect to success page
      await expect(page).toHaveURL(/.*signup-success/);
      
      // Now try to register with the same email
      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="name"]', 'Different User');
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', 'differentpassword123');
      await page.fill('input[name="confirmPassword"]', 'differentpassword123');
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/user with this email already exists/i);
    });

    test('should validate form field requirements', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Check that form fields exist and have proper names
      const nameInput = page.locator('input[name="name"]');
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
      
      await expect(nameInput).toBeVisible();
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(confirmPasswordInput).toBeVisible();
    });
  });

  test.describe('Email Verification Flow', () => {
    test('should handle email verification with valid token', async ({ page }) => {
      // This test would require a real verification token
      // For E2E testing, we'll test the verification page UI
      const testToken = 'valid-verification-token-123';
      
      await page.goto(`${BASE_URL}/verify?token=${testToken}`);
      
      // Should show verification page
      await expect(page).toHaveTitle(/APIQ/);
      await expect(page.locator('text=Email Verification')).toBeVisible();
      
      // Should show verification page content
      await expect(page.locator('text=Email Verification')).toBeVisible();
    });

    test('should handle email verification with invalid token', async ({ page }) => {
      const invalidToken = 'invalid-token-123';
      
      await page.goto(`${BASE_URL}/verify?token=${invalidToken}`);
      
      // Should show error message
      await expect(page.locator('text=Invalid verification token')).toBeVisible();
      await expect(page.locator('text=The verification link may be invalid or expired.')).toBeVisible();
      
      // Should show resend verification option
      await expect(page.locator('text=Didn\'t receive the verification email?')).toBeVisible();
      await expect(page.locator('a[href="/resend-verification"]')).toBeVisible();
    });

    test('should handle missing verification token', async ({ page }) => {
      await page.goto(`${BASE_URL}/verify`);
      
      // Should show error message
      await expect(page.locator('text=Invalid verification token')).toBeVisible();
      await expect(page.locator('text=The verification link may be invalid or expired.')).toBeVisible();
    });

    test('should show resend verification option', async ({ page }) => {
      await page.goto(`${BASE_URL}/verify`);
      
      // Should show resend verification links
      const resendLinks = page.locator('a[href="/resend-verification"]');
      await expect(resendLinks).toBeVisible();
      
      // Should show navigation links
      await expect(page.locator('a[href="/login"]')).toContainText('Back to login');
      await expect(page.locator('a[href="/signup"]')).toContainText('Create a new account');
    });
  });

  test.describe('Resend Verification Email', () => {
    test('should handle resend verification email flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/resend-verification`);
      
      // Should show resend verification page
      await expect(page).toHaveTitle(/APIQ/);
      await expect(page.locator('button')).toContainText('Resend Verification');
      
      // Fill email form
      const testEmail = `e2e-resend-${generateTestId('user')}@example.com`;
      await page.fill('input[name="email"]', testEmail);
      await page.click('button[type="submit"]');
      
      // Should show success message or redirect
      await expect(page).toHaveURL(/.*resend-verification/);
    });

    test('should handle resend verification validation errors', async ({ page }) => {
      await page.goto(`${BASE_URL}/resend-verification`);
      
      // Test invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('.bg-red-50')).toContainText(/invalid email/i);
      
      // Test missing email
      await page.click('button[type="submit"]');
      await expect(page.locator('.bg-red-50')).toContainText(/email is required/i);
    });

    test('should validate email field requirement', async ({ page }) => {
      await page.goto(`${BASE_URL}/resend-verification`);
      
      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toBeVisible();
    });
  });

  test.describe('Navigation and User Experience', () => {
    test('should provide clear navigation between auth pages', async ({ page }) => {
      // Test navigation from signup page
      await page.goto(`${BASE_URL}/signup`);
      
      // Should have link to login
      await expect(page.locator('a[href="/login"]')).toContainText(/sign in to your existing account/i);
      
      // Test navigation from login page
      await page.goto(`${BASE_URL}/login`);
      
      // Should have link to signup
      await expect(page.locator('a[href="/signup"]')).toContainText(/Sign up/i);
      
      // Should have link to forgot password
      await expect(page.locator('a[href="/forgot-password"]')).toContainText(/Forgot password/i);
    });

    test('should handle loading states during registration', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Fill form
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'password123');
      
      // Submit and check loading state
      await page.click('button[type="submit"]');
      
      // Button should show loading state
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
    });

    test('should provide helpful error messages', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Test various error scenarios
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', '123');
      await page.click('button[type="submit"]');
      
      // Should show specific error messages
      await expect(page.locator('.bg-red-50')).toContainText(/invalid email/i);
      await expect(page.locator('.bg-red-50')).toContainText(/password must be at least 8 characters/i);
    });
  });
}); 