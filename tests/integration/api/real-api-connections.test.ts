import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/connections/index';
import { prisma } from '../../../lib/database/client';
import { createTestSuite, createAuthenticatedRequest, createUnauthenticatedRequest, createTestUser } from '../../helpers/testUtils';
import { Role } from '../../../src/generated/prisma';
import fs from 'fs';
import path from 'path';

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

// Note: No mocks for parser and endpoints - we want to test real API calls

describe('Real API Connections Integration Tests', () => {
  const testSuite = createTestSuite('Real API Connections Tests');
  let testUser: any;

  beforeAll(async () => {
    await testSuite.beforeAll();
    
    // Create test user with unique email to avoid conflicts with other test files
    testUser = await testSuite.createUser(
      'real-api-test@example.com',
      'admin123',
      Role.ADMIN,
      'Real API Test Admin User'
    );
  });

  afterAll(async () => {
    await testSuite.afterAll();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.endpoint.deleteMany({
      where: {
        apiConnection: {
          user: {
            OR: [
              { email: { contains: 'test-' } },
              { email: { contains: '@example.com' } }
            ]
          }
        }
      }
    });
    await prisma.apiConnection.deleteMany({
      where: {
        user: {
          OR: [
            { email: { contains: 'test-' } },
            { email: { contains: '@example.com' } }
          ]
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-' } },
          { email: { contains: '@example.com' } }
        ]
      }
    });
    // Recreate test users as needed for each test
    if (typeof testUser !== 'undefined') {
      testUser = await createTestUser('realapi@example.com', 'realapi123', Role.USER, 'Real API User');
    }
  });

  describe('POST /api/connections - Real API Tests', () => {
    it('should create API connection with real Petstore OpenAPI spec', async () => {
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
      
      // The real API should succeed in parsing
      expect(data.data.ingestionStatus).toBe('SUCCEEDED');
      expect(data.data.specHash).toBeDefined();
      expect(data.data.specHash).toHaveLength(64); // SHA-256 hash length
      
      // Should have extracted endpoints
      expect(data.data.endpointCount).toBeGreaterThan(0);
    });

    it('should handle missing OpenAPI spec gracefully', async () => {
      // Mock failed OpenAPI spec fetch
      const { openApiService } = require('../../../src/services/openApiService');
      openApiService.fetchSpec.mockResolvedValue({
        success: false,
        error: 'HTTP 404: Not Found',
        duration: 100
      });

      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'JSONPlaceholder API',
          baseUrl: 'https://jsonplaceholder.typicode.com',
          authType: 'NONE',
          documentationUrl: 'https://jsonplaceholder.typicode.com/openapi.json'
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.ingestionStatus).toBe('FAILED');
      expect(data.warning).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      const { openApiService } = require('../../../src/services/openApiService');
      openApiService.fetchSpec.mockResolvedValue({
        success: false,
        error: 'Network error - unable to reach the server',
        duration: 100
      });

      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Invalid API',
          baseUrl: 'https://invalid-api.com',
          authType: 'NONE',
          documentationUrl: 'https://invalid-api.com/swagger.json'
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.ingestionStatus).toBe('FAILED');
      expect(data.warning).toBeDefined();
    });
  });
}); 