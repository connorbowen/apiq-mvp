import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/connections/index';
import { prisma } from '../../../lib/database/client';

// Mock Prisma client
jest.mock('../../../lib/database/client', () => ({
  prisma: {
    apiConnection: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    endpoint: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Mock the parser and endpoints modules
jest.mock('../../../src/lib/api/parser', () => ({
  parseOpenApiSpec: jest.fn()
}));

jest.mock('../../../src/lib/api/endpoints', () => ({
  extractAndStoreEndpoints: jest.fn()
}));

import { parseOpenApiSpec } from '../../../src/lib/api/parser';
import { extractAndStoreEndpoints } from '../../../src/lib/api/endpoints';

const mockParseOpenApiSpec = parseOpenApiSpec as jest.MockedFunction<typeof parseOpenApiSpec>;
const mockExtractAndStoreEndpoints = extractAndStoreEndpoints as jest.MockedFunction<typeof extractAndStoreEndpoints>;

describe('API Connections Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/connections', () => {
    it('should create a basic API connection without OpenAPI spec', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          name: 'Test API',
          baseUrl: 'https://api.example.com',
          authType: 'NONE'
        }
      });

      // Mock no existing connection
      (mockPrisma.apiConnection.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock connection creation
      (mockPrisma.apiConnection.create as jest.Mock).mockResolvedValue({
        id: 'test-connection-id',
        userId: 'test-user-123',
        name: 'Test API',
        baseUrl: 'https://api.example.com',
        authType: 'NONE',
        status: 'ACTIVE',
        ingestionStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Test API');
      expect(data.data.ingestionStatus).toBe('PENDING');
    });

    it('should create API connection with OpenAPI spec and extract endpoints', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          name: 'Petstore API',
          baseUrl: 'https://petstore.swagger.io/v2',
          documentationUrl: 'https://petstore.swagger.io/v2/swagger.json',
          authType: 'NONE'
        }
      });

      // Mock no existing connection
      (mockPrisma.apiConnection.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock connection creation
      (mockPrisma.apiConnection.create as jest.Mock).mockResolvedValue({
        id: 'test-connection-id',
        userId: 'test-user-123',
        name: 'Petstore API',
        baseUrl: 'https://petstore.swagger.io/v2',
        authType: 'NONE',
        status: 'ACTIVE',
        ingestionStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      // Mock OpenAPI parsing
      mockParseOpenApiSpec.mockResolvedValue({
        spec: {
          paths: {
            '/pet': {
              get: { summary: 'Get pets', responses: { '200': { description: 'Success' } } }
            }
          }
        },
        rawSpec: '{"swagger":"2.0"}',
        specHash: 'test-hash',
        version: '2.0',
        title: 'Petstore API'
      });

      // Mock endpoint extraction
      mockExtractAndStoreEndpoints.mockResolvedValue(['endpoint-1']);

      // Mock connection update
      (mockPrisma.apiConnection.update as jest.Mock).mockResolvedValue({
        id: 'test-connection-id',
        ingestionStatus: 'SUCCEEDED',
        rawSpec: '{"swagger":"2.0"}',
        specHash: 'test-hash'
      } as any);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.ingestionStatus).toBe('SUCCEEDED');
      expect(mockParseOpenApiSpec).toHaveBeenCalledWith('https://petstore.swagger.io/v2/swagger.json');
      expect(mockExtractAndStoreEndpoints).toHaveBeenCalled();
    });

    it('should handle OpenAPI parsing errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          name: 'Invalid API',
          baseUrl: 'https://invalid-api.com',
          documentationUrl: 'https://invalid-api.com/swagger.json',
          authType: 'NONE'
        }
      });

      // Mock no existing connection
      (mockPrisma.apiConnection.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock connection creation
      (mockPrisma.apiConnection.create as jest.Mock).mockResolvedValue({
        id: 'test-connection-id',
        userId: 'test-user-123',
        name: 'Invalid API',
        baseUrl: 'https://invalid-api.com',
        authType: 'NONE',
        status: 'ACTIVE',
        ingestionStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      // Mock OpenAPI parsing error
      mockParseOpenApiSpec.mockRejectedValue(new Error('Invalid OpenAPI spec'));

      // Mock connection update for failed ingestion
      (mockPrisma.apiConnection.update as jest.Mock).mockResolvedValue({
        id: 'test-connection-id',
        ingestionStatus: 'FAILED'
      } as any);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.ingestionStatus).toBe('FAILED');
    });

    it('should prevent duplicate connection names for the same user', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          name: 'Duplicate API',
          baseUrl: 'https://api.example.com',
          authType: 'NONE'
        }
      });

      // Mock existing connection
      (mockPrisma.apiConnection.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-connection-id',
        name: 'Duplicate API',
        userId: 'test-user-123'
      } as any);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          // Missing required fields
          authType: 'NONE'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('required');
    });

    it('should handle invalid auth type', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          name: 'Test API',
          baseUrl: 'https://api.example.com',
          authType: 'INVALID_TYPE'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid auth type');
    });
  });

  describe('GET /api/connections', () => {
    it('should retrieve all connections for a user', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      const mockConnections = [
        {
          id: 'connection-1',
          name: 'API 1',
          baseUrl: 'https://api1.com',
          status: 'ACTIVE',
          ingestionStatus: 'SUCCEEDED',
          endpoints: []
        },
        {
          id: 'connection-2',
          name: 'API 2',
          baseUrl: 'https://api2.com',
          status: 'ACTIVE',
          ingestionStatus: 'PENDING',
          endpoints: []
        }
      ];

      // Mock Prisma query
      mockPrisma.apiConnection.findMany = jest.fn().mockResolvedValue(mockConnections);

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });
  });
}); 