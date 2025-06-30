import request from 'supertest';
import { createServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '../../../src/generated/prisma';
import { oauth2Service } from '../../../src/lib/auth/oauth2';
import { generateToken } from '../../../src/lib/auth/session';
import { encryptionService } from '../../../src/utils/encryption';

const prisma = new PrismaClient();

// Mock OAuth2 service for testing
jest.mock('../../../src/lib/auth/oauth2', () => ({
  oauth2Service: {
    generateAuthorizationUrl: jest.fn(),
    processCallback: jest.fn(),
    refreshToken: jest.fn(),
    getAccessToken: jest.fn(),
    getSupportedProviders: jest.fn(),
    getProviderConfig: jest.fn(),
    validateConfig: jest.fn()
  }
}));

// Mock encryption service
jest.mock('../../../src/utils/encryption', () => ({
  encryptionService: {
    encrypt: jest.fn(),
    decrypt: jest.fn()
  }
}));

describe('OAuth2 Flow Integration Tests', () => {
  let server: any;
  let testUser: any;
  let testApiConnection: any;
  let authToken: string;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: await encryptionService.hashPassword('password123'),
        role: 'USER'
      }
    });

    // Create test API connection
    testApiConnection = await prisma.apiConnection.create({
      data: {
        userId: testUser.id,
        name: 'Test OAuth2 API',
        description: 'Test OAuth2 API connection',
        baseUrl: 'https://api.example.com',
        authType: 'OAUTH2',
        authConfig: {
          provider: 'github',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUri: 'http://localhost:3000/api/oauth/callback'
        }
      }
    });

    // Generate auth token
    authToken = generateToken({
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      role: testUser.role,
      isActive: testUser.isActive
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.apiCredential.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.apiConnection.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/oauth/providers', () => {
    it('should return supported OAuth2 providers', async () => {
      const mockProviders = ['github', 'google', 'slack'];
      const mockProviderConfig = {
        name: 'GitHub',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scope: 'repo user'
      };

      (oauth2Service.getSupportedProviders as jest.Mock).mockReturnValue(mockProviders);
      (oauth2Service.getProviderConfig as jest.Mock).mockReturnValue(mockProviderConfig);

      const response = await request(server)
        .get('/api/oauth/providers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.providers).toHaveLength(3);
      expect(response.body.count).toBe(3);
      expect(response.body.providers[0]).toHaveProperty('name', 'github');
      expect(response.body.providers[0]).toHaveProperty('displayName', 'GitHub');
    });

    it('should require authentication', async () => {
      await request(server)
        .get('/api/oauth/providers')
        .expect(401);
    });
  });

  describe('GET /api/oauth/authorize', () => {
    it('should generate authorization URL for valid request', async () => {
      const mockAuthUrl = 'https://github.com/login/oauth/authorize?client_id=test&redirect_uri=test&response_type=code&scope=repo&state=test';
      
      (oauth2Service.validateConfig as jest.Mock).mockReturnValue([]);
      (oauth2Service.getSupportedProviders as jest.Mock).mockReturnValue(['github']);
      (oauth2Service.generateAuthorizationUrl as jest.Mock).mockReturnValue(mockAuthUrl);

      const response = await request(server)
        .get('/api/oauth/authorize')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          apiConnectionId: testApiConnection.id,
          provider: 'github',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUri: 'http://localhost:3000/api/oauth/callback',
          scope: 'repo user'
        })
        .expect(302); // Redirect

      expect(response.headers.location).toBe(mockAuthUrl);
    });

    it('should validate required parameters', async () => {
      const response = await request(server)
        .get('/api/oauth/authorize')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          provider: 'github'
          // Missing apiConnectionId, clientId, etc.
        })
        .expect(400);

      expect(response.body.error).toContain('apiConnectionId is required');
    });

    it('should validate OAuth2 configuration', async () => {
      (oauth2Service.validateConfig as jest.Mock).mockReturnValue(['clientId is required']);

      const response = await request(server)
        .get('/api/oauth/authorize')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          apiConnectionId: testApiConnection.id,
          provider: 'github',
          clientId: '',
          clientSecret: 'test-client-secret',
          redirectUri: 'http://localhost:3000/api/oauth/callback'
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid OAuth2 configuration');
    });

    it('should reject unsupported providers', async () => {
      (oauth2Service.getSupportedProviders as jest.Mock).mockReturnValue(['github']);

      const response = await request(server)
        .get('/api/oauth/authorize')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          apiConnectionId: testApiConnection.id,
          provider: 'unsupported-provider',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUri: 'http://localhost:3000/api/oauth/callback'
        })
        .expect(400);

      expect(response.body.error).toContain('Unsupported OAuth2 provider');
    });
  });

  describe('GET /api/oauth/callback', () => {
    it('should process successful OAuth2 callback', async () => {
      (oauth2Service.processCallback as jest.Mock).mockResolvedValue({
        success: true
      });

      const response = await request(server)
        .get('/api/oauth/callback')
        .query({
          code: 'test-authorization-code',
          state: 'test-state'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('OAuth2 authorization completed successfully');
    });

    it('should handle OAuth2 errors', async () => {
      const response = await request(server)
        .get('/api/oauth/callback')
        .query({
          error: 'access_denied',
          error_description: 'User denied access'
        })
        .expect(400);

      expect(response.body.error).toBe('OAuth2 authorization failed');
      expect(response.body.details).toBe('User denied access');
    });

    it('should validate required parameters', async () => {
      const response = await request(server)
        .get('/api/oauth/callback')
        .query({
          state: 'test-state'
          // Missing code
        })
        .expect(400);

      expect(response.body.error).toBe('Authorization code is required');
    });
  });

  describe('POST /api/oauth/refresh', () => {
    it('should refresh OAuth2 token successfully', async () => {
      (oauth2Service.refreshToken as jest.Mock).mockResolvedValue(true);

      const response = await request(server)
        .post('/api/oauth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          apiConnectionId: testApiConnection.id,
          provider: 'github'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('OAuth2 token refreshed successfully');
    });

    it('should handle refresh failure', async () => {
      (oauth2Service.refreshToken as jest.Mock).mockResolvedValue(false);

      const response = await request(server)
        .post('/api/oauth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          apiConnectionId: testApiConnection.id,
          provider: 'github'
        })
        .expect(400);

      expect(response.body.error).toBe('Failed to refresh OAuth2 token');
    });

    it('should validate required parameters', async () => {
      const response = await request(server)
        .post('/api/oauth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'github'
          // Missing apiConnectionId
        })
        .expect(400);

      expect(response.body.error).toBe('apiConnectionId is required');
    });
  });

  describe('GET /api/oauth/token', () => {
    it('should return OAuth2 access token', async () => {
      const mockAccessToken = 'test-access-token';
      (oauth2Service.getAccessToken as jest.Mock).mockResolvedValue(mockAccessToken);

      const response = await request(server)
        .get('/api/oauth/token')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          apiConnectionId: testApiConnection.id
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBe(mockAccessToken);
      expect(response.body.tokenType).toBe('Bearer');
    });

    it('should handle missing token', async () => {
      (oauth2Service.getAccessToken as jest.Mock).mockResolvedValue(null);

      const response = await request(server)
        .get('/api/oauth/token')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          apiConnectionId: testApiConnection.id
        })
        .expect(404);

      expect(response.body.error).toBe('No valid OAuth2 access token found');
    });

    it('should reject non-OAuth2 API connections', async () => {
      // Create a non-OAuth2 API connection
      const nonOAuthConnection = await prisma.apiConnection.create({
        data: {
          userId: testUser.id,
          name: 'Test Non-OAuth2 API',
          description: 'Test non-OAuth2 API connection',
          baseUrl: 'https://api.example.com',
          authType: 'API_KEY',
          authConfig: {
            apiKey: 'test-api-key'
          }
        }
      });

      const response = await request(server)
        .get('/api/oauth/token')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          apiConnectionId: nonOAuthConnection.id
        })
        .expect(400);

      expect(response.body.error).toBe('API connection does not use OAuth2 authentication');

      // Clean up
      await prisma.apiConnection.delete({
        where: { id: nonOAuthConnection.id }
      });
    });
  });

  describe('OAuth2 Service Integration', () => {
    it('should store and retrieve OAuth2 tokens securely', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'repo user'
      };

      const mockEncryptedAccessToken = {
        encryptedData: 'encrypted-access-token',
        keyId: 'test-key-id'
      };

      const mockEncryptedRefreshToken = {
        encryptedData: 'encrypted-refresh-token',
        keyId: 'test-key-id'
      };

      (encryptionService.encrypt as jest.Mock)
        .mockReturnValueOnce(mockEncryptedAccessToken)
        .mockReturnValueOnce(mockEncryptedRefreshToken);

      (encryptionService.decrypt as jest.Mock)
        .mockReturnValue('test-access-token');

      // Test token storage and retrieval
      const accessToken = await oauth2Service.getAccessToken(testUser.id, testApiConnection.id);
      
      expect(accessToken).toBe('test-access-token');
      expect(encryptionService.encrypt).toHaveBeenCalledWith('test-access-token');
      expect(encryptionService.decrypt).toHaveBeenCalledWith('encrypted-access-token');
    });
  });
}); 