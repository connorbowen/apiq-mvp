import { NextApiRequest, NextApiResponse } from 'next';

// Only allow this endpoint in test environment or when explicitly enabled
if (process.env.NODE_ENV !== 'test' && process.env.ENABLE_TEST_OAUTH2 !== 'true') {
  throw new Error('Test OAuth2 endpoints are only available in test environment');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;

    console.log('🔍 Test OAuth2 Provider - Userinfo request:', {
      hasAuthHeader: !!authHeader
    });

    // Validate authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'invalid_token',
        error_description: 'Valid Bearer token is required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate token format (in a real implementation, this would validate against a database)
    if (!token.startsWith('test_access_token_')) {
      return res.status(401).json({ 
        error: 'invalid_token',
        error_description: 'Invalid token format'
      });
    }

    // Return user information
    // In a real implementation, this would fetch user data from a database
    // For test purposes, we'll return consistent test user data
    const userInfo = {
      sub: `test-user-${Date.now()}`,
      name: 'Test User',
      email: 'test@example.com',
      email_verified: true,
      picture: 'https://via.placeholder.com/150',
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