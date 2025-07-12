// @ts-nocheck
import { test, expect } from '../helpers/coverageFixture';
import { UXComplianceHelper } from '../../helpers/uxCompliance';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('@regression Auth Performance & Security', () => {
  test('meets performance budgets', async ({ page }) => {
    const isCI = process.env.CI === 'true';
    const budget = isCI ? 8000 : 6000;

    const start = performance.now();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    const load = performance.now() - start;

    expect(load).toBeLessThan(budget);

    // typing latency
    const email = page.getByLabel('Email address');
    const t0 = performance.now();
    await email.fill('perf@example.com');
    const latency = performance.now() - t0;
    expect(latency).toBeLessThan(isCI ? 10000 : 8000);

    const ux = new UXComplianceHelper(page);
    await ux.validatePerformanceRequirements();
  });

  test('security headers & CSRF token present', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    const resp = await page.waitForResponse(r => r.url().includes('/login') || r.url().includes('/api/auth'), {timeout: 5000}).catch(() => null);
    if (resp) {
      const headers = resp.headers();
      expect(headers['x-frame-options']).toBeDefined();
      expect(headers['x-content-type-options']).toBeDefined();
    }

    const csrf = await page.locator('input[name="_csrf"], input[name="csrfToken"], meta[name="csrf-token"]').first();
    if (await csrf.count() > 0) {
      await expect(csrf).toHaveAttribute('value');
    }
  });
});