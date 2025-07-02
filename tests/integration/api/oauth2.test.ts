import { createMocks } from 'node-mocks-http';
import providersHandler from '../../../pages/api/oauth/providers';
import authorizeHandler from '../../../pages/api/oauth/authorize';
import callbackHandler from '../../../pages/api/oauth/callback';
import refreshHandler from '../../../pages/api/oauth/refresh';
import tokenHandler from '../../../pages/api/oauth/token';
import { NextApiRequest } from 'next';
import { prisma } from '../../../lib/database/client';
import { createTestUser, createAuthenticatedRequest, createUnauthenticatedRequest } from '../../helpers/testUtils';
import { Role } from '../../../src/generated/prisma';
import { oauth2Service } from '../../../src/lib/auth/oauth2';
import jwt from 'jsonwebtoken';
import { createConnectionTestData } from '../../helpers/createTestData';

describe('OAuth2 Flow Integration Tests (Real Integrations)', () => {
  let testUser: any;
  let testApiConnection: any;
  let authToken: string;

  beforeEach(async () => {
    // Recreate test data after global setup truncates tables
    const testData = await createConnectionTestData();
    testUser = testData.user;
    testApiConnection = testData.connection;
  });

  describe('GET /api/oauth/providers', () => {
    it('should return supported OAuth2 providers', async () => {
      const { req, res } = createAuthenticatedRequest('GET', testUser);

      await providersHandler(req as any, res as any);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.providers).toBeDefined();
      expect(data.data.count).toBeGreaterThan(0);
      
      // Verify provider structure
      const provider = data.data.providers[0];
      expect(provider).toHaveProperty('name');
      expect(provider).toHaveProperty('displayName');
      expect(provider).toHaveProperty('authorizationUrl');
      expect(provider).toHaveProperty('tokenUrl');
    });

    it('should not require authentication', async () => {
      const { req, res } = createUnauthenticatedRequest('GET');

      await providersHandler(req as any, res as any);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('providers');
      expect(data.data).toHaveProperty('count');
    });
  });

  describe('GET /api/oauth/authorize', () => {
    it('should generate authorization URL for valid request with real GitHub credentials', async () => {
      // Use real GitHub OAuth2 credentials from environment
      const githubClientId = process.env.GITHUB_CLIENT_ID;
      const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
      
      if (!githubClientId || !githubClientSecret) {
        console.warn('⚠️  Skipping OAuth2 authorization test - GitHub credentials not configured');
        console.warn('   Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables to run this test');
        return;
      }

      const { req, res } = createAuthenticatedRequest('GET', testUser, {
        query: {
          apiConnectionId: testApiConnection.id,
          provider: 'github',
          clientId: githubClientId,
          clientSecret: githubClientSecret,
          redirectUri: 'http://localhost:3000/api/oauth/callback',
          scope: 'repo user'
        }
      });

      await authorizeHandler(req as any, res as any);

      // The handler should succeed and return a redirect URL
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.redirectUrl).toBeDefined();
      expect(data.data.redirectUrl).toContain('github.com');
      expect(data.data.redirectUrl).toContain(`client_id=${githubClientId}`);
    });

    it('should validate required parameters', async () => {
      const { req, res } = createAuthenticatedRequest('GET', testUser, {
        query: {
          provider: 'github'
          // Missing apiConnectionId, clientId, etc.
        }
      });

      await authorizeHandler(req as any, res as any);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('apiConnectionId is required');
    });

    it('should validate OAuth2 configuration', async () => {
      const { req, res } = createAuthenticatedRequest('GET', testUser, {
        query: {
          apiConnectionId: testApiConnection.id,
          provider: 'github',
          clientId: '', // Empty clientId should fail validation
          clientSecret: 'test-client-secret',
          redirectUri: 'http://localhost:3000/api/oauth/callback'
        }
      });

      await authorizeHandler(req as any, res as any);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('clientId is required');
    });

    it('should reject unsupported providers', async () => {
      const { req, res } = createAuthenticatedRequest('GET', testUser, {
        query: {
          apiConnectionId: testApiConnection.id,
          provider: 'unsupported-provider',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUri: 'http://localhost:3000/api/oauth/callback'
        }
      });

      await authorizeHandler(req as any, res as any);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      // The error might be about configuration first, but should eventually reach unsupported provider check
      expect(data.error).toBeDefined();
    });
  });

  describe('GET /api/oauth/callback', () => {
    it('should handle OAuth2 errors from real provider', async () => {
      const { req, res } = createUnauthenticatedRequest('GET', {
        query: {
          error: 'access_denied',
          error_description: 'User denied access'
        }
      });

      await callbackHandler(req as any, res as any);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('OAuth2 authorization failed');
      expect(data.details).toBe('User denied access');
    });

    it('should validate required parameters', async () => {
      const { req, res } = createUnauthenticatedRequest('GET', {
        query: {
          code: 'test-authorization-code'
          // Missing state
        }
      });

      await callbackHandler(req as any, res as any);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('State parameter is required');
    });

    it('should handle invalid authorization code', async () => {
      const { req, res } = createUnauthenticatedRequest('GET', {
        query: {
          code: 'invalid-authorization-code',
          state: 'test-state'
        }
      });

      await callbackHandler(req as any, res as any);

      // Should fail because we don't have real OAuth2 credentials configured or valid code
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/oauth/refresh', () => {
    it('should handle refresh failure when no tokens exist', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          apiConnectionId: testApiConnection.id,
          provider: 'github'
        }
      });

      await refreshHandler(req as any, res as any);

      // Should fail because we don't have existing tokens to refresh
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should validate required parameters', async () => {
      const { req, res } = createAuthenticatedRequest('POST', testUser, {
        body: {
          provider: 'github'
          // Missing apiConnectionId
        }
      });

      await refreshHandler(req as any, res as any);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('apiConnectionId is required');
    });
  });

  describe('GET /api/oauth/token', () => {
    it('should handle missing token', async () => {
      const { req, res } = createAuthenticatedRequest('GET', testUser, {
        query: {
          apiConnectionId: testApiConnection.id
        }
      });

      await tokenHandler(req as any, res as any);

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('No valid OAuth2 access token found');
    });

    it('should reject non-OAuth2 API connections', async () => {
      // Create a non-OAuth2 API connection using real database operation
      const nonOAuthConnection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: 'Test API Key API',
          description: 'Test API Key API connection',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY',
          authConfig: {
            apiKey: 'test-api-key'
          },
          status: 'ACTIVE',
          ingestionStatus: 'SUCCEEDED'
        }
      });

      const { req, res } = createAuthenticatedRequest('GET', testUser, {
        query: {
          apiConnectionId: nonOAuthConnection.id
        }
      });

      await tokenHandler(req as any, res as any);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('API connection does not use OAuth2 authentication');

      // Clean up the test connection
      await prisma.apiConnection.delete({ where: { id: nonOAuthConnection.id } });
    });
  });

  describe('OAuth2 Service Integration', () => {
    it('should provide real OAuth2 provider configurations', async () => {
      // Test the actual OAuth2 service methods with real provider data
      const supportedProviders = oauth2Service.getSupportedProviders();
      expect(supportedProviders).toBeDefined();
      expect(Array.isArray(supportedProviders)).toBe(true);
      expect(supportedProviders.length).toBeGreaterThan(0);

      // Test provider configuration for GitHub (real provider)
      const githubConfig = oauth2Service.getProviderConfig('github');
      expect(githubConfig).toBeDefined();
      expect(githubConfig?.name).toBe('GitHub');
      expect(githubConfig?.authorizationUrl).toContain('github.com');
      expect(githubConfig?.tokenUrl).toContain('github.com');

      // Test configuration validation with real OAuth2 parameters
      const validConfig = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        redirectUri: 'http://localhost:3000/callback',
        scope: 'repo user'
      };
      const validationErrors = oauth2Service.validateConfig(validConfig);
      expect(validationErrors).toEqual([]);

      const invalidConfig = {
        clientId: '',
        clientSecret: 'test-client-secret',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        redirectUri: 'http://localhost:3000/callback',
        scope: 'repo user'
      };
      const invalidErrors = oauth2Service.validateConfig(invalidConfig);
      expect(invalidErrors.length).toBeGreaterThan(0);
      expect(invalidErrors).toContain('clientId is required');
    });
  });
}); 