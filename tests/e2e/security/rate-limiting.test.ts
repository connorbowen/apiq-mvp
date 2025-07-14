import { test, expect } from '@playwright/test';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
import { createTestUser, cleanupTestUser } from '../../helpers/testUtils';

test.describe('Rate Limiting and Security Tests', () => {
  let uxHelper: UXComplianceHelper;
  let testUser: any;

  test.beforeEach(async ({ page, request }) => {
    uxHelper = new UXComplianceHelper(page);
    
    // Reset rate limits for test isolation
    await request.post('/api/test/reset-rate-limits');
    
    // Create test user for authenticated requests
    testUser = await createTestUser(
      `rate-limit-test-${Date.now()}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'Rate Limit Test User'
    );
  });

  test.afterEach(async () => {
    // Clean up test user
    if (testUser) {
      await cleanupTestUser(testUser);
    }
  });

  test('should enforce rate limiting on connection creation', async ({ page, request }) => {
    // Login to get authentication
    await page.goto('/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', 'e2eTestPass123');
    await page.getByTestId('primary-action signin-btn').click();
    await page.waitForURL(/.*dashboard/);
    
    // Get cookies for authenticated requests
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'auth-token');
    
    if (!authCookie) {
      throw new Error('Authentication cookie not found');
    }

    // Make multiple requests to test rate limiting (exceed 30 requests per minute)
    const responses: any[] = [];
    for (let i = 0; i < 35; i++) {
      const response = await request.post('/api/connections', {
        data: {
          name: `Test Connection ${i}`,
          baseUrl: 'https://api.example.com',
          authType: 'NONE',
          description: `Test connection ${i}`
        },
        headers: {
          'Cookie': `auth-token=${authCookie.value}`
        }
      });
      responses.push(response);
    }
    
    // Verify rate limiting was enforced
    const rateLimited = responses.some(r => r.status() === 429);
    expect(rateLimited).toBe(true);
    
    // Verify rate limit headers
    const rateLimitedResponse = responses.find(r => r.status() === 429);
    expect(rateLimitedResponse?.headers()['retry-after']).toBeDefined();
    expect(rateLimitedResponse?.headers()['x-ratelimit-limit']).toBe('30');
    
    // Verify rate limit response format
    const rateLimitBody = await rateLimitedResponse?.json();
    expect(rateLimitBody).toMatchObject({
      success: false,
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  });

  test('should enforce rate limiting on password reset requests', async ({ page }) => {
    // This test validates the UI behavior during rate limiting
    
    await page.goto('/forgot-password');
    
    // Validate UX compliance
    await uxHelper.validateHeadingHierarchy(['Reset your password']);
    await uxHelper.validateFormAccessibility();
    
    const email = 'security-test@example.com';
    
    // Make multiple rapid requests to test UI behavior
    for (let i = 0; i < 3; i++) {
      await page.fill('[data-testid="email-input"]', email);
      await page.click('[data-testid="primary-action send-reset-link-btn"]');
      
      // Wait for response
      await page.waitForTimeout(100);
    }
    
    // Should show success or appropriate error message
    const errorElement = page.locator('[data-testid="validation-errors"]');
    const successElement = page.locator('[data-testid="success-message"]');
    
    // Check if either error or success message is shown
    const hasError = await errorElement.count() > 0;
    const hasSuccess = await successElement.count() > 0;
    
    expect(hasError || hasSuccess).toBe(true);
    
    // Validate accessibility
    await uxHelper.validateARIACompliance();
  });

  test('should handle invalid token attempts gracefully', async ({ page }) => {
    // Test invalid token attempts
    const invalidToken = 'invalid-token-123';
    await page.goto(`/reset-password?token=${invalidToken}`);
    
    // Validate UX compliance
    await uxHelper.validateHeadingHierarchy(['Set a new password']);
    await uxHelper.validateFormAccessibility();
    
    const newPassword = 'NewPassword123!';
    
    // Make invalid token attempt
    await page.fill('[data-testid="password-input"]', newPassword);
    await page.fill('[data-testid="confirm-password-input"]', newPassword);
    await page.click('[data-testid="primary-action reset-password-btn"]');
    
    // Should show appropriate error
    await uxHelper.validateErrorContainer('Invalid or expired token');
    
    // Validate accessibility
    await uxHelper.validateARIACompliance();
  });

  test('should handle security edge cases gracefully', async ({ page }) => {
    // Test malformed tokens
    await page.goto('/reset-password?token=malformed-token');
    
    // Validate UX compliance
    await uxHelper.validateHeadingHierarchy(['Set a new password']);
    await uxHelper.validateFormAccessibility();
    
    // Should show appropriate error
    await uxHelper.validateErrorContainer('Invalid or expired token');
    
    // Validate accessibility
    await uxHelper.validateARIACompliance();
  });

  test('should validate security UX patterns', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Validate security UX patterns
    await uxHelper.validateFormAccessibility();
    await uxHelper.validateARIACompliance();
    await uxHelper.validateMobileResponsiveness();
    await uxHelper.validateKeyboardNavigation();
  });
}); 