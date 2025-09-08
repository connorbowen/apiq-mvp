import { test, expect, describe, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { prisma } from '../../lib/database/client';
import { TestUser, generateTestId } from '../helpers/testUtils';
import { createTestUser, cleanupTestUser } from '../helpers/authHelpers';

// Test data for API catalog schema
const TEST_API_CATALOG = {
  name: 'Test API Catalog',
  description: 'A test API for schema testing',
  baseUrl: 'https://api.test.com',
  documentationUrl: 'https://api.test.com/openapi.json',
  rawSpec: JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      '/test': {
        get: {
          summary: 'Test endpoint',
          responses: { '200': { description: 'Success' } }
        }
      }
    }
  }),
  specHash: 'test-hash-123',
  version: '1.0.0',
  category: 'testing',
  isPublic: true
};

const TEST_CATALOG_ENDPOINT = {
  path: '/test',
  method: 'GET',
  summary: 'Test endpoint',
  description: 'A test endpoint for schema testing',
  parameters: { query: { test: { type: 'string' } } },
  requestBody: null,
  responses: { '200': { description: 'Success' } },
  responseSchema: { type: 'object', properties: { result: { type: 'string' } } },
  isActive: true
};

let testUser: TestUser;
let createdCatalogIds: string[] = [];
let createdEndpointIds: string[] = [];

