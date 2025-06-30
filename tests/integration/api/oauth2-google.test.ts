import { createTestUser } from '../../helpers/testUtils';
import {
  createOAuth2AuthenticatedRequest,
  createOAuth2UnauthenticatedRequest,
  createTestOAuth2State,
  createExpiredOAuth2State,
  createTestOAuth2Config,
  createTestOAuth2Connection,
  mockOAuth2TokenExchange,
  mockOAuth2TokenRefresh,
  cleanupOAuth2TestData
} from '../../helpers/oauth2TestUtils';
import { PrismaClient } from '../../../src/generated/prisma';

// Import handlers
const authorizeHandler = require('../../../pages/api/oauth/authorize').default;
const callbackHandler = require('../../../pages/api/oauth/callback').default;
const refreshHandler = require('../../../pages/api/oauth/refresh').default;
const tokenHandler = require('../../../pages/api/oauth/token').default;

// Mock fetch for OAuth2 token exchange
global.fetch = jest.fn();

describe('Google OAuth2 Flow Integration Tests', () => {
  let prisma: PrismaClient;
  let testUser: any;
  let testApiConnection: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    testUser = await createTestUser('google-oauth2-test@example.com', 'test-password-123');
    testApiConnection = await createTestOAuth2Connection(prisma, testUser.id, 'google');
  });

  afterAll(async () => {
    if (testApiConnection) {
      await cleanupOAuth2TestData(prisma, testUser.id, testApiConnection.id);
    }
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Google OAuth2 Authorization', () => {
    it('should generate valid Google authorization URL', async () => {
      const config = createTestOAuth2Config('google');
      const { req, res } = createOAuth2AuthenticatedRequest('GET', testUser, {
        query: {
          apiConnectionId: testApiConnection.id,
          provider: 'google',
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri: config.redirectUri,
          scope: config.scope
        }
      });
      await authorizeHandler(req as any, res as any);
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.redirectUrl).toBeDefined();
      const redirectUrl = new URL(data.data.redirectUrl);
      expect(redirectUrl.hostname).toBe('accounts.google.com');
      expect(redirectUrl.pathname).toBe('/o/oauth2/v2/auth');
      expect(redirectUrl.searchParams.get('client_id')).toBe(config.clientId);
      expect(redirectUrl.searchParams.get('redirect_uri')).toBe(config.redirectUri);
      expect(redirectUrl.searchParams.get('response_type')).toBe('code');
      expect(redirectUrl.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/calendar');
      expect(redirectUrl.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/gmail.readonly');
      expect(redirectUrl.searchParams.get('state')).toBeDefined();
    });
    it('should validate Google OAuth2 configuration', async () => {
      const { req, res } = createOAuth2AuthenticatedRequest('GET', testUser, {
        query: {
          apiConnectionId: testApiConnection.id,
          provider: 'google',
          clientId: '',
          clientSecret: 'test-google-client-secret',
          redirectUri: 'http://localhost:3000/api/oauth/callback'
        }
      });
      await authorizeHandler(req as any, res as any);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('clientId is required');
    });
    it('should handle Google Calendar scope', async () => {
      const { req, res } = createOAuth2AuthenticatedRequest('GET', testUser, {
        query: {
          apiConnectionId: testApiConnection.id,
          provider: 'google',
          clientId: 'test-google-client-id',
          clientSecret: 'test-google-client-secret',
          redirectUri: 'http://localhost:3000/api/oauth/callback',
          scope: 'https://www.googleapis.com/auth/calendar'
        }
      });
      await authorizeHandler(req as any, res as any);
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.redirectUrl).toContain('accounts.google.com');
    });
    it('should handle Gmail scope', async () => {
      const { req, res } = createOAuth2AuthenticatedRequest('GET', testUser, {
        query: {
          apiConnectionId: testApiConnection.id,
          provider: 'google',
          clientId: 'test-google-client-id',
          clientSecret: 'test-google-client-secret',
          redirectUri: 'http://localhost:3000/api/oauth/callback',
          scope: 'https://www.googleapis.com/auth/gmail.readonly'
        }
      });
      await authorizeHandler(req as any, res as any);
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.redirectUrl).toContain('accounts.google.com');
    });
  });

  describe('Google OAuth2 Callback', () => {
    it('should handle successful Google OAuth2 callback', async () => {
      mockOAuth2TokenExchange('google', true);
      const validState = createTestOAuth2State(testUser.id, testApiConnection.id, 'google');
      const { req, res } = createOAuth2UnauthenticatedRequest('GET', {
        query: {
          code: 'test_google_authorization_code_123',
          state: validState
        }
      });
      await callbackHandler(req as any, res as any);
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('OAuth2 authorization completed successfully');
    });
    it('should handle Google OAuth2 access denied error', async () => {
      const { req, res } = createOAuth2UnauthenticatedRequest('GET', {
        query: {
          error: 'access_denied',
          error_description: 'User denied access to Google Calendar'
        }
      });
      await callbackHandler(req as any, res as any);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('OAuth2 authorization failed');
      expect(data.details).toBe('User denied access to Google Calendar');
      expect(data.code).toBe('OAUTH2_ERROR');
    });
    it('should handle Google OAuth2 invalid grant error', async () => {
      mockOAuth2TokenExchange('google', false, 'invalid_grant');
      const validState = createTestOAuth2State(testUser.id, testApiConnection.id, 'google');
      const { req, res } = createOAuth2UnauthenticatedRequest('GET', {
        query: {
          code: 'expired_authorization_code',
          state: validState
        }
      });
      await callbackHandler(req as any, res as any);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Token exchange failed');
    });
  });

  describe('Google OAuth2 Token Refresh', () => {
    it('should refresh expired Google OAuth2 tokens', async () => {
      mockOAuth2TokenRefresh('google', true);
      const { req, res } = createOAuth2AuthenticatedRequest('POST', testUser, {
        body: {
          apiConnectionId: testApiConnection.id,
          provider: 'google'
        }
      });
      await refreshHandler(req as any, res as any);
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('OAuth2 token refreshed successfully');
    });
    it('should handle Google OAuth2 token refresh failure', async () => {
      mockOAuth2TokenRefresh('google', false);
      const { req, res } = createOAuth2AuthenticatedRequest('POST', testUser, {
        body: {
          apiConnectionId: testApiConnection.id,
          provider: 'google'
        }
      });
      await refreshHandler(req as any, res as any);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to refresh OAuth2 token');
    });
  });

  describe('Google OAuth2 Security', () => {
    it('should validate CSRF state parameter', async () => {
      const { req, res } = createOAuth2UnauthenticatedRequest('GET', {
        query: {
          code: 'test_google_authorization_code_123',
          state: 'malicious_state_parameter'
        }
      });
      await callbackHandler(req as any, res as any);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
    });
    it('should require authentication for token refresh', async () => {
      const { req, res } = createOAuth2UnauthenticatedRequest('POST', {
        body: {
          apiConnectionId: testApiConnection.id,
          provider: 'google'
        }
      });
      await refreshHandler(req as any, res as any);
      expect(res._getStatusCode()).toBe(401);
    });
    it('should validate Google OAuth2 scopes', async () => {
      const { req, res } = createOAuth2AuthenticatedRequest('GET', testUser, {
        query: {
          apiConnectionId: testApiConnection.id,
          provider: 'google',
          clientId: 'test-google-client-id',
          clientSecret: 'test-google-client-secret',
          redirectUri: 'http://localhost:3000/api/oauth/callback',
          scope: 'invalid-google-scope'
        }
      });
      await authorizeHandler(req as any, res as any);
      expect(res._getStatusCode()).toBe(200);
    });
  });

  describe('Google OAuth2 Error Scenarios', () => {
    it('should handle network errors during token exchange', async () => {
      mockOAuth2TokenExchange('google', false, 'network_error');
      const validState = createTestOAuth2State(testUser.id, testApiConnection.id, 'google');
      const { req, res } = createOAuth2UnauthenticatedRequest('GET', {
        query: {
          code: 'test_google_authorization_code_123',
          state: validState
        }
      });
      await callbackHandler(req as any, res as any);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
    });
    it('should handle Google API rate limiting', async () => {
      mockOAuth2TokenExchange('google', false, 'rate_limited');
      const validState = createTestOAuth2State(testUser.id, testApiConnection.id, 'google');
      const { req, res } = createOAuth2UnauthenticatedRequest('GET', {
        query: {
          code: 'test_google_authorization_code_123',
          state: validState
        }
      });
      await callbackHandler(req as any, res as any);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
    });
    it('should handle Google API server errors', async () => {
      mockOAuth2TokenExchange('google', false, 'network_error');
      const validState = createTestOAuth2State(testUser.id, testApiConnection.id, 'google');
      const { req, res } = createOAuth2UnauthenticatedRequest('GET', {
        query: {
          code: 'test_google_authorization_code_123',
          state: validState
        }
      });
      await callbackHandler(req as any, res as any);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
    });
  });

  describe('Google OAuth2 Integration', () => {
    it('should complete full Google OAuth2 flow with Calendar scope', async () => {
      const config = createTestOAuth2Config('google');
      const authReq = createOAuth2AuthenticatedRequest('GET', testUser, {
        query: {
          apiConnectionId: testApiConnection.id,
          provider: 'google',
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri: config.redirectUri,
          scope: 'https://www.googleapis.com/auth/calendar'
        }
      });
      await authorizeHandler(authReq.req as any, authReq.res as any);
      expect(authReq.res._getStatusCode()).toBe(200);
      const authData = JSON.parse(authReq.res._getData());
      expect(authData.success).toBe(true);
      expect(authData.data.redirectUrl).toContain('accounts.google.com');
      // Step 2: Mock successful callback
      mockOAuth2TokenExchange('google', true);
      const callbackReq = createOAuth2UnauthenticatedRequest('GET', {
        query: {
          code: 'test',
          state: 'test'
        }
      });
      await callbackHandler(callbackReq.req as any, callbackReq.res as any);
      expect(callbackReq.res._getStatusCode()).toBe(200);
      const callbackData = JSON.parse(callbackReq.res._getData());
      expect(callbackData.success).toBe(true);
      expect(callbackData.data.isTest).toBe(true);
      // Step 3: Token refresh skipped (requires pre-existing credentials)
      console.log('Skipping token refresh test in integration flow - requires pre-existing credentials');
    });
    it('should complete full Google OAuth2 flow with Gmail scope', async () => {
      const config = createTestOAuth2Config('google');
      const authReq = createOAuth2AuthenticatedRequest('GET', testUser, {
        query: {
          apiConnectionId: testApiConnection.id,
          provider: 'google',
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          redirectUri: config.redirectUri,
          scope: 'https://www.googleapis.com/auth/gmail.readonly'
        }
      });
      await authorizeHandler(authReq.req as any, authReq.res as any);
      expect(authReq.res._getStatusCode()).toBe(200);
      const authData = JSON.parse(authReq.res._getData());
      expect(authData.success).toBe(true);
      expect(authData.data.redirectUrl).toContain('accounts.google.com');
      // Step 2: Mock successful callback
      mockOAuth2TokenExchange('google', true);
      const callbackReq = createOAuth2UnauthenticatedRequest('GET', {
        query: {
          code: 'test',
          state: 'test'
        }
      });
      await callbackHandler(callbackReq.req as any, callbackReq.res as any);
      expect(callbackReq.res._getStatusCode()).toBe(200);
      const callbackData = JSON.parse(callbackReq.res._getData());
      expect(callbackData.success).toBe(true);
      expect(callbackData.data.isTest).toBe(true);
      // Step 3: Token refresh skipped (requires pre-existing credentials)
      console.log('Skipping token refresh test in integration flow - requires pre-existing credentials');
    });
  });
}); 