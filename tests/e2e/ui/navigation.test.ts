/**
 * TODO: UX SIMPLIFICATION - NAVIGATION E2E TESTS - @connorbowen 2024-12-19
 * 
 * PHASE 1: QUICK WINS TESTING
 * 
 * 1.1 Hide non-essential tabs for regular users
 * - [ ] test('should hide admin/audit tabs for regular users')
 * - [ ] test('should show admin/audit tabs for admin users')
 * - [ ] test('should maintain tab functionality for visible tabs')
 * 
 * 1.2 Make Chat the default tab
 * - [ ] test('should load dashboard with chat tab active by default')
 * - [ ] test('should maintain tab state in URL parameters')
 * - [ ] test('should handle direct URL access to chat tab')
 * 
 * 1.3 Simplify the header - remove breadcrumbs
 * - [ ] test('should display simplified header without breadcrumbs')
 * - [ ] test('should maintain logout functionality')
 * - [ ] test('should display user welcome message')
 * 
 * 1.4 Consolidate error/success messages
 * - [ ] test('should display unified message banner for success')
 * - [ ] test('should display unified message banner for errors')
 * - [ ] test('should auto-clear messages after timeout')
 * 
 * PHASE 2: CORE SIMPLIFICATION TESTING
 * 
 * 2.1 Redesign dashboard layout with 3-tab structure
 * - [ ] test('should display only 3 tabs: Chat, Workflows, Settings')
 * - [ ] test('should move connections to settings tab')
 * - [ ] test('should move secrets to settings tab')
 * - [ ] test('should maintain tab functionality in new structure')
 * 
 * 2.2 Progressive disclosure
 * - [ ] test('should show limited features for new users')
 * - [ ] test('should progressively reveal features based on usage')
 * - [ ] test('should maintain functionality for advanced users')
 * 
 * 2.3 Streamline onboarding flow
 * - [ ] test('should redirect to chat after login')
 * - [ ] test('should handle simplified registration flow')
 * - [ ] test('should work without email verification')
 * 
 * 2.4 Guided tour
 * - [ ] test('should start guided tour for new users')
 * - [ ] test('should allow skipping guided tour')
 * - [ ] test('should complete tour successfully')
 * 
 * PHASE 3: POLISH TESTING
 * 
 * 3.1 Mobile-optimized navigation
 * - [ ] test('should display bottom navigation on mobile')
 * - [ ] test('should handle mobile tab switching')
 * - [ ] test('should maintain functionality on small screens')
 * 
 * 3.2 Performance optimizations
 * - [ ] test('should load dashboard within performance budget')
 * - [ ] test('should handle rapid tab switching smoothly')
 * - [ ] test('should maintain performance with many workflows')
 */

import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser;
let jwt;

