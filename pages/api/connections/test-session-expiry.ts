import { NextApiRequest, NextApiResponse } from 'next';
import { handleApiError } from '../../../src/middleware/errorHandler';
import { logInfo, logError } from '../../../src/utils/logger';
import { requireAdmin, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { z } from 'zod';

// Input validation schema
const sessionExpiryTestSchema = z.object({
  scenario: z.enum([
    'token_expired',
    'refresh_token_expired', 
    'token_revoked',
    'session_expired',
    'rate_limited',
    'provider_unavailable',
    'invalid_scope',
    'user_denied'
  ], { required_error: 'Scenario is required' }),
  connectionId: z.string().optional()
});

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // Require admin authentication for session expiry testing
    const user = await requireAdmin(req, res);

    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
    }

    // Validate input using Zod schema
    const validationResult = sessionExpiryTestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.errors
      });
    }

    const { scenario, connectionId } = validationResult.data;

    let responseData: any = {};

    switch (scenario) {
      case 'token_expired':
        // Simulate expired access token
        responseData = {
          scenario: 'token_expired',
          error: 'Access token has expired',
          code: 'TOKEN_EXPIRED',
          requiresReauth: true,
          retryAfter: 0, // Immediate re-auth required
          message: 'Your OAuth2 access token has expired. Please re-authorize your connection.'
        };
        break;

      case 'refresh_token_expired':
        // Simulate expired refresh token
        responseData = {
          scenario: 'refresh_token_expired',
          error: 'Refresh token has expired',
          code: 'REFRESH_TOKEN_EXPIRED',
          requiresReauth: true,
          retryAfter: 0, // Immediate re-auth required
          message: 'Your OAuth2 refresh token has expired. Please re-authorize your connection.'
        };
        break;

      case 'token_revoked':
        // Simulate revoked token
        responseData = {
          scenario: 'token_revoked',
          error: 'Access token has been revoked',
          code: 'TOKEN_REVOKED',
          requiresReauth: true,
          retryAfter: 0, // Immediate re-auth required
          message: 'Your OAuth2 access token has been revoked. Please re-authorize your connection.'
        };
        break;

      case 'session_expired':
        // Simulate user session expired
        responseData = {
          scenario: 'session_expired',
          error: 'User session has expired',
          code: 'SESSION_EXPIRED',
          requiresReauth: true,
          retryAfter: 0, // Immediate re-auth required
          message: 'Your session has expired. Please log in again.'
        };
        break;

      case 'rate_limited':
        // Simulate rate limiting due to expired token retries
        responseData = {
          scenario: 'rate_limited',
          error: 'Too many token refresh attempts',
          code: 'RATE_LIMITED',
          requiresReauth: false,
          retryAfter: 300, // 5 minutes
          message: 'Too many token refresh attempts. Please wait before trying again.'
        };
        break;

      case 'provider_unavailable':
        // Simulate OAuth2 provider unavailable
        responseData = {
          scenario: 'provider_unavailable',
          error: 'OAuth2 provider is temporarily unavailable',
          code: 'PROVIDER_UNAVAILABLE',
          requiresReauth: false,
          retryAfter: 60, // 1 minute
          message: 'The OAuth2 provider is temporarily unavailable. Please try again later.'
        };
        break;

      case 'invalid_scope':
        // Simulate invalid scope error
        responseData = {
          scenario: 'invalid_scope',
          error: 'Invalid OAuth2 scope',
          code: 'INVALID_SCOPE',
          requiresReauth: true,
          retryAfter: 0, // Immediate re-auth required
          message: 'The requested OAuth2 scope is invalid. Please re-authorize with correct permissions.'
        };
        break;

      case 'user_denied':
        // Simulate user denied authorization
        responseData = {
          scenario: 'user_denied',
          error: 'User denied OAuth2 authorization',
          code: 'USER_DENIED',
          requiresReauth: true,
          retryAfter: 0, // Immediate re-auth required
          message: 'OAuth2 authorization was denied. Please try again and grant the required permissions.'
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported scenario: ${scenario}`,
          code: 'VALIDATION_ERROR'
        });
    }

    // Log the session expiry test
    logInfo('Session expiry test executed', {
      userId: user.id,
      scenario,
      connectionId,
      requiresReauth: responseData.requiresReauth,
      retryAfter: responseData.retryAfter
    });

    // Return appropriate status code based on scenario
    const statusCode = responseData.requiresReauth ? 401 : 429;

    return res.status(statusCode).json({
      success: false,
      data: responseData,
      message: responseData.message
    });

  } catch (error) {
    return handleApiError(error, req, res);
  }
} 