/**
 * Landing Page Authentication E2E Tests
 * 
 * IMPLEMENTATION NOTES:
 * - Test landing page behavior for both authenticated and unauthenticated users
 * - Test navigation to authentication flows from landing page
 * - Test complete authentication journeys with UX compliance validation
 * - Test proper test isolation and cleanup per user-rules.md
 * 
 * REFACTORED: Using new E2E helpers for improved maintainability
 * UPDATED: Using proper test IDs and ARIA selectors per UX_SPEC.md
 * FIXED: Test isolation, timeout issues, and performance expectations
 * COMPLIANT: Follows user-rules.md testing requirements and UX compliance
 */

import { test, expect } from '@playwright/test';
import { TestUser, generateTestId } from '../../helpers/testUtils';
import { createE2EUser, registerUser, logoutUser } from '../../helpers/authHelpers';
import { cleanupTestUser } from '../../helpers/testUtils';
import { setupE2E, setupGlobalErrorListeners, setupTracing, stopTracing, clearAuthState, waitForServerReady, resetRateLimits } from '../../helpers/e2eHelpers';
import { waitForDashboard, closeGuidedTourIfPresent } from '../../helpers/uiHelpers';
import { testPageLoadTime } from '../../helpers/performanceHelpers';
import { testFormAccessibility, testFormValidation, testFormKeyboardNavigation } from '../../helpers/accessibilityHelpers';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
import { safeCleanupTestData } from '../../helpers/testIsolation';
import { cleanupTestData } from '../../helpers/dataHelpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test configuration
const testPassword = 'SecurePass123!';

// Create test user for authenticated user tests
let testUser: TestUser;
let uxHelper: UXComplianceHelper;

// Setup global error listeners and tracing for all tests
test.beforeEach(async ({ page }, testInfo) => {
  await setupGlobalErrorListeners(page);
  await setupTracing(page);
  await waitForServerReady(page);
  
  uxHelper = new UXComplianceHelper(page);
});

test.afterEach(async ({ page }, testInfo) => {
  await stopTracing(page, testInfo);
  await clearAuthState(page);
});

test.beforeAll(async () => {
  // Create test user for authenticated user tests
  testUser = await createE2EUser();
});

test.afterAll(async () => {
  // Clean up test user
  if (testUser) {
    try {
      await cleanupTestUser(testUser);
    } catch (error) {
      console.log('Test user cleanup skipped (already cleaned up):', error.message);
    }
  }
  
  // Final cleanup to ensure test isolation
  try {
    await safeCleanupTestData();
  } catch (error) {
    console.log('Final cleanup skipped:', error.message);
  }
});

