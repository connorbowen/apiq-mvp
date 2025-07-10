import { createAuthenticatedRequest, createUnauthenticatedRequest, createTestUser } from './testUtils';
import { prisma } from '../../lib/database/client';
import { oauth2Service } from '../../src/lib/auth/oauth2';
import { testOAuth2Server } from './testOAuth2Server';

export interface OAuth2TestState {
  userId: string;
  apiConnectionId: string;
  provider: string;
  timestamp: number;
  nonce: string;
}

/**
 * Create a valid OAuth2 state parameter for testing
 */
export function createTestOAuth2State(
  userId: string,
  apiConnectionId: string,
  provider: string = 'github'
): string {
  const state: OAuth2TestState = {
    userId,
    apiConnectionId,
    provider,
    timestamp: Date.now(),
    nonce: 'test-nonce-123'
  };
  
  const stateString = JSON.stringify(state);
  return Buffer.from(stateString).toString('base64url');
}

/**
 * Create an expired OAuth2 state parameter for testing
 */
export function createExpiredOAuth2State(
  userId: string,
  apiConnectionId: string,
  provider: string = 'github'
): string {
  const state: OAuth2TestState = {
    userId,
    apiConnectionId,
    provider,
    timestamp: Date.now() - (6 * 60 * 1000), // 6 minutes ago (expired)
    nonce: 'test-nonce-expired'
  };
  
  const stateString = JSON.stringify(state);
  return Buffer.from(stateString).toString('base64url');
}

/**
 * Create test OAuth2 configuration
 */
export function createTestOAuth2Config(provider: string = 'google') {
  const configs = {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || 'test-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret',
      redirectUri: process.env.OAUTH2_REDIRECT_URI || 'http://localhost:3000/api/connections/oauth2/callback',
      scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly'
    }
  };

  return configs[provider as keyof typeof configs] || configs.google;
}

/**
 * Create test OAuth2 token response
 */
export function createTestOAuth2TokenResponse(provider: string = 'google') {
  const responses = {
    google: {
      access_token: 'ya29.test_access_token_123',
      token_type: 'Bearer',
      scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly',
      refresh_token: '1//test_refresh_token_456',
      expires_in: 3600
    }
  };

  return responses[provider as keyof typeof responses] || responses.google;
}

/**
 * Create test OAuth2 API connection
 */
export async function createTestOAuth2Connection(
  userId: string,
  provider: string = 'github',
  name?: string
) {
  const config = createTestOAuth2Config(provider);
  
  return await prisma.apiConnection.create({
    data: {
      userId,
      name: name || `${provider.toUpperCase()} API OAuth2 Test`,
      baseUrl: getProviderBaseUrl(provider),
      authType: 'OAUTH2',
      authConfig: {
        provider,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
        scope: config.scope
      },
      status: 'ACTIVE',
      ingestionStatus: 'SUCCEEDED'
    }
  });
}

/**
 * Get provider base URL
 */
function getProviderBaseUrl(provider: string): string {
  const urls = {
    google: 'https://www.googleapis.com'
  };

  return urls[provider as keyof typeof urls] || 'https://api.example.com';
}

/**
 * Create authenticated OAuth2 request
 */
export function createOAuth2AuthenticatedRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  user: any,
  options: {
    body?: any;
    query?: any;
    headers?: Record<string, string>;
  } = {}
) {
  return createAuthenticatedRequest(method, user, options);
}

/**
 * Create unauthenticated OAuth2 request
 */
export function createOAuth2UnauthenticatedRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  options: {
    body?: any;
    query?: any;
    headers?: Record<string, string>;
  } = {}
) {
  return createUnauthenticatedRequest(method, options);
}

/**
 * Mock OAuth2 token exchange response
 */
export function mockOAuth2TokenExchange(
  provider: string = 'github',
  success: boolean = true,
  errorCode?: string
) {
  const mockFetch = global.fetch as jest.Mock;
  
  if (success) {
    const tokenResponse = createTestOAuth2TokenResponse(provider);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tokenResponse
    });
  } else {
    const errorResponses = {
      invalid_grant: {
        ok: false,
        status: 400,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'The authorization code is invalid or has expired'
        }),
        text: async () => 'invalid_grant'
      },
      rate_limited: {
        ok: false,
        status: 429,
        headers: {
          get: (name: string) => {
            if (name === 'Retry-After') return '60';
            return null;
          }
        },
        text: async () => 'Rate limit exceeded'
      },
      network_error: {
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      }
    };

    const errorResponse = errorResponses[errorCode as keyof typeof errorResponses] || errorResponses.invalid_grant;
    mockFetch.mockResolvedValueOnce(errorResponse);
  }
}

/**
 * Mock OAuth2 token refresh response
 */
export function mockOAuth2TokenRefresh(
  provider: string = 'github',
  success: boolean = true
) {
  const mockFetch = global.fetch as jest.Mock;
  
  if (success) {
    const tokenResponse = createTestOAuth2TokenResponse(provider);
    // For refresh, we might not get a new refresh token
    if (provider === 'github' && 'refresh_token' in tokenResponse) {
      delete (tokenResponse as any).refresh_token;
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tokenResponse
    });
  } else {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'invalid_grant',
        error_description: 'The refresh token is invalid or has expired'
      }),
      text: async () => 'invalid_grant'
    });
  }
}

/**
 * Clean up OAuth2 test data
 */
export async function cleanupOAuth2TestData(
  userId: string,
  apiConnectionId: string
) {
  // Clean up API credentials
  await prisma.apiCredential.deleteMany({
    where: {
      userId,
      apiConnectionId
    }
  });

  // Clean up audit logs
  await prisma.auditLog.deleteMany({
    where: {
      userId,
      resource: 'API_CONNECTION',
      resourceId: apiConnectionId
    }
  });

  // Clean up API connection
  await prisma.apiConnection.delete({
    where: { id: apiConnectionId }
  });
}

/**
 * Verify OAuth2 audit logs
 */
export async function verifyOAuth2AuditLog(
  userId: string,
  action: string,
  resourceId: string
) {
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      userId,
      action,
      resource: 'API_CONNECTION',
      resourceId
    }
  });

  return auditLogs.length > 0;
}

/**
 * Verify OAuth2 credentials are encrypted
 */
export async function verifyOAuth2CredentialsEncrypted(
  userId: string,
  apiConnectionId: string
) {
  const credentials = await prisma.apiCredential.findMany({
    where: {
      userId,
      apiConnectionId
    }
  });

  if (credentials.length === 0) {
    return false;
  }

  const credential = credentials[0];
  return credential.encryptedData && credential.keyId;
} 

/**
 * Generate a test OAuth2 authorization URL for E2E testing
 */
export function generateTestOAuth2Url(params: {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
}): string {
  return testOAuth2Server.generateAuthorizationUrl(params);
}

/**
 * Clear test OAuth2 server data
 */
export function clearTestOAuth2Data(): void {
  testOAuth2Server.clearTestData();
} 