import { createMocks } from 'node-mocks-http'
import healthHandler from '../../../pages/api/health'

describe('/api/health', () => {
  describe('GET', () => {
    it('should return 200 and health status', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(JSON.parse(res._getData())).toEqual({
        success: true,
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String),
        version: expect.any(String)
      })
    })

    it('should include required health check fields', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      })

      await healthHandler(req, res)

      const data = JSON.parse(res._getData())
      
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('status', 'healthy')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('uptime')
      expect(data).toHaveProperty('environment')
      expect(data).toHaveProperty('version')
      
      // Validate timestamp format
      expect(new Date(data.timestamp)).toBeInstanceOf(Date)
      
      // Validate uptime is a positive number
      expect(data.uptime).toBeGreaterThan(0)
      
      // Validate environment is one of the expected values
      expect(['development', 'test', 'production']).toContain(data.environment)
    })

    it('should handle database connectivity check', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { check: 'database' }
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      
      expect(data).toHaveProperty('database', expect.objectContaining({
        status: expect.stringMatching(/^(connected|disconnected)$/),
        responseTime: expect.any(Number)
      }))
    })

    it('should handle external API connectivity check', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { check: 'external' }
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      
      expect(data).toHaveProperty('external', expect.objectContaining({
        status: expect.stringMatching(/^(connected|disconnected)$/),
        responseTime: expect.any(Number)
      }))
    })

    it('should handle multiple health checks', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { check: 'database,external' }
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      
      expect(data).toHaveProperty('database')
      expect(data).toHaveProperty('external')
    })

    it('should return 405 for non-GET requests', async () => {
      const { req, res } = createMocks({
        method: 'POST',
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(405)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Method not allowed',
        message: 'Only GET requests are allowed'
      })
    })

    it('should handle malformed requests gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { invalid: 'parameter' }
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(JSON.parse(res._getData())).toHaveProperty('success', true)
    })

    it('should include CORS headers', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      })

      await healthHandler(req, res)

      expect(res._getHeaders()).toHaveProperty('access-control-allow-origin')
      expect(res._getHeaders()).toHaveProperty('access-control-allow-methods')
      expect(res._getHeaders()).toHaveProperty('access-control-allow-headers')
    })

    it('should handle OPTIONS requests for CORS preflight', async () => {
      const { req, res } = createMocks({
        method: 'OPTIONS',
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(res._getHeaders()).toHaveProperty('access-control-allow-origin')
    })
  })

  describe('error handling', () => {
    it('should handle internal server errors gracefully', async () => {
      // Mock a scenario where the health check fails
      const originalProcessUptime = process.uptime
      process.uptime = jest.fn().mockImplementation(() => {
        throw new Error('Uptime error')
      })

      const { req, res } = createMocks({
        method: 'GET',
      })

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(500)
      expect(JSON.parse(res._getData())).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Health check failed'
      })

      // Restore original function
      process.uptime = originalProcessUptime
    })

    it('should handle database connection errors', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { check: 'database' }
      })

      // Mock database connection failure
      jest.doMock('../../../lib/database/client', () => ({
        $connect: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      }))

      await healthHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.database.status).toBe('disconnected')
    })
  })

  describe('performance', () => {
    it('should respond within reasonable time', async () => {
      const { req, res } = createMocks({
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
        const { req, res } = createMocks({
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
      const { req, res } = createMocks({
        method: 'GET',
      })

      await healthHandler(req, res)

      const data = JSON.parse(res._getData())
      
      // Should not contain sensitive information
      expect(JSON.stringify(data)).not.toContain('password')
      expect(JSON.stringify(data)).not.toContain('secret')
      expect(JSON.stringify(data)).not.toContain('key')
      expect(JSON.stringify(data)).not.toContain('token')
    })

    it('should handle malicious query parameters', async () => {
      const { req, res } = createMocks({
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