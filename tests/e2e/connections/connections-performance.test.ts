// E2E Tests for Connections Performance and Concurrent Operations
// Tests performance requirements, concurrent operations, and load handling

import { test, expect } from '../../helpers/serverHealthCheck';
import { TestUser, generateTestId, cleanupTestUser } from '../../helpers/testUtils';
import { closeAllModals, resetRateLimits, getPrimaryActionButton, completeTestTeardown, setupE2E } from '../../helpers/e2eHelpers';
import { createE2EUser } from '../../helpers/authHelpers';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
import { testConnectionCreation, testConnectionCreationWithValidation } from '../../helpers/dataHelpers';
import { testPageLoadTime, testAPIPerformance } from '../../helpers/performanceHelpers';
import { waitForVisible } from '../../helpers/waitHelpers';
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: TestUser;
let jwt: string;
const createdConnectionIds: string[] = [];

// Helper function to track created connections for cleanup
const trackConnection = (connectionId: string) => {
  createdConnectionIds.push(connectionId);
  console.log(`🔗 Tracked performance test connection: ${connectionId} (total: ${createdConnectionIds.length})`);
};

test.describe('Connections Performance and Concurrent Operations E2E Tests', () => {
  test.beforeAll(async () => {
    testUser = await createE2EUser(Role.ADMIN, {
      email: `e2e-conn-perf-${generateTestId('user')}@example.com`,
      password: 'e2eTestPass123',
      name: 'E2E Connections Performance Test User'
    });
    jwt = testUser.accessToken;
  });

  test.afterAll(async ({ request }) => {
    // Clean up created connections
    for (const id of createdConnectionIds) {
      try {
        await request.delete(`/api/connections/${id}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
        console.log(`🗑️ Cleaned up performance test connection: ${id}`);
      } catch (error) {
        console.warn(`Failed to cleanup performance test connection ${id}:`, error);
      }
    }
    
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    await setupE2E(page, testUser, { 
      tab: 'connections', 
      validateUX: true 
    });
  });

  test.afterEach(async ({ page }) => {
    await completeTestTeardown(page, {
      connectionIds: createdConnectionIds
    });
  });

  test.describe('Performance Requirements', () => {
    test('should meet page load performance requirements', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      const startTime = Date.now();
      await page.goto(`${BASE_URL}/dashboard`);
      await page.click('[data-testid="tab-settings"]');
      await page.click('[data-testid="connections-section"]');
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
      
      // Validate performance requirements
      await uxHelper.validatePerformanceRequirements();
    });

    test('should measure connection response time', async ({ page }) => {
      // Create a connection for performance testing
      await testConnectionCreationWithValidation(page, {
        name: 'Connection for performance testing',
        description: 'Connection to test performance',
        baseUrl: 'https://httpbin.org/delay/1',
        authType: 'API_KEY',
        apiKey: 'test-perf-key'
      });
      
      // Get the connection card
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("Connection for performance testing")');
      
      // Test connection functionality using the correct primary action button
      await getPrimaryActionButton(page, 'test-connection').click();
      
      // Wait for test to complete
      await waitForVisible(page, '[data-testid="success-message"]');
      
      // Should show success message (be flexible about the exact message)
      const successMessage = page.locator('[data-testid="success-message"]');
      await expect(successMessage).toBeVisible();
      
      // Measure response time
      const responseTime = await testAPIPerformance(page, '/api/connections', { threshold: 5000 });
      expect(responseTime).toBeLessThan(5000);
    });

    test('should handle multiple connections efficiently', async ({ page }) => {
      const connectionCount = 5;
      const startTime = Date.now();
      
      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        await testConnectionCreation(page, {
          name: `Performance Test Connection ${i + 1}`,
          description: `Performance test connection ${i + 1}`,
          baseUrl: 'https://httpbin.org/get',
          authType: 'API_KEY',
          apiKey: `test-perf-key-${i + 1}`
        });
      }
      
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / connectionCount;
      
      // Each connection should take less than 2 seconds on average
      expect(averageTime).toBeLessThan(2000);
      
      // Total time should be reasonable
      expect(totalTime).toBeLessThan(10000);
    });
  });

  test.describe('Concurrent Operations', () => {
    test('should handle concurrent connection creation', async ({ page }) => {
      const concurrentConnections = 3;
      const promises = [];
      
      // Start multiple connection creation operations concurrently
      for (let i = 0; i < concurrentConnections; i++) {
        const promise = testConnectionCreation(page, {
          name: `Concurrent Connection ${i + 1}`,
          description: `Concurrent test connection ${i + 1}`,
          baseUrl: 'https://httpbin.org/get',
          authType: 'API_KEY',
          apiKey: `test-concurrent-key-${i + 1}`
        });
        promises.push(promise);
      }
      
      // Wait for all connections to be created
      const results = await Promise.allSettled(promises);
      
      // All connections should be created successfully
      const successfulResults = results.filter(result => result.status === 'fulfilled');
      expect(successfulResults.length).toBe(concurrentConnections);
      
      // Verify all connections appear in the list
      for (let i = 0; i < concurrentConnections; i++) {
        await expect(page.locator(`[data-testid="connection-card"]:has-text("Concurrent Connection ${i + 1}")`)).toBeVisible();
      }
    });

    test('should handle concurrent connection testing', async ({ page }) => {
      // First create multiple connections
      const connectionNames = [];
      for (let i = 0; i < 3; i++) {
        const name = `Concurrent Test Connection ${i + 1}`;
        await testConnectionCreation(page, {
          name,
          description: `Concurrent test connection ${i + 1}`,
          baseUrl: 'https://httpbin.org/get',
          authType: 'API_KEY',
          apiKey: `test-concurrent-test-key-${i + 1}`
        });
        connectionNames.push(name);
      }
      
      // Test all connections concurrently
      const testPromises = connectionNames.map(async (name) => {
        const connectionCard = page.locator(`[data-testid="connection-card"]:has-text("${name}")`);
        await getPrimaryActionButton(page, 'test-connection').click();
        await waitForVisible(page, '[data-testid="success-message"]');
        return true;
      });
      
      const results = await Promise.allSettled(testPromises);
      const successfulTests = results.filter(result => result.status === 'fulfilled');
      expect(successfulTests.length).toBe(3);
    });
  });

  test.describe('Load Handling', () => {
    test('should handle rapid connection operations', async ({ page }) => {
      const rapidOperations = 10;
      const startTime = Date.now();
      
      // Perform rapid connection operations
      for (let i = 0; i < rapidOperations; i++) {
        await getPrimaryActionButton(page, 'create-connection-header').click();
        
        // Fill minimal form data
        await page.fill('[data-testid="connection-name-input"]', `Rapid Connection ${i + 1}`);
        await page.fill('[data-testid="connection-baseurl-input"]', 'https://httpbin.org/get');
        await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
        await page.fill('[data-testid="connection-apikey-input"]', `rapid-key-${i + 1}`);
        
        // Submit and wait for modal to close
        await getPrimaryActionButton(page, 'submit-connection').click();
        await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
        
        // Small delay to prevent overwhelming the system
        await page.waitForTimeout(100);
      }
      
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / rapidOperations;
      
      // Each operation should complete quickly
      expect(averageTime).toBeLessThan(1000);
      
      // Verify connections were created
      for (let i = 0; i < rapidOperations; i++) {
        await expect(page.locator(`[data-testid="connection-card"]:has-text("Rapid Connection ${i + 1}")`)).toBeVisible();
      }
    });

    test('should maintain performance under load', async ({ page }) => {
      // Create a baseline connection
      await testConnectionCreation(page, {
        name: 'Baseline Connection',
        description: 'Baseline connection for load testing',
        baseUrl: 'https://httpbin.org/get',
        authType: 'API_KEY',
        apiKey: 'baseline-key'
      });
      
      // Measure baseline performance
      const baselineTime = await testPageLoadTime(page, '/dashboard?tab=settings&section=connections', { threshold: 3000 });
      
      // Create additional connections to simulate load
      for (let i = 0; i < 5; i++) {
        await testConnectionCreation(page, {
          name: `Load Test Connection ${i + 1}`,
          description: `Load test connection ${i + 1}`,
          baseUrl: 'https://httpbin.org/get',
          authType: 'API_KEY',
          apiKey: `load-test-key-${i + 1}`
        });
      }
      
      // Measure performance under load
      const loadTime = await testPageLoadTime(page, '/dashboard?tab=settings&section=connections', { threshold: 5000 });
      
      // Performance should not degrade significantly (within 50% of baseline)
      const performanceRatio = loadTime / baselineTime;
      expect(performanceRatio).toBeLessThan(1.5);
    });
  });
});
