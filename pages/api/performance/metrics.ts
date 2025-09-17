import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth, AuthenticatedRequest } from '../../../src/lib/auth/session';
import { PerformanceMonitor } from '../../../src/lib/services/performanceMonitor';
import { AICacheService } from '../../../src/lib/services/aiCacheService';
import { errorHandler } from '../../../src/middleware/errorHandler';

interface PerformanceMetricsResponse {
  success: boolean;
  data?: {
    performance: any;
    cache: any;
    trends: any;
    recommendations: string[];
  };
  error?: string;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse<PerformanceMetricsResponse>) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const user = await requireAuth(req, res);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Only allow admin users to view performance metrics
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const performanceMonitor = PerformanceMonitor.getInstance();
    const cacheService = AICacheService.getInstance();

    const performance = performanceMonitor.getMetrics();
    const cache = cacheService.getStats();
    const trends = performanceMonitor.getTrends();

    console.log('📊 Performance metrics requested:', {
      userId: user.id,
      totalRequests: performance.totalRequests,
      averageResponseTime: performance.averageResponseTime,
      successRate: performance.successRate
    });

    return res.status(200).json({
      success: true,
      data: {
        performance,
        cache,
        trends,
        recommendations: trends.recommendations
      }
    });

  } catch (error) {
    console.error('Performance metrics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics'
    });
  }
}

export default errorHandler(handler);
