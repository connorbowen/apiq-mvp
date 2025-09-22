import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../../lib/database/client';;
import { ApplicationError, badRequest, conflict, internalServerError } from '../../../src/lib/errors/ApplicationError';
import { EmailService } from '../../../src/lib/services/emailService';
import { logInfo, logError } from '../../../src/utils/logger';
import { generateToken } from '../../../src/lib/auth/session';
import { usageTrackingService } from '../../../src/lib/services/usageTrackingService';
import { PlanType } from '../../../src/generated/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { email, name, password } = req.body;

    // Validate required fields (name is now optional for simplified registration)
    if (!email || !password) {
      throw badRequest('Email and password are required', 'MISSING_FIELDS');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw badRequest('Invalid email format', 'INVALID_EMAIL');
    }

    // Validate password strength
    if (password.length < 8) {
      throw badRequest('Password must be at least 8 characters long', 'WEAK_PASSWORD');
    }

    // Validate name format if provided (optional for simplified registration)
    if (name) {
      const nameRegex = /^[a-zA-ZÀ-ÿ0-9\s\-'.]{2,50}$/;
      if (!nameRegex.test(name)) {
        throw badRequest('Name contains invalid characters', 'INVALID_NAME');
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw conflict('User with this email already exists', 'USER_EXISTS');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user (active by default for simplified onboarding)
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || `User ${email.split('@')[0]}`, // Generate default name if not provided
        password: hashedPassword,
        role: 'USER',
        isActive: true, // Active immediately for simplified onboarding
        onboardingStage: 'NEW_USER',
        onboardingCompletedAt: null
      }
    });

    // Create default FREE plan for new user
    await usageTrackingService.createOrUpdateUserPlan(user.id, PlanType.FREE);

    // Create verification token
    await prisma.verificationToken.create({
      data: {
        email: email.toLowerCase(),
        token: verificationToken,
        expiresAt
      }
    });

    // Create audit log immediately after user creation
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        resource: 'USER',
        resourceId: user.id,
        details: {
          email: email.toLowerCase(),
          name,
          emailSent: false // Will be updated after email attempt
        },
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    });

    // Send verification email (skip in test environment for performance)
    let emailSent = false;
    console.log('🔍 REGISTER: NODE_ENV check:', process.env.NODE_ENV, 'is test?', process.env.NODE_ENV === 'test');
    if (process.env.NODE_ENV === 'test') {
      // Skip email sending in test environment for performance
      console.log('🔍 REGISTER: Skipping email sending in test environment');
      logInfo('Skipping email sending in test environment for performance', {
        userId: user.id,
        email: email.toLowerCase()
      });
      emailSent = true; // Mark as sent to avoid cleanup
    } else {
      try {
        const emailService = new EmailService();
        emailSent = await emailService.sendVerificationEmail(
          email.toLowerCase(),
          verificationToken,
          name
        );

        if (!emailSent) {
          throw new Error('EMAIL_SEND_FAILED');
        }
      } catch (emailError) {
        // If email fails, clean up the user, token, and audit log
        await prisma.user.delete({ where: { id: user.id } });
        await prisma.verificationToken.delete({ where: { token: verificationToken } });
        await prisma.auditLog.deleteMany({ where: { userId: user.id, action: 'REGISTER' } });
        
        logError('Email service failed during registration', emailError as Error, {
          userId: user.id,
          email: email.toLowerCase()
        });
        
        throw internalServerError('Failed to send verification email', 'EMAIL_SEND_FAILED');
      }
    }

    // Update audit log with email status
    await prisma.auditLog.updateMany({
      where: {
        userId: user.id,
        action: 'REGISTER',
        resource: 'USER'
      },
      data: {
        details: {
          email: email.toLowerCase(),
          name,
          emailSent
        }
      }
    });

    logInfo('User registration successful', {
      userId: user.id,
      email: email.toLowerCase(),
      name
    });

    // Generate authentication tokens for auto-login
    const accessToken = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive
    });
    const refreshToken = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive
    }, 'refresh');

    // Set secure HTTP-only cookies for tokens (auto-login)
    const cookieOptions = [
      `accessToken=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${15 * 60}; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`,
      `refreshToken=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`,
      `userOnboardingStage=${user.onboardingStage}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
    ];
    
    res.setHeader('Set-Cookie', cookieOptions);
    
    console.log('🔍 REGISTER: Setting cookies:', {
      accessTokenLength: accessToken.length,
      refreshTokenLength: refreshToken.length,
      cookieCount: cookieOptions.length
    });

    // Return success response for simplified onboarding with tokens
    res.status(201).json({
      success: true,
      data: {
        message: 'Registration successful! Welcome to APIQ.',
        userId: user.id,
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minutes
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          onboardingStage: user.onboardingStage,
          onboardingCompletedAt: user.onboardingCompletedAt
        }
      }
    });

  } catch (error) {
    logError('User registration failed', error as Error, {
      email: req.body?.email,
      name: req.body?.name
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