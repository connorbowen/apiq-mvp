import { NextApiRequest, NextApiResponse } from 'next'
import { errorHandler, handleApiError, ApplicationError, Errors } from '../../../src/middleware/errorHandler'

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  handleError: jest.fn().mockReturnValue({ message: 'Test error message' })
}))

describe('ErrorHandler', () => {
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      url: '/api/test',
      headers: {},
      query: {},
      body: {},
      socket: {
        remoteAddress: '127.0.0.1'
      } as any
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      end: jest.fn()
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('errorHandler wrapper', () => {
    it('should call the handler successfully', async () => {
      const mockHandler = jest.fn().mockResolvedValue(undefined)
      const wrappedHandler = errorHandler(mockHandler)
      
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes)
    })

    it('should handle errors thrown by the handler', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error('Test error'))
      const wrappedHandler = errorHandler(mockHandler)
      
      await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error message',
        code: 'INTERNAL_ERROR',
        details: expect.objectContaining({
          originalError: 'Error'
        }),
        stack: expect.any(String)
      })
    })
  })

  describe('handleApiError', () => {
    it('should handle ApplicationError', () => {
      const error = new ApplicationError('Test error', 400, 'VALIDATION_ERROR')
      
      handleApiError(error, mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error message',
        code: 'VALIDATION_ERROR',
        details: undefined,
        stack: expect.any(String)
      })
    })

    it('should handle generic Error', () => {
      const error = new Error('Generic error')
      
      handleApiError(error, mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error message',
        code: 'INTERNAL_ERROR',
        details: expect.objectContaining({
          originalError: 'Error'
        }),
        stack: expect.any(String)
      })
    })

    it('should handle unknown errors', () => {
      const error = 'String error'
      
      handleApiError(error, mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error message',
        code: 'INTERNAL_ERROR',
        details: undefined,
        stack: expect.any(String)
      })
    })

    it('should handle missing request properties gracefully', () => {
      const { logError } = require('../../../src/utils/logger')
      const error = new ApplicationError('Test error')
      const minimalReq = {
        headers: {},
        socket: {}
      } as NextApiRequest
      
      handleApiError(error, minimalReq, mockRes as NextApiResponse)
      
      expect(logError).toHaveBeenCalledWith('API Error', error, {
        method: undefined,
        url: 'unknown',
        statusCode: 500,
        userAgent: undefined,
        ip: 'unknown'
      })
    })
  })

  describe('ApplicationError class', () => {
    it('should create error with default values', () => {
      const error = new ApplicationError('Test message')
      
      expect(error.message).toBe('Test message')
      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('INTERNAL_ERROR')
      expect(error.name).toBe('ApplicationError')
    })

    it('should create error with custom values', () => {
      const details = { field: 'test' }
      const error = new ApplicationError('Test message', 400, 'VALIDATION_ERROR', details)
      
      expect(error.message).toBe('Test message')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.details).toEqual(details)
    })
  })

  describe('Error constants', () => {
    it('should create UNAUTHORIZED error', () => {
      const error = Errors.UNAUTHORIZED('Custom message')
      
      expect(error.message).toBe('Custom message')
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('UNAUTHORIZED')
    })

    it('should create VALIDATION_ERROR with details', () => {
      const details = { field: 'email', issue: 'invalid format' }
      const error = Errors.VALIDATION_ERROR('Validation failed', details)
      
      expect(error.message).toBe('Validation failed')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.details).toEqual(details)
    })

    it('should create NOT_FOUND error', () => {
      const error = Errors.NOT_FOUND('User not found')
      
      expect(error.message).toBe('User not found')
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
    })

    it('should create RATE_LIMIT_EXCEEDED error', () => {
      const error = Errors.RATE_LIMIT_EXCEEDED('Too many requests')
      
      expect(error.message).toBe('Too many requests')
      expect(error.statusCode).toBe(429)
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('should create INTERNAL_ERROR error', () => {
      const error = Errors.INTERNAL_ERROR('Server error')
      
      expect(error.message).toBe('Server error')
      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('environment-specific behavior', () => {
    afterEach(() => {
      // Cleanup handled in individual tests
    })

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true
      })
      
      const error = new ApplicationError('Test error')
      
      handleApiError(error, mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error message',
        code: 'INTERNAL_ERROR',
        details: undefined,
        stack: error.stack
      })
      
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
      
      const error = new ApplicationError('Test error')
      
      handleApiError(error, mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error message',
        code: 'INTERNAL_ERROR'
      })
      
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true
      })
    })
  })

  describe('logging', () => {
    it('should log error with request context', () => {
      const { logError } = require('../../../src/utils/logger')
      const error = new ApplicationError('Test error')
      
      handleApiError(error, mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(logError).toHaveBeenCalledWith('API Error', error, {
        method: 'GET',
        url: '/api/test',
        statusCode: 500,
        userAgent: undefined,
        ip: '127.0.0.1'
      })
    })

    it('should handle missing request properties gracefully', () => {
      const { logError } = require('../../../src/utils/logger')
      const error = new ApplicationError('Test error')
      const minimalReq = {
        headers: {},
        socket: {}
      } as NextApiRequest
      
      handleApiError(error, minimalReq, mockRes as NextApiResponse)
      
      expect(logError).toHaveBeenCalledWith('API Error', error, {
        method: undefined,
        url: 'unknown',
        statusCode: 500,
        userAgent: undefined,
        ip: 'unknown'
      })
    })
  })
}) 