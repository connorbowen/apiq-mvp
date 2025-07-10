import { NextApiRequest, NextApiResponse } from 'next';

// Only allow this endpoint in test environment or when explicitly enabled
if (process.env.NODE_ENV !== 'test' && process.env.ENABLE_TEST_OAUTH2 !== 'true') {
  throw new Error('Test OAuth2 endpoints are only available in test environment');
}

// Type declaration for global test OAuth2 codes
declare global {
  var testOAuth2Codes: Map<string, any> | undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      grant_type, 
      code, 
      redirect_uri, 
      client_id, 
      client_secret 
    } = req.body;

    console.log('🔍 Test OAuth2 Provider - Token request:', {
      grant_type,
      code: code ? '***' : undefined,
      redirect_uri,
      client_id: client_id ? '***' : undefined,
      client_secret: client_secret ? '***' : undefined
    });

    // Validate required parameters
    if (grant_type !== 'authorization_code') {
      return res.status(400).json({ 
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported'
      });
    }

    if (!code) {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'code is required'
      });
    }

    if (!redirect_uri) {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'redirect_uri is required'
      });
    }

    // Validate authorization code
    if (!global.testOAuth2Codes || !global.testOAuth2Codes.has(code)) {
      return res.status(400).json({ 
        error: 'invalid_grant',
        error_description: 'Invalid authorization code'
      });
    }

    const authData = global.testOAuth2Codes.get(code);
    
    // Check if code has expired
    if (authData.expires_at < Date.now()) {
      global.testOAuth2Codes.delete(code);
      return res.status(400).json({ 
        error: 'invalid_grant',
        error_description: 'Authorization code has expired'
      });
    }

    // Validate redirect_uri matches
    if (authData.redirect_uri !== redirect_uri) {
      return res.status(400).json({ 
        error: 'invalid_grant',
        error_description: 'redirect_uri does not match'
      });
    }

    // Generate access token
    const accessToken = `test_access_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const refreshToken = `test_refresh_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Clean up the authorization code
    global.testOAuth2Codes.delete(code);

    // Return token response
    const tokenResponse = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 1 hour
      refresh_token: refreshToken,
      scope: authData.scope || 'read write'
    };

    console.log('✅ Test OAuth2 Provider - Token exchange successful');

    res.status(200).json(tokenResponse);

  } catch (error) {
    console.error('❌ Test OAuth2 Provider - Token exchange error:', error);
    res.status(500).json({ 
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
} 