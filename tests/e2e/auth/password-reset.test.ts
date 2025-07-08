import { test, expect } from '@playwright/test';
import { generateTestId } from '../../helpers/testUtils';
import { prisma } from '../../../lib/database/client';
import bcrypt from 'bcryptjs';
import { INVALID_TOKEN_PREFIX, TEST_TOKEN_PREFIX } from '../../../src/app/reset-password/page';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Password Reset E2E Tests - Complete Flow', () => {
  test.describe('Real Email Password Reset Flow', () => {
    test('should complete full password reset flow with real email', async ({ page }) => {
      test.setTimeout(30000); // 30 seconds for complex password reset flow
      const testEmail = `e2e-reset-${generateTestId('user')}@example.com`;
      const originalPassword = 'OriginalPass123!';
      const newPassword = 'NewSecurePass456!';

      // Create a test user with known password
      const hashedPassword = await bcrypt.hash(originalPassword, 12);
      const testUser = await prisma.user.create({
        data: {
          email: testEmail,
          name: 'E2E Test User',
          password: hashedPassword,
          isActive: true,
          role: 'USER'
        }
      });

      try {
        // Step 1: Request password reset
        await page.goto(`${BASE_URL}/forgot-password`);
        
        // Fill and submit the form
        await page.fill('input[name="email"]', testEmail);
        await page.click('button[type="submit"]');
        
        // Wait for success page
        await expect(page).toHaveURL(/.*forgot-password-success/);
        await expect(page.locator('h2')).toContainText('Reset Link Sent!');
        
        // Step 2: Get the reset token from database
        const resetToken = await prisma.passwordResetToken.findFirst({
          where: { email: testEmail }
        });
        
        expect(resetToken).toBeTruthy();
        expect(resetToken?.token).toBeTruthy();
        
        // Step 3: Use the reset token to change password
        await page.goto(`${BASE_URL}/reset-password?token=${resetToken!.token}`);
        
        // Verify we're on the reset password page
        await expect(page.locator('h2')).toContainText('Reset your password');
        
        // Fill in new password
        await page.fill('input[name="password"]', newPassword);
        await page.fill('input[name="confirmPassword"]', newPassword);
        await page.click('button[type="submit"]');
        
        // Wait for success message
        await expect(page.locator('.bg-green-50')).toContainText('Password reset successful!');
        
        // Should redirect to login page
        await expect(page).toHaveURL(/.*login/);
        
        // Add a small delay to ensure password reset is fully committed
        await page.waitForTimeout(1000);
        
        // Step 4: Verify old password no longer works
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="password"]', originalPassword);
        await page.click('button[type="submit"]');
        
        // Wait for loading to complete and error to appear
        await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Sign in' })).not.toBeDisabled();
        
        // Should show error for invalid credentials
        await expect(page.locator('.bg-red-50')).toBeVisible();
        await expect(page.locator('.bg-red-50')).toContainText(/Invalid credentials|Login failed/);
        
        // Step 5: Verify new password works
        await page.fill('input[name="password"]', newPassword);
        await page.click('button[type="submit"]');
        
        // Should successfully login and redirect to dashboard
        await expect(page).toHaveURL(/.*dashboard/);
        await expect(page.locator('h1')).toContainText('Dashboard');
        
        // Step 6: Verify token was deleted from database
        const deletedToken = await prisma.passwordResetToken.findUnique({
          where: { token: resetToken!.token }
        });
        expect(deletedToken).toBeNull();
        
        // Step 7: Verify audit logs were created
        const auditLogs = await prisma.auditLog.findMany({
          where: { userId: testUser.id },
          orderBy: { createdAt: 'desc' }
        });
        
        expect(auditLogs.length).toBeGreaterThanOrEqual(2);
        expect(auditLogs.some(log => log.action === 'REQUEST_PASSWORD_RESET')).toBe(true);
        expect(auditLogs.some(log => log.action === 'PASSWORD_RESET')).toBe(true);
        
      } finally {
        // Clean up test data
        await prisma.passwordResetToken.deleteMany({
          where: { email: testEmail }
        });
        await prisma.auditLog.deleteMany({
          where: { userId: testUser.id }
        });
        await prisma.user.delete({
          where: { id: testUser.id }
        });
      }
    });

    test('should handle expired reset token', async ({ page }) => {
      const testEmail = `e2e-expired-${generateTestId('user')}@example.com`;

      // Create a test user
      const hashedPassword = await bcrypt.hash('OriginalPass123!', 12);
      const testUser = await prisma.user.create({
        data: {
          email: testEmail,
          name: 'E2E Expired Test User',
          password: hashedPassword,
          isActive: true,
          role: 'USER'
        }
      });

      try {
        // Request password reset
        await page.goto(`${BASE_URL}/forgot-password`);
        await page.fill('input[name="email"]', testEmail);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*forgot-password-success/);
        
        // Get the reset token
        const resetToken = await prisma.passwordResetToken.findFirst({
          where: { email: testEmail }
        });
        expect(resetToken).toBeTruthy();
        
        // Manually expire the token in database
        await prisma.passwordResetToken.update({
          where: { id: resetToken!.id },
          data: { expiresAt: new Date(Date.now() - 60 * 60 * 1000) } // 1 hour ago
        });
        
        // Try to use expired token
        await page.goto(`${BASE_URL}/reset-password?token=${resetToken!.token}`);
        
        // Fill in new password
        await page.fill('input[name="password"]', 'NewPassword123!');
        await page.fill('input[name="confirmPassword"]', 'NewPassword123!');
        await page.click('button[type="submit"]');
        
        // Should show error for expired token
        await expect(page.locator('.bg-red-50')).toContainText(/expired|invalid/i);
        // Should show disabled form fields and button
        await expect(page.locator('input[name="password"]')).toBeDisabled();
        await expect(page.locator('input[name="confirmPassword"]')).toBeDisabled();
        await expect(page.locator('button[type="submit"]')).toBeDisabled();
        // Should show a link to request a new reset
        await expect(page.locator('a[href="/forgot-password"]')).toContainText(/request a new password reset/i);
      } finally {
        // Clean up test data
        await prisma.passwordResetToken.deleteMany({
          where: { email: testEmail }
        });
        await prisma.auditLog.deleteMany({
          where: { userId: testUser.id }
        });
        await prisma.user.delete({
          where: { id: testUser.id }
        });
      }
    });

    test('should handle invalid reset token', async ({ page }) => {
      const invalidToken = `${INVALID_TOKEN_PREFIX}-123`;
      
      await page.goto(`${BASE_URL}/reset-password?token=${invalidToken}`);
      
      // Should show error for invalid token
      await expect(page.locator('.bg-red-50')).toContainText(/invalid|missing/i);
      
      // Should provide link to request new reset
      await expect(page.locator('a[href="/forgot-password"]')).toContainText('Request a new password reset');
    });

    test('should handle password reset for non-existent user', async ({ page }) => {
      const nonExistentEmail = `nonexistent-${generateTestId()}@example.com`;
      
      await page.goto(`${BASE_URL}/forgot-password`);
      await page.fill('input[name="email"]', nonExistentEmail);
      await page.click('button[type="submit"]');
      
      // Should still show success page (security: don't reveal if user exists)
      await expect(page).toHaveURL(/.*forgot-password-success/);
      await expect(page.locator('h2')).toContainText('Reset Link Sent!');
      
      // Should not create any tokens in database
      const tokens = await prisma.passwordResetToken.findMany({
        where: { email: nonExistentEmail }
      });
      expect(tokens).toHaveLength(0);
    });

    test('should handle multiple password reset requests', async ({ page }) => {
      test.setTimeout(30000); // 30 seconds for complex multiple reset flow
      const testEmail = `e2e-multiple-${generateTestId('user')}@example.com`;

      // Create a test user
      const hashedPassword = await bcrypt.hash('OriginalPass123!', 12);
      const testUser = await prisma.user.create({
        data: {
          email: testEmail,
          name: 'E2E Multiple Test User',
          password: hashedPassword,
          isActive: true,
          role: 'USER'
        }
      });

      try {
        // First password reset request
        await page.goto(`${BASE_URL}/forgot-password`);
        await page.fill('input[name="email"]', testEmail);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*forgot-password-success/);
        
        // Get first token
        const firstToken = await prisma.passwordResetToken.findFirst({
          where: { email: testEmail }
        });
        expect(firstToken).toBeTruthy();
        
        // Second password reset request (should invalidate first)
        await page.goto(`${BASE_URL}/forgot-password`);
        await page.fill('input[name="email"]', testEmail);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/.*forgot-password-success/);
        
        // Get second token
        const secondToken = await prisma.passwordResetToken.findFirst({
          where: { email: testEmail }
        });
        expect(secondToken).toBeTruthy();
        expect(secondToken!.token).not.toBe(firstToken!.token);
        
        // First token should no longer exist
        const oldToken = await prisma.passwordResetToken.findUnique({
          where: { token: firstToken!.token }
        });
        expect(oldToken).toBeNull();
        
        // Use second token to reset password
        await page.goto(`${BASE_URL}/reset-password?token=${secondToken!.token}`);
        await page.fill('input[name="password"]', 'NewPassword123!');
        await page.fill('input[name="confirmPassword"]', 'NewPassword123!');
        await page.click('button[type="submit"]');
        
        // Should succeed
        await expect(page.locator('.bg-green-50')).toContainText('Password reset successful!');
        
      } finally {
        // Clean up test data
        await prisma.passwordResetToken.deleteMany({
          where: { email: testEmail }
        });
        await prisma.auditLog.deleteMany({
          where: { userId: testUser.id }
        });
        await prisma.user.delete({
          where: { id: testUser.id }
        });
      }
    });
  });

