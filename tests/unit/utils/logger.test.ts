import { logError, logWarn, logInfo, logDebug, logWorkflowExecution, logApiCall, logSecurityEvent, logAuditEvent, logPerformance, logDatabaseQuery, handleError, logShutdown } from '../../../src/utils/logger';

// Mock winston at the top level
jest.mock('winston', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };
  
  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      errors: jest.fn(),
      json: jest.fn(),
      printf: jest.fn(),
      colorize: jest.fn(),
      simple: jest.fn()
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn()
    }
  };
});

describe('Logger utilities', () => {
  let logError, logWarn, logInfo, logDebug, logWorkflowExecution, logApiCall, logSecurityEvent, logAuditEvent, logPerformance, logDatabaseQuery, handleError, logShutdown;
  let mockLogger;

  beforeEach(async () => {
    jest.resetModules();
    const loggerUtils = await import('../../../src/utils/logger');
    logError = loggerUtils.logError;
    logWarn = loggerUtils.logWarn;
    logInfo = loggerUtils.logInfo;
    logDebug = loggerUtils.logDebug;
    logWorkflowExecution = loggerUtils.logWorkflowExecution;
    logApiCall = loggerUtils.logApiCall;
    logSecurityEvent = loggerUtils.logSecurityEvent;
    logAuditEvent = loggerUtils.logAuditEvent;
    logPerformance = loggerUtils.logPerformance;
    logDatabaseQuery = loggerUtils.logDatabaseQuery;
    handleError = loggerUtils.handleError;
    logShutdown = loggerUtils.logShutdown;
    mockLogger = (require('winston').createLogger as jest.Mock).mock.results[0].value;
    jest.clearAllMocks();
  });

  it('logError logs error with meta', () => {
    const error = new Error('test error');
    logError('test message', error, { foo: 'bar' });
    
    expect(mockLogger.error).toHaveBeenCalledWith('test message', {
      error: 'test error',
      stack: error.stack,
      foo: 'bar'
    });
  });

  it('logWarn logs warning with meta', () => {
    logWarn('test warning', { foo: 'bar' });
    
    expect(mockLogger.warn).toHaveBeenCalledWith('test warning', { foo: 'bar' });
  });

  it('logInfo logs info with meta', () => {
    logInfo('test info', { foo: 'bar' });
    
    expect(mockLogger.info).toHaveBeenCalledWith('test info', { foo: 'bar' });
  });

  it('logDebug logs debug with meta', () => {
    logDebug('test debug', { foo: 'bar' });
    
    expect(mockLogger.debug).toHaveBeenCalledWith('test debug', { foo: 'bar' });
  });

  describe('logWorkflowExecution', () => {
    it('logs workflow execution with all parameters', () => {
      logWorkflowExecution('workflow-123', 'step-1', 'Processing data', { data: 'test' });
      
      expect(mockLogger.info).toHaveBeenCalledWith('Workflow Execution: Processing data', {
        workflowId: 'workflow-123',
        step: 'step-1',
        data: 'test'
      });
    });
  });

  describe('logApiCall', () => {
    it('logs API call with all parameters', () => {
      logApiCall('conn-123', '/api/test', 'GET', 200, 150, { userId: 'user-123' });
      
      expect(mockLogger.info).toHaveBeenCalledWith('API Call', {
        apiConnectionId: 'conn-123',
        endpoint: '/api/test',
        method: 'GET',
        status: 200,
        duration: '150ms',
        userId: 'user-123'
      });
    });
  });

  describe('logSecurityEvent', () => {
    it('logs security event with all parameters', () => {
      logSecurityEvent('Failed login attempt', 'user-123', '192.168.1.1', { attempts: 3 });
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Security Event: Failed login attempt', {
        userId: 'user-123',
        ip: '192.168.1.1',
        attempts: 3
      });
    });

    it('logs security event without optional parameters', () => {
      logSecurityEvent('Security alert');
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Security Event: Security alert', {
        userId: undefined,
        ip: undefined
      });
    });
  });

  describe('logAuditEvent', () => {
    it('logs audit event with all parameters', () => {
      logAuditEvent('CREATE', 'user', 'admin-123', 'user-456', { changes: ['email'] });
      
      expect(mockLogger.info).toHaveBeenCalledWith('Audit: CREATE', {
        resource: 'user',
        resourceId: 'user-456',
        userId: 'admin-123',
        changes: ['email']
      });
    });

    it('logs audit event without resourceId', () => {
      logAuditEvent('DELETE', 'connection', 'admin-123');
      
      expect(mockLogger.info).toHaveBeenCalledWith('Audit: DELETE', {
        resource: 'connection',
        resourceId: undefined,
        userId: 'admin-123'
      });
    });
  });

  describe('logPerformance', () => {
    it('logs slow operation as warning', () => {
      logPerformance('Database query', 1500, { table: 'users' });
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Slow Operation: Database query', {
        duration: '1500ms',
        table: 'users'
      });
    });

    it('logs fast operation as debug', () => {
      logPerformance('Cache lookup', 50, { cache: 'redis' });
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Performance: Cache lookup', {
        duration: '50ms',
        cache: 'redis'
      });
    });
  });

  describe('logDatabaseQuery', () => {
    it('logs database query with truncated query', () => {
      const longQuery = 'SELECT * FROM users WHERE email = ? AND status = ? AND created_at > ? AND updated_at < ? AND last_login > ?';
      logDatabaseQuery(longQuery, 250, { table: 'users' });
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Database Query', {
        query: longQuery,
        duration: '250ms',
        table: 'users'
      });
    });

    it('truncates very long queries', () => {
      const veryLongQuery = 'a'.repeat(300);
      logDatabaseQuery(veryLongQuery, 100);
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Database Query', {
        query: 'a'.repeat(200) + '...',
        duration: '100ms'
      });
    });
  });

  describe('handleError', () => {
    it('logs error and returns sanitized response for production', () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });
      
      const error = new Error('Database connection failed');
      const result = handleError(error, 'database', { connectionId: 'conn-123' });
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error in database: Database connection failed', {
        error: 'Database connection failed',
        stack: error.stack,
        connectionId: 'conn-123'
      });
      
      expect(result).toEqual({
        message: 'An internal error occurred',
        code: 'Error'
      });
      
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
    });

    it('logs error and returns detailed response for development', () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });
      
      const error = new Error('Validation failed');
      const result = handleError(error, 'validation');
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error in validation: Validation failed', {
        error: 'Validation failed',
        stack: error.stack
      });
      
      expect(result).toEqual({
        message: 'Validation failed',
        code: 'Error',
        stack: error.stack
      });
      
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
    });
  });

  describe('logShutdown', () => {
    it('logs shutdown message', () => {
      logShutdown('SIGTERM');
      
      expect(mockLogger.info).toHaveBeenCalledWith('Received SIGTERM. Starting graceful shutdown...');
    });
  });
}); 