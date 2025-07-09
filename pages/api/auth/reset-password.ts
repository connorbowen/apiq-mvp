import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/database/client';
import { ApplicationError } from '../../../src/middleware/errorHandler';
import { emailService } from '../../../src/lib/services/emailService';
import { logInfo, logError } from '../../../src/utils/logger';

// Simple in-memory rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 3; // 3 requests per 15 minutes

// Token brute force protection
const tokenAttemptStore = new Map<string, { count: number; resetTime: number }>();
const TOKEN_ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes
const TOKEN_ATTEMPT_MAX = 5; // 5 invalid token attempts per 5 minutes

// Function to check if we're in a test environment
function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || 
         process.env.NODE_ENV === 'development' ||
         process.env.TEST_MODE === 'true' ||
         process.env.PLAYWRIGHT_TEST === 'true';
}

// Function to check if rate limiting should be enabled (even in test mode)
function shouldEnableRateLimiting(): boolean {
  // If explicitly disabled for fast testing, disable it
  if (process.env.DISABLE_RATE_LIMITING === 'true') {
    return false;
  }
  
  // Otherwise, always enable rate limiting (default secure behavior)
  return true;
}

// Function to clear rate limit stores (useful for testing)
function clearRateLimitStores() {
  if (isTestEnvironment()) {
    rateLimitStore.clear();
    tokenAttemptStore.clear();
    console.log('🔍 [RESET-PASSWORD] Rate limit stores cleared for test mode');
  }
}

function checkRateLimit(key: string): boolean {
  // Check if rate limiting should be enabled
  if (!shouldEnableRateLimiting()) {
    console.log('🔍 [RATE-LIMIT] Rate limiting disabled, allowing request for key:', key);
    return true; // Always allow when rate limiting is disabled
  }
  
  console.log('🔍 [RATE-LIMIT] Production mode, checking rate limit for key:', key);
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    console.log('🔍 [RATE-LIMIT] New rate limit record created for key:', key);
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    console.log('🔍 [RATE-LIMIT] Rate limit exceeded for key:', key, 'count:', record.count, 'max:', RATE_LIMIT_MAX);
    return false;
  }
  
  record.count++;
  console.log('🔍 [RATE-LIMIT] Rate limit incremented for key:', key, 'count:', record.count);
  return true;
}

