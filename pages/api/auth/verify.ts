import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '../../../src/generated/prisma';
import { ApplicationError } from '../../../src/middleware/errorHandler';
import { logInfo, logError } from '../../../src/utils/logger';
import jwt from 'jsonwebtoken';

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
    const { token } = req.body;

    // Validate token
    if (!token) {
      throw new ApplicationError('Verification token is required', 400, 'MISSING_TOKEN');
    }

    // Find verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    });

    if (!verificationToken) {
      throw new ApplicationError('Invalid verification token', 400, 'INVALID_TOKEN');
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.verificationToken.delete({
        where: { token }
      });
      
      throw new ApplicationError('Verification token has expired', 400, 'EXPIRED_TOKEN');
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.email }
    });

    if (!user) {
      // Clean up orphaned token
      await prisma.verificationToken.delete({
        where: { token }
      });
      
      throw new ApplicationError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Check if user is already verified
    if (user.isActive) {
      // Clean up token since user is already verified
      await prisma.verificationToken.delete({
        where: { token }
      });
      
      throw new ApplicationError('User is already verified', 400, 'ALREADY_VERIFIED');
    }

    // Activate user
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: true }
    });

    // Clean up verification token
    await prisma.verificationToken.delete({
      where: { token }
    });

    // Generate authentication tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, tokenType: 'refresh' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Log the verification
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'VERIFY_EMAIL',
        resource: 'USER',
        resourceId: user.id,
        details: {
          email: user.email,
          verifiedAt: new Date()
        },
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    });

    logInfo('Email verification successful', {
      userId: user.id,
      email: user.email
    });

    // Return success response with authentication tokens
    res.status(200).json({
      success: true,
      data: {
        message: 'Email verified successfully! Welcome to APIQ.',
        userId: user.id,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive
        }
      }
    });

  } catch (error) {
    logError('Email verification failed', error as Error, {
      token: req.body?.token ? 'present' : 'missing'
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