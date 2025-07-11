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
}

export interface CreateConnectionRequest {
  name: string;
  description?: string;
  baseUrl: string;
  authType: 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH' | 'OAUTH2' | 'CUSTOM';
  authConfig?: {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    scope?: string;
    provider?: string;
    apiKey?: string;
    secretKey?: string;
    bearerToken?: string;
    username?: string;
    password?: string;
  };
  documentationUrl?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const config: RequestInit = {
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      credentials: 'include', // Include cookies in requests
      ...options,
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle 401 by redirecting to login, except for login endpoint
        if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
          // Clear any remaining localStorage data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login?reason=auth';
          }
          return { success: false, error: 'Authentication required' };
        }
        return { success: false, error: data.error || 'Request failed', code: data.code };
      }

      return { success: true, data: data.data || data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  // API Connection OAuth2 Methods
  async getOAuth2Providers(): Promise<ApiResponse<{ providers: OAuth2Provider[]; count: number }>> {
    return this.request('/api/connections/oauth2/providers');
  }

  async initiateOAuth2Flow(
    apiConnectionId: string,
    provider: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    scope?: string
  ): Promise<string> {
    const params = new URLSearchParams({
      apiConnectionId,
      provider,
      clientId,
      clientSecret,
      redirectUri,
      ...(scope && { scope })
    });

    // For test provider, we need to handle the redirect differently
    if (provider === 'test') {
      // Use XMLHttpRequest instead of fetch to get better control over redirects
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.open('GET', `/api/connections/oauth2/authorize?${params.toString()}`, true);
        
        // Set auth headers
        const token = localStorage.getItem('accessToken');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        // Don't follow redirects automatically
        xhr.responseType = 'text';
        
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            console.log('🔍 API Client Debug - XHR status:', xhr.status);
            console.log('🔍 API Client Debug - XHR responseURL:', xhr.responseURL);
            console.log('🔍 API Client Debug - XHR getAllResponseHeaders:', xhr.getAllResponseHeaders());
            
            // Check for redirect status codes
            if (xhr.status >= 300 && xhr.status < 400) {
              // Try to get location header
              const location = xhr.getResponseHeader('location');
              console.log('🔍 API Client Debug - Location header:', location);
              
              if (location) {
                console.log('🔍 API Client Debug - Returning location:', location);
                resolve(location);
                return;
              } else {
                console.log('🔍 API Client Debug - No location header found');
              }
            } else {
              console.log('🔍 API Client Debug - Not a redirect status');
            }
            
            // If no redirect or no location header, try to parse response
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('🔍 API Client Debug - JSON response:', response);
              if (response.success && response.data?.redirectUrl) {
                resolve(response.data.redirectUrl);
                return;
              }
            } catch (e) {
              console.log('🔍 API Client Debug - JSON parsing failed:', e);
            }
            
            reject(new Error(`Failed to get OAuth2 redirect URL for test provider. Status: ${xhr.status}`));
          }
        };
        
        xhr.onerror = function() {
          console.log('🔍 API Client Debug - XHR error');
          reject(new Error('Network error during OAuth2 initiation'));
        };
        
        xhr.send();
      });
    } else {
      // For non-test providers, use the normal JSON response flow
      const response = await this.request<{ redirectUrl: string }>(`/api/connections/oauth2/authorize?${params.toString()}`);
      
      if (response.success && response.data?.redirectUrl) {
        return response.data.redirectUrl;
      }
      
      throw new Error(response.error || 'Failed to initiate OAuth2 flow');
    }
  }

  async refreshOAuth2Token(apiConnectionId: string, provider: string): Promise<ApiResponse> {
    return this.request('/api/connections/oauth2/refresh', {
      method: 'POST',
      body: JSON.stringify({ apiConnectionId, provider }),
    });
  }

  async getOAuth2Token(apiConnectionId: string): Promise<ApiResponse<{ accessToken: string; tokenType: string }>> {
    return this.request(`/api/connections/oauth2/token?apiConnectionId=${apiConnectionId}`);
  }

  // API Connection Methods
  async getConnections(): Promise<ApiResponse<{ connections: ApiConnection[] }>> {
    return this.request('/api/connections');
  }

  async getConnection(id: string): Promise<ApiResponse<ApiConnection>> {
    return this.request(`/api/connections/${id}`);
  }

  async createConnection(data: CreateConnectionRequest): Promise<ApiResponse<ApiConnection>> {
    return this.request('/api/connections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateConnection(id: string, data: Partial<CreateConnectionRequest>): Promise<ApiResponse<ApiConnection>> {
    return this.request(`/api/connections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteConnection(id: string): Promise<ApiResponse> {
    return this.request(`/api/connections/${id}`, {
      method: 'DELETE',
    });
  }

  async testConnection(id: string): Promise<ApiResponse> {
    return this.request(`/api/connections/${id}/test`, {
      method: 'POST',
    });
  }

  async refreshConnection(id: string): Promise<ApiResponse> {
    return this.request(`/api/connections/${id}/refresh`, {
      method: 'POST',
    });
  }

  async refreshConnectionSpec(id: string): Promise<ApiResponse> {
    return this.request(`/api/connections/${id}/refresh`, {
      method: 'POST',
    });
  }

  async getConnectionEndpoints(id: string): Promise<ApiResponse<{ endpoints: any[] }>> {
    return this.request(`/api/connections/${id}/endpoints`);
  }

  // Authentication Methods
  async register(email: string, name: string, password: string): Promise<ApiResponse<{
    message: string;
    userId: string;
  }>> {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    });
  }

  /**
   * Verify user email using a valid verification token
   * @param token - Verification token from email
   * @returns Promise resolving to API response with authentication tokens and user data
   * @example
   * ```typescript
   * const response = await apiClient.verifyEmail('verification-token-123');
   * if (response.success) {
   *   console.log('Email verified and user signed in');
   * }
   * ```
   */
  async verifyEmail(token: string): Promise<ApiResponse<{
    message: string;
    userId: string;
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      isActive: boolean;
    };
  }>> {
    return this.request('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  /**
   * Request a password reset email to be sent
   * @param email - User's email address
   * @returns Promise resolving to API response with success message
   * @example
   * ```typescript
   * const response = await apiClient.requestPasswordReset('user@example.com');
   * if (response.success) {
   *   console.log('Password reset email sent');
   * }
   * ```
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Reset user password using a valid reset token
   * @param token - Password reset token from email
   * @param password - New password to set
   * @returns Promise resolving to API response with success message
   * @example
   * ```typescript
   * const response = await apiClient.resetPassword('reset-token-123', 'newPassword123');
   * if (response.success) {
   *   console.log('Password reset successful');
   * }
   * ```
   */
  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    const response = await this.request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    
    // Handle the nested data structure from the API
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data
      };
    }
    return response;
  }

  /**
   * Resend verification email for unverified accounts
   * @param email - User's email address
   * @returns Promise resolving to API response with success message
   * @example
   * ```typescript
   * const response = await apiClient.resendVerification('user@example.com');
   * if (response.success) {
   *   console.log('Verification email sent');
   * }
   * ```
   */
  async resendVerification(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async login(email: string, password: string): Promise<ApiResponse<{
    accessToken: string;
    refreshToken: string;
    user: any;
  }>> {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.request('/api/auth/me');
  }

  async refreshToken(): Promise<ApiResponse<{
    accessToken: string;
    refreshToken: string;
  }>> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return { success: false, error: 'No refresh token available' };
    }

    return this.request('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/api/health');
  }

  // Workflow Methods
  async getWorkflows(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ workflows: any[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    return this.request(`/api/workflows?${queryParams.toString()}`);
  }

  async getWorkflow(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/workflows/${id}`);
  }

  async createWorkflow(data: { name: string; description?: string; isPublic?: boolean }): Promise<ApiResponse<any>> {
    return this.request('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorkflow(id: string, data: { name?: string; description?: string; status?: string; isPublic?: boolean }): Promise<ApiResponse<any>> {
    return this.request(`/api/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkflow(id: string): Promise<ApiResponse> {
    return this.request(`/api/workflows/${id}`, {
      method: 'DELETE',
    });
  }

  async executeWorkflow(id: string, parameters?: Record<string, any>): Promise<ApiResponse<any>> {
    return this.request(`/api/workflows/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ parameters }),
    });
  }

  // AI Chat Methods
  async generateWorkflow(message: string, context?: Record<string, any>): Promise<ApiResponse<any>> {
    return this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });
  }

  // Secrets Methods
  async getSecrets(): Promise<ApiResponse<{ secrets: any[] }>> {
    const response = await this.request<{ secrets: any[] }>('/api/secrets');
    // Handle the nested data structure from the API
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data
      };
    }
    return response as ApiResponse<{ secrets: any[] }>;
  }

  async createSecret(data: { name: string; value: string; description?: string; type?: string }): Promise<ApiResponse<any>> {
    const response = await this.request('/api/secrets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Handle the nested data structure from the API
    if (response.success && response.data) {
      return {
        success: true,
        data: response.data
      };
    }
    return response;
  }

  async updateSecret(name: string, data: { value: string; description?: string }): Promise<ApiResponse<any>> {
    return this.request(`/api/secrets/${name}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSecret(name: string): Promise<ApiResponse> {
    return this.request(`/api/secrets/${name}`, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export the class for testing
export { ApiClient }; 