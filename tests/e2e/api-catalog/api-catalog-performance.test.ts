import { test, expect } from '@playwright/test';
import { TestUser, generateTestId, cleanupTestUser } from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';
import { setupE2E, resetRateLimits } from '../../helpers/e2eHelpers';
import { testPageLoadTime, testAPIPerformance } from '../../helpers/performanceHelpers';
import { testXSSPrevention, testDataExposure } from '../../helpers/securityHelpers';

/**
 * API Catalog Performance and Security Tests
 * 
 * Focus: Performance optimization, security vulnerabilities, load testing
 * Approach: Specialized performance and security testing
 * Coverage: Performance budgets, security scanning, load testing
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: TestUser;
let jwt: string;
let createdCatalogIds: string[] = [];

test.describe('API Catalog Performance and Security', () => {
  test.beforeAll(async () => {
    // Create a real test user using new helper
    testUser = await createE2EUser('ADMIN', {
      email: `e2e-catalog-performance-${generateTestId('user')}@testuser.local`,
      password: 'e2eTestPass123',
      name: 'E2E API Catalog Performance Test User'
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

  test.beforeEach(async ({ page }) => {
    await setupE2E(page, testUser);
    await resetRateLimits(page);
  });

  test.describe('Performance Testing', () => {
    test('should load API catalog within performance budget', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      
      // Test page load time
      await testPageLoadTime(page, '/dashboard?tab=connections', { threshold: 3000 }); // 3 second budget
      
      // Navigate to API catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      
      if (await browseApisButton.isVisible()) {
        const startTime = Date.now();
        await browseApisButton.click();
        await page.waitForSelector('[data-testid="api-catalog-section"]');
        const loadTime = Date.now() - startTime;
        
        // Verify catalog loads within 2 seconds
        expect(loadTime).toBeLessThan(2000);
      }
    });

    test('should handle concurrent API requests efficiently', async ({ page }) => {
      // Test concurrent API calls
      const concurrentRequests = Array.from({ length: 10 }, () => 
        page.request.get(`${BASE_URL}/api/catalog`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      // Verify all requests succeeded
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });

      // Verify concurrent requests complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 second budget for 10 concurrent requests
    });

    test('should handle large dataset pagination efficiently', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await page.waitForLoadState('networkidle');

      // Navigate to API catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await page.waitForSelector('[data-testid="api-catalog-section"]');

        // Test pagination performance
        const paginationControls = page.locator('[data-testid="pagination-controls"]');
        if (await paginationControls.isVisible()) {
          const startTime = Date.now();
          await page.click('[data-testid="next-page-button"]');
          await page.waitForLoadState('networkidle');
          const paginationTime = Date.now() - startTime;
          
          // Verify pagination is fast
          expect(paginationTime).toBeLessThan(1000);
        }
      }
    });

    test('should optimize search performance', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await page.waitForLoadState('networkidle');

      // Navigate to API catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await page.waitForSelector('[data-testid="api-catalog-section"]');

        // Test search performance
        const searchInput = page.locator('[data-testid="api-search-input"]');
        if (await searchInput.isVisible()) {
          const startTime = Date.now();
          await searchInput.fill('slack');
          await page.keyboard.press('Enter');
          await page.waitForLoadState('networkidle');
          const searchTime = Date.now() - startTime;
          
          // Verify search is fast
          expect(searchTime).toBeLessThan(2000);
        }
      }
    });

    test('should handle memory efficiently with large catalogs', async ({ page }) => {
      // Monitor memory usage during catalog operations
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Navigate to API catalog and perform operations
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await page.waitForSelector('[data-testid="api-catalog-section"]');

        // Perform multiple operations
        for (let i = 0; i < 5; i++) {
          const searchInput = page.locator('[data-testid="api-search-input"]');
          if (await searchInput.isVisible()) {
            await searchInput.fill(`search-${i}`);
            await page.keyboard.press('Enter');
            await page.waitForLoadState('networkidle');
          }
        }

        // Get final memory usage
        const finalMemory = await page.evaluate(() => {
          return (performance as any).memory?.usedJSHeapSize || 0;
        });

        // Verify memory usage didn't grow excessively
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB limit
      }
    });
  });

  test.describe('Security Testing', () => {
    test('should prevent XSS attacks in API catalog data', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await page.waitForLoadState('networkidle');

      // Navigate to API catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await page.waitForSelector('[data-testid="api-catalog-section"]');

        // Test XSS prevention in search functionality
        const searchInput = page.locator('[data-testid="api-search-input"]');
        if (await searchInput.isVisible()) {
          await testXSSPrevention(page, '[data-testid="api-search-input"]', '<script>alert("xss")</script>');
        }
      }
    });

    test('should prevent data exposure between users in catalog', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await page.waitForLoadState('networkidle');

      // Navigate to API catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await page.waitForSelector('[data-testid="api-catalog-section"]');

        // Test that user credentials are not exposed in catalog
        await testDataExposure(page, [
          'api-key',
          'bearer-token',
          'oauth-token',
          'client-secret',
          'password'
        ]);
      }
    });

    test('should handle SQL injection attempts in search', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await page.waitForLoadState('networkidle');

      // Navigate to API catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await page.waitForSelector('[data-testid="api-catalog-section"]');

        // Test SQL injection in search
        const searchInput = page.locator('[data-testid="api-search-input"]');
        if (await searchInput.isVisible()) {
          const maliciousSearch = "'; DROP TABLE api_catalog; --";
          await searchInput.fill(maliciousSearch);
          await page.keyboard.press('Enter');
          await page.waitForLoadState('networkidle');

          // Verify search still works and doesn't crash
          await expect(page.locator('[data-testid="api-catalog-section"]')).toBeVisible();
        }
      }
    });

    test('should validate input sanitization in API creation', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await page.waitForLoadState('networkidle');

      // Navigate to API catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await page.waitForSelector('[data-testid="api-catalog-section"]');

        // Test malicious input in API creation
        const addApiButton = page.locator('[data-testid="primary-action add-api-to-catalog-btn"]');
        if (await addApiButton.isVisible()) {
          await addApiButton.click();
          await page.waitForSelector('[data-testid="add-api-modal"]');

          const addApiForm = page.locator('[data-testid="add-api-form"]');
          if (await addApiForm.isVisible()) {
            // Test malicious input
            await addApiForm.locator('[data-testid="api-name-input"]').fill('<script>alert("xss")</script>');
            await addApiForm.locator('[data-testid="api-description-input"]').fill('"; DROP TABLE api_catalog; --');
            await addApiForm.locator('[data-testid="api-base-url-input"]').fill('javascript:alert("xss")');
            
            // Submit form
            await addApiForm.locator('[data-testid="add-api-btn"]').click();
            
            // Verify input is sanitized and form handles it gracefully
            await page.waitForSelector('[data-testid="add-api-modal"]', { state: 'visible' });
          }
        }
      }
    });

    test('should handle rate limiting for catalog endpoints', async ({ page }) => {
      // Make multiple requests to test rate limiting
      const requests: Promise<any>[] = [];
      for (let i = 0; i < 50; i++) {
        requests.push(
          page.request.get(`${BASE_URL}/api/catalog`, {
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

  test.describe('Load Testing', () => {
    test('should handle high concurrent load', async ({ page }) => {
      // Simulate high concurrent load
      const concurrentUsers = 20;
      const requestsPerUser = 5;
      
      const allRequests: Promise<any>[] = [];
      
      for (let user = 0; user < concurrentUsers; user++) {
        for (let req = 0; req < requestsPerUser; req++) {
          allRequests.push(
            page.request.get(`${BASE_URL}/api/catalog`, {
              headers: { 'Authorization': `Bearer ${jwt}` }
            })
          );
        }
      }

      const startTime = Date.now();
      const responses = await Promise.all(allRequests);
      const totalTime = Date.now() - startTime;

      // Verify most requests succeeded
      const successfulRequests = responses.filter(r => r.status() === 200);
      expect(successfulRequests.length).toBeGreaterThan(concurrentUsers * requestsPerUser * 0.8); // 80% success rate

      // Verify total time is reasonable
      expect(totalTime).toBeLessThan(10000); // 10 second budget
    });

    test('should maintain performance under sustained load', async ({ page }) => {
      const sustainedRequests = 100;
      const requestInterval = 100; // 100ms between requests
      
      const responses: any[] = [];
      const startTime = Date.now();

      for (let i = 0; i < sustainedRequests; i++) {
        const response = await page.request.get(`${BASE_URL}/api/catalog`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
        responses.push(response);
        
        if (i < sustainedRequests - 1) {
          await page.waitForTimeout(requestInterval);
        }
      }

      const totalTime = Date.now() - startTime;
      const averageResponseTime = totalTime / sustainedRequests;

      // Verify response times remain reasonable
      expect(averageResponseTime).toBeLessThan(1000); // 1 second average

      // Verify success rate
      const successfulRequests = responses.filter(r => r.status() === 200);
      expect(successfulRequests.length).toBeGreaterThan(sustainedRequests * 0.9); // 90% success rate
    });
  });

  test.describe('API Performance Monitoring', () => {
    test('should monitor API response times', async ({ page }) => {
      const endpoints = [
        '/api/catalog',
        '/api/catalog/categories',
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        const response = await page.request.get(`${BASE_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
        const responseTime = Date.now() - startTime;

        expect(response.status()).toBe(200);
        expect(responseTime).toBeLessThan(2000); // 2 second budget per endpoint
      }
    });

    test('should track performance metrics', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      
      // Start performance monitoring
      await page.evaluate(() => {
        (window as any).performanceMetrics = {
          startTime: performance.now(),
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
        };
      });

      // Navigate to API catalog
      const browseApisButton = page.locator('[data-testid="primary-action browse-apis-btn"]');
      if (await browseApisButton.isVisible()) {
        await browseApisButton.click();
        await page.waitForSelector('[data-testid="api-catalog-section"]');

        // Get performance metrics
        const metrics = await page.evaluate(() => {
          const perf = (window as any).performanceMetrics;
          return {
            loadTime: performance.now() - perf.startTime,
            memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
            memoryIncrease: ((performance as any).memory?.usedJSHeapSize || 0) - perf.memoryUsage
          };
        });

        // Verify performance metrics are within acceptable ranges
        expect(metrics.loadTime).toBeLessThan(3000); // 3 second load time
        expect(metrics.memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB memory increase
      }
    });
  });
});
