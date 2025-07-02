import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { prisma } from '../../../lib/database/client';
import { ApplicationError } from '../../../src/middleware/errorHandler';
import { emailService } from '../../../src/lib/services/emailService';
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
          message: 'If an account with this email exists, a verification email has been sent.'
        }
      });
    }

    // Check if user is already verified
    if (user.isActive) {
      return res.status(200).json({
        success: true,
        data: {
          message: 'This account is already verified. You can sign in normally.'
        }
      });
    }

    // Delete any existing verification tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { email: email.toLowerCase() }
    });

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new verification token
    await prisma.verificationToken.create({
      data: {
        email: email.toLowerCase(),
        token: verificationToken,
        expiresAt
      }
    });

    // Send verification email
    try {
      const emailSent = await emailService.sendVerificationEmail(
        email.toLowerCase(),
        verificationToken,
        user.name
      );

      if (!emailSent) {
        throw new Error('EMAIL_SEND_FAILED');
      }
    } catch (emailError) {
      // Clean up token if email fails
      await prisma.verificationToken.delete({
        where: { token: verificationToken }
      });
      
      logError('Email service failed during resend verification', emailError as Error, {
        userId: user.id,
        email: email.toLowerCase()
      });
      
      throw new ApplicationError('Failed to send verification email', 500, 'EMAIL_SEND_FAILED');
    }

    // Log the resend attempt
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'RESEND_VERIFICATION',
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

    logInfo('Verification email resent', {
      userId: user.id,
      email: email.toLowerCase()
    });

    // Return success response
    res.status(200).json({
      success: true,
      data: {
        message: 'Verification email sent successfully. Please check your inbox.'
      }
    });

  } catch (error) {
    logError('Resend verification failed', error as Error, {
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