import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/database/client';
import { handleApiError } from '../../../src/middleware/errorHandler';
import { logInfo, logError } from '../../../src/utils/logger';
import { requireAdmin, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { z } from 'zod';

// Input validation schema
const refreshTokenSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
  refreshToken: z.string().min(1, 'Refresh token is required')
});

/**
 * OAuth2 Token Refresh Endpoint
 * 
 * Refreshes OAuth2 access tokens using refresh tokens for supported providers.
 * Supports GitHub, Google, and Slack OAuth2 providers.
 * 
 * @param req - Next.js API request with connectionId and refreshToken in body
 * @param res - Next.js API response
 * @returns Promise resolving to refreshed token data or error response
 * 
 * @example
 * ```typescript
 * POST /api/connections/refresh-token
 * {
 *   "connectionId": "conn_123",
 *   "refreshToken": "rt_456"
 * }
 * ```
 * 
 * @throws {AppError} When authentication fails or connection not found
 * @throws {AppError} When token refresh fails or token is revoked
 */
export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // Require admin authentication for OAuth2 operations
    const user = await requireAdmin(req, res);

    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
    }

    // Validate input using Zod schema
    const validationResult = refreshTokenSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.errors
      });
    }

    const { connectionId, refreshToken } = validationResult.data;

    // Find the connection
    const connection = await prisma.apiConnection.findFirst({
      where: { 
        id: connectionId,
        userId: user.id,
        authType: 'OAUTH2'
      }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'OAuth2 connection not found',
        code: 'RESOURCE_NOT_FOUND'
      });
    }

    // Get OAuth2 configuration
    const authConfig = connection.authConfig as any;
    if (!authConfig || !authConfig.oauth2Provider) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OAuth2 configuration',
        code: 'VALIDATION_ERROR'
      });
    }

    try {
      // Attempt to refresh the token based on provider
      let newAccessToken: string;
      let newRefreshToken: string | undefined;
      let expiresIn: number;

      switch (authConfig.oauth2Provider) {
        case 'GITHUB':
          const githubResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              client_id: authConfig.clientId,
              client_secret: authConfig.clientSecret,
              grant_type: 'refresh_token',
              refresh_token: refreshToken
            })
          });

          if (!githubResponse.ok) {
            throw new Error('GitHub token refresh failed');
          }

          const githubData = await githubResponse.json();
          if (githubData.error) {
            throw new Error(`GitHub error: ${githubData.error_description || githubData.error}`);
          }

          newAccessToken = githubData.access_token;
          newRefreshToken = githubData.refresh_token;
          expiresIn = githubData.expires_in || 3600;
          break;

        case 'GOOGLE':
          const googleResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: authConfig.clientId,
              client_secret: authConfig.clientSecret,
              grant_type: 'refresh_token',
              refresh_token: refreshToken
            })
          });

          if (!googleResponse.ok) {
            throw new Error('Google token refresh failed');
          }

          const googleData = await googleResponse.json();
          if (googleData.error) {
            throw new Error(`Google error: ${googleData.error_description || googleData.error}`);
          }

          newAccessToken = googleData.access_token;
          newRefreshToken = googleData.refresh_token;
          expiresIn = googleData.expires_in || 3600;
          break;

        case 'SLACK':
          const slackResponse = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: authConfig.clientId,
              client_secret: authConfig.clientSecret,
              grant_type: 'refresh_token',
              refresh_token: refreshToken
            })
          });

          if (!slackResponse.ok) {
            throw new Error('Slack token refresh failed');
          }

          const slackData = await slackResponse.json();
          if (!slackData.ok) {
            throw new Error(`Slack error: ${slackData.error || 'Unknown error'}`);
          }

          newAccessToken = slackData.access_token;
          newRefreshToken = slackData.refresh_token;
          expiresIn = slackData.expires_in || 3600;
          break;

        default:
          return res.status(400).json({
            success: false,
            error: `Unsupported OAuth2 provider: ${authConfig.oauth2Provider}`,
            code: 'VALIDATION_ERROR'
          });
      }

      // Update connection with new tokens
      const updatedAuthConfig = {
        ...authConfig,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken || refreshToken, // Use new refresh token if provided
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000)
      };

      await prisma.apiConnection.update({
        where: { id: connectionId },
        data: {
          authConfig: updatedAuthConfig,
          lastTested: new Date()
        }
      });

      logInfo('OAuth2 token refreshed successfully', {
        connectionId,
        userId: user.id,
        provider: authConfig.oauth2Provider,
        expiresIn
      });

      return res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || refreshToken,
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
        },
        message: 'OAuth2 token refreshed successfully'
      });

    } catch (error: any) {
      logError('OAuth2 token refresh failed', error, {
        connectionId,
        userId: user.id,
        provider: authConfig.oauth2Provider
      });

      // Check if it's a token revocation error
      if (error.message.includes('invalid_grant') || 
          error.message.includes('Token revoked') ||
          error.message.includes('expired')) {
        return res.status(401).json({
          success: false,
          error: 'Token revoked or expired - re-authorization required',
          code: 'TOKEN_REVOKED'
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Token refresh failed',
        code: 'TOKEN_REFRESH_FAILED',
        details: error.message
      });
    }

  } catch (error) {
    return handleApiError(error, req, res);
  }
} 