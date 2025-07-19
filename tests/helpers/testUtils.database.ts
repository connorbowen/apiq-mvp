// Database-related test utilities
// Extracted from testUtils.ts to comply with file size limits

import { AuthType } from '../../src/types';
import { prisma } from '../../lib/database/client';
import { generateTestId } from './testUtils';
import { TestUser } from './testUtils.auth';

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
    const { createTestUser } = await import('./testUtils.auth');
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
      connectionStatus: 'connected',
      description: `Test connection for ${testName}`,
      authConfig: {
        test: true,
        createdBy: 'test-utils'
      }
    }
  });

  return {
    id: connection.id,
    name: testName,
    baseUrl: testBaseUrl,
    authType: authType,
    userId: ensuredUser.id
  };
};

/**
 * Create a test endpoint for an API connection
 */
export const createTestEndpoint = async (
  connection: TestConnection,
  path?: string,
  method: string = 'GET',
  summary?: string
): Promise<TestEndpoint> => {
  const testPath = path || `/api/${generateTestId('endpoint')}`;
  const testSummary = summary || `Test ${method} endpoint`;

  const endpoint = await prisma.endpoint.create({
    data: {
      apiConnectionId: connection.id,
      path: testPath,
      method: method,
      summary: testSummary,
      description: `Test endpoint for ${testPath}`,
      isActive: true,
      parameters: {},
      responses: {
        '200': {
          description: 'Success response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  data: { type: 'object' }
                }
              }
            }
          }
        }
      },
      responseSchema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          data: { type: 'object' }
        }
      }
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
 * Clean up a test endpoint
 */
export const cleanupTestEndpoint = async (endpoint: TestEndpoint): Promise<void> => {
  try {
    await prisma.endpoint.delete({ where: { id: endpoint.id } });
  } catch (error) {
    console.warn(`Failed to cleanup test endpoint ${endpoint.id}:`, error);
  }
};

/**
 * Clean up multiple test endpoints
 */
export const cleanupTestEndpoints = async (endpointIds: string[]): Promise<void> => {
  for (const id of endpointIds) {
    try {
      await prisma.endpoint.delete({ where: { id } });
    } catch (error) {
      console.warn(`Failed to cleanup test endpoint ${id}:`, error);
    }
  }
};

/**
 * Clean up a test connection and its endpoints
 */
export const cleanupTestConnection = async (connection: TestConnection): Promise<void> => {
  try {
    // Delete all endpoints first
    await prisma.endpoint.deleteMany({
      where: { apiConnectionId: connection.id }
    });
    
    // Delete the connection
    await prisma.apiConnection.delete({ where: { id: connection.id } });
  } catch (error) {
    console.warn(`Failed to cleanup test connection ${connection.id}:`, error);
  }
};

/**
 * Clean up multiple test connections
 */
export const cleanupTestConnections = async (connectionIds: string[]): Promise<void> => {
  for (const id of connectionIds) {
    try {
      // Delete all endpoints first
      await prisma.endpoint.deleteMany({
        where: { apiConnectionId: id }
      });
      
      // Delete the connection
      await prisma.apiConnection.delete({ where: { id } });
    } catch (error) {
      console.warn(`Failed to cleanup test connection ${id}:`, error);
    }
  }
};

/**
 * Clean up multiple test users
 */
export const cleanupTestUsers = async (userIds: string[]): Promise<void> => {
  for (const id of userIds) {
    try {
      await prisma.user.delete({ where: { id } });
    } catch (error) {
      console.warn(`Failed to cleanup test user ${id}:`, error);
    }
  }
};

/**
 * Clean up a single test user
 */
export const cleanupTestUser = async (user: TestUser): Promise<void> => {
  await cleanupTestUsers([user.id]);
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
  const testName = name || generateTestId('workflow');
  const testDescription = description || `Test workflow: ${testName}`;
  const testSteps = steps || [
    {
      type: 'api_call',
      name: 'Test API Call',
      description: 'Make a test API call',
      method: 'GET',
      path: '/test',
      connectionId: null
    }
  ];

  const workflow = await prisma.workflow.create({
    data: {
      userId: user.id,
      name: testName,
      description: testDescription,
      status: 'ACTIVE'
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
 * Clean up a test workflow
 */
export const cleanupTestWorkflow = async (workflowId: string): Promise<void> => {
  try {
    await prisma.workflow.delete({ where: { id: workflowId } });
  } catch (error) {
    console.warn(`Failed to cleanup test workflow ${workflowId}:`, error);
  }
}; 