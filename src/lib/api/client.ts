/**
 * TODO: UX SIMPLIFICATION - API CLIENT PHASE 2.3 CHANGES - @connorbowen 2024-12-19
 * 
 * PHASE 2.3: Streamline onboarding flow
 * - [ ] Update register method to support simplified registration
 * - [ ] Update login method to redirect to Chat interface
 * - [ ] Add onboarding state management methods
 * - [ ] Update verifyEmail method to be optional
 * - [ ] Add tests: tests/unit/lib/api/client.test.ts - test simplified auth methods
 * - [ ] Add tests: tests/integration/api/auth/auth-flow.test.ts - test updated client methods
 * 
 * PHASE 2.4: Guided tour integration
 * - [ ] Add guided tour state management methods
 * - [ ] Add onboarding progress tracking methods
 * - [ ] Add tests: tests/unit/lib/api/client.test.ts - test tour management
 * 
 * IMPLEMENTATION NOTES:
 * - Update register method signature to remove name requirement
 * - Add onboarding state methods: getOnboardingState, updateOnboardingState
 * - Add tour methods: getTourState, updateTourState
 * - Update response types to include onboarding information
 * - Ensure backward compatibility with existing methods
 */

import axios, { AxiosResponse } from 'axios';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface OAuth2Provider {
  name: string;
  displayName: string;
  authorizationUrl: string;
  tokenUrl: string;
  scope: string;
  userInfoUrl: string;
}

export interface CreateConnectionRequest {
  name: string;
  description?: string;
  baseUrl: string;
  authType: 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2' | 'CUSTOM';
  documentationUrl?: string;
  authConfig: any;
  // TODO: Add secret-related fields
  secretIds?: string[];
  secretReferences?: {
    apiKey?: string;
    bearerToken?: string;
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
  };
}

export interface CreateSecretRequest {
  name: string;
  type: 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH_USERNAME' | 'BASIC_AUTH_PASSWORD' | 'OAUTH2_CLIENT_ID' | 'OAUTH2_CLIENT_SECRET' | 'OAUTH2_ACCESS_TOKEN' | 'OAUTH2_REFRESH_TOKEN' | 'WEBHOOK_SECRET' | 'SSH_KEY' | 'CERTIFICATE' | 'CUSTOM';
  value: string;
  description?: string;
  connectionId?: string;
  enableRotation?: boolean;
  rotationInterval?: number;
}

