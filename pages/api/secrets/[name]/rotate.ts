import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../../src/lib/auth/session';
import { SecretsVault } from '../../../../src/lib/secrets/secretsVault';
import { prisma } from '../../../../lib/database/client';
import { logError, logInfo } from '../../../../src/utils/logger';

const secretsVault = new SecretsVault(prisma);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get user from JWT token
    const user = await requireAuth(req, res);
    const userId = user.id;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name } = req.query;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Secret name is required' });
    }

    // Rotate the secret
    const rotatedSecret = await secretsVault.rotateSecret(userId, name);

    logInfo('Secret rotated via API', { userId, secretName: name });
    return res.status(200).json({ 
      success: true, 
      data: rotatedSecret,
      message: 'Secret rotated successfully'
    });
  } catch (error: any) {
    // Return 401 for authentication errors
    if (
      error?.code === 'UNAUTHORIZED' ||
      error?.message?.toLowerCase().includes('auth') ||
      error?.message?.toLowerCase().includes('token') ||
      error?.message?.toLowerCase().includes('expired')
    ) {
      logError('Secret rotation API auth error', error);
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    logError('Secret rotation API error', error as Error);
    return res.status(500).json({ error: 'Failed to rotate secret' });
  }
} 