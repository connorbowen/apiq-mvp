// Authentication helpers for APIQ E2E tests
// See docs/e2e-helpers-refactor-plan.md for details

import { Page } from '@playwright/test';
import { Role } from '../../src/generated/prisma';
import { TestUser } from './testUtils';
import { createTestUser } from './testUtils';

/**
 * Options for creating a test user
 */
export interface CreateUserOptions {
  email?: string;
  password?: string;
  role?: Role;
  name?: string;
}

/**
 * Create a test user specifically for E2E tests
 */
export const createE2EUser = async (
  role: Role = Role.USER,
  options: CreateUserOptions = {}
): Promise<TestUser> => {
  const { email, password, name } = options;
  return await createTestUser(email, password, role, name);
};

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
      httpOnly: true,
      secure: false, // false for localhost testing
      sameSite: 'Lax'
    },
    {
      name: 'refreshToken',
      value: user.refreshToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
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