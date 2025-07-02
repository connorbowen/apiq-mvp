import { OAuth2Service } from '../../../../src/lib/auth/oauth2';
import { encryptionService } from '../../../../src/utils/encryption';
import { PrismaClient } from '../../../../src/generated/prisma';

// Create fresh mocks for each test
const createMockPrisma = () => ({
  apiCredential: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn()
  },
  apiConnection: {
    update: jest.fn(),
    findFirst: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  }
});
const createMockEncryptionService = () => ({
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  hashPassword: jest.fn(),
});
const mockGenerateSecureToken = jest.fn(() => 'test-nonce-123');

global.fetch = jest.fn();

describe('OAuth2Service', () => {
  let mockPrisma: any;
  let mockEncryptionService: any;
  let oauth2Service: OAuth2Service;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockEncryptionService = createMockEncryptionService();
    oauth2Service = new OAuth2Service({
      prismaClient: mockPrisma,
      encryptionService: mockEncryptionService,
      generateSecureToken: mockGenerateSecureToken
    });
  });

  describe('getSupportedProviders', () => {
    it('should return supported OAuth2 providers', () => {
      const providers = oauth2Service.getSupportedProviders();
      
      expect(providers).toContain('github');
      expect(providers).toContain('google');
      expect(providers).toContain('slack');
      expect(providers.length).toBeGreaterThan(0);
    });
  });

  describe('getProviderConfig', () => {
    it('should return provider configuration for valid provider', () => {
      const config = oauth2Service.getProviderConfig('github');
      
      expect(config).toBeDefined();
      expect(config?.name).toBe('GitHub');
      expect(config?.authorizationUrl).toBe('https://github.com/login/oauth/authorize');
      expect(config?.tokenUrl).toBe('https://github.com/login/oauth/access_token');
      expect(config?.scope).toBe('repo user');
    });

    it('should return null for unsupported provider', () => {
      const config = oauth2Service.getProviderConfig('unsupported-provider');
      
      expect(config).toBeNull();
    });
  });

  describe('validateConfig', () => {
    it('should return empty array for valid configuration', () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        authorizationUrl: 'https://example.com/auth',
        tokenUrl: 'https://example.com/token',
        redirectUri: 'https://example.com/callback',
        scope: 'read write'
      };

      const errors = oauth2Service.validateConfig(config);
      
      expect(errors).toEqual([]);
    });

    it('should return errors for invalid configuration', () => {
      const config = {
        clientId: '',
        clientSecret: '',
        authorizationUrl: '',
        tokenUrl: '',
        redirectUri: '',
        scope: ''
      };

      const errors = oauth2Service.validateConfig(config);
      
      expect(errors).toContain('clientId is required');
      expect(errors).toContain('clientSecret is required');
      expect(errors).toContain('authorizationUrl is required');
      expect(errors).toContain('tokenUrl is required');
      expect(errors).toContain('redirectUri is required');
    });
  });

  describe('generateAuthorizationUrl', () => {
    it('should generate valid authorization URL', () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        authorizationUrl: '',
        tokenUrl: '',
        redirectUri: 'https://example.com/callback',
        scope: 'repo user',
        state: 'github'
      };

      const url = oauth2Service.generateAuthorizationUrl(
        'user-123',
        'connection-456',
        'github',
        config
      );

      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toMatch(/scope=repo(%20|\+)user/);
      expect(url).toContain('state=');
    });

    it('should throw error for unsupported provider', () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        authorizationUrl: '',
        tokenUrl: '',
        redirectUri: 'https://example.com/callback',
        scope: 'repo user',
        state: 'unsupported'
      };

      expect(() => {
        oauth2Service.generateAuthorizationUrl(
          'user-123',
          'connection-456',
          'unsupported-provider',
          config
        );
      }).toThrow('Unsupported OAuth2 provider: unsupported-provider');
    });
  });

  describe('processCallback', () => {
    it('should process successful callback', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'repo user'
      };

      const mockEncryptedAccessToken = {
        encryptedData: 'encrypted-access-token',
        keyId: 'test-key-id'
      };

      const mockEncryptedRefreshToken = {
        encryptedData: 'encrypted-refresh-token',
        keyId: 'test-key-id'
      };

      (mockEncryptionService.encrypt as jest.Mock)
        .mockReturnValueOnce(mockEncryptedAccessToken)
        .mockReturnValueOnce(mockEncryptedRefreshToken);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse)
      });

      // Mock Prisma methods
      mockPrisma.apiCredential.upsert.mockResolvedValue({});
      mockPrisma.apiConnection.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        authorizationUrl: '',
        tokenUrl: '',
        redirectUri: 'https://example.com/callback',
        scope: 'repo user',
        state: 'github'
      };

      // Create a valid state parameter
      const stateData = {
        userId: 'user-123',
        apiConnectionId: 'connection-456',
        provider: 'github',
        timestamp: Date.now(),
        nonce: 'test-nonce-123'
      };
      const stateParam = Buffer.from(JSON.stringify(stateData)).toString('base64url');

      const result = await oauth2Service.processCallback(
        'test-authorization-code',
        stateParam,
        config
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle callback failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad Request')
      });

      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        authorizationUrl: '',
        tokenUrl: '',
        redirectUri: 'https://example.com/callback',
        scope: 'repo user',
        state: 'github'
      };

      // Create a valid state parameter
      const stateData = {
        userId: 'user-123',
        apiConnectionId: 'connection-456',
        provider: 'github',
        timestamp: Date.now(),
        nonce: 'test-nonce-123'
      };
      const stateParam = Buffer.from(JSON.stringify(stateData)).toString('base64url');

      const result = await oauth2Service.processCallback(
        'test-authorization-code',
        stateParam,
        config
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token exchange failed');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockCredentialExpired = {
        id: 'credential-123',
        userId: 'user-123',
        apiConnectionId: 'connection-456',
        encryptedData: JSON.stringify({
          accessToken: 'encrypted-access-token',
          refreshToken: 'encrypted-refresh-token',
          tokenType: 'Bearer',
          scope: 'repo user',
          provider: 'github'
        }),
        keyId: 'test-key-id',
        isActive: true,
        expiresAt: new Date(Date.now() - 1000), // Expired
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const mockCredentialRefreshed = {
        ...mockCredentialExpired,
        expiresAt: new Date(Date.now() + 3600000), // Valid for 1 hour
        isActive: true
      };
      const mockNewTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'repo user'
      };

      const mockEncryptedNewAccessToken = {
        encryptedData: 'encrypted-new-access-token',
        keyId: 'test-key-id'
      };

      const mockEncryptedNewRefreshToken = {
        encryptedData: 'encrypted-new-refresh-token',
        keyId: 'test-key-id'
      };

      // findUnique: first call returns expired credential
      mockPrisma.apiCredential.findUnique.mockResolvedValue(mockCredentialExpired);
      
      // decrypt: first call for refreshToken
      (mockEncryptionService.decrypt as jest.Mock).mockReturnValue('test-refresh-token');

      // encrypt: for new tokens during storeTokens
      (mockEncryptionService.encrypt as jest.Mock)
        .mockReturnValueOnce(mockEncryptedNewAccessToken)
        .mockReturnValueOnce(mockEncryptedNewRefreshToken);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockNewTokenResponse)
      });

      // Mock all Prisma methods
      mockPrisma.apiCredential.upsert.mockResolvedValue({});
      mockPrisma.apiConnection.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        authorizationUrl: '',
        tokenUrl: '',
        redirectUri: 'https://example.com/callback',
        scope: 'repo user',
        state: 'github'
      };

      const result = await oauth2Service.refreshToken('user-123', 'connection-456', config);

      expect(result).toBe(true);
    });

    it('should handle refresh failure when no credentials found', async () => {
      mockPrisma.apiCredential.findUnique.mockResolvedValue(null);

      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        authorizationUrl: '',
        tokenUrl: '',
        redirectUri: 'https://example.com/callback',
        scope: 'repo user',
        state: 'github'
      };

      const result = await oauth2Service.refreshToken('user-123', 'connection-456', config);

      expect(result).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('should return valid access token', async () => {
      const mockCredential = {
        id: 'credential-123',
        userId: 'user-123',
        apiConnectionId: 'connection-456',
        encryptedData: JSON.stringify({
          accessToken: 'encrypted-access-token',
          refreshToken: 'encrypted-refresh-token',
          tokenType: 'Bearer',
          scope: 'repo user',
          provider: 'github'
        }),
        keyId: 'test-key-id',
        isActive: true,
        expiresAt: new Date(Date.now() + 3600000), // Valid for 1 hour
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.apiCredential.findUnique.mockImplementationOnce(() => Promise.resolve(mockCredential));
      (mockEncryptionService.decrypt as jest.Mock).mockImplementationOnce(() => 'test-access-token');

      const result = await oauth2Service.getAccessToken('user-123', 'connection-456');

      expect(result).toBe('test-access-token');
    });

    it('should return null for inactive credential', async () => {
      const mockCredential = {
        id: 'credential-123',
        userId: 'user-123',
        apiConnectionId: 'connection-456',
        encryptedData: JSON.stringify({
          accessToken: 'encrypted-access-token',
          refreshToken: 'encrypted-refresh-token',
          tokenType: 'Bearer',
          scope: 'repo user',
          provider: 'github'
        }),
        keyId: 'test-key-id',
        isActive: false,
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.apiCredential.findUnique.mockResolvedValue(mockCredential);

      const result = await oauth2Service.getAccessToken('user-123', 'connection-456');

      expect(result).toBeNull();
    });

    it('should return null when no credential found', async () => {
      mockPrisma.apiCredential.findUnique.mockResolvedValue(null);

      const result = await oauth2Service.getAccessToken('user-123', 'connection-456');

      expect(result).toBeNull();
    });
  });
}); 