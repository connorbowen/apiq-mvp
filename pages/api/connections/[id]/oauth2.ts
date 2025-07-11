import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../../src/lib/auth/session';
import { prisma } from '../../../../src/lib/singletons/prisma';
import { ApplicationError, badRequest, notFound } from '../../../../src/lib/errors/ApplicationError';
import { markConnecting } from '../../../../src/lib/services/connectionService';
import { oauth2Service } from '../../../../src/lib/auth/oauth2';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Authenticate user
    const user = await requireAuth(req as any, res);

    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      throw badRequest('Invalid connection ID', 'INVALID_ID');
    }

    // Get the connection and verify ownership
    const connection = await prisma.apiConnection.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!connection) {
      throw notFound('Connection not found', 'NOT_FOUND');
    }

    // Verify this is an OAuth2 connection
    const authConfig = connection.authConfig as any;
    if (authConfig?.authType !== 'oauth2') {
      throw badRequest('Connection is not configured for OAuth2', 'INVALID_AUTH_TYPE');
    }

    // Generate a unique OAuth state
    const oauthState = crypto.randomBytes(32).toString('hex');

    // Mark connection as connecting
    await markConnecting(connection.id, oauthState);

    // Build OAuth2 authorization URL
    const config = {
      clientId: authConfig.clientId,
      clientSecret: authConfig.clientSecret,
      authorizationUrl: authConfig.authorizationUrl,
      tokenUrl: authConfig.tokenUrl,
      redirectUri: authConfig.redirectUri || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/connections/oauth2/callback`,
      scope: authConfig.scope || '',
      state: oauthState
    };

    const authUrl = oauth2Service.generateAuthorizationUrl(
      user.id,
      connection.id,
      authConfig.provider || 'generic',
      config
    );

    // Return the authorization URL
    res.status(200).json({
      success: true,
      data: {
        authorizationUrl: authUrl,
        state: oauthState
      }
    });

  } catch (error) {
    console.error('OAuth2 authorization error:', error);

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