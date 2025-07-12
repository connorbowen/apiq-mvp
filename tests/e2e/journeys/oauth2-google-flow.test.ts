// @ts-nocheck
import { test, expect } from '../helpers/coverageFixture';
import { OAuth2ConsentPage } from '../pages/OAuth2ConsentPage';
import { DashboardPage } from '../pages/DashboardPage';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('@critical OAuth2 Google Flow', () => {
  test('user can authenticate with Google and reach dashboard', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/login`);

    // Intercept callback to fake successful auth
    await context.route(/\/api\/auth\/callback\/google/, route => {
      return route.fulfill({ status: 200, body: JSON.stringify({ success: true, redirect: '/dashboard' }), headers: { 'content-type': 'application/json' } });
    });

    // Click Google button
    const googleBtn = page.getByRole('button', { name: /Continue with Google/i });
    await expect(googleBtn).toBeVisible();
    await googleBtn.click();

    // Expect consent screen (stub)
    const consent = new OAuth2ConsentPage(page);
    await consent.expectConsentScreen('google');
    await consent.approve();

    // Wait for redirect to dashboard
    const dashboard = new DashboardPage(page);
    await dashboard.expectLoaded();
  });
});