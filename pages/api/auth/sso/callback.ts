import { NextApiRequest, NextApiResponse } from 'next';
import { logError, logInfo } from '../../../../src/utils/logger';

/**
 * Google SSO OAuth2 Callback Handler
 * 
 * This endpoint handles the OAuth2 callback from Google for user authentication (SSO).
 * It's separate from the API connection OAuth2 flow which is handled in /api/connections/oauth2/.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { code, state, error } = req.query;

    // Handle OAuth2 errors from provider
    if (error) {
      logError('Google SSO OAuth2 provider error', new Error(error as string), {
        error,
        state
      });

      // Redirect to login page with error
      return res.redirect(`/login?error=oauth2_error&details=${encodeURIComponent(error as string)}`);
    }

    if (!code || !state) {
      logError('Missing Google SSO OAuth2 code or state', new Error('Missing required OAuth2 parameters'), {
        code: !!code,
        state: !!state
      });

      return res.redirect('/login?error=missing_code_or_state');
    }

    // Exchange the authorization code for tokens
    const tokenResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/auth/sso/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        state,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      logError('Google SSO OAuth2 token exchange failed', new Error(errorData.error || 'Token exchange failed'), {
        status: tokenResponse.status,
        error: errorData.error
      });

      return res.redirect(`/login?error=token_exchange_failed&details=${encodeURIComponent(errorData.error || 'Unknown error')}`);
    }

    const authData = await tokenResponse.json();

    if (authData.success && authData.data) {
      logInfo('Google SSO OAuth2 callback successful', {
        provider: authData.data.provider,
        hasAccessToken: !!authData.data.accessToken
      });

      // Redirect to dashboard with tokens in URL params (in production, use secure cookies)
      const redirectUrl = new URL('/dashboard', process.env.NEXTAUTH_URL || 'http://localhost:3001');
      redirectUrl.searchParams.set('accessToken', authData.data.accessToken);
      redirectUrl.searchParams.set('refreshToken', authData.data.refreshToken);
      redirectUrl.searchParams.set('user', JSON.stringify(authData.data.user));
      redirectUrl.searchParams.set('oauth2_success', 'true');
      
      return res.redirect(redirectUrl.toString());
    } else {
      logError('Google SSO OAuth2 callback failed', new Error(authData.error || 'OAuth2 callback failed'), {
        error: authData.error
      });

      return res.redirect(`/login?error=oauth2_failed&details=${encodeURIComponent(authData.error || 'Unknown error')}`);
    }

  } catch (error) {
    logError('Google SSO OAuth2 callback error', error instanceof Error ? error : new Error(String(error)));

    return res.redirect('/login?error=oauth2_callback_error');
  }
} 