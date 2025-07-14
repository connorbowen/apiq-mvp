// TODO: [connorbowen] 2025-06-29 - This utility file exceeds the 200-300 line threshold (currently 413 lines).
// Consider splitting into focused utility modules:
// - testUtils.auth.ts (authentication helpers)
// - testUtils.database.ts (database setup/cleanup)
// - testUtils.api.ts (API request helpers)
// Priority: Low - utilities are working well, refactoring for organization only.

import { createMocks } from 'node-mocks-http';
import bcrypt from 'bcryptjs';
import loginHandler from '../../pages/api/auth/login';
import { Role } from '../../src/generated/prisma';
import { AuthType } from '../../src/types';
import { prisma } from '../../lib/database/client';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  accessToken: string;
  refreshToken: string;
}

export interface TestConnection {
  id: string;
  name: string;
  baseUrl: string;
  authType: AuthType;
  userId: string;
}

export interface TestEndpoint {
  id: string;
  path: string;
  method: string;
  apiConnectionId: string;
}

/**
 * Generate unique test identifiers to avoid conflicts
 */
export const generateTestId = (prefix: string = 'test'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a test user with real bcrypt-hashed password
 */
export const createTestUser = async (
  email?: string,
  password?: string,
  role: Role = Role.USER,
  name?: string
): Promise<TestUser> => {
  const testEmail = email || `test-${generateTestId()}@example.com`;
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
      isActive: true
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
 * Create a test API connection with endpoints
 */
export const createTestConnection = async (
  user: TestUser,
  name?: string,
  baseUrl?: string,
  authType: AuthType = 'NONE',
  createEndpoints: boolean = true
): Promise<TestConnection> => {
  // Ensure the user exists in the database
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  let ensuredUser = user;
  if (!dbUser) {
    // Use createTestUser to create the user if missing
    ensuredUser = await createTestUser(user.email, user.password, user.role, user.name);
  }

  const testName = name || generateTestId('connection');
  const testBaseUrl = baseUrl || `https://${generateTestId('api')}.example.com`;

  const connection = await prisma.apiConnection.create({
    data: {
      userId: ensuredUser.id,
      name: testName,
      baseUrl: testBaseUrl,
      authType: authType,
      status: 'ACTIVE',
      ingestionStatus: 'PENDING',
      authConfig: {}
    }
  });

  // Create default endpoints if requested
  if (createEndpoints) {
    // Create endpoints based on connection name
    const connectionName = testName.toLowerCase();
    
    if (connectionName.includes('github')) {
      // Create GitHub-specific endpoints
      await createTestEndpoint(connection, '/repos/{owner}/{repo}/issues', 'GET', 'Get GitHub issues');
      await createTestEndpoint(connection, '/repos/{owner}/{repo}/issues/{issue_number}', 'GET', 'Get specific GitHub issue');
      await createTestEndpoint(connection, '/repos/{owner}/{repo}/issues/{issue_number}/comments', 'POST', 'Comment on GitHub issue');
      await createTestEndpoint(connection, '/repos/{owner}/{repo}/hooks', 'POST', 'Create GitHub webhook');
    } else if (connectionName.includes('slack')) {
      // Create Slack-specific endpoints
      await createTestEndpoint(connection, '/chat.postMessage', 'POST', 'Send Slack message');
      await createTestEndpoint(connection, '/chat.postEphemeral', 'POST', 'Send ephemeral Slack message');
      await createTestEndpoint(connection, '/conversations.list', 'GET', 'List Slack conversations');
      await createTestEndpoint(connection, '/webhooks/slack', 'POST', 'Create Slack webhook');
    } else {
      // Create generic endpoints for other APIs
      await createTestEndpoint(connection, '/api/endpoint1', 'GET', 'Get data');
      await createTestEndpoint(connection, '/api/endpoint2', 'POST', 'Create data');
      await createTestEndpoint(connection, '/api/endpoint3', 'PUT', 'Update data');
    }
  }

  return {
    id: connection.id,
    name: testName,
    baseUrl: testBaseUrl,
    authType: authType,
    userId: ensuredUser.id
  };
};

/**
 * Create a test endpoint
 */
export const createTestEndpoint = async (
  connection: TestConnection,
  path?: string,
  method: string = 'GET',
  summary?: string
): Promise<TestEndpoint> => {
  const testPath = path || `/${generateTestId('endpoint')}`;

  // Use provided summary or generate a default one
  const endpointSummary = summary || `Test ${method} endpoint`;

  const endpoint = await prisma.endpoint.create({
    data: {
      apiConnectionId: connection.id,
      path: testPath,
      method: method,
      summary: endpointSummary,
      description: `Test endpoint for ${connection.name}`,
      parameters: [], // Use empty array instead of empty object
      responses: {}
    }
  });

  return {
    id: endpoint.id,
    path: testPath,
    method: method,
    apiConnectionId: connection.id
  };
};

/**
 * Clean up test endpoint
 */
export const cleanupTestEndpoint = async (endpoint: TestEndpoint): Promise<void> => {
  await prisma.endpoint.deleteMany({
    where: { id: endpoint.id }
  });
};

/**
 * Clean up test endpoints by ID
 */
export const cleanupTestEndpoints = async (endpointIds: string[]): Promise<void> => {
  if (!endpointIds.length) return;
  await prisma.endpoint.deleteMany({
    where: { id: { in: endpointIds } }
  });
};

/**
 * Clean up test connection and all associated endpoints
 */
export const cleanupTestConnection = async (connection: TestConnection): Promise<void> => {
  // Delete all endpoints for this connection
  await prisma.endpoint.deleteMany({
    where: {
      apiConnectionId: connection.id
    }
  });
  
  // Delete the connection
  await prisma.apiConnection.deleteMany({
    where: { id: connection.id }
  });
};

/**
 * Clean up test connections by ID (and all associated endpoints)
 */
export const cleanupTestConnections = async (connectionIds: string[]): Promise<void> => {
  if (!connectionIds.length) return;
  // Delete all endpoints for these connections, then the connections
  await prisma.endpoint.deleteMany({
    where: {
      apiConnectionId: { in: connectionIds }
    }
  });
  await prisma.apiConnection.deleteMany({
    where: {
      id: { in: connectionIds }
    }
  });
};

/**
 * Clean up test users by ID (and all associated data)
 */
export const cleanupTestUsers = async (userIds: string[]): Promise<void> => {
  if (!userIds.length) return;
  // Delete all endpoints and connections for these users, then the users
  await prisma.endpoint.deleteMany({
    where: {
      apiConnection: {
        userId: { in: userIds }
      }
    }
  });
  await prisma.apiConnection.deleteMany({
    where: {
      userId: { in: userIds }
    }
  });
  await prisma.user.deleteMany({
    where: {
      id: { in: userIds }
    }
  });
};

/**
 * Clean up test user (and all associated data)
 */
export const cleanupTestUser = async (user: TestUser): Promise<void> => {
  await cleanupTestUsers([user.id]);
};

/**
 * Create a test suite with optimized setup and teardown
 * Uses transaction-based isolation for better performance
 */
export const createTestSuite = (suiteName: string) => {
  const testUsers: TestUser[] = [];
  const testConnections: TestConnection[] = [];
  const testEndpoints: TestEndpoint[] = [];
  
  // Generate a unique suite identifier to prevent conflicts
  const suiteId = generateTestId(suiteName.toLowerCase().replace(/\s+/g, '-'));
  
  // Helper to generate a unique email prefix for each test
  function getEmailPrefix(testName?: string) {
    const testId = generateTestId(testName || 'test');
    const processId = process.pid;
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000);
    return `${suiteId}-${testId}-${processId}-${timestamp}-${random}`;
  }

  return {
    /**
     * Setup function to run before all tests in the suite
     */
    beforeAll: async () => {
      // Database connection is managed by the shared Prisma client
    },

    /**
     * Setup function to run before each test
     * Optimized to rely on transaction isolation instead of manual cleanup
     */
    beforeEach: async () => {
      // Database connection is managed by the shared Prisma client
      // Note: Database cleanup is handled by transaction rollback in jest.integration.setup.js
    },

    /**
     * Teardown function to run after all tests in the suite
     * Only cleans up suite-level resources
     */
    afterAll: async () => {
      // Clean up all test data in reverse order
      // This is only needed for data created outside of individual tests
      for (const endpoint of testEndpoints) {
        await cleanupTestEndpoint(endpoint);
      }
      
      for (const connection of testConnections) {
        await cleanupTestConnection(connection);
      }
      
      for (const user of testUsers) {
        await cleanupTestUsers([user.id]);
      }

      await prisma.$disconnect();
    },

    /**
     * Create a test user and track it for cleanup
     */
    createUser: async (
      email?: string,
      password?: string,
      role: Role = Role.USER,
      name?: string
    ): Promise<TestUser> => {
      // Use Jest's current test name if available
      const testName = (global as any).expect?.getState?.().currentTestName || 'test';
      const uniqueEmail = email || `${getEmailPrefix(testName)}@example.com`;
      const user = await createTestUser(uniqueEmail, password, role, name);
      testUsers.push(user);
      return user;
    },

    /**
     * Create a test connection and track it for cleanup
     */
    createConnection: async (
      user: TestUser,
      name?: string,
      baseUrl?: string,
      authType: AuthType = 'NONE'
    ): Promise<TestConnection> => {
      const connection = await createTestConnection(user, name, baseUrl, authType);
      testConnections.push(connection);
      return connection;
    },

    /**
     * Create a test endpoint and track it for cleanup
     */
    createEndpoint: async (
      connection: TestConnection,
      path?: string,
      method: string = 'GET'
    ): Promise<TestEndpoint> => {
      const endpoint = await createTestEndpoint(connection, path, method);
      testEndpoints.push(endpoint);
      return endpoint;
    }
  };
};

/**
 * Helper to create mock request with authentication
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
  const { req, res } = createMocks({
    method,
    headers: {
      authorization: `Bearer ${user.accessToken}`,
      ...options.headers
    },
    body: options.body,
    query: options.query
  });
  
  req.env = {};
  
  return { req: req as any, res: res as any };
};

/**
 * Helper to create mock request without authentication
 */
export const createUnauthenticatedRequest = (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  options: {
    body?: any;
    query?: any;
    headers?: Record<string, string>;
  } = {}
) => {
  const { req, res } = createMocks({
    method,
    headers: options.headers,
    body: options.body,
    query: options.query
  });
  
  req.env = {};
  
  return { req: req as any, res: res as any };
};

/**
 * Create a test workflow
 */
export const createTestWorkflow = async (
  user: TestUser,
  name?: string,
  description?: string,
  steps?: any[]
): Promise<{
  id: string;
  name: string;
  description: string;
  userId: string;
}> => {
  const testName = name || `Test Workflow ${generateTestId()}`;
  const testDescription = description || `Test workflow for ${user.email}`;
  const defaultSteps = steps || [
    {
      stepOrder: 1,
      name: 'Test API Call',
      description: 'Test step for E2E testing',
      action: 'GET /api/test',
      parameters: {},
      isActive: true
    }
  ];

  const workflow = await prisma.workflow.create({
    data: {
      name: testName,
      description: testDescription,
      userId: user.id,
      status: 'ACTIVE',
      steps: {
        create: defaultSteps
      }
    }
  });

  return {
    id: workflow.id,
    name: testName,
    description: testDescription,
    userId: user.id
  };
};

/**
 * Clean up test workflow
 */
export const cleanupTestWorkflow = async (workflowId: string): Promise<void> => {
  await prisma.workflow.deleteMany({
    where: { id: workflowId }
  });
};

/**
 * Set authentication cookies for E2E tests
 * This replaces the localStorage approach with secure cookie-based authentication
 */
export const setAuthCookies = async (page: any, user: TestUser) => {
  // Set the authentication cookies directly
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
 * Authenticate E2E test page using secure cookie-based authentication
 */
export const authenticateE2EPage = async (page: any, user: TestUser) => {
  console.log('🔍 DEBUG: Starting authenticateE2EPage');
  console.log('🔍 DEBUG: User accessToken:', user.accessToken ? 'present' : 'missing');
  
  // 1️⃣ Navigate to the site first to establish the origin
  console.log('🔍 DEBUG: Navigating to site first...');
  await page.goto('http://localhost:3000');
  
  // 2️⃣ Set cookies for the established origin
  console.log('🔍 DEBUG: Setting cookies...');
  await page.context().addCookies([
    {
      name: 'accessToken',
      value: user.accessToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'refreshToken',
      value: user.refreshToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
  
  console.log('🔍 DEBUG: Cookies set, checking context cookies...');
  const cookies = await page.context().cookies();
  console.log('🔍 DEBUG: Context cookies after setting:', cookies);

  // 3️⃣ Navigate to dashboard with cookies set
  console.log('🔍 DEBUG: Navigating to dashboard...');
  await page.goto('http://localhost:3000/dashboard');

  // 4️⃣ Reload to ensure cookies are properly attached
  console.log('🔍 DEBUG: Reloading page to ensure cookies are attached...');
  await page.reload();

  // 5️⃣ Wait for dashboard to load
  console.log('🔍 DEBUG: Waiting for dashboard...');
  try {
    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10_000 });
    console.log('🔍 DEBUG: Dashboard loaded successfully');
  } catch (error) {
    console.log('🔍 DEBUG: Dashboard loading failed:', error instanceof Error ? error.message : String(error));
    // Check if we're on login page instead
    const currentUrl = page.url();
    console.log('🔍 DEBUG: Current URL:', currentUrl);
    if (currentUrl.includes('login')) {
      console.log('🔍 DEBUG: Redirected to login - cookies not working');
    }
  }
};

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined for E2E tests');
} 