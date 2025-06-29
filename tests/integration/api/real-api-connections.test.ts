import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/connections/index';
import { prisma } from '../../../lib/database/client';
import { createTestSuite, createAuthenticatedRequest, createUnauthenticatedRequest } from '../../helpers/testUtils';
import { Role } from '../../../src/generated/prisma';

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
    // Clean up any connections created by previous tests in this suite
    await prisma.apiConnection.deleteMany({
      where: {
        userId: testUser.id
      }
    });
  });

  describe('POST /api/connections - Real API Tests', () => {
    it('should create API connection with real Petstore OpenAPI spec', async () => {
      // This test uses the real Petstore API
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Real Petstore API',
          baseUrl: 'https://petstore.swagger.io/v2',
          authType: 'NONE',
          documentationUrl: 'https://petstore.swagger.io/v2/swagger.json'
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Real Petstore API');
      expect(data.data.baseUrl).toBe('https://petstore.swagger.io/v2');
      expect(data.data.authType).toBe('NONE');
      
      // The real API should succeed in parsing
      expect(data.data.ingestionStatus).toBe('SUCCEEDED');
      expect(data.data.specHash).toBeDefined();
      expect(data.data.specHash).toHaveLength(64); // SHA-256 hash length
      
      // Should have extracted endpoints from the real Petstore API
      expect(data.data.endpointCount).toBeDefined();
      expect(typeof data.data.endpointCount).toBe('number');
      expect(data.data.endpointCount).toBeGreaterThan(0);
    }, 30000); // Increase timeout for real API call

    it('should create API connection with JSONPlaceholder API', async () => {
      // Test with another public API
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
      expect(data.data.name).toBe('JSONPlaceholder API');
      
      // This API might not have OpenAPI spec, so ingestion could fail
      // But the connection should still be created
      expect(['SUCCEEDED', 'FAILED']).toContain(data.data.ingestionStatus);
      expect(data.data.endpointCount).toBeDefined();
    }, 30000);

    it('should handle invalid OpenAPI URL gracefully', async () => {
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
      expect(data.data.name).toBe('Invalid API');
      expect(data.data.ingestionStatus).toBe('FAILED');
      expect(data.warning).toBeDefined();
      expect(data.data.endpointCount).toBeDefined();
    }, 30000);
  });
}); 