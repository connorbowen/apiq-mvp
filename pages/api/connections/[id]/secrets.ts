import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/database/client';
import { handleApiError } from '../../../../src/middleware/errorHandler';
import { logInfo, logError } from '../../../../src/utils/logger';
import { requireAuth, AuthenticatedRequest } from '../../../../src/lib/auth/session';
import { secretsVault } from '../../../../src/lib/secrets/secretsVault';
import { CreateSecretRequest } from '../../../../src/types';

// TODO: [SECRETS-FIRST-REFACTOR] Phase 4: Connection Secrets API
// - Add validation for connection-secret relationships
// - Add connection status updates based on secret health
// - Add secret rotation endpoints for connections
// - Add connection-secret dependency validation
// - Add audit logging for connection-secret operations
// - Add bulk operations for connection-secret management
// - Add connection-specific secret validation rules
// - Add connection-secret migration endpoints
// - Add connection status tracking in secret responses
// - Consider adding connection-secret health monitoring

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // Require authentication for all operations
    const user = await requireAuth(req, res);
    const { id: connectionId } = req.query;

    if (typeof connectionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid connection ID',
        code: 'VALIDATION_ERROR'
      });
    }

    // Verify the API connection exists and belongs to the user
    const apiConnection = await prisma.apiConnection.findFirst({
      where: {
        id: connectionId,
        userId: user.id
      }
    });

    if (!apiConnection) {
      return res.status(404).json({
        success: false,
        error: 'API connection not found',
        code: 'RESOURCE_NOT_FOUND'
      });
    }

    if (req.method === 'GET') {
      return await handleGetConnectionSecrets(req, res, user.id, connectionId, apiConnection);
    } else if (req.method === 'POST') {
      return await handleCreateConnectionSecret(req, res, user.id, connectionId, apiConnection);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
    }

  } catch (error) {
    return handleApiError(error, req, res);
  }
}

/**
 * Get secrets associated with a specific connection
 */
async function handleGetConnectionSecrets(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  connectionId: string,
  apiConnection: any
) {
  try {
    // Get secrets linked to this connection
    const secrets = await secretsVault.getSecretsForConnection(userId, connectionId);
    
    // Get connection-specific secret metadata
    const connectionSecrets = secrets.map(secret => ({
      id: secret.id,
      name: secret.name,
      type: secret.type,
      isActive: secret.isActive,
      version: secret.version,
      rotationEnabled: secret.rotationEnabled,
      rotationInterval: secret.rotationInterval,
      lastRotatedAt: secret.lastRotatedAt,
      nextRotationAt: secret.nextRotationAt,
      expiresAt: secret.expiresAt,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
      // Connection-specific metadata
      connectionId: secret.connectionId,
      connectionName: secret.connectionName
    }));

    logInfo('Retrieved connection secrets', {
      userId,
      connectionId,
      secretCount: connectionSecrets.length
    });

    return res.status(200).json({
      success: true,
      data: {
        connection: {
          id: apiConnection.id,
          name: apiConnection.name,
          authType: apiConnection.authType,
          secretId: apiConnection.secretId
        },
        secrets: connectionSecrets,
        total: connectionSecrets.length,
        hasSecrets: connectionSecrets.length > 0
      }
    });

  } catch (error) {
    logError('Failed to retrieve connection secrets', error instanceof Error ? error : new Error(String(error)), {
      userId,
      connectionId
    });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve connection secrets',
      code: 'SECRETS_RETRIEVAL_ERROR'
    });
  }
}

/**
 * Create a new secret for a specific connection
 */
