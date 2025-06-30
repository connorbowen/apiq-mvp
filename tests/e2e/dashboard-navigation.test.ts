import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser, generateTestId } from '../helpers/testUtils';

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
    
    // Wait for successful login and redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test.describe('Tab Navigation', () => {
    test('should navigate between dashboard tabs successfully', async ({ page }) => {
      // Verify we're on the dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      
      // Check that default tab (overview) is active
      await expect(page.locator('[data-testid="tab-overview"]')).toHaveClass(/active/);
      
      // Navigate to Workflows tab
      await page.click('[data-testid="tab-workflows"]');
      await expect(page.locator('[data-testid="tab-workflows"]')).toHaveClass(/active/);
      await expect(page.locator('[data-testid="workflows-section"]')).toBeVisible();
      
      // Navigate to Connections tab
      await page.click('[data-testid="tab-connections"]');
      await expect(page.locator('[data-testid="tab-connections"]')).toHaveClass(/active/);
      await expect(page.locator('[data-testid="connections-section"]')).toBeVisible();
      
      // Navigate to Analytics tab
      await page.click('[data-testid="tab-analytics"]');
      await expect(page.locator('[data-testid="tab-analytics"]')).toHaveClass(/active/);
      await expect(page.locator('[data-testid="analytics-section"]')).toBeVisible();
      
      // Navigate back to Overview tab
      await page.click('[data-testid="tab-overview"]');
      await expect(page.locator('[data-testid="tab-overview"]')).toHaveClass(/active/);
      await expect(page.locator('[data-testid="overview-section"]')).toBeVisible();
    });

    test('should maintain tab state on page refresh', async ({ page }) => {
      // Navigate to Workflows tab
      await page.click('[data-testid="tab-workflows"]');
      await expect(page.locator('[data-testid="tab-workflows"]')).toHaveClass(/active/);
      
      // Refresh the page
      await page.reload();
      
      // Verify we're still on the Workflows tab
      await expect(page.locator('[data-testid="tab-workflows"]')).toHaveClass(/active/);
      await expect(page.locator('[data-testid="workflows-section"]')).toBeVisible();
    });

    test('should handle tab navigation with keyboard', async ({ page }) => {
      // Focus on the tab container
      await page.keyboard.press('Tab');
      
      // Navigate through tabs using arrow keys
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[data-testid="tab-workflows"]')).toHaveClass(/active/);
      
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[data-testid="tab-connections"]')).toHaveClass(/active/);
      
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[data-testid="tab-analytics"]')).toHaveClass(/active/);
      
      // Navigate back with left arrow
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('[data-testid="tab-connections"]')).toHaveClass(/active/);
    });
  });

  test.describe('Workflow Details Navigation', () => {
    test('should navigate to workflow details and back', async ({ page }) => {
      // Navigate to Workflows tab
      await page.click('[data-testid="tab-workflows"]');
      
      // Create a test workflow via API
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Test Workflow for Navigation',
          description: 'A test workflow for navigation testing',
          steps: [
            {
              type: 'api_call',
              name: 'Test Step',
              config: {
                method: 'GET',
                url: 'https://api.example.com/test'
              }
            }
          ]
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(workflowResponse.status()).toBe(201);
      const workflow = await workflowResponse.json();
      
      // Click on the workflow card to navigate to details
      await page.click(`[data-testid="workflow-card-${workflow.data.id}"]`);
      
      // Verify we're on the workflow details page
      await expect(page).toHaveURL(new RegExp(`/workflows/${workflow.data.id}`));
      await expect(page.locator('h1')).toContainText('Test Workflow for Navigation');
      
      // Check that workflow details are displayed
      await expect(page.locator('[data-testid="workflow-description"]')).toContainText('A test workflow for navigation testing');
      await expect(page.locator('[data-testid="workflow-steps"]')).toBeVisible();
      
      // Navigate back to dashboard
      await page.click('[data-testid="back-to-dashboard"]');
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.locator('[data-testid="tab-workflows"]')).toHaveClass(/active/);
      
      // Clean up the test workflow
      await page.request.delete(`/api/workflows/${workflow.data.id}`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
    });

    test('should handle workflow details with complex steps', async ({ page }) => {
      // Navigate to Workflows tab
      await page.click('[data-testid="tab-workflows"]');
      
      // Create a workflow with multiple steps
      const workflowResponse = await page.request.post('/api/workflows', {
        data: {
          name: 'Complex Workflow Test',
          description: 'A workflow with multiple steps for testing',
          steps: [
            {
              type: 'api_call',
              name: 'First Step',
              config: {
                method: 'GET',
                url: 'https://api.example.com/step1'
              }
            },
            {
              type: 'api_call',
              name: 'Second Step',
              config: {
                method: 'POST',
                url: 'https://api.example.com/step2',
                body: { data: 'test' }
              }
            },
            {
              type: 'condition',
              name: 'Condition Step',
              config: {
                condition: 'response.status === 200'
              }
            }
          ]
        },
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });
      
      expect(workflowResponse.status()).toBe(201);
      const workflow = await workflowResponse.json();
      
      // Navigate to workflow details
      await page.click(`[data-testid="workflow-card-${workflow.data.id}"]`);
      
      // Verify all steps are displayed
      await expect(page.locator('[data-testid="step-First Step"]')).toBeVisible();
      await expect(page.locator('[data-testid="step-Second Step"]')).toBeVisible();
      await expect(page.locator('[data-testid="step-Condition Step"]')).toBeVisible();
      
      // Check step details
      await expect(page.locator('[data-testid="step-First Step"] .step-method')).toContainText('GET');
      await expect(page.locator('[data-testid="step-Second Step"] .step-method')).toContainText('POST');
      await expect(page.locator('[data-testid="step-Condition Step"] .step-type')).toContainText('Condition');
      
      // Clean up
      await page.request.delete(`/api/workflows/${workflow.data.id}`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
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
      await page.click('[data-testid="create-workflow-btn"]');
      
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