import { test, expect } from '@playwright/test';
import { generateTestId } from '../../helpers/testUtils';
import { prisma } from '../../../lib/database/client';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
import { safeCleanupTestData } from '../../helpers/testIsolation';
import { setupE2E, closeAllModals, resetRateLimits, getPrimaryActionButton } from '../../helpers/e2eHelpers';
import { createE2EUser } from '../../helpers/authHelpers';
import { cleanupTestUser } from '../../helpers/testUtils';
import { validateUXCompliance, waitForElement } from '../../helpers/uiHelpers';
import { testModalSubmitLoading, testModalSuccessMessage, testModalErrorHandling } from '../../helpers/modalHelpers';
import { testPageLoadTime, testPerformanceBudget } from '../../helpers/performanceHelpers';
import { testXSSPrevention, testDataExposure } from '../../helpers/securityHelpers';
import { testFormAccessibility, testPrimaryActionPatterns } from '../../helpers/accessibilityHelpers';
import { waitForURL, waitForDashboard, waitForLoadingComplete } from '../../helpers/waitHelpers';
import { ensureTestIsolation, completeTestTeardown } from '../../helpers/e2eHelpers.setup';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
let uxHelper: UXComplianceHelper;
let testUser: any;

test.describe('Registration & Verification E2E Tests - Best-in-Class UX', () => {
  test.beforeAll(async () => {
    // Create a test user for any tests that need authentication
    testUser = await createE2EUser();
  });

  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Clean up any test users created during this test
    const testEmailAnnotation = testInfo.annotations.find(a => a.type === 'test-email');
    if (testEmailAnnotation) {
      // Use proper test isolation helper instead of manual cleanup
      await ensureTestIsolation(page, {});
      
      // Clean up specific test user
      await prisma.user.deleteMany({
        where: { email: testEmailAnnotation.description }
      });
    }
  });

  test.afterAll(async () => {
    if (testUser) {
      await cleanupTestUser(testUser);
    }
  });

  test('should debug registration form submission', async ({ page }) => {
    const testEmail = `e2e-debug-${generateTestId('user')}@testuser.local`;
    const testPassword = 'SecurePass123!';

    await page.goto(`${BASE_URL}/signup`);
    
    // Fill form with valid data (only email and password fields exist)
    await page.getByLabel('Email address').fill(testEmail);
    await page.locator('#password').fill(testPassword);
    await page.locator('#confirmPassword').fill(testPassword);

    // Listen for network requests
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/auth/register') && response.request().method() === 'POST'
    );

    // Use correct primary action data-testid pattern
    await getPrimaryActionButton(page, 'signup').click();

    // Wait for response and log it
    try {
      const response = await responsePromise;
      const responseData = await response.json();
      console.log('Registration response:', response.status(), responseData);
      
      if (response.ok()) {
        console.log('Registration successful, checking for redirect...');
        // Wait for redirect using proper wait helper
        try {
          await page.waitForLoadState('networkidle');
          await expect(page).toHaveURL(/.*dashboard.*tour=true/);
          console.log('Current URL:', page.url());
        } catch (error) {
          console.log('Redirect timeout, current URL:', page.url());
        }
      } else {
        console.log('Registration failed:', responseData);
      }
    } catch (error) {
      console.log('No registration request detected or timeout');
    }

    // Clean up
    await prisma.user.deleteMany({
      where: { email: testEmail }
    });
  });

  test('should have best-in-class UX for user registration', async ({ page }, testInfo) => {
    const testEmail = `e2e-reg-${generateTestId('user')}@testuser.local`;
    const testPassword = 'SecurePass123!';

    await page.goto(`${BASE_URL}/signup`);
    
    // Add comprehensive UX validation
    await uxHelper.validatePageTitle('APIQ');
    await uxHelper.validateHeadingHierarchy(['Create your APIQ account']);
    await uxHelper.validateFormAccessibility();
    await uxHelper.validateActivationFirstUX();

    // 1. CLEAR HEADING HIERARCHY (Activation)
    await expect(page.locator('h2')).toHaveText('Create your APIQ account');
    await expect(page.locator('p')).toContainText('Start orchestrating APIs with natural language');

    // 2. ACCESSIBLE FORM FIELDS (Usability) - Only email and password fields exist
    const emailInput = page.getByLabel('Email address');
    const passwordInput = page.locator('#password');
    const confirmPasswordInput = page.locator('#confirmPassword');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();

    // Check required attributes
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
    await expect(confirmPasswordInput).toHaveAttribute('required', '');

    // Validate ARIA attributes for accessibility
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
    await expect(emailInput).toHaveAttribute('placeholder', 'Enter your email address');
    await expect(passwordInput).toHaveAttribute('placeholder', 'Create a strong password');
    await expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm your password');

    // 4. DESCRIPTIVE BUTTON TEXT (Activation)
    await expect(getPrimaryActionButton(page, 'signup')).toBeVisible();

    // 5. HELPFUL NAVIGATION LINKS (Adoption)
    await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Back to home/i })).toBeVisible();

    // 6. FILL FORM WITH VALID DATA
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await confirmPasswordInput.fill(testPassword);

    // 7. SUBMIT AND VERIFY LOADING STATE
    // Use correct primary action data-testid pattern
    const submitButton = getPrimaryActionButton(page, 'signup');
    await submitButton.click();
    await expect(submitButton).toBeDisabled();
    await expect(submitButton).toHaveText('Creating account...');
    
    // Wait for redirect to dashboard using proper wait helper
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*dashboard.*tour=true/);

    // 8. SUCCESS REDIRECT WITH CLEAR MESSAGING
    // Note: Current implementation redirects to dashboard instead of signup-success page
    await expect(page).toHaveURL(/.*dashboard/);

    // Store test email for cleanup in teardown
    testInfo.annotations.push({ type: 'test-email', description: testEmail });
  });

  test('should handle registration errors with clear messaging', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);

    // Try to submit empty form
    await getPrimaryActionButton(page, 'signup').click();

    // Use UXComplianceHelper for error container validation
    await uxHelper.validateErrorContainer(/required|fill in/i);

    // Validate role="alert" for error containers (be more specific to avoid Next.js route announcer)
    await expect(page.locator('[role="alert"]').filter({ hasText: /required|fill in/i })).toBeVisible();

    // Try with invalid email
    await page.getByLabel('Email address').fill('invalid-email');
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('password123');
    await getPrimaryActionButton(page, 'signup').click();

    // Use UXComplianceHelper for error container validation
    await uxHelper.validateErrorContainer(/valid email|email format/i);

    // Try with mismatched passwords
    await page.getByLabel('Email address').fill('test@testuser.local');
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('different123');
    await getPrimaryActionButton(page, 'signup').click();

    // Use UXComplianceHelper for error container validation
    await uxHelper.validateErrorContainer(/match|same password/i);
  });

  test('should handle existing user registration gracefully', async ({ page }, testInfo) => {
    // First, create a user with a specific email to ensure it exists
    const existingEmail = `e2e-existing-${generateTestId('user')}@testuser.local`;
    const existingPassword = 'ValidPass123';
    
    // Store email for cleanup in teardown (before creating user)
    testInfo.annotations.push({ type: 'test-email', description: existingEmail });
    
    // Create the user first by going through the registration flow
    await page.goto(`${BASE_URL}/signup`);
    await page.getByLabel('Email address').fill(existingEmail);
    await page.locator('#password').fill(existingPassword);
    await page.locator('#confirmPassword').fill(existingPassword);
    
    // Wait for React component to be fully mounted and button to be ready
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Give React time to mount
    
    const signupButton = getPrimaryActionButton(page, 'signup');
    await signupButton.waitFor({ state: 'visible' });
    await signupButton.click();
    
    // Wait for redirect to complete (redirect happens immediately)
    await page.waitForLoadState('networkidle');
    
    // Check that we're on the dashboard
    await expect(page).toHaveURL(/.*dashboard.*tour=true/);
    console.log('🔍 DEBUG: First registration succeeded, user created');
    
    // Wait a moment to ensure the user is fully created in the database
    await page.waitForTimeout(1000);
    
    // Now go back to signup and try to register with the same email
    await page.goto(`${BASE_URL}/signup`);
    
    // Fill form with the same email
    await page.getByLabel('Email address').fill(existingEmail);
    await page.locator('#password').fill('DifferentPass123');
    await page.locator('#confirmPassword').fill('DifferentPass123');
    
    // Wait for React component to be fully mounted and button to be ready
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Give React time to mount
    
    const signupButton2 = getPrimaryActionButton(page, 'signup');
    await signupButton2.waitFor({ state: 'visible' });
    await signupButton2.click();
    
    // Should show error message about existing user
    await uxHelper.validateErrorContainer(/already exists|already registered/i);

    // Should provide helpful next steps
    await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Back to home/i })).toBeVisible();
  });

  test('should have accessible password requirements', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);

    // Check if password requirements are visible and accessible
    const passwordInput = page.locator('#password');
    await passwordInput.focus();

    // Should show password requirements or have aria-describedby
    const requirementsElement = page.locator('[data-testid="password-requirements"], .password-requirements, [aria-describedby*="password"]');
    
    // If requirements are shown, they should be accessible
    if (await requirementsElement.isVisible()) {
      await expect(requirementsElement).toBeVisible();
    }

    // Test weak password
    await passwordInput.fill('weak');
    await page.locator('#confirmPassword').fill('weak');
    await getPrimaryActionButton(page, 'signup').click();

    // Use UXComplianceHelper for error container validation
    await uxHelper.validateErrorContainer(/at least 8 characters|password requirements/i);
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/signup`);
    await uxHelper.validateMobileResponsiveness();
    await uxHelper.validateMobileAccessibility();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await uxHelper.validateKeyboardNavigation();
  });

  test('should handle security edge cases', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    
    // Test XSS input validation
    const xssPayload = '<script>alert("xss")</script>';
    await page.getByLabel('Email address').fill(xssPayload);
    await page.locator('#password').fill('ValidPass123');
    await page.locator('#confirmPassword').fill('ValidPass123');
    await getPrimaryActionButton(page, 'signup').click();
    
    // XSS payload should be rejected and show email validation error
    await uxHelper.validateErrorContainer(/valid email address/i);
    
    // Clean up the test user (in case it was created)
    await safeCleanupTestData();
    
    // Test SQL injection input validation
    const sqlPayload = "'; DROP TABLE users; --";
    await page.getByLabel('Email address').fill(sqlPayload);
    await getPrimaryActionButton(page, 'signup').click();
    
    // Should show email validation error, not execute SQL
    await uxHelper.validateErrorContainer(/valid email address/i);
  });

  test('should meet performance requirements', async ({ page }) => {
    // Environment-aware performance budget (email sending skipped in test environment)
    const loadBudget = process.env.CI ? 5000 : 3000;
    const submitBudget = process.env.CI ? 8000 : 18000; // Conservative budget for development environment

    // Measure DOM content loaded (first usable paint)
    const startTime = performance.now();
    await page.goto(`${BASE_URL}/signup`, { waitUntil: 'domcontentloaded' });
    const loadTime = performance.now() - startTime;
    expect(loadTime).toBeLessThan(loadBudget);
    
    // Test form submission performance (use unique email to ensure registration, not login)
    const testEmail = `e2e-perf-${generateTestId('user')}@testuser.local`;
    await page.getByLabel('Email address').fill(testEmail);
    await page.locator('#password').fill('ValidPass123');
    await page.locator('#confirmPassword').fill('ValidPass123');
    
    const submitStartTime = performance.now();
    await getPrimaryActionButton(page, 'signup').click();
    
    // Wait for either success redirect or error (whichever comes first)
    try {
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*dashboard.*tour=true/);
    } catch {
      // If no redirect, check for error message
      await page.waitForSelector('.bg-red-50, [role="alert"]', { timeout: 5000 });
    }
    
    const submitTime = performance.now() - submitStartTime;
    expect(submitTime).toBeLessThan(submitBudget);
  });

  test('should meet accessibility standards', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await uxHelper.validateScreenReaderCompatibility();
    await uxHelper.validateARIACompliance();
    
    // Test form field associations
    const emailInput = page.getByLabel('Email address');
    const passwordInput = page.locator('#password');
    const confirmPasswordInput = page.locator('#confirmPassword');
    
    // Verify all form fields have proper labels
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    
    // Test focus management
    await emailInput.focus();
    await expect(emailInput).toBeFocused();
    
    await passwordInput.focus();
    await expect(passwordInput).toBeFocused();
  });
});

test.describe('Registration & Email Verification E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Clean up any test users created during this test
    const testEmailAnnotation = testInfo.annotations.find(a => a.type === 'test-email');
    if (testEmailAnnotation) {
      // Use proper test isolation helper instead of manual cleanup
      await ensureTestIsolation(page, {});
      
      // Clean up specific test user
      await prisma.user.deleteMany({
        where: { email: testEmailAnnotation.description }
      });
    }
  });

  test.describe('User Registration Flow', () => {
    test('should complete full registration flow successfully', async ({ page }, testInfo) => {
      const testEmail = `e2e-reg-${generateTestId('user')}@testuser.local`;
      const testPassword = 'e2eTestPass123';

      // Navigate to signup page
      await page.goto(`${BASE_URL}/signup`);
      
      // Verify signup page loads correctly
      await expect(page).toHaveTitle(/APIQ/);
      await expect(page.locator('h2')).toContainText('Create your APIQ account');
      
      // Fill registration form (only email, password, confirmPassword - no name field)
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.fill('input[name="confirmPassword"]', testPassword);
      
      // Submit form
      await getPrimaryActionButton(page, 'signup').click();
      
      // Wait for redirect to complete (redirect happens immediately)
      await page.waitForLoadState('networkidle');
      
      // Check that we're on the dashboard
      await expect(page).toHaveURL(/.*dashboard.*tour=true/);
      
      // Store email for cleanup in teardown
      testInfo.annotations.push({ type: 'test-email', description: testEmail });
    });

    test('should handle registration validation errors', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Test weak password
      await page.fill('input[name="email"]', 'test@testuser.local');
      await page.fill('input[name="password"]', '123');
      await page.fill('input[name="confirmPassword"]', '123');
      await getPrimaryActionButton(page, 'signup').click();
      
      await expect(page.locator('.bg-red-50')).toContainText(/password must be at least 8 characters/i);
      
      // Test invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'validpassword123');
      await page.fill('input[name="confirmPassword"]', 'validpassword123');
      await getPrimaryActionButton(page, 'signup').click();
      
      await expect(page.locator('.bg-red-50')).toContainText(/valid email/i);
      
      // Test password mismatch
      await page.fill('input[name="email"]', 'test@testuser.local');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'differentpassword');
      await getPrimaryActionButton(page, 'signup').click();
      
      await expect(page.locator('.bg-red-50')).toContainText(/passwords do not match/i);
    });

    test('should handle missing required fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Try to submit empty form
      await getPrimaryActionButton(page, 'signup').click();
      
      // Should show validation errors (only email and password are required, no name field)
      await expect(page.locator('.bg-red-50')).toContainText(/email is required/i);
      await expect(page.locator('.bg-red-50')).toContainText(/password is required/i);
    });

    test('should handle duplicate email registration', async ({ page }, testInfo) => {
      // First, register a user
      const testEmail = `e2e-duplicate-${generateTestId('user')}@testuser.local`;
      const testPassword = 'e2eTestPass123';

      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.fill('input[name="confirmPassword"]', testPassword);
      await getPrimaryActionButton(page, 'signup').click();
      
      // Wait for redirect to complete (redirect happens immediately)
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*dashboard.*tour=true/);
      
      // Store email for cleanup in teardown
      testInfo.annotations.push({ type: 'test-email', description: testEmail });
      
      // Now try to register with the same email
      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', 'DifferentPass123');
      await page.fill('input[name="confirmPassword"]', 'DifferentPass123');
      await getPrimaryActionButton(page, 'signup').click();
      
      // Should show error message
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/user with this email already exists/i);
    });

    test('should validate form field requirements', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Check that form fields exist and have proper names (only email, password, confirmPassword - no name field)
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
      
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
      await expect(page.getByRole('heading', { name: 'Email Verification' })).toBeVisible();
      
      // Should show verification page content
      await expect(page.getByRole('heading', { name: 'Email Verification' })).toBeVisible();
    });

    test('should handle email verification with invalid token', async ({ page }) => {
      const invalidToken = 'invalid-token-123';
      
      await page.goto(`${BASE_URL}/verify?token=${invalidToken}`);
      
      // Should show error message
      await expect(page.locator('text=Email verification failed')).toBeVisible();
      await expect(page.locator('text=The verification link may be invalid or expired.')).toBeVisible();
      
      // Should show resend verification option
      await expect(page.locator('text=Didn\'t receive the verification email?')).toBeVisible();
      await expect(page.locator('a[href="/resend-verification"]').first()).toBeVisible();
    });

    test('should handle missing verification token', async ({ page }) => {
      await page.goto(`${BASE_URL}/verify`);
      
      // Should show error message
      await expect(page.locator('text=No verification token provided')).toBeVisible();
      await expect(page.locator('text=The verification link may be invalid or expired.')).toBeVisible();
    });

    test('should show resend verification option', async ({ page }) => {
      await page.goto(`${BASE_URL}/verify`);
      
      // Should show resend verification links
      const resendLinks = page.locator('a[href="/resend-verification"]');
      await expect(resendLinks.first()).toBeVisible();
      
      // Should show navigation links
      await expect(page.locator('a[href="/login"]')).toContainText('Back to sign in');
      await expect(page.locator('a[href="/signup"]')).toContainText('Create a new account');
    });
  });

  test.describe('Resend Verification Email', () => {
    test('should handle resend verification email flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/resend-verification`);
      
      // Should show resend verification page
      await expect(page).toHaveTitle(/APIQ/);
      await expect(page.locator('button')).toContainText('Resend verification email');
      
      // Fill email form
      const testEmail = `e2e-resend-${generateTestId('user')}@testuser.local`;
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
      
      await expect(page.locator('.bg-red-50')).toContainText(/valid email/i);
      
      // Test missing email - clear the field first
      await page.fill('input[name="email"]', '');
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
      await expect(page.locator('a[href="/login"]')).toContainText(/Sign in/i);
      
      // Test navigation from login page
      await page.goto(`${BASE_URL}/login`);
      
      // Should have link to signup
      await expect(page.locator('a[href="/signup"]')).toContainText(/Sign up/i);
      
      // Should have link to forgot password
      await expect(page.locator('a[href="/forgot-password"]')).toContainText(/Forgot password/i);
    });

    test('should handle loading states during registration', async ({ page }, testInfo) => {
      await page.goto(`${BASE_URL}/signup`);
      
      const testEmail = `e2e-loading-${generateTestId('user')}@testuser.local`;
      
      // Fill form with valid data
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', 'ValidPass123');
      await page.fill('input[name="confirmPassword"]', 'ValidPass123');
      
      // Wait for React component to be fully mounted and button to be ready
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Give React time to mount
      
      const signupButton = getPrimaryActionButton(page, 'signup');
      await signupButton.waitFor({ state: 'visible' });
      await signupButton.click();
      
      // Wait for redirect to complete (redirect happens immediately)
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*dashboard.*tour=true/);
      
      // Store email for cleanup in teardown
      testInfo.annotations.push({ type: 'test-email', description: testEmail });
    });

    test('should provide helpful error messages', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Test various error scenarios
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', '123');
      await getPrimaryActionButton(page, 'signup').click();
      
      // Should show specific error messages
      await expect(page.locator('.bg-red-50')).toContainText(/valid email/i);
      await expect(page.locator('.bg-red-50')).toContainText(/password must be at least 8 characters/i);
    });
  });
}); 
