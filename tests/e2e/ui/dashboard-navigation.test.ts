import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser;
let jwt;

test.describe('Dashboard Navigation E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-nav-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Navigation Test User'
    );
    jwt = testUser.accessToken;
  });

  test.afterAll(async () => {
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', 'e2eTestPass123');
    await page.click('button[type="submit"]');
    
    // Wait for successful login and redirect to dashboard with shorter timeout
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test.describe('Tab Navigation', () => {
    test('should navigate between dashboard tabs successfully', async ({ page }) => {
      // Verify we're on the dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Check that default tab (chat) is active
      await expect(page.locator('[data-testid="tab-chat"]')).toHaveClass(/bg-indigo-100/);
      
      // Navigate to Connections tab
      await page.click('[data-testid="tab-connections"]');
      await expect(page.locator('[data-testid="tab-connections"]')).toHaveClass(/bg-indigo-100/);
      await expect(page.locator('h2')).toContainText('API Connections');
      
      // Navigate back to Chat tab
      await page.click('[data-testid="tab-chat"]');
      await expect(page.locator('[data-testid="tab-chat"]')).toHaveClass(/bg-indigo-100/);
      // Chat interface should be visible
      await expect(page.locator('textarea')).toBeVisible();
    });

    test('should maintain tab state on page refresh', async ({ page }) => {
      // Navigate to Connections tab
      await page.click('[data-testid="tab-connections"]');
      await expect(page.locator('[data-testid="tab-connections"]')).toHaveClass(/bg-indigo-100/);
      
      // Refresh the page
      await page.reload();
      
      // Verify we're still on the Connections tab
      await expect(page.locator('[data-testid="tab-connections"]')).toHaveClass(/bg-indigo-100/);
      await expect(page.locator('h2')).toContainText('API Connections');
    });

    test('should handle tab navigation with keyboard', async ({ page }) => {
      // Focus on the tab container
      await page.keyboard.press('Tab');
      
      // Navigate through tabs using arrow keys
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[data-testid="tab-connections"]')).toHaveClass(/bg-indigo-100/);
      
      // Navigate back with left arrow
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('[data-testid="tab-chat"]')).toHaveClass(/bg-indigo-100/);
    });
  });

  test.describe('Dashboard Functionality', () => {
    test('should display user information correctly', async ({ page }) => {
      // Verify user information is displayed
      await expect(page.locator('span')).toContainText('Welcome, E2E Navigation Test User');
      
      // Verify logout button is present
      await expect(page.locator('button')).toContainText('Logout');
    });

    test('should handle logout functionality', async ({ page }) => {
      // Click logout button
      await page.click('button:has-text("Logout")');
      
      // Should redirect to home page
      await expect(page).toHaveURL(/.*\/$/);
    });

    test('should display connections tab content', async ({ page }) => {
      // Navigate to Connections tab
      await page.click('[data-testid="tab-connections"]');
      
      // Verify connections content is displayed
      await expect(page.locator('h2')).toContainText('API Connections');
      await expect(page.locator('[data-testid="create-connection-btn"]')).toContainText('Add Connection');
      await expect(page.locator('[data-testid="refresh-connections-btn"]')).toContainText('Refresh');
    });

    test('should display chat tab content', async ({ page }) => {
      // Verify we're on chat tab by default
      await expect(page.locator('[data-testid="tab-chat"]')).toHaveClass(/bg-indigo-100/);
      
      // Verify chat interface is displayed
      await expect(page.locator('textarea')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 errors for non-existent workflows', async ({ page }) => {
      // Try to navigate to a non-existent workflow
      await page.goto(`${BASE_URL}/workflows/non-existent-id`);
      
      // Should show 404 page
      await expect(page.locator('h1')).toContainText('404');
      await expect(page.locator('p')).toContainText('Workflow not found');
      
      // Should have a link back to dashboard
      await page.click('a[href="/dashboard"]');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Navigate to Workflows tab
      await page.click('[data-testid="tab-workflows"]');
      
      // Mock API error by temporarily removing auth header
      await page.evaluate(() => {
        // Store original fetch
        (window as any).originalFetch = window.fetch;
        
        // Mock fetch to return error
        window.fetch = async (url: RequestInfo | URL, options?: RequestInit) => {
          const urlString = typeof url === 'string' ? url : url.toString();
          if (urlString.includes('/api/workflows')) {
            return new Response(JSON.stringify({
              error: 'Internal Server Error',
              message: 'Something went wrong'
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return (window as any).originalFetch(url, options);
        };
      });
      
      // Try to create a workflow (should fail)
      await page.click('[data-testid="primary-action create-workflow-btn"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Something went wrong');
      
      // Restore original fetch
      await page.evaluate(() => {
        window.fetch = (window as any).originalFetch;
      });
    });

    test('should handle network errors during navigation', async ({ page }) => {
      // Set offline mode
      await page.context().setOffline(true);
      
      // Try to navigate to a new page
      await page.click('[data-testid="tab-workflows"]');
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Restore online mode
      await page.context().setOffline(false);
      
      // Should hide offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });

    test('should handle slow loading states', async ({ page }) => {
      // Navigate to Workflows tab
      await page.click('[data-testid="tab-workflows"]');
      
      // Mock slow API response
      await page.route('**/api/workflows', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });
      
      // Click refresh button
      await page.click('[data-testid="refresh-workflows"]');
      
      // Should show loading state
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Wait for loading to complete
      await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
    });
  });

  test.describe('Breadcrumb Navigation', () => {
    test('should display correct breadcrumbs', async ({ page }) => {
      // Navigate to Workflows tab
      await page.click('[data-testid="tab-workflows"]');
      
      // Check breadcrumbs
      await expect(page.locator('[data-testid="breadcrumb-dashboard"]')).toContainText('Dashboard');
      await expect(page.locator('[data-testid="breadcrumb-workflows"]')).toContainText('Workflows');
      
      // Create and navigate to a workflow
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Breadcrumb Test Workflow',
          description: 'Test workflow for breadcrumb navigation',
          steps: []
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      const workflow = await workflowResponse.json();
      await page.click(`[data-testid="workflow-card-${workflow.data.id}"]`);
      
      // Check breadcrumbs on workflow details page
      await expect(page.locator('[data-testid="breadcrumb-dashboard"]')).toContainText('Dashboard');
      await expect(page.locator('[data-testid="breadcrumb-workflows"]')).toContainText('Workflows');
      await expect(page.locator('[data-testid="breadcrumb-workflow"]')).toContainText('Breadcrumb Test Workflow');
      
      // Navigate using breadcrumbs
      await page.click('[data-testid="breadcrumb-workflows"]');
      await expect(page).toHaveURL(/.*dashboard.*workflows/);
      
      await page.click('[data-testid="breadcrumb-dashboard"]');
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Clean up
      await page.request.delete(`/api/workflows/${workflow.data.id}`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
    });
  });

  test.describe('Search and Filter Navigation', () => {
    test('should handle search functionality', async ({ page }) => {
      // Navigate to Workflows tab
      await page.click('[data-testid="tab-workflows"]');
      
      // Create test workflows
      const workflows: any[] = [];
      for (let i = 0; i < 3; i++) {
        const response = await page.request.post('/api/workflows', {
          data: {
            name: `Test Workflow ${i + 1}`,
            description: `Description for workflow ${i + 1}`,
            steps: []
          },
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          }
        });
        workflows.push((await response.json()).data);
      }
      
      // Search for a specific workflow
      await page.fill('[data-testid="search-input"]', 'Test Workflow 2');
      
      // Should show only matching workflow
      await expect(page.locator('[data-testid="workflow-card"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="workflow-card"]')).toContainText('Test Workflow 2');
      
      // Clear search
      await page.fill('[data-testid="search-input"]', '');
      
      // Should show all workflows
      await expect(page.locator('[data-testid="workflow-card"]')).toHaveCount(3);
      
      // Clean up
      for (const workflow of workflows) {
        await page.request.delete(`/api/workflows/${workflow.id}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
      }
    });

    test('should handle filter navigation', async ({ page }) => {
      // Navigate to Workflows tab
      await page.click('[data-testid="tab-workflows"]');
      
      // Open filter dropdown
      await page.click('[data-testid="filter-dropdown"]');
      
      // Select a filter
      await page.click('[data-testid="filter-active"]');
      
      // Should show filter indicator
      await expect(page.locator('[data-testid="active-filter"]')).toBeVisible();
      
      // Clear filter
      await page.click('[data-testid="clear-filters"]');
      
      // Should hide filter indicator
      await expect(page.locator('[data-testid="active-filter"]')).not.toBeVisible();
    });
  });
}); 