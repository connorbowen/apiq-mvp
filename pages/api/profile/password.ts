import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../src/lib/auth/session';
import { prisma } from '../../../src/lib/singletons/prisma';
import { ApplicationError } from '../../../src/lib/errors/ApplicationError';
import logger from '../../../src/utils/logger';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    if (req.method !== 'PUT') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    return await changePassword(req, res, user);
  } catch (error) {
    logger.error('Password change API error:', error);
    if (error instanceof ApplicationError) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function changePassword(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || typeof currentPassword !== 'string') {
      throw new ApplicationError('Current password is required', 400);
    }

    if (!newPassword || typeof newPassword !== 'string') {
      throw new ApplicationError('New password is required', 400);
    }

    if (newPassword.length < 8) {
      throw new ApplicationError('New password must be at least 8 characters long', 400);
    }

    if (newPassword.length > 128) {
      throw new ApplicationError('New password must be less than 128 characters', 400);
    }

    // Get current user with password
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        password: true,
        provider: true,
      },
    });

    if (!currentUser) {
      throw new ApplicationError('User not found', 404);
    }

    // Check if user is using SSO
    if (currentUser.provider && currentUser.provider !== 'credentials') {
      throw new ApplicationError('Password cannot be changed for SSO accounts', 400);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
    if (!isCurrentPasswordValid) {
      throw new ApplicationError('Current password is incorrect', 400);
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    });

    // Log password change
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_CHANGED',
        resource: 'USER',
        resourceId: user.id,
        details: {
          changedAt: new Date().toISOString(),
        },
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Change password error:', error);
    if (error instanceof ApplicationError) {
      throw error;
    }
    throw new ApplicationError('Failed to change password', 500);
  }
} 