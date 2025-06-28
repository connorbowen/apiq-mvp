import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/connections/[id]/endpoints/index';
import { prisma } from '../../../lib/database/client';
import * as rbac from '../../../src/lib/auth/rbac';

// Mock Prisma client
jest.mock('../../../lib/database/client', () => ({
  prisma: {
    apiConnection: {
      findFirst: jest.fn()
    },
    endpoint: {
      deleteMany: jest.fn()
    },
    $transaction: jest.fn()
  }
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('RBAC Integration: Endpoint Deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should forbid non-admin users from deleting endpoints', async () => {
    // Mock user context to be USER (not ADMIN)
    jest.spyOn(rbac, 'getUserContext').mockResolvedValue({
      userId: 'test-user-456',
      role: 'USER',
      email: 'user@example.com'
    });

    // Mock connection exists
    (mockPrisma.apiConnection.findFirst as jest.Mock).mockResolvedValue({
      id: 'conn-1',
      userId: 'test-user-456',
      name: 'Test API'
    } as any);

    const { req, res } = createMocks({
      method: 'DELETE',
      query: { id: 'conn-1' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/ADMIN role required/);
  });

  it('should allow ADMIN users to delete endpoints', async () => {
    jest.spyOn(rbac, 'getUserContext').mockResolvedValue({
      userId: 'test-user-123',
      role: 'ADMIN',
      email: 'admin@example.com'
    });

    (mockPrisma.apiConnection.findFirst as jest.Mock).mockResolvedValue({
      id: 'conn-2',
      userId: 'test-user-123',
      name: 'Test API'
    } as any);

    (mockPrisma.endpoint.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

    const { req, res } = createMocks({
      method: 'DELETE',
      query: { id: 'conn-2' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.message).toMatch(/deleted successfully/i);
  });
}); 