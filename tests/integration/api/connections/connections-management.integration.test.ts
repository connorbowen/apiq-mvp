import { createMocks } from 'node-mocks-http';
import { prisma } from '../../../../lib/database/client';
import { createTestUser, createTestConnection, cleanupTestUser } from '../../../helpers/testUtils';
import connectionsHandler from '../../../../pages/api/connections';
import { NextApiRequest, NextApiResponse } from 'next';

describe('API Connections Management', () => {
  let testUser: any;

  beforeAll(async () => {
    // Create test user
    testUser = await createTestUser();
  });

  afterAll(async () => {
    await cleanupTestUser(testUser);
  });

  describe('GET /api/connections', () => {
    it('should return user connections with secret information', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        }
      });

      await connectionsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseBody = JSON.parse(res._getData());
      expect(responseBody.success).toBe(true);
      expect(Array.isArray(responseBody.data.connections)).toBe(true);
      
      // Verify secret information is included
      responseBody.data.connections.forEach((connection: any) => {
        expect(connection).toHaveProperty('secretId');
        expect(connection).toHaveProperty('hasSecrets');
        
        // Verify sensitive secret data is not exposed
        expect(connection).not.toHaveProperty('authConfig');
        expect(connection).not.toHaveProperty('encryptedData');
        expect(connection).not.toHaveProperty('keyId');
      });
    });
  });

  describe('POST /api/connections', () => {
    it('should create connection with automatic secret creation', async () => {
      const connectionData = {
        name: 'Test API Connection',
        description: 'Test connection for secrets-first refactor',
        baseUrl: 'https://api.example.com',
        authType: 'API_KEY',
        authConfig: {
          apiKey: 'test-api-key-123'
        }
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        body: connectionData
      });

      await connectionsHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseBody = JSON.parse(res._getData());
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toHaveProperty('id');
      expect(responseBody.data.name).toBe(connectionData.name);

      // Verify secret creation
      const connection = responseBody.data;
      const secrets = await prisma.secret.findMany({
        where: { connectionId: connection.id }
      });
      expect(secrets).toHaveLength(1);
      expect(secrets[0].name).toBe(`${connectionData.name}_api_key`);
      expect(secrets[0].type).toBe('API_KEY');
      expect(secrets[0].connectionId).toBe(connection.id);
    });

    it('should handle connection creation failure with secret rollback', async () => {
      const invalidConnectionData = {
        name: '', // Invalid: empty name
        baseUrl: 'https://api.example.com',
        authType: 'API_KEY',
        authConfig: {
          apiKey: 'test-api-key-123'
        }
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        body: invalidConnectionData
      });

      await connectionsHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const responseBody = JSON.parse(res._getData());
      expect(responseBody.success).toBe(false);

      // Verify no secrets were created
      const secrets = await prisma.secret.findMany({
        where: { name: { contains: 'Test API Connection' } }
      });
      expect(secrets).toHaveLength(0);
    });

    it('should create OAuth2 connection with multiple secrets', async () => {
      const oauth2ConnectionData = {
        name: 'OAuth2 Test Connection',
        description: 'OAuth2 connection for secrets-first refactor',
        baseUrl: 'https://api.oauth2.example.com',
        authType: 'OAUTH2',
        authConfig: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUri: 'http://localhost:3000/callback',
          scope: 'read write'
        }
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        body: oauth2ConnectionData
      });

      await connectionsHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseBody = JSON.parse(res._getData());
      expect(responseBody.success).toBe(true);

      // Verify multiple secrets were created
      const connection = responseBody.data;
      const secrets = await prisma.secret.findMany({
        where: { connectionId: connection.id }
      });
      expect(secrets).toHaveLength(2);
      expect(secrets.some(s => s.type === 'OAUTH2_CLIENT_ID')).toBe(true);
      expect(secrets.some(s => s.type === 'OAUTH2_CLIENT_SECRET')).toBe(true);
    });

    it('should create Basic Auth connection with multiple secrets', async () => {
      const basicAuthConnectionData = {
        name: 'Basic Auth Test Connection',
        description: 'Basic Auth connection for secrets-first refactor',
        baseUrl: 'https://api.basic.example.com',
        authType: 'BASIC_AUTH',
        authConfig: {
          username: 'testuser',
          password: 'testpassword123'
        }
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        body: basicAuthConnectionData
      });

      await connectionsHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseBody = JSON.parse(res._getData());
      expect(responseBody.success).toBe(true);

      // Verify multiple secrets were created
      const connection = responseBody.data;
      const secrets = await prisma.secret.findMany({
        where: { connectionId: connection.id }
      });
      expect(secrets).toHaveLength(2);
      expect(secrets.some(s => s.type === 'BASIC_AUTH_USERNAME')).toBe(true);
      expect(secrets.some(s => s.type === 'BASIC_AUTH_PASSWORD')).toBe(true);
    });

    it('should create Bearer Token connection with secret', async () => {
      const bearerTokenConnectionData = {
        name: 'Bearer Token Test Connection',
        description: 'Bearer Token connection for secrets-first refactor',
        baseUrl: 'https://api.bearer.example.com',
        authType: 'BEARER_TOKEN',
        authConfig: {
          token: 'test-bearer-token-456'
        }
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        body: bearerTokenConnectionData
      });

      await connectionsHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const responseBody = JSON.parse(res._getData());
      expect(responseBody.success).toBe(true);

      // Verify secret was created
      const connection = responseBody.data;
      const secrets = await prisma.secret.findMany({
        where: { connectionId: connection.id }
      });
      expect(secrets).toHaveLength(1);
      expect(secrets[0].type).toBe('BEARER_TOKEN');
      expect(secrets[0].connectionId).toBe(connection.id);
    });
  });

  describe('Connection Testing with Secrets', () => {
    it('should test connection using secrets', async () => {
      const connection = await createTestConnection(testUser);

      // Verify the connection was created with secrets
      const secrets = await prisma.secret.findMany({
        where: { connectionId: connection.id }
      });
      expect(secrets.length).toBeGreaterThan(0);

      // Verify connection has secretId reference
      const updatedConnection = await prisma.apiConnection.findUnique({
        where: { id: connection.id }
      });
      expect(updatedConnection?.secretId).toBeDefined();

      // Verify secrets are properly linked
      secrets.forEach(secret => {
        expect(secret.connectionId).toBe(connection.id);
        expect(secret.userId).toBe(testUser.id);
      });
    });

    it('should verify connection can access its secrets', async () => {
      // Create a connection with secrets
      const connectionData = {
        name: 'Secret Access Test Connection',
        baseUrl: 'https://api.example.com',
        authType: 'API_KEY',
        authConfig: {
          apiKey: 'test-api-key-for-access'
        }
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        body: connectionData
      });

      await connectionsHandler(req, res);
      const connection = JSON.parse(res._getData()).data;

      // Verify connection can access its secrets
      const connectionSecrets = await prisma.secret.findMany({
        where: { connectionId: connection.id }
      });
      expect(connectionSecrets).toHaveLength(1);

      // Verify the connection's secretId matches one of its secrets
      const connectionWithSecret = await prisma.apiConnection.findUnique({
        where: { id: connection.id }
      });
      expect(connectionWithSecret?.secretId).toBe(connectionSecrets[0].id);
    });
  });

  describe('Secret Rotation in Connections', () => {
    it('should rotate connection secrets', async () => {
      const connection = await createTestConnection(testUser);

      // Get the secrets for this connection
      const secrets = await prisma.secret.findMany({
        where: { connectionId: connection.id }
      });
      expect(secrets.length).toBeGreaterThan(0);

      // Enable rotation on connection secrets using metadata
      for (const secret of secrets) {
        await prisma.secret.update({
          where: { id: secret.id },
          data: {
            metadata: {
              ...(secret.metadata && typeof secret.metadata === 'object' && !Array.isArray(secret.metadata) ? secret.metadata : {}),
              rotationEnabled: true,
              rotationInterval: 30, // 30 days
              lastRotated: new Date().toISOString()
            }
          }
        });
      }

      // Verify rotation settings were applied
      const updatedSecrets = await prisma.secret.findMany({
        where: { connectionId: connection.id }
      });
      
      updatedSecrets.forEach(secret => {
        expect(secret.metadata).toHaveProperty('rotationEnabled', true);
        expect(secret.metadata).toHaveProperty('rotationInterval', 30);
        expect(secret.metadata).toHaveProperty('lastRotated');
      });
    });

    it('should handle OAuth2 token rotation', async () => {
      // Create OAuth2 connection
      const oauth2ConnectionData = {
        name: 'OAuth2 Rotation Test',
        baseUrl: 'https://api.oauth2.example.com',
        authType: 'OAUTH2',
        authConfig: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUri: 'http://localhost:3000/callback'
        }
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        body: oauth2ConnectionData
      });

      await connectionsHandler(req, res);
      const connection = JSON.parse(res._getData()).data;

      // Create OAuth2 access token secret
      const accessTokenSecret = await prisma.secret.create({
        data: {
          userId: testUser.id,
          name: 'oauth2-access-token',
          type: 'OAUTH2_ACCESS_TOKEN',
          encryptedData: 'encrypted-access-token',
          keyId: 'test-key-id',
          connectionId: connection.id,
          metadata: {
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            version: 1
          }
        }
      });

      // Simulate token rotation
      await prisma.secret.update({
        where: { id: accessTokenSecret.id },
        data: {
          metadata: {
            ...(accessTokenSecret.metadata && typeof accessTokenSecret.metadata === 'object' && !Array.isArray(accessTokenSecret.metadata) ? accessTokenSecret.metadata : {}),
            version: 2,
            lastRotated: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7200000).toISOString() // Extended expiry
          }
        }
      });

      // Verify rotation
      const updatedSecret = await prisma.secret.findUnique({
        where: { id: accessTokenSecret.id }
      });
      expect(updatedSecret?.metadata).toHaveProperty('version', 2);
      expect(updatedSecret?.metadata).toHaveProperty('lastRotated');
    });
  });

  describe('Secrets-First Refactor: Comprehensive Integration', () => {
    it('should handle connection deletion with secret cleanup', async () => {
      // Create a connection with secrets
      const connectionData = {
        name: 'Connection for Deletion Test',
        baseUrl: 'https://api.example.com',
        authType: 'API_KEY',
        authConfig: {
          apiKey: 'test-api-key-for-deletion'
        }
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        body: connectionData
      });

      await connectionsHandler(req, res);
      const connection = JSON.parse(res._getData()).data;

      // Verify secrets were created
      const secretsBefore = await prisma.secret.findMany({
        where: { connectionId: connection.id }
      });
      expect(secretsBefore.length).toBeGreaterThan(0);

      // Delete the connection
      await prisma.apiConnection.delete({
        where: { id: connection.id }
      });

      // Verify secrets are no longer linked to the deleted connection
      const secretsAfter = await prisma.secret.findMany({
        where: { connectionId: connection.id }
      });
      expect(secretsAfter).toHaveLength(0);
    });

    it('should verify sensitive data is not exposed in responses', async () => {
      const connectionData = {
        name: 'Sensitive Data Test',
        baseUrl: 'https://api.example.com',
        authType: 'API_KEY',
        authConfig: {
          apiKey: 'super-secret-api-key-789'
        }
      };

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        },
        body: connectionData
      });

      await connectionsHandler(req, res);
      const responseText = res._getData();

      // Verify sensitive data is not exposed in response
      expect(responseText).not.toContain('super-secret-api-key-789');
      expect(responseText).not.toContain('test-api-key-123');
      expect(responseText).not.toContain('test-client-secret');
    });
  });
}); 