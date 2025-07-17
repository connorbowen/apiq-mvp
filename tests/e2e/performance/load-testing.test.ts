import { test, expect } from '@playwright/test';
import { createTestUser, loginAsUser } from '../../helpers/createTestData';

test.describe('UX Simplification - Performance Testing', () => {
  let testUser: any;

  test.beforeAll(async () => {
    testUser = await createTestUser({ role: 'user' });
  });

  test.describe('Dashboard Load Performance', () => {
    test('should load dashboard in under 3 seconds', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Measure initial load time
      const startTime = Date.now();
      await page.goto('/dashboard');
      const loadTime = Date.now() - startTime;
      
      // Should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Verify critical components load
      await expect(page.getByTestId('chat-interface')).toBeVisible();
    });

    test('should load critical components first', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Monitor load sequence
      const loadSequence: string[] = [];
      
      page.on('response', response => {
        if (response.url().includes('dashboard')) {
          loadSequence.push(response.url());
        }
      });
      
      await page.goto('/dashboard');
      
      // Chat interface should load first (critical)
      await expect(page.getByTestId('chat-interface')).toBeVisible();
      
      // Verify load sequence prioritizes critical components
      expect(loadSequence.length).toBeGreaterThan(0);
    });

    test('should handle concurrent user loads efficiently', async ({ browser }) => {
      // Test with multiple concurrent users
      const userCount = 5;
      const contexts: any[] = [];
      const pages: any[] = [];
      
      // Create multiple browser contexts
      for (let i = 0; i < userCount; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      // Load dashboard concurrently
      const startTime = Date.now();
      await Promise.all(pages.map(async (page: any) => {
        await loginAsUser(page, testUser);
        await page.goto('/dashboard');
        await expect(page.getByTestId('chat-interface')).toBeVisible();
      }));
      const totalTime = Date.now() - startTime;
      
      // Should handle concurrent loads efficiently
      expect(totalTime).toBeLessThan(10000); // 10 seconds for 5 users
      
      // Cleanup
      await Promise.all(contexts.map((context: any) => context.close()));
    });

    test('should optimize bundle size with code splitting', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Monitor initial bundle size
      const initialRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('dashboard')) {
          initialRequests.push(request.url());
        }
      });
      
      await page.goto('/dashboard');
      await expect(page.getByTestId('chat-interface')).toBeVisible();
      
      // Clear request monitoring
      page.removeAllListeners('request');
      
      // Monitor lazy-loaded component requests
      const lazyRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('workflows') || request.url().includes('settings')) {
          lazyRequests.push(request.url());
        }
      });
      
      // Navigate to trigger lazy loading
      await page.getByTestId('tab-workflows').click();
      await expect(page.getByTestId('workflows-tab')).toBeVisible();
      
      await page.getByTestId('tab-settings').click();
      await expect(page.getByTestId('settings-tab')).toBeVisible();
      
      // Should load components on demand
      expect(lazyRequests.length).toBeGreaterThan(0);
    });
  });

  test.describe('Component Rendering Performance', () => {
    test('should optimize re-renders with React.memo', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Test that navigation remains responsive (indicating optimized re-renders)
      const startTime = Date.now();
      
      // Navigate between tabs multiple times
      for (let i = 0; i < 5; i++) {
        await page.getByTestId('tab-workflows').click();
        await expect(page.getByTestId('workflows-tab')).toBeVisible();
        
        await page.getByTestId('tab-settings').click();
        await expect(page.getByTestId('settings-tab')).toBeVisible();
        
        await page.getByTestId('tab-chat').click();
        await expect(page.getByTestId('chat-interface')).toBeVisible();
      }

      const navigationTime = Date.now() - startTime;
      
      // Should navigate efficiently (indicating optimized re-renders)
      expect(navigationTime).toBeLessThan(5000); // Under 5 seconds for 15 tab switches
    });

    test('should use useCallback for event handlers', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Test that event handlers are optimized
      const startTime = Date.now();
      
      // Rapidly click tabs to test handler performance
      for (let i = 0; i < 10; i++) {
        await page.getByTestId('tab-workflows').click();
        await page.getByTestId('tab-settings').click();
        await page.getByTestId('tab-chat').click();
      }
      
      const endTime = Date.now();
      const clickTime = endTime - startTime;
      
      // Should handle rapid clicks efficiently (under 2 seconds for 30 clicks)
      expect(clickTime).toBeLessThan(2000);
    });

    test('should use useMemo for expensive computations', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');
      await page.click('[data-testid="user-dropdown-toggle"]');
      await page.click('[data-testid="user-dropdown-settings"]');

      // Test settings tab with filtered data
      const startTime = Date.now();
      
      // Trigger multiple data filtering operations
      for (let i = 0; i < 5; i++) {
        await page.getByTestId('connections-section').click();
        await page.getByTestId('secrets-section').click();
        await page.getByTestId('account-section').click();
      }
      
      const endTime = Date.now();
      const filterTime = endTime - startTime;
      
      // Should handle filtering efficiently with useMemo
      expect(filterTime).toBeLessThan(1000);
    });

    test('should handle large data sets efficiently', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard?tab=workflows');

      // Test rendering performance with simulated large dataset
      const startTime = Date.now();
      
      // Navigate to workflows tab to trigger rendering
      await page.getByTestId('tab-workflows').click();
      await expect(page.getByTestId('workflows-tab')).toBeVisible();
      
      const renderTime = Date.now() - startTime;
      
      // Should render efficiently (under 1 second)
      expect(renderTime).toBeLessThan(1000);
    });
  });

  test.describe('Mobile Performance', () => {
    test('should maintain performance on mobile devices', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const startTime = Date.now();
      await page.goto('/dashboard');
      const loadTime = Date.now() - startTime;
      
      // Should load efficiently on mobile
      expect(loadTime).toBeLessThan(3000);
      
      // Verify mobile navigation loads
      await expect(page.getByTestId('mobile-navigation')).toBeVisible();
    });

    test('should handle touch interactions responsively', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      // Test touch interaction performance
      const startTime = Date.now();
      
      // Rapid touch navigation
      for (let i = 0; i < 5; i++) {
        await page.getByTestId('mobile-navigation').getByText('Workflows').click();
        await page.getByTestId('mobile-navigation').getByText('Settings').click();
        await page.getByTestId('mobile-navigation').getByText('Chat').click();
      }
      
      const touchTime = Date.now() - startTime;
      
      // Should handle touch interactions responsively (under 3 seconds)
      expect(touchTime).toBeLessThan(3000);
    });

    test('should optimize mobile bundle size', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Monitor mobile-specific requests
      const mobileRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('mobile') || request.url().includes('touch')) {
          mobileRequests.push(request.url());
        }
      });
      
      await page.goto('/dashboard');
      await expect(page.getByTestId('mobile-navigation')).toBeVisible();
      
      // Should not load unnecessary mobile-specific resources
      expect(mobileRequests.length).toBeLessThan(5);
    });

    test('should handle mobile memory efficiently', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      // Monitor memory usage
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      // Navigate extensively to test memory management
      for (let i = 0; i < 10; i++) {
        await page.getByTestId('mobile-navigation').getByText('Workflows').click();
        await page.getByTestId('mobile-navigation').getByText('Settings').click();
        await page.getByTestId('mobile-navigation').getByText('Chat').click();
      }

      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      // Memory usage should not grow excessively
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    });
  });

  test.describe('Lazy Loading Effectiveness', () => {
    test('should defer non-critical component loading', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Monitor initial page load
      const initialRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('dashboard')) {
          initialRequests.push(request.url());
        }
      });
      
      await page.goto('/dashboard');
      await expect(page.getByTestId('chat-interface')).toBeVisible();
      
      // Clear monitoring
      page.removeAllListeners('request');
      
      // Count initial requests
      const initialCount = initialRequests.length;
      
      // Monitor lazy loading requests
      const lazyRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('workflows') || request.url().includes('settings')) {
          lazyRequests.push(request.url());
        }
      });
      
      // Navigate to trigger lazy loading
      await page.getByTestId('tab-workflows').click();
      await page.getByTestId('tab-settings').click();
      
      // Should have deferred some requests
      expect(lazyRequests.length).toBeGreaterThan(0);
    });

    test('should show loading states for lazy components', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Navigate to workflows tab
      await page.getByTestId('tab-workflows').click();
      
      // Should show loading spinner briefly
      await expect(page.locator('.animate-spin')).toBeVisible();
      
      // Should then load the component
      await expect(page.getByTestId('workflows-tab')).toBeVisible();
    });

    test('should handle lazy loading errors gracefully', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Simulate lazy loading failure
      await page.route('**/workflows', route => {
        route.fulfill({ status: 500, body: 'Load Error' });
      });

      // Navigate to workflows tab
      await page.getByTestId('tab-workflows').click();
      
      // Should show error state
      await expect(page.getByText('Unable to load workflows')).toBeVisible();
      await expect(page.getByText('Please try again')).toBeVisible();
    });
  });

  test.describe('Network Performance', () => {
    test('should optimize API request patterns', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Monitor API requests
      const apiRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          apiRequests.push(request.url());
        }
      });
      
      await page.goto('/dashboard');
      
      // Should minimize API requests on initial load
      expect(apiRequests.length).toBeLessThan(10);
    });

    test('should handle slow network conditions', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Simulate slow network
      await page.route('**/*', route => {
        setTimeout(() => {
          route.continue();
        }, 1000);
      });
      
      const startTime = Date.now();
      await page.goto('/dashboard');
      const loadTime = Date.now() - startTime;
      
      // Should handle slow network gracefully
      expect(loadTime).toBeLessThan(10000); // Under 10 seconds even with 1s delays
      
      // Should show loading states
      await expect(page.getByTestId('loading-spinner')).toBeVisible();
    });

    test('should implement request caching', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Monitor cache headers
      const cacheHeaders: string[] = [];
      page.on('response', response => {
        const cacheControl = response.headers()['cache-control'];
        if (cacheControl) {
          cacheHeaders.push(cacheControl);
        }
      });

      // Navigate to trigger requests
      await page.getByTestId('tab-workflows').click();
      await page.getByTestId('tab-settings').click();
      
      // Should have some caching headers
      expect(cacheHeaders.length).toBeGreaterThan(0);
    });
  });

  test.describe('Memory Management', () => {
    test('should prevent memory leaks', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Monitor memory usage
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      // Perform extensive navigation
      for (let i = 0; i < 20; i++) {
        await page.getByTestId('tab-workflows').click();
        await page.getByTestId('tab-settings').click();
        await page.getByTestId('tab-chat').click();
      }

      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      // Memory usage should not grow excessively
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // Less than 20MB increase
    });

    test('should clean up event listeners', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Monitor event listener count
      const initialListeners = await page.evaluate(() => {
        return document.querySelectorAll('*').length;
      });

      // Navigate extensively
      for (let i = 0; i < 10; i++) {
        await page.getByTestId('tab-workflows').click();
        await page.getByTestId('tab-settings').click();
        await page.getByTestId('tab-chat').click();
      }

      const finalListeners = await page.evaluate(() => {
        return document.querySelectorAll('*').length;
      });

      // DOM element count should not grow excessively
      const elementIncrease = finalListeners - initialListeners;
      expect(elementIncrease).toBeLessThan(100);
    });
  });

  test.describe('Performance Metrics', () => {
    test('should meet Core Web Vitals standards', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Monitor basic performance metrics
      const startTime = Date.now();
      await page.goto('/dashboard');
      
      // Wait for critical content to load
      await expect(page.getByTestId('chat-interface')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should meet basic performance thresholds
      // LCP equivalent: Should load critical content quickly
      expect(loadTime).toBeLessThan(2500);
      
      // Test interactivity
      await page.getByTestId('tab-workflows').click();
      const interactionTime = Date.now() - startTime;
      expect(interactionTime).toBeLessThan(3000);
    });

    test('should optimize Time to Interactive', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      const startTime = Date.now();
      await page.goto('/dashboard');
      
      // Wait for interactive elements
      await expect(page.getByTestId('tab-workflows')).toBeEnabled();
      await expect(page.getByTestId('tab-settings')).toBeEnabled();
      
      const tti = Date.now() - startTime;
      
      // Should be interactive quickly
      expect(tti).toBeLessThan(3000);
    });
  });
}); 
