import { test, expect, request } from '@playwright/test';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

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
      await expect(page.getByTestId('primary-action signin-submit')).toBeVisible();
      await expect(page.getByTestId('primary-action signin-submit')).toHaveText('Sign in');
      
      // Test signup page primary actions
      await page.goto('/signup');
      await expect(page.getByTestId('primary-action signup-submit')).toBeVisible();
      await expect(page.getByTestId('primary-action signup-submit')).toHaveText('Create account');
      
      // Login to test dashboard primary actions
      await page.goto('/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'e2eTestPass123');
      await page.getByTestId('primary-action signin-submit').click();
      
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
      await page.getByTestId('primary-action signin-submit').click();
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
      const signinButton = page.getByTestId('primary-action signin-submit');
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
      
      // Set authentication token directly instead of using UI login
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Set the JWT token in localStorage to authenticate the user
      await page.evaluate((data) => {
        localStorage.setItem('accessToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }, { token: jwt, user: testUser });
      
      // Reload the page to apply authentication
      await page.reload();
      
      // Wait for dashboard to load
      await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });
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