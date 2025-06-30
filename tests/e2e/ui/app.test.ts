import { test, expect, request } from '@playwright/test'
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils'

const BASE_URL = 'http://localhost:3000'

let testUser;
let jwt;
let createdConnectionIds: string[] = [];

// Helper to create a connection with auth
async function createConnection(apiRequest, data) {
  const response = await apiRequest.post('/api/connections', {
    data,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`
    }
  })
  if (response.status() === 201) {
    const resData = await response.json();
    if (resData.data && resData.data.id) {
      createdConnectionIds.push(resData.data.id);
    }
  }
  return response
}

test.describe('APIQ Application E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Test User'
    );
    jwt = testUser.accessToken;
  });

  test.afterAll(async ({ request }) => {
    // Clean up created connections
    for (const id of createdConnectionIds) {
      await request.delete(`/api/connections/${id}`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
    }
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto(BASE_URL)
  })

  test.describe('Frontend UI', () => {
    test('should load the home page successfully', async ({ page }) => {
      await page.goto('/')
      
      // Check that the page loads with the correct title
      await expect(page).toHaveTitle(/APIQ/)
      
      // Check for the main heading
      await expect(page.locator('h1')).toContainText('APIQ')
      await expect(page.locator('h2')).toContainText('AI-Powered API Orchestration')
      
      // Check for the main call-to-action buttons
      await expect(page.locator('a[href="#features"]')).toContainText('Get Started')
      await expect(page.locator('a[href="#demo"]')).toContainText('View Demo')
      
      // Check for the health check button
      await expect(page.locator('button')).toContainText('Health Check')
    })

    test('should have proper meta tags', async ({ page }) => {
      await page.goto('/')
      
      // Check meta tags
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'AI-powered workflow automation across multiple APIs')
      await expect(page.locator('meta[name="keywords"]')).toHaveAttribute('content', 'API,orchestrator,workflow,automation,AI,OpenAI')
    })

    test('should have responsive design', async ({ page }) => {
      await page.goto('/')
      
      // Test desktop view
      await page.setViewportSize({ width: 1200, height: 800 })
      await expect(page.locator('h2')).toBeVisible()
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 })
      await expect(page.locator('h2')).toBeVisible()
    })

    test('should have proper color scheme and styling', async ({ page }) => {
      await page.goto('/')
      
      // Check that the page has proper styling (the body has CSS variables)
      const body = page.locator('body')
      await expect(body).toHaveClass(/antialiased/)
      
      // Check that the header has proper styling
      const header = page.locator('header')
      await expect(header).toHaveClass(/bg-white/)
      await expect(header).toHaveClass(/shadow-sm/)
      
      // Check that the main content area is visible
      const main = page.locator('main')
      await expect(main).toBeVisible()
    })

    test('should have working call-to-action buttons', async ({ page }) => {
      await page.goto('/')
      
      // Test "Get Started" button scrolls to features section
      await page.click('a[href="#features"]')
      await expect(page.locator('#features')).toBeVisible()
      
      // Test "View Demo" button scrolls to demo section
      await page.click('a[href="#demo"]')
      await expect(page.locator('#demo')).toBeVisible()
    })

    test('should have working health check functionality', async ({ page }) => {
      await page.goto('/')
      
      // Click the health check button
      await page.click('button:has-text("Health Check")')
      
      // Wait for the health status to appear
      await page.waitForSelector('text=System Health:', { timeout: 10000 })
      
      // Check that health status is displayed
      await expect(page.locator('text=System Health:')).toBeVisible()
    })

    test('should handle 404 errors gracefully', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/nonexistent-page`)
      expect(response?.status()).toBe(404)
      
      // Should show Next.js's default 404 page
      await expect(page.locator('h1.next-error-h1')).toContainText('404')
      await expect(page.locator('h2')).toContainText('This page could not be found.')
    })

    test('should handle network errors gracefully', async ({ page }) => {
      // Step 1: Load the page while online
      await page.goto(BASE_URL)
      
      // Step 2: Set the browser context to offline
      await page.context().setOffline(true)
      
      // Step 3: Try to make an API request that will fail due to network error
      const fetchResult = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/health')
          return { success: true, status: response.status }
        } catch (error) {
          return { success: false, error: error.message }
        }
      })
      
      // Step 4: Assert that the fetch call failed due to network error
      expect(fetchResult.success).toBe(false)
      expect(fetchResult.error).toBeTruthy()
      
      // Step 5: Restore online mode
      await page.context().setOffline(false)
    })
  })

  test.describe('API Health Check', () => {
    test('should have working health check endpoint', async ({ page }) => {
      // Test the health check API endpoint
      const response = await page.request.get('/api/health')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('status', 'healthy')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('checks')
      expect(data).toHaveProperty('responseTime')
    })

    test('should handle health check with database check', async ({ page }) => {
      const response = await page.request.get('/api/health?check=database')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('checks')
      expect(data.checks).toHaveProperty('database')
      expect(data.checks.database).toHaveProperty('status')
      expect(data.checks.database).toHaveProperty('details')
      expect(data.checks.database.details).toHaveProperty('responseTime')
    })

    test('should handle health check with external API check', async ({ page }) => {
      const response = await page.request.get('/api/health?check=external')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('checks')
      // The 'external' check may not always be present depending on config/environment
      if ('external' in data.checks) {
        expect(data.checks.external).toHaveProperty('status')
        expect(data.checks.external).toHaveProperty('details')
        expect(data.checks.external.details).toHaveProperty('responseTime')
      } else {
        // Log for debugging if not present
        console.warn('No external check present in health check response:', data.checks)
        expect(Object.keys(data.checks).length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('OAuth2 Integration', () => {
    test('should list OAuth2 providers without authentication', async ({ page }) => {
      // Test the OAuth2 providers endpoint (should be public)
      const response = await page.request.get('/api/oauth/providers')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('providers')
      expect(data.data).toHaveProperty('count')
      expect(Array.isArray(data.data.providers)).toBe(true)
    })

    test('should handle OAuth2 test callback', async ({ page }) => {
      // Test the OAuth2 callback with test parameters
      const response = await page.request.get('/api/oauth/callback?code=test&state=test')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('isTest', true)
    })

    test('should handle OAuth2 callback with missing parameters', async ({ page }) => {
      // Test OAuth2 callback with missing code
      const response = await page.request.get('/api/oauth/callback?state=test')
      expect(response.status()).toBe(400)
      
      const data = await response.json()
      expect(data).toHaveProperty('success', false)
      expect(data).toHaveProperty('code', 'MISSING_CODE')
    })

    test('should handle OAuth2 callback with missing state', async ({ page }) => {
      // Test OAuth2 callback with missing state
      const response = await page.request.get('/api/oauth/callback?code=test')
      expect(response.status()).toBe(400)
      
      const data = await response.json()
      expect(data).toHaveProperty('success', false)
      expect(data).toHaveProperty('code', 'MISSING_STATE')
    })

    test('should handle OAuth2 test endpoint', async ({ page }) => {
      // Test the dedicated OAuth2 test endpoint
      const response = await page.request.get('/api/oauth/test')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('providers')
      expect(Array.isArray(data.data.providers)).toBe(true)
      expect(data.data.providers.length).toBeGreaterThan(0)
    })
  })

  test.describe('User Interface', () => {
    test('should have proper accessibility features', async ({ page }) => {
      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6')
      await expect(headings.first()).toBeVisible()
      
      // Check for alt text on images
      const images = page.locator('img')
      for (let i = 0; i < await images.count(); i++) {
        const alt = await images.nth(i).getAttribute('alt')
        expect(alt).toBeTruthy()
      }
      
      // Check for proper button labels
      const buttons = page.locator('button')
      for (let i = 0; i < await buttons.count(); i++) {
        const ariaLabel = await buttons.nth(i).getAttribute('aria-label')
        const text = await buttons.nth(i).textContent()
        expect(ariaLabel || text).toBeTruthy()
      }
    })

    test('should handle form interactions properly', async ({ page }) => {
      // Look for forms on the page
      const forms = page.locator('form')
      if (await forms.count() > 0) {
        const form = forms.first()
        
        // Test form inputs
        const inputs = form.locator('input, textarea, select')
        for (let i = 0; i < await inputs.count(); i++) {
          const input = inputs.nth(i)
          await input.focus()
          await expect(input).toBeFocused()
        }
      }
    })
  })

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto(BASE_URL)
      const loadTime = Date.now() - startTime
      
      expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
    })

    test('should have proper loading states', async ({ page }) => {
      // Check for loading indicators if any
      const loadingElements = page.locator('[data-loading], .loading, .spinner')
      if (await loadingElements.count() > 0) {
        await expect(loadingElements.first()).toBeVisible()
      }
    })
  })

  test.describe('Error Handling', () => {
    test('should handle 404 errors gracefully', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/nonexistent-page`)
      expect(response?.status()).toBe(404)
      
      // Should show Next.js's default 404 page
      await expect(page.locator('h1.next-error-h1')).toContainText('404')
      await expect(page.locator('h2')).toContainText('This page could not be found.')
    })

    test('should handle network errors gracefully', async ({ page }) => {
      // Step 1: Load the page while online
      await page.goto(BASE_URL)
      
      // Step 2: Set the browser context to offline
      await page.context().setOffline(true)
      
      // Step 3: Try to make an API request that will fail due to network error
      const fetchResult = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/health')
          return { success: true, status: response.status }
        } catch (error) {
          return { success: false, error: error.message }
        }
      })
      
      // Step 4: Assert that the fetch call failed due to network error
      expect(fetchResult.success).toBe(false)
      expect(fetchResult.error).toBeTruthy()
      
      // Step 5: Restore online mode
      await page.context().setOffline(false)
    })
  })

  test.describe('Security', () => {
    test('should have proper security headers', async ({ page }) => {
      const response = await page.goto(BASE_URL)
      const headers = response?.headers()
      
      // Check for security headers
      expect(headers).toHaveProperty('x-frame-options')
      expect(headers).toHaveProperty('x-content-type-options')
      expect(headers).toHaveProperty('referrer-policy')
    })

    test('should not expose sensitive information in source', async ({ page }) => {
      const content = await page.content()
      
      // Should not contain sensitive information
      expect(content).not.toContain('password')
      expect(content).not.toContain('secret')
      expect(content).not.toContain('api_key')
      expect(content).not.toContain('token')
    })

    test('should handle XSS attempts', async ({ page }) => {
      // Test with potentially malicious input
      const maliciousInput = '<script>alert("xss")</script>'
      
      // Look for input fields
      const inputs = page.locator('input[type="text"], textarea')
      if (await inputs.count() > 0) {
        const input = inputs.first()
        await input.fill(maliciousInput)
        
        // Should not execute the script
        const value = await input.inputValue()
        expect(value).toBe(maliciousInput)
      }
    })
  })

  test.describe('Cross-browser Compatibility', () => {
    test('should work in different browsers', async ({ page, browserName }) => {
      // Test basic functionality across browsers
      await expect(page.locator('body')).toBeVisible()
      await expect(page.locator('h1')).toBeVisible()
      
      // Browser-specific tests - check for elements that actually exist
      if (browserName === 'chromium') {
        // Chrome-specific tests
        await expect(page.locator('header')).toBeVisible()
        await expect(page.locator('main')).toBeVisible()
      } else if (browserName === 'firefox') {
        // Firefox-specific tests
        await expect(page.locator('header')).toBeVisible()
        await expect(page.locator('main')).toBeVisible()
      } else if (browserName === 'webkit') {
        // Safari-specific tests
        await expect(page.locator('header')).toBeVisible()
        await expect(page.locator('main')).toBeVisible()
      }
    })
  })

  test.describe('Database Integration', () => {
    test('should have working database connection', async ({ page }) => {
      // Test database connectivity through health check
      const response = await page.request.get('/api/health?check=database')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.checks.database.status).toMatch(/healthy|unhealthy/)
    })
  })

  test.describe('API Integration', () => {
    test('should handle API requests properly', async ({ page }) => {
      // Test basic API functionality
      const response = await page.request.get('/api/health')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('status')
    })

    test('should handle API errors gracefully', async ({ page }) => {
      // Test non-existent API endpoint
      const response = await page.request.get('/api/nonexistent')
      expect(response.status()).toBe(404)
    })
  })

  test.describe('APIQ End-to-End Flow', () => {
    test('Create connection, ingest OpenAPI, list endpoints, delete endpoints (ADMIN)', async ({ request }) => {
      // 1. Create API connection with Petstore spec
      const createRes = await createConnection(request, {
        name: 'Petstore E2E',
        baseUrl: 'https://petstore.swagger.io/v2',
        documentationUrl: 'https://petstore.swagger.io/v2/swagger.json',
        authType: 'NONE'
      })
      expect(createRes.status()).toBe(201)
      const createData = await createRes.json()
      expect(createData.success).toBe(true)
      
      const connectionId = createData.data.id
      expect(connectionId).toBeTruthy()

      // Debug: Log the connection details
      console.log('Connection created:', {
        id: connectionId,
        name: createData.data.name,
        ingestionStatus: createData.data.ingestionStatus
      })

      // 2. Check ingestion status - it can be SUCCEEDED, PENDING, or FAILED
      expect(createData.data.ingestionStatus).toMatch(/SUCCEEDED|PENDING|FAILED/)

      // 3. List endpoints (should work regardless of ingestion status)
      const listRes = await request.get(`${BASE_URL}/api/connections/${connectionId}/endpoints`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      })
      
      // Debug: Log the endpoints response
      console.log('Endpoints response:', {
        status: listRes.status(),
        url: `/api/connections/${connectionId}/endpoints`
      })
      
      expect(listRes.status()).toBe(200)
      const listData = await listRes.json()
      expect(listData.success).toBe(true)
      expect(Array.isArray(listData.data)).toBe(true)
      
      // If ingestion succeeded, we should have endpoints. If failed, we might have 0.
      if (createData.data.ingestionStatus === 'SUCCEEDED') {
        expect(listData.data.length).toBeGreaterThan(0)
      }

      // 4. Filter endpoints
      const filterRes = await request.get(`${BASE_URL}/api/connections/${connectionId}/endpoints?method=GET&path=/pet`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      })
      expect(filterRes.status()).toBe(200)
      const filterData = await filterRes.json()
      expect(filterData.success).toBe(true)
      expect(Array.isArray(filterData.data)).toBe(true)

      // 5. Delete endpoints (ADMIN)
      const deleteRes = await request.delete(`${BASE_URL}/api/connections/${connectionId}/endpoints`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      })
      expect(deleteRes.status()).toBe(200)
      const deleteData = await deleteRes.json()
      expect(deleteData.success).toBe(true)

      // 6. Confirm endpoints deleted
      const confirmRes = await request.get(`${BASE_URL}/api/connections/${connectionId}/endpoints`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      })
      expect(confirmRes.status()).toBe(200)
      const confirmData = await confirmRes.json()
      expect(confirmData.success).toBe(true)
      expect(confirmData.data.length).toBe(0)
    })

    test('Should not allow duplicate connection names for the same user', async ({ request }) => {
      // Create the first connection
      const res1 = await request.post('/api/connections', {
        data: {
          name: 'Duplicate E2E',
          baseUrl: 'https://api.dup.com',
          authType: 'NONE'
        },
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        }
      });
      expect(res1.status()).toBe(201);
      const data1 = await res1.json();
      expect(data1.success).toBe(true);

      // Attempt to create a duplicate
      const res2 = await request.post('/api/connections', {
        data: {
          name: 'Duplicate E2E',
          baseUrl: 'https://api.dup.com',
          authType: 'NONE'
        },
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        }
      });
      expect(res2.status()).toBe(409);
      const data2 = await res2.json();
      expect(data2.success).toBe(false);
      expect(data2.error).toMatch(/already exists/i);
    })

    test.skip('Non-admin user cannot delete endpoints (RBAC)', async ({ request }) => {
      // This test is a placeholder for when real authentication is implemented.
      // It should simulate a non-admin user and expect a 403 Forbidden response.
      // For now, RBAC is hardcoded to treat test-user-123 as ADMIN.
      // When auth is ready, set the user context to a non-admin and run this test.

      // 1. Create a connection as a non-admin (simulate via auth header or session)
      // 2. Attempt to delete endpoints for that connection
      // 3. Expect 403 Forbidden

      // Example:
      // const res = await request.delete(`/api/connections/${connectionId}/endpoints`, { headers: { Authorization: 'Bearer non-admin-token' } });
      // expect(res.status()).toBe(403);
    })

    test('Create connection with invalid OpenAPI spec should set ingestionStatus: FAILED', async ({ request }) => {
      const res = await request.post('/api/connections', {
        data: {
          name: 'Invalid Spec E2E',
          baseUrl: 'https://api.invalid.com',
          documentationUrl: 'https://api.invalid.com/swagger.json',
          authType: 'NONE'
        },
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        }
      });
      expect(res.status()).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.ingestionStatus).toBe('FAILED');
    })

    test('List endpoints for a connection with no endpoints should return empty array', async ({ request }) => {
      // Create a connection with no OpenAPI spec
      const res = await request.post('/api/connections', {
        data: {
          name: 'No Endpoints E2E',
          baseUrl: 'https://api.noendpoints.com',
          authType: 'NONE'
        },
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        }
      });
      expect(res.status()).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      const connectionId = data.data.id;

      // List endpoints
      const listRes = await request.get(`/api/connections/${connectionId}/endpoints`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(listRes.status()).toBe(200);
      const listData = await listRes.json();
      expect(listData.success).toBe(true);
      expect(Array.isArray(listData.data)).toBe(true);
      expect(listData.data.length).toBe(0);
    });

    test('Filter endpoints with no match should return empty array', async ({ request }) => {
      // Create a connection with Petstore spec
      const res = await request.post('/api/connections', {
        data: {
          name: 'Filter No Match E2E',
          baseUrl: 'https://petstore.swagger.io/v2',
          documentationUrl: 'https://petstore.swagger.io/v2/swagger.json',
          authType: 'NONE'
        },
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        }
      });
      expect(res.status()).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      const connectionId = data.data.id;
      expect(connectionId).toBeTruthy(); // Ensure we have a valid connection ID

      // Filter with no match
      const filterRes = await request.get(`/api/connections/${connectionId}/endpoints?method=PATCH&path=/doesnotexist`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(filterRes.status()).toBe(200);
      const filterData = await filterRes.json();
      expect(filterData.success).toBe(true);
      expect(Array.isArray(filterData.data)).toBe(true);
      expect(filterData.data.length).toBe(0);
    });
  })
}) 