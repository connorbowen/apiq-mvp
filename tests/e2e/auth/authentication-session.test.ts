import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';
import { UXComplianceHelper } from '../../helpers/uxCompliance';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser;
let uxHelper: UXComplianceHelper;

test.describe('Authentication & Session E2E Tests - Best-in-Class UX', () => {
  test.beforeAll(async () => {
    // Create a real test user
    testUser = await createTestUser(
      `e2e-auth-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Auth Test User'
    );
  });

  test.afterAll(async () => {
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
  });

  test.describe('Login Page - Best-in-Class UX', () => {
    test('should have best-in-class UX for activation and adoption', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Check page title (global title from layout)
      await expect(page).toHaveTitle(/APIQ/);
      
      // Add UXComplianceHelper validation calls
      await uxHelper.validateActivationFirstUX();
      await uxHelper.validateFormAccessibility();
      await uxHelper.validateMobileResponsiveness();
      await uxHelper.validateKeyboardNavigation();
      
      // 1. CLEAR HEADING HIERARCHY (Activation)
      await expect(page.locator('h2')).toHaveText('Sign in to APIQ');
      await expect(page.locator('p')).toContainText('Multi-API Orchestrator');
      
      // 2. ACCESSIBLE FORM FIELDS (Usability)
      const emailInput = page.getByLabel('Email address');
      const passwordInput = page.getByLabel('Password');
      
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(emailInput).toHaveAttribute('required', '');
      await expect(passwordInput).toHaveAttribute('required', '');
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(emailInput).toHaveAttribute('autocomplete', 'email');
      await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
      
      // Add ARIA attributes validation
      await expect(emailInput).toHaveAttribute('aria-required', 'true');
      await expect(passwordInput).toHaveAttribute('aria-required', 'true');
      
      // 3. DESCRIPTIVE BUTTON TEXTS (Activation)
      // Fix primary action data-testid pattern - use combined pattern
      await expect(page.getByTestId('primary-action signin-btn')).toBeVisible();
      
      // 4. OAUTH2 PROVIDERS WITH CLEAR LABELS (Adoption)
      await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
      
      // Add OAuth2 button accessibility validation
      await expect(page.getByRole('button', { name: /Continue with Google/i })).toHaveAttribute('aria-label', 'Continue with Google');
      
      // 5. HELPFUL NAVIGATION LINKS (Adoption)
      await expect(page.getByRole('link', { name: /Forgot password/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Resend verification email/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Sign up/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Back to home/i })).toBeVisible();
      
      // 6. VISUAL SEPARATION (Look & Feel)
      await expect(page.locator('span').filter({ hasText: 'Or continue with' })).toBeVisible(); // Divider between OAuth and email
    });

    test('should have accessible form validation', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Check that required fields are marked as required
      const emailInput = page.getByLabel('Email address');
      const passwordInput = page.getByLabel('Password');
      
      await expect(emailInput).toHaveAttribute('required');
      await expect(passwordInput).toHaveAttribute('required');
      
      // Check placeholder text for guidance
      await expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');
      await expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password');
      
      // Add comprehensive form validation edge cases
      // Test empty form submission
      await page.getByTestId('primary-action signin-btn').click();
      
      // Should show validation errors
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/required|invalid/i);
      
      // Test malformed email validation
      await emailInput.fill('invalid-email');
      await passwordInput.fill('password123');
      await page.getByTestId('primary-action signin-btn').click();
      
      // Should show email validation error
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/email|invalid/i);
    });

    test('should be mobile responsive', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/login`);
      await uxHelper.validateMobileResponsiveness();
      await uxHelper.validateMobileAccessibility();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await uxHelper.validateKeyboardNavigation();
    });

    test('should handle security edge cases', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Test rate limiting by submitting multiple times quickly
      const emailInput = page.getByLabel('Email address');
      const passwordInput = page.getByLabel('Password');
      
      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      
      // Submit multiple times quickly
      for (let i = 0; i < 5; i++) {
        await page.getByTestId('primary-action signin-btn').click();
        await page.waitForTimeout(100);
      }
      
      // Should show rate limiting error
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/rate limit|too many|slow down/i);
    });
  });

  test.describe('Login Flow - Best-in-Class UX', () => {
    test('should handle successful login with clear feedback', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill login form
      await page.getByLabel('Email address').fill(testUser.email);
      await page.getByLabel('Password').fill('e2eTestPass123');
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action signin-btn').click();
      
      // Click submit and wait for navigation to complete
      await Promise.all([
        page.waitForURL(/.*dashboard/),
        page.getByTestId('primary-action signin-btn').click()
      ]);
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Add performance validation
      // - Load time validation
      // - Responsiveness validation
    });

    test('should handle invalid credentials with clear error messaging', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill login form with wrong password
      await page.getByLabel('Email address').fill(testUser.email);
      await page.getByLabel('Password').fill('wrongpassword');
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action signin-btn').click();
      
      // Should show loading state briefly
      await expect(page.getByRole('button', { name: /Signing in/i })).toBeVisible();
      
      // Wait for loading to complete and error to appear
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in' })).not.toBeDisabled();
      
      // Fix error container validation to use UXComplianceHelper
      await uxHelper.validateErrorContainer(/Invalid credentials|Login failed/);
      
      // Should show error message in accessible alert container
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/Invalid credentials|Login failed/);
      
      // Add role="alert" validation for error containers
      await expect(page.locator('[role="alert"]')).toBeVisible();
      
      // Should stay on login page
      await expect(page).toHaveURL(/.*login/);
      
      // Form should retain email but clear password for security
      await expect(page.getByLabel('Email address')).toHaveValue(testUser.email);
      await expect(page.getByLabel('Password')).toHaveValue('');
    });

    test('should handle non-existent user with helpful error', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill login form with non-existent user
      await page.getByLabel('Email address').fill('nonexistent@example.com');
      await page.getByLabel('Password').fill('password123');
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action signin-btn').click();
      
      // Wait for loading to complete
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in' })).not.toBeDisabled();
      
      // Fix error container validation to use UXComplianceHelper
      await uxHelper.validateErrorContainer(/User not found|Invalid credentials/);
      
      // Should show error message in accessible alert container
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/User not found|Invalid credentials/);
    });

    test('should handle OAuth2 flows with clear provider labels', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Verify OAuth2 button has clear, descriptive text
      const googleButton = page.getByRole('button', { name: /Continue with Google/i });
      
      await expect(googleButton).toBeVisible();
      
      // Verify button has proper disabled state during loading
      await expect(googleButton).not.toBeDisabled();
      
      // Add OAuth2 security validation
      // - OAuth2 state validation
      // - CSRF protection validation
      // - OAuth2 button accessibility validation
      await expect(googleButton).toHaveAttribute('aria-label', 'Continue with Google');
    });

    test('should show proper loading states', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill form and submit
      await page.getByLabel('Email address').fill(testUser.email);
      await page.getByLabel('Password').fill('e2eTestPass123');
      await page.getByTestId('primary-action signin-btn').click();
      
      // Test loading state during form submission
      await expect(page.getByRole('button', { name: /Signing in/i })).toBeVisible();
      
      // Test disabled state during loading
      await expect(page.getByTestId('primary-action signin-btn')).toBeDisabled();
      
      // Test loading text validation
      await expect(page.getByText('Signing in...')).toBeVisible();
    });
  });

  test.describe('Session Management - Best-in-Class UX', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel('Email address').fill(testUser.email);
      await page.getByLabel('Password').fill('e2eTestPass123');
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action signin-btn').click();
      
      // Click submit and wait for navigation to complete
      await Promise.all([
        page.waitForURL(/.*dashboard/),
        page.getByTestId('primary-action signin-btn').click()
      ]);
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Refresh the page
      await page.reload();
      
      // Should still be on dashboard (session maintained)
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel('Email address').fill(testUser.email);
      await page.getByLabel('Password').fill('e2eTestPass123');
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action signin-btn').click();
      
      // Click submit and wait for navigation to complete
      await Promise.all([
        page.waitForURL(/.*dashboard/),
        page.getByTestId('primary-action signin-btn').click()
      ]);
      
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
  });

  test.describe('Protected Routes - Best-in-Class UX', () => {
    test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
      // Try to access dashboard directly
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should redirect to login page (client-side redirect)
      await expect(page).toHaveURL(/.*login/);
    });

    test('should show login page when accessing protected routes', async ({ page }) => {
      // Try to access various protected routes
      const protectedRoutes = ['/dashboard'];
      
      for (const route of protectedRoutes) {
        await page.goto(`${BASE_URL}${route}`);
        await expect(page).toHaveURL(/.*login/);
      }
    });
  });
}); 