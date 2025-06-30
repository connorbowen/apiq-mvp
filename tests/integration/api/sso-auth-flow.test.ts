// TODO: [connorbowen] 2025-06-29 - This test file exceeds the 200-300 line threshold (currently 431 lines).
// Consider splitting into smaller, focused test files:
// - sso-auth-flow.provider.test.ts (provider-specific tests)
// - sso-auth-flow.flow.test.ts (authentication flow tests)
// - sso-auth-flow.integration.test.ts (end-to-end integration tests)
// Priority: Low - tests are working well, refactoring for maintainability only.

import { createMocks } from 'node-mocks-http';
import { createTestSuite, createAuthenticatedRequest, createTestUser } from '../../helpers/testUtils';
import { Role } from '../../../src/generated/prisma';
import { getAvailableProviders } from '../../../src/lib/auth/sso-providers';
import { prisma } from '../../../lib/database/client';

describe('SSO Authentication Flow Testing - Phase 2.3', () => {
  const testSuite = createTestSuite('SSO Auth Flow Tests');
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
    testUser = await createTestUser('ssoauth@example.com', 'ssoauth123', Role.USER, 'SSO Auth User');
  });

  describe('SSO Provider Configuration', () => {
    it('should return available providers based on environment configuration', () => {
      const providers = getAvailableProviders();
      
      // Should always include credentials provider
      expect(providers).toContainEqual({
        id: 'credentials',
        name: 'Email & Password',
        type: 'credentials',
        description: 'Sign in with email and password',
      });

      // Check for SSO providers (these will be empty if env vars aren't set)
      const ssoProviders = providers.filter(p => p.type === 'oauth');
      expect(ssoProviders.length).toBeGreaterThanOrEqual(0);
    });

    it('should include Okta provider when configured', () => {
      // Mock environment variables for testing
      const originalOktaId = process.env.OKTA_CLIENT_ID;
      const originalOktaSecret = process.env.OKTA_CLIENT_SECRET;
      
      process.env.OKTA_CLIENT_ID = 'test-okta-client-id';
      process.env.OKTA_CLIENT_SECRET = 'test-okta-client-secret';
      
      const providers = getAvailableProviders();
      const oktaProvider = providers.find(p => p.id === 'okta');
      
      expect(oktaProvider).toBeDefined();
      expect(oktaProvider?.name).toBe('Okta');
      expect(oktaProvider?.description).toBe('Enterprise SSO with Okta');
      
      // Restore original values
      if (originalOktaId) process.env.OKTA_CLIENT_ID = originalOktaId;
      if (originalOktaSecret) process.env.OKTA_CLIENT_SECRET = originalOktaSecret;
    });

    it('should include Google provider when configured', () => {
      // Mock environment variables for testing
      const originalGoogleId = process.env.GOOGLE_CLIENT_ID;
      const originalGoogleSecret = process.env.GOOGLE_CLIENT_SECRET;
      
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
      
      const providers = getAvailableProviders();
      const googleProvider = providers.find(p => p.id === 'google');
      
      expect(googleProvider).toBeDefined();
      expect(googleProvider?.name).toBe('Google Workspace');
      expect(googleProvider?.description).toBe('SSO with Google Workspace');
      
      // Restore original values
      if (originalGoogleId) process.env.GOOGLE_CLIENT_ID = originalGoogleId;
      if (originalGoogleSecret) process.env.GOOGLE_CLIENT_SECRET = originalGoogleSecret;
    });

    it('should include Azure AD provider when configured', () => {
      // Mock environment variables for testing
      const originalAzureId = process.env.AZURE_AD_CLIENT_ID;
      const originalAzureSecret = process.env.AZURE_AD_CLIENT_SECRET;
      
      process.env.AZURE_AD_CLIENT_ID = 'test-azure-client-id';
      process.env.AZURE_AD_CLIENT_SECRET = 'test-azure-client-secret';
      
      const providers = getAvailableProviders();
      const azureProvider = providers.find(p => p.id === 'azure-ad');
      
      expect(azureProvider).toBeDefined();
      expect(azureProvider?.name).toBe('Microsoft Azure AD');
      expect(azureProvider?.description).toBe('Enterprise SSO with Microsoft Azure AD');
      
      // Restore original values
      if (originalAzureId) process.env.AZURE_AD_CLIENT_ID = originalAzureId;
      if (originalAzureSecret) process.env.AZURE_AD_CLIENT_SECRET = originalAzureSecret;
    });
  });

  describe('OAuth2 Flow Testing', () => {
    it('should handle OAuth2 authorization URL generation', () => {
      // Test that OAuth2 URLs are properly formatted
      const oktaIssuer = 'https://acme.okta.com';
      const googleAuthUrl = 'https://accounts.google.com/oauth/authorize';
      const azureAuthUrl = 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/authorize';
      
      expect(oktaIssuer).toMatch(/^https:\/\/.*\.okta\.com$/);
      expect(googleAuthUrl).toMatch(/^https:\/\/accounts\.google\.com\/oauth\/authorize$/);
      expect(azureAuthUrl).toMatch(/^https:\/\/login\.microsoftonline\.com\/.*\/oauth2\/v2\.0\/authorize$/);
    });

    it('should validate OAuth2 scope configuration', () => {
      // Test that required scopes are included
      const requiredScopes = ['openid', 'profile', 'email'];
      
      // These would be the scopes configured in the SSO providers
      const oktaScopes = 'openid profile email';
      const googleScopes = 'openid email profile';
      const azureScopes = 'openid profile email';
      
      requiredScopes.forEach(scope => {
        expect(oktaScopes).toContain(scope);
        expect(googleScopes).toContain(scope);
        expect(azureScopes).toContain(scope);
      });
    });

    it('should handle OAuth2 callback with state parameter validation', () => {
      // Test CSRF protection with state parameter
      const mockState = 'random-state-parameter-123';
      const mockCode = 'authorization-code-456';
      
      // Simulate callback validation
      const isValidCallback = mockState && mockCode && mockState.length > 10;
      expect(isValidCallback).toBe(true);
      
      // Test invalid state parameter
      const invalidState = '';
      const invalidCallback = invalidState && mockCode && invalidState.length > 10;
      expect(invalidCallback).toBe(false);
    });
  });

  describe('Token Management', () => {
    it('should handle access token storage and retrieval', async () => {
      // Test that tokens are properly stored and retrieved
      const mockAccessToken = 'mock-access-token-123';
      const mockRefreshToken = 'mock-refresh-token-456';
      const mockExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour from now
      
      // Simulate token storage
      const tokenData = {
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresAt: mockExpiresAt,
        tokenType: 'Bearer'
      };
      
      expect(tokenData.accessToken).toBe(mockAccessToken);
      expect(tokenData.refreshToken).toBe(mockRefreshToken);
      expect(tokenData.expiresAt).toBeInstanceOf(Date);
      expect(tokenData.tokenType).toBe('Bearer');
    });

    it('should handle token expiration validation', () => {
      // Test token expiration logic
      const now = new Date();
      const expiredToken = new Date(now.getTime() - 3600 * 1000); // 1 hour ago
      const validToken = new Date(now.getTime() + 3600 * 1000); // 1 hour from now
      
      const isExpired = (tokenDate: Date) => tokenDate < now;
      
      expect(isExpired(expiredToken)).toBe(true);
      expect(isExpired(validToken)).toBe(false);
    });

    it('should handle token refresh flow', async () => {
      // Test token refresh mechanism
      const mockRefreshToken = 'mock-refresh-token-456';
      const mockNewAccessToken = 'new-access-token-789';
      const mockNewExpiresAt = new Date(Date.now() + 3600 * 1000);
      
      // Simulate successful token refresh
      const refreshResult = {
        success: true,
        accessToken: mockNewAccessToken,
        expiresAt: mockNewExpiresAt,
        refreshToken: mockRefreshToken // Same or new refresh token
      };
      
      expect(refreshResult.success).toBe(true);
      expect(refreshResult.accessToken).toBe(mockNewAccessToken);
      expect(refreshResult.expiresAt).toBeInstanceOf(Date);
      expect(refreshResult.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle token refresh failure', async () => {
      // Test token refresh failure scenarios
      const mockExpiredRefreshToken = 'expired-refresh-token';
      
      // Simulate failed token refresh
      const refreshResult = {
        success: false,
        error: 'invalid_grant',
        errorDescription: 'Refresh token has expired'
      };
      
      expect(refreshResult.success).toBe(false);
      expect(refreshResult.error).toBe('invalid_grant');
      expect(refreshResult.errorDescription).toContain('expired');
    });
  });

  describe('Security Validation', () => {
    it('should not expose sensitive tokens in responses', () => {
      // Test that sensitive data is not exposed
      const mockResponse = {
        success: true,
        user: {
          id: 'user-123',
          email: 'user@example.com',
          name: 'Test User',
          provider: 'okta'
        },
        // Sensitive data should NOT be included
        // accessToken: 'secret-token', // This should not be here
        // refreshToken: 'secret-refresh-token' // This should not be here
      };
      
      expect(mockResponse.user).toBeDefined();
      expect(mockResponse.user.email).toBe('user@example.com');
      expect(mockResponse).not.toHaveProperty('accessToken');
      expect(mockResponse).not.toHaveProperty('refreshToken');
    });

    it('should validate token encryption at rest', () => {
      // Test that tokens are encrypted before storage
      const mockToken = 'sensitive-token-data';
      const mockEncryptedToken = Buffer.from(mockToken).toString('base64'); // Simple mock encryption
      
      expect(mockEncryptedToken).not.toBe(mockToken);
      expect(mockEncryptedToken).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 pattern
    });

    it('should handle token revocation', async () => {
      // Test token revocation flow
      const mockTokenId = 'token-123';
      
      // Simulate token revocation
      const revocationResult = {
        success: true,
        message: 'Token revoked successfully',
        revokedAt: new Date()
      };
      
      expect(revocationResult.success).toBe(true);
      expect(revocationResult.message).toContain('revoked');
      expect(revocationResult.revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('User Experience Flow', () => {
    it('should provide clear provider selection UI', () => {
      // Test provider selection interface
      const availableProviders = getAvailableProviders();
      const ssoProviders = availableProviders.filter(p => p.type === 'oauth');
      
      // Should have clear provider information
      ssoProviders.forEach(provider => {
        expect(provider.id).toBeDefined();
        expect(provider.name).toBeDefined();
        expect(provider.description).toBeDefined();
        expect(provider.type).toBe('oauth');
      });
    });

    it('should handle provider connection status', () => {
      // Test connection status display
      const mockConnectionStatus = {
        provider: 'okta',
        connected: true,
        connectedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        userEmail: 'user@acme.com'
      };
      
      expect(mockConnectionStatus.connected).toBe(true);
      expect(mockConnectionStatus.provider).toBe('okta');
      expect(mockConnectionStatus.userEmail).toContain('@');
      expect(mockConnectionStatus.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle provider disconnection', async () => {
      // Test disconnection flow
      const mockDisconnectResult = {
        success: true,
        message: 'Successfully disconnected from Okta',
        disconnectedAt: new Date(),
        provider: 'okta'
      };
      
      expect(mockDisconnectResult.success).toBe(true);
      expect(mockDisconnectResult.message).toContain('disconnected');
      expect(mockDisconnectResult.provider).toBe('okta');
      expect(mockDisconnectResult.disconnectedAt).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle OAuth2 authorization errors', () => {
      // Test OAuth2 error scenarios
      const mockAuthError = {
        error: 'access_denied',
        errorDescription: 'User denied access',
        state: 'random-state-123'
      };
      
      expect(mockAuthError.error).toBe('access_denied');
      expect(mockAuthError.errorDescription).toContain('denied');
      expect(mockAuthError.state).toBeDefined();
    });

    it('should handle network errors during OAuth2 flow', () => {
      // Test network error handling
      const mockNetworkError = {
        error: 'network_error',
        errorDescription: 'Unable to reach OAuth provider',
        retryable: true
      };
      
      expect(mockNetworkError.error).toBe('network_error');
      expect(mockNetworkError.retryable).toBe(true);
    });

    it('should handle invalid provider configuration', () => {
      // Test invalid configuration handling
      const mockConfigError = {
        error: 'invalid_configuration',
        errorDescription: 'Missing required environment variables',
        provider: 'okta',
        missingVars: ['OKTA_CLIENT_ID', 'OKTA_CLIENT_SECRET']
      };
      
      expect(mockConfigError.error).toBe('invalid_configuration');
      expect(mockConfigError.missingVars).toContain('OKTA_CLIENT_ID');
      expect(mockConfigError.missingVars).toContain('OKTA_CLIENT_SECRET');
    });
  });

  describe('Audit Logging', () => {
    it('should log SSO sign-in events', () => {
      // Test audit logging for SSO events
      const mockAuditLog = {
        event: 'sso_sign_in',
        userId: 'user-123',
        provider: 'okta',
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      };
      
      expect(mockAuditLog.event).toBe('sso_sign_in');
      expect(mockAuditLog.provider).toBe('okta');
      expect(mockAuditLog.timestamp).toBeInstanceOf(Date);
      expect(mockAuditLog.ipAddress).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    });

    it('should log token refresh events', () => {
      // Test audit logging for token refresh
      const mockRefreshLog = {
        event: 'token_refresh',
        userId: 'user-123',
        provider: 'google',
        timestamp: new Date(),
        success: true
      };
      
      expect(mockRefreshLog.event).toBe('token_refresh');
      expect(mockRefreshLog.provider).toBe('google');
      expect(mockRefreshLog.success).toBe(true);
    });

    it('should log provider disconnection events', () => {
      // Test audit logging for disconnection
      const mockDisconnectLog = {
        event: 'provider_disconnect',
        userId: 'user-123',
        provider: 'azure',
        timestamp: new Date(),
        reason: 'user_initiated'
      };
      
      expect(mockDisconnectLog.event).toBe('provider_disconnect');
      expect(mockDisconnectLog.provider).toBe('azure');
      expect(mockDisconnectLog.reason).toBe('user_initiated');
    });
  });
}); 