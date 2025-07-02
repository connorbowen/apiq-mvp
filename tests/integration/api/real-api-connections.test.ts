import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/connections/index';
import { prisma } from '../../../lib/database/client';
import { createTestSuite, createAuthenticatedRequest, createTestUser } from '../../helpers/testUtils';
import { Role } from '../../../src/generated/prisma';
import fs from 'fs';
import path from 'path';

// Mock the OpenAPI service to avoid external network calls
jest.mock('../../../src/services/openApiService', () => ({
  openApiService: {
    fetchSpec: jest.fn()
  }
}));

// Load local fixture for Petstore API once at module level
const petstoreFixture = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../../fixtures/petstore-openapi.json'),
    'utf-8'
  )
);

// Get the mocked service once at module level
const { openApiService } = require('../../../src/services/openApiService');

describe('Real API Connections Integration Tests', () => {
  const testSuite = createTestSuite('Real API Connections Tests');
  let testUser: any;

  beforeAll(async () => {
    await testSuite.beforeAll();
    
    // Create test user once for the entire suite
    testUser = await testSuite.createUser(
      undefined,
      'admin123',
      Role.ADMIN,
      'Real API Test Admin User'
    );
  });

  afterAll(async () => {
    await testSuite.afterAll();
  });

  beforeEach(async () => {
    // Clear mocks but don't recreate them
    jest.clearAllMocks();
    
    // Reset mock implementations for each test
    openApiService.fetchSpec.mockReset();
  });

  describe('POST /api/connections - Real API Tests', () => {
    it('should create API connection with real Petstore OpenAPI spec', async () => {
      // Mock successful OpenAPI spec fetch
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