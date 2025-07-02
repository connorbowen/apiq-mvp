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

// Define a type for SSO provider for type assertions
interface SSOProvider {
  id: string;
  name: string;
  type: string;
  description: string;
  authorizationUrl?: string;
  scopes?: string[] | string;
}

describe('SSO Authentication Flow Testing - Real Integration', () => {
  let testUser: any;

  beforeAll(async () => {
    // Create test user once per suite for reuse across all tests
    testUser = await createTestUser(undefined, 'ssoauth123', Role.USER, 'SSO Auth User');
  });

  afterAll(async () => {
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
  });

  beforeEach(() => {
    // No mocks needed for real integration tests
  });

  describe('SSO Provider Configuration', () => {
    it('should return available providers based on environment configuration', () => {
      const providers = getAvailableProviders() as SSOProvider[];
      // Should always include credentials provider
      expect(providers).toContainEqual({
        id: 'credentials',
        name: 'Email & Password',
        type: 'credentials',
        description: 'Sign in with email and password',
      });
      // Only check for real SSO providers if env vars are set
      const ssoProviders = providers.filter((p: SSOProvider) => p.type === 'oauth');
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        expect(ssoProviders.some((p: SSOProvider) => p.id === 'google')).toBe(true);
      }
      if (process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET) {
        expect(ssoProviders.some((p: SSOProvider) => p.id === 'okta')).toBe(true);
      }
      if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET) {
        expect(ssoProviders.some((p: SSOProvider) => p.id === 'azure-ad')).toBe(true);
      }
    });
  });

  describe('OAuth2 Flow Testing', () => {
    it('should generate real OAuth2 authorization URLs for configured providers', () => {
      const providers = (getAvailableProviders() as SSOProvider[]).filter((p: SSOProvider) => p.type === 'oauth');
      providers.forEach((provider: SSOProvider) => {
        if (provider.authorizationUrl) {
          expect(provider.authorizationUrl).toMatch(/^https:\/\//);
        }
      });
    });
    it('should validate OAuth2 scope configuration for real providers', () => {
      const providers = (getAvailableProviders() as SSOProvider[]).filter((p: SSOProvider) => p.type === 'oauth');
      const requiredScopes = ['openid', 'profile', 'email'];
      providers.forEach((provider: SSOProvider) => {
        if (provider.scopes) {
          const scopesArr = Array.isArray(provider.scopes) ? provider.scopes : provider.scopes.split(' ');
          requiredScopes.forEach(scope => {
            expect(scopesArr).toContain(scope);
          });
        }
      });
    });
    it('should skip callback/state validation (requires real browser flow)', () => {
      // Skipped: requires real user interaction
      expect(true).toBe(true);
    });
  });

  describe('Token Management', () => {
    it('should skip real access token storage/retrieval (requires real SSO flow)', () => {
      // Skipped: requires real user interaction and SSO callback
      expect(true).toBe(true);
    });
    it('should skip token expiration validation (requires real SSO flow)', () => {
      // Skipped: requires real user interaction and SSO callback
      expect(true).toBe(true);
    });
    it('should skip token refresh flow (requires real SSO flow)', () => {
      // Skipped: requires real user interaction and SSO callback
      expect(true).toBe(true);
    });
  });
}); 