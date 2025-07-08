import { NextApiRequest, NextApiResponse } from 'next';
import { oauth2Service } from '../../../src/lib/auth/oauth2';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { ApplicationError } from '../../../src/middleware/errorHandler';
import { prisma } from '../../../lib/database/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Authenticate the user
    const authReq = req as AuthenticatedRequest;
    const user = await requireAuth(authReq, res);

    // Extract request body
    const { apiConnectionId, provider } = req.body;

    // Validate required parameters
    if (!apiConnectionId || typeof apiConnectionId !== 'string') {
      throw new ApplicationError('apiConnectionId is required', 400, 'MISSING_PARAMETER');
    }

    if (!provider || typeof provider !== 'string') {
      throw new ApplicationError('provider is required', 400, 'MISSING_PARAMETER');
    }

    // Validate that the API connection belongs to the user
    const apiConnection = await prisma.apiConnection.findFirst({
      where: {
        id: apiConnectionId,
        userId: user.id
      }
    });

    if (!apiConnection) {
      throw new ApplicationError('API connection not found', 404, 'NOT_FOUND');
    }

    // Get OAuth2 configuration
    const config = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorizationUrl: '',
      tokenUrl: '',
      redirectUri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/oauth/callback`,
      scope: '',
      state: provider
    };

    // Attempt to refresh the token
    const success = await oauth2Service.refreshToken(user.id, apiConnectionId, config);

    if (!success) {
      throw new ApplicationError('Failed to refresh OAuth2 token', 400, 'REFRESH_FAILED');
    }

    // Log the token refresh
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'OAUTH2_REFRESH',
        resource: 'API_CONNECTION',
        resourceId: apiConnectionId,
        details: {
          provider,
          success: true
        }
      }
    });

    // Return success response
    res.status(200).json({
      success: true,
      data: {
        message: 'OAuth2 token refreshed successfully'
      }
    });

  } catch (error) {
    console.error('OAuth2 refresh error:', error);

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