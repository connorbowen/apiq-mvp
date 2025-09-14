/**
 * Human-friendly API response formatter
 * Converts raw API responses into readable, contextual explanations
 */

export interface ApiResponseData {
  method: string;
  url: string;
  statusCode: number;
  responseData: any;
  responseHeaders: Record<string, string>;
  executionTime: number;
  error?: string;
}

export interface FormattedResponse {
  summary: string;
  details: string;
  data: {
    formatted: string;
    raw?: any;
  };
  suggestions: string[];
  status: 'success' | 'error' | 'warning';
}

export class ResponseFormatter {
  /**
   * Format API response data into human-friendly format
   */
  static formatApiResponse(apiResponse: ApiResponseData): FormattedResponse {
    const { method, url, statusCode, responseData, executionTime, error } = apiResponse;
    
    if (error) {
      return this.formatErrorResponse(apiResponse);
    }

    const isSuccess = statusCode >= 200 && statusCode < 300;
    const status = isSuccess ? 'success' : 'warning';
    
    // Generate contextual summary based on method and status
    const summary = this.generateSummary(method, url, statusCode, responseData);
    
    // Format the response data in a human-readable way
    const formattedData = this.formatResponseData(responseData, method, url);
    
    // Generate helpful details
    const details = this.generateDetails(method, url, statusCode, executionTime, responseData);
    
    // Generate suggestions for next steps
    const suggestions = this.generateSuggestions(method, url, responseData, statusCode);

    return {
      summary,
      details,
      data: {
        formatted: formattedData,
        raw: responseData
      },
      suggestions,
      status
    };
  }

  /**
   * Generate a contextual summary of the API call
   */
  private static generateSummary(method: string, url: string, statusCode: number, responseData: any): string {
    const action = this.getActionDescription(method, url);
    const statusText = this.getStatusDescription(statusCode);
    
    if (statusCode >= 200 && statusCode < 300) {
      return `✅ ${action} ${statusText}`;
    } else if (statusCode >= 400 && statusCode < 500) {
      return `⚠️ ${action} - ${statusText}`;
    } else {
      return `❌ ${action} - ${statusText}`;
    }
  }

  /**
   * Get human-readable action description
   */
  private static getActionDescription(method: string, url: string): string {
    const endpoint = this.getEndpointDescription(url);
    
    switch (method.toUpperCase()) {
      case 'GET':
        return `Retrieved ${endpoint}`;
      case 'POST':
        return `Created ${endpoint}`;
      case 'PUT':
        return `Updated ${endpoint}`;
      case 'PATCH':
        return `Modified ${endpoint}`;
      case 'DELETE':
        return `Deleted ${endpoint}`;
      default:
        return `Executed ${method} on ${endpoint}`;
    }
  }

  /**
   * Get endpoint description from URL
   */
  private static getEndpointDescription(url: string): string {
    const path = url.split('?')[0]; // Remove query parameters
    
    if (path.includes('/pet')) {
      if (path.endsWith('/pet') || path.endsWith('/pets')) {
        return 'pet information';
      } else if (path.includes('/pet/')) {
        return 'specific pet';
      }
    }
    
    if (path.includes('/user')) {
      if (path.endsWith('/user') || path.endsWith('/users')) {
        return 'user information';
      } else if (path.includes('/user/')) {
        return 'specific user';
      }
    }
    
    if (path.includes('/order')) {
      if (path.endsWith('/order') || path.endsWith('/orders')) {
        return 'order information';
      } else if (path.includes('/order/')) {
        return 'specific order';
      }
    }
    
    // Generic fallback
    return `data from ${path}`;
  }

