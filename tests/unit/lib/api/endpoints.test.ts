import { extractAndStoreEndpoints, getEndpointsForConnection, deleteEndpointsForConnection } from '../../../../src/lib/api/endpoints';
import { prisma } from '../../../../lib/database/client';

// Mock Prisma client
jest.mock('../../../../lib/database/client', () => ({
  prisma: {
    endpoint: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Endpoint Extraction and Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractAndStoreEndpoints', () => {
    it('should extract and store endpoints from OpenAPI spec', async () => {
      const mockParsedSpec = {
        spec: {
          paths: {
            '/users': {
              get: {
                summary: 'Get users',
                parameters: [
                  { name: 'limit', in: 'query', type: 'integer' }
                ],
                responses: {
                  '200': { description: 'Success' }
                }
              },
              post: {
                summary: 'Create user',
                parameters: [],
                responses: {
                  '201': { description: 'Created' }
                }
              }
            },
            '/users/{id}': {
              get: {
                summary: 'Get user by ID',
                parameters: [
                  { name: 'id', in: 'path', required: true, type: 'string' }
                ],
                responses: {
                  '200': { description: 'Success' }
                }
              }
            }
          }
        },
        rawSpec: '{}',
        specHash: 'test-hash',
        version: '2.0',
        title: 'Test API'
      };

      const apiConnectionId = 'test-connection-id';
      const mockTransaction = jest.fn().mockResolvedValue(['1', '2', '3']); // 3 endpoint IDs

      mockPrisma.$transaction.mockImplementation(mockTransaction);

      const result = await extractAndStoreEndpoints(apiConnectionId, mockParsedSpec);

      expect(result).toHaveLength(3);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle empty paths gracefully', async () => {
      const mockParsedSpec = {
        spec: { paths: {} },
        rawSpec: '{}',
        specHash: 'test-hash',
        version: '2.0',
        title: 'Test API'
      };
      const apiConnectionId = 'test-connection-id';
      const mockTransaction = jest.fn().mockResolvedValue([]);

      mockPrisma.$transaction.mockImplementation(mockTransaction);

      const result = await extractAndStoreEndpoints(apiConnectionId, mockParsedSpec);

      expect(result).toHaveLength(0);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle complex endpoint structures', async () => {
      const mockParsedSpec = {
        spec: {
          paths: {
            '/complex/{id}/sub/{subId}': {
              put: {
                summary: 'Update complex resource',
                parameters: [
                  { name: 'id', in: 'path', required: true },
                  { name: 'subId', in: 'path', required: true },
                  { name: 'Authorization', in: 'header', required: true }
                ],
                requestBody: {
                  content: {
                    'application/json': {
                      schema: { type: 'object' }
                    }
                  }
                },
                responses: {
                  '200': { description: 'Success' },
                  '400': { description: 'Bad Request' },
                  '404': { description: 'Not Found' }
                }
              }
            }
          }
        },
        rawSpec: '{}',
        specHash: 'test-hash',
        version: '2.0',
        title: 'Test API'
      };

      const apiConnectionId = 'test-connection-id';
      const mockTransaction = jest.fn().mockResolvedValue(['1']);

      mockPrisma.$transaction.mockImplementation(mockTransaction);

      const result = await extractAndStoreEndpoints(apiConnectionId, mockParsedSpec);

      expect(result).toHaveLength(1);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getEndpointsForConnection', () => {
    it('should retrieve endpoints for a connection', async () => {
      const mockEndpoints = [
        {
          id: '1',
          path: '/users',
          method: 'GET',
          summary: 'Get users',
          isActive: true
        },
        {
          id: '2',
          path: '/users',
          method: 'POST',
          summary: 'Create user',
          isActive: true
        }
      ];

      (mockPrisma.endpoint.findMany as jest.Mock).mockResolvedValue(mockEndpoints);

      const result = await getEndpointsForConnection('test-connection-id');

      expect(result).toHaveLength(2);
      expect(mockPrisma.endpoint.findMany).toHaveBeenCalledWith({
        where: {
          apiConnectionId: 'test-connection-id',
          isActive: true
        },
        orderBy: [
          { path: 'asc' },
          { method: 'asc' }
        ]
      });
    });

    it('should filter endpoints by method', async () => {
      const mockEndpoints = [
        {
          id: '1',
          path: '/users',
          method: 'GET',
          summary: 'Get users',
          isActive: true
        }
      ];

      (mockPrisma.endpoint.findMany as jest.Mock).mockResolvedValue(mockEndpoints);

      const result = await getEndpointsForConnection('test-connection-id', { method: 'GET' });

      expect(result).toHaveLength(1);
      expect(mockPrisma.endpoint.findMany).toHaveBeenCalledWith({
        where: {
          apiConnectionId: 'test-connection-id',
          isActive: true,
          method: 'GET'
        },
        orderBy: [
          { path: 'asc' },
          { method: 'asc' }
        ]
      });
    });

    it('should filter endpoints by path', async () => {
      const mockEndpoints = [
        {
          id: '1',
          path: '/users',
          method: 'GET',
          summary: 'Get users',
          isActive: true
        }
      ];

      (mockPrisma.endpoint.findMany as jest.Mock).mockResolvedValue(mockEndpoints);

      const result = await getEndpointsForConnection('test-connection-id', { path: '/users' });

      expect(result).toHaveLength(1);
      expect(mockPrisma.endpoint.findMany).toHaveBeenCalledWith({
        where: {
          apiConnectionId: 'test-connection-id',
          isActive: true,
          path: {
            contains: '/users',
            mode: 'insensitive'
          }
        },
        orderBy: [
          { path: 'asc' },
          { method: 'asc' }
        ]
      });
    });

    it('should filter endpoints by summary', async () => {
      const mockEndpoints = [
        {
          id: '1',
          path: '/users',
          method: 'GET',
          summary: 'Get users',
          isActive: true
        }
      ];

      (mockPrisma.endpoint.findMany as jest.Mock).mockResolvedValue(mockEndpoints);

      const result = await getEndpointsForConnection('test-connection-id', { summary: 'users' });

      expect(result).toHaveLength(1);
      expect(mockPrisma.endpoint.findMany).toHaveBeenCalledWith({
        where: {
          apiConnectionId: 'test-connection-id',
          isActive: true,
          summary: {
            contains: 'users',
            mode: 'insensitive'
          }
        },
        orderBy: [
          { path: 'asc' },
          { method: 'asc' }
        ]
      });
    });

    it('should combine multiple filters', async () => {
      const mockEndpoints = [
        {
          id: '1',
          path: '/users',
          method: 'GET',
          summary: 'Get users',
          isActive: true
        }
      ];

      (mockPrisma.endpoint.findMany as jest.Mock).mockResolvedValue(mockEndpoints);

      const result = await getEndpointsForConnection('test-connection-id', {
        method: 'GET',
        path: '/users',
        summary: 'users'
      });

      expect(result).toHaveLength(1);
      expect(mockPrisma.endpoint.findMany).toHaveBeenCalledWith({
        where: {
          apiConnectionId: 'test-connection-id',
          isActive: true,
          method: 'GET',
          path: {
            contains: '/users',
            mode: 'insensitive'
          },
          summary: {
            contains: 'users',
            mode: 'insensitive'
          }
        },
        orderBy: [
          { path: 'asc' },
          { method: 'asc' }
        ]
      });
    });
  });

  describe('deleteEndpointsForConnection', () => {
    it('should delete all endpoints for a connection', async () => {
      (mockPrisma.endpoint.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      await deleteEndpointsForConnection('test-connection-id');

      expect(mockPrisma.endpoint.deleteMany).toHaveBeenCalledWith({
        where: {
          apiConnectionId: 'test-connection-id'
        }
      });
    });
  });
}); 