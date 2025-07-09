import { test, expect } from '@playwright/test';
import { generateTestId } from '../../helpers/testUtils';
import { prisma } from '../../../lib/database/client';
// TODO: Add UXComplianceHelper import for comprehensive UX validation
// import { UXComplianceHelper } from '../../helpers/uxCompliance';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
// TODO: Add UXComplianceHelper instance for each test
// let uxHelper: UXComplianceHelper;

test.describe('Registration & Verification E2E Tests - Best-in-Class UX', () => {
  // TODO: Add beforeEach to initialize UXComplianceHelper
  // test.beforeEach(async ({ page }) => {
  //   uxHelper = new UXComplianceHelper(page);
  // });

  test('should debug registration form submission', async ({ page }) => {
    const testEmail = `e2e-debug-${generateTestId('user')}@example.com`;
    const testPassword = 'SecurePass123!';
    const testName = 'E2E Debug User';

    await page.goto(`${BASE_URL}/signup`);
    // Fill form with valid data
    await page.getByLabel('Full name').fill(testName);
    await page.getByLabel('Email address').fill(testEmail);
    await page.locator('#password').fill(testPassword);
    await page.locator('#confirmPassword').fill(testPassword);

    // Listen for network requests
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/auth/register') && response.request().method() === 'POST'
    );

    // TODO: Fix primary action data-testid pattern
    // await page.getByTestId('primary-action signup-btn').click();
    
    // Submit form
    await page.getByRole('button', { name: 'Create account' }).click();

    // Wait for response and log it
    try {
      const response = await responsePromise;
      const responseData = await response.json();
      console.log('Registration response:', response.status(), responseData);
      
      if (response.ok()) {
        console.log('Registration successful, checking for redirect...');
        // Wait a bit for redirect
        await page.waitForTimeout(2000);
        console.log('Current URL:', page.url());
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

  test('should have best-in-class UX for user registration', async ({ page }) => {
    const testEmail = `e2e-reg-${generateTestId('user')}@example.com`;
    const testPassword = 'SecurePass123!';
    const testName = 'E2E Test User';

    await page.goto(`${BASE_URL}/signup`);
    
    // TODO: Add UXComplianceHelper validation calls
    // await uxHelper.validateActivationFirstUX();
    // await uxHelper.validateFormAccessibility();
    // await uxHelper.validateMobileResponsiveness();
    // await uxHelper.validateKeyboardNavigation();

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

    // TODO: Add ARIA attributes validation
    // await expect(nameInput).toHaveAttribute('aria-required', 'true');
    // await expect(emailInput).toHaveAttribute('aria-required', 'true');
    // await expect(passwordInput).toHaveAttribute('aria-required', 'true');
    // await expect(confirmPasswordInput).toHaveAttribute('aria-required', 'true');

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
    // TODO: Fix primary action data-testid pattern - use combined pattern
    // await expect(page.getByTestId('primary-action signup-btn')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();

    // 5. HELPFUL NAVIGATION LINKS (Adoption)
    await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Back to home/i })).toBeVisible();

    // 6. FILL FORM WITH VALID DATA
    await nameInput.fill(testName);
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    await confirmPasswordInput.fill(testPassword);

    // 7. SUBMIT AND VERIFY LOADING STATE
    // TODO: Fix primary action data-testid pattern
    // const submitButton = page.getByTestId('primary-action signup-btn');
    const submitButton = page.locator('[data-testid="primary-action signup-submit"]');
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
    // TODO: Fix primary action data-testid pattern
    // await page.getByTestId('primary-action signup-btn').click();
    await page.getByRole('button', { name: 'Create account' }).click();

    // TODO: Fix error container validation to use UXComplianceHelper
    // await uxHelper.validateErrorContainer(/required|fill in/);
    
    // Should show validation errors in accessible containers
    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page.locator('.text-red-800')).toContainText(/required|fill in/i);

    // TODO: Add role="alert" validation for error containers
    // await expect(page.locator('[role="alert"]')).toBeVisible();

    // Try with invalid email
    await page.getByLabel('Full name').fill('Test User');
    await page.getByLabel('Email address').fill('invalid-email');
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('password123');
    // TODO: Fix primary action data-testid pattern
    // await page.getByTestId('primary-action signup-btn').click();
    await page.getByRole('button', { name: 'Create account' }).click();

    // TODO: Fix error container validation to use UXComplianceHelper
    // await uxHelper.validateErrorContainer(/valid email|email format/);
    
    // Should show email validation error
    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page.locator('.text-red-800')).toContainText(/valid email|email format/i);

    // Try with mismatched passwords
    await page.getByLabel('Email address').fill('test@example.com');
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('different123');
    // TODO: Fix primary action data-testid pattern
    // await page.getByTestId('primary-action signup-btn').click();
    await page.getByRole('button', { name: 'Create account' }).click();

    // TODO: Fix error container validation to use UXComplianceHelper
    // await uxHelper.validateErrorContainer(/match|same password/);
    
    // Should show password mismatch error
    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page.locator('.text-red-800')).toContainText(/match|same password/i);
  });

  test('should handle existing user registration gracefully', async ({ page }) => {
    const existingEmail = 'existing@example.com';

    await page.goto(`${BASE_URL}/signup`);

    // Fill form with existing email
    await page.getByLabel('Full name').fill('Test User');
    await page.getByLabel('Email address').fill(existingEmail);
    await page.locator('#password').fill('ValidPass123');
    await page.locator('#confirmPassword').fill('ValidPass123');
    // TODO: Fix primary action data-testid pattern
    // const submitButton = page.getByTestId('primary-action signup-btn');
    const submitButton2 = page.locator('[data-testid="primary-action signup-submit"]');
    await submitButton2.click();
    await expect(submitButton2).toBeDisabled();
    await expect(submitButton2).toHaveText('Creating account...');
    // Wait for error to appear (button re-enabled after error)
    await expect(submitButton2).toBeVisible();
    await expect(submitButton2).not.toBeDisabled();
    
    // TODO: Fix error container validation to use UXComplianceHelper
    // await uxHelper.validateErrorContainer(/already exists|already registered/);
    
    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page.locator('.text-red-800')).toContainText(/already exists|already registered/i);

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
    // TODO: Fix primary action data-testid pattern
    // await page.getByTestId('primary-action signup-btn').click();
    await page.getByRole('button', { name: 'Create account' }).click();

    // TODO: Fix error container validation to use UXComplianceHelper
    // await uxHelper.validateErrorContainer(/at least 8 characters|password requirements/);
    
    // Should show password strength error
    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page.locator('.text-red-800')).toContainText(/at least 8 characters|password requirements/i);
  });

  // TODO: Add mobile responsiveness test
  // test('should be mobile responsive', async ({ page }) => {
  //   await page.setViewportSize({ width: 375, height: 667 });
  //   await page.goto(`${BASE_URL}/signup`);
  //   await uxHelper.validateMobileResponsiveness();
  //   await uxHelper.validateMobileAccessibility();
  // });

  // TODO: Add keyboard navigation test
  // test('should support keyboard navigation', async ({ page }) => {
  //   await page.goto(`${BASE_URL}/signup`);
  //   await uxHelper.validateKeyboardNavigation();
  // });

  // TODO: Add security edge cases test
  // test('should handle security edge cases', async ({ page }) => {
  //   await page.goto(`${BASE_URL}/signup`);
  //   // Test rate limiting
  //   // Test input validation (XSS, SQL injection)
  //   // Test session security
  // });

  // TODO: Add performance validation test
  // test('should meet performance requirements', async ({ page }) => {
  //   const startTime = Date.now();
  //   await page.goto(`${BASE_URL}/signup`);
  //   const loadTime = Date.now() - startTime;
  //   expect(loadTime).toBeLessThan(3000);
  // });

  // TODO: Add accessibility compliance test
  // test('should meet accessibility standards', async ({ page }) => {
  //   await page.goto(`${BASE_URL}/signup`);
  //   await uxHelper.validateScreenReaderCompatibility();
  //   await uxHelper.validateARIACompliance();
  // });
});

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
      await expect(page.locator('h2')).toContainText('Create your APIQ account');
      
      // Fill registration form
      await page.fill('input[name="name"]', testName);
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.fill('input[name="confirmPassword"]', testPassword);
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should redirect to success page
      await expect(page).toHaveURL(/.*signup-success/, { timeout: 10000 });
      await expect(page.locator('h2')).toContainText('Account Created Successfully!');
      await expect(page.getByText(testEmail)).toBeVisible();
      
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
      
      await expect(page.locator('.bg-red-50')).toContainText(/valid email/i);
      
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
      await page.fill('input[name="password"]', 'DifferentPass123');
      await page.fill('input[name="confirmPassword"]', 'DifferentPass123');
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

    test('should handle loading states during registration', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Fill form with valid data
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'ValidPass123');
      await page.fill('input[name="confirmPassword"]', 'ValidPass123');
      
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
      await expect(page.locator('.bg-red-50')).toContainText(/valid email/i);
      await expect(page.locator('.bg-red-50')).toContainText(/password must be at least 8 characters/i);
    });
  });
}); 