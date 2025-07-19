/**
 * Password Reset Test Helpers
 * 
 * These helpers encapsulate common password reset testing patterns
 * to reduce duplication and improve maintainability across E2E tests.
 */

import { Page, expect } from '@playwright/test';
import { prisma } from '../../lib/database/client';
import { TestUser } from './testUtils';
import { getPrimaryActionButton } from './e2eHelpers';
import { waitForDashboard, waitForElement } from './uiHelpers';

export interface PasswordResetFlowOptions {
  baseUrl?: string;
  validateSuccess?: boolean;
  validateAuditLogs?: boolean;
  cleanupAfterTest?: boolean;
}

export interface PasswordResetToken {
  id: string;
  email: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Request a password reset for a given email
 */
export const requestPasswordReset = async (
  page: Page,
  email: string,
  baseUrl: string = 'http://localhost:3000'
): Promise<void> => {
  await page.goto(`${baseUrl}/forgot-password`);
  await page.fill('input[name="email"]', email);
  await getPrimaryActionButton(page, 'send-reset-link').click();
  
  // Wait for success page
  await expect(page).toHaveURL(/.*forgot-password-success/, { timeout: 10000 });
  await expect(page.locator('h2')).toContainText('Reset Link Sent!');
};

/**
 * Get the password reset token for a given email from the database
 */
export const getPasswordResetToken = async (email: string): Promise<PasswordResetToken | null> => {
  const token = await prisma.passwordResetToken.findFirst({
    where: { email }
  });
  
  return token;
};

/**
 * Expire a password reset token by setting its expiration to the past
 */
export const expirePasswordResetToken = async (tokenId: string): Promise<void> => {
  await prisma.passwordResetToken.update({
    where: { id: tokenId },
    data: { expiresAt: new Date(Date.now() - 60 * 60 * 1000) } // 1 hour ago
  });
};

/**
 * Complete password reset using a token
 */
export const completePasswordReset = async (
  page: Page,
  token: string,
  newPassword: string,
  baseUrl: string = 'http://localhost:3000'
): Promise<void> => {
  await page.goto(`${baseUrl}/reset-password?token=${token}`);
  
  // Wait for form to be enabled
  await waitForElement(page, 'input[name="password"]');
  
  // Fill password form
  await page.fill('input[name="password"]', newPassword);
  await page.fill('input[name="confirmPassword"]', newPassword);
  
  // Submit form
  await getPrimaryActionButton(page, 'reset-password').click();
  
  // Wait for success message
  await expect(page.locator('.bg-green-50')).toContainText('Password reset successful!');
  
  // Should redirect to login page
  await expect(page).toHaveURL(/.*login/);
};

/**
 * Verify that a password reset token was deleted from the database
 */
export const verifyTokenDeleted = async (token: string): Promise<void> => {
  const deletedToken = await prisma.passwordResetToken.findUnique({
    where: { token }
  });
  expect(deletedToken).toBeNull();
};

/**
 * Verify audit logs were created for password reset operations
 */
export const verifyPasswordResetAuditLogs = async (
  userId: string,
  expectedActions: string[] = ['REQUEST_PASSWORD_RESET', 'PASSWORD_RESET']
): Promise<void> => {
  const auditLogs = await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  
  expect(auditLogs.length).toBeGreaterThanOrEqual(expectedActions.length);
  
  for (const action of expectedActions) {
    expect(auditLogs.some((log: any) => log.action === action)).toBe(true);
  }
};

/**
 * Clean up password reset test data
 */
export const cleanupPasswordResetTestData = async (
  email: string,
  userId?: string
): Promise<void> => {
  // Clean up tokens
  await prisma.passwordResetToken.deleteMany({
    where: { email }
  });
  
  // Clean up audit logs if userId provided
  if (userId) {
    await prisma.auditLog.deleteMany({
      where: { userId }
    });
  }
  
  // Clean up user if userId provided
  if (userId) {
    await prisma.user.delete({
      where: { id: userId }
    });
  }
};

/**
 * Complete the full password reset flow from request to login verification
 */
export const completeFullPasswordResetFlow = async (
  page: Page,
  testUser: TestUser,
  newPassword: string,
  options: PasswordResetFlowOptions = {}
): Promise<void> => {
  const {
    baseUrl = 'http://localhost:3000',
    validateSuccess = true,
    validateAuditLogs = true,
    cleanupAfterTest = true
  } = options;
  
  try {
    // Step 1: Request password reset
    await requestPasswordReset(page, testUser.email, baseUrl);
    
    // Step 2: Get the reset token from database
    const resetToken = await getPasswordResetToken(testUser.email);
    expect(resetToken).toBeTruthy();
    expect(resetToken?.token).toBeTruthy();
    
    // Step 3: Complete password reset
    await completePasswordReset(page, resetToken!.token, newPassword, baseUrl);
    
    // Step 4: Verify old password no longer works
    await page.goto(`${baseUrl}/login`);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await getPrimaryActionButton(page, 'signin').click();
    
    // Should show error for old password
    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page.locator('.bg-red-50')).toContainText(/Invalid credentials|Login failed/);
    
    // Step 5: Verify new password works
    await page.fill('input[name="password"]', newPassword);
    await getPrimaryActionButton(page, 'signin').click();
    
    // Should successfully login and redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
    await waitForDashboard(page);
    
    // Step 6: Verify token was deleted
    if (validateSuccess) {
      await verifyTokenDeleted(resetToken!.token);
    }
    
    // Step 7: Verify audit logs were created
    if (validateAuditLogs) {
      await verifyPasswordResetAuditLogs(testUser.id);
    }
    
  } finally {
    // Clean up test data
    if (cleanupAfterTest) {
      await cleanupPasswordResetTestData(testUser.email, testUser.id);
    }
  }
};

