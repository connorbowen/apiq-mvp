import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../src/lib/singletons/prisma';
import { ApplicationError, badRequest, notFound } from '../../../src/lib/errors/ApplicationError';
import { logInfo, logError } from '../../../src/utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { token } = req.body;

    // Validate token parameter
    if (!token) {
      throw badRequest('Reset token is required', 'MISSING_TOKEN');
    }

    // Find password reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    });

    if (!resetToken) {
      throw badRequest('Invalid or expired reset token', 'INVALID_TOKEN');
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({
        where: { token }
      });
      
      throw badRequest('Reset token has expired', 'EXPIRED_TOKEN');
    }

    // Find user by email to ensure user still exists
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email }
    });

    if (!user) {
      // Clean up orphaned token
      await prisma.passwordResetToken.delete({
        where: { token }
      });
      
      throw notFound('User not found', 'USER_NOT_FOUND');
    }

    // Log the token validation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'VALIDATE_RESET_TOKEN',
        resource: 'USER',
        resourceId: user.id,
        details: {
          email: resetToken.email,
          tokenValid: true
        },
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    });

    logInfo('Password reset token validated', {
      userId: user.id,
      email: resetToken.email
    });

    // Return success response
    res.status(200).json({
      success: true,
      data: {
        message: 'Token is valid',
        email: resetToken.email,
        expiresAt: resetToken.expiresAt
      }
    });

  } catch (error) {
    logError('Password reset token validation failed', error as Error, {
      token: req.body?.token ? 'present' : 'missing'
    });

    if (error instanceof ApplicationError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
} 