import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../src/lib/auth/session';
import { SecretsVault } from '../../../src/lib/secrets/secretsVault';
import { prisma } from '../../../lib/database/client';
import { logError, logInfo } from '../../../src/utils/logger';
import { errorHandler } from '../../../src/middleware/errorHandler';

// Simple in-memory rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 50; // 50 requests per window for testing (increased from 10)

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `secrets:${userId}`;
  const userLimit = rateLimitStore.get(key);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  userLimit.count++;
  return { allowed: true };
}

// Helper: get required secret types for a given auth type
function getRequiredSecretTypesForAuthType(authType: string): (
  'API_KEY' | 'BEARER_TOKEN' | 'CUSTOM' | 'BASIC_AUTH_USERNAME' | 'BASIC_AUTH_PASSWORD' | 'OAUTH2_CLIENT_ID' | 'OAUTH2_CLIENT_SECRET' | 'OAUTH2_ACCESS_TOKEN' | 'OAUTH2_REFRESH_TOKEN' | 'WEBHOOK_SECRET' | 'SSH_KEY' | 'CERTIFICATE'
)[] {
  switch (authType) {
    case 'API_KEY':
      return ['API_KEY'];
    case 'BEARER_TOKEN':
      return ['BEARER_TOKEN'];
    case 'BASIC_AUTH':
      return ['BASIC_AUTH_USERNAME', 'BASIC_AUTH_PASSWORD'];
    case 'OAUTH2':
      return ['OAUTH2_CLIENT_ID', 'OAUTH2_CLIENT_SECRET', 'OAUTH2_ACCESS_TOKEN', 'OAUTH2_REFRESH_TOKEN'];
    default:
      return [];
  }
}

const secretsVault = new SecretsVault(prisma);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  let user: { id: string } | null = null;
  let rateLimitKey = req.socket.remoteAddress || 'unknown';

  // Try to get user ID for rate limiting, but don't throw if not authenticated
  try {
    user = await requireAuth(req, res);
    rateLimitKey = user.id;
  } catch {
    // Not authenticated, use IP for rate limiting
  }

  // Check rate limit before any further processing
  const rateLimit = checkRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', rateLimit.retryAfter?.toString() || '900');
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: rateLimit.retryAfter,
    });
  }

  // Now require authentication for all further actions
  if (!user) {
    user = await requireAuth(req, res);
  }
  const userId = user.id;

  // Route for audit log listing
  if (req.method === 'GET' && req.url?.endsWith('/audit')) {
    return await handleGetAuditLogs(req, res, userId);
  }

  switch (req.method) {
    case 'GET':
      return await handleGetSecrets(req, res, userId);
    case 'POST':
      if (req.url?.endsWith('/rotate')) {
        return await handleRotateSecret(req, res, userId);
      }
      return await handleCreateSecret(req, res, userId);
    case 'DELETE':
      return await handleBulkDeleteSecrets(req, res, userId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

export default errorHandler(handler);

async function handleGetSecrets(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { connectionId } = req.query;
    let secrets;
    let connectionHealth = undefined;
    if (connectionId && typeof connectionId === 'string') {
      // Validate connection exists
      const connection = await prisma.apiConnection.findUnique({ where: { id: connectionId, userId } });
      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }
      secrets = await secretsVault.getSecretsForConnection(userId, connectionId);
      // Compute health using validateConnectionSecrets
      const { validateConnectionSecrets } = await import('../../../src/lib/services/connectionService');
      const requiredTypes = getRequiredSecretTypesForAuthType(connection.authType);
      connectionHealth = await validateConnectionSecrets(userId, connectionId, requiredTypes);
    } else {
      secrets = await secretsVault.listSecrets(userId);
    }
    logInfo('Secrets retrieved', { userId, count: secrets.length });
    // Include connectionId and connectionName in response
    const responseSecrets = secrets.map(secret => ({
      id: secret.id,
      name: secret.name,
      type: secret.type,
      description: (secret as any).description,
      isActive: secret.isActive,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
      rotationEnabled: secret.rotationEnabled,
      rotationInterval: secret.rotationInterval,
      lastRotatedAt: secret.lastRotatedAt,
      nextRotationAt: secret.nextRotationAt,
      connectionId: secret.connectionId,
      connectionName: secret.connectionName
    }));
    const response: { success: true; data: { secrets: typeof responseSecrets; connectionHealth?: any } } = { success: true, data: { secrets: responseSecrets } };
    if (connectionHealth) {
      response.data.connectionHealth = connectionHealth;
    }
    return res.status(200).json(response);
  } catch (error) {
    logError('Failed to retrieve secrets', error as Error);
    return res.status(500).json({ error: 'Failed to retrieve secrets' });
  }
}

