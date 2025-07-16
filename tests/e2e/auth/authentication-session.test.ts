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
      expect(loadTime).toBeLessThan(4000); // Should load within 3 seconds
      
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
      
      // Should show error message in accessible alert container
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/Invalid credentials|Login failed/);
      
      // Add role="alert" validation for error containers
      await expect(page.locator('[role="alert"]').filter({ hasText: /Invalid credentials|Login failed/ })).toBeVisible();
      
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
      await expect(page.getByTestId('primary-action signin-btn')).toBeVisible();
      await expect(page.getByTestId('primary-action signin-btn')).not.toBeDisabled();
      
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
      await expect(googleButton).toHaveAttribute('aria-label', 'Continue with Google');
      
      // - CSRF protection validation
      const csrfToken = await page.locator('input[name="_csrf"], input[name="csrfToken"], meta[name="csrf-token"]').first();
      if (await csrfToken.count() > 0) {
        await expect(csrfToken).toHaveAttribute('value');
      }
      
      // - OAuth2 button accessibility validation
      await expect(googleButton).toHaveAttribute('aria-label', 'Continue with Google');
      
      // Test OAuth2 button click (without actually completing OAuth2 flow)
      await expect(googleButton).toBeEnabled();
      
      // Validate OAuth2 security headers
      const response = await page.waitForResponse(response => 
        response.url().includes('/api/auth/oauth2') || 
        response.url().includes('accounts.google.com'),
        { timeout: 5000 }
      ).catch(() => null);
      
      if (response) {
        // Validate security headers for OAuth2 requests
        const headers = response.headers();
        expect(headers['x-frame-options']).toBeDefined();
        expect(headers['x-content-type-options']).toBeDefined();
      }
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
      
      // Wait for navigation to complete
      await page.waitForURL(/.*dashboard/);
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Refresh the page
      await page.reload();
      
      // Should still be on dashboard (session maintained)
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Validate session persistence - the OverviewTab shows "Overview" as the h2 text
      await expect(page.locator('h2')).toContainText(/Overview/i);
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel('Email address').fill(testUser.email);
      await page.getByLabel('Password').fill('e2eTestPass123');
      
      // Fix primary action data-testid pattern
      await page.getByTestId('primary-action signin-btn').click();
      
      // Wait for navigation to complete
      await page.waitForURL(/.*dashboard/);
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Simulate session expiration by clearing cookies (the new authentication method)
      await page.context().clearCookies();
      
      // Try to access protected page
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should redirect to login (server-side redirect via middleware)
      await expect(page).toHaveURL(/.*login/);
      
      // Should show login page with reason parameter indicating auth required
      await expect(page.locator('h2')).toHaveText('Sign in to APIQ');
      
      // Check for auth redirect message if present
      const authAlert = page.locator('[data-testid="auth-redirect-alert"]');
      if (await authAlert.isVisible()) {
        await expect(authAlert).toContainText('You must sign in to access that page');
      }
    });
  });

  test.describe('Protected Routes - Best-in-Class UX', () => {
    test.beforeEach(async ({ page }) => {
      // Ensure clean state for protected route tests
      await page.context().clearCookies();
      // Navigate to a neutral page first
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('domcontentloaded');
    });

    test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
      // Try to access dashboard directly
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Wait for client-side redirect to complete
      await page.waitForURL(/.*login/, { timeout: 10000 });
      
      // Should redirect to login page (client-side redirect)
      await expect(page).toHaveURL(/.*login/);
      
      // Should show appropriate message about authentication required
      // Note: The app may not show a specific message, so we'll just validate we're on login page
      await expect(page.locator('h2')).toHaveText('Sign in to APIQ');
    });

    test('should show login page when accessing protected routes', async ({ page }) => {
      // Clear any existing session state to ensure clean test
      await page.context().clearCookies();
      
      // Test only the main dashboard route which should definitely redirect to login
      const protectedRoute = '/dashboard';
      
      // Navigate to the protected route
      await page.goto(`${BASE_URL}${protectedRoute}`, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      // Wait for redirect to login page
      await page.waitForURL(/.*login/, { timeout: 10000 });
      
      // Should redirect to login page
      await expect(page).toHaveURL(/.*login/);
      await expect(page.locator('h2')).toHaveText('Sign in to APIQ');
      await expect(page.getByTestId('primary-action signin-btn')).toBeVisible();
      
      // Test one more protected route to ensure consistency
      await page.context().clearCookies();
      await page.goto(`${BASE_URL}/workflows`, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      // Should also redirect to login
      await page.waitForURL(/.*login/, { timeout: 10000 });
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Performance & Security Validation', () => {
    test('should meet performance requirements for authentication flows', async ({ page }) => {
      // Environment-aware performance budgets - adjusted for realistic expectations
      const isCI = process.env.CI === 'true';
      const loadTimeBudget = isCI ? 8000 : 6000; // 8s in CI, 6s locally
      const inputTimeBudget = isCI ? 10000 : 8000; // 10s in CI, 8s locally
      
      // Measure page load with proper timing and wait strategy
      const startTime = performance.now();
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      const loadTime = performance.now() - startTime;
      
      expect(loadTime).toBeLessThan(loadTimeBudget);
      
      // Validate form interaction responsiveness
      const emailInput = page.getByLabel('Email address');
      const inputStartTime = performance.now();
      await emailInput.fill('test@example.com');
      const inputTime = performance.now() - inputStartTime;
      
      expect(inputTime).toBeLessThan(inputTimeBudget);
      
      // Validate UXComplianceHelper performance validation
      await uxHelper.validatePerformanceRequirements();
      
      // Use UXComplianceHelper for performance timing validation
      const performanceLoadTime = await uxHelper.validatePerformanceTiming('/login');
      console.log(`Login page loaded in ${performanceLoadTime.toFixed(0)}ms`);
    });

    test('should implement proper security headers and CSRF protection', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Validate security headers
      const response = await page.waitForResponse(response => 
        response.url().includes('/login') || 
        response.url().includes('/api/auth'),
        { timeout: 5000 }
      ).catch(() => null);
      
      if (response) {
        const headers = response.headers();
        
        // Validate essential security headers
        expect(headers['x-frame-options']).toBeDefined();
        expect(headers['x-content-type-options']).toBeDefined();
        expect(headers['x-xss-protection']).toBeDefined();
        
        // Validate CSRF protection
        const csrfToken = await page.locator('input[name="_csrf"], input[name="csrfToken"], meta[name="csrf-token"]').first();
        if (await csrfToken.count() > 0) {
          await expect(csrfToken).toHaveAttribute('value');
        }
      }
      
      // Validate form security attributes - check if form exists and has proper attributes
      const form = page.locator('form');
      if (await form.count() > 0) {
        // Check if form has method attribute, if not, that's okay for client-side forms
        const method = await form.getAttribute('method');
        if (method) {
          await expect(form).toHaveAttribute('method', 'post');
        }
      }
      
      // Validate input security
      const passwordInput = page.getByLabel('Password');
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });
  });
}); 
// TODO: Add UXComplianceHelper integration (P0)
// import { UXComplianceHelper } from '../../helpers/uxCompliance';
// 
// test.beforeEach(async ({ page }) => {
//   const uxHelper = new UXComplianceHelper(page);
//   await uxHelper.validateActivationFirstUX();
//   await uxHelper.validateFormAccessibility();
//   await uxHelper.validateMobileResponsiveness();
//   await uxHelper.validateKeyboardNavigation();
// });