/**
 * Test password reset with expired token
 */
export const testExpiredTokenPasswordReset = async (
  page: Page,
  testUser: TestUser,
  baseUrl: string = 'http://localhost:3000'
): Promise<void> => {
  try {
    // Request password reset
    await requestPasswordReset(page, testUser.email, baseUrl);
    
    // Get the reset token
    const resetToken = await getPasswordResetToken(testUser.email);
    expect(resetToken).toBeTruthy();
    
    // Expire the token
    await expirePasswordResetToken(resetToken!.id);
    
    // Try to use expired token
    await page.goto(`${baseUrl}/reset-password?token=${resetToken!.token}`);
    
    // Fill in new password
    await page.fill('input[name="password"]', 'NewPassword123!');
    await page.fill('input[name="confirmPassword"]', 'NewPassword123!');
    
    // Submit form
    await getPrimaryActionButton(page, 'reset-password').click();
    
    // Should show error for expired token
    await expect(page.locator('.bg-red-50')).toContainText(/expired|invalid/i);
    
    // Should show disabled form fields and button
    await expect(page.locator('input[name="password"]')).toBeDisabled();
    await expect(page.locator('input[name="confirmPassword"]')).toBeDisabled();
    await expect(getPrimaryActionButton(page, 'reset-password')).toBeDisabled();
    
    // Should show a link to request a new reset
    await expect(page.locator('a[href="/forgot-password"]')).toContainText(/request a new password reset/i);
    
  } finally {
    // Clean up test data
    await cleanupPasswordResetTestData(testUser.email, testUser.id);
  }
};

/**
 * Test multiple password reset requests (should invalidate previous tokens)
 */
export const testMultiplePasswordResetRequests = async (
  page: Page,
  testUser: TestUser,
  baseUrl: string = 'http://localhost:3000'
): Promise<void> => {
  try {
    // First password reset request
    await requestPasswordReset(page, testUser.email, baseUrl);
    
    // Get first token
    const firstToken = await getPasswordResetToken(testUser.email);
    expect(firstToken).toBeTruthy();
    
    // Second password reset request (should invalidate first)
    await requestPasswordReset(page, testUser.email, baseUrl);
    
    // Get second token
    const secondToken = await getPasswordResetToken(testUser.email);
    expect(secondToken).toBeTruthy();
    expect(secondToken!.token).not.toBe(firstToken!.token);
    
    // First token should no longer exist
    const oldToken = await prisma.passwordResetToken.findUnique({
      where: { token: firstToken!.token }
    });
    expect(oldToken).toBeNull();
    
    // Use second token to reset password
    await completePasswordReset(page, secondToken!.token, 'NewPassword123!', baseUrl);
    
  } finally {
    // Clean up test data
    await cleanupPasswordResetTestData(testUser.email, testUser.id);
  }
}; 