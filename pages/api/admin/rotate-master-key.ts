import { NextApiRequest, NextApiResponse } from 'next';
import { SecretsVault } from '../../../src/lib/secrets/secretsVault';
import { prisma } from '../../../lib/database/client';
import { logAuditEvent, logError, logInfo } from '../../../src/utils/logger';

// Simple admin check - in production, use proper RBAC
function isAdmin(req: NextApiRequest): boolean {
  // Check for admin header or token
  const adminToken = req.headers['x-admin-token'];
  const expectedToken = process.env.ADMIN_TOKEN;
  
  if (!expectedToken) {
    console.warn('ADMIN_TOKEN not configured');
    return false;
  }
  
  return adminToken === expectedToken;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check admin authorization
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    logInfo('Starting master key rotation via admin API');
    
    // Initialize secrets vault
    const secretsVault = new SecretsVault(prisma);
    
    // Check vault health before rotation
    const healthBefore = await secretsVault.getHealthStatus();
    logInfo('Vault health before rotation', {
      status: healthBefore.status,
      activeSecrets: healthBefore.activeSecrets,
      keyCount: healthBefore.keyCount
    });
    
    if (healthBefore.status === 'error') {
      logError('Cannot rotate keys: vault is in error state');
      return res.status(500).json({
        success: false,
        error: 'Vault is in error state. Cannot proceed with rotation.'
      });
    }
    
    // Perform key rotation
    await secretsVault.rotateKeys();
    
    // Check vault health after rotation
    const healthAfter = await secretsVault.getHealthStatus();
    logInfo('Vault health after rotation', {
      status: healthAfter.status,
      activeSecrets: healthAfter.activeSecrets,
      keyCount: healthAfter.keyCount,
      lastRotation: healthAfter.lastRotation
    });
    
    // Log audit event
    logAuditEvent('rotate', 'master-key', 'admin', undefined, {
      status: healthAfter.status,
      activeSecrets: healthAfter.activeSecrets,
      keyCount: healthAfter.keyCount,
      lastRotation: healthAfter.lastRotation?.toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'Master key rotated successfully',
      data: {
        status: healthAfter.status,
        activeSecrets: healthAfter.activeSecrets,
        keyCount: healthAfter.keyCount,
        lastRotation: healthAfter.lastRotation?.toISOString()
      }
    });

  } catch (error) {
    logError('Master key rotation failed', error as Error);
    
    logAuditEvent('error', 'master-key-rotation', 'admin', undefined, {
      error: (error as Error).message
    });

    return res.status(500).json({
      success: false,
      error: 'Master key rotation failed',
      details: (error as Error).message
    });
  }
} 