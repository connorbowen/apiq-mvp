import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import { PrismaClient } from '../../../src/generated/prisma';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';
import { mockEmailService } from '../../helpers/emailMock';

// Import handlers
const registerHandler = require('../../../pages/api/auth/register').default;
const verifyHandler = require('../../../pages/api/auth/verify').default;
const resendVerificationHandler = require('../../../pages/api/auth/resend-verification').default;

const prisma = new PrismaClient();

describe('User Registration Integration Tests', () => {
  let testUser: any;

  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test data
    if (testUser) {
      await cleanupTestUser(testUser);
    }
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
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

      // Verify verification token was created
      const verificationToken = await prisma.verificationToken.findFirst({
        where: { email: testEmail }
      });
      expect(verificationToken).toBeDefined();
      expect(verificationToken?.email).toBe(testEmail);

      // Verify email was sent
      const sentEmails = mockEmailService.getEmailsTo(testEmail);
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].subject).toBe('Verify your APIQ account');
      expect(sentEmails[0].html).toContain(verificationToken!.token);
      expect(sentEmails[0].text).toContain(verificationToken!.token);

      // Clean up
      await prisma.verificationToken.deleteMany({
        where: { email: testEmail }
      });
      await prisma.user.delete({
        where: { email: testEmail }
      });
    });

    it('should reject registration with invalid email', async () => {
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
      // Create a test user first
      testUser = await createTestUser(
        `test-existing-${generateTestId()}@example.com`,
        'testpass123',
        'USER',
        'Existing User'
      );

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: testUser.email,
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
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET'
      });

      await registerHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Method not allowed');
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should verify email with valid token', async () => {
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

      const verificationToken = await prisma.verificationToken.create({
        data: {
          email: testEmail,
          token: 'test-verification-token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        }
      });

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

      // Clean up
      await prisma.user.delete({
        where: { id: user.id }
      });
    });

    it('should reject invalid verification token', async () => {
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

      const expiredToken = await prisma.verificationToken.create({
        data: {
          email: testEmail,
          token: 'expired-token',
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        }
      });

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

      // Clean up
      await prisma.user.delete({
        where: { id: user.id }
      });
    });

    it('should reject missing token', async () => {
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

      // Verify email was sent
      const sentEmails = mockEmailService.getEmailsTo(testEmail);
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].subject).toBe('Verify your APIQ account');
      expect(sentEmails[0].html).toContain(verificationToken!.token);
      expect(sentEmails[0].text).toContain(verificationToken!.token);

      // Clean up
      await prisma.verificationToken.deleteMany({
        where: { email: testEmail }
      });
      await prisma.user.delete({
        where: { id: user.id }
      });
    });

    it('should handle non-existent user gracefully', async () => {
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

      // Clean up
      await prisma.user.delete({
        where: { id: user.id }
      });
    });

    it('should reject invalid email format', async () => {
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
  });
}); 