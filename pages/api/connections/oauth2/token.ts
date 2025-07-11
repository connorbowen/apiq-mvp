import { NextApiRequest, NextApiResponse } from 'next';
import { oauth2Service } from '../../../../src/lib/auth/oauth2';
import { requireAuth, AuthenticatedRequest } from '../../../../src/lib/auth/session';
import { ApplicationError, badRequest, notFound } from '../../../../src/lib/errors/ApplicationError';
import { prisma } from '../../../../lib/database/client';

/**
 * API Connection OAuth2 Token Handler
 * 
 * This endpoint handles OAuth2 token retrieval for API connections to third-party services.
 * It's separate from the user authentication OAuth2 flow which is handled in /api/auth/sso/.
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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

    // Extract query parameters
    const { apiConnectionId } = req.query;

    // Validate required parameters
    if (!apiConnectionId || typeof apiConnectionId !== 'string') {
      throw badRequest('apiConnectionId is required', 'MISSING_PARAMETER');
    }

    // Validate that the API connection belongs to the user
    const apiConnection = await prisma.apiConnection.findFirst({
      where: {
        id: apiConnectionId,
        userId: user.id
      }
    });

    if (!apiConnection) {
      throw notFound('API connection not found', 'NOT_FOUND');
    }

    // Check if the API connection uses OAuth2
    if (apiConnection.authType !== 'OAUTH2') {
      throw badRequest('API connection does not use OAuth2 authentication', 'INVALID_AUTH_TYPE');
    }

    // Get the OAuth2 access token
    const accessToken = await oauth2Service.getAccessToken(user.id, apiConnectionId);

    if (!accessToken) {
      throw notFound('No valid OAuth2 access token found', 'TOKEN_NOT_FOUND');
    }

    // Log the token access
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'OAUTH2_TOKEN_ACCESS',
        resource: 'API_CONNECTION',
        resourceId: apiConnectionId,
        details: {
          success: true
        }
      }
    });

    // Return the access token
    res.status(200).json({
      success: true,
      data: {
        accessToken,
        tokenType: 'Bearer'
      }
    });

  } catch (error) {
    console.error('OAuth2 token access error:', error);

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