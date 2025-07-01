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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('accessToken');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle 401 by redirecting to login, except for login endpoint
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
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

  // OAuth2 Methods
  async getOAuth2Providers(): Promise<ApiResponse<{ providers: OAuth2Provider[]; count: number }>> {
    return this.request('/api/oauth/providers');
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

    return `${this.baseUrl}/api/oauth/authorize?${params.toString()}`;
  }

  async refreshOAuth2Token(apiConnectionId: string, provider: string): Promise<ApiResponse> {
    return this.request('/api/oauth/refresh', {
      method: 'POST',
      body: JSON.stringify({ apiConnectionId, provider }),
    });
  }

  async getOAuth2Token(apiConnectionId: string): Promise<ApiResponse<{ accessToken: string; tokenType: string }>> {
    return this.request(`/api/oauth/token?apiConnectionId=${apiConnectionId}`);
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

  async verifyEmail(token: string): Promise<ApiResponse<{
    message: string;
    userId: string;
  }>> {
    return this.request('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
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
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export the class for testing
export { ApiClient }; 