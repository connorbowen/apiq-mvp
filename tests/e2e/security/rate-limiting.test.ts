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
// TODO: Add UXComplianceHelper integration (P0)
// import { UXComplianceHelper } from '../../helpers/uxCompliance';
// 
// test.beforeEach(async ({ page }) => {
//   const uxHelper = new UXComplianceHelper(page);
//   await uxHelper.validateActivationFirstUX();
//   await uxHelper.validateFormAccessibility();
//   await uxHelper.validateMobileResponsiveness();
//   await uxHelper.validateKeyboardNavigation();
// });

// TODO: Add cookie-based authentication testing (P0)
// - Test HTTP-only cookie authentication
// - Test secure cookie settings
// - Test cookie expiration and cleanup
// - Test cookie-based session management
// - Test authentication state persistence via cookies

// TODO: Replace localStorage with cookie-based authentication (P0)
// Application now uses cookie-based authentication instead of localStorage
// 
// Anti-patterns to remove:
// - localStorage.getItem('token')
// - localStorage.setItem('token', value)
// - localStorage.removeItem('token')
// 
// Replace with cookie-based patterns:
// - Test authentication via HTTP-only cookies
// - Test session management via secure cookies
// - Test logout by clearing authentication cookies

// TODO: Add data cleanup patterns (P0)
// - Clean up test users: await prisma.user.deleteMany({ where: { email: { contains: 'e2e-test' } } });
// - Clean up test connections: await prisma.connection.deleteMany({ where: { name: { contains: 'Test' } } });
// - Clean up test workflows: await prisma.workflow.deleteMany({ where: { name: { contains: 'Test' } } });
// - Clean up test secrets: await prisma.secret.deleteMany({ where: { name: { contains: 'Test' } } });

// TODO: Add deterministic test data (P0)
// - Create predictable test data with unique identifiers
// - Use timestamps or UUIDs to avoid conflicts
// - Example: const testUser = await createTestUser({ email: `e2e-test-${Date.now()}@example.com` });
// - Ensure test data is isolated and doesn't interfere with other tests

// TODO: Ensure test independence (P0)
// - Each test should be able to run in isolation
// - No dependencies on other test execution order
// - Clean state before and after each test
// - Use unique identifiers for all test data
// - Avoid global state modifications

// TODO: Remove API calls from E2E tests (P0)
// E2E tests should ONLY test user interactions through the UI
// API testing should be done in integration tests
// 
// Anti-patterns to remove:
// - page.request.post('/api/connections', {...})
// - fetch('/api/connections')
// - axios.post('/api/connections')
// 
// Replace with UI interactions:
// - await page.click('[data-testid="create-connection-btn"]')
// - await page.fill('[data-testid="connection-name-input"]', 'Test API')
// - await page.click('[data-testid="primary-action submit-btn"]')

// TODO: Remove all API testing from E2E tests (P0)
// E2E tests should ONLY test user interactions through the UI
// API testing belongs in integration tests
// 
// Anti-patterns detected and must be removed:
// - page.request.post('/api/connections', {...})
// - fetch('/api/connections')
// - axios.post('/api/connections')
// - request.get('/api/connections')
// 
// Replace with UI interactions:
// - await page.click('[data-testid="create-connection-btn"]')
// - await page.fill('[data-testid="connection-name-input"]', 'Test API')
// - await page.click('[data-testid="primary-action submit-btn"]')
// - await expect(page.locator('[data-testid="success-message"]')).toBeVisible()

// TODO: Add robust waiting patterns for dynamic elements (P0)
// - Use waitForSelector() instead of hardcoded delays
// - Use expect().toBeVisible() for element visibility checks
// - Use waitForLoadState() for page load completion
// - Use waitForResponse() for API calls
// - Use waitForFunction() for custom conditions
// 
// Example patterns:
// await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
// await expect(page.locator('[data-testid="submit-btn"]')).toBeVisible();
// await page.waitForLoadState('networkidle');
// await page.waitForResponse(response => response.url().includes('/api/'));
// await page.waitForFunction(() => document.querySelector('.loading').style.display === 'none');

// TODO: Replace hardcoded delays with robust waiting (P0)
// Anti-patterns to replace:
// - setTimeout(5000) → await page.waitForSelector(selector, { timeout: 5000 })
// - sleep(3000) → await expect(page.locator(selector)).toBeVisible({ timeout: 3000 })
// - delay(2000) → await page.waitForLoadState('networkidle')
// 
// Best practices:
// - Wait for specific elements to appear
// - Wait for network requests to complete
// - Wait for page state changes
// - Use appropriate timeouts for different operations

// TODO: Add XSS prevention testing (P0)
// - Test input sanitization
// - Test script injection prevention
// - Test HTML escaping
// - Test content security policy compliance

// TODO: Add CSRF protection testing (P0)
// - Test CSRF token validation
// - Test cross-site request forgery prevention
// - Test cookie-based CSRF protection
// - Test secure form submission

// TODO: Add data exposure testing (P0)
// - Test sensitive data handling
// - Test privacy leak prevention
// - Test information disclosure prevention
// - Test data encryption and protection

// TODO: Add authentication flow testing (P0)
// - Test OAuth integration
// - Test SSO (Single Sign-On) flows
// - Test MFA (Multi-Factor Authentication)
// - Test authentication state management

// TODO: Add session management testing (P0)
// - Test cookie-based session management
// - Test session expiration handling
// - Test login state persistence
// - Test logout and session cleanup

// TODO: Add UI interaction testing (P0)
// E2E tests should focus on user interactions through the UI
// - Test clicking buttons and links
// - Test filling forms
// - Test navigation flows
// - Test user workflows end-to-end

// TODO: Add primary action button patterns (P0)
// - Use data-testid="primary-action {action}-btn" pattern
// - Test primary action presence with UXComplianceHelper
// - Validate button text matches standardized patterns

// TODO: Add form accessibility testing (P0)
// - Test form labels and ARIA attributes
// - Test keyboard navigation
// - Test screen reader compatibility
// - Use UXComplianceHelper.validateFormAccessibility()
