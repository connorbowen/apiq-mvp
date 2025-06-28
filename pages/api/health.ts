import { NextApiRequest, NextApiResponse } from 'next';
import { errorHandler, corsMiddleware } from '../../src/middleware/errorHandler';
import { rateLimiters } from '../../src/middleware/rateLimiter';
import { healthCheck as dbHealthCheck } from '../../src/database/init';
import { openaiService } from '../../src/services/openaiService';
import { encryptionService } from '../../src/utils/encryption';
import { logInfo } from '../../src/utils/logger';

/**
 * Health check API endpoint
 * Tests database connection, OpenAI service, and encryption
 */
async function healthHandler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  const startTime = Date.now();
  const healthChecks: Record<string, any> = {};

  try {
    // Database health check
    const dbHealth = await dbHealthCheck();
    healthChecks.database = dbHealth;

    // OpenAI service health check
    const openaiHealth = openaiService.validateConfig();
    healthChecks.openai = {
      status: openaiHealth ? 'healthy' : 'unhealthy',
      details: {
        configured: !!process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
      }
    };

    // Encryption service health check
    const encryptionHealth = encryptionService.validateKeyStrength();
    healthChecks.encryption = {
      status: encryptionHealth ? 'healthy' : 'warning',
      details: {
        keyLength: process.env.ENCRYPTION_KEY?.length || 0,
        isDefaultKey: process.env.ENCRYPTION_KEY === 'default-key-change-in-production'
      }
    };

    // Environment check
    healthChecks.environment = {
      status: 'healthy',
      details: {
        nodeEnv: process.env.NODE_ENV,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL
      }
    };

    // Determine overall health
    const allHealthy = Object.values(healthChecks).every(
      (check: any) => check.status === 'healthy'
    );

    const responseTime = Date.now() - startTime;

    logInfo('Health check completed', {
      overallStatus: allHealthy ? 'healthy' : 'unhealthy',
      responseTime: `${responseTime}ms`
    });

    res.status(allHealthy ? 200 : 503).json({
      success: true,
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      checks: healthChecks
    });

  } catch (error) {
    logInfo('Health check failed', { error });
    
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
      checks: healthChecks
    });
  }
}

// Apply middleware
const withRateLimit = rateLimiters.loose;
const withErrorHandling = errorHandler;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply CORS
  corsMiddleware(req, res);
  
  // Apply rate limiting
  await new Promise<void>((resolve, reject) => {
    withRateLimit(req, res, (error?: any) => {
      if (error) reject(error);
      else resolve();
    });
  });
  
  // Apply error handling and execute handler
  return withErrorHandling(healthHandler)(req, res);
} 