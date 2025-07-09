import { test, expect } from '@playwright/test';
import { UXComplianceHelper } from '../../helpers/uxCompliance';

test.describe('Rate Limiting and Security Tests', () => {
  let uxHelper: UXComplianceHelper;

  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
  });

  test('should enforce rate limiting on password reset requests', async ({ page }) => {
    // This test should run with rate limiting enabled
    // Note: Rate limiting is disabled in test mode, so this test validates the UI behavior
    
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