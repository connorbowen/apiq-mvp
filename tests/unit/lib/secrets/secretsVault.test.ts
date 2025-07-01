process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-32-characters-long';

import { PrismaClient } from '../../../../src/generated/prisma';
import { logError, logInfo } from '../../../../src/utils/logger';

// Mock the logger
jest.mock('../../../../src/utils/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn()
}));

let SecretsVault: any;

beforeAll(() => {
  // Import after env var is set
  const secretsVaultModule = require('../../../../src/lib/secrets/secretsVault');
  SecretsVault = secretsVaultModule.SecretsVault;
});

describe('SecretsVault', () => {
  let prisma: PrismaClient;
  let vault: any;
  let testUserId: string;

  beforeAll(async () => {
    // Set up test environment
    prisma = new PrismaClient();
    
    // Create a test user first
    const testUser = await prisma.user.create({
      data: {
        email: 'test-secrets@example.com',
        name: 'Test Secrets User',
        password: 'hashed-password'
      }
    });
    testUserId = testUser.id;
    
    // Create vault after user is created
    vault = new SecretsVault(prisma);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.secret.deleteMany({
      where: { userId: testUserId }
    });
    await prisma.user.delete({
      where: { id: testUserId }
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear all secrets for the test user before each test
    await prisma.secret.deleteMany({
      where: { userId: testUserId }
    });
    
    // Reset rate limiting between tests
    if (vault && vault['rateLimitCache']) {
      vault['rateLimitCache'].clear();
    }
  });

  describe('storeSecret', () => {
    it('should store a new secret successfully', async () => {
      const secretData = {
        value: 'test-api-key-123',
        metadata: { provider: 'stripe', environment: 'test' }
      };

      const result = await vault.storeSecret(
        testUserId,
        'stripe-api-key',
        secretData,
        'api_key'
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.name).toBe('stripe-api-key');
      expect(result.type).toBe('api_key');
      expect(result.isActive).toBe(true);
      expect(result.version).toBe(1);
      expect(result.keyId).toBeDefined();
    });

    it('should update an existing secret with new version', async () => {
      const secretData1 = {
        value: 'old-api-key',
        metadata: { provider: 'stripe' }
      };

      const secretData2 = {
        value: 'new-api-key',
        metadata: { provider: 'stripe', updated: true }
      };

      // Store initial secret
      const result1 = await vault.storeSecret(
        testUserId,
        'stripe-api-key',
        secretData1,
        'api_key'
      );

      // Update the secret
      const result2 = await vault.storeSecret(
        testUserId,
        'stripe-api-key',
        secretData2,
        'api_key'
      );

      expect(result2.id).toBe(result1.id);
      expect(result2.version).toBe(result1.version + 1);
      expect(result2.updatedAt.getTime()).toBeGreaterThan(result1.updatedAt.getTime());
    });

    it('should handle secret expiration', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const secretData = {
        value: 'expiring-key',
        metadata: { expires: true }
      };

      const result = await vault.storeSecret(
        testUserId,
        'expiring-key',
        secretData,
        'api_key',
        expiresAt
      );

      expect(result.expiresAt).toEqual(expiresAt);
    });
  });

  describe('getSecret', () => {
    it('should retrieve and decrypt a stored secret', async () => {
      const originalData = {
        value: 'secret-value-456',
        metadata: { sensitive: true }
      };

      await vault.storeSecret(
        testUserId,
        'test-secret',
        originalData,
        'custom'
      );

      const retrievedData = await vault.getSecret(testUserId, 'test-secret');

      expect(retrievedData.value).toBe(originalData.value);
      expect(retrievedData.metadata).toEqual(originalData.metadata);
    });

    it('should throw error for non-existent secret', async () => {
      await expect(
        vault.getSecret(testUserId, 'non-existent-secret')
      ).rejects.toThrow("Secret 'non-existent-secret' not found");
    });

    it('should throw error for expired secret', async () => {
      // Create a secret with expiration in the past (but allow it to be stored first)
      const expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago
      const secretData = {
        value: 'expired-key'
      };

      // Temporarily disable expiration validation for storage
      const originalStoreSecret = vault.storeSecret.bind(vault);
      vault.storeSecret = async (userId: string, name: string, secretData: any, type?: any, expiresAt?: Date) => {
        // Store without expiration validation
        const encryptedData = vault['encrypt'](JSON.stringify(secretData));
        
        const newSecret = await prisma.secret.create({
          data: {
            userId,
            name,
            type: type || 'custom',
            encryptedData: encryptedData.encryptedData,
            keyId: encryptedData.keyId,
            version: 1,
            isActive: true,
            expiresAt,
            metadata: secretData.metadata
          }
        });

        await vault['logSecretAccess'](userId, 'SECRET_CREATED', name);
        return vault['mapToSecretMetadata'](newSecret, type || 'custom');
      };

      try {
        await vault.storeSecret(
          testUserId,
          'expired-secret',
          secretData,
          'api_key',
          expiresAt
        );

        // Now try to retrieve it - should fail due to expiration
        await expect(
          vault.getSecret(testUserId, 'expired-secret')
        ).rejects.toThrow("Secret 'expired-secret' has expired");
      } finally {
        // Restore original method
        vault.storeSecret = originalStoreSecret;
      }
    });
  });

  describe('listSecrets', () => {
    it('should list all secrets for a user', async () => {
      const secrets = [
        { name: 'secret-1', value: 'value-1', type: 'api_key' as const },
        { name: 'secret-2', value: 'value-2', type: 'oauth2_token' as const },
        { name: 'secret-3', value: 'value-3', type: 'webhook_secret' as const }
      ];

      // Store multiple secrets
      for (const secret of secrets) {
        await vault.storeSecret(
          testUserId,
          secret.name,
          { value: secret.value },
          secret.type
        );
      }

      const result = await vault.listSecrets(testUserId);

      expect(result).toHaveLength(3);
      expect(result.map(s => s.name)).toContain('secret-1');
      expect(result.map(s => s.name)).toContain('secret-2');
      expect(result.map(s => s.name)).toContain('secret-3');
      expect(result.every(s => s.isActive)).toBe(true);
    });

    it('should return empty array for user with no secrets', async () => {
      const result = await vault.listSecrets(testUserId);
      expect(result).toHaveLength(0);
    });
  });

  describe('deleteSecret', () => {
    it('should soft delete a secret', async () => {
      const secretData = {
        value: 'to-be-deleted'
      };

      await vault.storeSecret(
        testUserId,
        'delete-me',
        secretData,
        'custom'
      );

      await vault.deleteSecret(testUserId, 'delete-me');

      // Secret should not be retrievable
      await expect(
        vault.getSecret(testUserId, 'delete-me')
      ).rejects.toThrow("Secret 'delete-me' not found");

      // But should still exist in database (soft delete)
      const secrets = await prisma.secret.findMany({
        where: { userId: testUserId, name: 'delete-me' }
      });
      expect(secrets).toHaveLength(1);
      expect(secrets[0].isActive).toBe(false);
    });

    it('should throw error when deleting non-existent secret', async () => {
      await expect(
        vault.deleteSecret(testUserId, 'non-existent')
      ).rejects.toThrow("Secret 'non-existent' not found");
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when vault is operational', async () => {
      const health = await vault.getHealthStatus();

      expect(health.status).toBe('warning'); // Using initial key
      expect(health.message).toContain('operational');
      expect(health.keyCount).toBeGreaterThan(0);
      expect(health.activeSecrets).toBeGreaterThanOrEqual(0);
    });
  });

  describe('audit logging', () => {
    it('should log secret access events', async () => {
      const secretData = {
        value: 'audit-test-key'
      };

      await vault.storeSecret(
        testUserId,
        'audit-test',
        secretData,
        'api_key'
      );

      await vault.getSecret(testUserId, 'audit-test');

      // Check that audit logs were created
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userId: testUserId,
          resource: 'SECRET',
          resourceId: 'audit-test'
        }
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs.some(log => log.action === 'SECRET_CREATED')).toBe(true);
      expect(auditLogs.some(log => log.action === 'SECRET_ACCESSED')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test with invalid user ID
      const secretData = {
        value: 'test-value'
      };

      await expect(
        vault.storeSecret(
          'invalid-user-id',
          'test-secret',
          secretData,
          'custom'
        )
      ).rejects.toThrow();
    });
  });

  describe('input validation and sanitization', () => {
    it('should reject empty userId', async () => {
      const secretData = { value: 'test-value' };
      
      await expect(
        vault.storeSecret('', 'test-secret', secretData)
      ).rejects.toThrow('Invalid userId: must be a non-empty string');
    });

    it('should reject empty secret name', async () => {
      const secretData = { value: 'test-value' };
      
      await expect(
        vault.storeSecret(testUserId, '', secretData)
      ).rejects.toThrow('Invalid secret name: must be a non-empty string');
    });

    it('should reject secret names with invalid characters', async () => {
      const secretData = { value: 'test-value' };
      
      await expect(
        vault.storeSecret(testUserId, 'test@secret', secretData)
      ).rejects.toThrow('Invalid secret name: contains invalid characters');
      
      await expect(
        vault.storeSecret(testUserId, 'test secret', secretData)
      ).rejects.toThrow('Invalid secret name: contains invalid characters');
    });

    it('should reject secret names that are too long', async () => {
      const secretData = { value: 'test-value' };
      const longName = 'a'.repeat(101);
      
      await expect(
        vault.storeSecret(testUserId, longName, secretData)
      ).rejects.toThrow('Invalid secret name: too long');
    });

    it('should reject empty secret values', async () => {
      await expect(
        vault.storeSecret(testUserId, 'test-secret', { value: '' })
      ).rejects.toThrow('Invalid secret value: must be a non-empty string');
    });

    it('should reject secret values that are too long', async () => {
      const longValue = 'a'.repeat(10001);
      
      await expect(
        vault.storeSecret(testUserId, 'test-secret', { value: longValue })
      ).rejects.toThrow('Invalid secret value: too long');
    });

    it('should reject invalid secret types', async () => {
      const secretData = { value: 'test-value' };
      
      await expect(
        vault.storeSecret(testUserId, 'test-secret', secretData, 'invalid_type' as any)
      ).rejects.toThrow('Invalid secret type: must be one of');
    });

    it('should reject past expiration dates', async () => {
      const secretData = { value: 'test-value' };
      const pastDate = new Date(Date.now() - 1000);
      
      await expect(
        vault.storeSecret(testUserId, 'test-secret', secretData, 'custom', pastDate)
      ).rejects.toThrow('Expiration date must be in the future');
    });

    it('should accept valid secret names with hyphens and underscores', async () => {
      const secretData = { value: 'test-value' };
      
      const result = await vault.storeSecret(
        testUserId,
        'valid-secret_name123',
        secretData
      );

      expect(result.name).toBe('valid-secret_name123');
    });
  });

  describe('rate limiting', () => {
    beforeEach(() => {
      // Clear rate limit cache before each rate limiting test
      if (vault && vault['rateLimitCache']) {
        vault['rateLimitCache'].clear();
      }
    });

    it('should allow requests within rate limit', async () => {
      const secretData = { value: 'test-value' };
      
      // Make multiple requests within rate limit
      for (let i = 0; i < 10; i++) {
        await vault.storeSecret(
          testUserId,
          `rate-test-${i}`,
          secretData
        );
      }
      
      // Should not throw rate limit error
      const secrets = await vault.listSecrets(testUserId);
      expect(secrets.length).toBeGreaterThanOrEqual(10);
    });

    it('should enforce rate limit for excessive requests', async () => {
      const secretData = { value: 'test-value' };
      
      // Make requests up to the limit
      for (let i = 0; i < 100; i++) {
        await vault.storeSecret(
          testUserId,
          `rate-limit-test-${i}`,
          secretData
        );
      }
      
      // Next request should be rate limited
      await expect(
        vault.storeSecret(
          testUserId,
          'rate-limit-exceeded',
          secretData
        )
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should reset rate limit after window expires', async () => {
      const secretData = { value: 'test-value' };
      
      // Make some requests
      for (let i = 0; i < 50; i++) {
        await vault.storeSecret(
          testUserId,
          `reset-test-${i}`,
          secretData
        );
      }
      
      // Mock time to advance past rate limit window
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() + 61000); // 61 seconds later
      
      try {
        // Should be able to make requests again
        await vault.storeSecret(
          testUserId,
          'after-reset',
          secretData
        );
      } finally {
        // Restore original Date.now
        Date.now = originalDateNow;
      }
    });
  });

  describe('security and logging', () => {
    beforeEach(() => {
      // Clear rate limit cache and reset mocks
      if (vault && vault['rateLimitCache']) {
        vault['rateLimitCache'].clear();
      }
      (logError as jest.Mock).mockClear();
    });

    it('should not log sensitive information', async () => {
      const secretData = {
        value: 'super-secret-password-123',
        metadata: { sensitive: true, password: 'should-not-be-logged' }
      };

      // Cause a validation error to trigger logError
      await expect(
        vault.storeSecret(testUserId, 'invalid name!', secretData)
      ).rejects.toThrow('Invalid secret name: contains invalid characters');

      // Verify that logError was called but not with sensitive data
      expect(logError).toHaveBeenCalledWith(
        'Failed to store secret',
        expect.any(Error),
        expect.objectContaining({
          userId: testUserId,
          secretName: 'invalid name!',
          type: 'custom'
        })
      );

      // Verify that the log call does not contain the secret value
      const logCall = (logError as jest.Mock).mock.calls.find(
        call => call[2]?.secretName === 'invalid name!'
      );
      expect(logCall).toBeDefined();
      expect(logCall[2]).not.toHaveProperty('value');
      expect(logCall[2]).not.toHaveProperty('metadata');
    });
  });
}); 