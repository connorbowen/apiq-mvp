import { createMocks } from 'node-mocks-http';
import { prisma } from '../../lib/database/client';
import bcrypt from 'bcryptjs';
import loginHandler from '../../pages/api/auth/login';
import { Role } from '../../src/generated/prisma';
import { AuthType } from '../../src/types';

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
  const testEmail = email || `${generateTestId('user')}@example.com`;
  const testPassword = password || 'testpass123';
  const testName = name || `Test ${role}`;

  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email: testEmail }
  });

  if (!user) {
    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    // Create user in database
    user = await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        name: testName,
        role: role,
        isActive: true
      }
    });
  } else {
    // Update existing user's password and role if needed
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        name: testName,
        role: role,
        isActive: true
      }
    });
  }

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
 * Create a test API connection
 */
export const createTestConnection = async (
  user: TestUser,
  name?: string,
  baseUrl?: string,
  authType: AuthType = 'NONE'
): Promise<TestConnection> => {
  const testName = name || generateTestId('connection');
  const testBaseUrl = baseUrl || `https://${generateTestId('api')}.example.com`;

  const connection = await prisma.apiConnection.create({
    data: {
      userId: user.id,
      name: testName,
      baseUrl: testBaseUrl,
      authType: authType,
      status: 'ACTIVE',
      ingestionStatus: 'PENDING',
      authConfig: {}
    }
  });

  return {
    id: connection.id,
    name: testName,
    baseUrl: testBaseUrl,
    authType: authType,
    userId: user.id
  };
};

/**
 * Create a test endpoint
 */
export const createTestEndpoint = async (
  connection: TestConnection,
  path?: string,
  method: string = 'GET'
): Promise<TestEndpoint> => {
  const testPath = path || `/${generateTestId('endpoint')}`;

  const endpoint = await prisma.endpoint.create({
    data: {
      apiConnectionId: connection.id,
      path: testPath,
      method: method,
      summary: `Test ${method} endpoint`,
      description: `Test endpoint for ${connection.name}`,
      parameters: {},
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
    where: {
      id: connection.id
    }
  });
};

/**
 * Clean up test user and all associated data
 */
export const cleanupTestUser = async (user: TestUser): Promise<void> => {
  // Delete all endpoints for connections owned by this user
  await prisma.endpoint.deleteMany({
    where: {
      apiConnection: {
        userId: user.id
      }
    }
  });

  // Delete all connections owned by this user
  await prisma.apiConnection.deleteMany({
    where: {
      userId: user.id
    }
  });

  // Delete the user
  await prisma.user.deleteMany({
    where: {
      id: user.id
    }
  });
};

/**
 * Clean up existing test users before running tests
 */
export const cleanupExistingTestUsers = async (): Promise<void> => {
  // Delete users that match test patterns
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { contains: 'test-' } },
        { email: { contains: '@example.com' } },
        { name: { contains: 'Test ' } },
        { name: { contains: 'RBAC ' } }
      ]
    }
  });
};

/**
 * Create a test suite with proper setup and teardown
 */
export const createTestSuite = (suiteName: string) => {
  const testUsers: TestUser[] = [];
  const testConnections: TestConnection[] = [];
  const testEndpoints: TestEndpoint[] = [];

  return {
    /**
     * Setup function to run before all tests in the suite
     */
    beforeAll: async () => {
      // Ensure database connection
      await prisma.$connect();
      
      // Clean up any existing test data
      await cleanupExistingTestUsers();
    },

    /**
     * Teardown function to run after all tests in the suite
     */
    afterAll: async () => {
      // Clean up all test data in reverse order
      for (const endpoint of testEndpoints) {
        await cleanupTestEndpoint(endpoint);
      }
      
      for (const connection of testConnections) {
        await cleanupTestConnection(connection);
      }
      
      for (const user of testUsers) {
        await cleanupTestUser(user);
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
      const user = await createTestUser(email, password, role, name);
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