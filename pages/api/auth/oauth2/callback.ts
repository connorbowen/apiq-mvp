import { NextApiRequest, NextApiResponse } from 'next';

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

    if (error) {
      // Redirect to login page with error
      return res.redirect(`/login?error=oauth2_error&details=${encodeURIComponent(error as string)}`);
    }

    if (!code || !state) {
      return res.redirect('/login?error=missing_code_or_state');
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
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      return res.redirect(`/login?error=token_exchange_failed&details=${encodeURIComponent(errorData.error || 'Unknown error')}`);
    }

    const authData = await tokenResponse.json();

    if (authData.success && authData.data) {
      // Redirect to dashboard with tokens in URL params (in production, use secure cookies)
      const redirectUrl = new URL('/dashboard', process.env.NEXTAUTH_URL || 'http://localhost:3001');
      redirectUrl.searchParams.set('accessToken', authData.data.accessToken);
      redirectUrl.searchParams.set('refreshToken', authData.data.refreshToken);
      redirectUrl.searchParams.set('user', JSON.stringify(authData.data.user));
      redirectUrl.searchParams.set('oauth2_success', 'true');
      
      return res.redirect(redirectUrl.toString());
    } else {
      return res.redirect(`/login?error=oauth2_failed&details=${encodeURIComponent(authData.error || 'Unknown error')}`);
    }

  } catch (error) {
    console.error('OAuth2 callback error:', error);
    return res.redirect('/login?error=oauth2_callback_error');
  }
} 