describe('API Catalog Schema Integration Tests', () => {
  beforeAll(async () => {
    // Create test user
    testUser = await createTestUser({
      email: `catalog-schema-${generateTestId('user')}@example.com`,
      password: 'testPass123',
      name: 'API Catalog Schema Test User'
    });
  });

  afterAll(async () => {
    // Clean up test data
    for (const id of createdEndpointIds) {
      try {
        await prisma.catalogEndpoint.delete({ where: { id } });
      } catch (error) {
        console.warn(`Failed to cleanup endpoint ${id}:`, error);
      }
    }

    for (const id of createdCatalogIds) {
      try {
        await prisma.apiCatalog.delete({ where: { id } });
      } catch (error) {
        console.warn(`Failed to cleanup catalog ${id}:`, error);
      }
    }

    await cleanupTestUser(testUser.id);
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.catalogEndpoint.deleteMany({
      where: { catalog: { name: { contains: 'Test API' } } }
    });
    await prisma.apiCatalog.deleteMany({
      where: { name: { contains: 'Test API' } }
    });
  });

  describe('ApiCatalog Model', () => {
    test('should create API catalog entry with all required fields', async () => {
      const catalog = await prisma.apiCatalog.create({
        data: TEST_API_CATALOG
      });

      expect(catalog).toBeDefined();
      expect(catalog.id).toBeDefined();
      expect(catalog.name).toBe(TEST_API_CATALOG.name);
      expect(catalog.description).toBe(TEST_API_CATALOG.description);
      expect(catalog.baseUrl).toBe(TEST_API_CATALOG.baseUrl);
      expect(catalog.documentationUrl).toBe(TEST_API_CATALOG.documentationUrl);
      expect(catalog.rawSpec).toBe(TEST_API_CATALOG.rawSpec);
      expect(catalog.specHash).toBe(TEST_API_CATALOG.specHash);
      expect(catalog.version).toBe(TEST_API_CATALOG.version);
      expect(catalog.category).toBe(TEST_API_CATALOG.category);
      expect(catalog.isPublic).toBe(TEST_API_CATALOG.isPublic);
      expect(catalog.ingestionStatus).toBe('PENDING');
      expect(catalog.createdAt).toBeDefined();
      expect(catalog.updatedAt).toBeDefined();

      createdCatalogIds.push(catalog.id);
    });

    test('should enforce unique constraint on baseUrl and specHash', async () => {
      // Create first catalog entry
      const firstCatalog = await prisma.apiCatalog.create({
        data: TEST_API_CATALOG
      });
      createdCatalogIds.push(firstCatalog.id);

      // Try to create duplicate entry
      const duplicateCatalog = {
        ...TEST_API_CATALOG,
        name: 'Duplicate Test API'
      };

      await expect(
        prisma.apiCatalog.create({
          data: duplicateCatalog
        })
      ).rejects.toThrow();

      // Clean up
      await prisma.apiCatalog.delete({ where: { id: firstCatalog.id } });
      createdCatalogIds = createdCatalogIds.filter(id => id !== firstCatalog.id);
    });

    test('should handle optional fields correctly', async () => {
      const minimalCatalog = {
        name: 'Minimal Test API',
        baseUrl: 'https://minimal.test.com',
        documentationUrl: 'https://minimal.test.com/openapi.json',
        rawSpec: '{}',
        specHash: 'minimal-hash'
      };

      const catalog = await prisma.apiCatalog.create({
        data: minimalCatalog
      });

      expect(catalog).toBeDefined();
      expect(catalog.id).toBeDefined();
      expect(catalog.name).toBe(minimalCatalog.name);
      expect(catalog.baseUrl).toBe(minimalCatalog.baseUrl);
      expect(catalog.description).toBeNull();
      expect(catalog.version).toBeNull();
      expect(catalog.category).toBeNull();
      expect(catalog.isPublic).toBe(true); // Default value
      expect(catalog.ingestionStatus).toBe('PENDING'); // Default value

      createdCatalogIds.push(catalog.id);
    });

    test('should update catalog entry correctly', async () => {
      const catalog = await prisma.apiCatalog.create({
        data: TEST_API_CATALOG
      });
      createdCatalogIds.push(catalog.id);

      const updatedData = {
        name: 'Updated Test API',
        description: 'Updated description',
        version: '2.0.0'
      };

      const updatedCatalog = await prisma.apiCatalog.update({
        where: { id: catalog.id },
        data: updatedData
      });

      expect(updatedCatalog.name).toBe(updatedData.name);
      expect(updatedCatalog.description).toBe(updatedData.description);
      expect(updatedCatalog.version).toBe(updatedData.version);
      expect(updatedCatalog.updatedAt.getTime()).toBeGreaterThan(catalog.updatedAt.getTime());
    });

    test('should delete catalog entry and cascade to endpoints', async () => {
      // Create catalog with endpoint
      const catalog = await prisma.apiCatalog.create({
        data: TEST_API_CATALOG
      });

      const endpoint = await prisma.catalogEndpoint.create({
        data: {
          ...TEST_CATALOG_ENDPOINT,
          catalogId: catalog.id
        }
      });

      // Delete catalog
      await prisma.apiCatalog.delete({
        where: { id: catalog.id }
      });

      // Verify endpoint is also deleted (cascade)
      const deletedEndpoint = await prisma.catalogEndpoint.findUnique({
        where: { id: endpoint.id }
      });
      expect(deletedEndpoint).toBeNull();
    });
  });

  describe('CatalogEndpoint Model', () => {
    test('should create catalog endpoint with all required fields', async () => {
      // First create a catalog
      const catalog = await prisma.apiCatalog.create({
        data: TEST_API_CATALOG
      });
      createdCatalogIds.push(catalog.id);

      const endpoint = await prisma.catalogEndpoint.create({
        data: {
          ...TEST_CATALOG_ENDPOINT,
          catalogId: catalog.id
        }
      });

      expect(endpoint).toBeDefined();
      expect(endpoint.id).toBeDefined();
      expect(endpoint.catalogId).toBe(catalog.id);
      expect(endpoint.path).toBe(TEST_CATALOG_ENDPOINT.path);
      expect(endpoint.method).toBe(TEST_CATALOG_ENDPOINT.method);
      expect(endpoint.summary).toBe(TEST_CATALOG_ENDPOINT.summary);
      expect(endpoint.description).toBe(TEST_CATALOG_ENDPOINT.description);
      expect(endpoint.parameters).toEqual(TEST_CATALOG_ENDPOINT.parameters);
      expect(endpoint.requestBody).toBe(TEST_CATALOG_ENDPOINT.requestBody);
      expect(endpoint.responses).toEqual(TEST_CATALOG_ENDPOINT.responses);
      expect(endpoint.responseSchema).toEqual(TEST_CATALOG_ENDPOINT.responseSchema);
      expect(endpoint.isActive).toBe(TEST_CATALOG_ENDPOINT.isActive);
      expect(endpoint.createdAt).toBeDefined();
      expect(endpoint.updatedAt).toBeDefined();

      createdEndpointIds.push(endpoint.id);
    });

    test('should enforce unique constraint on catalogId, path, and method', async () => {
      // Create catalog
      const catalog = await prisma.apiCatalog.create({
        data: TEST_API_CATALOG
      });
      createdCatalogIds.push(catalog.id);

      // Create first endpoint
      const firstEndpoint = await prisma.catalogEndpoint.create({
        data: {
          ...TEST_CATALOG_ENDPOINT,
          catalogId: catalog.id
        }
      });
      createdEndpointIds.push(firstEndpoint.id);

      // Try to create duplicate endpoint
      const duplicateEndpoint = {
        ...TEST_CATALOG_ENDPOINT,
        catalogId: catalog.id,
        summary: 'Different summary'
      };

      await expect(
        prisma.catalogEndpoint.create({
          data: duplicateEndpoint
        })
      ).rejects.toThrow();

      // Clean up
      await prisma.catalogEndpoint.delete({ where: { id: firstEndpoint.id } });
      createdEndpointIds = createdEndpointIds.filter(id => id !== firstEndpoint.id);
    });

    test('should handle optional fields correctly', async () => {
      // Create catalog
      const catalog = await prisma.apiCatalog.create({
        data: TEST_API_CATALOG
      });
      createdCatalogIds.push(catalog.id);

      const minimalEndpoint = {
        catalogId: catalog.id,
        path: '/minimal',
        method: 'GET',
        parameters: {},
        responses: { '200': { description: 'Success' } }
      };

      const endpoint = await prisma.catalogEndpoint.create({
        data: minimalEndpoint
      });

      expect(endpoint).toBeDefined();
      expect(endpoint.id).toBeDefined();
      expect(endpoint.catalogId).toBe(catalog.id);
      expect(endpoint.path).toBe(minimalEndpoint.path);
      expect(endpoint.method).toBe(minimalEndpoint.method);
      expect(endpoint.summary).toBeNull();
      expect(endpoint.description).toBeNull();
      expect(endpoint.requestBody).toBeNull();
      expect(endpoint.responseSchema).toBeNull();
      expect(endpoint.isActive).toBe(true); // Default value

      createdEndpointIds.push(endpoint.id);
    });

    test('should update endpoint correctly', async () => {
      // Create catalog and endpoint
      const catalog = await prisma.apiCatalog.create({
        data: TEST_API_CATALOG
      });
      createdCatalogIds.push(catalog.id);

      const endpoint = await prisma.catalogEndpoint.create({
        data: {
          ...TEST_CATALOG_ENDPOINT,
          catalogId: catalog.id
        }
      });
      createdEndpointIds.push(endpoint.id);

      const updatedData = {
        summary: 'Updated summary',
        description: 'Updated description',
        isActive: false
      };

      const updatedEndpoint = await prisma.catalogEndpoint.update({
        where: { id: endpoint.id },
        data: updatedData
      });

      expect(updatedEndpoint.summary).toBe(updatedData.summary);
      expect(updatedEndpoint.description).toBe(updatedData.description);
      expect(updatedEndpoint.isActive).toBe(updatedData.isActive);
      expect(updatedEndpoint.updatedAt.getTime()).toBeGreaterThan(endpoint.updatedAt.getTime());
    });
  });

  describe('ApiConnection Model Updates', () => {
    test('should link ApiConnection to ApiCatalog', async () => {
      // Create catalog
      const catalog = await prisma.apiCatalog.create({
        data: TEST_API_CATALOG
      });
      createdCatalogIds.push(catalog.id);

      // Create connection linked to catalog
      const connection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          catalogId: catalog.id,
          name: 'Test Connection',
          baseUrl: catalog.baseUrl,
          authType: 'API_KEY',
          authConfig: { apiKey: 'test-key' }
        }
      });

      expect(connection).toBeDefined();
      expect(connection.id).toBeDefined();
      expect(connection.userId).toBe(testUser.id);
      expect(connection.catalogId).toBe(catalog.id);
      expect(connection.name).toBe('Test Connection');
      expect(connection.baseUrl).toBe(catalog.baseUrl);

      // Verify relation works
      const connectionWithCatalog = await prisma.apiConnection.findUnique({
        where: { id: connection.id },
        include: { catalog: true }
      });

      expect(connectionWithCatalog?.catalog).toBeDefined();
      expect(connectionWithCatalog?.catalog?.id).toBe(catalog.id);
      expect(connectionWithCatalog?.catalog?.name).toBe(catalog.name);

      // Clean up
      await prisma.apiConnection.delete({ where: { id: connection.id } });
    });

    test('should maintain backward compatibility for existing connections', async () => {
      // Create connection without catalogId (backward compatibility)
      const connection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: 'Legacy Connection',
          baseUrl: 'https://legacy.api.com',
          authType: 'API_KEY',
          authConfig: { apiKey: 'legacy-key' }
        }
      });

      expect(connection).toBeDefined();
      expect(connection.id).toBeDefined();
      expect(connection.userId).toBe(testUser.id);
      expect(connection.catalogId).toBeNull(); // Should be null for legacy connections
      expect(connection.name).toBe('Legacy Connection');

      // Clean up
      await prisma.apiConnection.delete({ where: { id: connection.id } });
    });

    test('should enforce unique constraint on userId and catalogId', async () => {
      // Create catalog
      const catalog = await prisma.apiCatalog.create({
        data: TEST_API_CATALOG
      });
      createdCatalogIds.push(catalog.id);

      // Create first connection
      const firstConnection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          catalogId: catalog.id,
          name: 'First Connection',
          baseUrl: catalog.baseUrl,
          authType: 'API_KEY',
          authConfig: { apiKey: 'first-key' }
        }
      });

      // Try to create duplicate connection
      const duplicateConnection = {
        userId: testUser.id,
        catalogId: catalog.id,
        name: 'Duplicate Connection',
        baseUrl: catalog.baseUrl,
        authType: 'API_KEY',
        authConfig: { apiKey: 'duplicate-key' }
      };

      await expect(
        prisma.apiConnection.create({
          data: duplicateConnection
        })
      ).rejects.toThrow();

      // Clean up
      await prisma.apiConnection.delete({ where: { id: firstConnection.id } });
    });
  });

  describe('Relations and Queries', () => {
    test('should query catalog with endpoints', async () => {
      // Create catalog with endpoints
      const catalog = await prisma.apiCatalog.create({
        data: TEST_API_CATALOG
      });
      createdCatalogIds.push(catalog.id);

      const endpoint1 = await prisma.catalogEndpoint.create({
        data: {
          ...TEST_CATALOG_ENDPOINT,
          catalogId: catalog.id,
          path: '/endpoint1',
          method: 'GET'
        }
      });
      createdEndpointIds.push(endpoint1.id);

      const endpoint2 = await prisma.catalogEndpoint.create({
        data: {
          ...TEST_CATALOG_ENDPOINT,
          catalogId: catalog.id,
          path: '/endpoint2',
          method: 'POST'
        }
      });
      createdEndpointIds.push(endpoint2.id);

      // Query catalog with endpoints
      const catalogWithEndpoints = await prisma.apiCatalog.findUnique({
        where: { id: catalog.id },
        include: { endpoints: true }
      });

      expect(catalogWithEndpoints).toBeDefined();
      expect(catalogWithEndpoints?.endpoints).toHaveLength(2);
      expect(catalogWithEndpoints?.endpoints.map(e => e.path)).toContain('/endpoint1');
      expect(catalogWithEndpoints?.endpoints.map(e => e.path)).toContain('/endpoint2');
    });

    test('should query catalog with connections', async () => {
      // Create catalog
      const catalog = await prisma.apiCatalog.create({
        data: TEST_API_CATALOG
      });
      createdCatalogIds.push(catalog.id);

      // Create connections
      const connection1 = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          catalogId: catalog.id,
          name: 'Connection 1',
          baseUrl: catalog.baseUrl,
          authType: 'API_KEY',
          authConfig: { apiKey: 'key1' }
        }
      });

      const connection2 = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          catalogId: catalog.id,
          name: 'Connection 2',
          baseUrl: catalog.baseUrl,
          authType: 'API_KEY',
          authConfig: { apiKey: 'key2' }
        }
      });

      // Query catalog with connections
      const catalogWithConnections = await prisma.apiCatalog.findUnique({
        where: { id: catalog.id },
        include: { connections: true }
      });

      expect(catalogWithConnections).toBeDefined();
      expect(catalogWithConnections?.connections).toHaveLength(2);
      expect(catalogWithConnections?.connections.map(c => c.name)).toContain('Connection 1');
      expect(catalogWithConnections?.connections.map(c => c.name)).toContain('Connection 2');

      // Clean up connections
      await prisma.apiConnection.deleteMany({
        where: { id: { in: [connection1.id, connection2.id] } }
      });
    });

    test('should query user connections with catalog information', async () => {
      // Create catalog
      const catalog = await prisma.apiCatalog.create({
        data: TEST_API_CATALOG
      });
      createdCatalogIds.push(catalog.id);

      // Create connection
      const connection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          catalogId: catalog.id,
          name: 'User Connection',
          baseUrl: catalog.baseUrl,
          authType: 'API_KEY',
          authConfig: { apiKey: 'user-key' }
        }
      });

      // Query user connections with catalog
      const userConnections = await prisma.apiConnection.findMany({
        where: { userId: testUser.id },
        include: { catalog: true }
      });

      expect(userConnections).toHaveLength(1);
      expect(userConnections[0].catalog).toBeDefined();
      expect(userConnections[0].catalog?.id).toBe(catalog.id);
      expect(userConnections[0].catalog?.name).toBe(catalog.name);

      // Clean up
      await prisma.apiConnection.delete({ where: { id: connection.id } });
    });
  });

  describe('Data Migration Scenarios', () => {
    test('should handle migration of existing rawSpec data to catalog', async () => {
      // Simulate existing connection with rawSpec
      const existingConnection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: 'Existing Connection',
          baseUrl: 'https://existing.api.com',
          authType: 'API_KEY',
          authConfig: { apiKey: 'existing-key' },
          rawSpec: TEST_API_CATALOG.rawSpec,
          specHash: TEST_API_CATALOG.specHash,
          ingestionStatus: 'SUCCEEDED'
        }
      });

      // Simulate migration: create catalog from existing connection
      const migratedCatalog = await prisma.apiCatalog.create({
        data: {
          name: 'Migrated API',
          description: 'Migrated from existing connection',
          baseUrl: existingConnection.baseUrl,
          documentationUrl: 'https://existing.api.com/openapi.json',
          rawSpec: existingConnection.rawSpec!,
          specHash: existingConnection.specHash!,
          version: '1.0.0',
          category: 'migrated',
          isPublic: true,
          ingestionStatus: 'SUCCEEDED'
        }
      });
      createdCatalogIds.push(migratedCatalog.id);

      // Update connection to reference catalog
      const updatedConnection = await prisma.apiConnection.update({
        where: { id: existingConnection.id },
        data: { catalogId: migratedCatalog.id }
      });

      expect(updatedConnection.catalogId).toBe(migratedCatalog.id);
      expect(updatedConnection.rawSpec).toBe(migratedCatalog.rawSpec);
      expect(updatedConnection.specHash).toBe(migratedCatalog.specHash);

      // Clean up
      await prisma.apiConnection.delete({ where: { id: existingConnection.id } });
    });

    test('should handle migration of existing endpoints to catalog endpoints', async () => {
      // Create catalog
      const catalog = await prisma.apiCatalog.create({
        data: TEST_API_CATALOG
      });
      createdCatalogIds.push(catalog.id);

      // Simulate existing endpoint
      const existingEndpoint = await prisma.endpoint.create({
        data: {
          apiConnectionId: 'dummy-connection-id', // This would be a real connection ID in migration
          path: '/existing',
          method: 'GET',
          summary: 'Existing endpoint',
          description: 'Migrated from existing connection',
          parameters: { query: { param: { type: 'string' } } },
          responses: { '200': { description: 'Success' } },
          responseSchema: { type: 'object' }
        }
      });

      // Simulate migration: create catalog endpoint from existing endpoint
      const migratedEndpoint = await prisma.catalogEndpoint.create({
        data: {
          catalogId: catalog.id,
          path: existingEndpoint.path,
          method: existingEndpoint.method,
          summary: existingEndpoint.summary,
          description: existingEndpoint.description,
          parameters: existingEndpoint.parameters,
          requestBody: existingEndpoint.requestBody,
          responses: existingEndpoint.responses,
          responseSchema: existingEndpoint.responseSchema,
          isActive: existingEndpoint.isActive
        }
      });
      createdEndpointIds.push(migratedEndpoint.id);

      expect(migratedEndpoint.path).toBe(existingEndpoint.path);
      expect(migratedEndpoint.method).toBe(existingEndpoint.method);
      expect(migratedEndpoint.summary).toBe(existingEndpoint.summary);
      expect(migratedEndpoint.parameters).toEqual(existingEndpoint.parameters);

      // Clean up
      await prisma.endpoint.delete({ where: { id: existingEndpoint.id } });
    });
  });
});
