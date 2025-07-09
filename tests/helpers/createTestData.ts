import { prisma } from '../../src/lib/singletons/prisma';
import { createTestUser } from './testUtils';
import { ConnectionStatus, AuthType, Status, IngestionStatus } from '../../src/generated/prisma';

export interface TestData {
  user: any;
  connection?: any;
  workflow?: any;
}

/**
 * Creates common test data that gets recreated in beforeEach
 * after global setup truncates tables
 */
export async function createCommonTestData(): Promise<TestData> {
  // Create test user with ADMIN role for integration tests
  const user = await createTestUser(undefined, undefined, 'ADMIN');
  
  return { user };
}

/**
 * Creates test data for API connection tests
 */
export async function createConnectionTestData(): Promise<TestData> {
  const user = await createTestUser(undefined, undefined, 'ADMIN');
  
  const connection = await prisma.apiConnection.create({
    data: {
      userId: user.id,
      name: 'Integration Test Connection',
      description: 'Integration test connection',
      baseUrl: 'https://example.com',
      authType: AuthType.OAUTH2,
      authConfig: {},
      documentationUrl: '',
      status: Status.ACTIVE,
      ingestionStatus: IngestionStatus.PENDING,
      connectionStatus: ConnectionStatus.draft,
    },
  });
  
  return { user, connection };
}

/**
 * Creates test data for workflow tests
 */
export async function createWorkflowTestData(): Promise<TestData> {
  const user = await createTestUser(undefined, undefined, 'ADMIN');
  
  const workflow = await prisma.workflow.create({
    data: {
      userId: user.id,
      name: 'Integration Test Workflow',
      description: 'Integration test workflow',
      status: 'DRAFT',
      isPublic: false,
    },
  });
  
  return { user, workflow };
}

/**
 * Creates test data for OAuth2 tests
 */
export async function createOAuth2TestData(): Promise<TestData> {
  const user = await createTestUser(undefined, undefined, 'ADMIN');
  
  const connection = await prisma.apiConnection.create({
    data: {
      userId: user.id,
      name: 'OAuth2 Test Connection',
      description: 'OAuth2 integration test connection',
      baseUrl: 'https://api.example.com',
      authType: AuthType.OAUTH2,
      authConfig: {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'http://localhost:3000/oauth/callback',
        scope: 'read write',
      },
      documentationUrl: '',
      status: Status.ACTIVE,
      ingestionStatus: IngestionStatus.PENDING,
      connectionStatus: ConnectionStatus.draft,
    },
  });
  
  return { user, connection };
} 