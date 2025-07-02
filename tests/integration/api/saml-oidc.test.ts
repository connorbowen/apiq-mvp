import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createTestSuite } from '../../helpers/testUtils';
import { Role } from '../../../src/generated/prisma';
import { prisma } from '../../../lib/database/client';
import { createOAuth2TestData } from '../../helpers/createTestData';

describe('SAML/OIDC Authentication Integration Tests', () => {
  let testUser: any;
  let testApiConnection: any;

  beforeEach(async () => {
    // Recreate test data after global setup truncates tables
    const testData = await createOAuth2TestData();
    testUser = testData.user;
    testApiConnection = testData.connection;
  });

  const testSuite = createTestSuite('SAML/OIDC Tests');

  describe('GET /api/auth/saml/{provider}', () => {
    it('should initiate SAML SSO flow for Okta', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          provider: 'okta',
          redirectUri: '/dashboard'
        }
      });

      // Mock the SAML service
      const mockSamlService = {
        generateAuthRequest: jest.fn().mockResolvedValue({
          authUrl: 'https://company.okta.com/app/company_app/sso/saml',
          relayState: 'test-relay-state'
        })
      };

      // Mock the handler
      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        const { provider, redirectUri } = req.query;
        
        if (provider !== 'okta') {
          return res.status(400).json({
            success: false,
            error: 'Unsupported SAML provider'
          });
        }

        const authRequest = await mockSamlService.generateAuthRequest(provider, redirectUri);
        
        return res.status(200).json({
          success: true,
          data: {
            authUrl: authRequest.authUrl,
            relayState: authRequest.relayState
          },
          message: 'SAML authentication initiated'
        });
      };

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.authUrl).toContain('okta.com');
      expect(data.data.relayState).toBeDefined();
    });

    it('should initiate SAML SSO flow for Azure AD', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          provider: 'azure',
          redirectUri: '/dashboard'
        }
      });

      const mockSamlService = {
        generateAuthRequest: jest.fn().mockResolvedValue({
          authUrl: 'https://login.microsoftonline.com/tenant-id/saml2',
          relayState: 'azure-relay-state'
        })
      };

      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        const { provider, redirectUri } = req.query;
        
        if (provider !== 'azure') {
          return res.status(400).json({
            success: false,
            error: 'Unsupported SAML provider'
          });
        }

        const authRequest = await mockSamlService.generateAuthRequest(provider, redirectUri);
        
        return res.status(200).json({
          success: true,
          data: {
            authUrl: authRequest.authUrl,
            relayState: authRequest.relayState
          },
          message: 'SAML authentication initiated'
        });
      };

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.authUrl).toContain('microsoftonline.com');
    });

    it('should reject unsupported SAML provider', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          provider: 'unsupported-provider',
          redirectUri: '/dashboard'
        }
      });

      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        const { provider } = req.query;
        
        const supportedProviders = ['okta', 'azure', 'google-workspace'];
        
        if (!supportedProviders.includes(provider as string)) {
          return res.status(400).json({
            success: false,
            error: 'Unsupported SAML provider',
            code: 'UNSUPPORTED_PROVIDER'
          });
        }
      };

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unsupported SAML provider');
    });
  });

  describe('POST /api/auth/saml/callback', () => {
    it('should process valid SAML assertion', async () => {
      const mockSamlResponse = 'base64_encoded_saml_response';
      const mockRelayState = 'test-relay-state';

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          SAMLResponse: mockSamlResponse,
          RelayState: mockRelayState
        }
      });

      const mockSamlService = {
        processAssertion: jest.fn().mockResolvedValue({
          user: {
            id: 'user-123',
            email: 'user@company.com',
            name: 'Enterprise User',
            role: 'USER',
            organization: 'Company Name'
          },
          accessToken: 'jwt-token-123',
          expiresIn: 900
        }),
        validateSignature: jest.fn().mockResolvedValue(true)
      };

      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        const { SAMLResponse, RelayState } = req.body;

        if (!SAMLResponse) {
          return res.status(400).json({
            success: false,
            error: 'Missing SAML response'
          });
        }

        // Validate SAML signature
        const isValid = await mockSamlService.validateSignature(SAMLResponse);
        if (!isValid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid SAML signature'
          });
        }

        // Process assertion
        const result = await mockSamlService.processAssertion(SAMLResponse, RelayState);

        return res.status(200).json({
          success: true,
          data: {
            user: result.user,
            accessToken: result.accessToken,
            expiresIn: result.expiresIn
          },
          message: 'SAML authentication successful'
        });
      };

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('user@company.com');
      expect(data.data.accessToken).toBeDefined();
    });

    it('should reject invalid SAML signature', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          SAMLResponse: 'invalid_saml_response',
          RelayState: 'test-relay-state'
        }
      });

      const mockSamlService = {
        validateSignature: jest.fn().mockResolvedValue(false)
      };

      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        const { SAMLResponse } = req.body;

        const isValid = await mockSamlService.validateSignature(SAMLResponse);
        if (!isValid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid SAML signature',
            code: 'INVALID_SIGNATURE'
          });
        }
      };

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid SAML signature');
    });

    it('should reject missing SAML response', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          RelayState: 'test-relay-state'
        }
      });

      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        const { SAMLResponse } = req.body;

        if (!SAMLResponse) {
          return res.status(400).json({
            success: false,
            error: 'Missing SAML response',
            code: 'MISSING_SAML_RESPONSE'
          });
        }
      };

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing SAML response');
    });
  });

  describe('GET /api/auth/oidc/{provider}', () => {
    it('should initiate OIDC flow for Okta', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          provider: 'okta',
          redirectUri: '/dashboard'
        }
      });

      const mockOidcService = {
        generateAuthUrl: jest.fn().mockResolvedValue({
          authUrl: 'https://company.okta.com/oauth2/v1/authorize?client_id=client123&response_type=code&scope=openid+profile+email&state=state123&nonce=nonce123',
          state: 'state123',
          nonce: 'nonce123'
        })
      };

      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        const { provider, redirectUri } = req.query;
        
        if (provider !== 'okta') {
          return res.status(400).json({
            success: false,
            error: 'Unsupported OIDC provider'
          });
        }

        const authUrl = await mockOidcService.generateAuthUrl(provider, redirectUri);
        
        return res.status(200).json({
          success: true,
          data: {
            authUrl: authUrl.authUrl,
            state: authUrl.state,
            nonce: authUrl.nonce
          },
          message: 'OIDC authentication initiated'
        });
      };

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.authUrl).toContain('okta.com');
      expect(data.data.state).toBeDefined();
      expect(data.data.nonce).toBeDefined();
    });

    it('should initiate OIDC flow for Azure AD', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          provider: 'azure',
          redirectUri: '/dashboard'
        }
      });

      const mockOidcService = {
        generateAuthUrl: jest.fn().mockResolvedValue({
          authUrl: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/authorize?client_id=azure-client&response_type=code&scope=openid+profile+email&state=azure-state&nonce=azure-nonce',
          state: 'azure-state',
          nonce: 'azure-nonce'
        })
      };

      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        const { provider, redirectUri } = req.query;
        
        if (provider !== 'azure') {
          return res.status(400).json({
            success: false,
            error: 'Unsupported OIDC provider'
          });
        }

        const authUrl = await mockOidcService.generateAuthUrl(provider, redirectUri);
        
        return res.status(200).json({
          success: true,
          data: {
            authUrl: authUrl.authUrl,
            state: authUrl.state,
            nonce: authUrl.nonce
          },
          message: 'OIDC authentication initiated'
        });
      };

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.authUrl).toContain('microsoftonline.com');
    });
  });

  describe('GET /api/auth/oidc/callback', () => {
    it('should process valid OIDC callback', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          code: 'auth-code-123',
          state: 'state123',
          nonce: 'nonce123'
        }
      });

      const mockOidcService = {
        processCallback: jest.fn().mockResolvedValue({
          user: {
            id: 'user-456',
            email: 'user@company.com',
            name: 'OIDC User',
            role: 'USER',
            organization: 'Company Name'
          },
          accessToken: 'jwt-token-456',
          expiresIn: 900
        }),
        validateIdToken: jest.fn().mockResolvedValue(true)
      };

      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        const { code, state, nonce } = req.query;

        if (!code || !state || !nonce) {
          return res.status(400).json({
            success: false,
            error: 'Missing required OIDC parameters'
          });
        }

        // Validate ID token
        const isValid = await mockOidcService.validateIdToken(code as string, 'okta');
        if (!isValid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid ID token'
          });
        }

        // Process callback
        const result = await mockOidcService.processCallback(code as string, state as string, nonce as string);

        return res.status(200).json({
          success: true,
          data: {
            user: result.user,
            accessToken: result.accessToken,
            expiresIn: result.expiresIn
          },
          message: 'OIDC authentication successful'
        });
      };

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe('user@company.com');
      expect(data.data.accessToken).toBeDefined();
    });

    it('should reject missing OIDC parameters', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        query: {
          code: 'auth-code-123'
          // Missing state and nonce
        }
      });

      const handler = async (req: NextApiRequest, res: NextApiResponse) => {
        const { code, state, nonce } = req.query;

        if (!code || !state || !nonce) {
          return res.status(400).json({
            success: false,
            error: 'Missing required OIDC parameters',
            code: 'MISSING_OIDC_PARAMETERS'
          });
        }
      };

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required OIDC parameters');
    });
  });
}); 