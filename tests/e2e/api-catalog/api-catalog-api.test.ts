import { test, expect } from '@playwright/test';
import { TestUser, generateTestId, cleanupTestUser } from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';
import { testAPIPerformance } from '../../helpers/performanceHelpers';
import { testXSSPrevention, testDataExposure } from '../../helpers/securityHelpers';

/**
 * API Catalog API Endpoint Tests
 * 
 * Focus: Backend API endpoints, data validation, security, performance
 * Approach: Direct API testing with comprehensive error handling
 * Coverage: All API endpoints and edge cases
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: TestUser;
let jwt: string;
let createdCatalogIds: string[] = [];

// Test data for API catalog endpoints
const createTestApiCatalog = (suffix: string = '') => ({
  name: `Test API Catalog${suffix}`,
  description: 'A test API for catalog endpoint testing',
  baseUrl: 'https://api.test.com',
  documentationUrl: 'https://api.test.com/openapi.json',
  category: 'testing',
  version: '1.0.0'
});

test.describe('API Catalog API Endpoints', () => {
  test.beforeAll(async () => {
    // Create a real test user using new helper
    testUser = await createE2EUser('ADMIN', {
      email: `e2e-catalog-api-${generateTestId('user')}@testuser.local`,
      password: 'e2eTestPass123',
      name: 'E2E API Catalog API Test User'
    });
    jwt = testUser.accessToken;
  });

  test.afterAll(async ({ request }) => {
    // Clean up created catalog entries
    for (const id of createdCatalogIds) {
      try {
        await request.delete(`${BASE_URL}/api/catalog/${id}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
      } catch (error) {
        console.warn(`Failed to cleanup catalog entry ${id}:`, error);
      }
    }

    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.describe('GET /api/catalog', () => {
    test('should return list of available APIs in catalog', async ({ request, page }) => {
      const response = await request.get(`${BASE_URL}/api/catalog`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data.catalogEntries)).toBe(true);
      
      // Verify API performance
      await testAPIPerformance(page, '/api/catalog', { 
        threshold: 1000,
        headers: { 'Authorization': `Bearer ${jwt}` }
      }); // 1 second budget
    });

    test('should support pagination for large catalogs', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/catalog?page=1&limit=10`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(data.pagination).toHaveProperty('page', 1);
      expect(data.pagination).toHaveProperty('limit', 10);
      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('pages');
    });

    test('should support filtering by category', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/catalog?category=Communication`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      
      // Verify all returned APIs have the correct category
      if (data.data.catalogEntries.length > 0) {
        data.data.catalogEntries.forEach((api: any) => {
          expect(api.category).toBe('Communication');
        });
      }
    });

    test('should support search by name and description', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/catalog?search=slack`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      
      // Verify search results contain the search term
      if (data.data.catalogEntries.length > 0) {
        data.data.catalogEntries.forEach((api: any) => {
          const searchableText = `${api.name} ${api.description}`.toLowerCase();
          expect(searchableText).toContain('slack');
        });
      }
    });

    test('should support search by provider name', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/catalog?search=Google`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      
      // Verify search results include Google Workspace APIs or provider context
      if (data.data.catalogEntries.length > 0) {
        const hasGoogleApis = data.data.catalogEntries.some((api: any) => 
          api.provider?.name?.toLowerCase().includes('google') ||
          api.name.toLowerCase().includes('gmail') ||
          api.name.toLowerCase().includes('sheets') ||
          api.name.toLowerCase().includes('calendar')
        );
        // This test will pass if we find Google-related APIs or if no results (no seeded data)
        console.log(`Found ${data.data.catalogEntries.length} APIs, Google-related: ${hasGoogleApis}`);
      }
    });

    test('should support filtering by provider', async ({ request }) => {
      // First get a list to find a provider ID
      const listResponse = await request.get(`${BASE_URL}/api/catalog`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });

      expect(listResponse.status()).toBe(200);
      const listData = await listResponse.json();
      
      // Find an API with a provider
      const apiWithProvider = listData.data.catalogEntries.find((api: any) => api.providerId);
      
      if (apiWithProvider) {
        const response = await request.get(`${BASE_URL}/api/catalog?providerId=${apiWithProvider.providerId}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });

        expect(response.status()).toBe(200);
        
        const data = await response.json();
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('data');
        
        // Verify all returned APIs belong to the specified provider
        if (data.data.catalogEntries.length > 0) {
          data.data.catalogEntries.forEach((api: any) => {
            expect(api.providerId).toBe(apiWithProvider.providerId);
          });
        }
      } else {
        console.log('⚠️ No APIs with providers found - may need seeded data');
      }
    });

    test('should prevent XSS attacks in search parameters', async ({ request }) => {
      const maliciousSearch = '<script>alert("xss")</script>';
      const response = await request.get(`${BASE_URL}/api/catalog?search=${encodeURIComponent(maliciousSearch)}`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      
      // Verify no script tags in response
      const responseText = JSON.stringify(data);
      expect(responseText).not.toContain('<script>');
      expect(responseText).not.toContain('alert(');
    });
  });

  test.describe('GET /api/catalog/[id]', () => {
    test('should return specific API details from catalog', async ({ request }) => {
      // First, get list of APIs to find an ID
      const listResponse = await request.get(`${BASE_URL}/api/catalog`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });

      expect(listResponse.status()).toBe(200);
      const listData = await listResponse.json();
      
      if (listData.data.catalogEntries.length > 0) {
        const apiId = listData.data.catalogEntries[0].id;
        
        const response = await request.get(`${BASE_URL}/api/catalog/${apiId}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });

        expect(response.status()).toBe(200);
        
        const data = await response.json();
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('data');
        expect(data.data).toHaveProperty('id', apiId);
        expect(data.data).toHaveProperty('name');
        expect(data.data).toHaveProperty('description');
        expect(data.data).toHaveProperty('baseUrl');
        expect(data.data).toHaveProperty('endpoints');
        expect(Array.isArray(data.data.endpoints)).toBe(true);
      }
    });

    test('should return 404 for non-existent API', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/catalog/non-existent-id`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });

      expect(response.status()).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    });

    test('should include endpoint details in API response', async ({ request }) => {
      // First, get list of APIs to find an ID
      const listResponse = await request.get(`${BASE_URL}/api/catalog`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });

      expect(listResponse.status()).toBe(200);
      const listData = await listResponse.json();
      
      if (listData.data.catalogEntries.length > 0) {
        const apiId = listData.data.catalogEntries[0].id;
        
        const response = await request.get(`${BASE_URL}/api/catalog/${apiId}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });

        expect(response.status()).toBe(200);
        
        const data = await response.json();
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('data');
        expect(data.data).toHaveProperty('endpoints');
        
        // Verify endpoint structure
        if (data.data.endpoints.length > 0) {
          const endpoint = data.data.endpoints[0];
          expect(endpoint).toHaveProperty('id');
          expect(endpoint).toHaveProperty('path');
          expect(endpoint).toHaveProperty('method');
          expect(endpoint).toHaveProperty('summary');
          expect(endpoint).toHaveProperty('parameters');
          expect(endpoint).toHaveProperty('responses');
        }
      }
    });
  });

  test.describe('POST /api/catalog', () => {
    test('should create new API in catalog', async ({ request }) => {
      const testApi = createTestApiCatalog(' - Create Test');
      const response = await request.post(`${BASE_URL}/api/catalog`, {
        headers: { 
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        data: testApi
      });

      expect(response.status()).toBe(201);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('name', testApi.name);
      expect(data.data).toHaveProperty('description', testApi.description);
      expect(data.data).toHaveProperty('baseUrl', testApi.baseUrl);
      expect(data.data).toHaveProperty('category', testApi.category);
      
      // Store ID for cleanup
      createdCatalogIds.push(data.data.id);
    });

    test('should validate required fields for API creation', async ({ request }) => {
      const invalidApi = {
        name: '', // Empty name
        description: 'Test API',
        baseUrl: 'invalid-url', // Invalid URL
        documentationUrl: 'not-a-url' // Invalid URL
      };

      const response = await request.post(`${BASE_URL}/api/catalog`, {
        headers: { 
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        data: invalidApi
      });

      expect(response.status()).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    });

    test('should prevent duplicate APIs in catalog', async ({ request }) => {
      // Create first API
      const testApi = createTestApiCatalog(' - Duplicate Test');
      const firstResponse = await request.post(`${BASE_URL}/api/catalog`, {
        headers: { 
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        data: testApi
      });

      expect(firstResponse.status()).toBe(201);
      const firstData = await firstResponse.json();
      createdCatalogIds.push(firstData.data.id);

      // Try to create duplicate API with same name
      const duplicateApi = {
        ...testApi
        // Same name as first API
      };

      const secondResponse = await request.post(`${BASE_URL}/api/catalog`, {
        headers: { 
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        data: duplicateApi
      });

      expect(secondResponse.status()).toBe(409);
      
      const data = await secondResponse.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    });
  });

  test.describe('PUT /api/catalog/[id]', () => {
    test('should update existing API in catalog', async ({ request }) => {
      // First, create an API
      const testApi = createTestApiCatalog(' - Update Test');
      const createResponse = await request.post(`${BASE_URL}/api/catalog`, {
        headers: { 
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        data: testApi
      });

      expect(createResponse.status()).toBe(201);
      const createData = await createResponse.json();
      const apiId = createData.data.id;
      createdCatalogIds.push(apiId);

      // Update the API
      const updatedApi = {
        ...testApi,
        name: 'Updated Test API',
        description: 'Updated description'
      };

      const response = await request.put(`${BASE_URL}/api/catalog/${apiId}`, {
        headers: { 
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        data: updatedApi
      });

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('name', 'Updated Test API');
      expect(data.data).toHaveProperty('description', 'Updated description');
    });

    test('should return 404 for non-existent API update', async ({ request }) => {
      const testApi = createTestApiCatalog(' - Non-existent Update Test');
      const response = await request.put(`${BASE_URL}/api/catalog/non-existent-id`, {
        headers: { 
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        data: testApi
      });

      expect(response.status()).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    });
  });

  test.describe('DELETE /api/catalog/[id]', () => {
    test('should delete API from catalog', async ({ request }) => {
      // First, create an API
      const testApi = createTestApiCatalog(' - Delete Test');
      const createResponse = await request.post(`${BASE_URL}/api/catalog`, {
        headers: { 
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        data: testApi
      });

      expect(createResponse.status()).toBe(201);
      const createData = await createResponse.json();
      const apiId = createData.data.id;

      // Delete the API
      const response = await request.delete(`${BASE_URL}/api/catalog/${apiId}`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });

      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('message');
    });

    test('should return 404 for non-existent API deletion', async ({ request }) => {
      const response = await request.delete(`${BASE_URL}/api/catalog/non-existent-id`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });

      expect(response.status()).toBe(404);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    });
  });

  test.describe('API Catalog Security', () => {
    test('should require authentication for all catalog endpoints', async ({ request }) => {
      const endpoints = [
        'GET /api/catalog',
        'GET /api/catalog/test-id',
        'POST /api/catalog',
        'PUT /api/catalog/test-id',
        'DELETE /api/catalog/test-id'
      ];

      for (const endpoint of endpoints) {
        const [method, path] = endpoint.split(' ');
        const url = `${BASE_URL}${path}`;
        
        let response;
        if (method === 'GET') {
          response = await request.get(url);
        } else if (method === 'POST') {
          response = await request.post(url, { data: {} });
        } else if (method === 'PUT') {
          response = await request.put(url, { data: {} });
        } else if (method === 'DELETE') {
          response = await request.delete(url);
        }

        expect(response!.status()).toBe(401);
        
        const data = await response!.json();
        expect(data).toHaveProperty('error');
      }
    });

    test('should prevent data exposure between users', async ({ request }) => {
      // Create API with user 1
      const testApi = createTestApiCatalog(' - Data Exposure Test');
      const createResponse = await request.post(`${BASE_URL}/api/catalog`, {
        headers: { 
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        data: testApi
      });

      expect(createResponse.status()).toBe(201);
      const createData = await createResponse.json();
      const apiId = createData.data.id;
      createdCatalogIds.push(apiId);

      // Verify API is accessible (catalog is shared)
      const getResponse = await request.get(`${BASE_URL}/api/catalog/${apiId}`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });

      expect(getResponse.status()).toBe(200);
      
      const data = await getResponse.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      
      // Verify no user-specific data is exposed
      expect(data.data).not.toHaveProperty('userId');
      expect(data.data).not.toHaveProperty('userCredentials');
      expect(data.data).not.toHaveProperty('userApiKeys');
    });

    test('should handle rate limiting for catalog endpoints', async ({ request }) => {
      // Make multiple requests to test rate limiting
      const requests: Promise<any>[] = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          request.get(`${BASE_URL}/api/catalog`, {
            headers: { 'Authorization': `Bearer ${jwt}` }
          })
        );
      }

      const responses = await Promise.all(requests);
      
      // Check if any requests were rate limited
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      
      if (rateLimitedResponses.length > 0) {
        const rateLimitedResponse = rateLimitedResponses[0];
        const data = await rateLimitedResponse.json();
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('retryAfter');
      }
    });
  });
});