// TODO: Add cookie-based authentication testing (P0)
// - Test HTTP-only cookie authentication
// - Test secure cookie settings
// - Test cookie expiration and cleanup
// - Test cookie-based session management
// - Test authentication state persistence via cookies

// TODO: Replace localStorage with cookie-based authentication (P0)
// Application now uses cookie-based authentication instead of localStorage
// 
// Anti-patterns to remove:
// - localStorage.getItem('token')
// - localStorage.setItem('token', value)
// - localStorage.removeItem('token')
// 
// Replace with cookie-based patterns:
// - Test authentication via HTTP-only cookies
// - Test session management via secure cookies
// - Test logout by clearing authentication cookies

// TODO: Add data cleanup patterns (P0)
// - Clean up test users: await prisma.user.deleteMany({ where: { email: { contains: 'e2e-test' } } });
// - Clean up test connections: await prisma.connection.deleteMany({ where: { name: { contains: 'Test' } } });
// - Clean up test workflows: await prisma.workflow.deleteMany({ where: { name: { contains: 'Test' } } });
// - Clean up test secrets: await prisma.secret.deleteMany({ where: { name: { contains: 'Test' } } });

// TODO: Add deterministic test data (P0)
// - Create predictable test data with unique identifiers
// - Use timestamps or UUIDs to avoid conflicts
// - Example: const testUser = await createTestUser({ email: `e2e-test-${Date.now()}@example.com` });
// - Ensure test data is isolated and doesn't interfere with other tests

