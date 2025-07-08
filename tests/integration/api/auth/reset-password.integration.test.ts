import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/auth/reset-password';
import { prisma } from '../../../../lib/database/client';
import { truncateTestTables, cleanupTestData } from '../../../helpers/testIsolation';
import { createTestUser, generateTestId } from '../../../helpers/testUtils';
import bcrypt from 'bcryptjs';

// Test constants - centralized to avoid magic values
const TEST_CONSTANTS = {
  PASSWORD_MIN_LENGTH: 8,
  TOKEN_EXPIRY_HOURS: 1,
  TEST_PASSWORD: 'SecureTestPassword123!',
  NEW_PASSWORD: 'NewSecurePassword456!',
  WEAK_PASSWORD: '123',
} as const;

describe('Password Reset API Integration Tests', () => {
  let testUser: any;
  let resetToken: any;

  beforeAll(async () => {
    await truncateTestTables();
  });

  beforeEach(async () => {
    // Create test user with dynamic data
    testUser = await createTestUser();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await truncateTestTables();
  });

  describe('POST /api/auth/reset-password - Request Reset', () => {
    it('should request password reset successfully', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: testUser.email
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('Password reset email sent successfully');

      // Verify token was created in database
      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { email: testUser.email }
      });
      expect(tokenRecord).toBeTruthy();
      expect(tokenRecord?.expiresAt).toBeInstanceOf(Date);
      expect(tokenRecord?.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Verify audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: { 
          userId: testUser.id,
          action: 'REQUEST_PASSWORD_RESET'
        }
      });
      expect(auditLog).toBeTruthy();
    });

    it('should handle non-existent user gracefully', async () => {
      const nonExistentEmail = `nonexistent-${generateTestId()}@example.com`;
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: nonExistentEmail
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('If an account with this email exists');

      // Verify no token was created for non-existent user
      const tokenRecord = await prisma.passwordResetToken.findFirst({
        where: { email: nonExistentEmail }
      });
      expect(tokenRecord).toBeNull();
    });

    it('should handle invalid email format', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'invalid-email-format'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid email format');
    });

    it('should handle missing email', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {}
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid request');
    });
  });

  describe('POST /api/auth/reset-password - Reset Password', () => {
    beforeEach(async () => {
      // Create a valid reset token for testing
      const tokenValue = `valid-token-${generateTestId()}`;
      resetToken = await prisma.passwordResetToken.create({
        data: {
          email: testUser.email,
          token: tokenValue,
          expiresAt: new Date(Date.now() + TEST_CONSTANTS.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
        }
      });
    });

    it('should reset password successfully with valid token', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          token: resetToken.token,
          password: TEST_CONSTANTS.NEW_PASSWORD
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Password reset successfully');

      // Verify password was updated in database
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(updatedUser).toBeTruthy();
      
      // Verify new password works
      const isPasswordValid = await bcrypt.compare(TEST_CONSTANTS.NEW_PASSWORD, updatedUser!.password);
      expect(isPasswordValid).toBe(true);

      // Verify old password no longer works
      const isOldPasswordValid = await bcrypt.compare(testUser.password, updatedUser!.password);
      expect(isOldPasswordValid).toBe(false);

      // Verify token was deleted
      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { token: resetToken.token }
      });
      expect(tokenRecord).toBeNull();

      // Verify audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: { 
          userId: testUser.id,
          action: 'PASSWORD_RESET'
        }
      });
      expect(auditLog).toBeTruthy();
    });

    it('should handle invalid token', async () => {
      const invalidToken = `invalid-token-${generateTestId()}`;
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          token: invalidToken,
          password: TEST_CONSTANTS.NEW_PASSWORD
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid or expired reset token');
    });

    it('should handle expired token and clean up', async () => {
      // Create expired token
      const expiredTokenValue = `expired-token-${generateTestId()}`;
      const expiredToken = await prisma.passwordResetToken.create({
        data: {
          email: testUser.email,
          token: expiredTokenValue,
          expiresAt: new Date(Date.now() - TEST_CONSTANTS.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000) // 1 hour ago
        }
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          token: expiredToken.token,
          password: TEST_CONSTANTS.NEW_PASSWORD
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Reset token has expired');

      // Verify expired token was cleaned up
      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { token: expiredToken.token }
      });
      expect(tokenRecord).toBeNull();
    });

    it('should handle weak password', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          token: resetToken.token,
          password: TEST_CONSTANTS.WEAK_PASSWORD
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain(`Password must be at least ${TEST_CONSTANTS.PASSWORD_MIN_LENGTH} characters long`);
    });

    it('should handle missing password', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          token: resetToken.token
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Password is required');
    });

    it('should handle missing token', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: TEST_CONSTANTS.NEW_PASSWORD
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Reset token is required');
    });
  });

  describe('POST /api/auth/reset-password - Invalid Requests', () => {
    it('should handle providing both email and token', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: testUser.email,
          token: `token-${generateTestId()}`,
          password: TEST_CONSTANTS.NEW_PASSWORD
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid request');
    });

    it('should handle providing email and password without token', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: testUser.email,
          password: TEST_CONSTANTS.NEW_PASSWORD
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid request');
    });
  });

  describe('POST /api/auth/reset-password - Expired Token Cleanup', () => {
    it('should delete expired token and return error', async () => {
      // Create a test user for this specific test
      const expiredTestUser = await createTestUser();
      
      // Create an expired token
      const expiredTokenValue = `expired-cleanup-${generateTestId()}`;
      await prisma.passwordResetToken.create({
        data: {
          email: expiredTestUser.email,
          token: expiredTokenValue,
          expiresAt: new Date(Date.now() - TEST_CONSTANTS.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000), // 1 hour ago
        },
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { 
          token: expiredTokenValue, 
          password: TEST_CONSTANTS.NEW_PASSWORD 
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('expired');

      // Verify token was deleted from database
      const tokenInDb = await prisma.passwordResetToken.findUnique({ 
        where: { token: expiredTokenValue } 
      });
      expect(tokenInDb).toBeNull();
    });
  });
}); 