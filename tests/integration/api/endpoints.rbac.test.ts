import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/connections/[id]/endpoints/index';
import { prisma } from '../../../lib/database/client';
import { createTestSuite, createAuthenticatedRequest } from '../../helpers/testUtils';
import { Role } from '../../../src/generated/prisma';

describe('RBAC Integration: Endpoint Deletion', () => {
  const testSuite = createTestSuite('RBAC Endpoint Tests');
  let adminUser: any;
  let regularUser: any;
  let testConnection: any;
  let testEndpoint: any;

  beforeAll(async () => {
    await testSuite.beforeAll();
    
    // Create admin user
    adminUser = await testSuite.createUser(
      'rbacadmin@example.com',
      'admin123',
      Role.ADMIN,
      'RBAC Admin'
    );

    // Create regular user
    regularUser = await testSuite.createUser(
      'rbacuser@example.com',
      'user123',
      Role.USER,
      'RBAC User'
    );

    // Create API connection for admin
    testConnection = await testSuite.createConnection(
      adminUser,
      'RBAC Test API',
      'https://rbac-test.com',
      'NONE'
    );

    // Create endpoint for the connection
    testEndpoint = await testSuite.createEndpoint(
      testConnection,
      '/test',
      'GET'
    );
  });

  afterAll(async () => {
    await testSuite.afterAll();
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