export interface ApiConnection {
  id: string;
  name: string;
  description?: string;
  baseUrl: string;
  authType: 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2' | 'CUSTOM';
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING';
  connectionStatus?: 'draft' | 'disconnected' | 'connecting' | 'connected' | 'error' | 'revoked';
  ingestionStatus: 'SUCCEEDED' | 'PENDING' | 'FAILED';
  endpointCount: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
  authConfig?: any;
  // TODO: Add secret reference fields
  secretId?: string;
  secretReference?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface Secret {
  id: string;
  name: string;
  type: 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH_USERNAME' | 'BASIC_AUTH_PASSWORD' | 'OAUTH2_CLIENT_ID' | 'OAUTH2_CLIENT_SECRET' | 'OAUTH2_ACCESS_TOKEN' | 'OAUTH2_REFRESH_TOKEN' | 'WEBHOOK_SECRET' | 'SSH_KEY' | 'CERTIFICATE' | 'CUSTOM';
  description?: string;
  connectionId?: string;
  connectionName?: string;
  version: number;
  isActive: boolean;
  expiresAt?: string;
  rotationEnabled: boolean;
  rotationInterval?: number;
  lastRotatedAt?: string;
  nextRotationAt?: string;
  createdAt: string;
  updatedAt: string;
}

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '';
  }

  private async request<T>(config: any): Promise<ApiResponse<T>> {
    console.log('🔍 DEBUG: apiClient.request called');
    console.log('🔍 DEBUG: Request config:', {
      method: config.method,
      url: `${this.baseURL}${config.url}`,
      hasData: !!config.data,
      dataKeys: config.data ? Object.keys(config.data) : [],
      headers: config.headers
    });
    
    try {
      const response: AxiosResponse<ApiResponse<T>> = await axios({
        ...config,
        url: `${this.baseURL}${config.url}`,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        withCredentials: true, // Include cookies in requests
      });
      
      console.log('🔍 DEBUG: API request successful');
      console.log('🔍 DEBUG: Response status:', response.status);
      console.log('🔍 DEBUG: Response data:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('🔍 DEBUG: API request failed');
      console.error('🔍 DEBUG: Error type:', typeof error);
      console.error('🔍 DEBUG: Error message:', error.message);
      console.error('🔍 DEBUG: Error response status:', error.response?.status);
      console.error('🔍 DEBUG: Error response data:', error.response?.data);
      console.error('🔍 DEBUG: Full error:', error);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error',
      };
    }
  }

  async createConnection(data: CreateConnectionRequest): Promise<ApiResponse<{ connection: ApiConnection }>> {
    console.log('🔍 DEBUG: apiClient.createConnection called');
    console.log('🔍 DEBUG: Request data:', {
      name: data.name,
      description: data.description,
      baseUrl: data.baseUrl,
      authType: data.authType,
      hasAuthConfig: !!data.authConfig,
      authConfigKeys: Object.keys(data.authConfig || {}),
      hasDocumentationUrl: !!data.documentationUrl
    });
    
    // Implement secret-first connection creation
    const secretsToCreate: CreateSecretRequest[] = [];
    const secretIds: string[] = [];
    
    // Create secrets based on auth type
    if (data.authType === 'API_KEY' && data.authConfig?.apiKey) {
      secretsToCreate.push({
        name: `${data.name}_api_key`,
        type: 'API_KEY',
        value: data.authConfig.apiKey,
        description: `API key for ${data.name}`,
        enableRotation: false
      });
    } else if (data.authType === 'BEARER_TOKEN' && data.authConfig?.token) {
      secretsToCreate.push({
        name: `${data.name}_bearer_token`,
        type: 'BEARER_TOKEN',
        value: data.authConfig.token,
        description: `Bearer token for ${data.name}`,
        enableRotation: false
      });
    } else if (data.authType === 'BASIC_AUTH') {
      if (data.authConfig?.username) {
        secretsToCreate.push({
          name: `${data.name}_username`,
          type: 'BASIC_AUTH_USERNAME',
          value: data.authConfig.username,
          description: `Username for ${data.name}`,
          enableRotation: false
        });
      }
      if (data.authConfig?.password) {
        secretsToCreate.push({
          name: `${data.name}_password`,
          type: 'BASIC_AUTH_PASSWORD',
          value: data.authConfig.password,
          description: `Password for ${data.name}`,
          enableRotation: false
        });
      }
    } else if (data.authType === 'OAUTH2') {
      if (data.authConfig?.clientId) {
        secretsToCreate.push({
          name: `${data.name}_client_id`,
          type: 'OAUTH2_CLIENT_ID',
          value: data.authConfig.clientId,
          description: `OAuth2 client ID for ${data.name}`,
          enableRotation: false
        });
      }
      if (data.authConfig?.clientSecret) {
        secretsToCreate.push({
          name: `${data.name}_client_secret`,
          type: 'OAUTH2_CLIENT_SECRET',
          value: data.authConfig.clientSecret,
          description: `OAuth2 client secret for ${data.name}`,
          enableRotation: false
        });
      }
    }
    
    // Create secrets first
    for (const secretData of secretsToCreate) {
      const secretResponse = await this.createSecret(secretData);
      if (secretResponse.success && secretResponse.data?.secret) {
        secretIds.push(secretResponse.data.secret.id);
      } else {
        // Rollback: delete any created secrets
        for (const createdSecretId of secretIds) {
          await this.deleteSecret(createdSecretId);
        }
        return {
          success: false,
          error: `Failed to create secret: ${secretResponse.error}`
        };
      }
    }
    
    // Update connection data to include secret references
    const connectionData = {
      ...data,
      secretIds,
      authConfig: {} // Clear sensitive data from authConfig
    };
    
    const response = await this.request<{ connection: ApiConnection }>({
      method: 'POST',
      url: '/api/connections',
      data: connectionData,
    });
    
    console.log('🔍 DEBUG: apiClient.createConnection response:', response);
    return response;
  }

  async createSecret(data: CreateSecretRequest): Promise<ApiResponse<{ secret: Secret }>> {
    return this.request({
      method: 'POST',
      url: '/api/secrets',
      data,
    });
  }

  async getSecrets(): Promise<ApiResponse<{ secrets: Secret[] }>> {
    return this.request({
      method: 'GET',
      url: '/api/secrets',
    });
  }

  async getSecret(id: string): Promise<ApiResponse<{ secret: Secret }>> {
    return this.request({
      method: 'GET',
      url: `/api/secrets/${id}`,
    });
  }

  async updateSecret(id: string, data: Partial<CreateSecretRequest>): Promise<ApiResponse<{ secret: Secret }>> {
    return this.request({
      method: 'PUT',
      url: `/api/secrets/${id}`,
      data,
    });
  }

  async deleteSecret(id: string): Promise<ApiResponse<void>> {
    return this.request({
      method: 'DELETE',
      url: `/api/secrets/${id}`,
    });
  }

  async rotateSecret(id: string): Promise<ApiResponse<{ secret: Secret }>> {
    return this.request({
      method: 'POST',
      url: `/api/secrets/${id}/rotate`,
    });
  }

  async getSecretsForConnection(connectionId: string): Promise<ApiResponse<{ secrets: Secret[] }>> {
    return this.request({
      method: 'GET',
      url: `/api/connections/${connectionId}/secrets`,
    });
  }

  async linkSecretToConnection(secretId: string, connectionId: string): Promise<ApiResponse<{ secret: Secret }>> {
    return this.request({
      method: 'POST',
      url: `/api/secrets/${secretId}/link`,
      data: { connectionId },
    });
  }

  async testConnectionConfig(config: any): Promise<ApiResponse<any>> {
    // TODO: Implement test using secrets instead of direct credentials
    // This method should retrieve secrets and use them for testing
    return this.request({
      method: 'POST',
      url: '/api/connections/test',
      data: config,
    });
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<{ user: any; accessToken: string; refreshToken: string; expiresIn: number }>> {
    return this.request({
      method: 'POST',
      url: '/api/auth/login',
      data: { email, password },
    });
  }

  async register(email: string, name: string, password: string): Promise<ApiResponse<{ user: any }>> {
    return this.request({
      method: 'POST',
      url: '/api/auth/register',
      data: { email, name, password },
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request({
      method: 'POST',
      url: '/api/auth/logout',
    });
  }

  async requestPasswordReset(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request({
      method: 'POST',
      url: '/api/auth/forgot-password',
      data: { email },
    });
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return this.request({
      method: 'POST',
      url: '/api/auth/reset-password',
      data: { token, password },
    });
  }

  async resendVerification(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request({
      method: 'POST',
      url: '/api/auth/resend-verification',
      data: { email },
    });
  }

  async verifyEmail(token: string): Promise<ApiResponse<{ message: string; accessToken: string; refreshToken: string; user: any }>> {
    return this.request({
      method: 'POST',
      url: '/api/auth/verify',
      data: { token },
    });
  }

  // User management
  async getCurrentUser(): Promise<ApiResponse<{ user: any }>> {
    return this.request({
      method: 'GET',
      url: '/api/auth/me',
    });
  }

  // Connection management
  async getConnections(): Promise<ApiResponse<{ connections: ApiConnection[] }>> {
    return this.request({
      method: 'GET',
      url: '/api/connections',
    });
  }

  async getConnection(id: string): Promise<ApiResponse<ApiConnection>> {
    return this.request({
      method: 'GET',
      url: `/api/connections/${id}`,
    });
  }

  async updateConnection(id: string, data: Partial<CreateConnectionRequest>): Promise<ApiResponse<ApiConnection>> {
    return this.request({
      method: 'PUT',
      url: `/api/connections/${id}`,
      data,
    });
  }

  async deleteConnection(id: string): Promise<ApiResponse<void>> {
    return this.request({
      method: 'DELETE',
      url: `/api/connections/${id}`,
    });
  }

  async testConnection(id: string): Promise<ApiResponse<{ status: string; message: string; responseTime?: number; endpoints?: number }>> {
    return this.request({
      method: 'POST',
      url: `/api/connections/${id}/test`,
    });
  }

  async getConnectionEndpoints(id: string): Promise<ApiResponse<{ endpoints: any[] }>> {
    return this.request({
      method: 'GET',
      url: `/api/connections/${id}/endpoints`,
    });
  }

  async refreshConnectionSpec(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request({
      method: 'POST',
      url: `/api/connections/${id}/refresh`,
    });
  }

  // Workflow management
  async getWorkflows(): Promise<ApiResponse<{ workflows: any[] }>> {
    return this.request({
      method: 'GET',
      url: '/api/workflows',
    });
  }

  async createWorkflow(data: any): Promise<ApiResponse<{ workflow: any }>> {
    return this.request({
      method: 'POST',
      url: '/api/workflows',
      data,
    });
  }

  async updateWorkflow(id: string, data: any): Promise<ApiResponse<{ workflow: any }>> {
    return this.request({
      method: 'PUT',
      url: `/api/workflows/${id}`,
      data,
    });
  }

  async deleteWorkflow(id: string): Promise<ApiResponse<void>> {
    return this.request({
      method: 'DELETE',
      url: `/api/workflows/${id}`,
    });
  }

  async executeWorkflow(id: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: `/api/workflows/${id}/execute`,
    });
  }

  // Natural language workflow generation
  async generateWorkflow(prompt: string): Promise<ApiResponse<{ workflow: any; steps: any[]; explanation: string }>> {
    return this.request({
      method: 'POST',
      url: '/api/workflows/generate',
      data: { prompt },
    });
  }

  async getWorkflow(id: string): Promise<ApiResponse<{ workflow: any }>> {
    return this.request({
      method: 'GET',
      url: `/api/workflows/${id}`,
    });
  }

  // OAuth2 management
  async getOAuth2Providers(): Promise<ApiResponse<{ providers: OAuth2Provider[] }>> {
    return this.request({
      method: 'GET',
      url: '/api/connections/oauth2/providers',
    });
  }

  // Admin functions
  async rotateMasterKey(): Promise<ApiResponse<void>> {
    return this.request({
      method: 'POST',
      url: '/api/admin/rotate-master-key',
    });
  }

  // Workflow execution management
  async getExecutionStatus(executionId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      url: `/api/workflows/executions/${executionId}/status`,
    });
  }

  async pauseExecution(executionId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: `/api/workflows/executions/${executionId}/pause`,
    });
  }

  async resumeExecution(executionId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: `/api/workflows/executions/${executionId}/resume`,
    });
  }

  async cancelExecution(executionId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: `/api/workflows/executions/${executionId}/cancel`,
    });
  }

  // OAuth2 flow methods
  async initiateOAuth2Flow(connectionId: string, provider: string, clientId: string, clientSecret: string, redirectUri: string, scope?: string): Promise<string> {
    const params = new URLSearchParams({
      apiConnectionId: connectionId,
      provider,
      clientId,
      clientSecret,
      redirectUri,
      ...(scope && { scope }),
    });

    const response = await this.request<{ redirectUrl: string }>({
      method: 'GET',
      url: `/api/oauth/authorize?${params.toString()}`,
    });

    if (!response.success || !response.data?.redirectUrl) {
      throw new Error('Failed to initiate OAuth2 flow');
    }

    return response.data.redirectUrl;
  }

  async refreshOAuth2Token(connectionId: string, provider: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      url: '/api/oauth/refresh',
      data: {
        apiConnectionId: connectionId,
        provider,
      },
    });
  }

  async getOAuth2Token(connectionId: string): Promise<ApiResponse<{ accessToken: string; tokenType: string }>> {
    return this.request({
      method: 'GET',
      url: `/api/oauth/token?apiConnectionId=${connectionId}`,
    });
  }
}

export const apiClient = new ApiClient(); 