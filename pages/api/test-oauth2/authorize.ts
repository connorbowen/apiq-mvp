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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      response_type, 
      client_id, 
      redirect_uri, 
      scope, 
      state 
    } = req.query;

    console.log('🔍 Test OAuth2 Provider - Authorization request:', {
      response_type,
      client_id: client_id ? '***' : undefined,
      redirect_uri,
      scope,
      state
    });

    // Validate required parameters
    if (response_type !== 'code') {
      return res.status(400).json({ 
        error: 'unsupported_response_type',
        error_description: 'Only authorization code flow is supported'
      });
    }

    if (!client_id) {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'client_id is required'
      });
    }

    if (!redirect_uri) {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'redirect_uri is required'
      });
    }

    // Generate authorization code
    const authCode = `test_auth_code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store the authorization code temporarily (in a real implementation, this would be in a database)
    // For test purposes, we'll use a simple in-memory store
    if (!global.testOAuth2Codes) {
      global.testOAuth2Codes = new Map();
    }
    global.testOAuth2Codes.set(authCode, {
      client_id,
      redirect_uri,
      scope,
      state,
      expires_at: Date.now() + 60000 // 1 minute expiry
    });

    // Build redirect URL
    const redirectUrl = new URL(redirect_uri as string);
    redirectUrl.searchParams.set('code', authCode);
    if (state) {
      redirectUrl.searchParams.set('state', state as string);
    }

    console.log('✅ Test OAuth2 Provider - Authorization successful');

    res.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('❌ Test OAuth2 Provider - Authorization error:', error);
    res.status(500).json({ 
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
} 