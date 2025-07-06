import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser;

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

  test.describe('Login Page - Best-in-Class UX', () => {
    test('should have best-in-class UX for activation and adoption', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Check page title (global title from layout)
      await expect(page).toHaveTitle(/APIQ/);
      
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
      
      // 3. DESCRIPTIVE BUTTON TEXTS (Activation)
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
      
      // 4. OAUTH2 PROVIDERS WITH CLEAR LABELS (Adoption)
      await expect(page.getByRole('button', { name: /Continue with GitHub/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Continue with Slack/i })).toBeVisible();
      
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
    });
  });

  test.describe('Login Flow - Best-in-Class UX', () => {
    test('should handle successful login with clear feedback', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill login form
      await page.getByLabel('Email address').fill(testUser.email);
      await page.getByLabel('Password').fill('e2eTestPass123');
      
      // Click submit and wait for navigation to complete
      await Promise.all([
        page.waitForURL(/.*dashboard/),
        page.getByRole('button', { name: 'Sign in' }).click()
      ]);
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should handle invalid credentials with clear error messaging', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill login form with wrong password
      await page.getByLabel('Email address').fill(testUser.email);
      await page.getByLabel('Password').fill('wrongpassword');
      await page.getByRole('button', { name: 'Sign in' }).click();
      
      // Should show loading state briefly
      await expect(page.getByRole('button', { name: /Signing in/i })).toBeVisible();
      
      // Wait for loading to complete and error to appear
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in' })).not.toBeDisabled();
      
      // Should show error message in accessible alert container
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/Invalid credentials|Login failed/);
      
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
      await page.getByRole('button', { name: 'Sign in' }).click();
      
      // Wait for loading to complete
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in' })).not.toBeDisabled();
      
      // Should show error message in accessible alert container
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/User not found|Invalid credentials/);
    });

    test('should handle OAuth2 flows with clear provider labels', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Verify OAuth2 buttons have clear, descriptive text
      const githubButton = page.getByRole('button', { name: /Continue with GitHub/i });
      const googleButton = page.getByRole('button', { name: /Continue with Google/i });
      const slackButton = page.getByRole('button', { name: /Continue with Slack/i });
      
      await expect(githubButton).toBeVisible();
      await expect(googleButton).toBeVisible();
      await expect(slackButton).toBeVisible();
      
      // Verify buttons have proper disabled state during loading
      await expect(githubButton).not.toBeDisabled();
      await expect(googleButton).not.toBeDisabled();
      await expect(slackButton).not.toBeDisabled();
    });
  });

  test.describe('Session Management - Best-in-Class UX', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel('Email address').fill(testUser.email);
      await page.getByLabel('Password').fill('e2eTestPass123');
      
      // Click submit and wait for navigation to complete
      await Promise.all([
        page.waitForURL(/.*dashboard/),
        page.getByRole('button', { name: 'Sign in' }).click()
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
      
      // Click submit and wait for navigation to complete
      await Promise.all([
        page.waitForURL(/.*dashboard/),
        page.getByRole('button', { name: 'Sign in' }).click()
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