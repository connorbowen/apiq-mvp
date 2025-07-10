import { NextApiRequest, NextApiResponse } from 'next';
import { oauth2Service } from '../../../../src/lib/auth/oauth2';
import { ApplicationError } from '../../../../src/middleware/errorHandler';

/**
 * API Connection OAuth2 Providers Handler
 * 
 * This endpoint provides information about supported OAuth2 providers for API connections.
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
    // Get supported providers (no authentication required)
    const supportedProviders = oauth2Service.getSupportedProviders();
    
    // Get provider configurations
    const providers = supportedProviders.map(provider => {
      const config = oauth2Service.getProviderConfig(provider);
      return {
        name: provider,
        displayName: config?.name || provider,
        authorizationUrl: config?.authorizationUrl,
        tokenUrl: config?.tokenUrl,
        scope: config?.scope,
        userInfoUrl: config?.userInfoUrl
      };
    });

    // Return provider information
    res.status(200).json({
      success: true,
      data: {
        providers,
        count: providers.length
      }
    });

  } catch (error) {
    console.error('OAuth2 providers error:', error);

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