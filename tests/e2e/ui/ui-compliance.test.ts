import { test, expect, request } from '@playwright/test';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
import { createTestUser, cleanupTestUser, generateTestId, authenticateE2EPage } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: any;
let jwt: string;
let createdConnectionIds: string[] = [];

// Helper to create a connection with auth
async function createConnection(apiRequest: any, data: any) {
  const response = await apiRequest.post('/api/connections', {
    data,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`
    }
  });
  if (response.status() === 201) {
    const resData = await response.json();
    if (resData.data && resData.data.id) {
      createdConnectionIds.push(resData.data.id);
    }
  }
  return response;
}

test.describe('UI Compliance E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-ui-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E UI Test User'
    );
    jwt = testUser.accessToken;
  });

  test.afterAll(async ({ request }) => {
    // Clean up created connections
    for (const id of createdConnectionIds) {
      await request.delete(`/api/connections/${id}`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
    }
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.describe('Critical UI Functionality', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to the home page before each test
      await page.goto(BASE_URL);
    });

    test('should load the home page successfully', async ({ page }) => {
      // Check that the page loads with the correct title
      await expect(page).toHaveTitle(/APIQ/);
      
      // Check for the main heading
      await expect(page.locator('h1')).toContainText('APIQ');
      await expect(page.locator('h2')).toContainText('Just Ask, We\'ll Connect');
      
      // Check for the main call-to-action buttons (handle multiple dashboard links)
      const dashboardLinks = page.locator('a[href="/dashboard"]');
      await expect(dashboardLinks.first()).toBeVisible();
      await expect(dashboardLinks.nth(1)).toBeVisible();
      
      // Check for examples link
      await expect(page.locator('a[href="#examples"]')).toContainText('See Examples');
    });

    test('should have working API health endpoint', async ({ page }) => {
      // Test the health check API endpoint
      const response = await page.request.get('/api/health');
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('timestamp');
    });

    test('should navigate to login page', async ({ page }) => {
      // Click on login link or button
      await page.click('a[href="/login"], button:has-text("Sign In"), a:has-text("Sign In")');
      
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

    test('should have working navigation to dashboard', async ({ page }) => {
      // Click on the first dashboard link
      await page.locator('a[href="/dashboard"]').first().click();
      
      // Should redirect to login for unauthenticated users
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Application UI & Layout', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(BASE_URL);
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

    test('should have proper color scheme and styling', async ({ page }) => {
      // Check that the page has proper styling (the body has CSS variables)
      const body = page.locator('body');
      await expect(body).toHaveClass(/antialiased/);
      
      // Check that the header has proper styling
      const header = page.locator('header');
      await expect(header).toHaveClass(/bg-white/);
      await expect(header).toHaveClass(/shadow-sm/);
      
      // Check that the main content area is visible
      const main = page.locator('main');
      await expect(main).toBeVisible();
    });

    test('should have working call-to-action buttons', async ({ page }) => {
      // Test "See Examples" button scrolls to examples section
      await page.click('a[href="#examples"]');
      await expect(page.locator('#examples')).toBeVisible();
      
      // Test dashboard navigation - should redirect to login for unauthenticated users
      await page.locator('a[href="/dashboard"]').first().click();
      await expect(page).toHaveURL(/.*login/);
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

  test.describe('Primary Action Button Patterns', () => {
    test('should have consistent primary action patterns across all pages', async ({ page }) => {
      // Test login page primary actions
      await page.goto('/login');
      await expect(page.getByTestId('primary-action signin-btn')).toBeVisible();
      await expect(page.getByTestId('primary-action signin-btn')).toHaveText('Sign in');
      
      // Test signup page primary actions
      await page.goto('/signup');
      await expect(page.getByTestId('primary-action signup-btn')).toBeVisible();
      await expect(page.getByTestId('primary-action signup-btn')).toHaveText('Create account');
      
      // Login to test dashboard primary actions
      await page.goto('/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.getByTestId('primary-action signin-btn').click();
      
      // Wait for dashboard to load
      await page.waitForURL('/dashboard');
      
      // Test workflows tab primary actions
      await page.getByTestId('tab-workflows').click();
      await expect(page.getByTestId('primary-action create-workflow-btn')).toBeVisible();
      await expect(page.getByTestId('primary-action create-workflow-btn')).toHaveText('Create Workflow');
      
      // Test connections tab primary actions
      await page.getByTestId('tab-connections').click();
      await expect(page.getByTestId('primary-action create-connection-header-btn')).toBeVisible();
      await expect(page.getByTestId('primary-action create-connection-header-btn')).toHaveText('Add Connection');
      
      // Test secrets tab primary actions
      await page.getByTestId('tab-secrets').click();
      await expect(page.getByTestId('primary-action create-secret-btn')).toBeVisible();
      await expect(page.getByTestId('primary-action create-secret-btn')).toHaveText('Create Secret');
    });

    test('should validate UX compliance for primary actions', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // Test login page UX compliance
      await page.goto('/login');
      await uxHelper.validateActivationFirstUX();
      
      // Test signup page UX compliance
      await page.goto('/signup');
      await uxHelper.validateActivationFirstUX();
      
      // Login and test dashboard UX compliance
      await page.goto('/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.getByTestId('primary-action signin-submit').click();
      await page.waitForURL('/dashboard');
      
      // Test each tab for UX compliance
      await page.getByTestId('tab-workflows').click();
      await uxHelper.validateActivationFirstUX();
      
      await page.getByTestId('tab-connections').click();
      await uxHelper.validateActivationFirstUX();
      
      await page.getByTestId('tab-secrets').click();
      await uxHelper.validateActivationFirstUX();
    });

    test('should have proper styling for primary action buttons', async ({ page }) => {
      // Login to access dashboard
      await page.goto('/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.getByTestId('primary-action signin-btn').click();
      await page.waitForURL('/dashboard');
      
      // Test workflows tab button styling
      await page.getByTestId('tab-workflows').click();
      const workflowButton = page.getByTestId('primary-action create-workflow-btn');
      await expect(workflowButton).toHaveClass(/bg-green-600/);
      await expect(workflowButton).toHaveClass(/hover:bg-green-700/);
      await expect(workflowButton).toHaveClass(/min-h-\[44px\]/);
      
      // Test connections tab button styling
      await page.getByTestId('tab-connections').click();
      const connectionButton = page.getByTestId('primary-action create-connection-header-btn');
      await expect(connectionButton).toHaveClass(/bg-indigo-600/);
      await expect(connectionButton).toHaveClass(/hover:bg-indigo-700/);
      await expect(connectionButton).toHaveClass(/min-h-\[44px\]/);
      
      // Test secrets tab button styling
      await page.getByTestId('tab-secrets').click();
      const secretButton = page.getByTestId('primary-action create-secret-btn');
      await expect(secretButton).toHaveClass(/bg-indigo-600/);
      await expect(secretButton).toHaveClass(/hover:bg-indigo-700/);
      await expect(secretButton).toHaveClass(/min-h-\[44px\]/);
    });

    test('should have accessible primary action buttons', async ({ page }) => {
      // Test login page accessibility
      await page.goto('/login');
      const signinButton = page.getByTestId('primary-action signin-btn');
      await expect(signinButton).toBeVisible();
      await expect(signinButton).toBeEnabled();
      
      // Test focus management
      await signinButton.focus();
      await expect(signinButton).toBeFocused();
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(signinButton).toBeFocused();
      
      // Login and test dashboard accessibility
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      signinButton.click();
      await page.waitForURL('/dashboard');
      
      // Test workflows tab accessibility
      await page.getByTestId('tab-workflows').click();
      const workflowButton = page.getByTestId('primary-action create-workflow-btn');
      await expect(workflowButton).toBeVisible();
      await expect(workflowButton).toBeEnabled();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    let uxHelper: UXComplianceHelper;

    test.beforeEach(async ({ page }) => {
      uxHelper = new UXComplianceHelper(page);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      // Use secure cookie-based authentication
      await authenticateE2EPage(page, testUser);
    });

    test('should display mobile menu and navigation', async ({ page }) => {
      // Check for mobile menu button
      await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Open mobile menu
      await page.getByRole('button', { name: 'Menu' }).click();
      
      // Check mobile menu items
      await expect(page.getByText('Dashboard')).toBeVisible();
      await expect(page.getByText('Workflows')).toBeVisible();
      await expect(page.getByText('Connections')).toBeVisible();
      await expect(page.getByText('Secrets')).toBeVisible();
      await expect(page.getByText('Settings')).toBeVisible();
      await expect(page.getByText('Sign Out')).toBeVisible();
    });

    test('should handle mobile tab navigation', async ({ page }) => {
      // Check for mobile tab bar
      await expect(page.locator('[data-testid="mobile-tab-bar"]')).toBeVisible();
      
      // Test tab navigation
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await expect(page.getByText('Workflows')).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Workflows' })).toHaveAttribute('aria-selected', 'true');
      
      await page.getByRole('tab', { name: 'Connections' }).click();
      await expect(page.getByText('Connections')).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Connections' })).toHaveAttribute('aria-selected', 'true');
      
      await page.getByRole('tab', { name: 'Secrets' }).click();
      await expect(page.getByText('Secrets')).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Secrets' })).toHaveAttribute('aria-selected', 'true');
      
      await page.getByRole('tab', { name: 'Overview' }).click();
      await expect(page.getByText('Dashboard')).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    });

    test('should display responsive dashboard layout', async ({ page }) => {
      // Check dashboard layout on mobile
      await expect(page.getByText('Dashboard')).toBeVisible();
      
      // Check for mobile-optimized cards
      await expect(page.locator('[data-testid="mobile-card"]')).toBeVisible();
      
      // Check for responsive grid layout
      const cards = page.locator('[data-testid="dashboard-card"]');
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);
      
      // Cards should stack vertically on mobile
      for (let i = 0; i < cardCount; i++) {
        const card = cards.nth(i);
        const box = await card.boundingBox();
        expect(box?.width).toBeLessThanOrEqual(375); // Should fit mobile width
      }
    });

    test('should handle mobile form input and validation', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      // Test mobile form input
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send mobile notification for new orders');
      
      // Check input is properly sized for mobile
      const inputBox = await chatInput.boundingBox();
      expect(inputBox?.width).toBeGreaterThan(300); // Should use most of mobile width
      
      // Test mobile keyboard interaction
      await chatInput.focus();
      await page.keyboard.type(' with priority handling');
      
      // Submit form
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      // Wait for response
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Check mobile-optimized workflow preview
      await expect(page.getByText('Mobile Order Notification')).toBeVisible();
      await expect(page.getByText('Send Mobile Notification')).toBeVisible();
    });

    test('should handle mobile touch interactions', async ({ page }) => {
      await page.getByRole('tab', { name: 'Connections' }).click();
      await page.getByRole('button', { name: 'Add Connection' }).click();
      
      // Test mobile touch targets
      const buttons = page.locator('button');
      for (let i = 0; i < await buttons.count(); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        if (box) {
          // Touch targets should be at least 44x44 pixels
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
      
      // Test mobile scrolling
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Should be able to scroll to bottom
      const scrollPosition = await page.evaluate(() => window.scrollY);
      expect(scrollPosition).toBeGreaterThan(0);
    });

    test('should validate mobile responsiveness', async ({ page }) => {
      // Validate mobile responsiveness
      await uxHelper.validateMobileResponsiveness();
      await uxHelper.validateMobileAccessibility();
      
      // Test touch interactions
      const googleButton = page.getByTestId('primary-action google-oauth2-btn');
      if (await googleButton.count() > 0) {
        await expect(googleButton).toBeVisible();
        
        // Validate minimum touch target size (44px)
        const buttonBox = await googleButton.boundingBox();
        expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
        expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
      }
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

    test('should handle health check with external API check', async ({ page }) => {
      const response = await page.request.get('/api/health?check=external');
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('checks');
      expect(data.checks).toHaveProperty('external');
      expect(data.checks.external).toHaveProperty('status');
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
