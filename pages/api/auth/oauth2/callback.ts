import { NextApiRequest, NextApiResponse } from 'next';
import { logError, logInfo } from '../../../../src/utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { code, state, error, connectionId } = req.query;

    // Handle OAuth2 errors from provider
    if (error) {
      logError('OAuth2 provider error', new Error(error as string), {
        error,
        state,
        connectionId
      });

      // Determine redirect URL based on context
      if (connectionId) {
        // Redirect back to connection OAuth2 page with error
        const redirectUrl = new URL(`/connections/${connectionId}/oauth2`, process.env.NEXTAUTH_URL || 'http://localhost:3001');
        redirectUrl.searchParams.set('error', 'oauth2_provider_error');
        redirectUrl.searchParams.set('details', error as string);
        return res.redirect(redirectUrl.toString());
      } else {
        // Redirect to login page with error
        return res.redirect(`/login?error=oauth2_error&details=${encodeURIComponent(error as string)}`);
      }
    }

    if (!code || !state) {
      logError('Missing OAuth2 code or state', new Error('Missing required OAuth2 parameters'), {
        code: !!code,
        state: !!state,
        connectionId
      });

      if (connectionId) {
        const redirectUrl = new URL(`/connections/${connectionId}/oauth2`, process.env.NEXTAUTH_URL || 'http://localhost:3001');
        redirectUrl.searchParams.set('error', 'missing_code_or_state');
        return res.redirect(redirectUrl.toString());
      } else {
        return res.redirect('/login?error=missing_code_or_state');
      }
    }

    // Exchange the authorization code for tokens
    const tokenResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/auth/oauth2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        state,
        connectionId,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      logError('OAuth2 token exchange failed', new Error(errorData.error || 'Token exchange failed'), {
        status: tokenResponse.status,
        error: errorData.error,
        connectionId
      });

      if (connectionId) {
        const redirectUrl = new URL(`/connections/${connectionId}/oauth2`, process.env.NEXTAUTH_URL || 'http://localhost:3001');
        redirectUrl.searchParams.set('error', 'token_exchange_failed');
        redirectUrl.searchParams.set('details', errorData.error || 'Unknown error');
        return res.redirect(redirectUrl.toString());
      } else {
        return res.redirect(`/login?error=token_exchange_failed&details=${encodeURIComponent(errorData.error || 'Unknown error')}`);
      }
    }

    const authData = await tokenResponse.json();

    if (authData.success && authData.data) {
      logInfo('OAuth2 callback successful', {
        connectionId,
        provider: authData.data.provider,
        hasAccessToken: !!authData.data.accessToken
      });

      if (connectionId) {
        // Redirect back to connection OAuth2 page with success
        const redirectUrl = new URL(`/connections/${connectionId}/oauth2`, process.env.NEXTAUTH_URL || 'http://localhost:3001');
        redirectUrl.searchParams.set('success', 'oauth2_authorized');
        redirectUrl.searchParams.set('provider', authData.data.provider || 'unknown');
        return res.redirect(redirectUrl.toString());
      } else {
        // Redirect to dashboard with tokens in URL params (in production, use secure cookies)
        const redirectUrl = new URL('/dashboard', process.env.NEXTAUTH_URL || 'http://localhost:3001');
        redirectUrl.searchParams.set('accessToken', authData.data.accessToken);
        redirectUrl.searchParams.set('refreshToken', authData.data.refreshToken);
        redirectUrl.searchParams.set('user', JSON.stringify(authData.data.user));
        redirectUrl.searchParams.set('oauth2_success', 'true');
        
        return res.redirect(redirectUrl.toString());
      }
    } else {
      logError('OAuth2 callback failed', new Error(authData.error || 'OAuth2 callback failed'), {
        error: authData.error,
        connectionId
      });

      if (connectionId) {
        const redirectUrl = new URL(`/connections/${connectionId}/oauth2`, process.env.NEXTAUTH_URL || 'http://localhost:3001');
        redirectUrl.searchParams.set('error', 'oauth2_failed');
        redirectUrl.searchParams.set('details', authData.error || 'Unknown error');
        return res.redirect(redirectUrl.toString());
      } else {
        return res.redirect(`/login?error=oauth2_failed&details=${encodeURIComponent(authData.error || 'Unknown error')}`);
      }
    }

  } catch (error) {
    logError('OAuth2 callback error', error instanceof Error ? error : new Error(String(error)), {
      connectionId: req.query.connectionId
    });

    const connectionId = req.query.connectionId;
    if (connectionId) {
      const redirectUrl = new URL(`/connections/${connectionId}/oauth2`, process.env.NEXTAUTH_URL || 'http://localhost:3001');
      redirectUrl.searchParams.set('error', 'oauth2_callback_error');
      return res.redirect(redirectUrl.toString());
    } else {
      return res.redirect('/login?error=oauth2_callback_error');
    }
  }
} 