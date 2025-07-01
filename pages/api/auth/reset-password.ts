import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { PrismaClient } from '../../../src/generated/prisma';
import { ApplicationError } from '../../../src/middleware/errorHandler';
import { emailService } from '../../../src/lib/services/emailService';
import { logInfo, logError } from '../../../src/utils/logger';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      throw new ApplicationError('Email is required', 400, 'MISSING_EMAIL');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ApplicationError('Invalid email format', 400, 'INVALID_EMAIL');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        success: true,
        data: {
          message: 'If an account with this email exists, a password reset email has been sent.'
        }
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(200).json({
        success: true,
        data: {
          message: 'If an account with this email exists, a password reset email has been sent.'
        }
      });
    }

    // Delete any existing password reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { email: email.toLowerCase() }
    });

    // Generate new password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Create new password reset token
    await prisma.passwordResetToken.create({
      data: {
        email: email.toLowerCase(),
        token: resetToken,
        expiresAt
      }
    });

    // Send password reset email
    const emailSent = await emailService.sendPasswordResetEmail(
      email.toLowerCase(),
      resetToken,
      user.name
    );

    if (!emailSent) {
      // Clean up token if email fails
      await prisma.passwordResetToken.delete({
        where: { token: resetToken }
      });
      
      throw new ApplicationError('Failed to send password reset email', 500, 'EMAIL_SEND_FAILED');
    }

    // Log the password reset request
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REQUEST_PASSWORD_RESET',
        resource: 'USER',
        resourceId: user.id,
        details: {
          email: email.toLowerCase(),
          emailSent: true
        },
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    });

    logInfo('Password reset email sent', {
      userId: user.id,
      email: email.toLowerCase()
    });

    // Return success response
    res.status(200).json({
      success: true,
      data: {
        message: 'Password reset email sent successfully. Please check your inbox.'
      }
    });

  } catch (error) {
    logError('Password reset request failed', error as Error, {
      email: req.body?.email
    });

    if (error instanceof ApplicationError) {
      return res.status(error.statusCode).json({
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