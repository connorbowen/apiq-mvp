/**
 * registration.test.ts – robust guaranteed mock for all registration flows
 */
import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import { prisma } from '../../../lib/database/client';
import { createTestUser, cleanupTestUsers, generateTestId } from '../../helpers/testUtils';
import type { TestUser } from '../../helpers/testUtils';

describe('User Registration Integration Tests', () => {
  let sendEmailSpy: jest.Mock;
  let createdUserIds: string[] = [];
  let createdVerificationTokens: string[] = [];
  let testUser: TestUser;

  beforeEach(() => {
    jest.resetModules();
    sendEmailSpy = jest.fn().mockResolvedValue(true);
    jest.doMock(
      '../../../src/lib/services/emailService',
      () => ({
        emailService: {
          sendVerificationEmail: sendEmailSpy,
        },
      }),
      { virtual: false },
    );
  });

  afterEach(async () => {
    await prisma.verificationToken.deleteMany({
      where: { token: { in: createdVerificationTokens } },
    });
    await cleanupTestUsers(createdUserIds);
    createdUserIds = [];
    createdVerificationTokens = [];
    jest.dontMock('../../../src/lib/services/emailService');
  });

  beforeEach(async () => {
    // Create a fresh test user for each test (if needed)
    testUser = await createTestUser();
    createdUserIds.push(testUser.id);
  });

  describe('POST /api/auth/register', () => {
    // We'll re-create this spy in every test, so declare outside.
    let sendEmailSpy: jest.Mock;

    beforeEach(() => {
      // Make sure we start each test with a clean module graph
      jest.resetModules();

      // Create a fresh spy for this test
      sendEmailSpy = jest.fn().mockResolvedValue(true);

      // Register the module mock *before* the handler is imported
      jest.doMock(
        '../../../src/lib/services/emailService',
        () => ({
          // Exact export signature the real module provides
          emailService: {
            sendVerificationEmail: sendEmailSpy,
          },
        }),
        { virtual: false }, // not a virtual file – we're replacing a real one
      );
    });

    afterEach(() => {
      // Remove the mock so the next test can set up its own version
      jest.dontMock('../../../src/lib/services/emailService');
    });

    it('should register a new user successfully', async () => {
      const registerHandler = require('../../../pages/api/auth/register').default;
      const testEmail = `test-register-${generateTestId()}@example.com`;
      const testName = 'Test User';
      const testPassword = 'testpass123';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: testEmail,
          name: testName,
          password: testPassword
        }
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('Registration successful');
      expect(data.data.userId).toBeDefined();

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: testEmail }
      });
      expect(user).toBeDefined();
      expect(user?.email).toBe(testEmail);
      expect(user?.name).toBe(testName);
      expect(user?.isActive).toBe(false); // Should be inactive until email verification

      // Track the created user for cleanup
      if (user) {
        createdUserIds.push(user.id);
      }

      // Verify verification token was created
      const verificationToken = await prisma.verificationToken.findFirst({
        where: { email: testEmail }
      });
      expect(verificationToken).toBeDefined();
      expect(verificationToken?.email).toBe(testEmail);

      // Track the verification token for cleanup
      if (verificationToken) {
        createdVerificationTokens.push(verificationToken.token);
      }

      // Verify email was sent (using the mocked service)
      expect(sendEmailSpy).toHaveBeenCalledWith(
        testEmail,
        verificationToken!.token,
        testName
      );
    });

    it('should reject registration with invalid email', async () => {
      const registerHandler = require('../../../pages/api/auth/register').default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'invalid-email',
          name: 'Test User',
          password: 'testpass123'
        }
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid email format');
    });

    it('should reject registration with weak password', async () => {
      const registerHandler = require('../../../pages/api/auth/register').default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'test@example.com',
          name: 'Test User',
          password: '123'
        }
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Password must be at least 8 characters long');
    });

    it('should reject registration with missing fields', async () => {
      const registerHandler = require('../../../pages/api/auth/register').default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'test@example.com'
          // Missing name and password
        }
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Email, name, and password are required');
    });

    it('should reject registration with existing email', async () => {
      const registerHandler = require('../../../pages/api/auth/register').default;
      // Create a test user first
      const existingUser = await createTestUser(
        `test-existing-${generateTestId()}@example.com`,
        'testpass123',
        'USER',
        'Existing User'
      );
      createdUserIds.push(existingUser.id);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: existingUser.email,
          name: 'New User',
          password: 'testpass123'
        }
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(409);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('User with this email already exists');
    });

    it('should reject wrong HTTP method', async () => {
      const registerHandler = require('../../../pages/api/auth/register').default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET'
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Method not allowed');
    });

    it('500 ➟ email service throws', async () => {
      sendEmailSpy.mockRejectedValueOnce(new Error('SMTP down'));
      const registerHandler = require('../../../pages/api/auth/register').default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { email: `user+iso2-${generateTestId()}@example.com`, name: 'User Iso2', password: 'Password123!' },
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(res._getJSONData()).toMatchObject({
        error: 'Failed to send verification email',
      });
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should verify email with valid token', async () => {
      const verifyHandler = require('../../../pages/api/auth/verify').default;
      // Create a test user and verification token
      const testEmail = `test-verify-${generateTestId()}@example.com`;
      const testName = 'Test User';
      const testPassword = 'testpass123';

      const user = await prisma.user.create({
        data: {
          email: testEmail,
          name: testName,
          password: 'hashedpassword',
          isActive: false
        }
      });
      createdUserIds.push(user.id);

      const verificationToken = await prisma.verificationToken.create({
        data: {
          email: testEmail,
          token: `test-verification-token-${generateTestId()}`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        }
      });
      createdVerificationTokens.push(verificationToken.token);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          token: verificationToken.token
        }
      });

      await verifyHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('Email verified successfully');

      // Verify user is now active
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id }
      });
      expect(updatedUser?.isActive).toBe(true);

      // Verify token was deleted
      const deletedToken = await prisma.verificationToken.findUnique({
        where: { token: verificationToken.token }
      });
      expect(deletedToken).toBeNull();
    });

    it('should reject invalid verification token', async () => {
      const verifyHandler = require('../../../pages/api/auth/verify').default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          token: 'invalid-token'
        }
      });

      await verifyHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid verification token');
    });

    it('should reject expired verification token', async () => {
      const verifyHandler = require('../../../pages/api/auth/verify').default;
      // Create a test user and expired verification token
      const testEmail = `test-expired-${generateTestId()}@example.com`;
      const testName = 'Test User';

      const user = await prisma.user.create({
        data: {
          email: testEmail,
          name: testName,
          password: 'hashedpassword',
          isActive: false
        }
      });
      createdUserIds.push(user.id);

      const expiredToken = await prisma.verificationToken.create({
        data: {
          email: testEmail,
          token: `expired-token-${generateTestId()}`,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        }
      });
      createdVerificationTokens.push(expiredToken.token);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          token: expiredToken.token
        }
      });

      await verifyHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Verification token has expired');

      // Verify token was deleted
      const deletedToken = await prisma.verificationToken.findUnique({
        where: { token: expiredToken.token }
      });
      expect(deletedToken).toBeNull();
    });

    it('should reject missing token', async () => {
      const verifyHandler = require('../../../pages/api/auth/verify').default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {}
      });

      await verifyHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Verification token is required');
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('should resend verification email for unverified user', async () => {
      const resendVerificationHandler = require('../../../pages/api/auth/resend-verification').default;
      // Create a test user without verification token
      const testEmail = `test-resend-${generateTestId()}@example.com`;
      const testName = 'Test User';

      const user = await prisma.user.create({
        data: {
          email: testEmail,
          name: testName,
          password: 'hashedpassword',
          isActive: false
        }
      });
      createdUserIds.push(user.id);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: testEmail
        }
      });

      await resendVerificationHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('Verification email sent successfully');

      // Verify new verification token was created
      const verificationToken = await prisma.verificationToken.findFirst({
        where: { email: testEmail }
      });
      expect(verificationToken).toBeDefined();

      // Track the verification token for cleanup
      if (verificationToken) {
        createdVerificationTokens.push(verificationToken.token);
      }

      // Verify email was sent (using the mocked service)
      expect(sendEmailSpy).toHaveBeenCalledWith(
        testEmail,
        verificationToken!.token,
        testName
      );
    });

    it('should handle non-existent user gracefully', async () => {
      const resendVerificationHandler = require('../../../pages/api/auth/resend-verification').default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'nonexistent@example.com'
        }
      });

      await resendVerificationHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('If an account with this email exists');
    });

    it('should handle already verified user', async () => {
      const resendVerificationHandler = require('../../../pages/api/auth/resend-verification').default;
      // Create a verified test user
      const testEmail = `test-verified-${generateTestId()}@example.com`;
      const testName = 'Test User';

      const user = await prisma.user.create({
        data: {
          email: testEmail,
          name: testName,
          password: 'hashedpassword',
          isActive: true
        }
      });
      createdUserIds.push(user.id);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: testEmail
        }
      });

      await resendVerificationHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.message).toContain('This account is already verified');
    });

    it('should reject invalid email format', async () => {
      const resendVerificationHandler = require('../../../pages/api/auth/resend-verification').default;
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'invalid-email'
        }
      });

      await resendVerificationHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid email format');
    });

    it('500 ➟ email service throws', async () => {
      sendEmailSpy.mockRejectedValueOnce(new Error('SMTP down'));
      const resendVerificationHandler = require('../../../pages/api/auth/resend-verification').default;
      
      // Create a test user first so the resend-verification can find it
      const testEmail = `user+iso2-${generateTestId()}@example.com`;
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          name: 'User Iso2',
          password: 'hashedpassword',
          isActive: false
        }
      });
      createdUserIds.push(user.id);
      
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: { email: testEmail },
      });

      await resendVerificationHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(res._getJSONData()).toMatchObject({
        error: 'Failed to send verification email',
      });
    });
  });
}); 