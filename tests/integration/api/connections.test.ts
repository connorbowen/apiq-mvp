import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/connections/index';
import { prisma } from '../../../lib/database/client';
import { createTestUser, cleanupTestUsers, createAuthenticatedRequest, createUnauthenticatedRequest, cleanupTestConnections, createTestSuite } from '../../helpers/testUtils';
import { Role } from '../../../src/generated/prisma';
import fs from 'fs';
import path from 'path';
import type { TestUser } from '../../helpers/testUtils';

// Import the real modules (no mocking)
import { parseOpenApiSpec } from '../../../src/lib/api/parser';
import { extractAndStoreEndpoints } from '../../../src/lib/api/endpoints';
import { createCommonTestData } from '../../helpers/createTestData';

// Mock the OpenAPI service to avoid external network calls
jest.mock('../../../src/services/openApiService', () => ({
  openApiService: {
    fetchSpec: jest.fn()
  }
}));

// Load local fixture for Petstore API
const petstoreFixture = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../../fixtures/petstore-openapi.json'),
    'utf-8'
  )
);

describe('API Connections Integration Tests', () => {
  const testSuite = createTestSuite('API Connections Tests');
  let createdUserIds: string[] = [];
  let createdConnectionIds: string[] = [];
  let testUser: TestUser;

  beforeAll(async () => {
    await testSuite.beforeAll();
  });

  

    beforeEach(async () => {
    // Recreate test data after global setup truncates tables
    const testData = await createCommonTestData();
    
    
    
    testUser = testData.user;
  });

  describe('POST /api/connections', () => {
    it('should create a basic API connection without OpenAPI spec', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Basic Test API',
          baseUrl: 'https://api.example.com',
          authType: 'NONE'
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Basic Test API');
      expect(data.data.baseUrl).toBe('https://api.example.com');
      expect(data.data.authType).toBe('NONE');
      
      // Track the created connection
      createdConnectionIds.push(data.data.id);
    });

    it('should create API connection with OpenAPI spec and extract endpoints', async () => {
      // Mock successful OpenAPI spec fetch
      const { openApiService } = require('../../../src/services/openApiService');
      openApiService.fetchSpec.mockResolvedValue({
        success: true,
        spec: petstoreFixture,
        cached: false,
        duration: 100
      });

      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Petstore API',
          baseUrl: 'https://petstore.swagger.io/v2',
          authType: 'NONE',
          documentationUrl: 'https://petstore.swagger.io/v2/swagger.json'
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Petstore API');
      expect(data.data.ingestionStatus).toBe('SUCCEEDED');
      
      // Track the created connection
      createdConnectionIds.push(data.data.id);
    });

    it('should handle OpenAPI parsing errors gracefully', async () => {
      // Mock failed OpenAPI spec fetch
      const { openApiService } = require('../../../src/services/openApiService');
      openApiService.fetchSpec.mockResolvedValue({
        success: false,
        error: 'HTTP 404: NOT FOUND',
        duration: 100
      });

      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Invalid API',
          baseUrl: 'https://invalid-api.com',
          authType: 'NONE',
          documentationUrl: 'https://httpbin.org/status/404' // This will return 404
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.ingestionStatus).toBe('FAILED');
      expect(data.warning).toBeDefined();
      
      // Track the created connection
      createdConnectionIds.push(data.data.id);
    });

    it('should prevent duplicate connection names for the same user', async () => {
      // Create first connection using test suite
      const connection1 = await testSuite.createConnection(
        testUser,
        'Duplicate API',
        'https://api.example.com',
        'NONE'
      );
      createdConnectionIds.push(connection1.id);

      // Try to create second connection with same name
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Duplicate API',
          baseUrl: 'https://api2.example.com',
          authType: 'NONE'
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(409);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Test API'
          // Missing baseUrl and authType
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required fields');
    });

    it('should handle invalid auth type', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Invalid Auth API',
          baseUrl: 'https://api.example.com',
          authType: 'INVALID_TYPE'
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid auth type');
    });

    it('should reject unauthenticated requests', async () => {
      const { req, res } = createUnauthenticatedRequest('POST', {
        body: {
          name: 'Test API',
          baseUrl: 'https://api.example.com',
          authType: 'NONE'
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('GET /api/connections', () => {
    it('should retrieve all connections for a user', async () => {
      // Create test connections using test suite
      const connection1 = await testSuite.createConnection(
        testUser,
        'Conn1',
        'https://api1.example.com',
        'NONE'
      );
      createdConnectionIds.push(connection1.id);

      const connection2 = await testSuite.createConnection(
        testUser,
        'Conn2',
        'https://api2.example.com',
        'NONE'
      );
      createdConnectionIds.push(connection2.id);

      const { req, res } = createAuthenticatedRequest('GET', testUser);

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.connections)).toBe(true);
      expect(data.data.connections.length).toBeGreaterThanOrEqual(2);
      
      // Verify our test connections are included
      const connectionNames = data.data.connections.map((conn: any) => conn.name);
      expect(connectionNames).toContain('Conn1');
      expect(connectionNames).toContain('Conn2');
      
      // Verify summary metadata is included
      expect(data.data.total).toBeDefined();
      expect(data.data.active).toBeDefined();
      expect(data.data.failed).toBeDefined();
    });

    it('should reject unauthenticated requests', async () => {
      const { req, res } = createUnauthenticatedRequest('GET');

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });
  });
}); 