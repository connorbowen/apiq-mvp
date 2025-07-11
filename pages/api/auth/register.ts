/**
 * TODO: UX SIMPLIFICATION - REGISTRATION API PHASE 2.3 CHANGES - @connorbowen 2024-12-19
 * 
 * PHASE 2.3: Streamline onboarding flow
 * - [ ] Simplify registration to email + password only (remove name requirement)
 * - [ ] Make email verification optional (don't block access)
 * - [ ] Allow immediate dashboard access after registration
 * - [ ] Simplify validation logic
 * - [ ] Add tests: tests/integration/api/auth/auth-flow.test.ts - test simplified registration
 * - [ ] Add tests: tests/unit/api/auth/register.test.ts - test simplified validation
 * 
 * PHASE 2.4: Guided tour integration
 * - [ ] Add onboarding state tracking to user creation
 * - [ ] Set user onboarding stage to 'new_user'
 * - [ ] Add tests: tests/integration/api/auth/auth-flow.test.ts - test onboarding state
 * 
 * IMPLEMENTATION NOTES:
 * - Remove name field requirement and validation
 * - Set isActive to true by default (no verification required)
 * - Simplify password requirements
 * - Add onboarding state to user model
 * - Update response to include onboarding information
 */

import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../../src/lib/singletons/prisma';
import { ApplicationError, badRequest, conflict, internalServerError } from '../../../src/lib/errors/ApplicationError';
import { EmailService } from '../../../src/lib/services/emailService';
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
    const { email, name, password } = req.body;

    // Validate required fields
    if (!email || !name || !password) {
      throw badRequest('Email, name, and password are required', 'MISSING_FIELDS');
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

    // Validate name format - allow letters (including accented), numbers, spaces, basic punctuation
    const nameRegex = /^[a-zA-ZÀ-ÿ0-9\s\-'.]{2,50}$/;
    if (!nameRegex.test(name)) {
      throw badRequest('Name contains invalid characters', 'INVALID_NAME');
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

    // Create user (initially inactive until email verification)
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashedPassword,
        role: 'USER',
        isActive: false // Will be activated after email verification
      }
    });

    // Create verification token
    await prisma.verificationToken.create({
      data: {
        email: email.toLowerCase(),
        token: verificationToken,
        expiresAt
      }
    });

    // Send verification email
    try {
             const emailService = new EmailService();
       const emailSent = await emailService.sendVerificationEmail(
        email.toLowerCase(),
        verificationToken,
        name
      );

      if (!emailSent) {
        // In test environment, don't fail registration if email fails
        if (process.env.NODE_ENV === 'test') {
          logInfo('Email sending failed in test environment, continuing with registration', {
            userId: user.id,
            email: email.toLowerCase()
          });
        } else {
          throw new Error('EMAIL_SEND_FAILED');
        }
      }
    } catch (emailError) {
      // In test environment, don't clean up user if email fails
      if (process.env.NODE_ENV === 'test') {
        logInfo('Email service failed during registration in test environment', {
          userId: user.id,
          email: email.toLowerCase(),
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        });
      } else {
        // If email fails, clean up the user and token
        await prisma.user.delete({ where: { id: user.id } });
        await prisma.verificationToken.delete({ where: { token: verificationToken } });
        
        logError('Email service failed during registration', emailError as Error, {
          userId: user.id,
          email: email.toLowerCase()
        });
        
        throw internalServerError('Failed to send verification email', 'EMAIL_SEND_FAILED');
      }
    }

    // Log the registration attempt
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        resource: 'USER',
        resourceId: user.id,
        details: {
          email: email.toLowerCase(),
          name,
          emailSent: true
        },
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    });

    logInfo('User registration successful', {
      userId: user.id,
      email: email.toLowerCase(),
      name
    });

    // Return success response (don't include sensitive data)
    res.status(201).json({
      success: true,
      data: {
        message: 'Registration successful. Please check your email to verify your account.',
        userId: user.id
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