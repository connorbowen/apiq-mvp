import { createMocks } from 'node-mocks-http'
import { NextApiRequest } from 'next'
import healthHandler from '../../../pages/api/health'
import { prisma } from '../../../lib/database/client'

// Remove database health check mock
// jest.mock('../../../src/database/init', ... )

// Mock the OpenAI service
jest.mock('../../../src/services/openaiService', () => ({
  openaiService: {
    validateConfig: jest.fn().mockReturnValue(true)
  }
}))

// Mock the encryption service
jest.mock('../../../src/utils/encryption', () => ({
  encryptionService: {
    validateKeyStrength: jest.fn().mockReturnValue(true)
  }
}))

// Helper function to create properly typed mock requests
function createMockRequest(options: any = {}) {
  const { req, res } = createMocks(options)
  return {
    req: req as unknown as NextApiRequest,
    res: res as any // Use any to preserve mock methods
  }
}

describe('/api/health', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.endpoint.deleteMany({
      where: {
        apiConnection: {
          user: {
            OR: [
              { email: { contains: 'test-' } },
              { email: { contains: '@example.com' } }
            ]
          }
        }
      }
    });
    await prisma.apiConnection.deleteMany({
      where: {
        user: {
          OR: [
            { email: { contains: 'test-' } },
            { email: { contains: '@example.com' } }
          ]
        }
      }
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-' } },
          { email: { contains: '@example.com' } }
        ]
      }
    });
    // No need to recreate testUser here; this file does not use testUser.
  });

  describe('GET', () => {
    it('should return 200 and health status', async () => {
      const { req, res } = createMockRequest({
        method: 'GET',
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data).toEqual({
        success: true,
        status: 'healthy',
        timestamp: expect.any(String),
        responseTime: expect.any(String),
        checks: expect.objectContaining({
          database: expect.any(Object),
          openai: expect.any(Object),
          encryption: expect.any(Object),
          environment: expect.any(Object)
        })
      })
    })

    it('should include required health check fields', async () => {
      const { req, res } = createMockRequest({
        method: 'GET',
      })

      await healthHandler(req, res)

      const data = JSON.parse(res._getData())
      
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('status', 'healthy')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('responseTime')
      expect(data).toHaveProperty('checks')
      
      // Validate timestamp format
      expect(new Date(data.timestamp)).toBeInstanceOf(Date)
      
      // Validate response time format
      expect(data.responseTime).toMatch(/^\d+ms$/)
      
      // Validate checks object
      expect(data.checks).toHaveProperty('database')
      expect(data.checks).toHaveProperty('openai')
      expect(data.checks).toHaveProperty('encryption')
      expect(data.checks).toHaveProperty('environment')
    })

    it('should handle database connectivity check', async () => {
      const { req, res } = createMockRequest({
        method: 'GET',
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      
      expect(data.checks).toHaveProperty('database', expect.objectContaining({
        status: 'healthy',
        details: expect.any(Object)
      }))
    })

    it('should handle OpenAI service check', async () => {
      const { req, res } = createMockRequest({
        method: 'GET',
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      
      expect(data.checks).toHaveProperty('openai', expect.objectContaining({
        status: 'healthy',
        details: expect.objectContaining({
          configured: expect.any(Boolean),
          model: expect.any(String)
        })
      }))
    })

    it('should handle encryption service check', async () => {
      const { req, res } = createMockRequest({
        method: 'GET',
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      
      expect(data.checks).toHaveProperty('encryption', expect.objectContaining({
        status: expect.stringMatching(/^(healthy|warning)$/),
        details: expect.objectContaining({
          keyLength: expect.any(Number),
          isDefaultKey: expect.any(Boolean)
        })
      }))
    })

    it('should handle environment check', async () => {
      const { req, res } = createMockRequest({
        method: 'GET',
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      
      expect(data.checks).toHaveProperty('environment', expect.objectContaining({
        status: 'healthy',
        details: expect.objectContaining({
          nodeEnv: expect.any(String),
          hasDatabaseUrl: expect.any(Boolean),
          hasNextAuthSecret: expect.any(Boolean),
          hasNextAuthUrl: expect.any(Boolean)
        })
      }))
    })

    it('should return 405 for non-GET requests', async () => {
      const { req, res } = createMockRequest({
        method: 'POST',
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(405)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      })
    })

    it('should handle malformed requests gracefully', async () => {
      const { req, res } = createMockRequest({
        method: 'GET',
        query: { invalid: 'parameter' }
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(JSON.parse(res._getData())).toHaveProperty('success', true)
    })

    it('should include CORS headers', async () => {
      const { req, res } = createMockRequest({
        method: 'GET',
      })

      await healthHandler(req, res)

      const headers = res._getHeaders()
      expect(headers).toHaveProperty('access-control-allow-credentials')
      expect(headers).toHaveProperty('access-control-allow-headers')
      expect(headers).toHaveProperty('access-control-allow-methods')
    })

    it('should handle OPTIONS requests for CORS preflight', async () => {
      const { req, res } = createMockRequest({
        method: 'OPTIONS',
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(405) // Method not allowed for OPTIONS
    })
  })

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      jest.resetModules();
      jest.doMock('../../../src/database/init', () => ({
        healthCheck: jest.fn().mockRejectedValueOnce(new Error('Database connection failed'))
      }));
      const healthHandler = require('../../../pages/api/health').default;
      const { req, res } = createMockRequest({
        method: 'GET',
      })
      await healthHandler(req, res)
      expect(res._getStatusCode()).toBe(503)
      const data = JSON.parse(res._getData())
      expect(data.success).toBe(false)
      expect(data.error).toMatch(/health check failed|database connection failed/i)
      jest.dontMock('../../../src/database/init');
    })

    it('should handle internal server errors gracefully', async () => {
      jest.resetModules();
      jest.doMock('../../../src/database/init', () => ({
        healthCheck: jest.fn().mockImplementationOnce(() => { throw new Error('Unexpected error') })
      }));
      const healthHandler = require('../../../pages/api/health').default;
      const { req, res } = createMockRequest({
        method: 'GET',
      })
      await healthHandler(req, res)
      expect(res._getStatusCode()).toBe(503)
      const data = JSON.parse(res._getData())
      expect(data.success).toBe(false)
      expect(data.error).toMatch(/health check failed/i)
      jest.dontMock('../../../src/database/init');
    })
  })

  describe('performance', () => {
    it('should respond within reasonable time', async () => {
      const { req, res } = createMockRequest({
        method: 'GET',
      })

      const startTime = Date.now()
      await healthHandler(req, res)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000) // Should respond within 1 second
      expect(res._getStatusCode()).toBe(200)
    })

    it('should handle concurrent requests', async () => {
      const requests: Promise<void>[] = []
      
      for (let i = 0; i < 10; i++) {
        const { req, res } = createMockRequest({
          method: 'GET',
        })
        requests.push(healthHandler(req, res))
      }

      await Promise.all(requests)

      // All requests should complete successfully
      requests.forEach((_, index) => {
        expect(requests[index]).resolves.not.toThrow()
      })
    })
  })

  describe('security', () => {
    it('should not expose sensitive information', async () => {
      const { req, res } = createMockRequest({
        method: 'GET',
      })

      await healthHandler(req, res)

      const data = JSON.parse(res._getData())
      
      // Should not contain sensitive information
      expect(JSON.stringify(data)).not.toContain('password')
      expect(JSON.stringify(data)).not.toContain('secret')
      expect(JSON.stringify(data)).not.toContain('token')
    })

    it('should handle malicious query parameters', async () => {
      const { req, res } = createMockRequest({
        method: 'GET',
        query: { 
          check: 'database; DROP TABLE users; --',
          injection: '<script>alert("xss")</script>'
        }
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      // Should not crash or expose vulnerabilities
    })
  })
}) 