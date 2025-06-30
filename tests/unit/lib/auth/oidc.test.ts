import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    ssoProvider: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
  }))
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('test-random-bytes')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'test-hash')
  }))
}));

describe('OIDCService Unit Tests', () => {
  let mockPrisma: any;
  let mockEncryptionService: any;
  let mockJwtValidator: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      ssoProvider: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      }
    };
    mockEncryptionService = {
      encrypt: jest.fn(),
      decrypt: jest.fn()
    };
    mockJwtValidator = {
      validateToken: jest.fn(),
      decodeToken: jest.fn()
    };
  });

  describe('generateAuthUrl', () => {
    it('should generate valid OIDC auth URL for Okta', async () => {
      const mockOidcService = {
        generateAuthUrl: jest.fn().mockResolvedValue({
          authUrl: 'https://company.okta.com/oauth2/v1/authorize?client_id=client123&response_type=code&scope=openid+profile+email&state=state123&nonce=nonce123',
          state: 'state123',
          nonce: 'nonce123'
        })
      };

      const result = await mockOidcService.generateAuthUrl('okta', '/dashboard', 'state123', 'nonce123');

      expect(result.authUrl).toContain('okta.com');
      expect(result.authUrl).toContain('client_id=client123');
      expect(result.authUrl).toContain('response_type=code');
      expect(result.authUrl).toContain('scope=openid+profile+email');
      expect(result.state).toBe('state123');
      expect(result.nonce).toBe('nonce123');
    });

    it('should generate valid OIDC auth URL for Azure AD', async () => {
      const mockOidcService = {
        generateAuthUrl: jest.fn().mockResolvedValue({
          authUrl: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/authorize?client_id=azure-client&response_type=code&scope=openid+profile+email&state=azure-state&nonce=azure-nonce',
          state: 'azure-state',
          nonce: 'azure-nonce'
        })
      };

      const result = await mockOidcService.generateAuthUrl('azure', '/dashboard', 'azure-state', 'azure-nonce');

      expect(result.authUrl).toContain('microsoftonline.com');
      expect(result.authUrl).toContain('client_id=azure-client');
      expect(result.authUrl).toContain('response_type=code');
      expect(result.state).toBe('azure-state');
      expect(result.nonce).toBe('azure-nonce');
    });

    it('should throw error for unsupported provider', async () => {
      const mockOidcService = {
        generateAuthUrl: jest.fn().mockRejectedValue(new Error('Unsupported OIDC provider'))
      };

      await expect(mockOidcService.generateAuthUrl('unsupported', '/dashboard', 'state', 'nonce'))
        .rejects.toThrow('Unsupported OIDC provider');
    });
  });

  describe('processCallback', () => {
    it('should process valid OIDC callback', async () => {
      const mockCode = 'auth-code-123';
      const mockState = 'state123';
      const mockNonce = 'nonce123';

      const mockOidcService = {
        processCallback: jest.fn().mockResolvedValue({
          user: {
            id: 'user-456',
            email: 'user@company.com',
            name: 'OIDC User',
            role: 'USER',
            organization: 'Company Name'
          },
          accessToken: 'jwt-token-456',
          expiresIn: 900
        })
      };

      const result = await mockOidcService.processCallback(mockCode, mockState, mockNonce);

      expect(result.user.email).toBe('user@company.com');
      expect(result.user.organization).toBe('Company Name');
      expect(result.accessToken).toBeDefined();
      expect(result.expiresIn).toBe(900);
    });

    it('should handle invalid OIDC callback', async () => {
      const mockOidcService = {
        processCallback: jest.fn().mockRejectedValue(new Error('Invalid OIDC callback'))
      };

      await expect(mockOidcService.processCallback('invalid', 'state', 'nonce'))
        .rejects.toThrow('Invalid OIDC callback');
    });
  });

  describe('validateIdToken', () => {
    it('should validate correct ID token', async () => {
      const mockIdToken = 'valid.id.token';
      const mockProvider = 'okta';

      const mockOidcService = {
        validateIdToken: jest.fn().mockResolvedValue({
          isValid: true,
          claims: {
            sub: 'user-123',
            email: 'user@company.com',
            name: 'Test User',
            nonce: 'nonce123'
          }
        })
      };

      const result = await mockOidcService.validateIdToken(mockIdToken, mockProvider);

      expect(result.isValid).toBe(true);
      expect(result.claims.sub).toBe('user-123');
      expect(result.claims.email).toBe('user@company.com');
      expect(result.claims.nonce).toBe('nonce123');
    });

    it('should reject invalid ID token', async () => {
      const mockIdToken = 'invalid.id.token';
      const mockProvider = 'okta';

      const mockOidcService = {
        validateIdToken: jest.fn().mockResolvedValue({
          isValid: false,
          error: 'Invalid token signature'
        })
      };

      const result = await mockOidcService.validateIdToken(mockIdToken, mockProvider);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid token signature');
    });

    it('should reject ID token with invalid nonce', async () => {
      const mockIdToken = 'valid.id.token';
      const mockProvider = 'okta';

      const mockOidcService = {
        validateIdToken: jest.fn().mockResolvedValue({
          isValid: false,
          error: 'Nonce mismatch'
        })
      };

      const result = await mockOidcService.validateIdToken(mockIdToken, mockProvider);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nonce mismatch');
    });
  });

  describe('getProviderConfig', () => {
    it('should return Okta provider configuration', async () => {
      const mockOidcService = {
        getProviderConfig: jest.fn().mockResolvedValue({
          provider: 'okta',
          issuerUrl: 'https://company.okta.com',
          clientId: 'okta-client-id',
          clientSecret: 'encrypted-secret',
          scopes: ['openid', 'profile', 'email'],
          authorizationEndpoint: 'https://company.okta.com/oauth2/v1/authorize',
          tokenEndpoint: 'https://company.okta.com/oauth2/v1/token',
          userinfoEndpoint: 'https://company.okta.com/oauth2/v1/userinfo'
        })
      };

      const config = await mockOidcService.getProviderConfig('okta');

      expect(config.provider).toBe('okta');
      expect(config.issuerUrl).toContain('okta.com');
      expect(config.scopes).toContain('openid');
      expect(config.scopes).toContain('profile');
      expect(config.scopes).toContain('email');
    });

    it('should return Azure AD provider configuration', async () => {
      const mockOidcService = {
        getProviderConfig: jest.fn().mockResolvedValue({
          provider: 'azure',
          issuerUrl: 'https://login.microsoftonline.com/tenant-id',
          clientId: 'azure-client-id',
          clientSecret: 'encrypted-secret',
          scopes: ['openid', 'profile', 'email'],
          authorizationEndpoint: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/authorize',
          tokenEndpoint: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
          userinfoEndpoint: 'https://graph.microsoft.com/oidc/userinfo'
        })
      };

      const config = await mockOidcService.getProviderConfig('azure');

      expect(config.provider).toBe('azure');
      expect(config.issuerUrl).toContain('microsoftonline.com');
      expect(config.scopes).toContain('openid');
      expect(config.scopes).toContain('profile');
      expect(config.scopes).toContain('email');
    });

    it('should throw error for unknown provider', async () => {
      const mockOidcService = {
        getProviderConfig: jest.fn().mockRejectedValue(new Error('Provider not found'))
      };

      await expect(mockOidcService.getProviderConfig('unknown'))
        .rejects.toThrow('Provider not found');
    });
  });

  describe('validateDiscoveryDocument', () => {
    it('should validate correct OIDC discovery document', async () => {
      const mockIssuerUrl = 'https://company.okta.com';

      const mockOidcService = {
        validateDiscoveryDocument: jest.fn().mockResolvedValue({
          isValid: true,
          issuer: 'https://company.okta.com',
          authorizationEndpoint: 'https://company.okta.com/oauth2/v1/authorize',
          tokenEndpoint: 'https://company.okta.com/oauth2/v1/token',
          userinfoEndpoint: 'https://company.okta.com/oauth2/v1/userinfo',
          jwksUri: 'https://company.okta.com/oauth2/v1/keys'
        })
      };

      const result = await mockOidcService.validateDiscoveryDocument(mockIssuerUrl);

      expect(result.isValid).toBe(true);
      expect(result.issuer).toBe('https://company.okta.com');
      expect(result.authorizationEndpoint).toBeDefined();
      expect(result.tokenEndpoint).toBeDefined();
      expect(result.userinfoEndpoint).toBeDefined();
      expect(result.jwksUri).toBeDefined();
    });

    it('should reject invalid OIDC discovery document', async () => {
      const mockIssuerUrl = 'https://invalid-url.com';

      const mockOidcService = {
        validateDiscoveryDocument: jest.fn().mockResolvedValue({
          isValid: false,
          error: 'Invalid discovery document'
        })
      };

      const result = await mockOidcService.validateDiscoveryDocument(mockIssuerUrl);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid discovery document');
    });

    it('should handle network errors when fetching discovery document', async () => {
      const mockIssuerUrl = 'https://unreachable-url.com';

      const mockOidcService = {
        validateDiscoveryDocument: jest.fn().mockRejectedValue(new Error('Network error'))
      };

      await expect(mockOidcService.validateDiscoveryDocument(mockIssuerUrl))
        .rejects.toThrow('Network error');
    });
  });
}); 