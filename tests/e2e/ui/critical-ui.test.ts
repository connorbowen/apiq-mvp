import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Critical UI Tests - Chromium Only', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto(BASE_URL);
  });

  test('should load the home page successfully', async ({ page }) => {
    // Check that the page loads with the correct title
    await expect(page).toHaveTitle(/APIQ/);
    
    // Check for the main heading
    await expect(page.locator('h1')).toContainText('APIQ');
    await expect(page.locator('h2')).toContainText('AI-Powered API Orchestration');
    
    // Check for the main call-to-action buttons
    await expect(page.locator('a[href="#features"]')).toContainText('Get Started');
    await expect(page.locator('a[href="#demo"]')).toContainText('View Demo');
  });

  test('should have working health check functionality', async ({ page }) => {
    // Click the health check button
    await page.click('button:has-text("Health Check")');
    
    // Wait for the health status to appear with shorter timeout
    await page.waitForSelector('text=System Health:', { timeout: 5000 });
    
    // Check that health status is displayed
    await expect(page.locator('text=System Health:')).toBeVisible();
  });

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

  test('should have working API health endpoint', async ({ page }) => {
    // Test the health check API endpoint
    const response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
  });
}); 