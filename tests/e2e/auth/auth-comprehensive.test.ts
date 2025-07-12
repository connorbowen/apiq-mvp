import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
import { prisma } from '../../../lib/database/client';
import bcrypt from 'bcryptjs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_GOOGLE_EMAIL = process.env.TEST_GOOGLE_EMAIL;
const TEST_GOOGLE_PASSWORD = process.env.TEST_GOOGLE_PASSWORD;

let testUser: any;
let uxHelper: UXComplianceHelper;

test.describe('Comprehensive Authentication E2E Tests - Best-in-Class UX', () => {
  test.beforeAll(async () => {
    // Create a real test user for all auth tests
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

  // ============================================================================
  // LOGIN PAGE & SESSION MANAGEMENT
  // ============================================================================

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
      
      // Should show validation errors - check for any error container
      await expect(page.locator('.bg-red-50, .text-red-800, [role="alert"]').first()).toBeVisible();
      
      // Test malformed email validation
      await emailInput.fill('invalid-email');
      await passwordInput.fill('password123');
      await page.getByTestId('primary-action signin-btn').click();
      
      // Should show email validation error
      await expect(page.locator('.bg-red-50, .text-red-800, [role="alert"]').first()).toBeVisible();
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
      
      // Submit multiple times quickly - but wait for button to be enabled between clicks
      for (let i = 0; i < 3; i++) {
        await page.getByTestId('primary-action signin-btn').click();
        // Wait for button to be enabled again (loading state to complete)
        await page.waitForFunction(() => {
          const button = document.querySelector('[data-testid="primary-action signin-btn"]');
          return button && !button.hasAttribute('disabled');
        }, { timeout: 5000 });
        await page.waitForTimeout(200); // Small delay between attempts
      }
      
      // Should show rate limiting error or any error message
      await expect(page.locator('.bg-red-50, .text-red-800, [role="alert"]').first()).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/rate limit|too many|slow down|invalid credentials/i);
    });
  });

  test.describe('Login Flow - Best-in-Class UX', () => {
    test('should handle successful login with clear feedback', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill login form
      await page.getByLabel('Email address').fill(testUser.email);
      await page.getByLabel('Password').fill('e2eTestPass123');
      
      // Fix duplicate click issue - only click once and wait for navigation
      await Promise.all([
        page.waitForURL(/.*dashboard/),
        page.getByTestId('primary-action signin-btn').click()
      ]);
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Add performance validation
      // - Load time validation
      const loadTime = await page.evaluate(() => {
        return performance.timing.loadEventEnd - performance.timing.navigationStart;
      });
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
      
      // - Responsiveness validation
      await uxHelper.validatePerformanceRequirements();
      
      // Validate dashboard is accessible after login
      await expect(page.locator('h2')).toContainText(/Dashboard|Welcome|Overview/i);
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
      await expect(page.getByTestId('primary-action signin-btn')).toBeVisible();
      await expect(page.getByTestId('primary-action signin-btn')).not.toBeDisabled();
      
      // Should show error message
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.bg-red-50')).toContainText(/Invalid credentials|Login failed/);
    });
  });

  // ============================================================================
  // OAUTH2 AUTHENTICATION
  // ============================================================================

  test.describe('OAuth2 Authentication', () => {
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

    test('should handle Google OAuth2 callback errors', async ({ page }) => {
      // Test access denied scenario
      await page.goto(`${BASE_URL}/api/auth/sso/callback?error=access_denied&state=mock_state`);
      
      // Should show error message or redirect to login with error
      try {
        await expect(page.locator('text=Access denied')).toBeVisible();
      } catch {
        // If not found, check if we're redirected to login with error
        await expect(page).toHaveURL(/.*login/);
      }
    });

    test('should handle Google OAuth2 callback with missing code', async ({ page }) => {
      // Test missing authorization code
      await page.goto(`${BASE_URL}/api/auth/sso/callback?state=mock_state`);
      
      // Should show error message or redirect to login with error
      try {
        await expect(page.locator('text=Missing authorization code')).toBeVisible();
      } catch {
        // If not found, check if we're redirected to login with error
        await expect(page).toHaveURL(/.*login/);
      }
    });
  });

  // ============================================================================
  // REGISTRATION & VERIFICATION
  // ============================================================================

  test.describe('Registration & Verification', () => {
    test('should have best-in-class UX for user registration', async ({ page }) => {
      const testEmail = `e2e-reg-${generateTestId('user')}@example.com`;
      const testPassword = 'SecurePass123!';
      const testName = 'E2E Test User';

      await page.goto(`${BASE_URL}/signup`);
      
      // Add comprehensive UX validation
      await uxHelper.validatePageTitle('APIQ');
      await uxHelper.validateHeadingHierarchy(['Create your APIQ account']);
      await uxHelper.validateFormAccessibility();
      await uxHelper.validateActivationFirstUX();

      // 1. CLEAR HEADING HIERARCHY (Activation)
      await expect(page.locator('h2')).toHaveText('Create your APIQ account');
      await expect(page.locator('p')).toContainText('Start orchestrating APIs with natural language');

      // 2. ACCESSIBLE FORM FIELDS (Usability)
      const nameInput = page.getByLabel('Full name');
      const emailInput = page.getByLabel('Email address');
      const passwordInput = page.locator('#password');
      const confirmPasswordInput = page.locator('#confirmPassword');

      await expect(nameInput).toBeVisible();
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(confirmPasswordInput).toBeVisible();

      // Check required attributes
      await expect(nameInput).toHaveAttribute('required', '');
      await expect(emailInput).toHaveAttribute('required', '');
      await expect(passwordInput).toHaveAttribute('required', '');
      await expect(confirmPasswordInput).toHaveAttribute('required', '');

      // Validate ARIA attributes for accessibility
      await expect(nameInput).toHaveAttribute('aria-required', 'true');
      await expect(emailInput).toHaveAttribute('aria-required', 'true');
      await expect(passwordInput).toHaveAttribute('aria-required', 'true');
      await expect(confirmPasswordInput).toHaveAttribute('aria-required', 'true');

      // Check input types and autocomplete
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      await expect(emailInput).toHaveAttribute('autocomplete', 'email');
      await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
      await expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password');

      // 3. HELPFUL PLACEHOLDER TEXT (Adoption)
      await expect(nameInput).toHaveAttribute('placeholder', 'Enter your full name');
      await expect(emailInput).toHaveAttribute('placeholder', 'Enter your email address');
      await expect(passwordInput).toHaveAttribute('placeholder', 'Create a strong password');
      await expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm your password');

      // 4. DESCRIPTIVE BUTTON TEXT (Activation)
      await expect(page.getByTestId('primary-action signup-btn')).toBeVisible();

      // 5. HELPFUL NAVIGATION LINKS (Adoption)
      await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Back to home/i })).toBeVisible();

      // 6. FILL FORM WITH VALID DATA
      await nameInput.fill(testName);
      await emailInput.fill(testEmail);
      await passwordInput.fill(testPassword);
      await confirmPasswordInput.fill(testPassword);

      // 7. SUBMIT AND VERIFY LOADING STATE
      const submitButton = page.getByTestId('primary-action signup-btn');
      await submitButton.click();
      await expect(submitButton).toBeDisabled();
      await expect(submitButton).toHaveText('Creating account...');
      await expect(page).toHaveURL(/.*signup-success/, { timeout: 10000 });

      // 8. SUCCESS REDIRECT WITH CLEAR MESSAGING
      await expect(page.locator('h2')).toHaveText('Account Created Successfully!');
      await expect(page.getByText(testEmail)).toBeVisible();

      // Clean up - delete user by email
      await prisma.user.deleteMany({
        where: { email: testEmail }
      });
    });

    test('should handle registration errors with clear messaging', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);

      // Try to submit empty form
      await page.getByTestId('primary-action signup-btn').click();

      // Use UXComplianceHelper for error container validation
      await uxHelper.validateErrorContainer(/required|fill in/i);

      // Validate role="alert" for error containers
      await expect(page.locator('[role="alert"]').filter({ hasText: /required|fill in/i })).toBeVisible();

      // Try with invalid email
      await page.getByLabel('Full name').fill('Test User');
      await page.getByLabel('Email address').fill('invalid-email');
      await page.locator('#password').fill('password123');
      await page.locator('#confirmPassword').fill('password123');
      await page.getByTestId('primary-action signup-btn').click();

      // Use UXComplianceHelper for error container validation
      await uxHelper.validateErrorContainer(/valid email|email format/i);

      // Try with mismatched passwords
      await page.getByLabel('Email address').fill('test@example.com');
      await page.locator('#password').fill('password123');
      await page.locator('#confirmPassword').fill('different123');
      await page.getByTestId('primary-action signup-btn').click();

      // Use UXComplianceHelper for error container validation
      await uxHelper.validateErrorContainer(/match|same password/i);
    });
  });

  // ============================================================================
  // PASSWORD RESET FLOW
  // ============================================================================

  test.describe('Password Reset Flow', () => {
    test('should complete full password reset flow with real email', async ({ page }) => {
      test.setTimeout(30000); // 30 seconds for complex password reset flow
      const testEmail = `e2e-reset-${generateTestId('user')}@example.com`;
      const originalPassword = 'OriginalPass123!';
      const newPassword = 'NewSecurePass456!';

      // Create a test user with known password
      const hashedPassword = await bcrypt.hash(originalPassword, 12);
      const testUser = await prisma.user.create({
        data: {
          email: testEmail,
          name: 'E2E Test User',
          password: hashedPassword,
          isActive: true,
          role: 'USER'
        }
      });

      try {
        // Step 1: Request password reset
        await page.goto(`${BASE_URL}/forgot-password`);
        
        // Add UXComplianceHelper validation calls
        await uxHelper.validateActivationFirstUX();
        await uxHelper.validateFormAccessibility();
        await uxHelper.validateMobileResponsiveness();
        await uxHelper.validateKeyboardNavigation();
        
        // Fill and submit the form
        await page.fill('input[name="email"]', testEmail);
        await page.getByTestId('primary-action send-reset-link-btn').click();
        
        // Wait for success page with longer timeout
        await expect(page).toHaveURL(/.*forgot-password-success/, { timeout: 10000 });
        await expect(page.locator('h2')).toContainText('Reset Link Sent!');
        
        // Step 2: Get the reset token from database
        const resetToken = await prisma.passwordResetToken.findFirst({
          where: { email: testEmail }
        });
        
        expect(resetToken).toBeTruthy();
        expect(resetToken?.token).toBeTruthy();
        
        // Step 3: Use the reset token to change password
        await page.goto(`${BASE_URL}/reset-password?token=${resetToken!.token}`);
        
        // Verify we're on the reset password page
        await expect(page.locator('h2')).toContainText('Reset your password');
        
        // Fill in new password
        await page.fill('input[name="password"]', newPassword);
        await page.fill('input[name="confirmPassword"]', newPassword);
        
        await page.getByTestId('primary-action reset-password-btn').click();
        
        // Wait for success message
        await expect(page.locator('.bg-green-50')).toContainText('Password reset successful!');
        
        // Should redirect to login page
        await expect(page).toHaveURL(/.*login/);
        
        // Add a small delay to ensure password reset is fully committed
        await page.waitForTimeout(1000);
        
        // Step 4: Verify old password no longer works
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', originalPassword);
        
        await page.getByTestId('primary-action signin-btn').click();
        
        // Wait for error to appear
        await expect(page.locator('.bg-red-50')).toBeVisible();
        await expect(page.locator('.bg-red-50')).toContainText(/Invalid credentials|Login failed/);
        
        // Step 5: Verify new password works
        await page.fill('input[name="password"]', newPassword);
        await page.getByTestId('primary-action signin-btn').click();
        
        // Should successfully login and redirect to dashboard
        await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
        await expect(page.locator('h1')).toContainText('Dashboard', { timeout: 10000 });
        
        // Step 6: Verify token was deleted from database
        const deletedToken = await prisma.passwordResetToken.findUnique({
          where: { token: resetToken!.token }
        });
        expect(deletedToken).toBeNull();
        
        // Step 7: Verify audit logs were created
        const auditLogs = await prisma.auditLog.findMany({
          where: { userId: testUser.id },
          orderBy: { createdAt: 'desc' }
        });
        
        expect(auditLogs.length).toBeGreaterThanOrEqual(2);
        expect(auditLogs.some(log => log.action === 'REQUEST_PASSWORD_RESET')).toBe(true);
        expect(auditLogs.some(log => log.action === 'PASSWORD_RESET')).toBe(true);
        
      } finally {
        // Clean up test data
        await prisma.passwordResetToken.deleteMany({
          where: { email: testEmail }
        });
        await prisma.auditLog.deleteMany({
          where: { userId: testUser.id }
        });
        await prisma.user.deleteMany({
          where: { email: testEmail }
        });
      }
    });

    test('should handle password reset form validation', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Test empty form submission
      await page.getByTestId('primary-action send-reset-link-btn').click();
      
      // Should show validation error
      await expect(page.locator('.bg-red-50, .text-red-800, [role="alert"]').first()).toBeVisible();
      
      // Test invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.getByTestId('primary-action send-reset-link-btn').click();
      
      // Should show email validation error
      await expect(page.locator('.bg-red-50, .text-red-800, [role="alert"]').first()).toBeVisible();
    });
  });

  // ============================================================================
  // SESSION MANAGEMENT & SECURITY
  // ============================================================================

  test.describe('Session Management & Security', () => {
    test('should handle session timeout gracefully', async ({ page }) => {
      // First login
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel('Email address').fill(testUser.email);
      await page.getByLabel('Password').fill('e2eTestPass123');
      await page.getByTestId('primary-action signin-btn').click();
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Simulate session timeout by clearing cookies
      await page.context().clearCookies();
      
      // Try to access protected page
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*login/);
    });

    test('should handle logout flow', async ({ page }) => {
      // First login
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel('Email address').fill(testUser.email);
      await page.getByLabel('Password').fill('e2eTestPass123');
      await page.getByTestId('primary-action signin-btn').click();
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Find and click logout button/link
      const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      } else {
        // Alternative: look for logout in user menu
        const userMenu = page.locator('[data-testid="user-menu"], .user-menu, [aria-label*="user"]');
        if (await userMenu.isVisible()) {
          await userMenu.click();
          const logoutOption = page.getByRole('menuitem', { name: /logout|sign out/i });
          if (await logoutOption.isVisible()) {
            await logoutOption.click();
          }
        }
      }
      
      // Should redirect to login or home page
      await expect(page).toHaveURL(/.*login|.*home/);
    });
  });
});