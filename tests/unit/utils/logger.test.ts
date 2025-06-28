import logger, { 
  LogLevel, 
  logError, 
  logWarn, 
  logInfo, 
  logDebug,
  logWorkflowExecution,
  logApiCall,
  logSecurityEvent,
  logAuditEvent,
  logPerformance,
  logDatabaseQuery,
  handleError
} from '../../../src/utils/logger'

// Mock winston
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  })),
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
}))

describe('Logger', () => {
  let mockLogger: any

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    }
    
    // Mock the logger instance
    jest.spyOn(logger, 'error').mockImplementation(mockLogger.error)
    jest.spyOn(logger, 'warn').mockImplementation(mockLogger.warn)
    jest.spyOn(logger, 'info').mockImplementation(mockLogger.info)
    jest.spyOn(logger, 'debug').mockImplementation(mockLogger.debug)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('log levels', () => {
    it('should log error messages', () => {
      const message = 'Critical error occurred'
      const error = new Error('Something went wrong')
      
      logError(message, error)
      
      expect(mockLogger.error).toHaveBeenCalledWith(message, {
        error: error.message,
        stack: error.stack
      })
    })

    it('should log warning messages', () => {
      const message = 'Warning: deprecated feature used'
      
      logWarn(message)
      
      expect(mockLogger.warn).toHaveBeenCalledWith(message, undefined)
    })

    it('should log info messages', () => {
      const message = 'User logged in successfully'
      
      logInfo(message)
      
      expect(mockLogger.info).toHaveBeenCalledWith(message, undefined)
    })

    it('should log debug messages', () => {
      const message = 'Debug: processing request'
      
      logDebug(message)
      
      expect(mockLogger.debug).toHaveBeenCalledWith(message, undefined)
    })
  })

  describe('structured logging', () => {
    it('should log workflow execution', () => {
      const workflowId = 'workflow-123'
      const step = 'api-call'
      const message = 'Making API request'
      
      logWorkflowExecution(workflowId, step, message)
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Workflow Execution: ${message}`,
        { workflowId, step }
      )
    })

    it('should log API calls', () => {
      const apiConnectionId = 'api-456'
      const endpoint = '/api/users'
      const method = 'GET'
      const status = 200
      const duration = 150
      
      logApiCall(apiConnectionId, endpoint, method, status, duration)
      
      expect(mockLogger.info).toHaveBeenCalledWith('API Call', {
        apiConnectionId,
        endpoint,
        method,
        status,
        duration: '150ms'
      })
    })

    it('should log security events', () => {
      const event = 'Failed login attempt'
      const userId = 'user-789'
      const ip = '192.168.1.1'
      
      logSecurityEvent(event, userId, ip)
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Security Event: ${event}`,
        { userId, ip }
      )
    })

    it('should log audit events', () => {
      const action = 'CREATE'
      const resource = 'workflow'
      const userId = 'user-123'
      const resourceId = 'workflow-456'
      
      logAuditEvent(action, resource, userId, resourceId)
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Audit: ${action}`,
        { resource, resourceId, userId }
      )
    })
  })

  describe('performance logging', () => {
    it('should log slow operations as warnings', () => {
      const operation = 'database-query'
      const duration = 1500 // 1.5 seconds
      
      logPerformance(operation, duration)
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Slow Operation: ${operation}`,
        { duration: '1500ms' }
      )
    })

    it('should log fast operations as debug', () => {
      const operation = 'cache-lookup'
      const duration = 50 // 50ms
      
      logPerformance(operation, duration)
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Performance: ${operation}`,
        { duration: '50ms' }
      )
    })
  })

  describe('database logging', () => {
    it('should log database queries', () => {
      const query = 'SELECT * FROM users WHERE id = ?'
      const duration = 25
      
      logDatabaseQuery(query, duration)
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Database Query', {
        query: query,
        duration: '25ms'
      })
    })

    it('should truncate long queries', () => {
      const longQuery = 'SELECT * FROM users WHERE id = ? AND name = ? AND email = ? AND created_at > ? AND updated_at < ? AND status = ? AND role = ? AND permissions = ? AND settings = ? AND metadata = ? AND additional_field = ? AND another_field = ? AND yet_another_field = ? AND one_more_field = ? AND final_field = ?'
      const duration = 30
      
      logDatabaseQuery(longQuery, duration)
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Database Query', {
        query: longQuery.substring(0, 200) + '...',
        duration: '30ms'
      })
    })
  })

  describe('error handling', () => {
    it('should handle errors and return sanitized response', () => {
      const error = new Error('Database connection failed')
      const context = 'user-authentication'
      
      const result = handleError(error, context)
      
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('code')
      expect(result.code).toBe('Error')
    })

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true
      })
      
      const error = new Error('Test error')
      const result = handleError(error, 'test-context')
      
      expect(result).toHaveProperty('stack')
      
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true
      })
    })

    it('should not include stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true
      })
      
      const error = new Error('Test error')
      const result = handleError(error, 'test-context')
      
      expect(result).not.toHaveProperty('stack')
      expect(result.message).toBe('An internal error occurred')
      
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true
      })
    })
  })

  describe('logger instance', () => {
    it('should be a valid winston logger', () => {
      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.debug).toBe('function')
    })

    it('should handle circular references gracefully', () => {
      const circularObj: any = { name: 'test' }
      circularObj.self = circularObj
      
      expect(() => {
        logInfo('Circular object test', { data: circularObj })
      }).not.toThrow()
    })

    it('should handle large objects', () => {
      const largeObj = {
        data: 'x'.repeat(10000)
      }
      
      expect(() => {
        logInfo('Large object test', { data: largeObj })
      }).not.toThrow()
    })
  })
}) 