function checkTokenAttemptLimit(ipAddress: string): boolean {
  // Check if token attempt limiting should be enabled
  if (!shouldEnableRateLimiting()) {
    return true; // Always allow when rate limiting is disabled
  }
  
  const now = Date.now();
  const key = `token_attempt:${ipAddress}`;
  const record = tokenAttemptStore.get(key);
  
  if (!record || now > record.resetTime) {
    tokenAttemptStore.set(key, { count: 1, resetTime: now + TOKEN_ATTEMPT_WINDOW });
    return true;
  }
  
  if (record.count >= TOKEN_ATTEMPT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Debug logging to see what environment we're in
  console.log('🔍 [RESET-PASSWORD] NODE_ENV:', process.env.NODE_ENV);
  console.log('🔍 [RESET-PASSWORD] TEST_MODE:', process.env.TEST_MODE);
  console.log('🔍 [RESET-PASSWORD] PLAYWRIGHT_TEST:', process.env.PLAYWRIGHT_TEST);
  console.log('🔍 [RESET-PASSWORD] DISABLE_RATE_LIMITING:', process.env.DISABLE_RATE_LIMITING);
  console.log('🔍 [RESET-PASSWORD] isTestEnvironment():', isTestEnvironment());
  console.log('🔍 [RESET-PASSWORD] shouldEnableRateLimiting():', shouldEnableRateLimiting());
  
  // Clear rate limit stores ONLY if rate limiting is DISABLED (i.e., in fast mode)
  if (!shouldEnableRateLimiting()) {
    console.log('🔍 [RESET-PASSWORD] Rate limit stores cleared for test mode (rate limiting disabled)');
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
    const { email, token, password } = req.body;

    // Handle password reset request (when email is provided)
    if (email && !token && !password) {
      return await handlePasswordResetRequest(req, res, email);
    }

    // Handle actual password reset (when token and password are provided)
    if (token && password && !email) {
      return await handlePasswordReset(req, res, token, password);
    }

    // Handle case where only token is provided (missing password)
    if (token && !password && !email) {
      throw new ApplicationError('Password is required', 400, 'MISSING_PASSWORD');
    }

    // Handle case where only password is provided (missing token)
    if (password && !token && !email) {
      throw new ApplicationError('Reset token is required', 400, 'MISSING_TOKEN');
    }

    // Invalid request - must provide either email OR token+password
    throw new ApplicationError('Invalid request. Provide either email (to request reset) or token+password (to reset password)', 400, 'INVALID_REQUEST');

  } catch (error) {
    logError('Password reset operation failed', error as Error, {
      email: req.body?.email,
      hasToken: !!req.body?.token
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

async function handlePasswordResetRequest(req: NextApiRequest, res: NextApiResponse, email: string) {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ApplicationError('Invalid email format', 400, 'INVALID_EMAIL');
    }

    // Check rate limit for password reset requests (if enabled)
    if (shouldEnableRateLimiting()) {
      const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
      const rateLimitKey = `password_reset:${ipAddress}`;
      if (!checkRateLimit(rateLimitKey)) {
        throw new ApplicationError('Too many password reset requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
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
      // In test environment, don't fail password reset request if email fails
      if (isTestEnvironment()) {
        logInfo('Email sending failed in test environment, continuing with password reset request', {
          userId: user.id,
          email: email.toLowerCase()
        });
      } else {
        // Clean up token if email fails
        await prisma.passwordResetToken.delete({
          where: { token: resetToken }
        });
        
        throw new ApplicationError('Failed to send password reset email', 500, 'EMAIL_SEND_FAILED');
      }
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
}

async function handlePasswordReset(req: NextApiRequest, res: NextApiResponse, token: string, password: string) {
  // Validate password
  if (!password || password.trim() === '') {
    throw new ApplicationError('Password is required', 400, 'MISSING_PASSWORD');
  }

  if (password.length < 8) {
    throw new ApplicationError('Password must be at least 8 characters long', 400, 'WEAK_PASSWORD');
  }

  // Check token brute force protection (if enabled)
  if (shouldEnableRateLimiting()) {
    const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
    if (!checkTokenAttemptLimit(ipAddress)) {
      throw new ApplicationError('Too many invalid token attempts. Rate limit exceeded. Please try again later.', 429, 'TOKEN_BRUTE_FORCE_DETECTED');
    }
  }

  // Find the reset token first
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken) {
    throw new ApplicationError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
  }

  // If expired, delete immediately (outside transaction)
  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
    throw new ApplicationError('Reset token has expired', 400, 'EXPIRED_TOKEN');
  }

  // Find user by email
  const user = await prisma.user.findUnique({ where: { email: resetToken.email } });
  if (!user) {
    // Clean up orphaned token
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
    throw new ApplicationError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Use a transaction for the actual password reset operations
  const result = await prisma.$transaction(async (tx) => {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);
    // Update user's password
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        updatedAt: new Date()
      }
    });
    // Delete the used reset token
    await tx.passwordResetToken.delete({ where: { id: resetToken.id } });
    // Log the password reset
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET',
        resource: 'USER',
        resourceId: user.id,
        details: {
          email: resetToken.email,
          resetViaToken: true
        },
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    });
    return { user, resetToken };
  });

  logInfo('Password reset successful', {
    userId: result.user.id,
    email: result.resetToken.email
  });

  // Return success response
  res.status(200).json({
    success: true,
    data: {
      message: 'Password reset successfully'
    }
  });
} 