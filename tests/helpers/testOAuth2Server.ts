import { NextApiRequest, NextApiResponse } from 'next';
import { createHash, randomBytes } from 'crypto';

interface TestOAuth2State {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  timestamp: number;
}

interface TestOAuth2Code {
  code: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  expiresAt: number;
}

// In-memory storage for test OAuth2 server
const authorizationCodes = new Map<string, TestOAuth2Code>();
const pendingAuthorizations = new Map<string, TestOAuth2State>();

export class TestOAuth2Server {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.clientId = 'test-client-id';
    this.clientSecret = 'test-client-secret';
  }

  /**
   * Generate authorization URL for test OAuth2 provider
   */
  generateAuthorizationUrl(params: {
    clientId: string;
    redirectUri: string;
    scope: string;
    state: string;
  }): string {
    const authState: TestOAuth2State = {
      ...params,
      timestamp: Date.now()
    };

    const stateId = this.generateStateId(authState);
    pendingAuthorizations.set(stateId, authState);

    const url = new URL(`${this.baseUrl}/api/test-oauth2/authorize`);
    url.searchParams.set('state_id', stateId);
    url.searchParams.set('client_id', params.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri);
    url.searchParams.set('scope', params.scope);
    url.searchParams.set('state', params.state);

    return url.toString();
  }

  /**
   * Handle authorization request (simulates user approving the app)
   */
  handleAuthorization(req: NextApiRequest, res: NextApiResponse): void {
    const { state_id, client_id, redirect_uri, scope, state } = req.query;

    if (!state_id || typeof state_id !== 'string') {
      return res.status(400).json({ error: 'Invalid state_id' });
    }

    const authState = pendingAuthorizations.get(state_id);
    if (!authState) {
      return res.status(400).json({ error: 'Invalid or expired authorization request' });
    }

    // Validate parameters
    if (authState.clientId !== client_id || 
        authState.redirectUri !== redirect_uri || 
        authState.scope !== scope || 
        authState.state !== state) {
      return res.status(400).json({ error: 'Parameter mismatch' });
    }

    // Generate authorization code
    const code = this.generateAuthorizationCode();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

    const authCode: TestOAuth2Code = {
      code,
      clientId: authState.clientId,
      redirectUri: authState.redirectUri,
      scope: authState.scope,
      state: authState.state,
      expiresAt
    };

    authorizationCodes.set(code, authCode);
    pendingAuthorizations.delete(state_id);

    // Redirect back to client with authorization code
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('state', state);

    res.redirect(redirectUrl.toString());
  }

  /**
   * Handle token exchange request
   */
  handleTokenExchange(req: NextApiRequest, res: NextApiResponse): void {
    const { client_id, client_secret, code, grant_type, redirect_uri } = req.body;

    if (grant_type !== 'authorization_code') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    if (client_id !== this.clientId || client_secret !== this.clientSecret) {
      return res.status(401).json({ error: 'invalid_client' });
    }

    const authCode = authorizationCodes.get(code);
    if (!authCode) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    if (authCode.expiresAt < Date.now()) {
      authorizationCodes.delete(code);
      return res.status(400).json({ error: 'invalid_grant' });
    }

    if (authCode.redirectUri !== redirect_uri) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    // Generate real tokens
    const accessToken = this.generateAccessToken();
    const refreshToken = this.generateRefreshToken();

    // Clean up used authorization code
    authorizationCodes.delete(code);

    // Return token response
    res.status(200).json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: authCode.scope
    });
  }

  /**
   * Handle refresh token request
   */
  handleTokenRefresh(req: NextApiRequest, res: NextApiResponse): void {
    const { client_id, client_secret, refresh_token, grant_type } = req.body;

    if (grant_type !== 'refresh_token') {
      return res.status(400).json({ error: 'unsupported_grant_type' });
    }

    if (client_id !== this.clientId || client_secret !== this.clientSecret) {
      return res.status(401).json({ error: 'invalid_client' });
    }

    // In a real implementation, you'd validate the refresh token
    // For testing, we'll accept any refresh token and generate new tokens
    const newAccessToken = this.generateAccessToken();
    const newRefreshToken = this.generateRefreshToken();

    res.status(200).json({
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: newRefreshToken
    });
  }

  /**
   * Clear all test data
   */
  clearTestData(): void {
    authorizationCodes.clear();
    pendingAuthorizations.clear();
  }

  private generateStateId(state: TestOAuth2State): string {
    const data = `${state.clientId}:${state.redirectUri}:${state.scope}:${state.state}:${state.timestamp}`;
    return createHash('sha256').update(data).digest('hex');
  }

  private generateAuthorizationCode(): string {
    return randomBytes(32).toString('hex');
  }

  private generateAccessToken(): string {
    return `test_access_${randomBytes(32).toString('hex')}`;
  }

  private generateRefreshToken(): string {
    return `test_refresh_${randomBytes(32).toString('hex')}`;
  }
}

// Export singleton instance
export const testOAuth2Server = new TestOAuth2Server(); 