import { prisma } from '../../../lib/database/client';
import { encryptionService as defaultEncryptionService, generateSecureToken as defaultGenerateSecureToken } from '../../utils/encryption';
import { ApplicationError } from '../errors';
import { secretsVault } from '../secrets/secretsVault';



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
      ['slack', {
        name: 'Slack',
        authorizationUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        scope: 'chat:write channels:read',
        userInfoUrl: 'https://slack.com/api/users.info'
      }]
    ]);

    // Add test provider only in test environment or when explicitly enabled
    if (process.env.NODE_ENV === 'test' || process.env.ENABLE_TEST_OAUTH2 === 'true') {
      this.providers.set('test', {
        name: 'Test OAuth2 Provider',
        authorizationUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/test-oauth2/authorize`,
        tokenUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/test-oauth2/token`,
        scope: 'read write',
        userInfoUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/test-oauth2/userinfo`
      });
    }
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
      console.log('🔍 OAuth2 Service - Processing callback with state:', { state: state.substring(0, 20) + '...' });
      
      // Decode and validate state
      const stateData = this.decodeState(state);
      if (!stateData) {
        throw new ApplicationError('Invalid state parameter', 400, 'INVALID_STATE');
      }

      console.log('🔍 OAuth2 Service - Decoded state:', { 
        userId: stateData.userId, 
        apiConnectionId: stateData.apiConnectionId, 
        provider: stateData.provider 
      });

      // Check if state is expired (5 minutes)
      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        throw new ApplicationError('State parameter expired', 400, 'EXPIRED_STATE');
      }

      // Get connection details for better secret metadata
      let connectionName: string | undefined;
      try {
        const connection = await this.prismaClient.apiConnection.findUnique({
          where: { id: stateData.apiConnectionId },
          select: { name: true }
        });
        connectionName = connection?.name;
        console.log('🔍 OAuth2 Service - Found connection:', { name: connectionName });
      } catch (connectionError) {
        console.warn('🔍 OAuth2 Service - Could not fetch connection name:', connectionError);
        // Continue without connection name
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

      console.log('🔍 OAuth2 Service - Token exchange successful, storing tokens');

      // Store tokens securely with connection metadata
      await this.storeTokens(
        stateData.userId,
        stateData.apiConnectionId,
        stateData.provider,
        tokenResponse,
        connectionName
      );

      // Link secrets to connection for better relationship tracking
      try {
        await this.linkSecretsToConnection(
          stateData.userId,
          stateData.apiConnectionId,
          stateData.provider,
          connectionName
        );
        console.log('🔍 OAuth2 Service - Secrets linked to connection successfully');
      } catch (linkError) {
        console.warn('🔍 OAuth2 Service - Could not link secrets to connection:', linkError);
        // Continue without linking - tokens are still stored
      }

      // Update API connection status
      await this.updateApiConnectionStatus(stateData.apiConnectionId, 'ACTIVE');

      console.log('🔍 OAuth2 Service - OAuth2 callback processing completed successfully');
      return { success: true };
    } catch (error) {
      console.error('🔍 OAuth2 Service - OAuth2 callback processing failed:', error);
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
    tokenResponse: OAuth2TokenResponse,
    connectionName?: string
  ): Promise<void> {
    try {
      console.log('🔍 OAuth2 Service - Storing tokens for:', {
        userId,
        apiConnectionId,
        provider,
        hasAccessToken: !!tokenResponse.access_token,
        hasRefreshToken: !!tokenResponse.refresh_token
      });

      // Calculate token expiration
      const expiresAt = tokenResponse.expires_in 
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : undefined;

      // Create OAuth2-specific metadata for access token
      const accessTokenMetadata = this.createOAuth2Metadata(provider, tokenResponse, 'access_token');

      // Store access token in secrets vault
      await secretsVault.storeSecret(
        userId,
        `${apiConnectionId}_access_token`,
        { value: tokenResponse.access_token, metadata: accessTokenMetadata },
        'OAUTH2_ACCESS_TOKEN',
        expiresAt,
        this.createOAuth2RotationConfig(provider),
        apiConnectionId,
        connectionName
      );

      // Store refresh token in secrets vault (if present)
      if (tokenResponse.refresh_token) {
        const refreshTokenMetadata = this.createOAuth2Metadata(provider, tokenResponse, 'refresh_token');
        
        await secretsVault.storeSecret(
          userId,
          `${apiConnectionId}_refresh_token`,
          { value: tokenResponse.refresh_token, metadata: refreshTokenMetadata },
          'OAUTH2_REFRESH_TOKEN',
          undefined, // Refresh tokens typically don't expire
          this.createOAuth2RotationConfig(provider),
          apiConnectionId,
          connectionName
        );
      }

      // --- Migration note: Remove ApiCredential upsert after migration is complete ---
      /*
      // Store in ApiCredential table with error handling (legacy, for migration only)
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
      */

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
      console.log('🔍 OAuth2 Service - Refreshing token for:', { userId, apiConnectionId });

      // Try to get refresh token from secrets vault first
      let refreshToken: string | null = null;
      let provider: string | null = null;

      try {
        const refreshTokenSecret = await secretsVault.getSecret(userId, `${apiConnectionId}_refresh_token`);
        refreshToken = refreshTokenSecret.value;
        provider = refreshTokenSecret.metadata?.provider || 'generic';
        console.log('🔍 OAuth2 Service - Found refresh token in secrets vault');
      } catch (secretError) {
        console.log('🔍 OAuth2 Service - Refresh token not found in secrets vault, trying legacy storage');
        
        // Fallback to legacy ApiCredential storage for migration
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
        refreshToken = credentialData.refreshToken;
        provider = credentialData.provider || 'generic';
        
        if (!refreshToken) {
          throw new ApplicationError('No refresh token available', 400, 'NO_REFRESH_TOKEN');
        }

        refreshToken = this.encryptionService.decrypt(refreshToken);
      }

      if (!refreshToken) {
        throw new ApplicationError('No refresh token available', 400, 'NO_REFRESH_TOKEN');
      }

      // Exchange refresh token for new access token
      const newTokenResponse = await this.exchangeRefreshToken(refreshToken, config);
      
      if (!newTokenResponse) {
        throw new ApplicationError('Failed to refresh token', 400, 'TOKEN_REFRESH_FAILED');
      }

      // Update stored tokens in secrets vault
      await this.storeTokens(userId, apiConnectionId, provider || 'generic', newTokenResponse);

      console.log('🔍 OAuth2 Service - Token refresh completed successfully');
      return true;
    } catch (error) {
      console.error('🔍 OAuth2 Service - Token refresh failed:', error);
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
      console.log('🔍 OAuth2 Service - Getting access token for:', { userId, apiConnectionId });

      // Try to get access token from secrets vault
      try {
        const accessTokenSecret = await secretsVault.getSecret(userId, `${apiConnectionId}_access_token`);
        const accessToken = accessTokenSecret.value;
        
        // Check if token is expired by looking at the secret metadata
        const secretMetadata = await this.prismaClient.secret.findFirst({
          where: {
            userId,
            name: `${apiConnectionId}_access_token`,
            isActive: true
          }
        });

        if (secretMetadata?.expiresAt && secretMetadata.expiresAt < new Date()) {
          console.log('🔍 OAuth2 Service - Access token expired, attempting refresh');
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
            console.log('🔍 OAuth2 Service - Token refresh failed');
            return null;
          }

          // Get the refreshed token
          const refreshedSecret = await secretsVault.getSecret(userId, `${apiConnectionId}_access_token`);
          return refreshedSecret.value;
        }

        console.log('🔍 OAuth2 Service - Access token retrieved successfully');
        return accessToken;
      } catch (secretError) {
        console.log('🔍 OAuth2 Service - Secret not found, falling back to legacy storage');
        
        // Fallback to legacy ApiCredential storage for migration
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
      }
    } catch (error) {
      console.error('🔍 OAuth2 Service - Failed to get access token:', error);
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
   * Create OAuth2-specific metadata for secrets
   */
  private createOAuth2Metadata(
    provider: string,
    tokenResponse: OAuth2TokenResponse,
    tokenType: 'access_token' | 'refresh_token'
  ): Record<string, any> {
    const baseMetadata = {
      provider,
      tokenType: tokenType,
      oauth2Flow: 'authorization_code',
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };

    if (tokenType === 'access_token') {
      return {
        ...baseMetadata,
        tokenType: tokenResponse.token_type || 'Bearer',
        scope: tokenResponse.scope,
        expiresIn: tokenResponse.expires_in,
        isAccessToken: true,
        isRefreshToken: false
      };
    } else {
      return {
        ...baseMetadata,
        isAccessToken: false,
        isRefreshToken: true,
        // Refresh tokens typically don't have scopes or expiration
        scope: tokenResponse.scope // May be included in refresh token response
      };
    }
  }

  /**
   * Create OAuth2-specific rotation configuration
   */
  private createOAuth2RotationConfig(provider: string): {
    rotationEnabled?: boolean;
    rotationInterval?: number;
    lastRotatedAt?: Date;
    nextRotationAt?: Date;
    rotationHistory?: any[];
  } {
    // Provider-specific rotation settings
    const providerConfigs: Record<string, { enabled: boolean; interval: number }> = {
      github: { enabled: true, interval: 30 }, // 30 days
      google: { enabled: true, interval: 60 }, // 60 days
      slack: { enabled: true, interval: 90 }, // 90 days
      generic: { enabled: false, interval: 0 }
    };

    const config = providerConfigs[provider] || providerConfigs.generic;

    if (!config.enabled) {
      return { rotationEnabled: false };
    }

    return {
      rotationEnabled: true,
      rotationInterval: config.interval,
      lastRotatedAt: new Date(),
      nextRotationAt: new Date(Date.now() + config.interval * 24 * 60 * 60 * 1000),
      rotationHistory: []
    };
  }

  /**
   * Rotate OAuth2 access token using refresh token
   */
  public async rotateOAuth2AccessToken(
    userId: string,
    apiConnectionId: string,
    config: OAuth2Config
  ): Promise<{
    success: boolean;
    newToken?: string;
    error?: string;
  }> {
    try {
      console.log('🔍 OAuth2 Service - Rotating OAuth2 access token for:', { userId, apiConnectionId });

      // Get provider from existing secret metadata
      let provider = 'generic';
      try {
        const accessTokenSecret = await secretsVault.getSecret(userId, `${apiConnectionId}_access_token`);
        provider = accessTokenSecret.metadata?.provider || 'generic';
      } catch (error) {
        console.warn('🔍 OAuth2 Service - Could not get provider from access token secret:', error);
      }

      // Attempt to refresh the token
      const refreshSuccess = await this.refreshToken(userId, apiConnectionId, config);
      
      if (!refreshSuccess) {
        return {
          success: false,
          error: 'Failed to refresh OAuth2 token during rotation'
        };
      }

      // Get the new access token
      const newAccessToken = await this.getAccessToken(userId, apiConnectionId);
      
      if (!newAccessToken) {
        return {
          success: false,
          error: 'Failed to retrieve new access token after rotation'
        };
      }

      // Update rotation history in the secret
      try {
        const secret = await this.prismaClient.secret.findFirst({
          where: {
            userId,
            name: `${apiConnectionId}_access_token`,
            isActive: true
          }
        });

        if (secret) {
          const rotationHistory = secret.rotationHistory ? JSON.parse(JSON.stringify(secret.rotationHistory)) : [];
          rotationHistory.push({
            rotatedAt: new Date().toISOString(),
            previousVersion: secret.version,
            newVersion: secret.version + 1,
            rotationMethod: 'oauth2_refresh'
          });

          await this.prismaClient.secret.update({
            where: { id: secret.id },
            data: {
              lastRotatedAt: new Date(),
              nextRotationAt: new Date(Date.now() + (this.getProviderRotationInterval(provider) * 24 * 60 * 60 * 1000)),
              rotationHistory,
              version: secret.version + 1
            }
          });
        }
      } catch (historyError) {
        console.warn('🔍 OAuth2 Service - Could not update rotation history:', historyError);
        // Continue even if history update fails
      }

      console.log('🔍 OAuth2 Service - OAuth2 access token rotation completed successfully');
      return {
        success: true,
        newToken: newAccessToken
      };
    } catch (error) {
      console.error('🔍 OAuth2 Service - OAuth2 access token rotation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown rotation error'
      };
    }
  }

  /**
   * Get rotation interval for a specific provider
   */
  private getProviderRotationInterval(provider: string): number {
    const providerConfigs: Record<string, number> = {
      github: 30, // 30 days
      google: 60, // 60 days
      slack: 90, // 90 days
      generic: 0
    };

    return providerConfigs[provider] || providerConfigs.generic;
  }

  /**
   * Check if OAuth2 token needs rotation
   */
  public async checkOAuth2TokenRotationNeeded(
    userId: string,
    apiConnectionId: string
  ): Promise<{
    needsRotation: boolean;
    reason?: string;
    nextRotationAt?: Date;
  }> {
    try {
      // Get secret metadata
      const secret = await this.prismaClient.secret.findFirst({
        where: {
          userId,
          name: `${apiConnectionId}_access_token`,
          isActive: true
        }
      });

      if (!secret) {
        return {
          needsRotation: false,
          reason: 'No OAuth2 access token secret found'
        };
      }

      // Check if rotation is enabled
      if (!secret.rotationEnabled) {
        return {
          needsRotation: false,
          reason: 'Token rotation is not enabled for this connection'
        };
      }

      // Check if token is expired
      if (secret.expiresAt && secret.expiresAt < new Date()) {
        return {
          needsRotation: true,
          reason: 'Access token has expired'
        };
      }

      // Check if it's time for scheduled rotation
      if (secret.nextRotationAt && secret.nextRotationAt < new Date()) {
        return {
          needsRotation: true,
          reason: 'Scheduled rotation is due',
          nextRotationAt: secret.nextRotationAt
        };
      }

      // Check if token is close to expiration (within 24 hours)
      if (secret.expiresAt) {
        const hoursUntilExpiration = (secret.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntilExpiration <= 24) {
          return {
            needsRotation: true,
            reason: `Access token expires in ${Math.round(hoursUntilExpiration)} hours`
          };
        }
      }

      return {
        needsRotation: false,
        reason: 'Token is healthy and rotation is not needed'
      };
    } catch (error) {
      console.error('🔍 OAuth2 Service - Error checking token rotation:', error);
      return {
        needsRotation: false,
        reason: 'Error checking token rotation status'
      };
    }
  }

  /**
   * Handle OAuth2 token expiration
   */
  public async handleOAuth2TokenExpiration(
    userId: string,
    apiConnectionId: string,
    config: OAuth2Config
  ): Promise<{
    success: boolean;
    action: 'refreshed' | 'failed' | 'no_action_needed';
    error?: string;
  }> {
    try {
      console.log('🔍 OAuth2 Service - Handling OAuth2 token expiration for:', { userId, apiConnectionId });

      // Check if token is actually expired
      const rotationCheck = await this.checkOAuth2TokenRotationNeeded(userId, apiConnectionId);
      
      if (!rotationCheck.needsRotation) {
        return {
          success: true,
          action: 'no_action_needed'
        };
      }

      // Attempt to refresh the token
      const refreshSuccess = await this.refreshToken(userId, apiConnectionId, config);
      
      if (refreshSuccess) {
        console.log('🔍 OAuth2 Service - Successfully refreshed expired OAuth2 token');
        return {
          success: true,
          action: 'refreshed'
        };
      } else {
        console.error('🔍 OAuth2 Service - Failed to refresh expired OAuth2 token');
        return {
          success: false,
          action: 'failed',
          error: 'Failed to refresh expired OAuth2 token'
        };
      }
    } catch (error) {
      console.error('🔍 OAuth2 Service - Error handling OAuth2 token expiration:', error);
      return {
        success: false,
        action: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate OAuth2 connection-secret relationship
   */
  public async validateOAuth2ConnectionSecrets(
    userId: string,
    apiConnectionId: string
  ): Promise<{
    isValid: boolean;
    issues: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    const result = {
      isValid: true,
      issues: [] as string[],
      warnings: [] as string[],
      recommendations: [] as string[]
    };

    try {
      console.log('🔍 OAuth2 Service - Validating OAuth2 connection-secret relationship for:', { userId, apiConnectionId });

      // Check if connection exists
      const connection = await this.prismaClient.apiConnection.findUnique({
        where: { id: apiConnectionId },
        select: { id: true, name: true, authType: true, status: true }
      });

      if (!connection) {
        result.isValid = false;
        result.issues.push('OAuth2 connection not found');
        return result;
      }

      if (connection.authType !== 'OAUTH2') {
        result.isValid = false;
        result.issues.push('Connection is not an OAuth2 connection');
        return result;
      }

      // Check access token secret
      let accessTokenExists = false;
      let accessTokenValid = false;
      try {
        const accessTokenSecret = await secretsVault.getSecret(userId, `${apiConnectionId}_access_token`);
        accessTokenExists = true;

        // Validate access token metadata
        if (accessTokenSecret.metadata?.provider) {
          accessTokenValid = true;
        } else {
          result.warnings.push('Access token missing provider metadata');
        }

        // Check if access token is expired
        const secretMetadata = await this.prismaClient.secret.findFirst({
          where: {
            userId,
            name: `${apiConnectionId}_access_token`,
            isActive: true
          }
        });

        if (secretMetadata?.expiresAt && secretMetadata.expiresAt < new Date()) {
          result.issues.push('Access token has expired');
          result.recommendations.push('Refresh the OAuth2 token to restore connection functionality');
        }
      } catch (accessTokenError) {
        result.issues.push('Access token secret not found or inaccessible');
        result.recommendations.push('Re-authenticate the OAuth2 connection');
      }

      // Check refresh token secret
      let refreshTokenExists = false;
      try {
        await secretsVault.getSecret(userId, `${apiConnectionId}_refresh_token`);
        refreshTokenExists = true;
      } catch (refreshTokenError) {
        result.warnings.push('Refresh token not found - token refresh will not be possible');
        result.recommendations.push('Consider re-authenticating to obtain a refresh token');
      }

      // Check connection-secret linking
      try {
        const validationResult = await secretsVault.validateSecretConnectionRelationship(
          userId,
          `${apiConnectionId}_access_token`,
          apiConnectionId
        );

        if (!validationResult.isValid) {
          result.warnings.push('Access token not properly linked to connection');
          result.recommendations.push('Re-link the access token to the connection');
        }
      } catch (linkError) {
        result.warnings.push('Could not validate connection-secret linking');
      }

      // Check if secrets are properly linked to connection
      const connectionSecrets = await secretsVault.getSecretsForConnection(userId, apiConnectionId);
      const oauth2Secrets = connectionSecrets.filter(secret => 
        secret.type === 'OAUTH2_ACCESS_TOKEN' || secret.type === 'OAUTH2_REFRESH_TOKEN'
      );

      if (oauth2Secrets.length === 0) {
        result.warnings.push('No OAuth2 secrets are linked to this connection');
        result.recommendations.push('Link OAuth2 secrets to the connection for better management');
      }

      // Determine overall validity
      if (result.issues.length > 0) {
        result.isValid = false;
      }

      console.log('🔍 OAuth2 Service - Connection-secret validation completed:', result);
      return result;
    } catch (error) {
      console.error('🔍 OAuth2 Service - Error validating OAuth2 connection-secret relationship:', error);
      result.isValid = false;
      result.issues.push('Failed to validate connection-secret relationship');
      return result;
    }
  }

  /**
   * Validate OAuth2 provider configuration
   */
  public validateOAuth2ProviderConfig(provider: string, config: OAuth2Config): {
    isValid: boolean;
    issues: string[];
    warnings: string[];
  } {
    const result = {
      isValid: true,
      issues: [] as string[],
      warnings: [] as string[]
    };

    // Check if provider is supported
    if (!this.providers.has(provider)) {
      result.isValid = false;
      result.issues.push(`OAuth2 provider '${provider}' is not supported`);
      return result;
    }

    // Validate required fields
    if (!config.clientId) {
      result.isValid = false;
      result.issues.push('OAuth2 client ID is required');
    }

    if (!config.clientSecret) {
      result.isValid = false;
      result.issues.push('OAuth2 client secret is required');
    }

    if (!config.redirectUri) {
      result.isValid = false;
      result.issues.push('OAuth2 redirect URI is required');
    }

    // Validate redirect URI format
    if (config.redirectUri && !config.redirectUri.startsWith('http')) {
      result.warnings.push('OAuth2 redirect URI should use HTTPS in production');
    }

    // Check provider-specific requirements
    const providerInfo = this.providers.get(provider);
    if (providerInfo) {
      if (!config.scope && providerInfo.scope) {
        result.warnings.push(`Consider adding scope for ${provider}: ${providerInfo.scope}`);
      }
    }

    return result;
  }

  /**
   * Get OAuth2 connection health summary
   */
  public async getOAuth2ConnectionHealth(
    userId: string,
    apiConnectionId: string
  ): Promise<{
    status: 'healthy' | 'warning' | 'error' | 'unknown';
    lastChecked: Date;
    issues: string[];
    warnings: string[];
    recommendations: string[];
    tokenInfo: {
      hasAccessToken: boolean;
      hasRefreshToken: boolean;
      isExpired: boolean;
      expiresAt?: Date;
      provider?: string;
    };
  }> {
    try {
      console.log('🔍 OAuth2 Service - Getting OAuth2 connection health for:', { userId, apiConnectionId });

      const health = {
        status: 'unknown' as 'healthy' | 'warning' | 'error' | 'unknown',
        lastChecked: new Date(),
        issues: [] as string[],
        warnings: [] as string[],
        recommendations: [] as string[],
        tokenInfo: {
          hasAccessToken: false,
          hasRefreshToken: false,
          isExpired: false,
          expiresAt: undefined as Date | undefined,
          provider: undefined as string | undefined
        }
      };

      // Check access token
      try {
        const accessTokenSecret = await secretsVault.getSecret(userId, `${apiConnectionId}_access_token`);
        health.tokenInfo.hasAccessToken = true;
        health.tokenInfo.provider = accessTokenSecret.metadata?.provider;

        // Check expiration
        const secretMetadata = await this.prismaClient.secret.findFirst({
          where: {
            userId,
            name: `${apiConnectionId}_access_token`,
            isActive: true
          }
        });

        if (secretMetadata?.expiresAt) {
          health.tokenInfo.expiresAt = secretMetadata.expiresAt;
          if (secretMetadata.expiresAt < new Date()) {
            health.tokenInfo.isExpired = true;
            health.issues.push('Access token has expired');
            health.recommendations.push('Refresh the OAuth2 token');
          }
        }
      } catch (accessTokenError) {
        health.issues.push('Access token not found');
        health.recommendations.push('Re-authenticate the OAuth2 connection');
      }

      // Check refresh token
      try {
        await secretsVault.getSecret(userId, `${apiConnectionId}_refresh_token`);
        health.tokenInfo.hasRefreshToken = true;
      } catch (refreshTokenError) {
        health.warnings.push('No refresh token available');
      }

      // Determine overall status
      if (health.issues.length > 0) {
        health.status = 'error';
      } else if (health.warnings.length > 0) {
        health.status = 'warning';
      } else {
        health.status = 'healthy';
      }

      console.log('🔍 OAuth2 Service - OAuth2 connection health check completed:', health);
      return health;
    } catch (error) {
      console.error('🔍 OAuth2 Service - Error getting OAuth2 connection health:', error);
      return {
        status: 'error',
        lastChecked: new Date(),
        issues: ['Failed to check connection health'],
        warnings: [],
        recommendations: ['Contact support if the issue persists'],
        tokenInfo: {
          hasAccessToken: false,
          hasRefreshToken: false,
          isExpired: false
        }
      };
    }
  }

  /**
   * Get provider-specific OAuth2 configuration and recommendations
   */
  public getProviderSpecificConfig(provider: string): {
    name: string;
    recommendedScopes: string[];
    tokenExpiration: number; // in seconds
    refreshTokenSupported: boolean;
    rotationInterval: number; // in days
    securityRecommendations: string[];
    features: string[];
  } {
    const providerConfigs: Record<string, {
      name: string;
      recommendedScopes: string[];
      tokenExpiration: number;
      refreshTokenSupported: boolean;
      rotationInterval: number;
      securityRecommendations: string[];
      features: string[];
    }> = {
      github: {
        name: 'GitHub',
        recommendedScopes: ['repo', 'user', 'read:org'],
        tokenExpiration: 3600, // 1 hour
        refreshTokenSupported: false,
        rotationInterval: 30,
        securityRecommendations: [
          'Use minimal scopes required for your application',
          'Regularly rotate personal access tokens',
          'Monitor token usage in GitHub settings'
        ],
        features: ['Repository access', 'User profile', 'Organization access']
      },
      google: {
        name: 'Google',
        recommendedScopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/drive'
        ],
        tokenExpiration: 3600, // 1 hour
        refreshTokenSupported: true,
        rotationInterval: 60,
        securityRecommendations: [
          'Use OAuth2 refresh tokens for long-term access',
          'Implement token refresh logic',
          'Monitor token usage in Google Cloud Console'
        ],
        features: ['Calendar access', 'Gmail access', 'Drive access']
      },
      slack: {
        name: 'Slack',
        recommendedScopes: ['chat:write', 'channels:read', 'users:read'],
        tokenExpiration: 3600, // 1 hour
        refreshTokenSupported: true,
        rotationInterval: 90,
        securityRecommendations: [
          'Use workspace-specific tokens when possible',
          'Implement proper error handling for token refresh',
          'Monitor app usage in Slack workspace settings'
        ],
        features: ['Message posting', 'Channel access', 'User information']
      },
      generic: {
        name: 'Generic OAuth2 Provider',
        recommendedScopes: ['read', 'write'],
        tokenExpiration: 3600, // 1 hour
        refreshTokenSupported: true,
        rotationInterval: 0,
        securityRecommendations: [
          'Review provider-specific security documentation',
          'Implement proper token validation',
          'Monitor token expiration and refresh'
        ],
        features: ['Basic OAuth2 functionality']
      }
    };

    return providerConfigs[provider] || providerConfigs.generic;
  }

  /**
   * Get provider-specific secret management recommendations
   */
  public getProviderSecretManagementRecommendations(provider: string): {
    rotationStrategy: string;
    monitoringRecommendations: string[];
    securityBestPractices: string[];
    troubleshootingTips: string[];
  } {
    const recommendations: Record<string, {
      rotationStrategy: string;
      monitoringRecommendations: string[];
      securityBestPractices: string[];
      troubleshootingTips: string[];
    }> = {
      github: {
        rotationStrategy: 'Manual rotation with personal access token replacement',
        monitoringRecommendations: [
          'Monitor token usage in GitHub API rate limits',
          'Check token permissions in GitHub settings',
          'Review token creation and last used dates'
        ],
        securityBestPractices: [
          'Use fine-grained personal access tokens',
          'Set appropriate expiration dates',
          'Limit token scopes to minimum required'
        ],
        troubleshootingTips: [
          'If token expires, create new personal access token',
          'Check if token has required scopes',
          'Verify GitHub account permissions'
        ]
      },
      google: {
        rotationStrategy: 'Automatic rotation using refresh tokens',
        monitoringRecommendations: [
          'Monitor OAuth2 consent screen usage',
          'Check token refresh success rates',
          'Review Google Cloud Console audit logs'
        ],
        securityBestPractices: [
          'Store refresh tokens securely',
          'Implement exponential backoff for refresh failures',
          'Use service accounts for server-to-server auth'
        ],
        troubleshootingTips: [
          'If refresh fails, re-authenticate user',
          'Check OAuth2 consent screen configuration',
          'Verify client ID and secret are correct'
        ]
      },
      slack: {
        rotationStrategy: 'Automatic rotation with workspace token management',
        monitoringRecommendations: [
          'Monitor app installation and permissions',
          'Check token validity with auth.test API',
          'Review workspace app settings'
        ],
        securityBestPractices: [
          'Use workspace-specific tokens',
          'Implement proper error handling',
          'Monitor app usage and permissions'
        ],
        troubleshootingTips: [
          'If token becomes invalid, reinstall app',
          'Check workspace permissions and settings',
          'Verify app configuration in Slack'
        ]
      },
      generic: {
        rotationStrategy: 'Provider-specific rotation based on OAuth2 implementation',
        monitoringRecommendations: [
          'Monitor token expiration and refresh success',
          'Check provider-specific rate limits',
          'Review OAuth2 flow logs'
        ],
        securityBestPractices: [
          'Follow OAuth2 security best practices',
          'Implement proper token validation',
          'Use secure token storage'
        ],
        troubleshootingTips: [
          'Check provider documentation for specific issues',
          'Verify OAuth2 configuration',
          'Monitor token refresh patterns'
        ]
      }
    };

    return recommendations[provider] || recommendations.generic;
  }

  /**
   * Get all OAuth2 secrets for a user with provider-specific information
   */
  public async getOAuth2SecretsSummary(userId: string): Promise<{
    totalConnections: number;
    healthyConnections: number;
    warningConnections: number;
    errorConnections: number;
    providerBreakdown: Record<string, number>;
    connections: Array<{
      id: string;
      name: string;
      provider: string;
      status: 'healthy' | 'warning' | 'error';
      lastChecked: Date;
      expiresAt?: Date;
    }>;
  }> {
    try {
      console.log('🔍 OAuth2 Service - Getting OAuth2 secrets summary for user:', userId);

      // Get all OAuth2 connections for the user
      const connections = await this.prismaClient.apiConnection.findMany({
        where: {
          userId,
          authType: 'OAUTH2'
        },
        select: { id: true, name: true }
      });

      const summary = {
        totalConnections: connections.length,
        healthyConnections: 0,
        warningConnections: 0,
        errorConnections: 0,
        providerBreakdown: {} as Record<string, number>,
        connections: [] as Array<{
          id: string;
          name: string;
          provider: string;
          status: 'healthy' | 'warning' | 'error';
          lastChecked: Date;
          expiresAt?: Date;
        }>
      };

      // Check health for each connection
      for (const connection of connections) {
        try {
          const health = await this.getOAuth2ConnectionHealth(userId, connection.id);
          
          // Get provider from health check
          const provider = health.tokenInfo.provider || 'unknown';
          
          // Update provider breakdown
          summary.providerBreakdown[provider] = (summary.providerBreakdown[provider] || 0) + 1;

          // Update status counts
          if (health.status === 'healthy') {
            summary.healthyConnections++;
          } else if (health.status === 'warning') {
            summary.warningConnections++;
          } else {
            summary.errorConnections++;
          }

          // Add connection to list
          summary.connections.push({
            id: connection.id,
            name: connection.name,
            provider,
            status: health.status === 'unknown' ? 'error' : health.status,
            lastChecked: health.lastChecked,
            expiresAt: health.tokenInfo.expiresAt
          });
        } catch (connectionError) {
          console.error('🔍 OAuth2 Service - Error checking connection health:', connectionError);
          summary.errorConnections++;
          summary.connections.push({
            id: connection.id,
            name: connection.name,
            provider: 'unknown',
            status: 'error',
            lastChecked: new Date()
          });
        }
      }

      console.log('🔍 OAuth2 Service - OAuth2 secrets summary completed:', summary);
      return summary;
    } catch (error) {
      console.error('🔍 OAuth2 Service - Error getting OAuth2 secrets summary:', error);
      return {
        totalConnections: 0,
        healthyConnections: 0,
        warningConnections: 0,
        errorConnections: 0,
        providerBreakdown: {},
        connections: []
      };
    }
  }

  /**
   * Link OAuth2 secrets to connection for better relationship tracking
   */
  private async linkSecretsToConnection(
    userId: string,
    apiConnectionId: string,
    provider: string,
    connectionName?: string
  ): Promise<void> {
    try {
      console.log('🔍 OAuth2 Service - Linking secrets to connection:', { userId, apiConnectionId, provider });

      // Link access token secret to connection
      try {
        await secretsVault.linkSecretToConnection(
          userId,
          `${apiConnectionId}_access_token`,
          apiConnectionId,
          connectionName
        );
        console.log('🔍 OAuth2 Service - Access token linked to connection');
      } catch (accessTokenError) {
        console.warn('🔍 OAuth2 Service - Could not link access token:', accessTokenError);
      }

      // Link refresh token secret to connection (if it exists)
      try {
        await secretsVault.linkSecretToConnection(
          userId,
          `${apiConnectionId}_refresh_token`,
          apiConnectionId,
          connectionName
        );
        console.log('🔍 OAuth2 Service - Refresh token linked to connection');
      } catch (refreshTokenError) {
        console.warn('🔍 OAuth2 Service - Could not link refresh token:', refreshTokenError);
        // This is expected if refresh token doesn't exist
      }

      console.log('🔍 OAuth2 Service - Secret linking completed');
    } catch (error) {
      console.error('🔍 OAuth2 Service - Failed to link secrets to connection:', error);
      throw error;
    }
  }

  /**
   * Update API connection status based on OAuth2 secret health
   */
  private async updateApiConnectionStatus(apiConnectionId: string, status: string): Promise<void> {
    try {
      console.log('🔍 OAuth2 Service - Updating connection status:', { apiConnectionId, status });

      // Get connection details for better status tracking
      const connection = await this.prismaClient.apiConnection.findUnique({
        where: { id: apiConnectionId },
        select: { userId: true, name: true, status: true }
      });

      if (!connection) {
        console.warn('🔍 OAuth2 Service - Connection not found for status update:', apiConnectionId);
        return;
      }

      // Check OAuth2 secret health if status is being set to ACTIVE
      if (status === 'ACTIVE') {
        const secretHealth = await this.checkOAuth2SecretHealth(connection.userId, apiConnectionId);
        console.log('🔍 OAuth2 Service - OAuth2 secret health check:', secretHealth);

        // Update status based on secret health
        if (secretHealth.status === 'healthy') {
          status = 'ACTIVE';
        } else if (secretHealth.status === 'warning') {
          status = 'WARNING';
        } else {
          status = 'ERROR';
        }
      }

      await this.prismaClient.apiConnection.update({
        where: { id: apiConnectionId },
        data: { 
          status: status as any,
          lastTested: new Date()
        }
      });

      console.log('🔍 OAuth2 Service - Connection status updated successfully:', { apiConnectionId, status });
    } catch (error) {
      console.error('🔍 OAuth2 Service - Failed to update connection status:', error);
      // Don't throw - status update failure shouldn't break OAuth2 flow
    }
  }

  /**
   * Check OAuth2 secret health for a connection
   */
  private async checkOAuth2SecretHealth(userId: string, apiConnectionId: string): Promise<{
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    lastChecked: Date;
  }> {
    const issues: string[] = [];
    let hasAccessToken = false;
    let hasRefreshToken = false;
    let accessTokenExpired = false;

    try {
      // Check access token
      try {
        const accessTokenSecret = await secretsVault.getSecret(userId, `${apiConnectionId}_access_token`);
        hasAccessToken = true;

        // Check if access token is expired
        const secretMetadata = await this.prismaClient.secret.findFirst({
          where: {
            userId,
            name: `${apiConnectionId}_access_token`,
            isActive: true
          }
        });

        if (secretMetadata?.expiresAt && secretMetadata.expiresAt < new Date()) {
          accessTokenExpired = true;
          issues.push('Access token has expired');
        }
      } catch (accessTokenError) {
        issues.push('Access token not found or inaccessible');
      }

      // Check refresh token
      try {
        await secretsVault.getSecret(userId, `${apiConnectionId}_refresh_token`);
        hasRefreshToken = true;
      } catch (refreshTokenError) {
        // Refresh token is optional, so this is not necessarily an error
        console.log('🔍 OAuth2 Service - No refresh token found for connection:', apiConnectionId);
      }

      // Determine health status
      if (!hasAccessToken) {
        return {
          status: 'error',
          issues,
          lastChecked: new Date()
        };
      }

      if (accessTokenExpired && !hasRefreshToken) {
        return {
          status: 'error',
          issues: [...issues, 'No refresh token available for expired access token'],
          lastChecked: new Date()
        };
      }

      if (accessTokenExpired && hasRefreshToken) {
        return {
          status: 'warning',
          issues: [...issues, 'Access token expired but refresh token available'],
          lastChecked: new Date()
        };
      }

      return {
        status: 'healthy',
        issues: [],
        lastChecked: new Date()
      };
    } catch (error) {
      console.error('🔍 OAuth2 Service - Error checking OAuth2 secret health:', error);
      return {
        status: 'error',
        issues: ['Failed to check OAuth2 secret health'],
        lastChecked: new Date()
      };
    }
  }

  /**
   * Migrate existing OAuth2 credentials from ApiCredential table to secrets vault
   */
  public async migrateOAuth2CredentialsToSecrets(userId: string, apiConnectionId: string): Promise<{
    success: boolean;
    secretsCreated: string[];
    errors: string[];
  }> {
    const result = {
      success: false,
      secretsCreated: [] as string[],
      errors: [] as string[]
    };

    try {
      console.log('🔍 OAuth2 Service - Starting OAuth2 credential migration for:', { userId, apiConnectionId });

      // Check if secrets already exist
      try {
        await secretsVault.getSecret(userId, `${apiConnectionId}_access_token`);
        console.log('🔍 OAuth2 Service - Secrets already exist, skipping migration');
        result.success = true;
        return result;
      } catch (secretError) {
        // Secrets don't exist, proceed with migration
        console.log('🔍 OAuth2 Service - No existing secrets found, proceeding with migration');
      }

      // Get existing OAuth2 credentials from ApiCredential table
      const credential = await this.prismaClient.apiCredential.findUnique({
        where: {
          userId_apiConnectionId: {
            userId,
            apiConnectionId
          }
        }
      });

      if (!credential) {
        result.errors.push('No OAuth2 credentials found in ApiCredential table');
        return result;
      }

      // Get connection details for better metadata
      let connectionName: string | undefined;
      try {
        const connection = await this.prismaClient.apiConnection.findUnique({
          where: { id: apiConnectionId },
          select: { name: true }
        });
        connectionName = connection?.name;
      } catch (connectionError) {
        console.warn('🔍 OAuth2 Service - Could not fetch connection name during migration:', connectionError);
      }

      // Parse credential data
      const credentialData = JSON.parse(credential.encryptedData);
      const provider = credentialData.provider || 'generic';

      // Create token response object for migration
      const tokenResponse: OAuth2TokenResponse = {
        access_token: this.encryptionService.decrypt(credentialData.accessToken),
        token_type: credentialData.tokenType || 'Bearer',
        scope: credentialData.scope,
        expires_in: credential.expiresAt ? Math.floor((credential.expiresAt.getTime() - Date.now()) / 1000) : undefined
      };

      if (credentialData.refreshToken) {
        tokenResponse.refresh_token = this.encryptionService.decrypt(credentialData.refreshToken);
      }

      // Store tokens in secrets vault
      await this.storeTokens(
        userId,
        apiConnectionId,
        provider,
        tokenResponse,
        connectionName
      );

      // Link secrets to connection
      try {
        await this.linkSecretsToConnection(
          userId,
          apiConnectionId,
          provider,
          connectionName
        );
      } catch (linkError) {
        console.warn('🔍 OAuth2 Service - Could not link secrets during migration:', linkError);
        result.errors.push('Failed to link secrets to connection');
      }

      result.secretsCreated.push(`${apiConnectionId}_access_token`);
      if (tokenResponse.refresh_token) {
        result.secretsCreated.push(`${apiConnectionId}_refresh_token`);
      }

      result.success = true;
      console.log('🔍 OAuth2 Service - OAuth2 credential migration completed successfully:', result);

      return result;
    } catch (error) {
      console.error('🔍 OAuth2 Service - OAuth2 credential migration failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown migration error');
      return result;
    }
  }

  /**
   * Migrate all OAuth2 credentials for a user
   */
  public async migrateAllOAuth2Credentials(userId: string): Promise<{
    totalConnections: number;
    successfulMigrations: number;
    failedMigrations: number;
    errors: string[];
  }> {
    const result = {
      totalConnections: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      errors: [] as string[]
    };

    try {
      console.log('🔍 OAuth2 Service - Starting bulk OAuth2 credential migration for user:', userId);

      // Get all OAuth2 connections for the user
      const connections = await this.prismaClient.apiConnection.findMany({
        where: {
          userId,
          authType: 'OAUTH2'
        },
        select: { id: true, name: true }
      });

      result.totalConnections = connections.length;
      console.log('🔍 OAuth2 Service - Found OAuth2 connections to migrate:', result.totalConnections);

      // Migrate each connection
      for (const connection of connections) {
        try {
          const migrationResult = await this.migrateOAuth2CredentialsToSecrets(userId, connection.id);
          
          if (migrationResult.success) {
            result.successfulMigrations++;
            console.log('🔍 OAuth2 Service - Successfully migrated connection:', connection.name);
          } else {
            result.failedMigrations++;
            result.errors.push(`Failed to migrate ${connection.name}: ${migrationResult.errors.join(', ')}`);
            console.error('🔍 OAuth2 Service - Failed to migrate connection:', connection.name, migrationResult.errors);
          }
        } catch (connectionError) {
          result.failedMigrations++;
          const errorMessage = connectionError instanceof Error ? connectionError.message : 'Unknown error';
          result.errors.push(`Failed to migrate ${connection.name}: ${errorMessage}`);
          console.error('🔍 OAuth2 Service - Error migrating connection:', connection.name, connectionError);
        }
      }

      console.log('🔍 OAuth2 Service - Bulk OAuth2 credential migration completed:', result);
      return result;
    } catch (error) {
      console.error('🔍 OAuth2 Service - Bulk OAuth2 credential migration failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown bulk migration error');
      return result;
    }
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