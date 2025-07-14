import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../src/lib/singletons/prisma';
import { generateToken } from '../../../../src/lib/auth/session';
import { ApplicationError } from '../../../../src/lib/errors/ApplicationError';

// Google SSO OAuth2 configuration for user authentication
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.OAUTH2_REDIRECT_URI || 'http://localhost:3000/api/auth/sso/callback';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Initiate OAuth2 flow
    await handleOAuth2Initiate(req, res);
  } else if (req.method === 'POST') {
    // Handle OAuth2 callback
    await handleOAuth2Callback(req, res);
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }
}

async function handleOAuth2Initiate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { provider } = req.query;

    if (provider !== 'google') {
      return res.status(400).json({
        success: false,
        error: 'Only Google OAuth2 is supported for user authentication',
        code: 'UNSUPPORTED_PROVIDER'
      });
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        error: 'Google OAuth2 is not configured',
        code: 'OAUTH2_NOT_CONFIGURED'
      });
    }

    // Generate state parameter for CSRF protection
    const state = Buffer.from(JSON.stringify({
      provider,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2)
    })).toString('base64');

    // Build Google OAuth2 authorization URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);

    return res.status(200).json({
      success: true,
      data: {
        redirectUrl: authUrl.toString(),
        state
      }
    });

  } catch (error) {
    console.error('OAuth2 initiate error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to initiate OAuth2 flow',
      code: 'OAUTH2_INITIATE_ERROR'
    });
  }
}

async function handleOAuth2Callback(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { code, state, error } = req.body;

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'OAuth2 authorization failed',
        details: error,
        code: 'OAUTH2_ERROR'
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'Missing authorization code or state',
        code: 'INVALID_CALLBACK'
      });
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'Google OAuth2 is not configured',
        code: 'OAUTH2_NOT_CONFIGURED'
      });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Google token exchange failed:', errorData);
      return res.status(400).json({
        success: false,
        error: 'Failed to exchange authorization code for token',
        code: 'TOKEN_EXCHANGE_FAILED'
      });
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return res.status(400).json({
        success: false,
        error: 'Failed to get user info from Google',
        code: 'USER_INFO_FAILED'
      });
    }

    const userInfo = await userInfoResponse.json();
    const { id: googleId, email, name, picture } = userInfo;

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { provider: 'google', providerUserId: googleId }
        ]
      }
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          password: '', // OAuth2 users don't need passwords
          role: 'USER',
          isActive: true,
          provider: 'google',
          providerUserId: googleId
        }
      });
    } else {
      // Update existing user's OAuth2 info if needed
      if (!user.provider || !user.providerUserId) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            provider: 'google',
            providerUserId: googleId,
            lastLogin: new Date()
          }
        });
      } else {
        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        });
      }
    }

    // Generate JWT tokens
    const accessToken = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive
    }, 'access');

    const refreshToken = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive
    }, 'refresh');

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('OAuth2 callback error:', error);
    return res.status(500).json({
      success: false,
      error: 'OAuth2 authentication failed',
      code: 'OAUTH2_CALLBACK_ERROR'
    });
  }
} 