process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-32-characters-long';

import { logError, logInfo } from '../../../../src/utils/logger';
import { prisma } from '../../../../lib/database/client';
import { createTestSuite, createTestUser } from '../../../helpers/testUtils';
import { Role } from '../../../../src/generated/prisma';
import bcrypt from 'bcryptjs';
import { createCommonTestData } from '../../../helpers/createTestData';

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

  beforeEach(async () => {
    // Recreate test data after global setup truncates tables
    const testData = await createCommonTestData();
    testUser = testData.user;
    
    // Initialize vault for this test
    vault = new SecretsVault(prisma);
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
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      
      // Ensure at least one log has a string resourceId
      expect(auditLogs.some(log => typeof log.resourceId === 'string')).toBe(true);
      
      // Should have SECRET_CREATED and SECRET_ACCESSED events
      const actions = auditLogs.map(log => log.action);
      expect(actions).toContain('SECRET_CREATED');
      expect(actions).toContain('SECRET_ACCESSED');
    });
  });
}); 