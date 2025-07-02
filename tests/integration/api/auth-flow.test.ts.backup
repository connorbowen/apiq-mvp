// TODO: [connorbowen] 2025-06-29 - This test file exceeds the 200-300 line threshold (currently 507 lines).
// Consider splitting into smaller, focused test files:
// - auth-flow.login.test.ts
// - auth-flow.registration.test.ts  
// - auth-flow.password-reset.test.ts
// Priority: Low - tests are working well, refactoring for maintainability only.

import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/connections/index';
import { prisma } from '../../../lib/database/client';
import { createTestSuite, createAuthenticatedRequest, createUnauthenticatedRequest, createTestUser } from '../../helpers/testUtils';
import { Role } from '../../../src/generated/prisma';

describe('Authentication Flow Testing - Phase 2.3', () => {
  const testSuite = createTestSuite('Authentication Flow Tests');
  let testUser: any;

  beforeAll(async () => {
    await testSuite.beforeAll();
    // testUser creation moved to beforeEach
  });

  afterAll(async () => {
    await testSuite.afterAll();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.endpoint.deleteMany({
      where: {
        apiConnection: {
          user: {
            OR: [
              { email: { contains: 'test-' } },
              { email: { contains: '@example.com' } }
            ]
          }
        }
      }
    });
    await prisma.apiConnection.deleteMany({
      where: {
        user: {
          OR: [
            { email: { contains: 'test-' } },
            { email: { contains: '@example.com' } }
          ]
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-' } },
          { email: { contains: '@example.com' } }
        ]
      }
    });
    // Always create testUser after cleanup
    testUser = await createTestUser(undefined, 'authflow123', Role.USER, 'Auth Flow User');
  });

  describe('API Key Authentication', () => {
    it('should create API connection with API key authentication', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'GitHub API with Key',
          description: 'Test API key authentication with GitHub',
          baseUrl: 'https://api.github.com',
          authType: 'API_KEY',
          authConfig: {
            keyName: 'Authorization',
            keyLocation: 'header',
            keyPrefix: 'token'
          },
          documentationUrl: 'https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json'
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.authType).toBe('API_KEY');
      expect(data.data.authConfig.keyName).toBe('Authorization');
      expect(data.data.authConfig.keyLocation).toBe('header');
      expect(data.data.authConfig.keyPrefix).toBe('token');
    });

    it('should store and retrieve API key credentials securely', async () => {
      // First create a connection
      const { req: createReq, res: createRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Test API Key Connection',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY',
          authConfig: {
            keyName: 'X-API-Key',
            keyLocation: 'header'
          }
        }
      });

      await handler(createReq as any, createRes as any);
      const connectionData = JSON.parse(createRes._getData());
      const connectionId = connectionData.data.id;

      // Store credentials
      const { req: storeReq, res: storeRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          credentialData: {
            type: 'api_key',
            apiKey: 'test-api-key-12345',
            keyName: 'X-API-Key',
            keyLocation: 'header'
          },
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
      storeReq.query = { id: connectionId };

      // Mock the credentials endpoint handler
      const credentialsHandler = require('../../../pages/api/connections/[id]/credentials').default;
      await credentialsHandler(storeReq as any, storeRes as any);

      expect(storeRes._getStatusCode()).toBe(201);
      const storeData = JSON.parse(storeRes._getData());
      expect(storeData.success).toBe(true);
      expect(storeData.data.keyId).toBeDefined();

      // Retrieve credentials metadata (should not expose actual key)
      const { req: getReq, res: getRes } = createAuthenticatedRequest('GET', testUser);
      getReq.query = { id: connectionId };

      await credentialsHandler(getReq as any, getRes as any);

      expect(getRes._getStatusCode()).toBe(200);
      const getData = JSON.parse(getRes._getData());
      expect(getData.success).toBe(true);
      expect(getData.data.hasCredentials).toBe(true);
      expect(getData.data.credentialType).toBe('api_key');
      expect(getData.data.isActive).toBe(true);

      // Verify the actual API key is not exposed
      const responseText = getRes._getData();
      expect(responseText).not.toContain('test-api-key-12345');
    });
  });

  describe('Bearer Token Authentication', () => {
    it('should create API connection with Bearer token authentication', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Bearer Token API',
          description: 'Test Bearer token authentication',
          baseUrl: 'https://api.example.com',
          authType: 'BEARER_TOKEN',
          authConfig: {
            tokenPrefix: 'Bearer'
          }
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.authType).toBe('BEARER_TOKEN');
      expect(data.data.authConfig.tokenPrefix).toBe('Bearer');
    });

    it('should store and retrieve Bearer token credentials securely', async () => {
      // Create connection
      const { req: createReq, res: createRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Bearer Token Test',
          baseUrl: 'https://api.example.com',
          authType: 'BEARER_TOKEN'
        }
      });

      await handler(createReq as any, createRes as any);
      const connectionData = JSON.parse(createRes._getData());
      const connectionId = connectionData.data.id;

      // Store Bearer token
      const { req: storeReq, res: storeRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          credentialData: {
            type: 'bearer_token',
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.bearer.token',
            tokenPrefix: 'Bearer'
          },
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });
      storeReq.query = { id: connectionId };

      const credentialsHandler = require('../../../pages/api/connections/[id]/credentials').default;
      await credentialsHandler(storeReq as any, storeRes as any);

      expect(storeRes._getStatusCode()).toBe(201);

      // Verify token is not exposed in response
      const responseText = storeRes._getData();
      expect(responseText).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.bearer.token');
    });
  });

  describe('Basic Authentication', () => {
    it('should create API connection with Basic authentication', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Basic Auth API',
          description: 'Test Basic authentication',
          baseUrl: 'https://api.example.com',
          authType: 'BASIC_AUTH',
          authConfig: {
            usernameField: 'username',
            passwordField: 'password'
          }
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.authType).toBe('BASIC_AUTH');
      expect(data.data.authConfig.usernameField).toBe('username');
      expect(data.data.authConfig.passwordField).toBe('password');
    });

    it('should store and retrieve Basic auth credentials securely', async () => {
      // Create connection
      const { req: createReq, res: createRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Basic Auth Test',
          baseUrl: 'https://api.example.com',
          authType: 'BASIC_AUTH'
        }
      });

      await handler(createReq as any, createRes as any);
      const connectionData = JSON.parse(createRes._getData());
      const connectionId = connectionData.data.id;

      // Store Basic auth credentials
      const { req: storeReq, res: storeRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          credentialData: {
            type: 'basic_auth',
            username: 'testuser',
            password: 'testpassword123'
          },
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
        }
      });
      storeReq.query = { id: connectionId };

      const credentialsHandler = require('../../../pages/api/connections/[id]/credentials').default;
      await credentialsHandler(storeReq as any, storeRes as any);

      expect(storeRes._getStatusCode()).toBe(201);

      // Verify credentials are not exposed in response
      const responseText = storeRes._getData();
      expect(responseText).not.toContain('testuser');
      expect(responseText).not.toContain('testpassword123');
    });
  });

  describe('OAuth2 Authentication', () => {
    it('should create API connection with OAuth2 authentication', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'GitHub OAuth2 API',
          description: 'Test OAuth2 authentication with GitHub',
          baseUrl: 'https://api.github.com',
          authType: 'OAUTH2',
          authConfig: {
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            authorizationUrl: 'https://github.com/login/oauth/authorize',
            tokenUrl: 'https://github.com/login/oauth/access_token',
            scopes: ['repo', 'user']
          }
        }
      });

      await handler(req as any, res as any);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.authType).toBe('OAUTH2');
      expect(data.data.authConfig.clientId).toBe('test-client-id');
      expect(data.data.authConfig.scopes).toEqual(['repo', 'user']);
    });

    it('should store and retrieve OAuth2 credentials securely', async () => {
      // Create connection
      const { req: createReq, res: createRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'OAuth2 Test',
          baseUrl: 'https://api.github.com',
          authType: 'OAUTH2'
        }
      });

      await handler(createReq as any, createRes as any);
      const connectionData = JSON.parse(createRes._getData());
      const connectionId = connectionData.data.id;

      // Store OAuth2 credentials
      const { req: storeReq, res: storeRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          credentialData: {
            type: 'oauth2',
            accessToken: 'gho_test_access_token_12345',
            refreshToken: 'ghr_test_refresh_token_67890',
            tokenType: 'bearer',
            expiresIn: 3600,
            scopes: ['repo', 'user']
          },
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
        }
      });
      storeReq.query = { id: connectionId };

      const credentialsHandler = require('../../../pages/api/connections/[id]/credentials').default;
      await credentialsHandler(storeReq as any, storeRes as any);

      expect(storeRes._getStatusCode()).toBe(201);

      // Verify OAuth2 tokens are not exposed in response
      const responseText = storeRes._getData();
      expect(responseText).not.toContain('gho_test_access_token_12345');
      expect(responseText).not.toContain('ghr_test_refresh_token_67890');
    });
  });

  describe('Security Validation', () => {
    it('should not expose credentials in API responses', async () => {
      // Create connection with API key
      const { req: createReq, res: createRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Security Test API',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY'
        }
      });

      await handler(createReq as any, createRes as any);
      const connectionData = JSON.parse(createRes._getData());
      const connectionId = connectionData.data.id;

      // Store sensitive credentials
      const sensitiveData = {
        apiKey: 'sk_live_super_secret_key_12345',
        secretKey: 'sk_live_another_secret_67890',
        password: 'super_secret_password'
      };

      const { req: storeReq, res: storeRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          credentialData: sensitiveData,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
      storeReq.query = { id: connectionId };

      const credentialsHandler = require('../../../pages/api/connections/[id]/credentials').default;
      await credentialsHandler(storeReq as any, storeRes as any);

      // Verify credentials are stored successfully
      expect(storeRes._getStatusCode()).toBe(201);

      // Verify sensitive data is not exposed in any response
      const storeResponseText = storeRes._getData();
      Object.values(sensitiveData).forEach(secret => {
        expect(storeResponseText).not.toContain(secret);
      });

      // Test GET request doesn't expose credentials
      const { req: getReq, res: getRes } = createAuthenticatedRequest('GET', testUser);
      getReq.query = { id: connectionId };

      await credentialsHandler(getReq as any, getRes as any);

      const getResponseText = getRes._getData();
      Object.values(sensitiveData).forEach(secret => {
        expect(getResponseText).not.toContain(secret);
      });
    });

    it('should enforce proper authorization for credential access', async () => {
      // Create connection
      const { req: createReq, res: createRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Auth Test API',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY'
        }
      });

      await handler(createReq as any, createRes as any);
      const connectionData = JSON.parse(createRes._getData());
      const connectionId = connectionData.data.id;

      // Create another user
      const otherUser = await testSuite.createUser(undefined, 'testpass123', Role.USER);

      // Try to access credentials with different user
      const { req: unauthorizedReq, res: unauthorizedRes } = createAuthenticatedRequest('GET', otherUser);
      unauthorizedReq.query = { id: connectionId };

      const credentialsHandler = require('../../../pages/api/connections/[id]/credentials').default;
      await credentialsHandler(unauthorizedReq as any, unauthorizedRes as any);

      // Should be denied access
      expect(unauthorizedRes._getStatusCode()).toBe(404);
    });

    it('should validate credential expiration', async () => {
      // Create connection
      const { req: createReq, res: createRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Expiration Test API',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY'
        }
      });

      await handler(createReq as any, createRes as any);
      const connectionData = JSON.parse(createRes._getData());
      const connectionId = connectionData.data.id;

      // Store credentials with past expiration
      const { req: storeReq, res: storeRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          credentialData: {
            type: 'api_key',
            apiKey: 'test-key'
          },
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      });
      storeReq.query = { id: connectionId };

      const credentialsHandler = require('../../../pages/api/connections/[id]/credentials').default;
      await credentialsHandler(storeReq as any, storeRes as any);

      expect(storeRes._getStatusCode()).toBe(201);

      // Retrieve credentials and verify expiration status
      const { req: getReq, res: getRes } = createAuthenticatedRequest('GET', testUser);
      getReq.query = { id: connectionId };

      await credentialsHandler(getReq as any, getRes as any);

      expect(getRes._getStatusCode()).toBe(200);
      const getData = JSON.parse(getRes._getData());
      expect(getData.data.isActive).toBe(false); // Should be inactive due to expiration
    });
  });

  describe('Audit Logging', () => {
    it('should log credential access events', async () => {
      // Create connection
      const { req: createReq, res: createRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          name: 'Audit Test API',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY'
        }
      });

      await handler(createReq as any, createRes as any);
      const connectionData = JSON.parse(createRes._getData());
      const connectionId = connectionData.data.id;

      // Store credentials
      const { req: storeReq, res: storeRes } = createAuthenticatedRequest('POST', testUser, {
        body: {
          credentialData: {
            type: 'api_key',
            apiKey: 'audit-test-key'
          },
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
      storeReq.query = { id: connectionId };

      const credentialsHandler = require('../../../pages/api/connections/[id]/credentials').default;
      await credentialsHandler(storeReq as any, storeRes as any);

      // Verify audit log was created
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userId: testUser.id,
          action: 'api_credentials_stored'
        },
        orderBy: { createdAt: 'desc' },
        take: 1
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].resource).toContain(connectionId);
    });
  });
}); 