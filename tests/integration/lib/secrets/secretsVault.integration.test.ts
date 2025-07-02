process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-32-characters-long';

import { logError, logInfo } from '../../../../src/utils/logger';
import { prisma } from '../../../../lib/database/client';
import { createTestSuite, createTestUser } from '../../../helpers/testUtils';
import { Role } from '../../../../src/generated/prisma';
import bcrypt from 'bcryptjs';

// Mock the logger to prevent noise in tests
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

describe('SecretsVault Integration Tests', () => {
  const testSuite = createTestSuite('SecretsVault Integration');
  let vault: any;
  let testUser: any;

  beforeAll(async () => {
    await testSuite.beforeAll();
    
    // Create a real test user with bcrypt-hashed password
    testUser = await createTestUser(
      'secrets-test@example.com',
      'test-password-123',
      Role.USER,
      'Secrets Test User'
    );
    
    // Create vault with real Prisma client
    vault = new SecretsVault(prisma);
  });

  afterAll(async () => {
    await testSuite.afterAll();
  });

  beforeEach(async () => {
    // Clear all secrets for the test user before each test
    await prisma.secret.deleteMany({
      where: { userId: testUser.id }
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
        testUser.id,
        'stripe-api-key',
        secretData,
        'api_key'
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUser.id);
      expect(result.name).toBe('stripe-api-key');
      expect(result.type).toBe('api_key');
      expect(result.isActive).toBe(true);
      expect(result.version).toBe(1);
      expect(result.keyId).toBeDefined();

      // Verify it was actually stored in the database
      const storedSecret = await prisma.secret.findFirst({
        where: { 
          userId: testUser.id,
          name: 'stripe-api-key',
          isActive: true
        }
      });
      expect(storedSecret).toBeDefined();
      expect(storedSecret?.encryptedData).toBeDefined();
      expect(storedSecret?.keyId).toBeDefined();
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
        testUser.id,
        'stripe-api-key',
        secretData1,
        'api_key'
      );

      // Update the secret
      const result2 = await vault.storeSecret(
        testUser.id,
        'stripe-api-key',
        secretData2,
        'api_key'
      );

      expect(result2.id).toBe(result1.id);
      expect(result2.version).toBe(result1.version + 1);
      expect(result2.updatedAt.getTime()).toBeGreaterThan(result1.updatedAt.getTime());

      // Verify the new data is encrypted and stored
      const updatedSecret = await prisma.secret.findFirst({
        where: { 
          userId: testUser.id,
          name: 'stripe-api-key',
          isActive: true
        }
      });
      expect(updatedSecret?.version).toBe(2);
    });

    it('should handle secret expiration', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const secretData = {
        value: 'expiring-key',
        metadata: { expires: true }
      };

      const result = await vault.storeSecret(
        testUser.id,
        'expiring-key',
        secretData,
        'api_key',
        expiresAt
      );

      expect(result.expiresAt).toEqual(expiresAt);

      // Verify expiration is stored in database
      const storedSecret = await prisma.secret.findFirst({
        where: { 
          userId: testUser.id,
          name: 'expiring-key',
          isActive: true
        }
      });
      expect(storedSecret?.expiresAt).toEqual(expiresAt);
    });

    it('should validate input parameters', async () => {
      const secretData = { value: 'test-secret' };

      // Test invalid userId
      await expect(
        vault.storeSecret('', 'test-secret', secretData)
      ).rejects.toThrow('Invalid userId: must be a non-empty string');

      // Test invalid name
      await expect(
        vault.storeSecret(testUser.id, '', secretData)
      ).rejects.toThrow('Invalid secret name: must be a non-empty string');

      // Test invalid characters in name
      await expect(
        vault.storeSecret(testUser.id, 'secret with spaces', secretData)
      ).rejects.toThrow('Invalid secret name: contains invalid characters');

      // Test name too long
      const longName = 'a'.repeat(101);
      await expect(
        vault.storeSecret(testUser.id, longName, secretData)
      ).rejects.toThrow('Invalid secret name: too long (max 100 characters)');

      // Test value too long
      const longValue = 'a'.repeat(10001);
      await expect(
        vault.storeSecret(testUser.id, 'test-secret', { value: longValue })
      ).rejects.toThrow('Invalid secret value: too long (max 10,000 characters)');
    });
  });

  describe('getSecret', () => {
    it('should retrieve and decrypt a stored secret', async () => {
      const originalData = {
        value: 'secret-value-456',
        metadata: { sensitive: true }
      };

      await vault.storeSecret(
        testUser.id,
        'test-secret',
        originalData,
        'custom'
      );

      const retrievedData = await vault.getSecret(testUser.id, 'test-secret');

      expect(retrievedData.value).toBe(originalData.value);
      expect(retrievedData.metadata).toEqual(originalData.metadata);
    });

    it('should throw error for non-existent secret', async () => {
      await expect(
        vault.getSecret(testUser.id, 'non-existent-secret')
      ).rejects.toThrow("Secret 'non-existent-secret' not found");
    });

    it('should throw error for expired secret', async () => {
      // Create a secret with expiration in the past
      const expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago
      const secretData = {
        value: 'expired-key'
      };

      // Store the secret directly in database with past expiration
      const encryptedData = vault['encrypt'](JSON.stringify(secretData));
      await prisma.secret.create({
        data: {
          userId: testUser.id,
          name: 'expired-secret',
          type: 'api_key',
          encryptedData: encryptedData.encryptedData,
          keyId: encryptedData.keyId,
          version: 1,
          isActive: true,
          expiresAt
        }
      });

      // Now try to retrieve it - should fail due to expiration
      await expect(
        vault.getSecret(testUser.id, 'expired-secret')
      ).rejects.toThrow("Secret 'expired-secret' has expired");
    });
  });

  describe('listSecrets', () => {
    it('should return metadata only (no sensitive data)', async () => {
      // Create multiple test secrets
      const secrets = [
        { name: 'secret-1', value: 'value-1', type: 'api_key' },
        { name: 'secret-2', value: 'value-2', type: 'oauth2_token' },
        { name: 'secret-3', value: 'value-3', type: 'custom' }
      ];

      for (const secret of secrets) {
        await vault.storeSecret(
          testUser.id,
          secret.name,
          { value: secret.value },
          secret.type
        );
      }

      const result = await vault.listSecrets(testUser.id);

      expect(result).toHaveLength(3);
      expect(result.map(s => s.name)).toContain('secret-1');
      expect(result.map(s => s.name)).toContain('secret-2');
      expect(result.map(s => s.name)).toContain('secret-3');

      // Verify no sensitive data is returned
      result.forEach(secret => {
        expect(secret).not.toHaveProperty('encryptedData');
        expect(secret).not.toHaveProperty('value');
        expect(secret).toHaveProperty('name');
        expect(secret).toHaveProperty('type');
        expect(secret).toHaveProperty('isActive');
        expect(secret).toHaveProperty('version');
      });
    });

    it('should not return secrets from other users', async () => {
      // Create another test user
      const otherUser = await createTestUser(
        'other-user@example.com',
        'other-password-123',
        Role.USER,
        'Other User'
      );

      // Create secrets for both users
      await vault.storeSecret(
        testUser.id,
        'my-secret',
        { value: 'my-value' },
        'api_key'
      );

      await vault.storeSecret(
        otherUser.id,
        'other-secret',
        { value: 'other-value' },
        'api_key'
      );

      // List secrets for test user
      const result = await vault.listSecrets(testUser.id);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('my-secret');

      // Clean up other user
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('deleteSecret', () => {
    it('should soft delete secret', async () => {
      const secretData = { value: 'delete-me' };
      
      await vault.storeSecret(
        testUser.id,
        'delete-me',
        secretData,
        'api_key'
      );

      await vault.deleteSecret(testUser.id, 'delete-me');

      // Should not be retrievable
      await expect(
        vault.getSecret(testUser.id, 'delete-me')
      ).rejects.toThrow("Secret 'delete-me' not found");

      // But should still exist in database (soft delete)
      const secrets = await prisma.secret.findMany({
        where: { userId: testUser.id, name: 'delete-me' }
      });
      expect(secrets).toHaveLength(1);
      expect(secrets[0].isActive).toBe(false);

      // Check that audit logs were created
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userId: testUser.id,
          action: 'SECRET_DELETED',
          resource: 'SECRET'
        }
      });
      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  describe('rate limiting', () => {
    it('should allow requests within rate limit', async () => {
      const secretData = { value: 'test-value' };
      
      // Make multiple requests within rate limit
      for (let i = 0; i < 10; i++) {
        await vault.storeSecret(
          testUser.id,
          `rate-test-${i}`,
          secretData
        );
      }
      
      // Should not throw rate limit error
      const secrets = await vault.listSecrets(testUser.id);
      expect(secrets.length).toBeGreaterThanOrEqual(10);
    });

    it('should enforce rate limit for excessive requests', async () => {
      const secretData = { value: 'test-value' };
      
      // Make requests up to the limit
      for (let i = 0; i < 100; i++) {
        await vault.storeSecret(
          testUser.id,
          `rate-limit-test-${i}`,
          secretData
        );
      }
      
      // Next request should be rate limited
      await expect(
        vault.storeSecret(
          testUser.id,
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
          testUser.id,
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
          testUser.id,
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
    it('should not log sensitive information', async () => {
      const secretData = {
        value: 'super-secret-password-123',
        metadata: { sensitive: true, password: 'should-not-be-logged' }
      };

      // Cause a validation error to trigger logError
      await expect(
        vault.storeSecret(testUser.id, 'invalid name!', secretData)
      ).rejects.toThrow('Invalid secret name: contains invalid characters');

      // Verify that logError was called but not with sensitive data
      expect(logError).toHaveBeenCalledWith(
        'Failed to store secret',
        expect.any(Error),
        expect.objectContaining({
          userId: testUser.id,
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

    it('should encrypt sensitive data properly', async () => {
      const secretData = {
        value: 'super-sensitive-api-key-12345',
        metadata: { provider: 'stripe' }
      };

      await vault.storeSecret(
        testUser.id,
        'encryption-test',
        secretData,
        'api_key'
      );

      // Verify the data is encrypted in the database
      const storedSecret = await prisma.secret.findFirst({
        where: { 
          userId: testUser.id,
          name: 'encryption-test',
          isActive: true
        }
      });

      expect(storedSecret).toBeDefined();
      expect(storedSecret?.encryptedData).not.toBe(secretData.value);
      expect(storedSecret?.encryptedData).not.toContain('super-sensitive-api-key-12345');
      expect(storedSecret?.keyId).toBeDefined();

      // Verify we can decrypt it back
      const retrievedData = await vault.getSecret(testUser.id, 'encryption-test');
      expect(retrievedData.value).toBe(secretData.value);
      expect(retrievedData.metadata).toEqual(secretData.metadata);
    });
  });

  describe('audit logging', () => {
    it('should log secret access events', async () => {
      const secretData = { value: 'audit-test-value' };
      
      await vault.storeSecret(
        testUser.id,
        'audit-test',
        secretData,
        'api_key'
      );

      // Access the secret
      await vault.getSecret(testUser.id, 'audit-test');

      // Check audit logs
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userId: testUser.id,
          resource: 'SECRET',
          resourceId: expect.any(String)
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      
      // Should have SECRET_CREATED and SECRET_ACCESSED events
      const actions = auditLogs.map(log => log.action);
      expect(actions).toContain('SECRET_CREATED');
      expect(actions).toContain('SECRET_ACCESSED');
    });
  });
}); 