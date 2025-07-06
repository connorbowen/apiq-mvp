import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../src/lib/auth/session';
import { SecretsVault } from '../../../src/lib/secrets/secretsVault';
import { prisma } from '../../../lib/database/client';
import { logError, logInfo } from '../../../src/utils/logger';
import { errorHandler } from '../../../src/middleware/errorHandler';

// Simple in-memory rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // 100 requests per window for testing

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

  switch (req.method) {
    case 'GET':
      return await handleGetSecrets(req, res, userId);
    case 'POST':
      return await handleCreateSecret(req, res, userId);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

export default errorHandler(handler);

async function handleGetSecrets(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const secrets = await secretsVault.listSecrets(userId);
    logInfo('Secrets retrieved', { userId, count: secrets.length });
    return res.status(200).json({ data: secrets });
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
      rotationInterval 
    } = req.body;

    if (!name || !value) {
      return res.status(400).json({ error: 'Name and value are required' });
    }

    const secretData = {
      value,
      metadata: {
        description,
        createdAt: new Date().toISOString()
      }
    };

    console.log('Creating secret with data:', { name, type, userId, hasValue: !!value });

    const secret = await secretsVault.storeSecret(
      userId,
      name,
      secretData,
      type || 'custom',
      expiresAt ? new Date(expiresAt) : undefined,
      {
        rotationEnabled: rotationEnabled || false,
        rotationInterval: rotationInterval || undefined
      }
    );

    logInfo('Secret created', { userId, secretId: secret.id, name });
    return res.status(201).json({ data: secret });
  } catch (error) {
    console.error('Detailed error in handleCreateSecret:', error);
    logError('Failed to create secret', error as Error);
    return res.status(500).json({ error: 'Failed to create secret' });
  }
} 