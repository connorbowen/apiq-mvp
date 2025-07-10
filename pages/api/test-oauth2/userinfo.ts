import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    console.log('🔍 Test OAuth2 Provider - Userinfo request:', {
      authorization: authHeader ? '***' : undefined
    });

    // Validate authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'invalid_token',
        error_description: 'Bearer token is required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // For test purposes, we'll accept any access token that starts with 'test_access_token_'
    if (!token.startsWith('test_access_token_')) {
      return res.status(401).json({ 
        error: 'invalid_token',
        error_description: 'Invalid access token'
      });
    }

    // Return mock user information
    const userInfo = {
      sub: 'test-user-123',
      name: 'Test User',
      email: 'test@example.com',
      email_verified: true,
      picture: 'https://via.placeholder.com/150',
      given_name: 'Test',
      family_name: 'User',
      locale: 'en',
      updated_at: Math.floor(Date.now() / 1000)
    };

    console.log('✅ Test OAuth2 Provider - Userinfo successful');

    res.status(200).json(userInfo);

  } catch (error) {
    console.error('❌ Test OAuth2 Provider - Userinfo error:', error);
    res.status(500).json({ 
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
} 