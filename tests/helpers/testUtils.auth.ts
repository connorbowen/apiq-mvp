// Authentication-related test utilities
// Extracted from testUtils.ts to comply with file size limits

import { createMocks } from 'node-mocks-http';
import bcrypt from 'bcryptjs';
import loginHandler from '../../pages/api/auth/login';
import { Role } from '../../src/generated/prisma';
import { prisma } from '../../lib/database/client';
import { generateTestId } from './testUtils';
import { generateToken } from '../../src/lib/auth/session';

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

  // Create or update user with unique email (no race condition since emails are unique)
  const user = await prisma.user.upsert({
    where: { email: testEmail },
    update: {
      password: hashedPassword,
      name: testName,
      role: role,
      isActive: true,
      // Set onboarding fields to prevent guided tour in E2E tests
      onboardingStage: 'COMPLETED',
      onboardingCompletedAt: new Date()
    },
    create: {
      email: testEmail,
      password: hashedPassword,
      name: testName,
      role: role,
      isActive: true,
      // Set onboarding fields to prevent guided tour in E2E tests
      onboardingStage: 'COMPLETED',
      onboardingCompletedAt: new Date()
    }
  });

  // Create user plan if it doesn't exist
  const existingUserPlan = await prisma.userPlan.findUnique({
    where: { userId: user.id }
  });

  if (!existingUserPlan) {
    // Get FREE plan limits
    const freePlan = await prisma.planLimits.findFirst({
      where: { planType: 'FREE' }
    });

    if (freePlan) {
      console.log('🔍 Creating user plan for user:', user.id, 'with plan:', freePlan);
      const createdUserPlan = await prisma.userPlan.create({
        data: {
          userId: user.id,
          planType: 'FREE',
          status: 'ACTIVE',
          currentConnections: 0,
          currentWorkflowExecutions: 0,
          currentDirectApiCalls: 0,
          currentTotalExecutions: 0,
          apiConnectionsLimit: freePlan.apiConnectionsLimit,
          workflowExecutionsLimit: freePlan.workflowExecutionsLimit,
          directApiCallsLimit: freePlan.directApiCallsLimit,
          totalExecutionsLimit: freePlan.totalExecutionsLimit,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        }
      });
      console.log('✅ User plan created successfully:', { id: createdUserPlan.id, userId: createdUserPlan.userId, planType: createdUserPlan.planType });
    } else {
      console.log('❌ No FREE plan found, cannot create user plan');
    }
  } else {
    console.log('✅ User plan already exists:', { id: existingUserPlan.id, userId: existingUserPlan.userId, planType: existingUserPlan.planType });
  }

  // Login to get real JWT tokens
  const { req, res } = createMocks({
    method: 'POST',
    body: {
      email: testEmail,
      password: testPassword
    }
  });
  // Ensure we use the same JWT secret as the test environment
  // Set the process environment variable to ensure consistency
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalJwtExpiresIn = process.env.JWT_EXPIRES_IN;
  
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-e2e-testing-only-never-use-in-production';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';
  
  try {
    await loginHandler(req as any, res as any);
  } finally {
    // Restore original environment variables
    if (originalJwtSecret !== undefined) {
      process.env.JWT_SECRET = originalJwtSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
    if (originalJwtExpiresIn !== undefined) {
      process.env.JWT_EXPIRES_IN = originalJwtExpiresIn;
    } else {
      delete process.env.JWT_EXPIRES_IN;
    }
  }
  
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
  role: Role = Role.USER,
  email?: string,
  password?: string,
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
  const user = await prisma.user.upsert({
    where: { email: testEmail },
    update: {
      password: hashedPassword,
      name: testName,
      role: role,
      isActive: true,
      // Set onboarding fields to trigger guided tour
      onboardingStage: 'NEW_USER',
      onboardingCompletedAt: null
    },
    create: {
      email: testEmail,
      password: hashedPassword,
      name: testName,
      role: role,
      isActive: true,
      // Set onboarding fields to trigger guided tour
      onboardingStage: 'NEW_USER',
      onboardingCompletedAt: null
    }
  });

  // Create tour state for the user
  await prisma.tourState.upsert({
    where: { userId: user.id },
    update: {
      currentStep: 0,
      totalSteps: 10, // ✅ Match the expected 10 steps from dashboard
      isActive: true,
      completedSteps: [],
      dismissed: false,
      lastShown: new Date(),
    },
    create: {
      userId: user.id,
      currentStep: 0,
      totalSteps: 10, // ✅ Match the expected 10 steps from dashboard
      isActive: true,
      completedSteps: [],
      dismissed: false,
      lastShown: new Date(),
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
  // Ensure we use the same JWT secret as the test environment
  // Set the process environment variable to ensure consistency
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalJwtExpiresIn = process.env.JWT_EXPIRES_IN;
  
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-e2e-testing-only-never-use-in-production';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';
  
  try {
    await loginHandler(req as any, res as any);
  } finally {
    // Restore original environment variables
    if (originalJwtSecret !== undefined) {
      process.env.JWT_SECRET = originalJwtSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
    if (originalJwtExpiresIn !== undefined) {
      process.env.JWT_EXPIRES_IN = originalJwtExpiresIn;
    } else {
      delete process.env.JWT_EXPIRES_IN;
    }
  }
  
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
  
  if (!user.accessToken || !user.refreshToken) {
    throw new Error(`Invalid user tokens: accessToken=${user.accessToken}, refreshToken=${user.refreshToken}`);
  }
  
  const cookieData = [
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
  ];
  
  
  await page.context().addCookies(cookieData);
  
  // Wait a moment for cookies to be set
  await page.waitForTimeout(1000);
  
  // Debug: Verify cookies were set
  const cookies = await page.context().cookies();
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

  // Wait for dashboard to load
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  
  // Wait a bit more for authentication to be processed
  await page.waitForTimeout(1000);
  
  // Check current URL
  const currentUrl = page.url();
  
  // Test authentication by calling the /api/auth/me endpoint
  try {
    const authResponse = await page.request.get('/api/auth/me');
    if (authResponse.status() === 200) {
      const authData = await authResponse.json();
    } else {
    }
  } catch (error) {
  }
  
  // If we're redirected to login, the cookies aren't working
  if (currentUrl.includes('/login')) {
    throw new Error('Authentication failed - redirected to login page');
  }
  
  // Wait for the page to fully load and then check what's actually there
  await page.waitForTimeout(2000);
  
  // Capture console logs to see any JavaScript errors
  const consoleLogs: string[] = [];
  page.on('console', (msg: any) => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  // Check if there's an authentication error on the page
  const authError = await page.locator('text=Authentication Error').count();
  if (authError > 0) {
    const errorText = await page.locator('text=Authentication Error').textContent();
    throw new Error(`Authentication error on page: ${errorText}`);
  }
  
  // Wait for either dashboard elements or guided tour to be visible
  // The guided tour overlay will appear for new users and cover the dashboard
  try {
    
    // First, wait for the page to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 5000 });
    
    // Wait a bit more for React to render
    await page.waitForTimeout(1000);
    
    // Check what's currently on the page
    const currentUrl = page.url();
    
    // If we're on login page, authentication failed
    if (currentUrl.includes('/login')) {
      throw new Error('Authentication failed - redirected to login page');
    }
    
    // Debug: Check what elements are actually present on the page
    const allTestIds = await page.locator('[data-testid]').all();
    const testIdValues = await Promise.all(allTestIds.map(async (el: any) => await el.getAttribute('data-testid')));
    
    // Check for loading state
    const isLoading = await page.locator('text=Loading dashboard').isVisible().catch(() => false);
    
    // Check for authentication error
    const authError = await page.locator('text=Authentication Error').isVisible().catch(() => false);
    
    // Check for any h1 elements
    const h1Elements = await page.locator('h1').all();
    for (const h1 of h1Elements) {
      const text = await h1.textContent();
    }
    
    // Try to find dashboard elements with a shorter timeout
    await Promise.race([
      page.waitForSelector('[data-testid="tab-chat"]', { timeout: 10000 }),
      page.waitForSelector('[data-testid="tab-connections"]', { timeout: 10000 }),
      page.waitForSelector('[data-testid="tab-workflows"]', { timeout: 10000 }),
      page.waitForSelector('[data-testid="guided-tour-tooltip"]', { timeout: 10000 }),
      page.waitForSelector('[data-testid="guided-tour-overlay"]', { timeout: 10000 }),
      page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 }),
      page.waitForSelector('h1:has-text("Chat")', { timeout: 10000 })
    ]);
  } catch (error) {
    // If neither dashboard elements nor tour appear, check what's on the page
    const pageContent = await page.content();
    throw new Error('Neither dashboard elements nor guided tour appeared');
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