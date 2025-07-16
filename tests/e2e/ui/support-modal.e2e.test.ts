import { test, expect } from '@playwright/test';

// Assumes user is already logged in for this test

test.describe('Support Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as a test user (replace with your login helper if needed)
    await page.goto('/login');
    await page.fill('input[type="email"]', 'profile-test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('user can open support modal, submit a message, and see success', async ({ page }) => {
    // Open user dropdown
    await page.click('[data-testid="user-dropdown-toggle"]');
    // Click Help
    await page.click('[data-testid="user-dropdown-help"]');
    // Modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    // Enter a message
    await page.fill('textarea', 'This is a test support request from E2E test.');
    // Submit
    await page.click('button[type="submit"]');
    // See success message
    await expect(page.getByText(/support request has been sent/i)).toBeVisible();
    // Close modal
    await page.click('button[aria-label="Close support modal"]');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('user can cancel support modal', async ({ page }) => {
    await page.click('[data-testid="user-dropdown-toggle"]');
    await page.click('[data-testid="user-dropdown-help"]');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.click('button:has-text("Cancel")');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
}); 