  /**
   * Get status description
   */
  private static getStatusDescription(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) {
      return 'successfully';
    } else if (statusCode === 400) {
      return 'with bad request error';
    } else if (statusCode === 401) {
      return 'with authentication error';
    } else if (statusCode === 403) {
      return 'with permission denied error';
    } else if (statusCode === 404) {
      return 'with not found error';
    } else if (statusCode === 409) {
      return 'with conflict error';
    } else if (statusCode === 422) {
      return 'with validation error';
    } else if (statusCode >= 500) {
      return 'with server error';
    } else {
      return `with status ${statusCode}`;
    }
  }

  /**
   * Format response data in a human-readable way
   */
  private static formatResponseData(responseData: any, method: string, url: string): string {
    if (!responseData) {
      return 'No data returned';
    }

    // Handle different response types
    if (Array.isArray(responseData)) {
      return this.formatArrayResponse(responseData, method, url);
    } else if (typeof responseData === 'object') {
      return this.formatObjectResponse(responseData, method, url);
    } else {
      return String(responseData);
    }
  }

  /**
   * Format array responses
   */
  private static formatArrayResponse(data: any[], method: string, url: string): string {
    const count = data.length;
    const itemType = this.getItemType(url);
    
    if (count === 0) {
      return `No ${itemType} found`;
    }
    
    if (count === 1) {
      return `Found 1 ${itemType}: ${this.formatSingleItem(data[0])}`;
    }
    
    if (count <= 5) {
      const items = data.map(item => this.formatSingleItem(item)).join(', ');
      return `Found ${count} ${itemType}: ${items}`;
    }
    
    const sample = data.slice(0, 3).map(item => this.formatSingleItem(item)).join(', ');
    return `Found ${count} ${itemType}: ${sample}... (and ${count - 3} more)`;
  }

  /**
   * Format object responses
   */
  private static formatObjectResponse(data: any, method: string, url: string): string {
    // Common patterns for different endpoints
    if (data.id && data.name) {
      return `${data.name} (ID: ${data.id})`;
    }
    
    if (data.id && data.title) {
      return `${data.title} (ID: ${data.id})`;
    }
    
    if (data.id && data.email) {
      return `${data.email} (ID: ${data.id})`;
    }
    
    if (data.message) {
      return data.message;
    }
    
    if (data.error) {
      return `Error: ${data.error}`;
    }
    
    // Generic object formatting
    const keys = Object.keys(data);
    if (keys.length <= 3) {
      const pairs = keys.map(key => `${key}: ${data[key]}`).join(', ');
      return pairs;
    }
    
    return `Object with ${keys.length} properties: ${keys.slice(0, 3).join(', ')}...`;
  }

  /**
   * Format a single item for display
   */
  private static formatSingleItem(item: any): string {
    if (typeof item === 'string') {
      return item;
    }
    
    if (typeof item === 'object' && item !== null) {
      if (item.name) {
        return item.name;
      }
      if (item.title) {
        return item.title;
      }
      if (item.email) {
        return item.email;
      }
      if (item.id) {
        return `ID: ${item.id}`;
      }
      
      // Fallback to first property
      const keys = Object.keys(item);
      if (keys.length > 0) {
        return `${keys[0]}: ${item[keys[0]]}`;
      }
    }
    
    return String(item);
  }

  /**
   * Get item type from URL
   */
  private static getItemType(url: string): string {
    if (url.includes('/pet')) return 'pet';
    if (url.includes('/user')) return 'user';
    if (url.includes('/order')) return 'order';
    if (url.includes('/product')) return 'product';
    if (url.includes('/customer')) return 'customer';
    return 'item';
  }

  /**
   * Generate helpful details about the API call
   */
  private static generateDetails(method: string, url: string, statusCode: number, executionTime: number, responseData: any): string {
    const details = [];
    
    // Execution time
    if (executionTime < 1000) {
      details.push(`Completed in ${executionTime}ms`);
    } else {
      details.push(`Completed in ${(executionTime / 1000).toFixed(1)}s`);
    }
    
    // Response size
    if (responseData) {
      const dataSize = JSON.stringify(responseData).length;
      if (dataSize > 1000) {
        details.push(`Response size: ${(dataSize / 1024).toFixed(1)}KB`);
      }
    }
    
    // Status code details
    if (statusCode >= 200 && statusCode < 300) {
      details.push('Request successful');
    } else if (statusCode >= 400) {
      details.push('Request failed - check parameters or permissions');
    }
    
    return details.join(' • ');
  }

  /**
   * Generate suggestions for next steps
   */
  private static generateSuggestions(method: string, url: string, responseData: any, statusCode: number): string[] {
    const suggestions = [];
    
    if (statusCode >= 200 && statusCode < 300) {
      if (method === 'GET' && Array.isArray(responseData) && responseData.length > 0) {
        suggestions.push('You can now create workflows using this data');
        suggestions.push('Try filtering or searching for specific items');
      } else if (method === 'POST' && responseData?.id) {
        suggestions.push('The new item was created successfully');
        suggestions.push('You can now update or delete this item');
      } else if (method === 'PUT' || method === 'PATCH') {
        suggestions.push('The item was updated successfully');
        suggestions.push('You can verify the changes by fetching the item again');
      } else if (method === 'DELETE') {
        suggestions.push('The item was deleted successfully');
        suggestions.push('You can create a new item if needed');
      }
    } else if (statusCode === 404) {
      suggestions.push('Check if the item ID exists');
      suggestions.push('Try listing all items first');
    } else if (statusCode === 401) {
      suggestions.push('Check your API authentication');
      suggestions.push('Verify your API key or token');
    } else if (statusCode === 403) {
      suggestions.push('Check your permissions for this operation');
      suggestions.push('Contact your administrator if needed');
    } else if (statusCode >= 500) {
      suggestions.push('The server encountered an error');
      suggestions.push('Try again in a few moments');
    }
    
    return suggestions;
  }

  /**
   * Format error responses
   */
  private static formatErrorResponse(apiResponse: ApiResponseData): FormattedResponse {
    const { method, url, error } = apiResponse;
    const action = this.getActionDescription(method, url);
    
    return {
      summary: `❌ ${action} failed`,
      details: `Error: ${error}`,
      data: {
        formatted: `Failed to execute ${method} ${url}`,
        raw: null
      },
      suggestions: [
        'Check your internet connection',
        'Verify the API endpoint is correct',
        'Try again in a few moments'
      ],
      status: 'error'
    };
  }
}
