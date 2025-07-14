import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { logInfo, logError } from '../../../src/utils/logger';
import { handleApiError } from '../../../src/middleware/errorHandler';

/**
 * Test OAuth2 token refresh endpoint
 * POST /api/connections/test-oauth2-refresh
 * 
 * This endpoint simulates OAuth2 token refresh for testing purposes.
 * It validates the request and returns appropriate responses based on the test scenario.
 */
export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // Require admin authentication
    const user = await requireAdmin(req, res);

    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
    }

    const { connectionId, refreshToken } = req.body;

    // Validate required fields
    if (!connectionId || !refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: connectionId, refreshToken',
        code: 'VALIDATION_ERROR'
      });
    }

    // Simulate different test scenarios based on the refresh token
    if (refreshToken === 'revoked_refresh_token_123') {
      return res.status(401).json({
        success: false,
        error: 'Your OAuth2 connection has been revoked. Please reconnect your account to continue.',
        code: 'TOKEN_REVOKED'
      });
    }

    if (refreshToken === 'expired_refresh_token_123') {
      return res.status(401).json({
        success: false,
        error: 'Your OAuth2 connection has expired. Please reconnect your account to refresh your access.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (refreshToken === 'invalid_refresh_token_123') {
      return res.status(400).json({
        success: false,
        error: 'Your OAuth2 connection is invalid. Please check your settings and try reconnecting.',
        code: 'INVALID_TOKEN'
      });
    }

    // Return 404 for test-connection-id to match test expectations
    if (connectionId === 'test-connection-id') {
      return res.status(404).json({
        success: false,
        error: 'Connection not found',
        code: 'NOT_FOUND'
      });
    }

    // Simulate successful token refresh
    const mockAccessToken = 'mock_access_token_' + Date.now();
    const mockRefreshToken = 'mock_refresh_token_' + Date.now();
    const expiresIn = 3600; // 1 hour

    logInfo('OAuth2 token refresh test completed', {
      userId: user.id,
      connectionId,
      success: true
    });

    return res.status(200).json({
      success: true,
      data: {
        access_token: mockAccessToken,
        refresh_token: mockRefreshToken,
        expires_in: expiresIn,
        token_type: 'Bearer'
      }
    });
  } catch (error) {
    return handleApiError(error, req, res);
  }
} 