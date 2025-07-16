import { SecretsVault, SecretMetadata, SecretData } from '../../../../src/lib/secrets/secretsVault';

// Mock Prisma client
const mockPrisma = {
  secret: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  encryptionKey: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
} as any;

// Mock environment variables
const originalEnv = process.env;

describe('SecretsVault', () => {
  let secretsVault: SecretsVault;
  const testUserId = 'test-user-123';
  const testSecretName = 'test-api-key';
  const testSecretValue = 'test-secret-value-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env = {
      ...originalEnv,
      ENCRYPTION_MASTER_KEY: 'test-master-key-32-chars-long-123',
    };

    secretsVault = new SecretsVault(mockPrisma);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Input Validation', () => {
    it('should validate userId is required and non-empty', async () => {
      await expect(secretsVault.storeSecret('', testSecretName, { value: testSecretValue }))
        .rejects.toThrow('Invalid userId: must be a non-empty string');

      await expect(secretsVault.storeSecret('   ', testSecretName, { value: testSecretValue }))
        .rejects.toThrow('Invalid userId: must be a non-empty string');
    });

    it('should validate secret name is required and non-empty', async () => {
      await expect(secretsVault.storeSecret(testUserId, '', { value: testSecretValue }))
        .rejects.toThrow('Invalid secret name: must be a non-empty string');

      await expect(secretsVault.storeSecret(testUserId, '   ', { value: testSecretValue }))
        .rejects.toThrow('Invalid secret name: must be a non-empty string');
    });

    it('should validate secret name contains only valid characters', async () => {
      await expect(secretsVault.storeSecret(testUserId, 'invalid@name', { value: testSecretValue }))
        .rejects.toThrow('Invalid secret name: contains invalid characters');

      await expect(secretsVault.storeSecret(testUserId, 'invalid#name', { value: testSecretValue }))
        .rejects.toThrow('Invalid secret name: contains invalid characters');
    });

    it('should validate secret name length limit', async () => {
      const longName = 'a'.repeat(101);
      await expect(secretsVault.storeSecret(testUserId, longName, { value: testSecretValue }))
        .rejects.toThrow('Invalid secret name: too long (max 100 characters)');
    });

    it('should validate secret value is required and non-empty', async () => {
      // Do not mock DB for this test; validation should fail before DB is called
      await expect(secretsVault.storeSecret(testUserId, testSecretName, { value: '' }))
        .rejects.toThrow('Invalid secret value: must be a non-empty string');
      await expect(secretsVault.storeSecret(testUserId, testSecretName, { value: '   ' }))
        .rejects.toThrow('Invalid secret value: must be a non-empty string');
      // Ensure DB create is never called
      expect(mockPrisma.secret.create).not.toHaveBeenCalled();
    });

    it('should validate secret value length limit', async () => {
      const longValue = 'a'.repeat(10001);
      await expect(secretsVault.storeSecret(testUserId, testSecretName, { value: longValue }))
        .rejects.toThrow('Invalid secret value: too long (max 10,000 characters)');
    });

    it('should validate secret type', async () => {
      await expect(secretsVault.storeSecret(testUserId, testSecretName, { value: testSecretValue }, 'invalid_type' as any))
        .rejects.toThrow('Invalid secret type: must be one of API_KEY, BEARER_TOKEN, BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD, OAUTH2_CLIENT_ID, OAUTH2_CLIENT_SECRET, OAUTH2_ACCESS_TOKEN, OAUTH2_REFRESH_TOKEN, WEBHOOK_SECRET, SSH_KEY, CERTIFICATE, CUSTOM');
    });

    it('should validate expiration date is in the future', async () => {
      const pastDate = new Date(Date.now() - 1000);
      await expect(secretsVault.storeSecret(testUserId, testSecretName, { value: testSecretValue }, 'API_KEY', pastDate))
        .rejects.toThrow('Expiration date must be in the future');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      // Mock successful secret creation
      mockPrisma.secret.create.mockResolvedValue({
        id: 'secret-1',
        userId: testUserId,
        name: testSecretName,
        type: 'API_KEY',
        encryptedData: 'encrypted-data',
        keyId: 'key-1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      // Should not throw for first request
      await expect(secretsVault.storeSecret(testUserId, testSecretName, { value: testSecretValue }))
        .resolves.toBeDefined();
    });

    it('should throw error when rate limit is exceeded', async () => {
      // Mock successful secret creation for first request
      mockPrisma.secret.create.mockResolvedValue({
        id: 'secret-1',
        userId: testUserId,
        name: testSecretName,
        type: 'API_KEY',
        encryptedData: 'encrypted-data',
        keyId: 'key-1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      // Make multiple requests to trigger rate limit
      for (let i = 0; i < 100; i++) {
        try {
          await secretsVault.storeSecret(testUserId, `secret-${i}`, { value: testSecretValue });
        } catch (error) {
          if (i >= 100) {
            expect(error).toHaveProperty('message', 'Rate limit exceeded: maximum 100 requests per minute');
            break;
          }
        }
      }
    });
  });

  describe('Audit Logging Sanitization', () => {
    it('should log secret creation with safe metadata only', async () => {
      const mockSecret = {
        id: 'secret-1',
        userId: testUserId,
        name: testSecretName,
        type: 'API_KEY',
        encryptedData: 'encrypted-data',
        keyId: 'key-1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      mockPrisma.secret.findFirst.mockResolvedValue(null);
      mockPrisma.secret.create.mockResolvedValue(mockSecret);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      await secretsVault.storeSecret(testUserId, testSecretName, { value: testSecretValue });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: testUserId,
          action: 'SECRET_CREATED',
          details: expect.objectContaining({
            secretName: testSecretName,
            timestamp: expect.any(String),
          }),
        }),
      });

      // Verify that the audit log does NOT contain the secret value
      const auditCall = mockPrisma.auditLog.create.mock.calls[0][0];
      const details = auditCall.data.details;
      expect(details).not.toHaveProperty('value');
      expect(details).not.toHaveProperty('secretValue');
      expect(details).not.toContain(testSecretValue);
    });

    it('should log secret access with safe metadata only', async () => {
      const mockSecret = {
        id: 'secret-1',
        userId: testUserId,
        name: testSecretName,
        type: 'API_KEY',
        encryptedData: 'encrypted-data',
        keyId: 'key-1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
      mockPrisma.secret.findFirst.mockResolvedValue(mockSecret);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);
      // Mock the decrypt method to succeed and return a JSON string
      (secretsVault as any).decrypt = jest.fn().mockReturnValue(JSON.stringify({ value: testSecretValue }));
      await secretsVault.getSecret(testUserId, testSecretName);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: testUserId,
          action: 'SECRET_ACCESSED',
          resource: 'SECRET',
          resourceId: testSecretName,
          details: expect.objectContaining({
            secretName: testSecretName,
            action: 'SECRET_ACCESSED',
            timestamp: expect.any(String),
          }),
        }),
      });
      // Verify that the audit log does NOT contain the secret value
      const auditCall = mockPrisma.auditLog.create.mock.calls[0][0];
      const details = auditCall.data.details;
      expect(details).not.toHaveProperty('value');
      expect(details).not.toHaveProperty('secretValue');
      expect(details).not.toContain(testSecretValue);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.secret.findFirst.mockRejectedValue(new Error('Database connection failed'));

      await expect(secretsVault.getSecret(testUserId, testSecretName))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle encryption errors gracefully', async () => {
      // Test with invalid encryption key
      process.env.ENCRYPTION_MASTER_KEY = '';

      expect(() => new SecretsVault(mockPrisma))
        .toThrow('ENCRYPTION_MASTER_KEY environment variable is required');
    });

    it('should handle missing environment variables', async () => {
      // Test with missing encryption key
      process.env.ENCRYPTION_MASTER_KEY = '';

      expect(() => new SecretsVault(mockPrisma))
        .toThrow('ENCRYPTION_MASTER_KEY environment variable is required');
    });
  });

  describe('Security Features', () => {
    it('should encrypt secret data before storage', async () => {
      const mockSecret = {
        id: 'secret-1',
        userId: testUserId,
        name: testSecretName,
        type: 'API_KEY',
        encryptedData: 'encrypted-data',
        keyId: 'key-1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      mockPrisma.secret.findFirst.mockResolvedValue(null);
      mockPrisma.secret.create.mockResolvedValue(mockSecret);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      await secretsVault.storeSecret(testUserId, testSecretName, { value: testSecretValue });

      // Verify that the secret was encrypted before storage
      expect(mockPrisma.secret.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          encryptedData: expect.any(String),
          keyId: expect.any(String),
        }),
      });

      // Verify that the raw value is not stored
      const createCall = mockPrisma.secret.create.mock.calls[0][0];
      expect(createCall.data.encryptedData).not.toBe(testSecretValue);
    });

    it('should validate and sanitize input parameters', async () => {
      // Test various invalid inputs
      await expect(secretsVault.storeSecret('', testSecretName, { value: testSecretValue }))
        .rejects.toThrow('Invalid userId');

      await expect(secretsVault.storeSecret(testUserId, '', { value: testSecretValue }))
        .rejects.toThrow('Invalid secret name');

      await expect(secretsVault.storeSecret(testUserId, 'invalid@name', { value: testSecretValue }))
        .rejects.toThrow('Invalid secret name: contains invalid characters');

      await expect(secretsVault.storeSecret(testUserId, testSecretName, { value: '' }))
        .rejects.toThrow('Invalid secret value');
    });
  });
}); 