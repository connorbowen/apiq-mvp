import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/database/client';
import { requireAuth } from '../../../src/lib/auth/session';
import { autoFetchLogo, batchUpdateLogos, extractDomainFromUrl } from '../../../src/lib/utils/logoService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require admin authentication
    const user = await requireAuth(req, res);
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { apiId, apiName } = req.body;

    let apis;
    
    if (apiId) {
      // Update specific API by ID
      const api = await prisma.apiCatalog.findUnique({
        where: { id: apiId }
      });
      apis = api ? [api] : [];
    } else if (apiName) {
      // Update APIs by name pattern
      apis = await prisma.apiCatalog.findMany({
        where: {
          name: {
            contains: apiName,
            mode: 'insensitive'
          }
        }
      });
    } else {
      // Update all APIs
      apis = await prisma.apiCatalog.findMany({
        where: { status: 'ACTIVE' }
      });
    }

    if (apis.length === 0) {
      return res.status(404).json({ error: 'No APIs found' });
    }

    // Use batch update for better performance
    const updateResults = await batchUpdateLogos(apis.map(api => ({
      id: api.id,
      name: api.name,
      baseUrl: api.baseUrl,
      logoUrl: api.logoUrl || undefined
    })));

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const result of updateResults) {
      if (result.success && result.logoUrl) {
        // Update database with new logo
        await prisma.apiCatalog.update({
          where: { id: result.id },
          data: { logoUrl: result.logoUrl }
        });
        
        results.push({
          id: result.id,
          name: result.name,
          status: 'success',
          logoUrl: result.logoUrl
        });
        successCount++;
      } else {
        results.push({
          id: result.id,
          name: result.name,
          status: 'failed',
          reason: result.error || 'Logo not found',
          logoUrl: result.logoUrl
        });
        failCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Updated ${successCount} logos, ${failCount} failed`,
      results,
      summary: {
        total: apis.length,
        success: successCount,
        failed: failCount
      }
    });

  } catch (error) {
    console.error('Logo update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
