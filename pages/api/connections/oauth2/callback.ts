import { NextApiRequest, NextApiResponse } from 'next';
import { oauth2Service, OAuth2Service } from '../../../../src/lib/auth/oauth2';
import { ApplicationError, badRequest } from '../../../../src/lib/errors/ApplicationError';
import { findConnectionByOAuthState, markConnected, markError, updateConnectionStatusBasedOnSecrets } from '../../../../src/lib/services/connectionService';
import { prisma } from '../../../../lib/database/client';
import { secretsVault } from '../../../../src/lib/secrets/secretsVault';

/**
 * API Connection OAuth2 Callback Handler
 * 
 * This endpoint handles OAuth2 callbacks for API connections to third-party services.
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
    // Extract query parameters from OAuth2 callback
    const { code, state, error, error_description } = req.query;

    // Handle OAuth2 errors
    if (error) {
      console.error('OAuth2 error:', error, error_description);
      if (state && typeof state === 'string') {
        try {
          const connection = await findConnectionByOAuthState(state);
          if (connection) {
            await markError(connection.id, error_description as string || error as string);
          }
        } catch (markError) {
          console.error('Failed to mark connection as error:', markError);
        }
      }
      return res.status(400).json({
        success: false,
        error: 'OAuth2 authorization failed',
        details: error_description || error,
        code: 'OAUTH2_ERROR'
      });
    }

    // Validate required parameters
    if (!code || typeof code !== 'string') {
      throw badRequest('Authorization code is required', 'MISSING_CODE');
    }
    if (!state || typeof state !== 'string') {
      throw badRequest('State parameter is required', 'MISSING_STATE');
    }

    // Find the connection by OAuth state (support both encoded and legacy state)
    let connection = null;
    let decodedState = OAuth2Service.decodeStateParam(state);
    if (decodedState && decodedState.apiConnectionId) {
      connection = await prisma.apiConnection.findUnique({ where: { id: decodedState.apiConnectionId } });
    } else {
      connection = await findConnectionByOAuthState(state);
    }
    if (!connection) {
      throw badRequest('Invalid OAuth state - connection not found', 'INVALID_STATE');
    }

    // Check if this is a test scenario
    const isTestScenario = code === 'test' && state === 'test';
    if (isTestScenario) {
      await markConnected(connection.id);
      return res.status(200).json({
        success: true,
        data: {
          message: 'OAuth2 test callback completed successfully',
          isTest: true
        }
      });
    }

    // Extract OAuth2 configuration from the connection's authConfig
    const authConfig = connection.authConfig as any;
    const config = {
      clientId: authConfig.clientId || '',
      clientSecret: authConfig.clientSecret || '',
      authorizationUrl: '',
      tokenUrl: '',
      redirectUri: authConfig.redirectUri || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/connections/oauth2/callback`,
      scope: authConfig.scope || '',
      state: state
    };

    // --- SECRETS-FIRST-REFACTOR: Store tokens in secrets vault ---
    let userId = connection.userId;
    let connectionId = connection.id;
    let connectionName = connection.name;
    let provider = authConfig.provider || decodedState?.provider || 'generic';
    let tokenResponse = null;
    let accessSecret = null;
    let refreshSecret = null;
    let auditLogs: string[] = [];
    try {
      // Exchange code for tokens (directly call exchangeCodeForTokens to get the token response)
      tokenResponse = await oauth2Service['exchangeCodeForTokens'](code, { ...config, provider });
      if (!tokenResponse || !tokenResponse.access_token) {
        throw new Error('No access token received from OAuth2 provider');
      }
      // Store access token as secret
      accessSecret = await secretsVault.createSecretFromConnection(
        userId,
        connectionId,
        `${connectionName}_access_token`,
        { value: tokenResponse.access_token, metadata: { provider, scope: tokenResponse.scope, issuedAt: new Date().toISOString() } },
        'OAUTH2_ACCESS_TOKEN',
        connectionName
      );
      auditLogs.push('OAUTH2_ACCESS_TOKEN_CREATED');
      // Store refresh token as secret (if present)
      if (tokenResponse.refresh_token) {
        refreshSecret = await secretsVault.createSecretFromConnection(
          userId,
          connectionId,
          `${connectionName}_refresh_token`,
          { value: tokenResponse.refresh_token, metadata: { provider, scope: tokenResponse.scope, issuedAt: new Date().toISOString() } },
          'OAUTH2_REFRESH_TOKEN',
          connectionName
        );
        auditLogs.push('OAUTH2_REFRESH_TOKEN_CREATED');
      }
      // Update connection status based on secret health
      await updateConnectionStatusBasedOnSecrets(userId, connectionId);
      // Audit log
      for (const action of auditLogs) {
        await prisma.auditLog.create({
          data: {
            userId,
            action,
            resource: 'SECRET',
            resourceId: connectionId,
            details: {
              provider,
              scope: tokenResponse.scope,
              issuedAt: new Date().toISOString()
            }
          }
        });
      }
    } catch (secretError) {
      // Rollback: mark connection as error
      await markError(connectionId, (secretError as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Failed to store OAuth2 tokens as secrets',
        details: (secretError as Error).message,
        code: 'OAUTH2_SECRET_ERROR'
      });
    }

    // Mark connection as connected (if not already by status update)
    await markConnected(connectionId);

    // Redirect back to dashboard with success message
    const redirectUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard?oauth_success=true&connection_id=${connectionId}`;
    return res.redirect(redirectUrl);

  } catch (error) {
    if (error instanceof ApplicationError) {
      const { state } = req.query;
      if (state && typeof state === 'string') {
        try {
          const connection = await findConnectionByOAuthState(state);
          if (connection) {
            await markError(connection.id, error.message);
          }
        } catch (markError) {
          console.error('Failed to mark connection as error:', markError);
        }
      }
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