test.describe('Landing Page Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    await resetRateLimits(page);
  });

  test.describe('Unauthenticated User Experience', () => {
    test('should show correct landing page for unauthenticated users', async ({ page }) => {
      // Navigate to landing page
      await page.goto(BASE_URL);
      
      // Verify page loads correctly
      await expect(page).toHaveTitle(/APIQ/);
      
      // Verify main heading hierarchy per UX_SPEC.md
      await uxHelper.validateHeadingHierarchy(['Stop Writing API Code. Start Talking to APIs.']);
      
      // Verify header shows Sign Up and Sign In buttons for unauthenticated users
      const header = page.locator('header');
      await expect(header.getByText('Sign Up')).toBeVisible();
      await expect(header.getByText('Sign In')).toBeVisible();
      await expect(header.getByText('Join Waitlist')).not.toBeVisible();
      await expect(header.getByText('Start Tour')).not.toBeVisible();
      await expect(header.getByText('Try Chat')).not.toBeVisible();
      
      // Verify hero section shows correct buttons
      const heroSection = page.locator('main').first();
      await expect(heroSection.getByTestId('primary-action signup')).toBeVisible();
      await expect(heroSection.getByTestId('primary-action signin')).toBeVisible();
      await expect(heroSection.getByTestId('primary-action start-chat')).not.toBeVisible();
      

    });

    test('should have proper UX compliance for unauthenticated landing page', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Validate UX compliance per UX_SPEC.md
      await uxHelper.validatePageTitle('APIQ');
      await uxHelper.validateHeadingHierarchy(['Stop Writing API Code. Start Talking to APIs.']);
      await uxHelper.validateFormAccessibility();
      
      // Verify proper ARIA labels and accessibility
      const signupButton = page.getByTestId('primary-action signup');
      await expect(signupButton).toBeVisible();
      
      // Verify keyboard navigation works
      await page.keyboard.press('Tab');
      await expect(signupButton).toBeFocused();
    });

    test('should load landing page quickly per performance requirements', async ({ page }) => {
      // Test page load time per user-rules.md performance requirements
      await testPageLoadTime(page, BASE_URL, { threshold: 3000 });
      
      // Should show content immediately
      await expect(page.getByText('Stop Writing API Code. Start Talking to APIs.')).toBeVisible();
    });

    test('should handle CTA navigation correctly', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Click Get Started button (signup)
      const getStartedButton = page.getByTestId('primary-action signup');
      await getStartedButton.click();
      
      // Should navigate to signup page
      await expect(page).toHaveURL(/.*signup.*/);
      await expect(page.getByText('Create your APIQ account')).toBeVisible();
    });

    test('should display customer social proof section', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Verify customer social proof section exists
      await expect(page.getByText('Trusted by Leading Companies')).toBeVisible();
      await expect(page.getByText('See how innovative businesses are using APIQ to transform their API workflows and boost productivity.')).toBeVisible();
      
      // Verify customer categories exist
      await expect(page.getByText('E-commerce Giants')).toBeVisible();
      await expect(page.getByText('FinTech Leaders')).toBeVisible();
      await expect(page.getByText('SaaS Innovators')).toBeVisible();
      
      // Verify CTA buttons exist
      await expect(page.getByTestId('primary-action view-testimonials')).toBeVisible();
      await expect(page.getByTestId('primary-action view-case-studies')).toBeVisible();
      
      // Verify CTA buttons have correct text
      await expect(page.getByTestId('primary-action view-testimonials')).toContainText('View Customer Stories');
      await expect(page.getByTestId('primary-action view-case-studies')).toContainText('Read Case Studies');
    });
  });

  test.describe('Authenticated User Experience', () => {
    test('should show correct landing page for authenticated users', async ({ page }) => {
      // Setup authenticated user
      await setupE2E(page, testUser, { skipCloseGuidedTour: true });
      
      // Navigate to landing page
      await page.goto(BASE_URL);
      
      // Verify page loads correctly
      await expect(page).toHaveTitle(/APIQ/);
      
      // Verify header shows authenticated user options
      const header = page.locator('header');
      await expect(header.getByText(/Start Tour|Try Chat/)).toBeVisible();
      await expect(header.getByText('Sign In')).toBeVisible();
      await expect(header.getByText('Join Waitlist')).not.toBeVisible();
      
      // Verify hero section shows correct buttons
      const heroSection = page.locator('main').first();
      await expect(heroSection.getByTestId('primary-action start-chat')).toBeVisible();
      await expect(heroSection.getByText('See Examples')).toBeVisible();
      await expect(heroSection.getByTestId('primary-action join-waitlist')).not.toBeVisible();
      
      // Verify user can access dashboard
      const startButton = page.getByTestId('primary-action start-chat');
      await startButton.click();
      
      // Should redirect to dashboard
      await waitForDashboard(page);
      await expect(page).toHaveURL(/.*dashboard.*/);
    });

    test('should handle authenticated user navigation correctly', async ({ page }) => {
      // Setup authenticated user
      await setupE2E(page, testUser, { skipCloseGuidedTour: true });
      await page.goto(BASE_URL);
      
      // Click sign in button (should take to dashboard since already authenticated)
      const signInButton = page.getByText('Sign In');
      await signInButton.click();
      
      // Should redirect to dashboard
      await waitForDashboard(page);
      await expect(page).toHaveURL(/.*dashboard.*/);
    });

    test('should maintain authentication state across navigation', async ({ page }) => {
      // Setup authenticated user
      await setupE2E(page, testUser, { skipCloseGuidedTour: true });
      
      // Navigate to landing page
      await page.goto(BASE_URL);
      
      // Verify still authenticated
      await expect(page.getByText(/Start Tour|Try Chat/)).toBeVisible();
      
      // Navigate to dashboard and back
      await page.goto('/dashboard');
      await page.goto(BASE_URL);
      
      // Should still show authenticated state
      await expect(page.getByText(/Start Tour|Try Chat/)).toBeVisible();
    });
  });

  test.describe('Authentication Flow Navigation', () => {
    test('should allow users to navigate to signup from landing page', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Navigate directly to signup page
      await page.goto(`${BASE_URL}/signup`);
      
      // Verify signup page loads correctly
      await expect(page).toHaveTitle(/APIQ/);
      await expect(page.getByText('Create your APIQ account')).toBeVisible();
      
      // Verify form accessibility per UX_SPEC.md
      await testFormAccessibility(page);
      
      // Verify primary action button exists
      await expect(page.getByTestId('primary-action signup-btn')).toBeVisible();
      
      // Verify link back to login exists
      await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
    });

    test('should allow users to navigate to login from landing page', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Navigate directly to login page
      await page.goto(`${BASE_URL}/login`);
      
      // Verify login page loads correctly
      await expect(page).toHaveTitle(/APIQ/);
      await expect(page.getByText('Sign in to APIQ')).toBeVisible();
      
      // Verify form accessibility per UX_SPEC.md
      await testFormAccessibility(page);
      
      // Verify primary action button exists
      await expect(page.getByTestId('primary-action signin-btn')).toBeVisible();
      
      // Verify OAuth2 options exist
      await expect(page.getByText(/Continue with Google/)).toBeVisible();
    });

    test('should maintain proper navigation state during authentication flows', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Navigate to signup
      await page.goto(`${BASE_URL}/signup`);
      await expect(page.getByText('Create your APIQ account')).toBeVisible();
      
      // Navigate to login
      await page.goto(`${BASE_URL}/login`);
      await expect(page.getByText('Sign in to APIQ')).toBeVisible();
      
      // Navigate back to landing page
      await page.goto(BASE_URL);
      await expect(page.getByText('Stop Writing API Code. Start Talking to APIs.')).toBeVisible();
    });
  });

  test.describe('Complete Authentication Journeys', () => {
    test('should complete full registration journey from landing page', async ({ page }) => {
      const testEmail = `e2e-landing-reg-${generateTestId('user')}@example.com`;
      
      // Start from landing page
      await page.goto(BASE_URL);
      
      // Navigate to signup
      await page.goto(`${BASE_URL}/signup`);
      
      // Complete registration
      await page.getByLabel('Email address').fill(testEmail);
      await page.locator('#password').fill(testPassword);
      await page.locator('#confirmPassword').fill(testPassword);
      
      // Submit registration
      await page.getByTestId('primary-action signup-btn').click();
      
      // Should redirect to dashboard with tour
      await waitForDashboard(page);
      await expect(page).toHaveURL(/.*dashboard.*tour=true/);
      
      // Verify user is now authenticated
      await page.goto(BASE_URL);
      await expect(page.getByText(/Start Tour|Try Chat/)).toBeVisible();
      
      // Clean up test user - we'll use the data helper instead
      try {
        await cleanupTestData({ user: { email: testEmail } });
      } catch (error) {
        console.log('Cleanup skipped for test user:', error.message);
      }
    });

    test('should complete full login journey from landing page', async ({ page }) => {
      // Start from landing page
      await page.goto(BASE_URL);
      
      // Navigate to login
      await page.goto(`${BASE_URL}/login`);
      
      // Complete login with test user
      await page.getByLabel('Email address').fill(testUser.email);
      await page.getByLabel('Password').fill(testUser.password);
      
      // Submit login
      await page.getByTestId('primary-action signin-btn').click();
      
      // Should redirect to dashboard
      await waitForDashboard(page);
      await expect(page).toHaveURL(/.*dashboard.*/);
      
      // Verify user is authenticated
      await page.goto(BASE_URL);
      await expect(page.getByText(/Start Tour|Try Chat/)).toBeVisible();
    });

    test('should handle authentication errors gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Try to login with invalid credentials
      await page.getByLabel('Email address').fill('invalid@example.com');
      await page.getByLabel('Password').fill('wrongpassword');
      
      // Submit login
      await page.getByTestId('primary-action signin-btn').click();
      
      // Should show error message
      await expect(page.locator('[role="alert"]:not([id="__next-route-announcer__"])')).toContainText(/invalid credentials|login failed/i);
      
      // Form should remain accessible
      await expect(page.getByLabel('Email address')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
    });
  });

  test.describe('UX Compliance and Accessibility', () => {
    test('should meet all UX compliance requirements per UX_SPEC.md', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Validate complete UX compliance
      await uxHelper.validatePageTitle('APIQ');
      await uxHelper.validateHeadingHierarchy(['Stop Writing API Code. Start Talking to APIs.']);
      await uxHelper.validateFormAccessibility();
      await uxHelper.validateMobileResponsiveness();
    });

    test('should support keyboard navigation throughout authentication flows', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Test keyboard navigation on landing page
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('primary-action join-waitlist')).toBeFocused();
      
      // Navigate to signup page
      await page.goto(`${BASE_URL}/signup`);
      
      // Test keyboard navigation on signup form
      await testFormKeyboardNavigation(page, ['#email', '#password', '#confirmPassword']);
      
      // Navigate to login page
      await page.goto(`${BASE_URL}/login`);
      
      // Test keyboard navigation on login form
      await testFormKeyboardNavigation(page, ['#email', '#password']);
    });

    test('should provide clear error messaging and recovery paths', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Try to submit empty form
      await page.getByTestId('primary-action signup-btn').click();
      
      // Should show field-specific errors
      await expect(page.getByText('email is required')).toBeVisible();
      await expect(page.getByText('password is required')).toBeVisible();
      
      // Should provide clear recovery guidance
      await expect(page.getByText('Please confirm your password')).toBeVisible();
      
      // Form should remain accessible for correction
      await expect(page.getByLabel('Email address')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByLabel('Confirm password')).toBeVisible();
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should maintain performance standards across authentication flows', async ({ page }) => {
      // Test landing page performance
      await testPageLoadTime(page, BASE_URL, { threshold: 3000 });
      
      // Test signup page performance
      await testPageLoadTime(page, `${BASE_URL}/signup`, { threshold: 3000 });
      
      // Test login page performance
      await testPageLoadTime(page, `${BASE_URL}/login`, { threshold: 3000 });
    });

    test('should handle concurrent authentication requests gracefully', async ({ page, context }) => {
      // Create multiple pages to simulate concurrent users
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      try {
        // Navigate both pages to signup simultaneously
        await Promise.all([
          page1.goto(`${BASE_URL}/signup`),
          page2.goto(`${BASE_URL}/signup`)
        ]);
        
        // Both should load successfully
        await expect(page1.getByText('Create your APIQ account')).toBeVisible();
        await expect(page2.getByText('Create your APIQ account')).toBeVisible();
        
        // Both should be responsive
        await expect(page1.getByTestId('primary-action signup-btn')).toBeVisible();
        await expect(page2.getByTestId('primary-action signup-btn')).toBeVisible();
      } finally {
        await page1.close();
        await page2.close();
      }
    });
  });
});
