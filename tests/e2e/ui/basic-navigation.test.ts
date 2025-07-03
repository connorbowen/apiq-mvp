import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Basic Navigation E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto(BASE_URL);
  });

  test.describe('Landing Page', () => {
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
  });

  test.describe('Navigation', () => {
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

  test.describe('Login Page', () => {
    test('should load login page with all elements', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Check page title (global title from layout)
      await expect(page).toHaveTitle(/APIQ/);
      
      // Check for login form elements
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Check for OAuth2 buttons
      await expect(page.locator('button:has-text("Continue with GitHub")')).toBeVisible();
      await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
      await expect(page.locator('button:has-text("Continue with Slack")')).toBeVisible();
    });

    test('should validate login form fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Check that required fields are marked as required
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      
      await expect(emailInput).toHaveAttribute('required');
      await expect(passwordInput).toHaveAttribute('required');
    });

    test('should handle invalid login attempt', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill form with invalid credentials
      await page.fill('input[name="email"]', 'invalid@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Should show error message
      await page.waitForTimeout(1000);
      
      // Check if we're still on login page (shouldn't redirect on invalid login)
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Dashboard Access', () => {
    test('should show login page when accessing protected routes', async ({ page }) => {
      // Try to access various protected routes
      const protectedRoutes = ['/dashboard'];
      
      for (const route of protectedRoutes) {
        await page.goto(`${BASE_URL}${route}`);
        await expect(page).toHaveURL(/.*login/);
      }
      
      // /connections should return 404 since there's no main connections page
      await page.goto(`${BASE_URL}/connections`);
      // Next.js should show 404 page for non-existent routes
      await expect(page.locator('h1')).toContainText('404');
      
      // /workflows should return 404 since there's no main workflows page
      await page.goto(`${BASE_URL}/workflows`);
      // Next.js should show 404 page for non-existent routes
      await expect(page.locator('h1')).toContainText('404');
    });
  });
}); 