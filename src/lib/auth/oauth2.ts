import { prisma } from '../../../lib/database/client';
import { encryptionService as defaultEncryptionService, generateSecureToken as defaultGenerateSecureToken } from '../../utils/encryption';
import { ApplicationError } from '../../middleware/errorHandler';

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scope: string;
  state?: string;
  provider?: string;
}

export interface OAuth2TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface OAuth2State {
  userId: string;
  apiConnectionId: string;
  provider: string;
  timestamp: number;
  nonce: string;
}

export interface OAuth2Provider {
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  scope: string;
  userInfoUrl?: string;
}

export class OAuth2Service {
  private providers: Map<string, OAuth2Provider>;
  private encryptionService: any;
  private generateSecureToken: (length?: number) => string;
  private prismaClient: any;

  constructor({
    encryptionService = defaultEncryptionService,
    generateSecureToken = defaultGenerateSecureToken,
    prismaClient = prisma
  } = {}) {
    this.encryptionService = encryptionService;
    this.generateSecureToken = generateSecureToken;
    this.prismaClient = prismaClient;
    this.providers = new Map([
      ['github', {
        name: 'GitHub',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scope: 'repo user',
        userInfoUrl: 'https://api.github.com/user'
      }],
      ['google', {
        name: 'Google',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.modify',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
      }],
      ['test', {
        name: 'Test OAuth2 Provider',
        authorizationUrl: 'http://localhost:3000/api/test-oauth2/authorize',
        tokenUrl: 'http://localhost:3000/api/test-oauth2/token',
        scope: 'read write',
        userInfoUrl: 'http://localhost:3000/api/test-oauth2/userinfo'
      }]
    ]);
  }

  private initializeProviders(): void {
    // Google OAuth2
    this.providers.set('google', {
      name: 'Google',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
    });

    // GitHub OAuth2
    this.providers.set('github', {
      name: 'GitHub',
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scope: 'repo user',
      userInfoUrl: 'https://api.github.com/user'
    });

    // Slack OAuth2
    this.providers.set('slack', {
      name: 'Slack',
      authorizationUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scope: 'chat:write channels:read',
      userInfoUrl: 'https://slack.com/api/users.info'
    });
  }

  /**
   * Generate OAuth2 authorization URL
   */
  public generateAuthorizationUrl(
    userId: string,
    apiConnectionId: string,
    provider: string,
    config: OAuth2Config
  ): string {
    const providerInfo = this.providers.get(provider);
    if (!providerInfo) {
      throw new ApplicationError(`Unsupported OAuth2 provider: ${provider}`, 400, 'UNSUPPORTED_PROVIDER');
    }

    // Generate state parameter for CSRF protection
    const state: OAuth2State = {
      userId,
      apiConnectionId,
      provider,
      timestamp: Date.now(),
      nonce: this.generateSecureToken(16)
    };

    const stateParam = this.encodeState(state);

    // Build authorization URL
    const url = new URL(providerInfo.authorizationUrl);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', config.scope || providerInfo.scope);
    url.searchParams.set('state', stateParam);

    return url.toString();
  }

  /**
   * Process OAuth2 callback and exchange code for tokens
   */
  public async processCallback(
    code: string,
    state: string,
    config: OAuth2Config
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Decode and validate state
      const stateData = this.decodeState(state);
      if (!stateData) {
        throw new ApplicationError('Invalid state parameter', 400, 'INVALID_STATE');
      }

      // Check if state is expired (5 minutes)
      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        throw new ApplicationError('State parameter expired', 400, 'EXPIRED_STATE');
      }

      // Create config with provider from decoded state
      const configWithProvider = {
        ...config,
        provider: stateData.provider
      };

      // Exchange authorization code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(code, configWithProvider);
      if (!tokenResponse) {
        throw new ApplicationError('Failed to exchange code for tokens', 400, 'TOKEN_EXCHANGE_FAILED');
      }

      // Store tokens securely
      await this.storeTokens(
        stateData.userId,
        stateData.apiConnectionId,
        stateData.provider,
        tokenResponse
      );

      // Update API connection status
      await this.updateApiConnectionStatus(stateData.apiConnectionId, 'ACTIVE');