test.describe('Password Reset E2E Tests - UX Compliance', () => {
  test.describe('Forgot Password Flow', () => {
    test('should complete forgot password flow with UX compliance', async ({ page }) => {
      const testEmail = `e2e-reset-${generateTestId('user')}@example.com`;

      // Navigate to forgot password page
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Verify UX compliance - heading hierarchy (UX spec: use h2)
      await expect(page).toHaveTitle(/APIQ/);
      await expect(page.locator('h2')).toContainText('Forgot your password?');
      
      // Verify UX compliance - form fields with proper labels
      await expect(page.locator('label[for="email"]')).toContainText('Email address');
      await expect(page.locator('input[name="email"]')).toHaveAttribute('type', 'email');
      await expect(page.locator('input[name="email"]')).toHaveAttribute('required');
      
      // Verify UX compliance - descriptive button text
      await expect(page.locator('button[type="submit"]')).toContainText('Send Reset Link');
      
      // Fill email form
      await page.fill('input[name="email"]', testEmail);
      
      // Click and simultaneously watch for the "Sending..." state
      await Promise.all([
        page.waitForFunction(() => {
          const btn = document.querySelector('button[type="submit"]');
          return btn?.textContent?.includes('Sending...');
        }, { timeout: 2000 }),
        page.click('button[type="submit"]'),
      ]);
      
      // Confirm loading UI
      const submitBtn = page.locator('button[type="submit"]');
      await expect(submitBtn).toBeDisabled();
      await expect(submitBtn).toHaveText(/Sending.../);
      
      // Should redirect to success page
      await expect(page).toHaveURL(/.*forgot-password-success/);
      
      // Verify UX compliance - success page heading hierarchy (UX spec: use h2)
      await expect(page.locator('h2')).toContainText('Reset Link Sent!');
      await expect(page.locator('p.font-medium')).toContainText(testEmail);
      
      // Verify UX compliance - success page elements
      await expect(page.locator('text=We\'ve sent a password reset link to:')).toBeVisible();
      await expect(page.locator('text=Security Note')).toBeVisible();
      await expect(page.locator('text=What happens next?')).toBeVisible();
      await expect(page.locator('text=Check your email')).toBeVisible();
      await expect(page.locator('text=Click the reset link')).toBeVisible();
      await expect(page.locator('strong:has-text("Sign in")')).toBeVisible();
      
      // Verify UX compliance - navigation links
      await expect(page.locator('a[href="/login"]')).toContainText('Back to Sign In');
      await expect(page.locator('a[href="/forgot-password"]')).toContainText('Try Different Email');
    });

    test('should handle forgot password validation errors with UX compliance', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Test invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      
      // Verify UX compliance - accessible error container (UX spec: .bg-red-50)
      await page.waitForTimeout(1000);
      await expect(page.locator('.bg-red-50')).toBeVisible();
      
      // Test missing email
      await page.fill('input[name="email"]', '');
      await page.click('button[type="submit"]');
      await expect(page.locator('.bg-red-50')).toBeVisible();
    });

    test('should validate email field requirements with UX compliance', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toBeVisible();
      
      // Verify UX compliance - proper input attributes
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(emailInput).toHaveAttribute('required');
      await expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');
    });

    test('should handle loading states during password reset request with UX compliance', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Fill form
      await page.fill('input[name="email"]', 'test@example.com');
      
      // Click and simultaneously watch for the "Sending..." state
      await Promise.all([
        page.waitForFunction(() => {
          const btn = document.querySelector('button[type="submit"]');
          return btn?.textContent?.includes('Sending...');
        }, { timeout: 2000 }),
        page.click('button[type="submit"]'),
      ]);
      
      // Confirm loading UI
      const submitBtn = page.locator('button[type="submit"]');
      await expect(submitBtn).toBeDisabled();
      await expect(submitBtn).toHaveText(/Sending.../);
      
      // Final success screen
      await expect(page).toHaveURL(/forgot-password-success/);
    });

    test('should provide helpful error messages with UX compliance', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Test invalid email format
      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      
      // Verify UX compliance - accessible error container (UX spec: .bg-red-50)
      await page.waitForTimeout(1000);
      await expect(page.locator('.bg-red-50')).toBeVisible();
    });
  });

  test.describe('Password Reset Page - UX Compliance', () => {
    test('should handle password reset with valid token and UX compliance', async ({ page }) => {
      // This test would require a real reset token
      // For E2E testing, we'll test the reset page UI
      const testToken = `${TEST_TOKEN_PREFIX}-${generateTestId()}`;
      const newPassword = `newPassword${generateTestId()}`;
      
      await page.goto(`${BASE_URL}/reset-password?token=${testToken}`);
      
      // Verify UX compliance - heading hierarchy (UX spec: use h2)
      await expect(page).toHaveTitle(/APIQ/);
      await expect(page.locator('h2')).toContainText('Reset your password');
      await expect(page.locator('button[type="submit"]')).toContainText('Reset Password');
      
      // Verify UX compliance - form fields with proper labels
      await expect(page.locator('label[for="password"]')).toContainText('New password');
      await expect(page.locator('label[for="confirmPassword"]')).toContainText('Confirm password');
      await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
      await expect(page.locator('input[name="confirmPassword"]')).toHaveAttribute('type', 'password');
      
      // Fill password form
      await page.fill('input[name="password"]', newPassword);
      await page.fill('input[name="confirmPassword"]', newPassword);
      
      // Click and simultaneously watch for the "Resetting..." state
      await Promise.all([
        page.waitForFunction(() => {
          const btn = document.querySelector('button[type="submit"]');
          return btn?.textContent?.includes('Resetting...');
        }, { timeout: 2000 }),
        page.click('button[type="submit"]'),
      ]);
      
      // Confirm loading UI
      const submitBtn = page.locator('button[type="submit"]');
      await expect(submitBtn).toBeDisabled();
      await expect(submitBtn).toHaveText(/Resetting.../);
      
      // Should show success message or redirect
      await expect(page).toHaveURL(/.*reset-password/);
    });

    test('should handle password reset with invalid token and UX compliance', async ({ page }) => {
      const invalidToken = `${INVALID_TOKEN_PREFIX}-${generateTestId()}`;
      await page.goto(`${BASE_URL}/reset-password?token=${invalidToken}`);
      await expect(page.getByTestId('validation-errors').filter({ hasText: 'Missing or invalid reset token.' })).toBeVisible();
      await expect(page.getByTestId('password-input')).toBeDisabled();
      await expect(page.getByTestId('confirm-password-input')).toBeDisabled();
      await expect(page.getByTestId('submit-reset-btn')).toBeDisabled();
    });

    test('should handle missing reset token with UX compliance', async ({ page }) => {
      await page.goto(`${BASE_URL}/reset-password`);
      await expect(page.getByTestId('validation-errors').filter({ hasText: 'Missing or invalid reset token.' })).toBeVisible();
      await expect(page.getByTestId('password-input')).toBeDisabled();
      await expect(page.getByTestId('confirm-password-input')).toBeDisabled();
      await expect(page.getByTestId('submit-reset-btn')).toBeDisabled();
    });

    test('should validate password reset form with UX compliance', async ({ page }) => {
      const testToken = `${TEST_TOKEN_PREFIX}-123`;
      await page.goto(`${BASE_URL}/reset-password?token=${testToken}`);
      
      // Test password mismatch - both fields should be invalid since both are involved
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.fill('[data-testid="confirm-password-input"]', 'differentpassword');
      await page.click('[data-testid="submit-reset-btn"]');
      
      // Assert error container and specific error
      await expect(page.getByTestId('validation-errors').filter({ hasText: 'Passwords do not match.' })).toBeVisible();
      await expect(page.getByTestId('password-input')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByTestId('confirm-password-input')).toHaveAttribute('aria-invalid', 'true');
      
      // Test weak password - only password field should be invalid (better UX)
      await page.fill('[data-testid="password-input"]', '123');
      await page.fill('[data-testid="confirm-password-input"]', '123');
      await page.click('[data-testid="submit-reset-btn"]');
      await expect(page.getByTestId('validation-errors')).toBeVisible();
      await expect(page.getByTestId('password-input')).toHaveAttribute('aria-invalid', 'true');
      // Confirm password field should NOT be invalid when passwords match but password is weak
      await expect(page.getByTestId('confirm-password-input')).not.toHaveAttribute('aria-invalid', 'true');
      
      // Test missing passwords - both fields should be invalid
      await page.fill('[data-testid="password-input"]', '');
      await page.fill('[data-testid="confirm-password-input"]', '');
      await page.click('[data-testid="submit-reset-btn"]');
      await expect(page.getByTestId('validation-errors')).toBeVisible();
      await expect(page.getByTestId('password-input')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByTestId('confirm-password-input')).toHaveAttribute('aria-invalid', 'true');
    });

    test('should validate form field requirements with UX compliance', async ({ page }) => {
      const testToken = `${TEST_TOKEN_PREFIX}-123`;
      await page.goto(`${BASE_URL}/reset-password?token=${testToken}`);
      
      // Check that form fields exist with proper attributes
      const passwordInput = page.locator('input[name="password"]');
      const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
      
      await expect(passwordInput).toBeVisible();
      await expect(confirmPasswordInput).toBeVisible();
      
      // Verify UX compliance - proper input attributes
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      await expect(passwordInput).toHaveAttribute('required');
      await expect(confirmPasswordInput).toHaveAttribute('required');
    });

    test('should handle loading states during password reset with UX compliance', async ({ page }) => {
      const testToken = `${TEST_TOKEN_PREFIX}-123`;
      await page.goto(`${BASE_URL}/reset-password?token=${testToken}`);
      
      // Fill form
      await page.fill('input[name="password"]', 'newpassword123');
      await page.fill('input[name="confirmPassword"]', 'newpassword123');
      
      // Click and simultaneously watch for the "Resetting..." state
      await Promise.all([
        page.waitForFunction(() => {
          const btn = document.querySelector('button[type="submit"]');
          return btn?.textContent?.includes('Resetting...');
        }, { timeout: 2000 }),
        page.click('button[type="submit"]'),
      ]);
      
      // Confirm loading UI
      const submitBtn = page.locator('button[type="submit"]');
      await expect(submitBtn).toBeDisabled();
      await expect(submitBtn).toHaveText(/Resetting.../);
    });
  });

  test.describe('Forgot Password Success Page - UX Compliance', () => {
    test('should display success page correctly with UX compliance', async ({ page }) => {
      test.setTimeout(20000); // 20 seconds for page navigation under load
      const testEmail = 'test@example.com';
      await page.goto(`${BASE_URL}/forgot-password-success?email=${encodeURIComponent(testEmail)}`);
      
      // Should show success page
      await expect(page).toHaveURL(/.*forgot-password-success/);
      
      // Verify UX compliance - heading hierarchy (UX spec: use h2)
      await expect(page.locator('h2')).toContainText('Reset Link Sent!');
      
      // Verify UX compliance - navigation links
      await expect(page.locator('a[href="/login"]')).toContainText('Back to Sign In');
      await expect(page.locator('a[href="/forgot-password"]')).toContainText('Try Different Email');
    });

    test('should handle missing email parameter gracefully with UX compliance', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password-success`);
      
      // Should still show success page
      await expect(page).toHaveURL(/.*forgot-password-success/);
      
      // Verify UX compliance - heading hierarchy (UX spec: use h2)
      await expect(page.locator('h2')).toContainText('Reset Link Sent!');
    });

    test('should provide navigation options with UX compliance', async ({ page }) => {
      const testEmail = 'test@example.com';
      await page.goto(`${BASE_URL}/forgot-password-success?email=${encodeURIComponent(testEmail)}`);
      
      // Verify UX compliance - navigation links
      await expect(page.locator('a[href="/login"]')).toContainText('Back to Sign In');
      await expect(page.locator('a[href="/forgot-password"]')).toContainText('Try Different Email');
    });

    test('should display success icon with UX compliance', async ({ page }) => {
      const testEmail = 'test@example.com';
      await page.goto(`${BASE_URL}/forgot-password-success?email=${encodeURIComponent(testEmail)}`);
      
      // Check for the success icon (email icon) - be specific about which SVG
      const successIcon = page.locator('svg.h-6.w-6.text-green-600');
      await expect(successIcon).toBeVisible();
    });
  });

  test.describe('Accessibility & UX Compliance', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // First verify the email input exists and is focusable
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();
      
      // Test keyboard navigation - focus the email input
      await emailInput.focus();
      await expect(emailInput).toBeFocused();
      
      // Test tab navigation to next element (submit button)
      await page.keyboard.press('Tab');
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeFocused();
      
      // Test form submission with keyboard - should trigger validation for empty field
      await page.keyboard.press('Enter');
      await expect(page.locator('.bg-red-50')).toBeVisible();
      await expect(page.locator('.bg-red-50')).toContainText('Email is required');
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Test form accessibility - focus on valid ARIA attributes
      await expect(page.locator('input[name="email"]')).toHaveAttribute('aria-required', 'true');
      await expect(page.locator('input[name="email"]')).toHaveAttribute('type', 'email');
    });

    test('should be mobile responsive', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('h2')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      });
    });
  });
}); 