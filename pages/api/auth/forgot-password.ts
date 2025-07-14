import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { prisma } from '../../../src/lib/singletons/prisma';
import { EmailService } from '../../../src/lib/services/emailService';
import { ApplicationError, badRequest, tooManyRequests, internalServerError } from '../../../src/lib/errors/ApplicationError';
import { logInfo, logError } from '../../../src/utils/logger';

// Simple in-memory rate limiting (in production, use Redis)
export const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 3; // 3 requests per 15 minutes

// Function to check if we're in a test environment
function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || 
         process.env.NODE_ENV === 'development' ||
         process.env.TEST_MODE === 'true' ||
         process.env.PLAYWRIGHT_TEST === 'true';
}

// Function to check if rate limiting should be enabled
function shouldEnableRateLimiting(): boolean {
  // If explicitly disabled for fast testing, disable it
  if (process.env.DISABLE_RATE_LIMITING === 'true') {
    return false;
  }
  
  // In test environment, disable rate limiting for faster test execution
  if (isTestEnvironment()) {
    return false;
  }
  
  // Otherwise, always enable rate limiting (default secure behavior)
  return true;
}

// Function to clear rate limit stores (useful for testing)
function clearRateLimitStores() {
  if (isTestEnvironment()) {
    rateLimitStore.clear();
  }
}

function checkRateLimit(key: string): boolean {
  // Check if rate limiting should be enabled
  if (!shouldEnableRateLimiting()) {
    return true; // Always allow when rate limiting is disabled
  }
  
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Clear rate limit stores ONLY if rate limiting is DISABLED (i.e., in fast mode)
  if (!shouldEnableRateLimiting()) {
    await clearRateLimitStores();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { email } = req.body;

    if (!email) {
      throw badRequest('Email is required', 'MISSING_EMAIL');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw badRequest('Invalid email format', 'INVALID_EMAIL');
    }

    // Check rate limit for password reset requests (if enabled)
    if (shouldEnableRateLimiting()) {
      const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
      const rateLimitKey = `password_reset:${ipAddress}`;
      if (!checkRateLimit(rateLimitKey)) {
        throw tooManyRequests('Too many password reset requests. Please try again later.', 'RATE_LIMIT_EXCEEDED');
      }
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
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        success: true,
        data: {
          message: 'If an account with this email exists, a password reset email has been sent.'
        }
      });
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { email: user.email }
    });

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token in database
    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token: resetToken,
        expiresAt: resetTokenExpiry
      }
    });

    // Create audit log for password reset request
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REQUEST_PASSWORD_RESET',
        resource: 'user',
        resourceId: user.id,
        details: { email: user.email },
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown'
      }
    });

    // Send password reset email
    const emailService = new EmailService();
    try {
      await emailService.sendPasswordResetEmail(user.email, resetToken, user.name || 'User');

      logInfo('Password reset email sent', {
        userId: user.id,
        email: user.email
      });

      return res.status(200).json({
        success: true,
        data: {
          message: 'If an account with this email exists, a password reset email has been sent.'
        }
      });
    } catch (emailError) {
      logError('Failed to send password reset email', emailError as Error, {
        userId: user.id,
        email: user.email
      });

      // In production, we might want to be more specific about email failures
      // For security reasons, we still return the same message
      return res.status(200).json({
        success: true,
        data: {
          message: 'If an account with this email exists, a password reset email has been sent.'
        }
      });
    }

  } catch (error) {
    logError('Password reset request failed', error as Error, {
      email: req.body?.email
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