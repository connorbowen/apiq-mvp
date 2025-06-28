import { NextApiRequest, NextApiResponse } from 'next';
import { logError, handleError } from '../utils/logger';
import { AppError } from '../types';

// Extend NextApiRequest to include session
interface AuthenticatedRequest extends NextApiRequest {
  session?: {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  };
}

/**
 * Custom error class for application-specific errors
 */
export class ApplicationError extends Error implements AppError {
  public statusCode: number;
  public code: string;
  public details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Common error types
 */
export const Errors = {
  // Authentication errors
  UNAUTHORIZED: (message: string = 'Unauthorized') => 
    new ApplicationError(message, 401, 'UNAUTHORIZED'),
  
  FORBIDDEN: (message: string = 'Forbidden') => 
    new ApplicationError(message, 403, 'FORBIDDEN'),
  
  // Validation errors
  VALIDATION_ERROR: (message: string, details?: Record<string, any>) => 
    new ApplicationError(message, 400, 'VALIDATION_ERROR', details),
  
  // Resource errors
  NOT_FOUND: (message: string = 'Resource not found') => 
    new ApplicationError(message, 404, 'NOT_FOUND'),
  
  CONFLICT: (message: string = 'Resource conflict') => 
    new ApplicationError(message, 409, 'CONFLICT'),
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: (message: string = 'Rate limit exceeded') => 
    new ApplicationError(message, 429, 'RATE_LIMIT_EXCEEDED'),
  
  // Server errors
  INTERNAL_ERROR: (message: string = 'Internal server error') => 
    new ApplicationError(message, 500, 'INTERNAL_ERROR'),
  
  SERVICE_UNAVAILABLE: (message: string = 'Service unavailable') => 
    new ApplicationError(message, 503, 'SERVICE_UNAVAILABLE'),
  
  // Database errors
  DATABASE_ERROR: (message: string = 'Database error') => 
    new ApplicationError(message, 500, 'DATABASE_ERROR'),
  
  // API errors
  API_ERROR: (message: string, statusCode: number = 500) => 
    new ApplicationError(message, statusCode, 'API_ERROR'),
  
  // Workflow errors
  WORKFLOW_ERROR: (message: string, details?: Record<string, any>) => 
    new ApplicationError(message, 400, 'WORKFLOW_ERROR', details),
  
  // OpenAI errors
  OPENAI_ERROR: (message: string = 'OpenAI service error') => 
    new ApplicationError(message, 500, 'OPENAI_ERROR')
};

/**
 * Error handler middleware for Next.js API routes
 */
export const errorHandler = (
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      handleApiError(error, req, res);
    }
  };
};

/**
 * Handle API errors and send appropriate responses
 */
export const handleApiError = (
  error: unknown,
  req: NextApiRequest,
  res: NextApiResponse
) => {
  let appError: AppError;

  // Convert different error types to ApplicationError
  if (error instanceof ApplicationError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new ApplicationError(
      error.message,
      500,
      'INTERNAL_ERROR',
      { originalError: error.name }
    );
  } else {
    appError = new ApplicationError(
      'An unexpected error occurred',
      500,
      'INTERNAL_ERROR'
    );
  }

  // Log the error with context
  logError('API Error', appError, {
    method: req.method,
    url: req.url || 'unknown',
    statusCode: appError.statusCode,
    userAgent: req.headers['user-agent'],
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown'
  });

  // Send error response
  const errorResponse = handleError(appError, 'API Request');
  
  res.status(appError.statusCode).json({
    success: false,
    error: errorResponse.message,
    code: appError.code,
    ...(process.env.NODE_ENV !== 'production' && {
      details: appError.details,
      stack: appError.stack
    })
  });
};

/**
 * Validation middleware
 */
export const validateRequest = (
  schema: any,
  req: NextApiRequest,
  res: NextApiResponse
): boolean => {
  try {
    // Basic validation - can be extended with Joi, Zod, or similar
    if (!req.body && req.method && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
      throw Errors.VALIDATION_ERROR('Request body is required');
    }
    
    // Add more validation logic here based on schema
    return true;
  } catch (error) {
    if (error instanceof ApplicationError) {
      throw error;
    }
    throw Errors.VALIDATION_ERROR('Invalid request data');
  }
};

/**
 * Authentication middleware
 */
export const requireAuth = (req: AuthenticatedRequest, res: NextApiResponse): void => {
  // This would integrate with NextAuth.js or your auth system
  const session = req.session;
  
  if (!session || !session.user) {
    throw Errors.UNAUTHORIZED('Authentication required');
  }
};

/**
 * Authorization middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: NextApiResponse): void => {
    requireAuth(req, res);
    
    const session = req.session;
    const userRole = session?.user?.role;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      throw Errors.FORBIDDEN('Insufficient permissions');
    }
  };
};

/**
 * Rate limiting middleware (basic implementation)
 */
export const rateLimiter = (
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: NextApiRequest, res: NextApiResponse): void => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const key = `rate_limit:${ip}`;
    
    const now = Date.now();
    const userRequests = requests.get(key);
    
    if (!userRequests || now > userRequests.resetTime) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
    } else if (userRequests.count >= maxRequests) {
      throw Errors.RATE_LIMIT_EXCEEDED();
    } else {
      userRequests.count++;
    }
  };
};

/**
 * CORS middleware
 */
export const corsMiddleware = (req: NextApiRequest, res: NextApiResponse) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    console.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
}; 