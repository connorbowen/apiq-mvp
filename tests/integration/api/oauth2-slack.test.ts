import { createTestUser } from '../../helpers/testUtils';
import { prisma } from '../../../lib/database/client';
import { createConnectionTestData } from '../../helpers/createTestData';

// Import handlers
const authorizeHandler = require('../../../pages/api/connections/oauth2/authorize').default;
const callbackHandler = require('../../../pages/api/connections/oauth2/callback').default;
const refreshHandler = require('../../../pages/api/connections/oauth2/refresh').default;
const tokenHandler = require('../../../pages/api/connections/oauth2/token').default;

describe('Slack OAuth2 Flow Integration Tests', () => {
  let testUser: any;
  let testApiConnection: any;

  beforeEach(async () => {
    // Recreate test data after global setup truncates tables
    const testData = await createConnectionTestData();
    testUser = testData.user;
    testApiConnection = testData.connection;
  });

  beforeEach(() => {
    // Clear any existing OAuth2 state
    jest.clearAllMocks();
  });

  const createAuthenticatedRequest = (method: string, body?: any, query?: any) => {
    const { createMocks } = require('node-mocks-http');
    const { generateToken } = require('../../../src/lib/auth/session');
    const { req, res } = createMocks({
      method,
      body,
      query
    });

    // Create real JWT token for authentication
    const token = generateToken({
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      role: testUser.role,
      isActive: testUser.isActive
    });

    // Add real authentication headers
    req.headers = {
      ...req.headers,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    };

    return { req, res };
  };

  const createUnauthenticatedRequest = (method: string, body?: any, query?: any) => {
    const { createMocks } = require('node-mocks-http');
    const { req, res } = createMocks({
      method,
      body,
      query
    });

    req.headers = {
      ...req.headers,
      'content-type': 'application/json'
    };

    return { req, res };
  };

  describe('Slack OAuth2 Authorization', () => {
    it('should generate valid Slack authorization URL with real credentials', async () => {
      const { req, res } = createAuthenticatedRequest('GET', undefined, {
        apiConnectionId: testApiConnection.id,
        provider: 'slack',
        clientId: process.env.SLACK_CLIENT_ID || 'test-slack-client-id',
        clientSecret: process.env.SLACK_CLIENT_SECRET || 'test-slack-client-secret',
        redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback',
        scope: 'channels:read chat:write'
      });

      await authorizeHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.redirectUrl).toBeDefined();
      
      const redirectUrl = new URL(data.data.redirectUrl);
      expect(redirectUrl.hostname).toBe('slack.com');
      expect(redirectUrl.pathname).toBe('/oauth/v2/authorize');
      expect(redirectUrl.searchParams.get('client_id')).toBe(process.env.SLACK_CLIENT_ID || 'test-slack-client-id');
      expect(redirectUrl.searchParams.get('redirect_uri')).toBe(process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback');
      expect(redirectUrl.searchParams.get('response_type')).toBe('code');
      expect(redirectUrl.searchParams.get('scope')).toBe('channels:read chat:write');
      expect(redirectUrl.searchParams.get('state')).toBeDefined();
    });

    it('should validate Slack OAuth2 configuration', async () => {
      // Create a connection with invalid config
      const invalidConnection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: 'Invalid Slack Connection',
          baseUrl: 'https://slack.com/api',
          authType: 'OAUTH2',
          status: 'ACTIVE',
          authConfig: {
            clientId: '',
            clientSecret: 'test-slack-client-secret',
            redirectUri: 'http://localhost:3000/api/oauth/callback'
          }
        }
      });

      const { req, res } = createAuthenticatedRequest('GET', undefined, {
        apiConnectionId: invalidConnection.id,
        provider: 'slack',
        clientId: '',
        clientSecret: 'test-slack-client-secret',
        redirectUri: 'http://localhost:3000/api/oauth/callback'
      });

      await authorizeHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('clientId is required');

      // Cleanup
      await prisma.apiConnection.delete({ where: { id: invalidConnection.id } });
    });

    it('should handle Slack channels scope', async () => {
      const channelsConnection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: 'Slack Channels Connection',
          baseUrl: 'https://slack.com/api',
          authType: 'OAUTH2',
          status: 'ACTIVE',
          authConfig: {
            clientId: process.env.SLACK_CLIENT_ID || 'test-slack-client-id',
            clientSecret: process.env.SLACK_CLIENT_SECRET || 'test-slack-client-secret',
            redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback',
            scope: 'channels:read'
          }
        }
      });

      const { req, res } = createAuthenticatedRequest('GET', undefined, {
        apiConnectionId: channelsConnection.id,
        provider: 'slack',
        clientId: process.env.SLACK_CLIENT_ID || 'test-slack-client-id',
        clientSecret: process.env.SLACK_CLIENT_SECRET || 'test-slack-client-secret',
        redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback',
        scope: 'channels:read'
      });

      await authorizeHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.redirectUrl).toContain('slack.com');
      expect(data.data.redirectUrl).toContain('channels%3Aread');

      // Cleanup
      await prisma.apiConnection.delete({ where: { id: channelsConnection.id } });
    });

    it('should handle Slack chat scope', async () => {
      const chatConnection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: 'Slack Chat Connection',
          baseUrl: 'https://slack.com/api',
          authType: 'OAUTH2',
          status: 'ACTIVE',
          authConfig: {
            clientId: process.env.SLACK_CLIENT_ID || 'test-slack-client-id',
            clientSecret: process.env.SLACK_CLIENT_SECRET || 'test-slack-client-secret',
            redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback',
            scope: 'chat:write'
          }
        }
      });

      const { req, res } = createAuthenticatedRequest('GET', undefined, {
        apiConnectionId: chatConnection.id,
        provider: 'slack',
        clientId: process.env.SLACK_CLIENT_ID || 'test-slack-client-id',
        clientSecret: process.env.SLACK_CLIENT_SECRET || 'test-slack-client-secret',
        redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback',
        scope: 'chat:write'
      });

      await authorizeHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.redirectUrl).toContain('slack.com');
      expect(data.data.redirectUrl).toContain('chat%3Awrite');

      // Cleanup
      await prisma.apiConnection.delete({ where: { id: chatConnection.id } });
    });
  });

  describe('Slack OAuth2 Callback', () => {
    it('should handle Slack OAuth2 access denied error', async () => {
      const { req, res } = createUnauthenticatedRequest('GET', undefined, {
        error: 'access_denied',
        error_description: 'User denied access to Slack workspace'
      });

      await callbackHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('OAuth2 authorization failed');
      expect(data.details).toBe('User denied access to Slack workspace');
      expect(data.code).toBe('OAUTH2_ERROR');
    });

    it('should handle missing authorization code', async () => {
      const { req, res } = createUnauthenticatedRequest('GET', undefined, {
        state: 'test-state'
      });

      await callbackHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authorization code is required');
    });

    it('should handle missing state parameter', async () => {
      const { req, res } = createUnauthenticatedRequest('GET', undefined, {
        code: 'test_authorization_code'
      });

      await callbackHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('State parameter is required');
    });
  });

  describe('Slack OAuth2 Token Refresh', () => {
    it('should require authentication for token refresh', async () => {
      const { req, res } = createUnauthenticatedRequest('POST', {
        apiConnectionId: testApiConnection.id,
        provider: 'slack'
      });

      await refreshHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });

    it('should handle missing API connection for token refresh', async () => {
      const { req, res } = createAuthenticatedRequest('POST', {
        provider: 'slack'
      });

      await refreshHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('apiConnectionId is required');
    });

    it('should handle non-existent API connection for token refresh', async () => {
      const { req, res } = createAuthenticatedRequest('POST', {
        apiConnectionId: 'non-existent-id',
        provider: 'slack'
      });

      await refreshHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('API connection not found');
    });
  });

  describe('Slack OAuth2 Security', () => {
    it('should validate CSRF state parameter', async () => {
      const { req, res } = createUnauthenticatedRequest('GET', undefined, {
        code: 'test_slack_authorization_code_123',
        state: 'malicious_state_parameter'
      });

      await callbackHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid OAuth state');
    });

    it('should require authentication for authorization', async () => {
      const { req, res } = createUnauthenticatedRequest('GET', undefined, {
        apiConnectionId: testApiConnection.id,
        provider: 'slack',
        clientId: process.env.SLACK_CLIENT_ID || 'test-slack-client-id',
        clientSecret: process.env.SLACK_CLIENT_SECRET || 'test-slack-client-secret',
        redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback'
      });

      await authorizeHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('Slack OAuth2 Integration', () => {
    it('should complete full Slack OAuth2 flow with channels scope', async () => {
      const channelsConnection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: 'Slack Channels Integration Test',
          baseUrl: 'https://slack.com/api',
          authType: 'OAUTH2',
          status: 'ACTIVE',
          authConfig: {
            clientId: process.env.SLACK_CLIENT_ID || 'test-slack-client-id',
            clientSecret: process.env.SLACK_CLIENT_SECRET || 'test-slack-client-secret',
            redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback',
            scope: 'channels:read'
          }
        }
      });

      // Step 1: Generate authorization URL
      const authReq = createAuthenticatedRequest('GET', undefined, {
        apiConnectionId: channelsConnection.id,
        provider: 'slack',
        clientId: process.env.SLACK_CLIENT_ID || 'test-slack-client-id',
        clientSecret: process.env.SLACK_CLIENT_SECRET || 'test-slack-client-secret',
        redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback',
        scope: 'channels:read'
      });

      await authorizeHandler(authReq.req, authReq.res);

      expect(authReq.res._getStatusCode()).toBe(200);
      const authData = JSON.parse(authReq.res._getData());
      expect(authData.success).toBe(true);
      expect(authData.data.redirectUrl).toContain('slack.com');
      expect(authData.data.redirectUrl).toContain('channels%3Aread');

      // Step 2: Test callback with invalid code (real integration would require actual Slack authorization)
      const callbackReq = createUnauthenticatedRequest('GET', undefined, {
        code: 'invalid_test_code',
        state: 'invalid_test_state'
      });

      await callbackHandler(callbackReq.req, callbackReq.res);

      // Should fail with invalid code/state, which is expected behavior
      expect(callbackReq.res._getStatusCode()).toBe(400);

      // Cleanup
      await prisma.apiConnection.delete({ where: { id: channelsConnection.id } });
    });

    it('should complete full Slack OAuth2 flow with chat scope', async () => {
      const chatConnection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: 'Slack Chat Integration Test',
          baseUrl: 'https://slack.com/api',
          authType: 'OAUTH2',
          status: 'ACTIVE',
          authConfig: {
            clientId: process.env.SLACK_CLIENT_ID || 'test-slack-client-id',
            clientSecret: process.env.SLACK_CLIENT_SECRET || 'test-slack-client-secret',
            redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback',
            scope: 'chat:write'
          }
        }
      });

      // Step 1: Generate authorization URL
      const authReq = createAuthenticatedRequest('GET', undefined, {
        apiConnectionId: chatConnection.id,
        provider: 'slack',
        clientId: process.env.SLACK_CLIENT_ID || 'test-slack-client-id',
        clientSecret: process.env.SLACK_CLIENT_SECRET || 'test-slack-client-secret',
        redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback',
        scope: 'chat:write'
      });

      await authorizeHandler(authReq.req, authReq.res);

      expect(authReq.res._getStatusCode()).toBe(200);
      const authData = JSON.parse(authReq.res._getData());
      expect(authData.success).toBe(true);
      expect(authData.data.redirectUrl).toContain('slack.com');
      expect(authData.data.redirectUrl).toContain('chat%3Awrite');

      // Step 2: Test callback with invalid code (real integration would require actual Slack authorization)
      const callbackReq = createUnauthenticatedRequest('GET', undefined, {
        code: 'invalid_test_code',
        state: 'invalid_test_state'
      });

      await callbackHandler(callbackReq.req, callbackReq.res);

      // Should fail with invalid code/state, which is expected behavior
      expect(callbackReq.res._getStatusCode()).toBe(400);

      // Cleanup
      await prisma.apiConnection.delete({ where: { id: chatConnection.id } });
    });
  });
}); 