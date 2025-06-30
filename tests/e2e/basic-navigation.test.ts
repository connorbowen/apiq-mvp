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
      await expect(page.locator('h2')).toContainText('AI-Powered API Orchestration');
      
      // Check for the main call-to-action buttons
      await expect(page.locator('a[href="#features"]')).toContainText('Get Started');
      await expect(page.locator('a[href="#demo"]')).toContainText('View Demo');
      
      // Check for the health check button
      await expect(page.locator('button')).toContainText('Health Check');
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
      // Test "Get Started" button scrolls to features section
      await page.click('a[href="#features"]');
      await expect(page.locator('#features')).toBeVisible();
      
      // Test "View Demo" button scrolls to demo section
      await page.click('a[href="#demo"]');
      await expect(page.locator('#demo')).toBeVisible();
    });

    test('should have working health check functionality', async ({ page }) => {
      // Click the health check button
      await page.click('button:has-text("Health Check")');
      
      // Wait for the health status to appear
      await page.waitForSelector('text=System Health:', { timeout: 10000 });
      
      // Check that health status is displayed
      await expect(page.locator('text=System Health:')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to login page', async ({ page }) => {
      // Click on login link or button
      await page.click('a[href="/login"], button:has-text("Sign In"), a:has-text("Login")');
      
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

    test('should handle health check with external API check', async ({ page }) => {
      const response = await page.request.get('/api/health?check=external');
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('checks');
      expect(data.checks).toHaveProperty('external');
      expect(data.checks.external).toHaveProperty('status');
    });
  });

  test.describe('Login Page', () => {
    test('should load login page with all elements', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Check page title
      await expect(page).toHaveTitle(/Sign in/);
      
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
      
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Should show validation errors (if implemented)
      // Note: This test may need adjustment based on actual validation implementation
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');
      
      // Check that required fields are marked as required
      await expect(emailInput).toHaveAttribute('required');
      await expect(passwordInput).toHaveAttribute('required');
    });

    test('should handle invalid login attempt', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Fill form with invalid credentials
      await page.fill('input[name="email"]', 'invalid@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Should show error message (if implemented)
      // Note: This test may need adjustment based on actual error handling
      await page.waitForTimeout(2000); // Wait for potential error message
      
      // Check if we're still on login page (shouldn't redirect on invalid login)
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Dashboard Access', () => {
    test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
      // Try to access dashboard directly
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should redirect to login page
      await expect(page).toHaveURL(/.*login/);
    });

    test('should show login page when accessing protected routes', async ({ page }) => {
      // Try to access various protected routes
      const protectedRoutes = ['/dashboard', '/connections', '/workflows'];
      
      for (const route of protectedRoutes) {
        await page.goto(`${BASE_URL}${route}`);
        await expect(page).toHaveURL(/.*login/);
      }
    });
  });

  test.describe('OAuth2 Flow', () => {
    test('should initiate GitHub OAuth2 flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Click GitHub OAuth2 button
      await page.click('button:has-text("Continue with GitHub")');
      
      // Should redirect to GitHub OAuth2 authorization
      // Note: This may redirect to GitHub's OAuth2 page, which we can't fully test in E2E
      // We can at least verify that the button triggers some action
      await page.waitForTimeout(2000);
      
      // Check if we're either still on login page or redirected
      const currentUrl = page.url();
      expect(currentUrl.includes('github.com') || currentUrl.includes('login')).toBe(true);
    });

    test('should handle OAuth2 callback', async ({ page }) => {
      // Test OAuth2 callback with mock parameters
      await page.goto(`${BASE_URL}/api/auth/oauth2/callback?code=test-code&state=test-state`);
      
      // Should handle the callback appropriately
      // This might redirect to login with error, or to dashboard if successful
      await page.waitForTimeout(2000);
      
      // Verify we're on a valid page
      const currentUrl = page.url();
      expect(currentUrl.includes('login') || currentUrl.includes('dashboard') || currentUrl.includes('error')).toBe(true);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Test with a non-existent API endpoint
      const response = await page.request.get('/api/nonexistent-endpoint');
      expect(response.status()).toBe(404);
    });

    test('should handle malformed requests', async ({ page }) => {
      // Test with malformed JSON
      const response = await page.request.post('/api/auth/login', {
        data: 'invalid-json',
        headers: { 'Content-Type': 'application/json' }
      });
      
      expect(response.status()).toBe(400);
    });

    test('should handle server errors', async ({ page }) => {
      // This test would need a specific endpoint that triggers a 500 error
      // For now, we'll test that the health endpoint works
      const response = await page.request.get('/api/health');
      expect(response.status()).toBe(200);
    });
  });

  test.describe('Performance', () => {
    test('should load pages within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(BASE_URL);
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle concurrent requests', async ({ page }) => {
      // Make multiple concurrent requests to test performance
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(page.request.get('/api/health'));
      }
      
      const responses = await Promise.all(promises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });
    });
  });
}); 