import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/database/client';
import { handleApiError } from '../../../../src/middleware/errorHandler';
import { logInfo, logError } from '../../../../src/utils/logger';
import { requireAuth, AuthenticatedRequest } from '../../../../src/lib/auth/session';
import { encryptionService } from '../../../../src/utils/encryption';
import { CreateApiCredentialRequest } from '../../../../src/types';

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
      // Get credentials for the API connection
      const credentials = await prisma.apiCredential.findFirst({
        where: {
          apiConnectionId: connectionId,
          userId: user.id,
          isActive: true
        }
      });

      if (!credentials) {
        return res.status(404).json({
          success: false,
          error: 'No credentials found for this API connection',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // Decrypt the credential data
      let decryptedData: any;
      try {
        const decryptedString = encryptionService.decrypt(credentials.encryptedData);
        decryptedData = JSON.parse(decryptedString);
      } catch (error) {
        logError('Failed to decrypt API credentials', error instanceof Error ? error : new Error(String(error)), {
          credentialId: credentials.id,
          connectionId,
          userId: user.id
        });
        
        return res.status(500).json({
          success: false,
          error: 'Failed to decrypt credentials',
          code: 'DECRYPTION_ERROR'
        });
      }

      // Return credential metadata (not the actual sensitive data)
      return res.status(200).json({
        success: true,
        data: {
          id: credentials.id,
          apiConnectionId: credentials.apiConnectionId,
          isActive: credentials.isActive,
          expiresAt: credentials.expiresAt,
          keyId: credentials.keyId,
          // Only return non-sensitive metadata about the credentials
          hasCredentials: true,
          credentialType: decryptedData.type || 'unknown',
          createdAt: credentials.createdAt,
          updatedAt: credentials.updatedAt
        }
      });

    } else if (req.method === 'POST') {
      // Store new credentials for the API connection
      const credentialData: CreateApiCredentialRequest = req.body;

      // Validate required fields
      if (!credentialData.credentialData) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: credentialData',
          code: 'VALIDATION_ERROR'
        });
      }

      // Check if credentials already exist for this connection
      const existingCredentials = await prisma.apiCredential.findFirst({
        where: {
          apiConnectionId: connectionId,
          userId: user.id
        }
      });

      if (existingCredentials) {
        return res.status(409).json({
          success: false,
          error: 'Credentials already exist for this API connection',
          code: 'RESOURCE_CONFLICT'
        });
      }

      // Encrypt the credential data
      let encryptedResult: { encryptedData: string; keyId: string };
      try {
        encryptedResult = encryptionService.encrypt(credentialData.credentialData);
      } catch (error) {
        logError('Failed to encrypt API credentials', error instanceof Error ? error : new Error(String(error)), {
          connectionId,
          userId: user.id
        });
        
        return res.status(500).json({
          success: false,
          error: 'Failed to encrypt credentials',
          code: 'ENCRYPTION_ERROR'
        });
      }

      // Store the encrypted credentials
      const newCredentials = await prisma.apiCredential.create({
        data: {
          userId: user.id,
          apiConnectionId: connectionId,
          encryptedData: encryptedResult.encryptedData,
          keyId: encryptedResult.keyId,
          isActive: true,
          expiresAt: credentialData.expiresAt
        }
      });

      // Log the credential creation for audit
      logInfo('API credentials created', {
        credentialId: newCredentials.id,
        connectionId,
        userId: user.id,
        keyId: encryptedResult.keyId
      });

      return res.status(201).json({
        success: true,
        data: {
          id: newCredentials.id,
          apiConnectionId: newCredentials.apiConnectionId,
          isActive: newCredentials.isActive,
          expiresAt: newCredentials.expiresAt,
          keyId: newCredentials.keyId,
          createdAt: newCredentials.createdAt,
          updatedAt: newCredentials.updatedAt
        },
        message: 'API credentials stored successfully'
      });

    } else if (req.method === 'PUT') {
      // Update existing credentials
      const credentialData: CreateApiCredentialRequest = req.body;

      // Validate required fields
      if (!credentialData.credentialData) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: credentialData',
          code: 'VALIDATION_ERROR'
        });
      }

      // Find existing credentials
      const existingCredentials = await prisma.apiCredential.findFirst({
        where: {
          apiConnectionId: connectionId,
          userId: user.id
        }
      });

      if (!existingCredentials) {
        return res.status(404).json({
          success: false,
          error: 'No credentials found to update',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // Encrypt the new credential data
      let encryptedResult: { encryptedData: string; keyId: string };
      try {
        encryptedResult = encryptionService.encrypt(credentialData.credentialData);
      } catch (error) {
        logError('Failed to encrypt updated API credentials', error instanceof Error ? error : new Error(String(error)), {
          credentialId: existingCredentials.id,
          connectionId,
          userId: user.id
        });
        
        return res.status(500).json({
          success: false,
          error: 'Failed to encrypt credentials',
          code: 'ENCRYPTION_ERROR'
        });
      }

      // Update the credentials
      const updatedCredentials = await prisma.apiCredential.update({
        where: { id: existingCredentials.id },
        data: {
          encryptedData: encryptedResult.encryptedData,
          keyId: encryptedResult.keyId,
          expiresAt: credentialData.expiresAt,
          updatedAt: new Date()
        }
      });

      // Log the credential update for audit
      logInfo('API credentials updated', {
        credentialId: updatedCredentials.id,
        connectionId,
        userId: user.id,
        keyId: encryptedResult.keyId
      });

      return res.status(200).json({
        success: true,
        data: {
          id: updatedCredentials.id,
          apiConnectionId: updatedCredentials.apiConnectionId,
          isActive: updatedCredentials.isActive,
          expiresAt: updatedCredentials.expiresAt,
          keyId: updatedCredentials.keyId,
          createdAt: updatedCredentials.createdAt,
          updatedAt: updatedCredentials.updatedAt
        },
        message: 'API credentials updated successfully'
      });

    } else if (req.method === 'DELETE') {
      // Delete credentials for the API connection
      const existingCredentials = await prisma.apiCredential.findFirst({
        where: {
          apiConnectionId: connectionId,
          userId: user.id
        }
      });

      if (!existingCredentials) {
        return res.status(404).json({
          success: false,
          error: 'No credentials found to delete',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // Soft delete by setting isActive to false
      await prisma.apiCredential.update({
        where: { id: existingCredentials.id },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      // Log the credential deletion for audit
      logInfo('API credentials deleted', {
        credentialId: existingCredentials.id,
        connectionId,
        userId: user.id
      });

      return res.status(200).json({
        success: true,
        message: 'API credentials deleted successfully'
      });

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