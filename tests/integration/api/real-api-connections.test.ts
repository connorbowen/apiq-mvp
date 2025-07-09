import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/connections/index';
import { prisma } from '../../../lib/database/client';
import { createTestSuite, createAuthenticatedRequest, createTestUser } from '../../helpers/testUtils';
import { Role } from '../../../src/generated/prisma';
import fs from 'fs';
import path from 'path';
import { createCommonTestData } from '../../helpers/createTestData';

// Remove OpenAPI service mock - use real OpenAPI service for integration testing
// This ensures we test the actual OpenAPI parsing functionality

// Load local fixture for Petstore API once at module level
const petstoreFixture = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../../fixtures/petstore-openapi.json'),
    'utf-8'
  )
);

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
    // Recreate test data after global setup truncates tables
    const testData = await createCommonTestData();
    testUser = testData.user;
  });

  describe('POST /api/connections - Real API Tests', () => {
    it('should create API connection with real Petstore OpenAPI spec', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Petstore API',
          baseUrl: 'https://petstore.swagger.io/v2',
          authType: 'NONE',
          documentationUrl: 'https://petstore.swagger.io/v2/swagger.json' // Use documentation URL
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

    it('should handle invalid OpenAPI spec gracefully', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Invalid API',
          baseUrl: 'https://invalid-api.com',
          authType: 'NONE',
          documentationUrl: 'https://invalid-api.com/invalid-spec.json' // Invalid OpenAPI spec URL
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.ingestionStatus).toBe('FAILED');
      expect(data.warning).toBeDefined();
    });

    it('should handle malformed OpenAPI spec gracefully', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Malformed API',
          baseUrl: 'https://malformed-api.com',
          authType: 'NONE',
          documentationUrl: 'https://malformed-api.com/malformed-spec.json' // Malformed OpenAPI spec URL
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