async function handleCreateSecret(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { 
      name, 
      value, 
      type, 
      description, 
      expiresAt,
      rotationEnabled,
      rotationInterval,
      connectionId
    } = req.body;

    if (!name || !value) {
      return res.status(400).json({ error: 'Name and value are required' });
    }
    if (!value || typeof value !== 'string' || value.trim() === '') {
      return res.status(400).json({ success: false, error: 'Secret value must not be empty.' });
    }

    const secretData = {
      value,
      metadata: {
        description,
        createdAt: new Date().toISOString()
      }
    };

    let secret;
    if (connectionId && typeof connectionId === 'string') {
      // Validate connection exists
      const connection = await prisma.apiConnection.findUnique({ where: { id: connectionId, userId } });
      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }
      secret = await secretsVault.createSecretFromConnection(
        userId,
        connectionId,
        name,
        secretData,
        type || 'CUSTOM',
        connection.name
      );
    } else {
      secret = await secretsVault.storeSecret(
        userId,
        name,
        secretData,
        type || 'CUSTOM',
        expiresAt ? new Date(expiresAt) : undefined,
        {
          rotationEnabled: rotationEnabled || false,
          rotationInterval: rotationInterval || undefined
        }
      );
    }

    logInfo('Secret created', { userId, secretId: secret.id, name });
    // Log the full secret object for debugging
    console.log('Full secret object from vault:', JSON.stringify(secret, null, 2));
    // Return the secret with all required fields for the frontend
    const responseSecret = {
      id: secret.id,
      name: secret.name,
      type: secret.type,
      description: (secret as any).description,
      isActive: secret.isActive,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
      rotationEnabled: secret.rotationEnabled,
      rotationInterval: secret.rotationInterval,
      lastRotatedAt: secret.lastRotatedAt,
      nextRotationAt: secret.nextRotationAt,
      connectionId: secret.connectionId,
      connectionName: secret.connectionName
    };
    console.log('Response secret object:', JSON.stringify(responseSecret, null, 2));
    return res.status(201).json({ 
      success: true, 
      data: {
        secret: responseSecret,
        message: 'Secret created successfully'
      }
    });
  } catch (error) {
    console.error('Detailed error in handleCreateSecret:', error);
    logError('Failed to create secret', error as Error);
    return res.status(500).json({ error: 'Failed to create secret' });
  }
} 

