// TODO: [SECRETS-FIRST-REFACTOR] Phase 5: Test Updates
// - Update connection creation tests to verify secret creation
// - Add tests for secret-connection relationship
// - Test rollback scenarios when connection creation fails
// - Update connection testing to use secrets
// - Add tests for secret rotation in connections
// - Test OAuth2 flow with secrets

import request from 'supertest';
import { app } from '../../../../src/app';
import { prisma } from '../../../../src/lib/singletons/prisma';
import { createTestUser, createTestConnection } from '../../../helpers/createTestData';
import { cleanupTestData } from '../../../helpers/cleanupTestData';

describe('API Connections Management', () => {
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    // Create test user and get auth token
    testUser = await createTestUser();
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'testpassword123'
      });
    
    authToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/connections', () => {
    it('should return user connections with secret information', async () => {
      // TODO: [SECRETS-FIRST-REFACTOR] Update test to verify secret references
      // - Verify connection includes secret metadata
      // - Test that sensitive secret data is not exposed
      // - Verify secret rotation status is included
      
      const response = await request(app)
        .get('/api/connections')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.connections)).toBe(true);
      
      // TODO: Add secret validation
      // response.body.data.connections.forEach((connection: any) => {
      //   if (connection.secretInfo) {
      //     expect(connection.secretInfo).toHaveProperty('id');
      //     expect(connection.secretInfo).toHaveProperty('name');
      //     expect(connection.secretInfo).toHaveProperty('type');
      //     expect(connection.secretInfo).toHaveProperty('version');
      //     expect(connection.secretInfo).toHaveProperty('isActive');
      //     expect(connection.secretInfo).toHaveProperty('rotationEnabled');
      //     // Verify sensitive data is not exposed
      //     expect(connection.secretInfo).not.toHaveProperty('encryptedData');
      //     expect(connection.secretInfo).not.toHaveProperty('keyId');
      //   }
      // });
    });
  });

  describe('POST /api/connections', () => {
    it('should create connection with automatic secret creation', async () => {
      // TODO: [SECRETS-FIRST-REFACTOR] Update test to verify secret creation
      // - Verify secrets are created for the connection
      // - Test secret naming convention
      // - Verify secret-connection relationship
      // - Test rollback if connection creation fails
      
      const connectionData = {
        name: 'Test API Connection',
        description: 'Test connection for secrets-first refactor',
        baseUrl: 'https://api.example.com',
        authType: 'API_KEY',
        authConfig: {
          apiKey: 'test-api-key-123'
        }
      };

      const response = await request(app)
        .post('/api/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send(connectionData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.connection).toHaveProperty('id');
      expect(response.body.data.connection.name).toBe(connectionData.name);

      // TODO: Verify secret creation
      // const connection = response.body.data.connection;
      // const secrets = await prisma.secret.findMany({
      //   where: { connectionId: connection.id }
      // });
      // expect(secrets).toHaveLength(1);
      // expect(secrets[0].name).toBe(`${connectionData.name} API Key`);
      // expect(secrets[0].type).toBe('API_KEY');
      // expect(secrets[0].connectionId).toBe(connection.id);
    });

    it('should handle connection creation failure with secret rollback', async () => {
      // TODO: [SECRETS-FIRST-REFACTOR] Add test for rollback scenario
      // - Create invalid connection data
      // - Verify secrets are not created
      // - Test that partial secret creation is rolled back
      
      const invalidConnectionData = {
        name: '', // Invalid: empty name
        baseUrl: 'https://api.example.com',
        authType: 'API_KEY',
        authConfig: {
          apiKey: 'test-api-key-123'
        }
      };

      const response = await request(app)
        .post('/api/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidConnectionData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);

      // TODO: Verify no secrets were created
      // const secrets = await prisma.secret.findMany({
      //   where: { name: { contains: 'Test API Connection' } }
      // });
      // expect(secrets).toHaveLength(0);
    });

    it('should create OAuth2 connection with multiple secrets', async () => {
      // TODO: [SECRETS-FIRST-REFACTOR] Test OAuth2 secret creation
      // - Verify client ID and client secret are stored separately
      // - Test OAuth2 token storage in secrets
      // - Verify OAuth2 flow uses secrets
      
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

      const response = await request(app)
        .post('/api/connections')
        .set('Authorization', `Bearer ${authToken}`)
        .send(oauth2ConnectionData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // TODO: Verify multiple secrets were created
      // const connection = response.body.data.connection;
      // const secrets = await prisma.secret.findMany({
      //   where: { connectionId: connection.id }
      // });
      // expect(secrets).toHaveLength(2);
      // expect(secrets.some(s => s.type === 'OAUTH2_CLIENT_ID')).toBe(true);
      // expect(secrets.some(s => s.type === 'OAUTH2_CLIENT_SECRET')).toBe(true);
    });
  });

  describe('Connection Testing with Secrets', () => {
    it('should test connection using secrets', async () => {
      // TODO: [SECRETS-FIRST-REFACTOR] Update connection testing
      // - Test connection using secrets instead of direct credentials
      // - Verify secret access during testing
      // - Test secret rotation during connection testing
      
      const connection = await createTestConnection(testUser.id);

      const response = await request(app)
        .post(`/api/connections/${connection.id}/test`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // TODO: Verify test used secrets
      // - Check audit logs for secret access
      // - Verify test didn't expose secret values
    });
  });

  describe('Secret Rotation in Connections', () => {
    it('should rotate connection secrets', async () => {
      // TODO: [SECRETS-FIRST-REFACTOR] Test secret rotation
      // - Create connection with rotation-enabled secret
      // - Trigger secret rotation
      // - Verify connection still works after rotation
      // - Test automatic rotation scheduling
      
      const connection = await createTestConnection(testUser.id);

      // TODO: Enable rotation on connection secret
      // await prisma.secret.updateMany({
      //   where: { connectionId: connection.id },
      //   data: { 
      //     rotationEnabled: true,
      //     rotationInterval: 30 // 30 days
      //   }
      // });

      // TODO: Trigger rotation
      // const rotationResponse = await request(app)
      //   .post(`/api/secrets/${secretId}/rotate`)
      //   .set('Authorization', `Bearer ${authToken}`);

      // expect(rotationResponse.status).toBe(200);
      // expect(rotationResponse.body.success).toBe(true);

      // TODO: Verify connection still works
      // const testResponse = await request(app)
      //   .post(`/api/connections/${connection.id}/test`)
      //   .set('Authorization', `Bearer ${authToken}`);

      // expect(testResponse.status).toBe(200);
    });
  });
}); 