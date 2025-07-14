import { NextApiRequest, NextApiResponse } from 'next';
import { oauth2Service } from '../../../../src/lib/auth/oauth2';
import { requireAuth, AuthenticatedRequest } from '../../../../src/lib/auth/session';
import { ApplicationError, badRequest, notFound } from '../../../../src/lib/errors/ApplicationError';
import { prisma } from '../../../../lib/database/client';

/**
 * API Connection OAuth2 Authorization Handler
 * 
 * This endpoint handles OAuth2 authorization for API connections to third-party services.
 * It's separate from the user authentication OAuth2 flow which is handled in /api/auth/sso/.
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate the user
    const authReq = req as AuthenticatedRequest;
    const user = await requireAuth(authReq, res);

    // Extract query parameters
    const { 
      apiConnectionId, 
      provider, 
      clientId, 
      clientSecret, 
      redirectUri, 
      scope 
    } = req.query;



    // Validate required parameters
    if (!apiConnectionId || typeof apiConnectionId !== 'string') {
      throw badRequest('apiConnectionId is required', 'MISSING_PARAMETER');
    }

    if (!provider || typeof provider !== 'string') {
      throw badRequest('provider is required', 'MISSING_PARAMETER');
    }

    if (!clientId || typeof clientId !== 'string') {
      throw badRequest('clientId is required', 'MISSING_PARAMETER');
    }

    if (!clientSecret || typeof clientSecret !== 'string') {
      throw badRequest('clientSecret is required', 'MISSING_PARAMETER');
    }

    if (!redirectUri || typeof redirectUri !== 'string') {
      throw badRequest('redirectUri is required', 'MISSING_PARAMETER');
    }

    // Handle scope parameter (can be string or array)
    const scopeString = Array.isArray(scope) ? scope[0] || '' : scope || '';

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

    // Check if provider is supported
    const supportedProviders = oauth2Service.getSupportedProviders();
    if (!supportedProviders.includes(provider)) {
      throw badRequest(
        `Unsupported OAuth2 provider: ${provider}. Supported providers: ${supportedProviders.join(', ')}`,
        'UNSUPPORTED_PROVIDER'
      );
    }

    // Get provider configuration to get the URLs
    const providerConfig = oauth2Service.getProviderConfig(provider);
    if (!providerConfig) {
      throw badRequest(
        `Provider configuration not found for: ${provider}`,
        'PROVIDER_CONFIG_NOT_FOUND'
      );
    }

    // Validate OAuth2 configuration
    const config = {
      clientId,
      clientSecret,
      authorizationUrl: providerConfig.authorizationUrl,
      tokenUrl: providerConfig.tokenUrl,
      redirectUri,
      scope: scopeString,
      state: provider
    };

    const validationErrors = oauth2Service.validateConfig(config);
    if (validationErrors.length > 0) {
      throw badRequest(
        `Invalid OAuth2 configuration: ${validationErrors.join(', ')}`,
        'INVALID_CONFIG'
      );
    }

    // Generate authorization URL
    const authorizationUrl = oauth2Service.generateAuthorizationUrl(
      user.id,
      apiConnectionId,
      provider,
      config
    );



    // Log the OAuth2 authorization attempt
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'OAUTH2_AUTHORIZE',
        resource: 'API_CONNECTION',
        resourceId: apiConnectionId,
        details: {
          provider,
          scope: config.scope,
          redirectUri: config.redirectUri
        }
      }
    });

    // For test provider, redirect directly to the test OAuth2 server
    if (provider === 'test') {
      return res.redirect(authorizationUrl);
    } else {
      // For other providers, send a JSON response with the redirect URL
      return res.status(200).json({
        success: true,
        data: {
          redirectUrl: authorizationUrl
        }
      });
    }

  } catch (error) {

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