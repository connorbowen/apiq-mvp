import { test, expect } from '@playwright/test';
import { UXComplianceHelper } from '../../helpers/uxCompliance';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Performance & Load Testing E2E Tests - P2 Medium Priority', () => {
  let uxHelper: UXComplianceHelper;

  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
    
    // Login for authenticated tests
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Email address').fill('e2e-test@example.com');
    await page.getByLabel('Password').fill('e2eTestPass123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Wait for dashboard to load
    await Promise.all([
      page.waitForURL(/.*dashboard/),
      page.waitForSelector('h1:has-text("Dashboard")')
    ]);
  });

  test.describe('Page Load Performance', () => {
    test('should load dashboard within 2 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // Should load in under 2 seconds
      expect(loadTime).toBeLessThan(2000);
      
      // Verify page is fully functional
      await expect(page.getByText('Dashboard')).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Workflows' })).toBeVisible();
    });

    test('should load workflows page within 1 second', async ({ page }) => {
      const startTime = Date.now();
      
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.waitForLoadState('networkidle');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // Should load in under 1 second
      expect(loadTime).toBeLessThan(1000);
      
      // Verify workflows page is functional
      await expect(page.getByText('Workflows')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Workflow' })).toBeVisible();
    });

    test('should load connections page within 1 second', async ({ page }) => {
      const startTime = Date.now();
      
      await page.getByRole('tab', { name: 'Connections' }).click();
      await page.waitForLoadState('networkidle');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // Should load in under 1 second
      expect(loadTime).toBeLessThan(1000);
      
      // Verify connections page is functional
      await expect(page.getByText('Connections')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add Connection' })).toBeVisible();
    });

    test('should handle large workflow lists efficiently', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Mock large workflow list (100+ workflows)
      await page.route('**/api/workflows', route => {
        const workflows = Array.from({ length: 100 }, (_, i) => ({
          id: `workflow-${i}`,
          name: `Test Workflow ${i}`,
          description: `Workflow description ${i}`,
          status: 'active',
          createdAt: new Date().toISOString()
        }));
        
        route.fulfill({
          status: 200,
          body: JSON.stringify({ workflows, total: 100 })
        });
      });
      
      const startTime = Date.now();
      
      // Refresh page to load large list
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // Should handle large lists efficiently (under 2 seconds)
      expect(loadTime).toBeLessThan(2000);
      
      // Verify pagination is working
      await expect(page.getByText('Showing 1-20 of 100 workflows')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
    });
  });

  test.describe('API Response Performance', () => {
    test('should handle workflow generation within 5 seconds', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      const startTime = Date.now();
      
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send notification for new orders');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 10000 });
      
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      
      // Should generate workflow in under 5 seconds
      expect(generationTime).toBeLessThan(5000);
      
      // Verify workflow was generated correctly
      await expect(page.getByText('Order Notification Workflow')).toBeVisible();
    });

    test('should handle concurrent API requests efficiently', async ({ page }) => {
      // Test concurrent workflow generations
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        const newPage = await page.context().newPage();
        promises.push(
          (async () => {
            await newPage.goto(`${BASE_URL}/dashboard`);
            await newPage.getByRole('tab', { name: 'Workflows' }).click();
            await newPage.getByRole('button', { name: 'Create Workflow' }).click();
            
            const chatInput = newPage.getByPlaceholder('Describe your workflow in natural language...');
            await chatInput.fill(`Concurrent workflow ${i}`);
            await newPage.getByRole('button', { name: 'Generate Workflow' }).click();
            
            await newPage.waitForSelector('[data-testid="workflow-preview"]', { timeout: 15000 });
            await newPage.close();
          })()
        );
      }
      
      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should handle 5 concurrent requests efficiently
      expect(totalTime).toBeLessThan(20000); // Under 20 seconds total
    });

    test('should handle API rate limiting gracefully', async ({ page }) => {
      // Mock rate limiting response
      await page.route('**/api/workflows/generate', route => {
        route.fulfill({
          status: 429,
          body: JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfter: 60
          })
        });
      });
      
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Test rate limiting');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      // Should show rate limit error gracefully
      await uxHelper.validateErrorContainer('Rate limit exceeded');
      await expect(page.getByText('Please try again in 60 seconds')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    });
  });

  test.describe('Database Performance', () => {
    test('should handle large dataset queries efficiently', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Mock large dataset query
      await page.route('**/api/workflows**', route => {
        const workflows = Array.from({ length: 1000 }, (_, i) => ({
          id: `workflow-${i}`,
          name: `Large Dataset Workflow ${i}`,
          description: `Workflow ${i} description`,
          status: 'active',
          createdAt: new Date().toISOString(),
          executions: Math.floor(Math.random() * 100)
        }));
        
        route.fulfill({
          status: 200,
          body: JSON.stringify({ workflows, total: 1000 })
        });
      });
      
      const startTime = Date.now();
      
      // Load large dataset
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // Should handle large datasets efficiently (under 3 seconds)
      expect(loadTime).toBeLessThan(3000);
      
      // Verify pagination and search work
      await expect(page.getByText('Showing 1-20 of 1000 workflows')).toBeVisible();
      
      // Test search functionality
      await page.getByPlaceholder('Search workflows...').fill('Workflow 500');
      await page.waitForTimeout(500); // Debounce
      await expect(page.getByText('Large Dataset Workflow 500')).toBeVisible();
    });

    test('should handle complex database queries efficiently', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Mock complex query with filters and sorting
      await page.route('**/api/workflows**', route => {
        const url = new URL(route.request().url());
        const status = url.searchParams.get('status');
        const sortBy = url.searchParams.get('sortBy');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        
        // Simulate complex query processing
        const workflows = Array.from({ length: limit }, (_, i) => ({
          id: `workflow-${i}`,
          name: `Complex Query Workflow ${i}`,
          status: status || 'active',
          createdAt: new Date().toISOString(),
          executions: Math.floor(Math.random() * 1000),
          successRate: Math.random() * 100
        }));
        
        // Simulate sorting
        if (sortBy === 'executions') {
          workflows.sort((a, b) => b.executions - a.executions);
        }
        
        route.fulfill({
          status: 200,
          body: JSON.stringify({ workflows, total: 1000 })
        });
      });
      
      const startTime = Date.now();
      
      // Apply complex filters
      await page.getByRole('button', { name: 'Filter' }).click();
      await page.getByLabel('Status').selectOption('active');
      await page.getByLabel('Sort by').selectOption('executions');
      await page.getByRole('button', { name: 'Apply Filters' }).click();
      
      await page.waitForLoadState('networkidle');
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      // Should handle complex queries efficiently (under 2 seconds)
      expect(queryTime).toBeLessThan(2000);
      
      // Verify results are correct
      await expect(page.getByText('Complex Query Workflow 0')).toBeVisible();
    });
  });

  test.describe('Memory and Resource Management', () => {
    test('should handle memory usage efficiently during long sessions', async ({ page }) => {
      // Simulate long user session with multiple operations
      const operations = [
        () => page.getByRole('tab', { name: 'Workflows' }).click(),
        () => page.getByRole('tab', { name: 'Connections' }).click(),
        () => page.getByRole('tab', { name: 'Secrets' }).click(),
        () => page.getByRole('tab', { name: 'Overview' }).click(),
      ];
      
      const startTime = Date.now();
      
      // Perform 50 operations to simulate long session
      for (let i = 0; i < 50; i++) {
        const operation = operations[i % operations.length];
        await operation();
        await page.waitForTimeout(100); // Small delay between operations
      }
      
      const endTime = Date.now();
      const sessionTime = endTime - startTime;
      
      // Should maintain performance throughout session
      expect(sessionTime).toBeLessThan(10000); // Under 10 seconds for 50 operations
      
      // Verify UI is still responsive
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await expect(page.getByText('Workflows')).toBeVisible();
    });

    test('should handle large file uploads efficiently', async ({ page }) => {
      await page.getByRole('tab', { name: 'Connections' }).click();
      await page.getByRole('button', { name: 'Add Connection' }).click();
      
      // Test large OpenAPI file upload
      const largeOpenApiContent = {
        openapi: '3.0.0',
        info: { title: 'Large API', version: '1.0.0' },
        paths: {}
      };
      
      // Generate large API spec (1000+ endpoints)
      for (let i = 0; i < 1000; i++) {
        largeOpenApiContent.paths[`/endpoint-${i}`] = {
          get: {
            summary: `Endpoint ${i}`,
            responses: { '200': { description: 'Success' } }
          }
        };
      }
      
      const startTime = Date.now();
      
      // Upload large file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'large-api.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(largeOpenApiContent))
      });
      
      await page.waitForSelector('[data-testid="upload-complete"]', { timeout: 30000 });
      
      const endTime = Date.now();
      const uploadTime = endTime - startTime;
      
      // Should handle large uploads efficiently (under 30 seconds)
      expect(uploadTime).toBeLessThan(30000);
      
      // Verify upload was successful
      await expect(page.getByText('Large API')).toBeVisible();
      await expect(page.getByText('1000 endpoints imported')).toBeVisible();
    });
  });

  test.describe('Concurrent User Load', () => {
    test('should handle multiple concurrent users', async ({ page }) => {
      const userCount = 10;
      const pages = [];
      
      // Create multiple browser pages to simulate concurrent users
      for (let i = 0; i < userCount; i++) {
        const newPage = await page.context().newPage();
        pages.push(newPage);
      }
      
      const startTime = Date.now();
      
      // Simulate concurrent user actions
      const promises = pages.map(async (userPage, index) => {
        await userPage.goto(`${BASE_URL}/login`);
        await userPage.getByLabel('Email address').fill(`user${index}@example.com`);
        await userPage.getByLabel('Password').fill('password123');
        await userPage.getByRole('button', { name: 'Sign in' }).click();
        
        await userPage.waitForURL(/.*dashboard/);
        await userPage.getByRole('tab', { name: 'Workflows' }).click();
        await userPage.waitForLoadState('networkidle');
        
        return userPage;
      });
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const concurrentTime = endTime - startTime;
      
      // Should handle 10 concurrent users efficiently (under 15 seconds)
      expect(concurrentTime).toBeLessThan(15000);
      
      // Verify all users can access the system
      for (const userPage of pages) {
        await expect(userPage.getByText('Workflows')).toBeVisible();
        await userPage.close();
      }
    });

    test('should maintain performance under sustained load', async ({ page }) => {
      const loadDuration = 30000; // 30 seconds
      const startTime = Date.now();
      
      // Simulate sustained load with periodic requests
      const loadTest = setInterval(async () => {
        await page.reload();
        await page.waitForLoadState('networkidle');
      }, 2000); // Reload every 2 seconds
      
      // Let the load test run for the specified duration
      await page.waitForTimeout(loadDuration);
      clearInterval(loadTest);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should maintain performance throughout sustained load
      expect(totalTime).toBeGreaterThanOrEqual(loadDuration);
      
      // Verify system is still responsive
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await expect(page.getByText('Workflows')).toBeVisible();
    });
  });

  test.describe('Error Recovery Performance', () => {
    test('should recover quickly from temporary failures', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Mock temporary API failure
      let failureCount = 0;
      await page.route('**/api/workflows', route => {
        failureCount++;
        if (failureCount <= 2) {
          route.fulfill({ status: 500, body: 'Internal Server Error' });
        } else {
          route.continue();
        }
      });
      
      const startTime = Date.now();
      
      // Trigger retry mechanism
      await page.reload();
      
      // Wait for successful recovery
      await page.waitForSelector('[data-testid="workflow-list"]', { timeout: 10000 });
      
      const endTime = Date.now();
      const recoveryTime = endTime - startTime;
      
      // Should recover within 10 seconds
      expect(recoveryTime).toBeLessThan(10000);
      
      // Verify system is working after recovery
      await expect(page.getByText('Workflows')).toBeVisible();
    });

    test('should handle network interruptions gracefully', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Simulate network interruption
      await page.route('**/*', route => {
        route.abort();
      });
      
      // Try to perform actions during network interruption
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      // Should show offline indicator quickly
      await expect(page.getByText('Network connection lost')).toBeVisible();
      
      // Restore network
      await page.unroute('**/*');
      
      // Should recover quickly when network is restored
      await page.waitForSelector('[data-testid="workflow-create-form"]', { timeout: 5000 });
      await expect(page.getByText('Create Workflow')).toBeVisible();
    });
  });

  test.describe('Performance Monitoring', () => {
    test('should provide real-time performance metrics', async ({ page }) => {
      await page.getByRole('button', { name: 'Performance Metrics' }).click();
      
      // Check for performance monitoring dashboard
      await expect(page.getByText('Performance Dashboard')).toBeVisible();
      await expect(page.getByText('Response Times')).toBeVisible();
      await expect(page.getByText('Throughput')).toBeVisible();
      await expect(page.getByText('Error Rates')).toBeVisible();
      
      // Verify metrics are being collected
      await expect(page.getByText('Average Response Time:')).toBeVisible();
      await expect(page.getByText('Requests per Second:')).toBeVisible();
      await expect(page.getByText('Error Rate:')).toBeVisible();
      
      // Check for performance alerts
      await expect(page.getByText('Performance Alerts')).toBeVisible();
    });

    test('should alert on performance degradation', async ({ page }) => {
      // Mock performance degradation
      await page.route('**/api/workflows', route => {
        route.continue({ delay: 3000 }); // 3 second delay
      });
      
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Should show performance warning
      await expect(page.getByText('Performance Warning')).toBeVisible();
      await expect(page.getByText('Response time is slower than usual')).toBeVisible();
      
      // Should provide performance optimization suggestions
      await expect(page.getByText('Consider refreshing the page')).toBeVisible();
    });
  });
}); 