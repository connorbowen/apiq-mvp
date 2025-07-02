export interface TestApiConfig {
  name: string;
  baseUrl: string;
  specUrl: string;
  authType: 'none' | 'api_key' | 'bearer' | 'oauth2';
  description: string;
  rateLimit?: {
    requests: number;
    window: number; // seconds
  };
  expectedEndpoints?: number; // for validation
}

export const TEST_APIS: TestApiConfig[] = [
  // Public Test APIs - These are known to work
  {
    name: 'Petstore API',
    baseUrl: 'https://petstore.swagger.io/v2',
    specUrl: 'https://petstore.swagger.io/v2/swagger.json',
    authType: 'none',
    description: 'Public Swagger Petstore API for testing',
    expectedEndpoints: 20
  },
  {
    name: 'HTTPBin',
    baseUrl: 'https://httpbin.org',
    specUrl: 'https://httpbin.org/json', // This returns JSON but not OpenAPI spec
    authType: 'none',
    description: 'HTTP request & response service for testing',
    expectedEndpoints: 0 // Not a real OpenAPI spec
  },
  
  // Simple test APIs that return JSON
  {
    name: 'JSONPlaceholder',
    baseUrl: 'https://jsonplaceholder.typicode.com',
    specUrl: 'https://jsonplaceholder.typicode.com/posts/1', // Returns JSON data
    authType: 'none',
    description: 'Public test API for testing and prototyping',
    rateLimit: {
      requests: 10,
      window: 60 // 10 requests per minute for testing rate limiting
    },
    expectedEndpoints: 0 // Not a real OpenAPI spec
  },
  
  // APIs that require authentication (for later testing)
  {
    name: 'GitHub API',
    baseUrl: 'https://api.github.com',
    specUrl: 'https://api.github.com/zen', // Simple endpoint that works
    authType: 'bearer',
    description: 'GitHub REST API for repository management',
    rateLimit: {
      requests: 60,
      window: 3600 // 60 requests per hour for unauthenticated
    },
    expectedEndpoints: 0 // Not a real OpenAPI spec
  }
];

export function getTestApiByName(name: string): TestApiConfig | undefined {
  return TEST_APIS.find(api => api.name === name);
}

export function getTestApisByAuthType(authType: TestApiConfig['authType']): TestApiConfig[] {
  return TEST_APIS.filter(api => api.authType === authType);
}

export function validateTestApiConfig(api: TestApiConfig): string[] {
  const errors: string[] = [];
  
  if (!api.name) errors.push('Name is required');
  if (!api.baseUrl) errors.push('Base URL is required');
  if (!api.specUrl) errors.push('Spec URL is required');
  if (!api.description) errors.push('Description is required');
  
  // Validate URLs
  try {
    new URL(api.baseUrl);
  } catch {
    errors.push('Invalid base URL');
  }
  
  try {
    new URL(api.specUrl);
  } catch {
    errors.push('Invalid spec URL');
  }
  
  return errors;
} 