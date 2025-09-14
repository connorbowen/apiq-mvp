// Core test utilities - streamlined version
// Split into focused modules to comply with file size limits

/**
 * Generate unique test identifiers to avoid conflicts
 */
export const generateTestId = (prefix: string = 'test'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create test suite with email prefix management
 */
export const createTestSuite = (suiteName: string) => {
  const suiteId = generateTestId(suiteName);
  
  function getEmailPrefix(testName?: string) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    const testSuffix = testName ? `-${testName}` : '';
    return `${suiteId}-${timestamp}-${random}${testSuffix}`;
  }

  return {
    suiteId,
    getEmailPrefix,
    generateEmail: (testName?: string) => `${getEmailPrefix(testName)}@testuser.local`
  };
};

// Re-export from split modules
export type { TestUser } from './testUtils.auth';
export { createTestUser, createTestUserWithTour, setAuthCookies, authenticateE2EPage, createAuthenticatedRequest, createUnauthenticatedRequest } from './testUtils.auth';
export type { TestConnection, TestEndpoint } from './testUtils.database';
export { createTestConnection, createTestEndpoint, cleanupTestEndpoint, cleanupTestEndpoints, cleanupTestConnection, cleanupTestConnections, cleanupTestUsers, cleanupTestUser, createTestWorkflow, cleanupTestWorkflow } from './testUtils.database'; 