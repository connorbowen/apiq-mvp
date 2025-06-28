import winston from 'winston';

/**
 * Structured logging utility using Winston
 * Supports different log levels and transports
 */

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'apiq-mvp' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport for production logs
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ] : [])
  ]
});

// Add request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
};

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Structured logging methods
export const logError = (message: string, error?: Error, meta?: any) => {
  logger.error(message, {
    error: error?.message,
    stack: error?.stack,
    ...meta
  });
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

// Workflow-specific logging
export const logWorkflowExecution = (workflowId: string, step: string, message: string, meta?: any) => {
  logger.info(`Workflow Execution: ${message}`, {
    workflowId,
    step,
    ...meta
  });
};

export const logApiCall = (apiConnectionId: string, endpoint: string, method: string, status: number, duration: number, meta?: any) => {
  logger.info('API Call', {
    apiConnectionId,
    endpoint,
    method,
    status,
    duration: `${duration}ms`,
    ...meta
  });
};

export const logSecurityEvent = (event: string, userId?: string, ip?: string, meta?: any) => {
  logger.warn(`Security Event: ${event}`, {
    userId,
    ip,
    ...meta
  });
};

export const logAuditEvent = (action: string, resource: string, userId: string, resourceId?: string, meta?: any) => {
  logger.info(`Audit: ${action}`, {
    resource,
    resourceId,
    userId,
    ...meta
  });
};

// Performance logging
export const logPerformance = (operation: string, duration: number, meta?: any) => {
  if (duration > 1000) { // Log slow operations (>1s)
    logger.warn(`Slow Operation: ${operation}`, {
      duration: `${duration}ms`,
      ...meta
    });
  } else {
    logger.debug(`Performance: ${operation}`, {
      duration: `${duration}ms`,
      ...meta
    });
  }
};

// Database logging
export const logDatabaseQuery = (query: string, duration: number, meta?: any) => {
  logger.debug('Database Query', {
    query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
    duration: `${duration}ms`,
    ...meta
  });
};

// Error handling with logging
export const handleError = (error: Error, context?: string, meta?: any) => {
  logError(`Error in ${context || 'unknown context'}: ${error.message}`, error, meta);
  
  // Return a sanitized error for client responses
  return {
    message: process.env.NODE_ENV === 'production' 
      ? 'An internal error occurred' 
      : error.message,
    code: error.name,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  };
};

// Graceful shutdown logging
export const logShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
};

// Export the main logger instance
export default logger; 