async function handleCreateConnectionSecret(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  connectionId: string,
  apiConnection: any
) {
  try {
    const secretData: CreateSecretRequest = req.body;

    // Validate required fields
    if (!secretData.name || !secretData.value || !secretData.type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, value, type',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate secret value
    if (!secretData.value || typeof secretData.value !== 'string' || secretData.value.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Secret value must not be empty',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate secret type compatibility with connection auth type
    const isCompatible = validateSecretTypeCompatibility(secretData.type, apiConnection.authType);
    if (!isCompatible) {
      return res.status(400).json({
        success: false,
        error: `Secret type ${secretData.type} is not compatible with connection auth type ${apiConnection.authType}`,
        code: 'VALIDATION_ERROR'
      });
    }

    // Create the secret with connection reference
    const secret = await secretsVault.storeSecret(
      userId,
      secretData.name,
      { 
        value: secretData.value, 
        metadata: { 
          description: secretData.description
        } 
      },
      secretData.type,
      undefined, // expiresAt not supported in CreateSecretRequest
      {
        rotationEnabled: secretData.enableRotation || false,
        rotationInterval: secretData.rotationInterval
      },
      connectionId, // Pass connectionId as separate parameter
      apiConnection.name // Pass connectionName as separate parameter
    );

    // Link the secret to the connection if it's the primary secret
    if (!apiConnection.secretId) {
      await prisma.apiConnection.update({
        where: { id: connectionId },
        data: { secretId: secret.id }
      });
    }

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'connection_secret_created',
        resource: `api_connection:${connectionId}`,
        resourceId: secret.id,
        details: {
          secretType: secretData.type,
          connectionName: apiConnection.name,
          rotationEnabled: secretData.enableRotation || false
        },
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    });

    logInfo('Connection secret created', {
      userId,
      connectionId,
      secretId: secret.id,
      secretType: secretData.type
    });

    return res.status(201).json({
      success: true,
      data: {
        secret: {
          id: secret.id,
          name: secret.name,
          type: secret.type,
          isActive: secret.isActive,
          version: secret.version,
          rotationEnabled: secret.rotationEnabled,
          rotationInterval: secret.rotationInterval,
          lastRotatedAt: secret.lastRotatedAt,
          nextRotationAt: secret.nextRotationAt,
          expiresAt: secret.expiresAt,
          createdAt: secret.createdAt,
          updatedAt: secret.updatedAt,
          connectionId: secret.connectionId,
          connectionName: secret.connectionName
        },
        connection: {
          id: apiConnection.id,
          name: apiConnection.name,
          secretId: secret.id
        }
      },
      message: 'Connection secret created successfully'
    });

  } catch (error) {
    logError('Failed to create connection secret', error instanceof Error ? error : new Error(String(error)), {
      userId,
      connectionId
    });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create connection secret',
      code: 'SECRET_CREATION_ERROR'
    });
  }
}

/**
 * Validate that a secret type is compatible with a connection auth type
 */
function validateSecretTypeCompatibility(secretType: string, authType: string): boolean {
  const compatibilityMap: Record<string, string[]> = {
    'API_KEY': ['API_KEY'],
    'BEARER_TOKEN': ['BEARER_TOKEN'],
    'BASIC_AUTH_USERNAME': ['BASIC_AUTH'],
    'BASIC_AUTH_PASSWORD': ['BASIC_AUTH'],
    'OAUTH2_CLIENT_ID': ['OAUTH2'],
    'OAUTH2_CLIENT_SECRET': ['OAUTH2'],
    'OAUTH2_ACCESS_TOKEN': ['OAUTH2'],
    'OAUTH2_REFRESH_TOKEN': ['OAUTH2'],
    'WEBHOOK_SECRET': ['NONE', 'API_KEY', 'BEARER_TOKEN', 'BASIC_AUTH', 'OAUTH2', 'CUSTOM'],
    'SSH_KEY': ['CUSTOM'],
    'CERTIFICATE': ['CUSTOM'],
    'CUSTOM': ['NONE', 'API_KEY', 'BEARER_TOKEN', 'BASIC_AUTH', 'OAUTH2', 'CUSTOM']
  };

  const compatibleAuthTypes = compatibilityMap[secretType] || [];
  return compatibleAuthTypes.includes(authType);
} 