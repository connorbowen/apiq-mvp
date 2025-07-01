import { test, expect } from '@playwright/test';

// Configure tests to run only in Chromium
test.use({ browserName: 'chromium' });

test.describe('API Connection Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-token', 'mock-token');
    });
    await page.goto('/dashboard');
    // Take a screenshot after navigation
    await page.screenshot({ path: 'debug-after-dashboard.png', fullPage: true });
  });

  test('Create API connection with API key', async ({ page }) => {
    // Navigate to connections page
    await page.getByRole('link', { name: /connections/i }).click();
    await expect(page.getByRole('heading', { name: /api connections/i })).toBeVisible();
    
    // Click create connection button
    await page.getByRole('button', { name: /create connection/i }).click();
    
    // Fill connection details
    await page.getByLabel(/connection name/i).fill('Test API');
    await page.getByLabel(/description/i).fill('A test API connection');
    await page.getByLabel(/base url/i).fill('https://api.example.com');
    await page.getByLabel(/authentication type/i).selectOption('API_KEY');
    
    // Fill API key details
    await page.getByLabel(/api key/i).fill('test-api-key-123');
    
    // Save connection
    await page.getByRole('button', { name: /save connection/i }).click();
    
    // Verify connection was created
    await expect(page.getByText('Test API')).toBeVisible();
    await expect(page.getByText('A test API connection')).toBeVisible();
  });

  test('Create OAuth2 connection', async ({ page }) => {
    // Navigate to connections page
    await page.getByRole('link', { name: /connections/i }).click();
    await page.getByRole('button', { name: /create connection/i }).click();
    
    // Fill basic connection details
    await page.getByLabel(/connection name/i).fill('GitHub API');
    await page.getByLabel(/description/i).fill('GitHub API with OAuth2');
    await page.getByLabel(/base url/i).fill('https://api.github.com');
    await page.getByLabel(/authentication type/i).selectOption('OAUTH2');
    
    // Fill OAuth2 details
    await page.getByLabel(/provider/i).selectOption('github');
    await page.getByLabel(/client id/i).fill('github-client-id');
    await page.getByLabel(/client secret/i).fill('github-client-secret');
    await page.getByLabel(/redirect uri/i).fill('https://localhost/callback');
    await page.getByLabel(/scope/i).fill('repo user');
    
    // Save connection
    await page.getByRole('button', { name: /save connection/i }).click();
    
    // Verify OAuth2 connection was created
    await expect(page.getByText('GitHub API')).toBeVisible();
    await expect(page.getByText('OAuth2')).toBeVisible();
  });

  test('Test API connection', async ({ page }) => {
    // Mock test API response
    await page.route('**/api/connections/*/test', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          message: 'Connection test successful',
          responseTime: 245
        })
      });
    });
    
    // Navigate to connections and test
    await page.getByRole('link', { name: /connections/i }).click();
    await page.getByText('Test API').click();
    await page.getByRole('button', { name: /test connection/i }).click();
    
    // Verify test results
    await expect(page.getByText(/connection test successful/i)).toBeVisible();
    await expect(page.getByText(/245ms/i)).toBeVisible();
  });

  test('OAuth2 authorization flow', async ({ page }) => {
    // Mock OAuth2 authorization URL
    await page.route('**/api/oauth/authorize', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          authorizationUrl: 'https://github.com/login/oauth/authorize?client_id=test&scope=repo'
        })
      });
    });
    
    // Navigate to OAuth2 connection
    await page.getByRole('link', { name: /connections/i }).click();
    await page.getByText('GitHub API').click();
    
    // Click authorize button
    await page.getByRole('button', { name: /authorize with github/i }).click();
    
    // Should redirect to GitHub authorization
    await expect(page).toHaveURL(/.*github\.com.*/);
  });

  test('Refresh API connection', async ({ page }) => {
    // Mock refresh API response
    await page.route('**/api/connections/*/refresh', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          message: 'Connection refreshed successfully',
          endpointCount: 25
        })
      });
    });
    
    // Navigate to connections and refresh
    await page.getByRole('link', { name: /connections/i }).click();
    await page.getByText('Test API').click();
    await page.getByRole('button', { name: /refresh connection/i }).click();
    
    // Verify refresh results
    await expect(page.getByText(/connection refreshed successfully/i)).toBeVisible();
    await expect(page.getByText(/25 endpoints/i)).toBeVisible();
  });

  test('Delete API connection', async ({ page }) => {
    // Mock delete API
    await page.route('**/api/connections/*', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      }
    });
    
    // Navigate to connections and delete
    await page.getByRole('link', { name: /connections/i }).click();
    await page.getByText('Test API').click();
    await page.getByRole('button', { name: /delete/i }).click();
    
    // Confirm deletion
    await page.getByRole('button', { name: /confirm/i }).click();
    
    // Verify connection was deleted
    await expect(page.getByText('Test API')).not.toBeVisible();
  });

  test('Connection validation', async ({ page }) => {
    // Navigate to create connection
    await page.getByRole('link', { name: /connections/i }).click();
    await page.getByRole('button', { name: /create connection/i }).click();
    
    // Try to save without required fields
    await page.getByRole('button', { name: /save connection/i }).click();
    
    // Verify validation errors
    await expect(page.getByText(/connection name is required/i)).toBeVisible();
    await expect(page.getByText(/base url is required/i)).toBeVisible();
  });

  test('Connection status monitoring', async ({ page }) => {
    // Mock connection status API
    await page.route('**/api/connections/*/status', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          status: 'ACTIVE',
          lastChecked: '2024-01-01T12:00:00Z',
          responseTime: 150,
          uptime: 99.8
        })
      });
    });
    
    // Navigate to connection details
    await page.getByRole('link', { name: /connections/i }).click();
    await page.getByText('Test API').click();
    
    // Verify status information
    await expect(page.getByText(/active/i)).toBeVisible();
    await expect(page.getByText(/150ms/i)).toBeVisible();
    await expect(page.getByText(/99\.8%/i)).toBeVisible();
  });
}); 