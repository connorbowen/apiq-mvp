import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/connections/[id]/endpoints/index';
import { prisma } from '../../../lib/database/client';
import { createTestSuite, createAuthenticatedRequest } from '../../helpers/testUtils';
import { Role } from '../../../src/generated/prisma';
import { createConnectionTestData } from '../../helpers/createTestData';

describe('RBAC Integration: Endpoint Deletion', () => {
  const testSuite = createTestSuite('RBAC Endpoint Tests');
  let adminUser: any;
  let regularUser: any;
  let testConnection: any;
  let testEndpoint: any;

  beforeAll(async () => {
    await testSuite.beforeAll();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-' } },
          { email: { contains: '@example.com' } }
        ]
      }
    });
    // Always create test users and data after cleanup
    adminUser = await testSuite.createUser(undefined, 'admin123', Role.ADMIN, 'Admin User');
    regularUser = await testSuite.createUser(undefined, 'user123', Role.USER, 'Regular User');
    testConnection = await testSuite.createConnection(adminUser, 'RBAC Test API', 'https://rbac-test.com', 'NONE');
    testEndpoint = await testSuite.createEndpoint(testConnection, '/test', 'GET');
  });

  it('should forbid non-admin users from deleting endpoints', async () => {
    const { req, res } = createAuthenticatedRequest('DELETE', regularUser, {
      query: { id: testConnection.id }
    });
    
    await handler(req as any, res as any);
    
    expect(res._getStatusCode()).toBe(404);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/not found|not exist|not found/i);
  });

  it('should allow ADMIN users to delete endpoints', async () => {
    const { req, res } = createAuthenticatedRequest('DELETE', adminUser, {
      query: { id: testConnection.id }
    });
    
    await handler(req as any, res as any);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/deleted successfully/i);
  });
}); 