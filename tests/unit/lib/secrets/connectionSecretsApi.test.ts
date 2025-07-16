// TODO: [SECRETS-FIRST-REFACTOR] Phase 5: Test Updates
// - Test connection-specific secrets API endpoints
// - Test secret creation for connections
// - Test secret retrieval for connections
// - Test secret validation and error handling

import { createMocks } from 'node-mocks-http';
import { prisma } from '../../../../lib/database/client';
import { secretsVault } from '../../../../src/lib/secrets/secretsVault';
import { createTestUser, cleanupTestUser } from '../../../helpers/testUtils';
import connectionSecretsHandler from '../../../../pages/api/connections/[id]/secrets';
import { NextApiRequest, NextApiResponse } from 'next';

describe('Connection Secrets API', () => {
  let testUser: any;
  let testConnection: any;

  beforeAll(async () => {
    testUser = await createTestUser();
    
    // Create a test connection
    testConnection = await prisma.apiConnection.create({
      data: {
        userId: testUser.id,
        name: 'Test Connection for Secrets API',
        baseUrl: 'https://api.example.com',
        authType: 'API_KEY',
        authConfig: {},
        status: 'ACTIVE',
        ingestionStatus: 'PENDING'
      }
    });
  });

  afterAll(async () => {
    await cleanupTestUser(testUser);
  });

  beforeEach(async () => {
    // Clean up any existing test secrets
    await prisma.secret.deleteMany({
      where: { userId: testUser.id }
    });
  });

  describe('GET /api/connections/[id]/secrets', () => {
    it('should return secrets for a connection', async () => {
      // Create a test secret for the connection
      await secretsVault.storeSecret(
        testUser.id,
        'test_api_key',
        { value: 'test-api-key-value' },
        'API_KEY',
        undefined,
        undefined,
        testConnection.id,
        testConnection.name
      );

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        query: {
          id: testConnection.id
        }
      });

      await connectionSecretsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseBody = JSON.parse(res._getData());
      expect(responseBody.success).toBe(true);
      expect(Array.isArray(responseBody.data.secrets)).toBe(true);
      expect(responseBody.data.secrets).toHaveLength(1);
      
      const secret = responseBody.data.secrets[0];
      expect(secret.connectionId).toBe(testConnection.id);
      expect(secret.name).toBe('test_api_key');
      expect(secret.type).toBe('API_KEY');
      
      // Verify sensitive data is not exposed
      expect(secret).not.toHaveProperty('encryptedData');
      expect(secret).not.toHaveProperty('keyId');
    });

    it('should return empty array when no secrets exist', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        query: {
          id: testConnection.id
        }
      });

      await connectionSecretsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseBody = JSON.parse(res._getData());
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.secrets).toHaveLength(0);
    });

    it('should return 404 for non-existent connection', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        query: {
          id: 'non-existent-connection-id'
        }
      });

      await connectionSecretsHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const responseBody = JSON.parse(res._getData());
      expect(responseBody.success).toBe(false);
    });
  });

  describe('POST /api/connections/[id]/secrets', () => {
    it('should create a secret for a connection', async () => {
      const secretData = {
        name: 'new_api_key',
        type: 'API_KEY' as const,
        value: 'new-api-key-value',
        description: 'New API key for testing',
        enableRotation: false
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        query: {
          id: testConnection.id
        },
        body: secretData
      });

      await connectionSecretsHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseBody = JSON.parse(res._getData());
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.secret).toBeDefined();
      
      const secret = responseBody.data.secret;
      expect(secret.connectionId).toBe(testConnection.id);
      expect(secret.name).toBe(secretData.name);
      expect(secret.type).toBe(secretData.type);
      expect(secret.isActive).toBe(true);
      
      // Verify the secret was actually created in the database
      const dbSecret = await prisma.secret.findUnique({
        where: { userId_name: { userId: testUser.id, name: secretData.name } }
      });
      expect(dbSecret).toBeDefined();
      expect(dbSecret?.connectionId).toBe(testConnection.id);
    });

    it('should create a secret with rotation enabled', async () => {
      const secretData = {
        name: 'rotating_api_key',
        type: 'API_KEY' as const,
        value: 'rotating-api-key-value',
        description: 'API key with rotation enabled',
        enableRotation: true,
        rotationInterval: 30
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        query: {
          id: testConnection.id
        },
        body: secretData
      });

      await connectionSecretsHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseBody = JSON.parse(res._getData());
      expect(responseBody.success).toBe(true);
      
      const secret = responseBody.data.secret;
      expect(secret.rotationEnabled).toBe(true);
      expect(secret.rotationInterval).toBe(30);
    });

    it('should validate secret type compatibility with connection auth type', async () => {
      // Create a connection with OAUTH2 auth type
      const oauth2Connection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: 'OAuth2 Connection',
          baseUrl: 'https://api.oauth2.example.com',
          authType: 'OAUTH2',
          authConfig: {},
          status: 'ACTIVE',
          ingestionStatus: 'PENDING'
        }
      });

      const secretData = {
        name: 'oauth2_client_id',
        type: 'OAUTH2_CLIENT_ID' as const,
        value: 'oauth2-client-id-value',
        description: 'OAuth2 client ID'
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        query: {
          id: oauth2Connection.id
        },
        body: secretData
      });

      await connectionSecretsHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseBody = JSON.parse(res._getData());
      expect(responseBody.success).toBe(true);
      
      const secret = responseBody.data.secret;
      expect(secret.type).toBe('OAUTH2_CLIENT_ID');
      expect(secret.connectionId).toBe(oauth2Connection.id);

      // Clean up
      await prisma.apiConnection.delete({
        where: { id: oauth2Connection.id }
      });
    });

    it('should return 400 for invalid secret data', async () => {
      const invalidSecretData = {
        name: '', // Invalid: empty name
        type: 'API_KEY' as const,
        value: 'test-value'
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        query: {
          id: testConnection.id
        },
        body: invalidSecretData
      });

      await connectionSecretsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseBody = JSON.parse(res._getData());
      expect(responseBody.success).toBe(false);
    });

    it('should return 404 for non-existent connection', async () => {
      const secretData = {
        name: 'test_secret',
        type: 'API_KEY' as const,
        value: 'test-value'
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        query: {
          id: 'non-existent-connection-id'
        },
        body: secretData
      });

      await connectionSecretsHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const responseBody = JSON.parse(res._getData());
      expect(responseBody.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error by trying to create a secret with invalid data
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        query: {
          id: testConnection.id
        },
        body: {
          name: 'test_secret',
          type: 'INVALID_TYPE' as any, // Invalid type
          value: 'test-value'
        }
      });

      await connectionSecretsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseBody = JSON.parse(res._getData());
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toBeDefined();
    });
  });
}); 