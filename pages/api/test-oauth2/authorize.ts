import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract OAuth2 parameters from query string
    const { 
      client_id, 
      redirect_uri, 
      response_type, 
      scope, 
      state 
    } = req.query;

    console.log('🔍 Test OAuth2 Provider - Authorization request:', {
      client_id,
      redirect_uri,
      response_type,
      scope,
      state: state ? '***' : undefined
    });

    // Validate required parameters
    if (!client_id || typeof client_id !== 'string') {
      return res.status(400).json({ error: 'client_id is required' });
    }

    if (!redirect_uri || typeof redirect_uri !== 'string') {
      return res.status(400).json({ error: 'redirect_uri is required' });
    }

    if (!response_type || typeof response_type !== 'string') {
      return res.status(400).json({ error: 'response_type is required' });
    }

    if (!state || typeof state !== 'string') {
      return res.status(400).json({ error: 'state is required' });
    }

    // For test purposes, we'll automatically approve the authorization
    // In a real OAuth2 provider, this would show a consent page to the user
    
    // Generate a mock authorization code
    const authorizationCode = `test_auth_code_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Build the redirect URL with the authorization code
    // IMPORTANT: Preserve the exact state parameter that was received
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', authorizationCode);
    redirectUrl.searchParams.set('state', state); // Use the exact state parameter received
    
    console.log('🔄 Test OAuth2 Provider - Redirecting to callback:', redirectUrl.toString());

    // Redirect back to the client with the authorization code
    res.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('❌ Test OAuth2 Provider - Authorization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 