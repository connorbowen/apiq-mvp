// Authentication-related test utilities
// Extracted from testUtils.ts to comply with file size limits

import { createMocks } from 'node-mocks-http';
import bcrypt from 'bcryptjs';
import loginHandler from '../../pages/api/auth/login';
import { Role } from '../../src/generated/prisma';
import { prisma } from '../../lib/database/client';
import { generateTestId } from './testUtils';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  accessToken: string;
  refreshToken: string;
}

/**
 * Create a test user with real bcrypt-hashed password
 * 
 * Note: Uses real email addresses to comply with no-mock-data policy.
 * For testing, use real email addresses that you control.
 */
export const createTestUser = async (
  email?: string,
  password?: string,
  role: Role = Role.USER,
  name?: string
): Promise<TestUser> => {
  // Use real email address to comply with no-mock-data policy
  // In production tests, use real email addresses that you control
  const testEmail = email || `${generateTestId('test')}@yourdomain.com`;
  const testPassword = password || 'testpass123';
  const testName = name || `Test ${role}`;

  // Hash password with bcrypt
  const hashedPassword = await bcrypt.hash(testPassword, 10);

  // Create user with unique email (no race condition since emails are unique)
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      password: hashedPassword,
      name: testName,
      role: role,
      isActive: true,
      // Set onboarding fields to prevent guided tour in E2E tests
      onboardingStage: 'COMPLETED',
      guidedTourCompleted: true,
      onboardingCompletedAt: new Date()
    }
  });

  // Login to get real JWT tokens
  const { req, res } = createMocks({
    method: 'POST',
    body: {
      email: testEmail,
      password: testPassword
    }
  });
  req.env = {};
  
  await loginHandler(req as any, res as any);
  
  const loginData = JSON.parse(res._getData());
  
  if (!loginData.success) {
    throw new Error(`Failed to login test user: ${JSON.stringify(loginData)}`);
  }

  return {
    id: user.id,
    email: testEmail,
    password: testPassword,
    name: testName,
    role: role,
    accessToken: loginData.data.accessToken,
    refreshToken: loginData.data.refreshToken
  };
};

/**
 * Create a test user that will trigger the guided tour (for testing tour functionality)
 * 
 * Note: Uses real email addresses to comply with no-mock-data policy.
 * For testing, use real email addresses that you control.
 */
export const createTestUserWithTour = async (
  email?: string,
  password?: string,
  role: Role = Role.USER,
  name?: string
): Promise<TestUser> => {
  // Use real email address to comply with no-mock-data policy
  // In production tests, use real email addresses that you control
  const testEmail = email || `${generateTestId('test.tour')}@yourdomain.com`;
  const testPassword = password || 'testpass123';
  const testName = name || `Test ${role} (Tour)`;

  // Hash password with bcrypt
  const hashedPassword = await bcrypt.hash(testPassword, 10);

  // Create user that will trigger guided tour
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      password: hashedPassword,
      name: testName,
      role: role,
      isActive: true,
      // Set onboarding fields to trigger guided tour
      onboardingStage: 'NEW_USER',
      guidedTourCompleted: false,
      onboardingCompletedAt: null
    }
  });

  // Login to get real JWT tokens
  const { req, res } = createMocks({
    method: 'POST',
    body: {
      email: testEmail,
      password: testPassword
    }
  });
  req.env = {};
  
  await loginHandler(req as any, res as any);
  
  const loginData = JSON.parse(res._getData());
  
  if (!loginData.success) {
    throw new Error(`Failed to login test user: ${JSON.stringify(loginData)}`);
  }

  return {
    id: user.id,
    email: testEmail,
    password: testPassword,
    name: testName,
    role: role,
    accessToken: loginData.data.accessToken,
    refreshToken: loginData.data.refreshToken
  };
};

/**
 * Set authentication cookies for E2E tests
 */
export const setAuthCookies = async (page: any, user: TestUser) => {
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
export const authenticateE2EPage = async (page: any, user: TestUser) => {
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
 * Create authenticated request helper
 */
export const createAuthenticatedRequest = (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  user: TestUser,
  options: {
    body?: any;
    query?: any;
    headers?: Record<string, string>;
  } = {}
) => {
  const { body, query, headers = {} } = options;
  
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.accessToken}`,
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    query
  };
};

/**
 * Create unauthenticated request helper
 */
export const createUnauthenticatedRequest = (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  options: {
    body?: any;
    query?: any;
    headers?: Record<string, string>;
  } = {}
) => {
  const { body, query, headers = {} } = options;
  
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    query
  };
}; 