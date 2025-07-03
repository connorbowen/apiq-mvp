import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Google OAuth2 Sign-In E2E', () => {
  test('should redirect to Google OAuth consent screen from login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    // Click the Google sign-in button
    await page.click('button:has-text("Continue with Google")');
    // Wait for navigation to Google
    await page.waitForURL(/accounts\.google\.com/);
    // Check that we are on the Google OAuth consent screen (or error page if client is not whitelisted)
    const url = page.url();
    expect(url).toMatch(/accounts\.google\.com/);
    // Optionally, check for error message if invalid_client
    if (url.includes('error=invalid_client')) {
      await expect(page.locator('body')).toContainText(['Authorization Error', 'invalid_client']);
    }
  });
}); 