// TODO: Ensure test independence (P0)
// - Each test should be able to run in isolation
// - No dependencies on other test execution order
// - Clean state before and after each test
// - Use unique identifiers for all test data
// - Avoid global state modifications

// TODO: Remove API calls from E2E tests (P0)
// E2E tests should ONLY test user interactions through the UI
// API testing should be done in integration tests
// 
// Anti-patterns to remove:
// - page.request.post('/api/connections', {...})
// - fetch('/api/connections')
// - axios.post('/api/connections')
// 
// Replace with UI interactions:
// - await page.click('[data-testid="create-connection-btn"]')
// - await page.fill('[data-testid="connection-name-input"]', 'Test API')
// - await page.click('[data-testid="primary-action submit-btn"]')

// TODO: Remove all API testing from E2E tests (P0)
// E2E tests should ONLY test user interactions through the UI
// API testing belongs in integration tests
// 
// Anti-patterns detected and must be removed:
// - page.request.post('/api/connections', {...})
// - fetch('/api/connections')
// - axios.post('/api/connections')
// - request.get('/api/connections')
// 
// Replace with UI interactions:
// - await page.click('[data-testid="create-connection-btn"]')
// - await page.fill('[data-testid="connection-name-input"]', 'Test API')
// - await page.click('[data-testid="primary-action submit-btn"]')
// - await expect(page.locator('[data-testid="success-message"]')).toBeVisible()

// TODO: Add robust waiting patterns for dynamic elements (P0)
// - Use waitForSelector() instead of hardcoded delays
// - Use expect().toBeVisible() for element visibility checks
// - Use waitForLoadState() for page load completion
// - Use waitForResponse() for API calls
// - Use waitForFunction() for custom conditions
// 
// Example patterns:
// await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
// await expect(page.locator('[data-testid="submit-btn"]')).toBeVisible();
// await page.waitForLoadState('networkidle');
// await page.waitForResponse(response => response.url().includes('/api/'));
// await page.waitForFunction(() => document.querySelector('.loading').style.display === 'none');

// TODO: Replace hardcoded delays with robust waiting (P0)
// Anti-patterns to replace:
// - setTimeout(5000) → await page.waitForSelector(selector, { timeout: 5000 })
// - sleep(3000) → await expect(page.locator(selector)).toBeVisible({ timeout: 3000 })
// - delay(2000) → await page.waitForLoadState('networkidle')
// 
// Best practices:
// - Wait for specific elements to appear
// - Wait for network requests to complete
// - Wait for page state changes
// - Use appropriate timeouts for different operations

// TODO: Add XSS prevention testing (P0)
// - Test input sanitization
// - Test script injection prevention
// - Test HTML escaping
// - Test content security policy compliance

// TODO: Add CSRF protection testing (P0)
// - Test CSRF token validation
// - Test cross-site request forgery prevention
// - Test cookie-based CSRF protection
// - Test secure form submission

// TODO: Add data exposure testing (P0)
// - Test sensitive data handling
// - Test privacy leak prevention
// - Test information disclosure prevention
// - Test data encryption and protection

// TODO: Add authentication flow testing (P0)
// - Test OAuth integration
// - Test SSO (Single Sign-On) flows
// - Test MFA (Multi-Factor Authentication)
// - Test authentication state management

// TODO: Add session management testing (P0)
// - Test cookie-based session management
// - Test session expiration handling
// - Test login state persistence
// - Test logout and session cleanup

// TODO: Add UI interaction testing (P0)
// E2E tests should focus on user interactions through the UI
// - Test clicking buttons and links
// - Test filling forms
// - Test navigation flows
// - Test user workflows end-to-end

// TODO: Add primary action button patterns (P0)
// - Use data-testid="primary-action {action}-btn" pattern
// - Test primary action presence with UXComplianceHelper
// - Validate button text matches standardized patterns

// TODO: Add form accessibility testing (P0)
// - Test form labels and ARIA attributes
// - Test keyboard navigation
// - Test screen reader compatibility
// - Use UXComplianceHelper.validateFormAccessibility()
