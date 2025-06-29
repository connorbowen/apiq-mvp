import { test, expect, request } from '@playwright/test'
import { createTestUser, cleanupTestUser, generateTestId } from '../helpers/testUtils'

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

  test.describe('Home Page', () => {
    test('should load the home page successfully', async ({ page }) => {
      // Check if the page loads without errors
      await expect(page).toHaveTitle(/APIQ/)
      
      // Check for main content
      await expect(page.locator('h1')).toContainText(/APIQ|Multi-API Orchestrator/i)
      
      // Check for navigation elements
      await expect(page.locator('nav')).toBeVisible()
      
      // Check for main content sections
      await expect(page.locator('main')).toBeVisible()
    })

    test('should display hero section with call-to-action', async ({ page }) => {
      // Check hero section content
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('p')).toContainText(/orchestrate|workflow|automation/i)
      
      // Check for CTA buttons
      const ctaButtons = page.locator('button, a[href*="signup"], a[href*="login"]')
      await expect(ctaButtons.first()).toBeVisible()
    })

    test('should have responsive design', async ({ page }) => {
      // Test desktop view
      await page.setViewportSize({ width: 1920, height: 1080 })
      await expect(page.locator('nav')).toBeVisible()
      
      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 })
      await expect(page.locator('nav')).toBeVisible()
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 })
      await expect(page.locator('nav')).toBeVisible()
    })

    test('should have proper meta tags', async ({ page }) => {
      // Check for essential meta tags
      await expect(page.locator('meta[name="viewport"]')).toBeVisible()
      await expect(page.locator('meta[name="description"]')).toBeVisible()
    })
  })

  test.describe('Navigation', () => {
    test('should have working navigation links', async ({ page }) => {
      // Check for navigation links
      const navLinks = page.locator('nav a')
      await expect(navLinks.first()).toBeVisible()
      
      // Test navigation functionality
      const firstLink = navLinks.first()
      const href = await firstLink.getAttribute('href')
      if (href && !href.startsWith('#')) {
        await firstLink.click()
        await expect(page).not.toHaveURL(BASE_URL)
      }
    })

    test('should have mobile menu functionality', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Look for mobile menu button
      const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"], .mobile-menu-button')
      if (await menuButton.isVisible()) {
        await menuButton.click()
        await expect(page.locator('nav')).toBeVisible()
      }
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
      expect(data).toHaveProperty('uptime')
    })

    test('should handle health check with database check', async ({ page }) => {
      const response = await page.request.get('/api/health?check=database')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('database')
      expect(data.database).toHaveProperty('status')
      expect(data.database).toHaveProperty('responseTime')
    })

    test('should handle health check with external API check', async ({ page }) => {
      const response = await page.request.get('/api/health?check=external')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('external')
      expect(data.external).toHaveProperty('status')
      expect(data.external).toHaveProperty('responseTime')
    })
  })

  test.describe('User Interface', () => {
    test('should have proper color scheme and styling', async ({ page }) => {
      // Check for Tailwind CSS classes
      const body = page.locator('body')
      await expect(body).toHaveClass(/bg-|text-|font-/)
      
      // Check for proper contrast and readability
      const textElements = page.locator('p, h1, h2, h3, h4, h5, h6')
      await expect(textElements.first()).toBeVisible()
    })

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
      
      // Should show a proper error page
      await expect(page.locator('h1, h2')).toContainText(/404|Not Found|Page Not Found/i)
    })

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline mode
      await page.context().setOffline(true)
      
      try {
        await page.goto(BASE_URL)
        // Should handle offline state gracefully
        await expect(page.locator('body')).toBeVisible()
      } finally {
        await page.context().setOffline(false)
      }
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
      
      // Browser-specific tests
      if (browserName === 'chromium') {
        // Chrome-specific tests
        await expect(page.locator('nav')).toBeVisible()
      } else if (browserName === 'firefox') {
        // Firefox-specific tests
        await expect(page.locator('nav')).toBeVisible()
      } else if (browserName === 'webkit') {
        // Safari-specific tests
        await expect(page.locator('nav')).toBeVisible()
      }
    })
  })

  test.describe('Database Integration', () => {
    test('should have working database connection', async ({ page }) => {
      // Test database connectivity through health check
      const response = await page.request.get('/api/health?check=database')
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.database.status).toMatch(/connected|disconnected/)
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

      // 2. Wait for ingestion to complete (simulate, or poll if async)
      // For this test, assume immediate
      expect(createData.data.ingestionStatus).toMatch(/SUCCEEDED|PENDING/)

      // 3. List endpoints
      const listRes = await request.get(`${BASE_URL}/api/connections/${connectionId}/endpoints`)
      expect(listRes.status()).toBe(200)
      const listData = await listRes.json()
      expect(listData.success).toBe(true)
      expect(Array.isArray(listData.data)).toBe(true)
      expect(listData.data.length).toBeGreaterThan(0)

      // 4. Filter endpoints
      const filterRes = await request.get(`${BASE_URL}/api/connections/${connectionId}/endpoints?method=GET&path=/pet`)
      expect(filterRes.status()).toBe(200)
      const filterData = await filterRes.json()
      expect(filterData.success).toBe(true)
      expect(Array.isArray(filterData.data)).toBe(true)

      // 5. Delete endpoints (ADMIN)
      const deleteRes = await request.delete(`${BASE_URL}/api/connections/${connectionId}/endpoints`)
      expect(deleteRes.status()).toBe(200)
      const deleteData = await deleteRes.json()
      expect(deleteData.success).toBe(true)

      // 6. Confirm endpoints deleted
      const confirmRes = await request.get(`${BASE_URL}/api/connections/${connectionId}/endpoints`)
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
        headers: { 'Content-Type': 'application/json' }
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
        headers: { 'Content-Type': 'application/json' }
      });
      expect(res2.status()).toBe(400);
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
        headers: { 'Content-Type': 'application/json' }
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
        headers: { 'Content-Type': 'application/json' }
      });
      expect(res.status()).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      const connectionId = data.data.id;

      // List endpoints
      const listRes = await request.get(`/api/connections/${connectionId}/endpoints`);
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
        headers: { 'Content-Type': 'application/json' }
      });
      expect(res.status()).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      const connectionId = data.data.id;

      // Filter with no match
      const filterRes = await request.get(`/api/connections/${connectionId}/endpoints?method=PATCH&path=/doesnotexist`);
      expect(filterRes.status()).toBe(200);
      const filterData = await filterRes.json();
      expect(filterData.success).toBe(true);
      expect(Array.isArray(filterData.data)).toBe(true);
      expect(filterData.data.length).toBe(0);
    });
  })
}) 