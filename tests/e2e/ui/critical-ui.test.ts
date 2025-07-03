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