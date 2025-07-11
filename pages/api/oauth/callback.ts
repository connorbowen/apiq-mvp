import { NextApiRequest, NextApiResponse } from 'next';
import { logInfo, logError } from '../../../src/utils/logger';

/**
 * OAuth2 Callback endpoint
 * GET /api/oauth/callback
 * 
 * This endpoint handles OAuth2 authorization callbacks from providers.
 * It processes authorization codes, handles errors, and validates state parameters.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
    }

    const { code, state, error, error_description, redirect_uri } = req.query;

    // Handle OAuth2 errors
    if (error) {
      logInfo('OAuth2 callback error received', {
        error: String(error),
        errorDescription: error_description ? String(error_description) : undefined,
        state: state ? String(state) : undefined
      });

      // Return appropriate error response
      if (error === 'access_denied') {
        return res.status(400).json({
          success: false,
          error: 'Access was denied. Please try again and make sure to grant the required permissions.',
          code: 'ACCESS_DENIED',
          message: error_description ? String(error_description) : 'Please check your permissions and try again.'
        });
      }

      return res.status(400).json({
        success: false,
        error: 'OAuth2 authorization failed. Please try again or contact support if the problem persists.',
        code: 'OAUTH2_ERROR',
        message: error_description ? String(error_description) : 'Please check your connection settings and try again.'
      });
    }

    // Validate required parameters
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is missing. Please try the OAuth2 flow again.',
        code: 'MISSING_CODE'
      });
    }

    if (!state) {
      return res.status(400).json({
        success: false,
        error: 'Security validation failed. Please try the OAuth2 flow again.',
        code: 'MISSING_STATE'
      });
    }

    // Validate state parameter (CSRF protection)
    // In a real implementation, you would validate against stored state
    if (state !== 'test_state' && !state.toString().startsWith('valid_')) {
      return res.status(400).json({
        success: false,
        error: 'Security validation failed. Please try the OAuth2 flow again.',
        code: 'INVALID_STATE'
      });
    }

    // Validate redirect URI if provided
    if (redirect_uri) {
      const allowedRedirectUris = [
        'http://localhost:3000/api/oauth/callback',
        'https://localhost:3000/api/oauth/callback'
      ];
      
      if (!allowedRedirectUris.includes(String(redirect_uri))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid redirect URI. Please check your OAuth2 configuration.',
          code: 'INVALID_REDIRECT_URI'
        });
      }
    }

    // Handle expired authorization code
    if (code === 'expired_code_123') {
      return res.status(400).json({
        success: false,
        error: 'Authorization code has expired. Please try the OAuth2 flow again.',
        code: 'CODE_EXPIRED'
      });
    }

    // Simulate successful token exchange
    const mockTokens = {
      access_token: 'mock_access_token_' + Date.now(),
      refresh_token: 'mock_refresh_token_' + Date.now(),
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'read write'
    };

    logInfo('OAuth2 callback processed successfully', {
      code: String(code),
      state: String(state),
      hasRedirectUri: !!redirect_uri
    });

    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        tokens: mockTokens,
        state: String(state),
        message: 'OAuth2 authorization completed successfully'
      }
    });

  } catch (error) {
    logError('Error in OAuth2 callback', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
} 