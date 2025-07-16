import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../src/lib/auth/session';
import { prisma } from '../../../src/lib/singletons/prisma';
import { ApplicationError } from '../../../src/lib/errors/ApplicationError';
import logger from '../../../src/utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    switch (req.method) {
      case 'GET':
        return await getProfile(req, res, user);
      case 'PUT':
        return await updateProfile(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    logger.error('Profile API error:', error);
    if (error instanceof ApplicationError) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getProfile(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    // Get user profile with sensitive fields excluded
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        avatar: true,
        timezone: true,
        language: true,
        emailVerified: true,
        emailVerifiedAt: true,
        notificationsEnabled: true,
        marketingEmailsEnabled: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        provider: true,
      },
    });

    if (!profile) {
      throw new ApplicationError('User not found', 404);
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    if (error instanceof ApplicationError) {
      throw error;
    }
    throw new ApplicationError('Failed to retrieve profile', 500);
  }
}

async function updateProfile(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const {
      firstName,
      lastName,
      timezone,
      language,
      notificationsEnabled,
      marketingEmailsEnabled,
    } = req.body;

    // Validate input
    if (firstName !== undefined && (typeof firstName !== 'string' || firstName.length > 50)) {
      throw new ApplicationError('First name must be a string with maximum 50 characters', 400);
    }

    if (lastName !== undefined && (typeof lastName !== 'string' || lastName.length > 50)) {
      throw new ApplicationError('Last name must be a string with maximum 50 characters', 400);
    }

    if (timezone !== undefined && typeof timezone !== 'string') {
      throw new ApplicationError('Timezone must be a string', 400);
    }

    if (language !== undefined && typeof language !== 'string') {
      throw new ApplicationError('Language must be a string', 400);
    }

    if (notificationsEnabled !== undefined && typeof notificationsEnabled !== 'boolean') {
      throw new ApplicationError('Notifications enabled must be a boolean', 400);
    }

    if (marketingEmailsEnabled !== undefined && typeof marketingEmailsEnabled !== 'boolean') {
      throw new ApplicationError('Marketing emails enabled must be a boolean', 400);
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(timezone !== undefined && { timezone }),
        ...(language !== undefined && { language }),
        ...(notificationsEnabled !== undefined && { notificationsEnabled }),
        ...(marketingEmailsEnabled !== undefined && { marketingEmailsEnabled }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        avatar: true,
        timezone: true,
        language: true,
        emailVerified: true,
        emailVerifiedAt: true,
        notificationsEnabled: true,
        marketingEmailsEnabled: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        provider: true,
      },
    });

    // Log profile update
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PROFILE_UPDATED',
        resource: 'USER',
        resourceId: user.id,
        details: {
          updatedFields: Object.keys(req.body).filter(key => req.body[key] !== undefined),
        },
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedUser,
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    if (error instanceof ApplicationError) {
      throw error;
    }
    throw new ApplicationError('Failed to update profile', 500);
  }
} 