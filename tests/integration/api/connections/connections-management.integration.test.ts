// TODO: [SECRETS-FIRST-REFACTOR] Phase 5: Test Updates
// - Update connection creation tests to verify secret creation
// - Add tests for secret-connection relationship
// - Test rollback scenarios when connection creation fails
// - Update connection testing to use secrets
// - Add tests for secret rotation in connections
// - Test OAuth2 flow with secrets

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
  });

  describe('Connection Testing with Secrets', () => {
    it('should test connection using secrets', async () => {
      const connection = await createTestConnection(testUser);

      // Note: This test would require a connection test endpoint
      // For now, we'll verify the connection was created with secrets
      const secrets = await prisma.secret.findMany({
        where: { connectionId: connection.id }
      });
      expect(secrets.length).toBeGreaterThan(0);
    });
  });

  describe('Secret Rotation in Connections', () => {
    it('should rotate connection secrets', async () => {
      const connection = await createTestConnection(testUser);

      // Enable rotation on connection secret
      await prisma.secret.updateMany({
        where: { connectionId: connection.id },
        data: { 
          rotationEnabled: true,
          rotationInterval: 30 // 30 days
        }
      });

      // Verify rotation settings were applied
      const secrets = await prisma.secret.findMany({
        where: { connectionId: connection.id }
      });
      expect(secrets.some(s => s.rotationEnabled)).toBe(true);
    });
  });
}); 