test.describe('Navigation E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT for authenticated tests
    testUser = await createTestUser(
      `e2e-nav-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Navigation Test User'
    );
    jwt = testUser.accessToken;
  });

  test.afterAll(async () => {
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.describe('Unauthenticated Navigation', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to the home page before each test
      await page.goto(BASE_URL);
    });

    test('should load the home page successfully', async ({ page }) => {
      // Check that the page loads with the correct title
      await expect(page).toHaveTitle(/APIQ/);
      
      // Check for the main heading
      await expect(page.locator('h1')).toContainText('APIQ');
      // Updated to match current homepage content
      await expect(page.locator('h2')).toContainText('Just Ask, We\'ll Connect');
      
      // Check for the main call-to-action buttons (updated selectors)
      const dashboardLinks = page.locator('a[href="/dashboard"]');
      await expect(dashboardLinks.first()).toBeVisible();
      await expect(dashboardLinks.nth(1)).toBeVisible();
      
      // Check for examples link
      await expect(page.locator('a[href="#examples"]')).toContainText('See Examples');
    });

    test('should have proper meta tags', async ({ page }) => {
      // Check meta tags
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'AI-powered workflow automation across multiple APIs');
      await expect(page.locator('meta[name="keywords"]')).toHaveAttribute('content', 'API,orchestrator,workflow,automation,AI,OpenAI');
    });

    test('should have responsive design', async ({ page }) => {
      // Test desktop view
      await page.setViewportSize({ width: 1200, height: 800 });
      await expect(page.locator('h2')).toBeVisible();
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('h2')).toBeVisible();
    });

    test('should have working call-to-action buttons', async ({ page }) => {
      // Test "See Examples" button scrolls to examples section
      await page.click('a[href="#examples"]');
      await expect(page.locator('#examples')).toBeVisible();
      
      // Test dashboard navigation - should redirect to login for unauthenticated users
      await page.locator('a[href="/dashboard"]').first().click();
      await expect(page).toHaveURL(/.*login/);
    });

    test('should navigate to login page', async ({ page }) => {
      // Navigate to home page first
      await page.goto(BASE_URL);
      
      // Click on the "Sign In" button in the header
      await page.click('a[href="/login"]');
      
      // Should be on login page
      await expect(page).toHaveURL(/.*login/);
      
      // Should show login form
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Sign in');
    });

    test('should handle 404 errors gracefully', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/nonexistent-page`);
      expect(response?.status()).toBe(404);
      
      // Should show Next.js's default 404 page
      await expect(page.locator('h1.next-error-h1')).toContainText('404');
      await expect(page.locator('h2')).toContainText('This page could not be found.');
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Step 1: Load the page while online
      await page.goto(BASE_URL);
      
      // Step 2: Set the browser context to offline
      await page.context().setOffline(true);
      
      // Step 3: Try to make an API request that will fail due to network error
      const fetchResult = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/health');
          return { success: true, status: response.status };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      // Step 4: Assert that the fetch call failed due to network error
      expect(fetchResult.success).toBe(false);
      expect(fetchResult.error).toBeTruthy();
      
      // Step 5: Restore online mode
      await page.context().setOffline(false);
    });
  });

  test.describe('API Health Check', () => {
    test('should have working health check endpoint', async ({ page }) => {
      // Test the health check API endpoint
      const response = await page.request.get('/api/health');
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('checks');
      expect(data).toHaveProperty('responseTime');
    });

    test('should handle health check with database check', async ({ page }) => {
      const response = await page.request.get('/api/health?check=database');
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('checks');
      expect(data.checks).toHaveProperty('database');
      expect(data.checks.database).toHaveProperty('status');
      expect(data.checks.database).toHaveProperty('details');
      expect(data.checks.database.details).toHaveProperty('responseTime');
    });
  });

  test.describe('Login Page - UX Compliance', () => {
    test('should load login page with UX compliance', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Check page title (global title from layout)
      await expect(page).toHaveTitle(/APIQ/);
      
      // Validate UX compliance - heading hierarchy
      await expect(page.locator('h1, h2')).toHaveText(/Sign in|Login/);
      
      // Validate UX compliance - accessible form fields
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();
      
      // Validate UX compliance - form field accessibility
      await expect(emailInput).toHaveAttribute('required');
      await expect(passwordInput).toHaveAttribute('required');
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Validate UX compliance - descriptive button text
      await expect(submitButton).toHaveText(/Sign in|Login/);
      
      // Validate UX compliance - OAuth2 provider labels
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
    });

    test('should validate login form fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Check that required fields are marked as required
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      
      await expect(emailInput).toHaveAttribute('required');
      await expect(passwordInput).toHaveAttribute('required');
    });

    test('should handle invalid login attempt with UX compliance', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill form with invalid credentials
      await page.fill('input[name="email"]', 'invalid@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Validate UX compliance - loading state
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
      await expect(page.locator('button[type="submit"]')).toHaveText(/Signing in/);
      
      // Wait for error to appear
      await page.waitForTimeout(1000);
      
      // Validate UX compliance - accessible error containers
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.text-red-800')).toContainText(/Invalid|Failed/);
      await expect(page.locator('[role="alert"]')).toBeVisible();
      
      // Check if we're still on login page (shouldn't redirect on invalid login)
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Authenticated Navigation', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.click('button[type="submit"]');
      
      // Wait for successful login and redirect to dashboard with shorter timeout
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    });

    test.describe('Dashboard Tab Navigation', () => {
      test('should navigate between dashboard tabs successfully', async ({ page }) => {
        // Verify we're on the dashboard
        await expect(page).toHaveURL(/.*dashboard/);
        
        // Check that default tab (chat) is active
        await expect(page.locator('[data-testid="tab-chat"]')).toHaveClass(/bg-indigo-100/);
        
        // Navigate to Connections tab
        await page.click('[data-testid="tab-connections"]');
        await expect(page.locator('[data-testid="tab-connections"]')).toHaveClass(/bg-indigo-100/);
        await expect(page.locator('h2')).toContainText('API Connections');
        
        // Navigate back to Chat tab
        await page.click('[data-testid="tab-chat"]');
        await expect(page.locator('[data-testid="tab-chat"]')).toHaveClass(/bg-indigo-100/);
        // Chat interface should be visible
        await expect(page.locator('textarea')).toBeVisible();
      });

      test('should maintain tab state on page refresh', async ({ page }) => {
        // Navigate to Connections tab
        await page.click('[data-testid="tab-connections"]');
        await expect(page.locator('[data-testid="tab-connections"]')).toHaveClass(/bg-indigo-100/);
        
        // Refresh the page
        await page.reload();
        
        // Verify we're still on the Connections tab
        await expect(page.locator('[data-testid="tab-connections"]')).toHaveClass(/bg-indigo-100/);
        await expect(page.locator('h2')).toContainText('API Connections');
      });

      test('should handle tab navigation with keyboard', async ({ page }) => {
        // Focus on the tab container
        await page.keyboard.press('Tab');
        
        // Navigate through tabs using arrow keys
        await page.keyboard.press('ArrowRight');
        await expect(page.locator('[data-testid="tab-connections"]')).toHaveClass(/bg-indigo-100/);
        
        // Navigate back with left arrow
        await page.keyboard.press('ArrowLeft');
        await expect(page.locator('[data-testid="tab-chat"]')).toHaveClass(/bg-indigo-100/);
      });
    });

    test.describe('Dashboard Functionality', () => {
      test('should display user information correctly', async ({ page }) => {
        // Verify user information is displayed
        await expect(page.locator('span')).toContainText('Welcome, E2E Navigation Test User');
        
        // Verify logout button is present
        await expect(page.locator('button')).toContainText('Logout');
      });

      test('should handle logout functionality', async ({ page }) => {
        // Click logout button
        await page.click('button:has-text("Logout")');
        
        // Should redirect to home page
        await expect(page).toHaveURL(/.*\/$/);
      });

      test('should display connections tab content', async ({ page }) => {
        // Navigate to Connections tab
        await page.click('[data-testid="tab-connections"]');
        
        // Verify connections content is displayed
        await expect(page.locator('h2')).toContainText('API Connections');
        await expect(page.locator('[data-testid="create-connection-btn"]')).toContainText('Add Connection');
        await expect(page.locator('[data-testid="refresh-connections-btn"]')).toContainText('Refresh');
      });

      test('should display chat tab content', async ({ page }) => {
        // Verify we're on chat tab by default
        await expect(page.locator('[data-testid="tab-chat"]')).toHaveClass(/bg-indigo-100/);
        
        // Verify chat interface is displayed
        await expect(page.locator('textarea')).toBeVisible();
      });
    });

    test.describe('Error Handling', () => {
      test('should handle 404 errors for non-existent workflows', async ({ page }) => {
        // Try to navigate to a non-existent workflow
        await page.goto(`${BASE_URL}/workflows/non-existent-id`);
        
        // Should show 404 page
        await expect(page.locator('h1')).toContainText('404');
        await expect(page.locator('p')).toContainText('Workflow not found');
        
        // Should have a link back to dashboard
        await page.click('a[href="/dashboard"]');
        await expect(page).toHaveURL(/.*dashboard/);
      });

      test('should handle API errors gracefully', async ({ page }) => {
        // Navigate to Workflows tab
        await page.click('[data-testid="tab-workflows"]');
        
        // Mock API error by temporarily removing auth header
        await page.evaluate(() => {
          // Store original fetch
          (window as any).originalFetch = window.fetch;
          
          // Mock fetch to return error
          window.fetch = async (url: RequestInfo | URL, options?: RequestInit) => {
            const urlString = typeof url === 'string' ? url : url.toString();
            if (urlString.includes('/api/workflows')) {
              return new Response(JSON.stringify({
                error: 'Internal Server Error',
                message: 'Something went wrong'
              }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            return (window as any).originalFetch(url, options);
          };
        });
        
        // Try to create a workflow (should fail)
        await page.click('[data-testid="primary-action create-workflow-btn"]');
        
        // Should show error message
        await expect(page.locator('[data-testid="error-message"]')).toContainText('Something went wrong');
        
        // Restore original fetch
        await page.evaluate(() => {
          window.fetch = (window as any).originalFetch;
        });
      });

      test('should handle network errors during navigation', async ({ page }) => {
        // Set offline mode
        await page.context().setOffline(true);
        
        // Try to navigate to a new page
        await page.click('[data-testid="tab-workflows"]');
        
        // Should show offline indicator
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
        
        // Restore online mode
        await page.context().setOffline(false);
        
        // Should hide offline indicator
        await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
      });

      test('should handle slow loading states', async ({ page }) => {
        // Navigate to Workflows tab
        await page.click('[data-testid="tab-workflows"]');
        
        // Mock slow API response
        await page.route('**/api/workflows', async route => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          await route.continue();
        });
        
        // Click refresh button
        await page.click('[data-testid="refresh-workflows"]');
        
        // Should show loading indicator
        await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
        
        // Wait for loading to complete
        await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
      });
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
