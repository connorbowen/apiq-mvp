// Authentication utility helpers - extracted from authHelpers.ts
// Focused on authentication utilities and database operations

import { Page, expect } from '@playwright/test';
import { TestUser } from './testUtils.auth';

/**
 * Set authentication cookies for E2E tests
 */
export const setAuthCookies = async (page: Page, user: TestUser): Promise<void> => {
  await page.context().addCookies([
    {
      name: 'accessToken',
      value: user.accessToken,
      domain: 'localhost',
      path: '/',
      httpOnly: false, // false for E2E tests to allow document.cookie access
      secure: false, // false for localhost testing
      sameSite: 'Lax'
    },
    {
      name: 'refreshToken',
      value: user.refreshToken,
      domain: 'localhost',
      path: '/',
      httpOnly: false, // false for E2E tests to allow document.cookie access
      secure: false, // false for localhost testing
      sameSite: 'Lax'
    }
  ]);
};

/**
 * Authenticate E2E page using secure cookie-based authentication
 */
export const authenticateE2EPage = async (page: Page, user: TestUser): Promise<void> => {
  // Navigate to the site first to establish the origin
  await page.goto('http://localhost:3000');

  // Set cookies for the established origin
  await setAuthCookies(page, user);

  // Navigate to dashboard with cookies set
  await page.goto('http://localhost:3000/dashboard');

  // Reload to ensure cookies are properly attached
  await page.reload();

  // Wait for dashboard to load
  try {
    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });
  } catch (error) {
    // Check if we're on login page instead
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      throw new Error('Authentication failed - redirected to login page');
    }
    throw error;
  }
};

/**
 * Update user email verification status in database (test-only)
 */
export const updateUserEmailVerification = async (
  email: string,
  verified: boolean = true
): Promise<void> => {
  const { prisma } = require('../../lib/database/client');
  
  await prisma.user.update({
    where: { email },
    data: { emailVerified: verified },
  });
};

/**
 * Logout user from the application
 */
export const logoutUser = async (page: Page): Promise<void> => {
  // Click user dropdown
  await page.getByTestId('user-dropdown-toggle').click();
  
  // Click logout
  await page.getByTestId('user-dropdown-logout').click();
  
  // Wait for redirect to login page
  await page.waitForURL(/.*login/, { timeout: 10000 });
  
  // Verify we're on login page
  await expect(page.getByLabel('Email address')).toBeVisible();
};

/**
 * Test password reset functionality
 */
export const testPasswordReset = async (
  page: Page,
  email: string = 'test@testuser.local'
): Promise<void> => {
  // Navigate to forgot password page
  await page.goto('/forgot-password');
  
  // Fill email
  await page.getByLabel('Email address').fill(email);
  
  // Submit form
  await page.getByTestId('primary-action send-reset-link-btn').click();
  
  // Wait for success message
  await expect(page.getByText('Reset Link Sent!')).toBeVisible();
  
  // Verify we're on success page
  await expect(page).toHaveURL(/.*forgot-password-success/);
};

/**
 * Test invalid login attempts
 */
export const testInvalidLogin = async (
  page: Page,
  email: string = 'invalid@testuser.local',
  password: string = 'wrongpassword'
): Promise<void> => {
  // Navigate to login
  await page.goto('/login');
  
  // Fill invalid credentials
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  
  // Submit form
  await page.getByTestId('primary-action signin-btn').click();
  
  // Wait for error message
  await expect(page.getByText('Invalid credentials')).toBeVisible();
  
  // Verify we're still on login page
  await expect(page).toHaveURL(/.*login/);
}; 