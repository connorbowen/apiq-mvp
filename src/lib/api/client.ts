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
// TODO: [SECRETS-FIRST-REFACTOR] Phase 3: API Client Updates
// - Update createConnection to handle secret creation
// - Add secret management methods
// - Update connection testing to use secrets
// - Add secret reference handling
// - Update OAuth2 flow to use secrets
// - Add rollback mechanisms for failed operations

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

// TODO: [SECRETS-FIRST-REFACTOR] Update API types to support secrets
export interface CreateConnectionRequest {
  name: string;
  description?: string;
  baseUrl: string;
  authType: 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2' | 'CUSTOM';
  documentationUrl?: string;
  authConfig: any;
  // TODO: Add secret-related fields
  // secretIds?: string[];
  // secretReferences?: {
  //   apiKey?: string;
  //   bearerToken?: string;
  //   username?: string;
  //   password?: string;
  //   clientId?: string;
  //   clientSecret?: string;
  // };
}

// TODO: [SECRETS-FIRST-REFACTOR] Add secret creation interface
// export interface CreateSecretRequest {
//   name: string;
//   type: string;
//   value: string;
//   description?: string;
//   connectionId?: string;
//   enableRotation?: boolean;
//   rotationInterval?: number;
// }

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
  // secretId?: string;
  // secretReference?: {
  //   id: string;
  //   name: string;
  //   type: string;
  // };
}

// TODO: [SECRETS-FIRST-REFACTOR] Add Secret interface
// export interface Secret {
//   id: string;
//   name: string;
//   type: string;
//   description?: string;
//   connectionId?: string;
//   version: number;
//   isActive: boolean;
//   expiresAt?: string;
//   rotationEnabled: boolean;
//   rotationInterval?: number;
//   lastRotatedAt?: string;
//   nextRotationAt?: string;
//   createdAt: string;
//   updatedAt: string;
// }

// TODO: [SECRETS-FIRST-REFACTOR] Update API client methods
class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '';
  }

  private async request<T>(config: any): Promise<ApiResponse<T>> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const response: AxiosResponse<ApiResponse<T>> = await axios({
        ...config,
        url: `${this.baseURL}${config.url}`,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...config.headers,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error',
      };
    }
  }

  // TODO: [SECRETS-FIRST-REFACTOR] Update createConnection to handle secrets
  async createConnection(data: CreateConnectionRequest): Promise<ApiResponse<{ connection: ApiConnection }>> {
    // TODO: Implement secret-first connection creation
    // 1. Create secrets based on auth type
    // 2. Create connection with secret references
    // 3. Handle rollback on failure
    return this.request({
      method: 'POST',
      url: '/api/connections',
      data,
    });
  }

  // TODO: [SECRETS-FIRST-REFACTOR] Add secret management methods
  // async createSecret(data: CreateSecretRequest): Promise<ApiResponse<{ secret: Secret }>> {
  //   return this.request({
  //     method: 'POST',
  //     url: '/api/secrets',
  //     data,
  //   });
  // }

  // async getSecrets(): Promise<ApiResponse<{ secrets: Secret[] }>> {
  //   return this.request({
  //     method: 'GET',
  //     url: '/api/secrets',
  //   });
  // }

  // async getSecret(id: string): Promise<ApiResponse<{ secret: Secret }>> {
  //   return this.request({
  //     method: 'GET',
  //     url: `/api/secrets/${id}`,
  //   });
  // }

  // async updateSecret(id: string, data: Partial<CreateSecretRequest>): Promise<ApiResponse<{ secret: Secret }>> {
  //   return this.request({
  //     method: 'PUT',
  //     url: `/api/secrets/${id}`,
  //     data,
  //   });
  // }

  // async deleteSecret(id: string): Promise<ApiResponse<void>> {
  //   return this.request({
  //     method: 'DELETE',
  //     url: `/api/secrets/${id}`,
  //   });
  // }

  // async rotateSecret(id: string): Promise<ApiResponse<{ secret: Secret }>> {
  //   return this.request({
  //     method: 'POST',
  //     url: `/api/secrets/${id}/rotate`,
  //   });
  // }

  // TODO: [SECRETS-FIRST-REFACTOR] Update test connection to use secrets
  async testConnectionConfig(config: any): Promise<ApiResponse<any>> {
    // TODO: Implement test using secrets instead of direct credentials
    return this.request({
      method: 'POST',
      url: '/api/connections/test-config',
      data: config,
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
}

export const apiClient = new ApiClient(); 