// API Client utility for making authenticated requests

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      if (response.status === 401) {
        // Handle unauthorized - redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  // OAuth2 specific methods
  async initiateOAuth2Flow(connectionId: string, provider: string, config: any): Promise<string> {
    const params = new URLSearchParams({
      apiConnectionId: connectionId,
      provider,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      ...(config.scope && { scope: config.scope }),
    });

    const response = await fetch(`/api/oauth/authorize?${params.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to initiate OAuth2 flow');
    }

    const data = await response.json();
    return data.data.redirectUrl;
  }

  async refreshOAuth2Token(connectionId: string, provider: string): Promise<ApiResponse> {
    return this.post('/api/oauth/refresh', {
      apiConnectionId: connectionId,
      provider,
    });
  }

  async getOAuth2Token(connectionId: string): Promise<ApiResponse<{ accessToken: string; tokenType: string }>> {
    return this.get(`/api/oauth/token?apiConnectionId=${connectionId}`);
  }

  // Connection management methods
  async getConnections(): Promise<ApiResponse<{ connections: any[]; total: number; active: number; failed: number }>> {
    return this.get('/api/connections');
  }

  async getConnection(id: string): Promise<ApiResponse<any>> {
    return this.get(`/api/connections/${id}`);
  }

  async createConnection(data: any): Promise<ApiResponse<any>> {
    return this.post('/api/connections', data);
  }

  async updateConnection(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/api/connections/${id}`, data);
  }

  async deleteConnection(id: string): Promise<ApiResponse> {
    return this.delete(`/api/connections/${id}`);
  }

  async testConnection(id: string): Promise<ApiResponse<any>> {
    return this.post(`/api/connections/${id}/test`);
  }

  async refreshConnection(id: string): Promise<ApiResponse<any>> {
    return this.post(`/api/connections/${id}/refresh`);
  }

  // OAuth2 providers
  async getOAuth2Providers(): Promise<ApiResponse<{ providers: any[]; count: number }>> {
    return this.get('/api/oauth/providers');
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export types
export type { ApiResponse }; 