      return { success: true };
    } catch (error) {
      console.error('OAuth2 callback processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  private async exchangeCodeForTokens(code: string, config: OAuth2Config): Promise<OAuth2TokenResponse> {
    const provider = config.provider || config.state || 'generic';
    const providerInfo = this.providers.get(provider);
    if (!providerInfo) {
      throw new ApplicationError(`Unsupported OAuth2 provider: ${provider}`, 400, 'UNSUPPORTED_PROVIDER');
    }

    const tokenData = new URLSearchParams();
    tokenData.append('client_id', config.clientId);
    tokenData.append('client_secret', config.clientSecret);
    tokenData.append('code', code);
    tokenData.append('grant_type', 'authorization_code');
    tokenData.append('redirect_uri', config.redirectUri);

    const response = await fetch(providerInfo.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenData.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApplicationError(
        `Token exchange failed: ${response.status} ${errorText}`,
        response.status,
        'TOKEN_EXCHANGE_FAILED'
      );
    }

    const tokenResponse = await response.json();
    return tokenResponse;
  }

  /**
   * Store OAuth2 tokens securely
   */
  private async storeTokens(
    userId: string,
    apiConnectionId: string,
    provider: string,
    tokenResponse: OAuth2TokenResponse
  ): Promise<void> {
    try {
      console.log('🔍 OAuth2 Service - Storing tokens for:', {
        userId,
        apiConnectionId,
        provider,
        hasAccessToken: !!tokenResponse.access_token,
        hasRefreshToken: !!tokenResponse.refresh_token
      });

      // Encrypt tokens before storing
      const encryptedAccessToken = this.encryptionService.encrypt(tokenResponse.access_token);
      const encryptedRefreshToken = tokenResponse.refresh_token 
        ? this.encryptionService.encrypt(tokenResponse.refresh_token)
        : null;

      console.log('🔍 OAuth2 Service - Tokens encrypted successfully');

      // Calculate token expiration
      const expiresAt = tokenResponse.expires_in 
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : null;

      console.log('🔍 OAuth2 Service - Storing in ApiCredential table...');

      // Store in ApiCredential table with error handling
      try {
        await this.prismaClient.apiCredential.upsert({
          where: {
            userId_apiConnectionId: {
              userId,
              apiConnectionId
            }
          },
          update: {
            encryptedData: JSON.stringify({
              accessToken: encryptedAccessToken.encryptedData,
              refreshToken: encryptedRefreshToken?.encryptedData || null,
              tokenType: tokenResponse.token_type || 'Bearer',
              scope: tokenResponse.scope,
              provider
            }),
            keyId: encryptedAccessToken.keyId,
            expiresAt,
            updatedAt: new Date()
          },
          create: {
            userId,
            apiConnectionId,
            encryptedData: JSON.stringify({
              accessToken: encryptedAccessToken.encryptedData,
              refreshToken: encryptedRefreshToken?.encryptedData || null,
              tokenType: tokenResponse.token_type || 'Bearer',
              scope: tokenResponse.scope,
              provider
            }),
            keyId: encryptedAccessToken.keyId,
            expiresAt
          }
        });

        console.log('🔍 OAuth2 Service - Tokens stored successfully in ApiCredential');
      } catch (dbError) {
        console.error('🔍 OAuth2 Service - Database error storing tokens:', dbError);
        throw new ApplicationError(
          `Failed to store OAuth2 tokens: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`,
          500,
          'TOKEN_STORAGE_FAILED'
        );
      }

      // Log the OAuth2 connection with error handling
      try {
        await this.prismaClient.auditLog.create({
          data: {
            userId,
            action: 'OAUTH2_CONNECT',
            resource: 'API_CONNECTION',
            resourceId: apiConnectionId,
            details: {
              provider,
              scope: tokenResponse.scope,
              expiresAt
            }
          }
        });

        console.log('🔍 OAuth2 Service - Audit log created successfully');
      } catch (auditError) {
        console.error('🔍 OAuth2 Service - Failed to create audit log:', auditError);
        // Don't throw here - audit logging failure shouldn't break the OAuth2 flow
      }

      console.log('🔍 OAuth2 Service - Token storage completed successfully');
    } catch (error) {
      console.error('🔍 OAuth2 Service - Token storage failed:', error);
      throw error;
    }
  }

  /**
   * Refresh OAuth2 access token
   */
  public async refreshToken(
    userId: string,
    apiConnectionId: string,
    config: OAuth2Config
  ): Promise<boolean> {
    try {
      // Get current credentials
      const credential = await this.prismaClient.apiCredential.findUnique({
        where: {
          userId_apiConnectionId: {
            userId,
            apiConnectionId
          }
        }
      });

      if (!credential) {
        throw new ApplicationError('No OAuth2 credentials found', 404, 'CREDENTIALS_NOT_FOUND');
      }

      // Decrypt stored data
      const credentialData = JSON.parse(credential.encryptedData);
      const refreshToken = credentialData.refreshToken;
      
      if (!refreshToken) {
        throw new ApplicationError('No refresh token available', 400, 'NO_REFRESH_TOKEN');
      }

      const decryptedRefreshToken = this.encryptionService.decrypt(refreshToken);

      // Exchange refresh token for new access token
      const newTokenResponse = await this.exchangeRefreshToken(decryptedRefreshToken, config);
      
      if (!newTokenResponse) {
        throw new ApplicationError('Failed to refresh token', 400, 'TOKEN_REFRESH_FAILED');
      }

      // Update stored tokens
      await this.storeTokens(userId, apiConnectionId, config.state || 'generic', newTokenResponse);

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Exchange refresh token for new access token
   */
  private async exchangeRefreshToken(refreshToken: string, config: OAuth2Config): Promise<OAuth2TokenResponse> {
    const provider = config.provider || config.state || 'generic';
    const providerInfo = this.providers.get(provider);
    if (!providerInfo) {
      throw new ApplicationError(`Unsupported OAuth2 provider: ${provider}`, 400, 'UNSUPPORTED_PROVIDER');
    }

    const tokenData = new URLSearchParams();
    tokenData.append('client_id', config.clientId);
    tokenData.append('client_secret', config.clientSecret);
    tokenData.append('refresh_token', refreshToken);
    tokenData.append('grant_type', 'refresh_token');

    const response = await fetch(providerInfo.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenData.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApplicationError(
        `Token refresh failed: ${response.status} ${errorText}`,
        response.status,
        'TOKEN_REFRESH_FAILED'
      );
    }

    const tokenResponse = await response.json();
    return tokenResponse;
  }

  /**
   * Get OAuth2 access token for API calls
   */
  public async getAccessToken(userId: string, apiConnectionId: string): Promise<string | null> {
    try {
      const credential = await this.prismaClient.apiCredential.findUnique({
        where: {
          userId_apiConnectionId: {
            userId,
            apiConnectionId
          }
        }
      });

      if (!credential || !credential.isActive) {
        return null;
      }

      // Check if token is expired
      if (credential.expiresAt && credential.expiresAt < new Date()) {
        // Token is expired, try to refresh
        const refreshed = await this.refreshToken(userId, apiConnectionId, {
          clientId: '',
          clientSecret: '',
          authorizationUrl: '',
          tokenUrl: '',
          redirectUri: '',
          scope: ''
        });

        if (!refreshed) {
          return null;
        }

        // Get the refreshed credential
        const refreshedCredential = await this.prismaClient.apiCredential.findUnique({
          where: {
            userId_apiConnectionId: {
              userId,
              apiConnectionId
            }
          }
        });

        if (!refreshedCredential) {
          return null;
        }

        const credentialData = JSON.parse(refreshedCredential.encryptedData);
        return this.encryptionService.decrypt(credentialData.accessToken);
      }

      // Token is still valid
      const credentialData = JSON.parse(credential.encryptedData);
      return this.encryptionService.decrypt(credentialData.accessToken);
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Encode state parameter for OAuth2 flow
   */
  private encodeState(state: OAuth2State): string {
    const stateString = JSON.stringify(state);
    return Buffer.from(stateString).toString('base64url');
  }

  /**
   * Decode state parameter from OAuth2 flow
   */
  private decodeState(stateParam: string): OAuth2State | null {
    try {
      const stateString = Buffer.from(stateParam, 'base64url').toString();
      return JSON.parse(stateString);
    } catch (error) {
      return null;
    }
  }

  /**
   * Public static method to decode state parameter for OAuth2 flow
   */
  public static decodeStateParam(stateParam: string): OAuth2State | null {
    try {
      const stateString = Buffer.from(stateParam, 'base64url').toString();
      return JSON.parse(stateString);
    } catch (error) {
      return null;
    }
  }

  /**
   * Update API connection status
   */
  private async updateApiConnectionStatus(apiConnectionId: string, status: string): Promise<void> {
    await this.prismaClient.apiConnection.update({
      where: { id: apiConnectionId },
      data: { 
        status: status as any,
        lastTested: new Date()
      }
    });
  }

  /**
   * Get supported OAuth2 providers
   */
  public getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider configuration
   */
  public getProviderConfig(provider: string): OAuth2Provider | null {
    return this.providers.get(provider) || null;
  }

  /**
   * Validate OAuth2 configuration
   */
  public validateConfig(config: OAuth2Config): string[] {
    const errors: string[] = [];

    if (!config.clientId) errors.push('clientId is required');
    if (!config.clientSecret) errors.push('clientSecret is required');
    if (!config.authorizationUrl) errors.push('authorizationUrl is required');
    if (!config.tokenUrl) errors.push('tokenUrl is required');
    if (!config.redirectUri) errors.push('redirectUri is required');

    return errors;
  }
}

// Default singleton instance for production use
export const oauth2Service = new OAuth2Service(); 