import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/database/client';
import { encryptData } from '../../../src/utils/encryption';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const user = await requireAuth(req, res);

    if (req.method === 'GET') {
      // Get all connections for the user
      const connections = await prisma.apiConnection.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          description: true,
          authType: true,
          baseUrl: true,
          status: true,
          connectionStatus: true,
          ingestionStatus: true,
          lastTested: true,
          createdAt: true,
          updatedAt: true,
          authConfig: true,
          documentationUrl: true,
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json({
        success: true,
        data: { connections }
      });
    }

    if (req.method === 'POST') {
      const { name, description, authType, baseUrl, authConfig } = req.body;

      if (!name || !authType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Create connection
      const connection = await prisma.apiConnection.create({
        data: {
          name,
          description: description || '',
          authType,
          baseUrl: baseUrl || '',
          authConfig: authConfig || {},
          userId: user.id,
        }
      });

      return res.status(201).json({
        success: true,
        data: {
          id: connection.id,
          name: connection.name,
          description: connection.description,
          authType: connection.authType,
          baseUrl: connection.baseUrl,
          status: connection.status,
          createdAt: connection.createdAt
        }
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error creating connection:', error);
    return res.status(500).json({ 
      error: 'Failed to create connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 