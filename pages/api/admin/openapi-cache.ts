import { NextApiRequest, NextApiResponse } from 'next';
import { openApiService } from '../../../src/services/openApiService';
import { logAuditEvent } from '../../../src/utils/logger';

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
  // Only allow GET and DELETE methods
  if (!['GET', 'DELETE'].includes(req.method || '')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check admin authorization
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      // Get cache statistics
      const stats = openApiService.getCacheStats();
      
      logAuditEvent('view', 'openapi-cache', 'admin', undefined, {
        cacheSize: stats.size,
        totalSizeBytes: stats.totalSizeBytes,
      });

      return res.status(200).json({
        success: true,
        data: stats,
      });

    } else if (req.method === 'DELETE') {
      // Clear the cache
      openApiService.clearCache();
      
      logAuditEvent('clear', 'openapi-cache', 'admin');

      return res.status(200).json({
        success: true,
        message: 'OpenAPI cache cleared successfully',
      });
    }

  } catch (error) {
    console.error('OpenAPI cache admin error:', error);
    
    logAuditEvent('error', 'openapi-cache', 'admin', undefined, {
      error: (error as Error).message,
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
} 