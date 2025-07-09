import { NextApiRequest, NextApiResponse } from 'next';
import { createTestUser } from '../../helpers/testUtils';
import { prisma } from '../../../lib/database/client';
import { createConnectionTestData } from '../../helpers/createTestData';

// Import handlers
const authorizeHandler = require('../../../pages/api/oauth/authorize').default;
const callbackHandler = require('../../../pages/api/oauth/callback').default;
const refreshHandler = require('../../../pages/api/oauth/refresh').default;
const tokenHandler = require('../../../pages/api/oauth/token').default;

describe('OAuth2 Security Integration Tests (Real)', () => {
  let testUser: any;
  let testApiConnection: any;

  beforeEach(async () => {
    // Recreate test data after global setup truncates tables
    const testData = await createConnectionTestData();
    testUser = testData.user;
    testApiConnection = testData.connection;
  });

  const createAuthenticatedRequest = (method: string, user: any, options: any = {}) => {
    const { createMocks } = require('node-mocks-http');
    const { req, res } = createMocks({
      method,
      ...options
    });
    // Use the real access token from the user object (obtained via real login)
    req.headers = {
      ...req.headers,
      authorization: `Bearer ${user.accessToken}`,
      ...options.headers
    };
    return { req, res };
  };

  const createUnauthenticatedRequest = (method: string, options: any = {}) => {
    const { createMocks } = require('node-mocks-http');
    const { req, res } = createMocks({
      method,
      ...options
    });
    req.headers = {
      ...req.headers,
      ...options.headers
    };
    return { req, res };
  };

  describe('CSRF Protection', () => {
    it('should validate state parameter in OAuth2 callback', async () => {
      const { req, res } = createUnauthenticatedRequest('GET', {
        query: {
          code: 'test_authorization_code_123'
          // Missing state parameter
        }
      });
      await callbackHandler(req, res);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('State parameter is required');
      expect(data.code).toBe('MISSING_STATE');
    });

    it('should reject malicious state parameter', async () => {
      const { req, res } = createUnauthenticatedRequest('GET', {
        query: {
          code: 'test_authorization_code_123',
          state: 'malicious_state_parameter_injection'
        }
      });
      await callbackHandler(req, res);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
    });

    it('should reject expired state parameter', async () => {
      // Simulate expired state (older than 5 minutes)
      const expiredState = 'expired_state_parameter';
      const { req, res } = createUnauthenticatedRequest('GET', {
        query: {
          code: 'test_authorization_code_123',
          state: expiredState
        }
      });
      await callbackHandler(req, res);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
    });

    it('should reject tampered state parameter', async () => {
      const { req, res } = createUnauthenticatedRequest('GET', {
        query: {
          code: 'test_authorization_code_123',
          state: 'tampered_state_with_invalid_signature'
        }
      });
      await callbackHandler(req, res);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for OAuth2 authorization', async () => {
      const { req, res } = createUnauthenticatedRequest('GET', {
        query: {
          apiConnectionId: testApiConnection.id,
          provider: 'github',
          clientId: process.env.GITHUB_CLIENT_ID || 'test-client-id',
          clientSecret: process.env.GITHUB_CLIENT_SECRET || 'test-client-secret',
          redirectUri: 'http://localhost:3000/api/oauth/callback'
        }
      });
      await authorizeHandler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('should require authentication for token refresh', async () => {
      const { req, res } = createUnauthenticatedRequest('POST', {
        body: {
          apiConnectionId: testApiConnection.id,
          provider: 'github'
        }
      });
      await refreshHandler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('should require authentication for token retrieval', async () => {
      const { req, res } = createUnauthenticatedRequest('GET', {
        query: {
          apiConnectionId: testApiConnection.id
        }
      });
      await tokenHandler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('Authorization Validation', () => {
    it('should validate API connection ownership', async () => {
      // Create another user using helper function (non-admin to test access control)
      const otherUser = await createTestUser(undefined, 'test-password-123', 'USER');
      const { req, res } = createAuthenticatedRequest('GET', otherUser, {
        query: {
          apiConnectionId: testApiConnection.id, // Belongs to testUser, not otherUser
          provider: 'github',
          clientId: process.env.GITHUB_CLIENT_ID || 'test-client-id',
          clientSecret: process.env.GITHUB_CLIENT_SECRET || 'test-client-secret',
          redirectUri: 'http://localhost:3000/api/oauth/callback'
        }
      });
      await authorizeHandler(req, res);
      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('API connection not found');
      // Cleanup
      await prisma.user.delete({
        where: { id: otherUser.id }
      });
    });

    it('should reject invalid API connection ID', async () => {
      const { req, res } = createAuthenticatedRequest('GET', testUser, {
        query: {
          apiConnectionId: 'invalid-id',
          provider: 'github',
          clientId: process.env.GITHUB_CLIENT_ID || 'test-client-id',
          clientSecret: process.env.GITHUB_CLIENT_SECRET || 'test-client-secret',
          redirectUri: 'http://localhost:3000/api/oauth/callback'
        }
      });
      await authorizeHandler(req, res);
      expect(res._getStatusCode()).toBe(404);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('API connection not found');
    });
  });
}); 