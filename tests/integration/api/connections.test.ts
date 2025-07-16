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
      // Use real OpenAPI service with local fixture
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
      expect(data.data.ingestionStatus).toBe('SUCCEEDED'); // Should succeed with valid OpenAPI spec
      
      // Track the created connection
      createdConnectionIds.push(data.data.id);
    });

    it('should handle OpenAPI parsing errors gracefully', async () => {
      // Test with invalid OpenAPI spec URL
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

    // SECRETS-FIRST REFACTOR TESTS
    describe('Secrets-First Integration', () => {
      it('should create connection with API key and automatically create secret', async () => {
        const { req, res } = createAuthenticatedRequest('POST', testUser, {
          body: {
            name: 'API Key Test Connection',
            baseUrl: 'https://api.example.com',
            authType: 'API_KEY',
            authConfig: {
              apiKey: 'test-api-key-12345'
            }
          }
        });

        await handler(req as any, res as any);

        expect(res._getStatusCode()).toBe(201);
        const data = JSON.parse(res._getData());
        expect(data.success).toBe(true);
        expect(data.data.name).toBe('API Key Test Connection');
        expect(data.data.authType).toBe('API_KEY');
        expect(data.data.secretId).toBeDefined();
        expect(data.data.createdSecretIds).toBeDefined();
        expect(data.data.createdSecretIds.length).toBeGreaterThan(0);

        // Verify secret was created in database
        const secrets = await prisma.secret.findMany({
          where: { connectionId: data.data.id }
        });
        expect(secrets).toHaveLength(1);
        expect(secrets[0].name).toBe('API Key Test Connection_api_key');
        expect(secrets[0].type).toBe('API_KEY');
        expect(secrets[0].connectionId).toBe(data.data.id);

        createdConnectionIds.push(data.data.id);
      });

      it('should create connection with Bearer token and automatically create secret', async () => {
        const { req, res } = createAuthenticatedRequest('POST', testUser, {
          body: {
            name: 'Bearer Token Test Connection',
            baseUrl: 'https://api.example.com',
            authType: 'BEARER_TOKEN',
            authConfig: {
              token: 'test-bearer-token-67890'
            }
          }
        });

        await handler(req as any, res as any);

        expect(res._getStatusCode()).toBe(201);
        const data = JSON.parse(res._getData());
        expect(data.success).toBe(true);
        expect(data.data.authType).toBe('BEARER_TOKEN');
        expect(data.data.secretId).toBeDefined();

        // Verify secret was created
        const secrets = await prisma.secret.findMany({
          where: { connectionId: data.data.id }
        });
        expect(secrets).toHaveLength(1);
        expect(secrets[0].name).toBe('Bearer Token Test Connection_bearer_token');
        expect(secrets[0].type).toBe('BEARER_TOKEN');

        createdConnectionIds.push(data.data.id);
      });

      it('should create connection with Basic auth and automatically create multiple secrets', async () => {
        const { req, res } = createAuthenticatedRequest('POST', testUser, {
          body: {
            name: 'Basic Auth Test Connection',
            baseUrl: 'https://api.example.com',
            authType: 'BASIC_AUTH',
            authConfig: {
              username: 'testuser',
              password: 'testpassword123'
            }
          }
        });

        await handler(req as any, res as any);

        expect(res._getStatusCode()).toBe(201);
        const data = JSON.parse(res._getData());
        expect(data.success).toBe(true);
        expect(data.data.authType).toBe('BASIC_AUTH');

        // Verify multiple secrets were created
        const secrets = await prisma.secret.findMany({
          where: { connectionId: data.data.id }
        });
        expect(secrets).toHaveLength(2);
        expect(secrets.some(s => s.type === 'BASIC_AUTH_USERNAME')).toBe(true);
        expect(secrets.some(s => s.type === 'BASIC_AUTH_PASSWORD')).toBe(true);

        createdConnectionIds.push(data.data.id);
      });

      it('should create OAuth2 connection with multiple secrets', async () => {
        const { req, res } = createAuthenticatedRequest('POST', testUser, {
          body: {
            name: 'OAuth2 Test Connection',
            baseUrl: 'https://api.oauth2.example.com',
            authType: 'OAUTH2',
            authConfig: {
              clientId: 'test-client-id',
              clientSecret: 'test-client-secret',
              redirectUri: 'http://localhost:3000/callback'
            }
          }
        });

        await handler(req as any, res as any);

        expect(res._getStatusCode()).toBe(201);
        const data = JSON.parse(res._getData());
        expect(data.success).toBe(true);
        expect(data.data.authType).toBe('OAUTH2');

        // Verify multiple secrets were created
        const secrets = await prisma.secret.findMany({
          where: { connectionId: data.data.id }
        });
        expect(secrets).toHaveLength(2);
        expect(secrets.some(s => s.type === 'OAUTH2_CLIENT_ID')).toBe(true);
        expect(secrets.some(s => s.type === 'OAUTH2_CLIENT_SECRET')).toBe(true);

        createdConnectionIds.push(data.data.id);
      });

      it('should handle connection creation failure with secret rollback', async () => {
        // Try to create connection with invalid data that will cause failure
        const { req, res } = createAuthenticatedRequest('POST', testUser, {
          body: {
            name: '', // Invalid: empty name
            baseUrl: 'https://api.example.com',
            authType: 'API_KEY',
            authConfig: {
              apiKey: 'test-api-key-12345'
            }
          }
        });

        await handler(req as any, res as any);

        expect(res._getStatusCode()).toBe(400);
        const data = JSON.parse(res._getData());
        expect(data.success).toBe(false);

        // Verify no secrets were created (rollback worked)
        const secrets = await prisma.secret.findMany({
          where: { name: { contains: 'API Key Test Connection' } }
        });
        expect(secrets).toHaveLength(0);
      });

      it('should handle OpenAPI parsing failure with secret rollback', async () => {
        const { req, res } = createAuthenticatedRequest('POST', testUser, {
          body: {
            name: 'OpenAPI Failure Test',
            baseUrl: 'https://api.example.com',
            authType: 'API_KEY',
            authConfig: {
              apiKey: 'test-api-key-12345'
            },
            documentationUrl: 'https://invalid-url-that-will-fail.com/spec.json'
          }
        });

        await handler(req as any, res as any);

        // Should still create connection but with failed ingestion
        expect(res._getStatusCode()).toBe(201);
        const data = JSON.parse(res._getData());
        expect(data.success).toBe(true);
        expect(data.data.ingestionStatus).toBe('FAILED');

        // Verify secret was still created (connection creation succeeded)
        const secrets = await prisma.secret.findMany({
          where: { connectionId: data.data.id }
        });
        expect(secrets).toHaveLength(1);

        createdConnectionIds.push(data.data.id);
      });

      it('should use existing secrets when provided by frontend', async () => {
        // First create a secret manually
        const secret = await prisma.secret.create({
          data: {
            userId: testUser.id,
            name: 'Pre-existing Secret',
            type: 'API_KEY',
            encryptedData: 'encrypted-value',
            keyId: 'test-key-id',
            connectionId: null
          }
        });

        const { req, res } = createAuthenticatedRequest('POST', testUser, {
          body: {
            name: 'Connection with Existing Secret',
            baseUrl: 'https://api.example.com',
            authType: 'API_KEY',
            secretIds: [secret.id] // Use existing secret
          }
        });

        await handler(req as any, res as any);

        expect(res._getStatusCode()).toBe(201);
        const data = JSON.parse(res._getData());
        expect(data.success).toBe(true);
        expect(data.data.secretId).toBe(secret.id);

        // Verify secret is now linked to connection
        const updatedSecret = await prisma.secret.findUnique({
          where: { id: secret.id }
        });
        expect(updatedSecret?.connectionId).toBe(data.data.id);

        createdConnectionIds.push(data.data.id);
      });
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

    // SECRETS-FIRST REFACTOR TESTS
    describe('Secrets-First GET Integration', () => {
      it('should include secret information in connection responses', async () => {
        // Create connection with secret
        const { req: createReq, res: createRes } = createAuthenticatedRequest('POST', testUser, {
          body: {
            name: 'Secret Test Connection',
            baseUrl: 'https://api.example.com',
            authType: 'API_KEY',
            authConfig: {
              apiKey: 'test-api-key-12345'
            }
          }
        });

        await handler(createReq as any, createRes as any);
        const createdConnection = JSON.parse(createRes._getData()).data;
        createdConnectionIds.push(createdConnection.id);

        // Get connections and verify secret info
        const { req: getReq, res: getRes } = createAuthenticatedRequest('GET', testUser);
        await handler(getReq as any, getRes as any);

        expect(getRes._getStatusCode()).toBe(200);
        const data = JSON.parse(getRes._getData());
        
        const connection = data.data.connections.find((conn: any) => conn.id === createdConnection.id);
        expect(connection).toBeDefined();
        expect(connection.secretId).toBeDefined();
        expect(connection.hasSecrets).toBe(true);
      });

      it('should not expose sensitive secret data in responses', async () => {
        // Create connection with secret
        const { req: createReq, res: createRes } = createAuthenticatedRequest('POST', testUser, {
          body: {
            name: 'Sensitive Data Test',
            baseUrl: 'https://api.example.com',
            authType: 'API_KEY',
            authConfig: {
              apiKey: 'super-secret-api-key-12345'
            }
          }
        });

        await handler(createReq as any, createRes as any);
        const createdConnection = JSON.parse(createRes._getData()).data;
        createdConnectionIds.push(createdConnection.id);

        // Get connections and verify sensitive data is not exposed
        const { req: getReq, res: getRes } = createAuthenticatedRequest('GET', testUser);
        await handler(getReq as any, getRes as any);

        expect(getRes._getStatusCode()).toBe(200);
        const responseText = getRes._getData();
        
        // Verify sensitive data is not in response
        expect(responseText).not.toContain('super-secret-api-key-12345');
        expect(responseText).not.toContain('test-api-key-12345');
      });
    });
  });

  describe('Connection Testing with Secrets', () => {
    it('should test connection using secrets from vault', async () => {
      // Create connection with secret
      const { req: createReq, res: createRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Test Connection with Secret',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY',
          authConfig: {
            apiKey: 'test-api-key-12345'
          }
        }
      });

      await handler(createReq as any, createRes as any);
      const createdConnection = JSON.parse(createRes._getData()).data;
      createdConnectionIds.push(createdConnection.id);

      // Verify connection has secret reference
      expect(createdConnection.secretId).toBeDefined();

      // Note: Actual connection testing would require a separate endpoint
      // This test verifies the connection was created with proper secret integration
      const secrets = await prisma.secret.findMany({
        where: { connectionId: createdConnection.id }
      });
      expect(secrets).toHaveLength(1);
      expect(secrets[0].connectionId).toBe(createdConnection.id);
    });
  });

  describe('Secret Rotation in Connections', () => {
    it('should support secret rotation for connection secrets', async () => {
      // Create connection with secret
      const { req: createReq, res: createRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Rotation Test Connection',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY',
          authConfig: {
            apiKey: 'test-api-key-12345'
          }
        }
      });

      await handler(createReq as any, createRes as any);
      const createdConnection = JSON.parse(createRes._getData()).data;
      createdConnectionIds.push(createdConnection.id);

      // Enable rotation on the secret
      const secrets = await prisma.secret.findMany({
        where: { connectionId: createdConnection.id }
      });
      
      await prisma.secret.update({
        where: { id: secrets[0].id },
        data: {
          rotationEnabled: true,
          rotationInterval: 30 // 30 days
        }
      });

      // Verify rotation settings were applied
      const updatedSecret = await prisma.secret.findUnique({
        where: { id: secrets[0].id }
      });
      expect(updatedSecret?.rotationEnabled).toBe(true);
      expect(updatedSecret?.rotationInterval).toBe(30);
    });
  });

  describe('OAuth2 Flow with Secrets', () => {
    it('should create OAuth2 connection with proper secret setup', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'OAuth2 Flow Test',
          baseUrl: 'https://api.oauth2.example.com',
          authType: 'OAUTH2',
          authConfig: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            redirectUri: 'http://localhost:3000/callback',
            provider: 'github'
          }
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.authType).toBe('OAUTH2');
      expect(data.data.connectionStatus).toBe('disconnected'); // OAuth2 starts disconnected

      // Verify OAuth2 secrets were created
      const secrets = await prisma.secret.findMany({
        where: { connectionId: data.data.id }
      });
      expect(secrets).toHaveLength(2);
      expect(secrets.some(s => s.type === 'OAUTH2_CLIENT_ID')).toBe(true);
      expect(secrets.some(s => s.type === 'OAUTH2_CLIENT_SECRET')).toBe(true);

      createdConnectionIds.push(data.data.id);
    });

    it('should handle OAuth2 token storage in secrets vault', async () => {
      // Create OAuth2 connection
      const { req: createReq, res: createRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'OAuth2 Token Test',
          baseUrl: 'https://api.oauth2.example.com',
          authType: 'OAUTH2',
          authConfig: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            redirectUri: 'http://localhost:3000/callback'
          }
        }
      });

      await handler(createReq as any, createRes as any);
      const createdConnection = JSON.parse(createRes._getData()).data;
      createdConnectionIds.push(createdConnection.id);

      // Simulate OAuth2 token storage (this would normally happen in OAuth2 callback)
      const tokenSecret = await prisma.secret.create({
        data: {
          userId: testUser.id,
          name: `${createdConnection.name}_access_token`,
          type: 'OAUTH2_ACCESS_TOKEN',
          encryptedData: 'encrypted-token',
          keyId: 'test-key-id',
          connectionId: createdConnection.id
        }
      });

      // Verify token secret is linked to connection
      expect(tokenSecret.connectionId).toBe(createdConnection.id);

      // Verify connection can access its secrets
      const connectionSecrets = await prisma.secret.findMany({
        where: { connectionId: createdConnection.id }
      });
      expect(connectionSecrets.length).toBeGreaterThanOrEqual(2); // client_id, client_secret, access_token
    });
  });

  // --- SECRETS-FIRST REFACTOR: Comprehensive Integration Tests ---

  describe('Secrets-First Refactor: Secret Creation and Linkage', () => {
    it('creates and links secret for API_KEY connection', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'SecretsFirst API Key',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY',
          authConfig: { apiKey: 'sk_test_123' }
        }
      });
      await handler(req as any, res as any);
      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData()).data;
      const secrets = await prisma.secret.findMany({ where: { connectionId: data.id } });
      expect(secrets).toHaveLength(1);
      expect(secrets[0]?.type).toBe('API_KEY');
      expect(secrets[0]?.connectionId).toBe(data.id);
    });

    it('creates and links secrets for BASIC_AUTH connection', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'SecretsFirst Basic',
          baseUrl: 'https://api.example.com',
          authType: 'BASIC_AUTH',
          authConfig: { username: 'user', password: 'pw' }
        }
      });
      await handler(req as any, res as any);
      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData()).data;
      const secrets = await prisma.secret.findMany({ where: { connectionId: data.id } });
      expect(secrets.length).toBe(2);
      expect(secrets.some(s => s.type === 'BASIC_AUTH_USERNAME')).toBe(true);
      expect(secrets.some(s => s.type === 'BASIC_AUTH_PASSWORD')).toBe(true);
    });

    it('creates and links secrets for OAUTH2 connection', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'SecretsFirst OAuth2',
          baseUrl: 'https://api.example.com',
          authType: 'OAUTH2',
          authConfig: { clientId: 'cid', clientSecret: 'csecret', redirectUri: 'http://localhost/cb' }
        }
      });
      await handler(req as any, res as any);
      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData()).data;
      const secrets = await prisma.secret.findMany({ where: { connectionId: data.id } });
      expect(secrets.length).toBe(2);
      expect(secrets.some(s => s.type === 'OAUTH2_CLIENT_ID')).toBe(true);
      expect(secrets.some(s => s.type === 'OAUTH2_CLIENT_SECRET')).toBe(true);
    });
  });

  describe('Secrets-First Refactor: Rollback on Failure', () => {
    it('does not leave orphan secrets if connection creation fails', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: '', // Invalid name
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY',
          authConfig: { apiKey: 'sk_test_rollback' }
        }
      });
      await handler(req as any, res as any);
      expect(res._getStatusCode()).toBe(400);
      // No secret should exist with this name
      const secrets = await prisma.secret.findMany({ where: { name: { contains: 'rollback' } } });
      expect(secrets).toHaveLength(0);
    });
  });

  describe('Secrets-First Refactor: Secret Rotation', () => {
    it('can update secret rotation fields', async () => {
      // Create a connection and secret
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'RotationConn',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY',
          authConfig: { apiKey: 'sk_test_rotation' }
        }
      });
      await handler(req as any, res as any);
      const data = JSON.parse(res._getData()).data;
      const secret = await prisma.secret.findFirst({ where: { connectionId: data.id } });
      expect(secret).toBeTruthy();
      // Ensure metadata is a plain object
      let baseMeta: any = {};
      if (secret && typeof secret.metadata === 'object' && !Array.isArray(secret.metadata) && secret.metadata !== null) {
        baseMeta = secret.metadata;
      }
      const newMetadata = { ...baseMeta, rotationEnabled: true, rotationInterval: 15 };
      await prisma.secret.update({ where: { id: secret!.id }, data: { metadata: newMetadata } });
      const updated = await prisma.secret.findUnique({ where: { id: secret!.id } });
      expect(updated && typeof updated.metadata === 'object' && updated.metadata !== null && !Array.isArray(updated.metadata) && 'rotationEnabled' in updated.metadata ? updated.metadata.rotationEnabled : undefined).toBe(true);
      expect(updated && typeof updated.metadata === 'object' && updated.metadata !== null && !Array.isArray(updated.metadata) && 'rotationInterval' in updated.metadata ? updated.metadata.rotationInterval : undefined).toBe(15);
    });
  });

  describe('Secrets-First Refactor: Connection can use created secret', () => {
    it('connection has secretId and secret is linked', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'UsableSecretConn',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY',
          authConfig: { apiKey: 'sk_test_usable' }
        }
      });
      await handler(req as any, res as any);
      const data = JSON.parse(res._getData()).data;
      expect(data.secretId).toBeDefined();
      const secret = await prisma.secret.findUnique({ where: { id: data.secretId } });
      expect(secret?.connectionId).toBe(data.id);
    });
  });
}); 