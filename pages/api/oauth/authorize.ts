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
      throw new ApplicationError('apiConnectionId is required', 400, 'MISSING_PARAMETER');
    }

    if (!provider || typeof provider !== 'string') {
      throw new ApplicationError('provider is required', 400, 'MISSING_PARAMETER');
    }

    if (!clientId || typeof clientId !== 'string') {
      throw new ApplicationError('clientId is required', 400, 'MISSING_PARAMETER');
    }

    if (!clientSecret || typeof clientSecret !== 'string') {
      throw new ApplicationError('clientSecret is required', 400, 'MISSING_PARAMETER');
    }

    if (!redirectUri || typeof redirectUri !== 'string') {
      throw new ApplicationError('redirectUri is required', 400, 'MISSING_PARAMETER');
    }

    // Handle scope parameter (can be string or array)
    const scopeString = Array.isArray(scope) ? scope[0] || '' : scope || '';

    // Validate that the API connection belongs to the user
    const { PrismaClient } = require('../../../src/generated/prisma');
    const prisma = new PrismaClient();

    const apiConnection = await prisma.apiConnection.findFirst({
      where: {
        id: apiConnectionId,
        userId: user.id
      }
    });

    if (!apiConnection) {
      throw new ApplicationError('API connection not found', 404, 'NOT_FOUND');
    }

    // Validate OAuth2 configuration
    const config = {
      clientId,
      clientSecret,
      authorizationUrl: '', // Will be set by the service
      tokenUrl: '', // Will be set by the service
      redirectUri,
      scope: scopeString,
      state: provider
    };

    const validationErrors = oauth2Service.validateConfig(config);
    if (validationErrors.length > 0) {
      throw new ApplicationError(
        `Invalid OAuth2 configuration: ${validationErrors.join(', ')}`,
        400,
        'INVALID_CONFIG'
      );
    }

    // Check if provider is supported
    const supportedProviders = oauth2Service.getSupportedProviders();
    if (!supportedProviders.includes(provider)) {
      throw new ApplicationError(
        `Unsupported OAuth2 provider: ${provider}. Supported providers: ${supportedProviders.join(', ')}`,
        400,
        'UNSUPPORTED_PROVIDER'
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

    // Redirect to OAuth2 provider
    res.redirect(authorizationUrl);

  } catch (error) {
    console.error('OAuth2 authorization error:', error);

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