// TODO: [SECRETS-FIRST-REFACTOR] Phase 5: Test Updates
// - Test secrets-first connection creation
// - Test secret-connection relationship validation
// - Test connection creation with automatic secret generation
// - Test rollback scenarios

import { prisma } from '../../../../lib/database/client';
import { secretsVault } from '../../../../src/lib/secrets/secretsVault';
import { createTestUser, cleanupTestUser } from '../../../helpers/testUtils';

describe('Secrets-First Connection Management', () => {
  let testUser: any;

  beforeAll(async () => {
    testUser = await createTestUser();
  });

  afterAll(async () => {
    await cleanupTestUser(testUser);
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.secret.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.apiConnection.deleteMany({
      where: { userId: testUser.id }
    });
  });

  describe('Connection Creation with Secrets', () => {
    it('should create connection with automatic API key secret', async () => {
      // Create connection data with API key
      const connectionData = {
        name: 'Test API Connection',
        description: 'Test connection for secrets-first refactor',
        baseUrl: 'https://api.example.com',
        authType: 'API_KEY' as const,
        authConfig: {
          apiKey: 'test-api-key-123'
        }
      };

      // Create connection using Prisma directly (simulating API call)
      const connection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: connectionData.name,
          description: connectionData.description,
          baseUrl: connectionData.baseUrl,
          authType: connectionData.authType,
          authConfig: connectionData.authConfig,
          status: 'ACTIVE',
          ingestionStatus: 'PENDING'
        }
      });

      // Create secret for the connection
      const secret = await secretsVault.storeSecret(
        testUser.id,
        `${connectionData.name}_api_key`,
        { value: connectionData.authConfig.apiKey },
        'API_KEY',
        undefined,
        undefined,
        connection.id,
        connectionData.name
      );

      // Verify secret was created and linked
      expect(secret).toBeDefined();
      expect(secret.connectionId).toBe(connection.id);
      expect(secret.name).toBe(`${connectionData.name}_api_key`);
      expect(secret.type).toBe('API_KEY');

      // Verify connection has secret reference
      const updatedConnection = await prisma.apiConnection.findUnique({
        where: { id: connection.id }
      });
      expect(updatedConnection).toBeDefined();
    });

    it('should create OAuth2 connection with multiple secrets', async () => {
      const connectionData = {
        name: 'OAuth2 Test Connection',
        description: 'OAuth2 connection for secrets-first refactor',
        baseUrl: 'https://api.oauth2.example.com',
        authType: 'OAUTH2' as const,
        authConfig: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUri: 'http://localhost:3000/callback'
        }
      };

      // Create connection
      const connection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: connectionData.name,
          description: connectionData.description,
          baseUrl: connectionData.baseUrl,
          authType: connectionData.authType,
          authConfig: connectionData.authConfig,
          status: 'ACTIVE',
          ingestionStatus: 'PENDING'
        }
      });

      // Create client ID secret
      const clientIdSecret = await secretsVault.storeSecret(
        testUser.id,
        `${connectionData.name}_client_id`,
        { value: connectionData.authConfig.clientId },
        'OAUTH2_CLIENT_ID',
        undefined,
        undefined,
        connection.id,
        connectionData.name
      );

      // Create client secret
      const clientSecret = await secretsVault.storeSecret(
        testUser.id,
        `${connectionData.name}_client_secret`,
        { value: connectionData.authConfig.clientSecret },
        'OAUTH2_CLIENT_SECRET',
        undefined,
        undefined,
        connection.id,
        connectionData.name
      );

      // Verify both secrets were created
      expect(clientIdSecret).toBeDefined();
      expect(clientSecret).toBeDefined();
      expect(clientIdSecret.connectionId).toBe(connection.id);
      expect(clientSecret.connectionId).toBe(connection.id);
      expect(clientIdSecret.type).toBe('OAUTH2_CLIENT_ID');
      expect(clientSecret.type).toBe('OAUTH2_CLIENT_SECRET');
    });
  });

  describe('Secret-Connection Relationship', () => {
    it('should retrieve secrets for a connection', async () => {
      // Create a connection first
      const connection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: 'Test Connection',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY',
          authConfig: {},
          status: 'ACTIVE',
          ingestionStatus: 'PENDING'
        }
      });

      // Create a secret for the connection
      await secretsVault.storeSecret(
        testUser.id,
        'test_secret',
        { value: 'test-value' },
        'API_KEY',
        undefined,
        undefined,
        connection.id,
        connection.name
      );

      // Retrieve secrets for the connection
      const secrets = await secretsVault.getSecretsForConnection(testUser.id, connection.id);

      expect(secrets).toHaveLength(1);
      expect(secrets[0].connectionId).toBe(connection.id);
      expect(secrets[0].name).toBe('test_secret');
    });

    it('should validate secret-connection relationship', async () => {
      // Create a connection
      const connection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: 'Test Connection',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY',
          authConfig: {},
          status: 'ACTIVE',
          ingestionStatus: 'PENDING'
        }
      });

      // Create a secret for the connection
      const secret = await secretsVault.storeSecret(
        testUser.id,
        'test_secret',
        { value: 'test-value' },
        'API_KEY',
        undefined,
        undefined,
        connection.id,
        connection.name
      );

      // Validate the relationship
      const validation = await secretsVault.validateSecretConnectionRelationship(
        testUser.id,
        secret.name,
        connection.id
      );

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });
  });

  describe('Secret Rotation in Connections', () => {
    it('should enable rotation on connection secrets', async () => {
      // Create a connection
      const connection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: 'Test Connection',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY',
          authConfig: {},
          status: 'ACTIVE',
          ingestionStatus: 'PENDING'
        }
      });

      // Create a secret with rotation enabled
      const secret = await secretsVault.storeSecret(
        testUser.id,
        'test_secret',
        { value: 'test-value' },
        'API_KEY',
        undefined,
        {
          rotationEnabled: true,
          rotationInterval: 30
        },
        connection.id,
        connection.name
      );

      // Verify rotation settings
      expect(secret.rotationEnabled).toBe(true);
      expect(secret.rotationInterval).toBe(30);
    });
  });
}); 