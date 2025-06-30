import { NextApiRequest, NextApiResponse } from 'next';
import { oauth2Service } from '../../../src/lib/auth/oauth2';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { ApplicationError } from '../../../src/middleware/errorHandler';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate the user
    const authReq = req as AuthenticatedRequest;
    const user = await requireAuth(authReq, res);

    // Get supported providers
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
      providers,
      count: providers.length
    });

  } catch (error) {
    console.error('OAuth2 providers error:', error);

    if (error instanceof ApplicationError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
} 