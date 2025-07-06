import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../../src/lib/auth/session';
import { SecretsVault } from '../../../../src/lib/secrets/secretsVault';
import { prisma } from '../../../../lib/database/client';
import { logError, logInfo } from '../../../../src/utils/logger';
import { errorHandler } from '../../../../src/middleware/errorHandler';

const secretsVault = new SecretsVault(prisma);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Require authentication for all operations
    const user = await requireAuth(req, res);
    const userId = user.id;
    const { name } = req.query;
    
    console.log('[API] /api/secrets/[name] called', { method: req.method, userId, name });
    
    if (!name || typeof name !== 'string') {
      console.log('[API] Missing secret name parameter', { name });
      return res.status(400).json({ 
        success: false,
        error: 'Secret name or ID is required',
        code: 'MISSING_PARAMETER'
      });
    }

    // Try to find secret by ID first, then by name
    let secret = await prisma.secret.findFirst({ 
      where: { 
        id: name,
        userId, 
        isActive: true 
      } 
    });
    console.log('[API] Lookup by ID result:', { found: !!secret, id: name });

    // If not found by ID, try by name
    if (!secret) {
      secret = await prisma.secret.findFirst({ 
        where: { 
          name,
          userId, 
          isActive: true 
        } 
      });
      console.log('[API] Lookup by name result:', { found: !!secret, name });
    }
    
    if (!secret) {
      console.log('[API] Secret not found', { userId, name });
      return res.status(404).json({ 
        success: false,
        error: 'Secret not found',
        code: 'SECRET_NOT_FOUND'
      });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetSecret(req, res, secret);
      case 'DELETE':
        return await handleDeleteSecret(req, res, secret);
      case 'PATCH':
        return await handleUpdateSecret(req, res, secret);
      default:
        console.log('[API] Method not allowed', { method: req.method });
        return res.status(405).json({ 
          success: false,
          error: 'Method not allowed',
          code: 'METHOD_NOT_ALLOWED'
        });
    }
  }
  catch (error: any) {
    let errMsg = (error instanceof Error) ? error.message : String(error);
    let errCode = error?.code || undefined;
    console.log('[API] Handler error', { error: errMsg, code: errCode });
    if (
      error?.code === 'UNAUTHORIZED' ||
      error?.message?.toLowerCase().includes('auth') ||
      error?.message?.toLowerCase().includes('token') ||
      error?.message?.toLowerCase().includes('expired')
    ) {
      logError('Secret API auth error', error);
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }
    logError('Secret API error', error as Error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

async function handleGetSecret(req: NextApiRequest, res: NextApiResponse, secret: any) {
  try {
    console.log('[API] handleGetSecret called', { userId: secret.userId, secretName: secret.name });
    // Get the actual secret value using SecretsVault (this will trigger access audit log)
    const secretData = await secretsVault.getSecret(secret.userId, secret.name);
    console.log('[API] Secret data retrieved', { hasValue: !!secretData.value });
    // Return secret metadata with the actual value
    const responseData = {
      id: secret.id,
      name: secret.name,
      type: secret.type,
      value: secretData.value, // Include the actual secret value
      description: secret.metadata?.description,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
      expiresAt: secret.expiresAt,
      rotationEnabled: secret.rotationEnabled,
      rotationInterval: secret.rotationInterval,
      lastRotatedAt: secret.lastRotatedAt,
      nextRotationAt: secret.nextRotationAt,
      isActive: secret.isActive
    };
    logInfo('Secret retrieved', { userId: secret.userId, secretId: secret.id, secretName: secret.name });
    return res.status(200).json({ 
      success: true,
      data: responseData 
    });
  } catch (error) {
    let errMsg = (error instanceof Error) ? error.message : String(error);
    console.log('[API] Error in handleGetSecret', { error: errMsg });
    logError('Failed to retrieve secret', error as Error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve secret',
      code: 'INTERNAL_ERROR'
    });
  }
}

async function handleDeleteSecret(req: NextApiRequest, res: NextApiResponse, secret: any) {
  try {
    // Soft delete by setting isActive to false
    await prisma.secret.update({
      where: { id: secret.id },
      data: { isActive: false }
    });

    logInfo('Secret deleted', { userId: secret.userId, secretId: secret.id, secretName: secret.name });
    return res.status(200).json({ 
      success: true, 
      message: 'Secret deleted successfully' 
    });
  } catch (error) {
    logError('Failed to delete secret', error as Error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to delete secret',
      code: 'INTERNAL_ERROR'
    });
  }
}

async function handleUpdateSecret(req: NextApiRequest, res: NextApiResponse, secret: any) {
  try {
    // Update rotation settings
    const { rotationEnabled, rotationInterval } = req.body;
    let nextRotationAt = secret.nextRotationAt;
    
    if (rotationEnabled && rotationInterval) {
      nextRotationAt = new Date(Date.now() + rotationInterval * 24 * 60 * 60 * 1000);
    } else if (!rotationEnabled) {
      nextRotationAt = null;
    }
    
    const updated = await prisma.secret.update({
      where: { id: secret.id },
      data: {
        rotationEnabled,
        rotationInterval,
        nextRotationAt
      }
    });
    
    logInfo('Secret rotation settings updated', { userId: secret.userId, secretId: secret.id, secretName: secret.name });
    return res.status(200).json({ 
      success: true, 
      data: updated 
    });
  } catch (error) {
    logError('Failed to update secret', error as Error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to update secret',
      code: 'INTERNAL_ERROR'
    });
  }
}

export default errorHandler(handler); 