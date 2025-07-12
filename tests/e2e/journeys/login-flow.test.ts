// @ts-nocheck
import { test, expect } from '../helpers/coverageFixture';
import { AuthFlow } from '../helpers/AuthFlow';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser;

test.describe('@critical Login Journey', () => {
  test.beforeAll(async () => {
    // Provision a real user that we can authenticate with
    testUser = await createTestUser(
      `journey-auth-${generateTestId('user')}@example.com`,
      'JourneyPass123',
      'ADMIN',
      'Journey Auth Test User'
    );
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser);
  });

  test('user can sign in and land on dashboard', async ({ page }) => {
    const authFlow = new AuthFlow(page);

    // Login via helper
    await authFlow.login({ email: testUser.email, password: 'JourneyPass123' });

    // Validate we landed on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h2')).toContainText(/Dashboard|Overview|Welcome/i);
  });

  test('session persists after page reload', async ({ page }) => {
    const authFlow = new AuthFlow(page);
    await authFlow.login({ email: testUser.email, password: 'JourneyPass123' });

    await page.reload();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('invalid password displays clear error', async ({ page }) => {
    // Navigate to login page directly (no helper) so we can assert error messaging
    await page.goto(`${BASE_URL}/login`);

    await page.getByLabel('Email address').fill(testUser.email);
    await page.getByLabel('Password').fill('WrongPass123');

    await page.getByTestId('primary-action signin-btn').click();

    // Should remain on login page and show accessible error
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page.locator('.text-red-800')).toContainText(/Invalid credentials|Login failed/);
  });
});