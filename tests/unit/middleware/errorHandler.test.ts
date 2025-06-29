import { NextApiRequest, NextApiResponse } from 'next'
import { errorHandler, handleApiError, ApplicationError, Errors, validateRequest, requireAuth, requireRole } from '../../../src/middleware/errorHandler'
import * as logger from '../../../src/utils/logger'

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  handleError: jest.fn(() => ({ message: 'err', code: 'ERR' }))
}))

// Mock Next.js request/response
const createMockReq = (): Partial<NextApiRequest> => ({
  method: 'GET',
  url: '/test',
  headers: {},
  query: {},
  body: {},
  socket: {
    remoteAddress: '127.0.0.1'
  } as any
})

const createMockRes = (): Partial<NextApiResponse> => {
  const res: Partial<NextApiResponse> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis()
  }
  return res
}

describe('ErrorHandler', () => {
  let mockReq: Partial<NextApiRequest>
  let mockRes: Partial<NextApiResponse>

  beforeEach(() => {
    mockReq = createMockReq()
    mockRes = createMockRes()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('errorHandler wrapper', () => {
    it('should handle errors thrown by the handler', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error('Test error'))
      
      await errorHandler(mockHandler)(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'err',
        code: 'INTERNAL_ERROR',
        details: {
          originalError: 'Error'
        },
        stack: expect.any(String)
      })
    })

    it('should call the handler when no error occurs', async () => {
      const mockHandler = jest.fn().mockResolvedValue(undefined)
      
      await errorHandler(mockHandler)(mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes)
      expect(mockRes.status).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })
  })

  describe('handleApiError', () => {
    it('should handle ApplicationError', async () => {
      const error = new ApplicationError('Test error', 400, 'VALIDATION_ERROR')
      
      await handleApiError(error, mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'err',
        code: 'VALIDATION_ERROR',
        details: undefined,
        stack: expect.any(String)
      })
    })

    it('should handle generic Error', async () => {
      const error = new Error('Generic error')
      
      await handleApiError(error, mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'err',
        code: 'INTERNAL_ERROR',
        details: {
          originalError: 'Error'
        },
        stack: expect.any(String)
      })
    })

    it('should handle unknown errors', async () => {
      const error = 'Unknown error'
      
      await handleApiError(error, mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'err',
        code: 'INTERNAL_ERROR',
        details: undefined,
        stack: expect.any(String)
      })
    })

    it('should handle errors with custom status codes', async () => {
      const error = new ApplicationError('Not found', 404, 'NOT_FOUND')
      
      await handleApiError(error, mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'err',
        code: 'NOT_FOUND',
        details: undefined,
        stack: expect.any(String)
      })
    })

    it('should handle errors with details', async () => {
      const error = new ApplicationError('Validation failed', 400, 'VALIDATION_ERROR', { field: 'email', reason: 'invalid' })
      
      await handleApiError(error, mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'err',
        code: 'VALIDATION_ERROR',
        details: { field: 'email', reason: 'invalid' },
        stack: expect.any(String)
      })
    })
  })

  describe('ApplicationError', () => {
    it('should create ApplicationError with default values', () => {
      const error = new ApplicationError('Test error')
      
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('INTERNAL_ERROR')
      expect(error.details).toBeUndefined()
    })

    it('should create ApplicationError with custom status code', () => {
      const error = new ApplicationError('Test error', 400)
      
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('INTERNAL_ERROR')
    })

    it('should create ApplicationError with details', () => {
      const details = { field: 'email' }
      const error = new ApplicationError('Test error', 400, 'VALIDATION_ERROR', details)
      
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.details).toBe(details)
    })
  })

  describe('environment-specific behavior', () => {
    const originalEnv = process.env.NODE_ENV

    afterEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true
      })
    })

    it('should include stack trace in development', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true
      })
      const error = new ApplicationError('Test error', 400, 'VALIDATION_ERROR')
      
      await handleApiError(error, mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'err',
        code: 'VALIDATION_ERROR',
        details: undefined,
        stack: expect.any(String)
      })
    })

    it('should not include stack trace in production', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true
      })
      const error = new ApplicationError('Test error', 400, 'VALIDATION_ERROR')
      
      await handleApiError(error, mockReq as NextApiRequest, mockRes as NextApiResponse)
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'err',
        code: 'VALIDATION_ERROR',
        details: undefined
      })
    })
  })
})

describe('validateRequest', () => {
  it('returns true for valid request', () => {
    const req = { method: 'GET' } as any
    const res = {} as any
    expect(validateRequest({}, req, res)).toBe(true)
  })
  it('throws for missing body on POST', () => {
    const req = { method: 'POST' } as any
    const res = {} as any
    expect(() => validateRequest({}, req, res)).toThrow()
  })
})

describe('requireAuth', () => {
  it('throws if no session', () => {
    const req = {} as any
    const res = {} as any
    expect(() => requireAuth(req, res)).toThrow()
  })
  it('does not throw if session.user exists', () => {
    const req = { session: { user: { id: '1' } } } as any
    const res = {} as any
    expect(() => requireAuth(req, res)).not.toThrow()
  })
})

describe('requireRole', () => {
  it('throws if user role not allowed', () => {
    const req = { session: { user: { role: 'USER' } } } as any
    const res = {} as any
    const mw = requireRole(['ADMIN'])
    expect(() => mw(req, res)).toThrow()
  })
  it('does not throw if user role allowed', () => {
    const req = { session: { user: { role: 'ADMIN' } } } as any
    const res = {} as any
    const mw = requireRole(['ADMIN'])
    expect(() => mw(req, res)).not.toThrow()
  })
}) 