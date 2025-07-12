// @ts-nocheck
import { test, expect } from '../helpers/coverageFixture';
import { AuthFlow } from '../helpers/AuthFlow';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser;

test.describe('Session & Protected Routes', () => {
  test.beforeAll(async () => {
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

  test('@regression session expires and redirects to login', async ({ page }) => {
    const authFlow = new AuthFlow(page);
    await authFlow.login({ email: testUser.email, password: 'JourneyPass123' });

    // Clear cookies to simulate expiration
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/dashboard`);

    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h2')).toHaveText(/Sign in to APIQ/);
  });

  test('@regression unauthenticated user is redirected from protected routes', async ({ page }) => {
    await page.context().clearCookies();

    const protectedRoutes = ['/dashboard', '/dashboard?tab=connections', '/workflows'];

    for (const route of protectedRoutes) {
      await page.goto(`${BASE_URL}${route}`);
      await expect(page).toHaveURL(/.*login/);
      await expect(page.locator('h2')).toHaveText(/Sign in to APIQ/);
    }
  });
});