// POST /api/secrets/rotate
async function handleRotateSecret(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { secretName, connectionId } = req.body;
    if (!secretName && !connectionId) {
      return res.status(400).json({ error: 'Either secretName or connectionId is required.' });
    }
    let rotatedSecrets: any[] = [];
    let auditLogs: any[] = [];
    if (secretName) {
      // Rotate a single secret
      const rotated = await secretsVault.rotateSecret(userId, secretName);
      rotatedSecrets.push(rotated);
      // Fetch audit logs for this secret
      const logs = await prisma.auditLog.findMany({
        where: { userId, resource: 'SECRET', resourceId: rotated.id, action: 'SECRET_ROTATED' },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      auditLogs = logs;
    } else if (connectionId) {
      // Validate connection exists
      const connection = await prisma.apiConnection.findUnique({ where: { id: connectionId, userId } });
      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }
      // Rotate all secrets for the connection
      const { rotateAllConnectionSecrets } = await import('../../../src/lib/services/connectionService');
      rotatedSecrets = await rotateAllConnectionSecrets(userId, connectionId);
      // Fetch audit logs for all rotated secrets
      const secretIds = rotatedSecrets.map((s: any) => s.id);
      auditLogs = await prisma.auditLog.findMany({
        where: { userId, resource: 'SECRET', resourceId: { in: secretIds }, action: 'SECRET_ROTATED' },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        rotatedSecrets,
        auditLogs
      }
    });
  } catch (error) {
    logError('Failed to rotate secret(s)', error as Error);
    return res.status(500).json({ error: 'Failed to rotate secret(s)' });
  }
} 

// DELETE /api/secrets (bulk delete by connectionId or secretNames)
async function handleBulkDeleteSecrets(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { connectionId, secretNames } = req.body;
    let deletedSecrets: any[] = [];
    let auditLogs: any[] = [];
    if (!connectionId && (!secretNames || !Array.isArray(secretNames) || secretNames.length === 0)) {
      return res.status(400).json({ error: 'Either connectionId or secretNames[] is required.' });
    }
    if (connectionId) {
      // Validate connection exists
      const connection = await prisma.apiConnection.findUnique({ where: { id: connectionId, userId } });
      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }
      // Get all secrets for the connection
      const secrets = await secretsVault.getSecretsForConnection(userId, connectionId);
      for (const secret of secrets) {
        await secretsVault.deleteSecret(userId, secret.name);
        deletedSecrets.push(secret);
      }
      // Fetch audit logs for deleted secrets
      const secretIds = secrets.map((s: any) => s.id);
      auditLogs = await prisma.auditLog.findMany({
        where: { userId, resource: 'SECRET', resourceId: { in: secretIds }, action: 'SECRET_DELETED' },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
    } else if (secretNames && Array.isArray(secretNames)) {
      for (const name of secretNames) {
        try {
          const secret = await prisma.secret.findFirst({ where: { userId, name, isActive: true } });
          if (secret) {
            await secretsVault.deleteSecret(userId, name);
            deletedSecrets.push(secret);
          }
        } catch (e) {
          // Continue deleting others
        }
      }
      // Fetch audit logs for deleted secrets
      const secretIds = deletedSecrets.map((s: any) => s.id);
      auditLogs = await prisma.auditLog.findMany({
        where: { userId, resource: 'SECRET', resourceId: { in: secretIds }, action: 'SECRET_DELETED' },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        deletedSecrets,
        auditLogs
      }
    });
  } catch (error) {
    logError('Failed to bulk delete secrets', error as Error);
    return res.status(500).json({ error: 'Failed to bulk delete secrets' });
  }
}

// GET /api/secrets/audit (list audit logs for secrets)
async function handleGetAuditLogs(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const { connectionId, secretName, action, startDate, endDate } = req.query;
    let where: any = { userId, resource: 'SECRET' };
    if (action && typeof action === 'string') {
      where.action = action;
    }
    if (secretName && typeof secretName === 'string') {
      // Find secret by name to get id
      const secret = await prisma.secret.findFirst({ where: { userId, name: secretName, isActive: false } });
      if (secret) {
        where.resourceId = secret.id;
      }
    }
    if (connectionId && typeof connectionId === 'string') {
      // Find all secrets for the connection
      const secrets = await prisma.secret.findMany({ where: { userId, connectionId, isActive: false } });
      const secretIds = secrets.map((s: any) => s.id);
      where.resourceId = { in: secretIds };
    }
    if (startDate && typeof startDate === 'string') {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    }
    if (endDate && typeof endDate === 'string') {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return res.status(200).json({
      success: true,
      data: {
        auditLogs
      }
    });
  } catch (error) {
    logError('Failed to fetch audit logs', error as Error);
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
} 