import request from 'supertest';
import { createServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import profileHandler from '../../../../pages/api/profile/index';
import passwordHandler from '../../../../pages/api/profile/password';
import { prisma } from '../../../../src/lib/singletons/prisma';
import bcrypt from 'bcryptjs';

// Mock the auth middleware
jest.mock('../../../../src/lib/auth/session', () => ({
  requireAuth: jest.fn(),
}));

const { requireAuth } = require('../../../../src/lib/auth/session');

describe('Profile API Integration Tests', () => {
  let server: any;
  let mockUser: any;

  beforeAll(async () => {
    // Create test server
    server = createServer(async (req: any, res: any) => {
      const url = req.url;
      
      if (url?.startsWith('/api/profile/password')) {
        await passwordHandler(req as NextApiRequest, res as NextApiResponse);
      } else if (url?.startsWith('/api/profile')) {
        await profileHandler(req as NextApiRequest, res as NextApiResponse);
      } else {
        res.statusCode = 404;
        res.end('Not found');
      }
    });

    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 12);
    mockUser = await prisma.user.create({
      data: {
        email: 'profile-test@example.com',
        name: 'Profile Test User',
        password: hashedPassword,
        firstName: 'Profile',
        lastName: 'Test',
        timezone: 'UTC',
        language: 'en',
        emailVerified: true,
        notificationsEnabled: true,
        marketingEmailsEnabled: false,
        provider: 'credentials',
      },
    });
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.delete({
      where: { id: mockUser.id },
    });
    
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/profile', () => {
    it('should return user profile when authenticated', async () => {
      requireAuth.mockResolvedValue(mockUser);

      const response = await request(server)
        .get('/api/profile')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.profile).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        timezone: mockUser.timezone,
        language: mockUser.language,
        emailVerified: mockUser.emailVerified,
        notificationsEnabled: mockUser.notificationsEnabled,
        marketingEmailsEnabled: mockUser.marketingEmailsEnabled,
        role: mockUser.role,
        provider: mockUser.provider,
      });
    });

    it('should return 401 when not authenticated', async () => {
      requireAuth.mockResolvedValue(null);

      await request(server)
        .get('/api/profile')
        .expect(401);
    });

    it('should return 404 when user not found', async () => {
      requireAuth.mockResolvedValue({ id: 'non-existent-user' });

      await request(server)
        .get('/api/profile')
        .expect(404);
    });
  });

  describe('PUT /api/profile', () => {
    it('should update user profile successfully', async () => {
      requireAuth.mockResolvedValue(mockUser);

      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        timezone: 'America/New_York',
        language: 'es',
        notificationsEnabled: false,
        marketingEmailsEnabled: true,
      };

      const response = await request(server)
        .put('/api/profile')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.profile).toMatchObject({
        firstName: 'Updated',
        lastName: 'Name',
        timezone: 'America/New_York',
        language: 'es',
        notificationsEnabled: false,
        marketingEmailsEnabled: true,
      });

      // Verify audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: mockUser.id,
          action: 'PROFILE_UPDATED',
        },
      });
      expect(auditLog).toBeTruthy();
      expect(auditLog?.details).toMatchObject({
        updatedFields: ['firstName', 'lastName', 'timezone', 'language', 'notificationsEnabled', 'marketingEmailsEnabled'],
      });
    });

    it('should validate firstName length', async () => {
      requireAuth.mockResolvedValue(mockUser);

      const updateData = {
        firstName: 'a'.repeat(51), // Too long
      };

      const response = await request(server)
        .put('/api/profile')
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('First name must be a string with maximum 50 characters');
    });

    it('should validate lastName length', async () => {
      requireAuth.mockResolvedValue(mockUser);

      const updateData = {
        lastName: 'a'.repeat(51), // Too long
      };

      const response = await request(server)
        .put('/api/profile')
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Last name must be a string with maximum 50 characters');
    });

    it('should validate timezone type', async () => {
      requireAuth.mockResolvedValue(mockUser);

      const updateData = {
        timezone: 123, // Invalid type
      };

      const response = await request(server)
        .put('/api/profile')
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Timezone must be a string');
    });

    it('should validate language type', async () => {
      requireAuth.mockResolvedValue(mockUser);

      const updateData = {
        language: 123, // Invalid type
      };

      const response = await request(server)
        .put('/api/profile')
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Language must be a string');
    });

    it('should validate notificationsEnabled type', async () => {
      requireAuth.mockResolvedValue(mockUser);

      const updateData = {
        notificationsEnabled: 'not-a-boolean', // Invalid type
      };

      const response = await request(server)
        .put('/api/profile')
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Notifications enabled must be a boolean');
    });

    it('should validate marketingEmailsEnabled type', async () => {
      requireAuth.mockResolvedValue(mockUser);

      const updateData = {
        marketingEmailsEnabled: 'not-a-boolean', // Invalid type
      };

      const response = await request(server)
        .put('/api/profile')
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Marketing emails enabled must be a boolean');
    });

    it('should return 401 when not authenticated', async () => {
      requireAuth.mockResolvedValue(null);

      await request(server)
        .put('/api/profile')
        .send({ firstName: 'Test' })
        .expect(401);
    });
  });

  describe('PUT /api/profile/password', () => {
    it('should change password successfully', async () => {
      requireAuth.mockResolvedValue(mockUser);

      const passwordData = {
        currentPassword: 'testpassword123',
        newPassword: 'NewPassword123',
      };

      const response = await request(server)
        .put('/api/profile/password')
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');

      // Verify audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: mockUser.id,
          action: 'PASSWORD_CHANGED',
        },
      });
      expect(auditLog).toBeTruthy();
    });

    it('should validate current password is required', async () => {
      requireAuth.mockResolvedValue(mockUser);

      const passwordData = {
        newPassword: 'NewPassword123',
      };

      const response = await request(server)
        .put('/api/profile/password')
        .send(passwordData)
        .expect(400);

      expect(response.body.error).toBe('Current password is required');
    });

    it('should validate new password is required', async () => {
      requireAuth.mockResolvedValue(mockUser);

      const passwordData = {
        currentPassword: 'testpassword123',
      };

      const response = await request(server)
        .put('/api/profile/password')
        .send(passwordData)
        .expect(400);

      expect(response.body.error).toBe('New password is required');
    });

    it('should validate new password minimum length', async () => {
      requireAuth.mockResolvedValue(mockUser);

      const passwordData = {
        currentPassword: 'testpassword123',
        newPassword: 'short',
      };

      const response = await request(server)
        .put('/api/profile/password')
        .send(passwordData)
        .expect(400);

      expect(response.body.error).toBe('New password must be at least 8 characters long');
    });

    it('should validate new password maximum length', async () => {
      requireAuth.mockResolvedValue(mockUser);

      const passwordData = {
        currentPassword: 'testpassword123',
        newPassword: 'a'.repeat(129), // Too long
      };

      const response = await request(server)
        .put('/api/profile/password')
        .send(passwordData)
        .expect(400);

      expect(response.body.error).toBe('New password must be less than 128 characters');
    });

    it('should validate current password is correct', async () => {
      requireAuth.mockResolvedValue(mockUser);

      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'NewPassword123',
      };

      const response = await request(server)
        .put('/api/profile/password')
        .send(passwordData)
        .expect(400);

      expect(response.body.error).toBe('Current password is incorrect');
    });

    it('should prevent password change for SSO accounts', async () => {
      const ssoUser = { ...mockUser, provider: 'google' };
      requireAuth.mockResolvedValue(ssoUser);

      const passwordData = {
        currentPassword: 'testpassword123',
        newPassword: 'NewPassword123',
      };

      const response = await request(server)
        .put('/api/profile/password')
        .send(passwordData)
        .expect(400);

      expect(response.body.error).toBe('Password cannot be changed for SSO accounts');
    });

    it('should return 401 when not authenticated', async () => {
      requireAuth.mockResolvedValue(null);

      await request(server)
        .put('/api/profile/password')
        .send({
          currentPassword: 'testpassword123',
          newPassword: 'NewPassword123',
        })
        .expect(401);
    });

    it('should return 405 for unsupported methods', async () => {
      requireAuth.mockResolvedValue(mockUser);

      await request(server)
        .get('/api/profile/password')
        .expect(405);

      await request(server)
        .post('/api/profile/password')
        .expect(405);

      await request(server)
        .delete('/api/profile/password')
        .expect(405);
    });
  });
}); 