import { createMocks } from 'node-mocks-http';
import loginHandler from '../../../pages/api/auth/login';
import refreshHandler from '../../../pages/api/auth/refresh';
import meHandler from '../../../pages/api/auth/me';

// Mock JWT
const mockSign = jest.fn();
const mockVerify = jest.fn();

jest.mock('jsonwebtoken', () => ({
  sign: mockSign,
  verify: mockVerify
}));

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'admin@example.com',
          password: 'admin123'
        }
      });

      // Mock JWT token generation
      mockSign
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('admin@example.com');
      expect(data.data.user.role).toBe('ADMIN');
      expect(data.data.accessToken).toBe('mock-access-token');
      expect(data.data.refreshToken).toBe('mock-refresh-token');
    });

    it('should reject invalid credentials', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'invalid@example.com',
          password: 'wrongpassword'
        }
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid credentials');
      expect(data.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject missing credentials', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'admin@example.com'
          // missing password
        }
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Email and password are required');
    });

    it('should reject wrong HTTP method', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      await loginHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          refreshToken: 'valid-refresh-token'
        }
      });

      // Mock JWT verification
      mockVerify.mockReturnValue({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
      });

      // Mock new token generation
      mockSign.mockReturnValue('new-access-token');

      await refreshHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.accessToken).toBe('new-access-token');
    });

    it('should reject invalid refresh token', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          refreshToken: 'invalid-token'
        }
      });

      // Mock JWT verification error
      mockVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await refreshHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid or expired token');
    });

    it('should reject missing refresh token', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {}
      });

      await refreshHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Refresh token is required');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-access-token'
        }
      });

      // Mock JWT verification
      mockVerify.mockReturnValue({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 15 * 60
      });

      await meHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('admin@example.com');
      expect(data.data.user.role).toBe('ADMIN');
    });

    it('should reject request without token', async () => {
      const { req, res } = createMocks({
        method: 'GET'
        // No authorization header
      });

      await meHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should reject invalid token', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });

      // Mock JWT verification error
      mockVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await meHandler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid or expired token');
    });

    it('should reject wrong HTTP method', async () => {
      const { req, res } = createMocks({
        method: 'POST'
      });

      await meHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
    });
  });

  describe('User Roles', () => {
    it('should support different user roles', async () => {
      const users = [
        { email: 'user@example.com', password: 'user123', role: 'USER' },
        { email: 'admin@example.com', password: 'admin123', role: 'ADMIN' },
        { email: 'super@example.com', password: 'super123', role: 'SUPER_ADMIN' }
      ];

      for (const user of users) {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            email: user.email,
            password: user.password
          }
        });

        // Mock JWT token generation
        mockSign.mockReturnValue('mock-token');

        await loginHandler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data.success).toBe(true);
        expect(data.data.user.role).toBe(user.role);
      }
    });
  });
}); 