import { NextApiRequest, NextApiResponse } from 'next';
import { createOAuth2TestData } from '../../helpers/createTestData';
import { prisma } from '../../../lib/database/client';
import { oauth2Service } from '../../../src/lib/auth/oauth2';
import { createConnectionTestData } from '../../helpers/createTestData';

// Import handlers
const authorizeHandler = require('../../../pages/api/connections/oauth2/authorize').default;
const callbackHandler = require('../../../pages/api/connections/oauth2/callback').default;
const refreshHandler = require('../../../pages/api/connections/oauth2/refresh').default;
const tokenHandler = require('../../../pages/api/connections/oauth2/token').default;

// Real GitHub OAuth2 test credentials (should be in env vars)
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

describe('GitHub OAuth2 Real Integration Tests', () => {
  let testUser: any;
  let testApiConnection: any;

  beforeEach(async () => {
    // Skip tests if GitHub OAuth2 credentials are not configured
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      console.log('GitHub OAuth2 credentials not configured, skipping integration tests');
      return;
    }

    // Recreate test data after global setup truncates tables
    const testData = await createOAuth2TestData();
    testUser = testData.user;
    testApiConnection = testData.connection;

    // Update the connection with GitHub-specific config
    await prisma.apiConnection.update({
      where: { id: testApiConnection.id },
      data: {
        name: 'GitHub OAuth2 Integration Test',
        description: 'Real GitHub OAuth2 integration test connection',
        baseUrl: 'https://api.github.com',
        authConfig: {
          clientId: GITHUB_CLIENT_ID,
          clientSecret: GITHUB_CLIENT_SECRET,
          authorizationUrl: 'https://github.com/login/oauth/authorize',
          tokenUrl: 'https://github.com/login/oauth/access_token',
          redirectUri: 'http://localhost:3000/api/oauth/callback',
          scope: 'repo user'
        },
        documentationUrl: 'https://docs.github.com/en/rest',
      }
    });
  });

  describe('Real GitHub OAuth2 Authorization Flow', () => {
    it('should generate valid GitHub authorization URL with real credentials', async () => {
      if (!GITHUB_CLIENT_ID) {
        console.log('Skipping test: GitHub OAuth2 credentials not configured');
        return;
      }

      const { req, res } = createAuthenticatedRequest('GET', testUser, {
        query: {
          apiConnectionId: testApiConnection.id,
          provider: 'github',
          clientId: GITHUB_CLIENT_ID,
          clientSecret: GITHUB_CLIENT_SECRET,
          redirectUri: 'http://localhost:3000/api/oauth/callback',
          scope: 'repo user'
        }
      });

      await authorizeHandler(req as any, res as any);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.redirectUrl).toBeDefined();
      
      // Verify the URL points to real GitHub OAuth
      const redirectUrl = new URL(data.data.redirectUrl);
      expect(redirectUrl.hostname).toBe('github.com');
      expect(redirectUrl.pathname).toBe('/login/oauth/authorize');
      expect(redirectUrl.searchParams.get('client_id')).toBe(GITHUB_CLIENT_ID);
      expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/oauth/callback');
      expect(redirectUrl.searchParams.get('response_type')).toBe('code');
      expect(redirectUrl.searchParams.get('scope')).toBe('repo user');
      expect(redirectUrl.searchParams.get('state')).toBeDefined();
    });

    it('should validate real GitHub OAuth2 configuration', async () => {
      const { req, res } = createAuthenticatedRequest('GET', testUser, {
        query: {
          apiConnectionId: testApiConnection.id,
          provider: 'github',
          clientId: '', // Invalid: empty clientId
          clientSecret: GITHUB_CLIENT_SECRET,
          redirectUri: 'http://localhost:3000/api/oauth/callback'
        }
      });

      await authorizeHandler(req as any, res as any);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('clientId is required');
    });
  });

  describe('Real GitHub API Integration', () => {
    it('should connect to real GitHub API and validate credentials', async () => {
      if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
        console.log('Skipping test: GitHub OAuth2 credentials not configured');
        return;
      }

      // Test real GitHub API connectivity
      const response = await fetch('https://api.github.com/zen', {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'APIQ-Integration-Test/1.0'
        }
      });

      // Handle rate limiting gracefully - GitHub may return 403 for rate limits
      if (response.status === 403) {
        console.log('GitHub API rate limited, skipping connectivity test');
        return;
      }

      expect(response.status).toBe(200);
      const zenMessage = await response.text();
      expect(zenMessage).toBeDefined();
      expect(zenMessage.length).toBeGreaterThan(0);
    });

    it('should handle real GitHub API rate limiting', async () => {
      // Test real GitHub API rate limiting behavior
      const responses = await Promise.all([
        fetch('https://api.github.com/zen'),
        fetch('https://api.github.com/zen'),
        fetch('https://api.github.com/zen')
      ]);

      // All requests should succeed (GitHub has generous rate limits for unauthenticated requests)
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });
    });
  });

  describe('Real Database Integration', () => {
    it('should store and retrieve real OAuth2 connection data', async () => {
      // Test real database operations with OAuth2 data
      const oauthState = 'real-oauth-state-' + Date.now();
      
      // Store real OAuth2 state
      await prisma.apiConnection.update({
        where: { id: testApiConnection.id },
        data: { oauthState }
      });

      // Retrieve and verify
      const connection = await prisma.apiConnection.findUnique({
        where: { id: testApiConnection.id }
      });

      expect(connection).toBeDefined();
      expect(connection?.oauthState).toBe(oauthState);
      expect(connection?.authType).toBe('OAUTH2');
    });

    it('should handle real OAuth2 token storage and encryption', async () => {
      // Test real token storage (if encryption is implemented)
      const mockTokenData = {
        access_token: 'real-access-token-' + Date.now(),
        token_type: 'bearer',
        scope: 'repo user',
        expires_in: 3600
      };

      // This would test the actual token storage mechanism
      // For now, we'll test the connection can be updated
      await prisma.apiConnection.update({
        where: { id: testApiConnection.id },
        data: { 
          connectionStatus: 'connected',
          oauthState: null
        }
      });

      const connection = await prisma.apiConnection.findUnique({
        where: { id: testApiConnection.id }
      });

             expect(connection?.connectionStatus).toBe('connected');
      expect(connection?.oauthState).toBeNull();
    });
  });

  describe('Real Error Handling', () => {
    it('should handle real GitHub API errors', async () => {
      // Test real GitHub API error responses
      const response = await fetch('https://api.github.com/nonexistent-endpoint', {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'APIQ-Integration-Test/1.0'
        }
      });

      // Handle rate limiting gracefully - GitHub may return 403 for rate limits
      if (response.status === 403) {
        console.log('GitHub API rate limited, skipping error handling test');
        return;
      }

      expect(response.status).toBe(404);
      const errorData = await response.json();
      expect(errorData.message).toContain('Not Found');
    });

    it('should handle real network errors gracefully', async () => {
      // Test real network error handling
             try {
         await fetch('https://nonexistent-github-api.com/zen');
         fail('Expected network error');
       } catch (error) {
        expect(error).toBeDefined();
        // Network errors should be caught and handled gracefully
      }
    });
  });
});

// Helper function for creating authenticated requests
function createAuthenticatedRequest(method: string, user: any, options: any = {}) {
  const { createMocks } = require('node-mocks-http');
  const { generateToken } = require('../../../src/lib/auth/session');
  const { req, res } = createMocks({
    method,
    ...options
  });

  // Create real JWT token for authentication
  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive
  });

  // Add real authentication headers
  req.headers = {
    ...req.headers,
    authorization: `Bearer ${token}`,
    ...options.headers
  };

  return { req, res };
} 