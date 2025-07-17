// Data helpers for APIQ E2E tests
// See docs/e2e-helpers-refactor-plan.md for details

import { TestUser, TestConnection, TestEndpoint } from './testUtils';
import {
  createTestUser,
  createTestConnection,
  createTestEndpoint,
  cleanupTestUser,
  cleanupTestConnection,
  cleanupTestEndpoint,
  cleanupTestUsers,
  cleanupTestConnections,
  createTestWorkflow,
  cleanupTestWorkflow
} from './testUtils';

export interface TestDataOptions {
  userId?: string;
  connectionId?: string;
  workflowId?: string;
  secretId?: string;
  user?: Partial<TestUser>;
  connection?: Partial<TestConnection>;
  workflow?: Partial<{ name: string; description: string; steps: any[] }>;
}

/**
 * Create test data for E2E tests (user, connection, workflow)
 */
export const createTestData = async (options: TestDataOptions = {}): Promise<{
  user?: TestUser;
  connection?: TestConnection;
  workflow?: { id: string; name: string; description: string; userId: string };
}> => {
  let user: TestUser | undefined;
  let connection: TestConnection | undefined;
  let workflow: { id: string; name: string; description: string; userId: string } | undefined;

  if (options.user) {
    user = await createTestUser(
      options.user.email,
      options.user.password,
      options.user.role,
      options.user.name
    );
  }
  if (options.connection && user) {
    connection = await createTestConnection(
      user,
      options.connection.name,
      options.connection.baseUrl,
      options.connection.authType
    );
  }
  if (options.workflow && user) {
    workflow = await createTestWorkflow(
      user,
      options.workflow.name,
      options.workflow.description,
      options.workflow.steps
    );
  }
  return { user, connection, workflow };
};

/**
 * Clean up test data for E2E tests (user, connection, workflow)
 */
export const cleanupTestData = async (options: TestDataOptions = {}): Promise<void> => {
  if (options.workflowId) {
    await cleanupTestWorkflow(options.workflowId);
  }
  if (options.connectionId) {
    await cleanupTestConnection({ id: options.connectionId } as TestConnection);
  }
  if (options.userId) {
    await cleanupTestUser({ id: options.userId } as TestUser);
  }
  // Optionally, add batch cleanup if arrays are provided in the future
}; 