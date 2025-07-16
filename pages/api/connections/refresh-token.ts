import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/database/client';
import { handleApiError } from '../../../src/middleware/errorHandler';
import { logInfo, logError } from '../../../src/utils/logger';
import { requireAdmin, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { z } from 'zod';
import { secretsVault } from '../../../src/lib/secrets/secretsVault';
import { updateConnectionStatusBasedOnSecrets } from '../../../src/lib/services/connectionService';

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
        error: 'OAuth2 connection not found. Please check your connection settings and try again.',
        code: 'RESOURCE_NOT_FOUND'
      });
    }

    // --- SECRETS-FIRST-REFACTOR: Retrieve OAuth2 secrets from secrets vault ---
    const secrets = await secretsVault.getSecretsForConnection(user.id, connectionId);
    const secretMap = Object.fromEntries(secrets.map(s => [s.type, s]));
    // Required: clientId, clientSecret, refreshToken
    const clientIdSecret = secretMap['OAUTH2_CLIENT_ID'];
    const clientSecretSecret = secretMap['OAUTH2_CLIENT_SECRET'];
    let refreshTokenSecret = secretMap['OAUTH2_REFRESH_TOKEN'];
    if (!clientIdSecret || !clientSecretSecret) {
      return res.status(400).json({
        success: false,
        error: 'OAuth2 clientId or clientSecret secret missing. Please check your connection secrets.',
        code: 'MISSING_SECRETS'
      });
    }
    // Use provided refreshToken if present, else use secret
    const refreshTokenValue = refreshToken || (refreshTokenSecret ? (await secretsVault.getSecret(user.id, refreshTokenSecret.name)).value : undefined);
    if (!refreshTokenValue) {
      return res.status(400).json({
        success: false,
        error: 'OAuth2 refresh token secret missing. Please check your connection secrets.',
        code: 'MISSING_SECRETS'
      });
    }
    // --- END SECRETS-FIRST-REFACTOR ---

    // Extract provider for use in both try and catch
    const authConfig = connection.authConfig as any;
    let provider: string | undefined = undefined;
    if (authConfig && typeof authConfig === 'object') {
      provider = (authConfig as any).oauth2Provider || (authConfig as any).provider;
    }

    try {
      // Attempt to refresh the token based on provider
      let newAccessToken: string;
      let newRefreshToken: string | undefined;
      let expiresIn: number;
      switch (provider) {
        case 'GITHUB':
          const githubResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              client_id: (await secretsVault.getSecret(user.id, clientIdSecret.name)).value,
              client_secret: (await secretsVault.getSecret(user.id, clientSecretSecret.name)).value,
              grant_type: 'refresh_token',
              refresh_token: refreshTokenValue
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
              client_id: (await secretsVault.getSecret(user.id, clientIdSecret.name)).value,
              client_secret: (await secretsVault.getSecret(user.id, clientSecretSecret.name)).value,
              grant_type: 'refresh_token',
              refresh_token: refreshTokenValue
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
              client_id: (await secretsVault.getSecret(user.id, clientIdSecret.name)).value,
              client_secret: (await secretsVault.getSecret(user.id, clientSecretSecret.name)).value,
              grant_type: 'refresh_token',
              refresh_token: refreshTokenValue
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
            error: `OAuth2 provider '${provider}' is not supported. Please contact support for assistance.`,
            code: 'VALIDATION_ERROR'
          });
      }

      // --- SECRETS-FIRST-REFACTOR: Update/rotate secrets and connection status ---
      // Update or create access token secret
      await secretsVault.storeSecret(
        user.id,
        `${connection.name}_access_token`,
        { value: newAccessToken, metadata: { description: `Access token for ${connection.name}` } },
        'OAUTH2_ACCESS_TOKEN',
        undefined,
        undefined,
        connectionId,
        connection.name
      );
      // Update or create refresh token secret if new one is provided
      if (newRefreshToken && newRefreshToken !== refreshTokenValue) {
        await secretsVault.storeSecret(
          user.id,
          `${connection.name}_refresh_token`,
          { value: newRefreshToken, metadata: { description: `Refresh token for ${connection.name}` } },
          'OAUTH2_REFRESH_TOKEN',
          undefined,
          undefined,
          connectionId,
          connection.name
        );
      }
      // Update connection status based on secret health
      await updateConnectionStatusBasedOnSecrets(user.id, connectionId);
      // Audit log (use logInfo for audit if logSecretAccess is private)
      logInfo('Secret rotated (audit)', {
        userId: user.id,
        secretName: `${connection.name}_access_token`,
        action: 'SECRET_ROTATED',
        connectionId
      });
      // --- END SECRETS-FIRST-REFACTOR ---

      logInfo('OAuth2 token refreshed successfully', {
        connectionId,
        userId: user.id,
        provider,
        expiresIn
      });

      return res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || refreshTokenValue,
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
        },
        message: 'OAuth2 token refreshed successfully'
      });

    } catch (error: any) {
      logError('OAuth2 token refresh failed', error, {
        connectionId,
        userId: user.id,
        provider
      });
      // Update connection status to error
      await prisma.apiConnection.update({
        where: { id: connectionId },
        data: { connectionStatus: 'error' }
      });
      // Check if it's a token revocation error
      if (error.message.includes('invalid_grant') ||
          error.message.includes('Token revoked') ||
          error.message.includes('expired')) {
        return res.status(401).json({
          success: false,
          error: 'Your OAuth2 connection has expired or been revoked. Please reconnect your account to continue.',
          code: 'TOKEN_REVOKED'
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Failed to refresh your OAuth2 connection. Please try again or contact support if the problem persists.',
        code: 'TOKEN_REFRESH_FAILED',
        details: error.message
      });
    }

  } catch (error) {
    return handleApiError(error, req, res);
  }
} 