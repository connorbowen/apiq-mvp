import { test, expect } from '@playwright/test';
import { TestUser, generateTestId } from '../helpers/testUtils';
import { createTestData, cleanupTestData } from '../helpers/dataHelpers';

let testUser: TestUser;
let testData: any;

test.describe('Debug API Connection Creation', () => {
  test.beforeAll(async () => {
    testData = await createTestData({
      user: {
        email: `debug-api-${generateTestId('user')}@testuser.local`,
        password: 'e2eTestPass123',
        role: 'ADMIN',
        name: 'Debug API Test User'
      }
    });
    testUser = testData.user!;
  });

  test.afterAll(async () => {
    await cleanupTestData(testData);
  });

  test('should create connection via API directly', async ({ page }) => {
    console.log('🔍 Starting direct API connection creation test');
    
    // Use proper authentication
    const { setupE2E } = await import('../helpers/e2eHelpers');
    await setupE2E(page, testUser, { 
      tab: 'connections', 
      validateUX: false 
    });
    
    // Navigate to dashboard
    await page.goto('/dashboard?tab=connections');
    await page.waitForTimeout(2000);
    
    // Test direct API call
    console.log('🔍 Testing direct API call to create connection');
    
    const connectionData = {
      name: 'Debug API Connection',
      description: 'Test connection created via API',
      baseUrl: 'https://petstore3.swagger.io/api/v3',
      authType: 'NONE',
      documentationUrl: 'https://petstore3.swagger.io/api/v3/openapi.json',
      authConfig: {}
    };
    
    console.log('🔍 Sending POST request to /api/connections');
    const response = await page.request.post('/api/connections', {
      data: connectionData
    });
    
    console.log('🔍 Response status:', response.status());
    console.log('🔍 Response headers:', response.headers());
    
    if (response.ok()) {
      const result = await response.json();
      console.log('✅ Connection created successfully:', result);
      
      // Verify connection was created
      const getResponse = await page.request.get('/api/connections');
      if (getResponse.ok()) {
        const connections = await getResponse.json();
        console.log('🔍 Available connections after creation:', connections.data?.length || 0);
        
        if (connections.data && connections.data.length > 0) {
          const conn = connections.data[0];
          console.log('🔍 Connection details:', {
            name: conn.name,
            endpointCount: conn.endpoints?.length || 0,
            ingestionStatus: conn.ingestionStatus
          });
        }
      }
    } else {
      const error = await response.text();
      console.log('❌ Connection creation failed:', error);
    }
  });
});
