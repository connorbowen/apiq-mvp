import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the request body (OAuth2 token requests are typically form-encoded)
    const body = req.body;
    
    console.log('🔍 Test OAuth2 Provider - Token request:', {
      grant_type: body.grant_type,
      code: body.code ? '***' : undefined,
      client_id: body.client_id ? '***' : undefined,
      redirect_uri: body.redirect_uri
    });

    // Validate required parameters
    if (!body.grant_type || body.grant_type !== 'authorization_code') {
      return res.status(400).json({ 
        error: 'invalid_grant',
        error_description: 'grant_type must be authorization_code'
      });
    }

    if (!body.code || typeof body.code !== 'string') {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'code is required'
      });
    }

    if (!body.client_id || typeof body.client_id !== 'string') {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'client_id is required'
      });
    }

    if (!body.redirect_uri || typeof body.redirect_uri !== 'string') {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'redirect_uri is required'
      });
    }

    // For test purposes, we'll accept any authorization code that starts with 'test_auth_code_'
    if (!body.code.startsWith('test_auth_code_')) {
      return res.status(400).json({ 
        error: 'invalid_grant',
        error_description: 'Invalid authorization code'
      });
    }

    // Generate mock tokens
    const accessToken = `test_access_token_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const refreshToken = `test_refresh_token_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Return the tokens in the standard OAuth2 format
    const tokenResponse = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 1 hour
      refresh_token: refreshToken,
      scope: body.scope || 'read write'
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