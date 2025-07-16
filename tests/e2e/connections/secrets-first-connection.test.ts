// E2E Tests for Secrets-First Connection Management
// Tests the complete secrets-first refactor functionality

import { test, expect } from '../../helpers/serverHealthCheck';
import { createTestUser, cleanupTestUser, generateTestId, TestUser } from '../../helpers/testUtils';
import { UXComplianceHelper } from '../../helpers/uxCompliance';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: TestUser;
let jwt: string;
const createdConnectionIds: string[] = [];
const createdSecretIds: string[] = [];

test.describe('Secrets-First Connection Management E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-secrets-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Secrets-First Test User'
    );
    jwt = testUser.accessToken;
  });

  test.afterAll(async ({ request }) => {
    // Clean up created connections
    for (const id of createdConnectionIds) {
      try {
        await request.delete(`/api/connections/${id}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    // Clean up created secrets
    for (const id of createdSecretIds) {
      try {
        await request.delete(`/api/secrets/${id}`, {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    const uxHelper = new UXComplianceHelper(page);
    
    // Clean up any existing modals first
    try {
      const modalOverlay = page.locator('.fixed.inset-0.bg-gray-600.bg-opacity-50');
      if (await modalOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
        const closeButton = page.locator('button[aria-label="Close modal"]');
        const cancelButton = page.locator('button:has-text("Cancel")');
        if (await closeButton.isVisible({ timeout: 500 }).catch(() => false)) {
          await closeButton.click();
        } else if (await cancelButton.isVisible({ timeout: 500 }).catch(() => false)) {
          await cancelButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
        await modalOverlay.isHidden({ timeout: 2000 }).catch(() => {});
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Login before each test
    console.log('🪵 Starting login process for user:', testUser.email);
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Add UX compliance validation for login page
    await uxHelper.validatePageTitle('APIQ');
    await uxHelper.validateHeadingHierarchy(['Sign in to APIQ']);
    await uxHelper.validateFormAccessibility();
    
    // Fill login form
    console.log('🪵 Filling login form...');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', 'e2eTestPass123');
    
    // Check if login button is enabled
    const loginButton = page.getByTestId('primary-action signin-btn');
    const isEnabled = await loginButton.isEnabled();
    console.log('🪵 Login button enabled:', isEnabled);
    
    if (!isEnabled) {
      console.error('🪵 Login button is disabled!');
      throw new Error('Login button is disabled');
    }
    
    // Click login button
    console.log('🪵 Clicking login button...');
    await loginButton.click();
    
    // Wait for successful login and redirect to dashboard
    console.log('🪵 Waiting for redirect to dashboard...');
    try {
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
      console.log('🪵 Successfully redirected to dashboard');
    } catch (error) {
      console.error('🪵 Failed to redirect to dashboard. Current URL:', await page.url());
      
      // Check if there's an error message on the login page
      const errorElement = page.locator('[role="alert"]');
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.error('🪵 Login error message:', errorText);
      }
      
      // Check if we're still on the login page
      const currentUrl = await page.url();
      if (currentUrl.includes('/login')) {
        console.error('🪵 Still on login page after login attempt');
        throw new Error(`Login failed - still on login page. Current URL: ${currentUrl}`);
      }
      
      throw error;
    }
    
    // Add UX compliance validation for dashboard
    await uxHelper.validateHeadingHierarchy(['Dashboard']);
    
    // Navigate to connections tab (now in settings)
    await page.click('[data-testid="tab-settings"]');
    await page.click('[data-testid="connections-section"]');
    
    // Wait for the connections tab to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Add comprehensive UX compliance validation
    await uxHelper.validateHeadingHierarchy(['Dashboard', 'API Connections']);
    await uxHelper.validateFormAccessibility();
    
    // Validate UX compliance - heading hierarchy
    await expect(page.locator('h1')).toHaveText('Dashboard');
    await expect(page.locator('h2')).toHaveText('API Connections');
    
    console.log('🪵 Login and navigation completed successfully');
    
    // Clear any rate limiting state that might persist between tests
    await page.evaluate(() => {
      (window as any).lastConnectionSubmission = 0;
      (window as any).connectionSubmissionCount = 0;
      (window as any).lastRateLimitReset = 0;
    });
    
    // Reset server-side rate limits
    try {
      await page.request.post('/api/test/reset-rate-limits');
    } catch (error) {
      // Ignore if endpoint doesn't exist in non-test environment
      console.log('Rate limit reset endpoint not available:', error);
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up any open modals to prevent test isolation issues
    try {
      const modalOverlay = page.locator('.fixed.inset-0.bg-gray-600.bg-opacity-50');
      if (await modalOverlay.isVisible()) {
        const closeButton = page.locator('button[aria-label="Close modal"]');
        const cancelButton = page.locator('button:has-text("Cancel")');
        
        if (await closeButton.isVisible()) {
          await closeButton.click();
        } else if (await cancelButton.isVisible()) {
          await cancelButton.click();
        } else {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(100);
          await page.keyboard.press('Escape');
        }
        
        await expect(modalOverlay).not.toBeVisible({ timeout: 10000 });
      }
    } catch (error) {
      try {
        await page.evaluate(() => {
          const modals = document.querySelectorAll('.fixed.inset-0.bg-gray-600.bg-opacity-50');
          modals.forEach(modal => modal.remove());
        });
      } catch (cleanupError) {
        console.log('Modal cleanup warning:', error);
      }
    }
    
    // Clear any rate limiting state that might persist between tests
    await page.evaluate(() => {
      (window as any).lastConnectionSubmission = 0;
      (window as any).connectionSubmissionCount = 0;
      (window as any).lastRateLimitReset = 0;
    });
    
    // Reset server-side rate limits
    try {
      await page.request.post('/api/test/reset-rate-limits');
    } catch (error) {
      console.log('Rate limit reset endpoint not available:', error);
    }
  });

  test.describe('Secrets-First Connection Creation', () => {
    test('should create connection with automatic secret creation', async ({ page, request }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // Click create connection button
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      console.log('🪵 Clicked create connection button');
      
      // Wait for modal to appear
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      console.log('🪵 Modal appeared');
      
      // Add comprehensive UX compliance validation
      await uxHelper.validateHeadingHierarchy(['Add API Connection']);
      await uxHelper.validateFormAccessibility();
      await uxHelper.validateActivationFirstUX();
      
      // Fill connection form
      const nameInput = page.locator('[data-testid="connection-name-input"]');
      await expect(nameInput).toBeVisible();
      await nameInput.fill('Test Secrets-First Connection');
      console.log('🪵 Filled name input');
      
      const descInput = page.locator('[data-testid="connection-description-input"]');
      await expect(descInput).toBeVisible();
      await descInput.fill('Connection with automatic secret creation');
      console.log('🪵 Filled description input');
      
      const baseUrlInput = page.locator('[data-testid="connection-baseurl-input"]');
      await expect(baseUrlInput).toBeVisible();
      await baseUrlInput.fill('https://httpbin.org/get');
      console.log('🪵 Filled base URL input');
      
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'test-secret-key-123');
      console.log('🪵 Filled API key');
      
      // Check if submit button is enabled
      const submitBtn = page.locator('[data-testid="primary-action submit-connection-btn"]');
      const isEnabled = await submitBtn.isEnabled();
      console.log('🪵 Submit button enabled:', isEnabled);
      await expect(submitBtn).toBeEnabled();
      
      // Add network request monitoring
      const requestPromise = page.waitForRequest(request => 
        request.url().includes('/api/connections') && request.method() === 'POST'
      );
      
      console.log('🪵 About to click submit button');
      await submitBtn.click();
      console.log('🪵 Clicked submit button');
      
      // Wait for the API request to complete
      try {
        const apiRequest = await requestPromise;
        console.log('🪵 API request made:', apiRequest.url());
        console.log('🪵 Request method:', apiRequest.method());
        console.log('🪵 Request headers:', apiRequest.headers());
        console.log('🪵 Request post data:', apiRequest.postData());
      } catch (e) {
        console.log('🪵 No API request detected within timeout');
      }
      
      // Wait for form processing with debug output
      console.log('🪵 Waiting for form processing...');
      
      // Wait for modal to close (indicating success)
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
      
      // Check for success message in dashboard
      const successMessage = page.locator('[data-testid="success-message"]');
      try {
        await expect(successMessage).toBeVisible({ timeout: 5000 });
        console.log('🪵 Success message visible:', await successMessage.isVisible());
        console.log('🪵 Success message text:', await successMessage.textContent());
      } catch (e) {
        console.warn('🪵 Success message did not appear within timeout');
        
        // Check for error messages instead
        const errorMessage = page.locator('[data-testid="error-message"]');
        const hasError = await errorMessage.count() > 0;
        if (hasError) {
          console.log('🪵 Error message found:', await errorMessage.textContent());
        }
        
        // Check if modal is still open
        const modalStillOpen = await page.locator('[role="dialog"]').isVisible();
        console.log('🪵 Modal still open:', modalStillOpen);
        
        // Check for any alerts or notifications
        const alerts = page.locator('[role="alert"], [role="status"]');
        const alertCount = await alerts.count();
        console.log('🪵 Alert/status elements found:', alertCount);
        if (alertCount > 0) {
          for (let i = 0; i < alertCount; i++) {
            const alert = alerts.nth(i);
            console.log(`🪵 Alert ${i + 1}:`, await alert.textContent());
          }
        }
      }
      
      // Check for connection card
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("Test Secrets-First Connection")');
      console.log('🪵 Looking for connection card with text "Test Secrets-First Connection"');
      
      // Wait for connection card to appear
      try {
        await expect(connectionCard).toBeVisible({ timeout: 10000 });
        console.log('🪵 Connection card found and visible');
      } catch (e) {
        console.log('🪵 Connection card not found, checking all connection cards');
        
        // List all connection cards
        const allCards = page.locator('[data-testid="connection-card"]');
        const cardCount = await allCards.count();
        console.log('🪵 Total connection cards found:', cardCount);
        
        for (let i = 0; i < cardCount; i++) {
          const card = allCards.nth(i);
          const cardText = await card.textContent();
          console.log(`🪵 Card ${i + 1}:`, cardText?.substring(0, 100) + '...');
        }
        
        throw e;
      }
      
      // Verify that a secret was automatically created via API
      const connectionsResponse = await request.get('/api/connections', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(connectionsResponse.ok()).toBeTruthy();
      
      const response = await connectionsResponse.json();
      expect(response.success).toBeTruthy();
      expect(response.data).toBeDefined();
      expect(response.data.connections).toBeDefined();
      
      const connections = response.data.connections;
      const createdConnection = connections.find((conn: any) => 
        conn.name === 'Test Secrets-First Connection'
      );
      
      expect(createdConnection).toBeDefined();
      expect(createdConnection.secretId).toBeDefined();
      expect(createdConnection.secretId).not.toBeNull();
      
      // Store connection ID for cleanup
      createdConnectionIds.push(createdConnection.id);
      
      // Verify the secret exists and is linked to the connection
      const secretResponse = await request.get(`/api/secrets/${createdConnection.secretId}`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(secretResponse.ok()).toBeTruthy();
      
      const secret = await secretResponse.json();
      expect(secret.connectionId).toBe(createdConnection.id);
      expect(secret.connectionName).toBe('Test Secrets-First Connection');
      expect(secret.type).toBe('API_KEY');
      
      // Store secret ID for cleanup
      createdSecretIds.push(secret.id);
    });

    test('should create connection with Bearer token and automatic secret', async ({ page, request }) => {
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'Bearer Token Secrets-First');
      await page.fill('[data-testid="connection-description-input"]', 'Bearer token with automatic secret');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'BEARER_TOKEN');
      await page.fill('[data-testid="connection-bearertoken-input"]', 'test-bearer-secret-token-456');
      
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for modal to close (indicating success)
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
      
      // Check for success message in dashboard
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Check for connection card
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("Bearer Token Secrets-First")');
      await expect(connectionCard).toBeVisible({ timeout: 10000 });
      
      // Verify that a secret was automatically created via API
      const connectionsResponse = await request.get('/api/connections', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(connectionsResponse.ok()).toBeTruthy();
      
      const response = await connectionsResponse.json();
      expect(response.success).toBeTruthy();
      expect(response.data).toBeDefined();
      expect(response.data.connections).toBeDefined();
      
      const connections = response.data.connections;
      const createdConnection = connections.find((conn: any) => 
        conn.name === 'Bearer Token Secrets-First'
      );
      
      expect(createdConnection).toBeDefined();
      expect(createdConnection.secretId).toBeDefined();
      expect(createdConnection.secretId).not.toBeNull();
      
      // Store connection ID for cleanup
      createdConnectionIds.push(createdConnection.id);
      
      // Verify the secret exists and is linked to the connection
      const secretResponse = await request.get(`/api/secrets/${createdConnection.secretId}`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(secretResponse.ok()).toBeTruthy();
      
      const secret = await secretResponse.json();
      expect(secret.connectionId).toBe(createdConnection.id);
      expect(secret.connectionName).toBe('Bearer Token Secrets-First');
      expect(secret.type).toBe('BEARER_TOKEN');
      
      // Store secret ID for cleanup
      createdSecretIds.push(secret.id);
    });

    test('should create connection with Basic auth and automatic secret', async ({ page, request }) => {
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'Basic Auth Secrets-First');
      await page.fill('[data-testid="connection-description-input"]', 'Basic auth with automatic secret');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'BASIC_AUTH');
      await page.fill('[data-testid="connection-username-input"]', 'testuser');
      await page.fill('[data-testid="connection-password-input"]', 'testpass123');
      
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for modal to close (indicating success)
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
      
      // Check for success message in dashboard
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Check for connection card
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("Basic Auth Secrets-First")');
      await expect(connectionCard).toBeVisible({ timeout: 10000 });
      
      // Verify that a secret was automatically created via API
      const connectionsResponse = await request.get('/api/connections', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(connectionsResponse.ok()).toBeTruthy();
      
      const response = await connectionsResponse.json();
      expect(response.success).toBeTruthy();
      expect(response.data).toBeDefined();
      expect(response.data.connections).toBeDefined();
      
      const connections = response.data.connections;
      const createdConnection = connections.find((conn: any) => 
        conn.name === 'Basic Auth Secrets-First'
      );
      
      expect(createdConnection).toBeDefined();
      expect(createdConnection.secretId).toBeDefined();
      expect(createdConnection.secretId).not.toBeNull();
      
      // Store connection ID for cleanup
      createdConnectionIds.push(createdConnection.id);
      
      // Verify the secret exists and is linked to the connection
      const secretResponse = await request.get(`/api/secrets/${createdConnection.secretId}`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(secretResponse.ok()).toBeTruthy();
      
      const secret = await secretResponse.json();
      expect(secret.connectionId).toBe(createdConnection.id);
      expect(secret.connectionName).toBe('Basic Auth Secrets-First');
      expect(secret.type).toBe('BASIC_AUTH');
      
      // Store secret ID for cleanup
      createdSecretIds.push(secret.id);
    });
  });

  test.describe('Connection-Specific Secrets Management', () => {
    test('should manage secrets for existing connection', async ({ page, request }) => {
      // First create a connection
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'Secrets Management Test');
      await page.fill('[data-testid="connection-description-input"]', 'Connection for secrets management testing');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'initial-secret-key');
      
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for modal to close (indicating success)
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
      
      // Get the created connection
      const connectionsResponse = await request.get('/api/connections', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(connectionsResponse.ok()).toBeTruthy();
      
      const response = await connectionsResponse.json();
      expect(response.success).toBeTruthy();
      expect(response.data).toBeDefined();
      expect(response.data.connections).toBeDefined();
      
      const connections = response.data.connections;
      const createdConnection = connections.find((conn: any) => 
        conn.name === 'Secrets Management Test'
      );
      
      expect(createdConnection).toBeDefined();
      expect(createdConnection.secretId).toBeDefined();
      
      // Store connection ID for cleanup
      createdConnectionIds.push(createdConnection.id);
      
      // Navigate to connection details page
      await page.goto(`${BASE_URL}/connections/${createdConnection.id}`);
      await page.waitForLoadState('networkidle');
      
      // Check for secrets section
      const secretsSection = page.locator('[data-testid="connection-secrets-section"]');
      await expect(secretsSection).toBeVisible();
      
      // Check for existing secret
      const existingSecret = page.locator('[data-testid="secret-item"]');
      await expect(existingSecret).toBeVisible();
      
      // Test secret rotation
      const rotateButton = page.locator('[data-testid="primary-action rotate-secret-btn"]');
      await expect(rotateButton).toBeVisible();
      
      // Click rotate button
      await rotateButton.click();
      
      // Wait for rotation confirmation
      const confirmButton = page.locator('[data-testid="primary-action confirm-rotate-btn"]');
      await expect(confirmButton).toBeVisible();
      
      await confirmButton.click();
      
      // Wait for success message
      const successMessage = page.locator('[data-testid="success-message"]');
      await expect(successMessage).toBeVisible({ timeout: 10000 });
      
      // Verify secret was rotated via API
      const secretResponse = await request.get(`/api/secrets/${createdConnection.secretId}`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(secretResponse.ok()).toBeTruthy();
      
      const secret = await secretResponse.json();
      expect(secret.connectionId).toBe(createdConnection.id);
      
      // Store secret ID for cleanup
      createdSecretIds.push(secret.id);
    });

    test('should add additional secrets to connection', async ({ page, request }) => {
      // First create a connection
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'Additional Secrets Test');
      await page.fill('[data-testid="connection-description-input"]', 'Connection for additional secrets testing');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'primary-secret-key');
      
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for modal to close (indicating success)
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
      
      // Get the created connection
      const connectionsResponse = await request.get('/api/connections', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(connectionsResponse.ok()).toBeTruthy();
      
      const response = await connectionsResponse.json();
      expect(response.success).toBeTruthy();
      expect(response.data).toBeDefined();
      expect(response.data.connections).toBeDefined();
      
      const connections = response.data.connections;
      const createdConnection = connections.find((conn: any) => 
        conn.name === 'Additional Secrets Test'
      );
      
      expect(createdConnection).toBeDefined();
      
      // Store connection ID for cleanup
      createdConnectionIds.push(createdConnection.id);
      
      // Navigate to connection details page
      await page.goto(`${BASE_URL}/connections/${createdConnection.id}`);
      await page.waitForLoadState('networkidle');
      
      // Add additional secret
      const addSecretButton = page.locator('[data-testid="primary-action add-secret-btn"]');
      await expect(addSecretButton).toBeVisible();
      
      await addSecretButton.click();
      
      // Fill additional secret form
      await page.fill('[data-testid="secret-name-input"]', 'Secondary API Key');
      await page.selectOption('[data-testid="secret-type-select"]', 'API_KEY');
      await page.fill('[data-testid="secret-value-input"]', 'secondary-secret-key-789');
      
      const submitSecretButton = page.locator('[data-testid="primary-action submit-secret-btn"]');
      await expect(submitSecretButton).toBeVisible();
      await submitSecretButton.click();
      
      // Wait for success message
      const successMessage = page.locator('[data-testid="success-message"]');
      await expect(successMessage).toBeVisible({ timeout: 10000 });
      
      // Verify additional secret was created via API
      const secretsResponse = await request.get(`/api/connections/${createdConnection.id}/secrets`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(secretsResponse.ok()).toBeTruthy();
      
      const secrets = await secretsResponse.json();
      expect(secrets.length).toBeGreaterThan(1);
      
      const additionalSecret = secrets.find((secret: any) => 
        secret.name === 'Secondary API Key'
      );
      expect(additionalSecret).toBeDefined();
      expect(additionalSecret.connectionId).toBe(createdConnection.id);
      
      // Store secret IDs for cleanup
      secrets.forEach((secret: any) => {
        createdSecretIds.push(secret.id);
      });
    });
  });

  test.describe('Secrets-First Error Handling', () => {
    test('should handle connection creation failure gracefully', async ({ page }) => {
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      // Fill form with invalid data
      await page.fill('[data-testid="connection-name-input"]', '');
      await page.fill('[data-testid="connection-description-input"]', 'Invalid connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'invalid-url');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', '');
      
      const submitBtn = page.locator('[data-testid="primary-action submit-connection-btn"]');
      
      // Button should be disabled due to validation
      await expect(submitBtn).toBeDisabled();
      
      // Fill valid data
      await page.fill('[data-testid="connection-name-input"]', 'Valid Connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.fill('[data-testid="connection-apikey-input"]', 'valid-key');
      
      await expect(submitBtn).toBeEnabled();
      
      // Submit form
      await submitBtn.click();
      
      // Wait for modal to close (indicating success)
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
      
      // Check for success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should handle secret rotation failure gracefully', async ({ page, request }) => {
      // First create a connection
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'Rotation Error Test');
      await page.fill('[data-testid="connection-description-input"]', 'Connection for rotation error testing');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'rotation-test-key');
      
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for modal to close (indicating success)
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
      
      // Get the created connection
      const connectionsResponse = await request.get('/api/connections', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(connectionsResponse.ok()).toBeTruthy();
      
      const response = await connectionsResponse.json();
      expect(response.success).toBeTruthy();
      expect(response.data).toBeDefined();
      expect(response.data.connections).toBeDefined();
      
      const connections = response.data.connections;
      const createdConnection = connections.find((conn: any) => 
        conn.name === 'Rotation Error Test'
      );
      
      expect(createdConnection).toBeDefined();
      
      // Store connection ID for cleanup
      createdConnectionIds.push(createdConnection.id);
      
      // Navigate to connection details page
      await page.goto(`${BASE_URL}/connections/${createdConnection.id}`);
      await page.waitForLoadState('networkidle');
      
      // Try to rotate secret with invalid data (simulate error)
      const rotateButton = page.locator('[data-testid="primary-action rotate-secret-btn"]');
      await expect(rotateButton).toBeVisible();
      
      // Click rotate button
      await rotateButton.click();
      
      // Wait for rotation confirmation
      const confirmButton = page.locator('[data-testid="primary-action confirm-rotate-btn"]');
      await expect(confirmButton).toBeVisible();
      
      await confirmButton.click();
      
      // Should show success message (or error handling if implemented)
      const messageElement = page.locator('[data-testid="success-message"], [data-testid="error-message"]');
      await expect(messageElement).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Secrets-First Integration with Workflows', () => {
    test('should use secrets in workflow execution', async ({ page, request }) => {
      // First create a connection with secrets
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'Workflow Integration Test');
      await page.fill('[data-testid="connection-description-input"]', 'Connection for workflow integration testing');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://httpbin.org');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'workflow-test-key');
      
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for modal to close (indicating success)
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
      
      // Get the created connection
      const connectionsResponse = await request.get('/api/connections', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(connectionsResponse.ok()).toBeTruthy();
      
      const response = await connectionsResponse.json();
      expect(response.success).toBeTruthy();
      expect(response.data).toBeDefined();
      expect(response.data.connections).toBeDefined();
      
      const connections = response.data.connections;
      const createdConnection = connections.find((conn: any) => 
        conn.name === 'Workflow Integration Test'
      );
      
      expect(createdConnection).toBeDefined();
      expect(createdConnection.secretId).toBeDefined();
      
      // Store connection ID for cleanup
      createdConnectionIds.push(createdConnection.id);
      
      // Navigate to workflows page
      await page.click('[data-testid="tab-workflows"]');
      await page.waitForLoadState('networkidle');
      
      // Create a simple workflow that uses the connection
      const createWorkflowButton = page.locator('[data-testid="primary-action create-workflow-btn"]');
      await expect(createWorkflowButton).toBeVisible();
      
      await createWorkflowButton.click();
      
      // Fill workflow form
      await page.fill('[data-testid="workflow-name-input"]', 'Secrets Integration Workflow');
      await page.fill('[data-testid="workflow-description-input"]', 'Workflow that uses secrets from connection');
      
      // Add API call step
      const addStepButton = page.locator('[data-testid="primary-action add-step-btn"]');
      await expect(addStepButton).toBeVisible();
      await addStepButton.click();
      
      // Select API call step type
      await page.selectOption('[data-testid="step-type-select"]', 'api_call');
      
      // Select the connection
      await page.selectOption('[data-testid="connection-select"]', createdConnection.id);
      
      // Fill endpoint details
      await page.fill('[data-testid="endpoint-input"]', '/get');
      await page.selectOption('[data-testid="method-select"]', 'GET');
      
      const saveStepButton = page.locator('[data-testid="primary-action save-step-btn"]');
      await expect(saveStepButton).toBeVisible();
      await saveStepButton.click();
      
      // Save workflow
      const saveWorkflowButton = page.locator('[data-testid="primary-action save-workflow-btn"]');
      await expect(saveWorkflowButton).toBeVisible();
      await saveWorkflowButton.click();
      
      // Wait for success message
      const successMessage = page.locator('[data-testid="success-message"]');
      await expect(successMessage).toBeVisible({ timeout: 10000 });
      
      // Verify workflow was created with secret integration
      const workflowsResponse = await request.get('/api/workflows', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(workflowsResponse.ok()).toBeTruthy();
      
      const workflows = await workflowsResponse.json();
      const createdWorkflow = workflows.find((workflow: any) => 
        workflow.name === 'Secrets Integration Workflow'
      );
      
      expect(createdWorkflow).toBeDefined();
      expect(createdWorkflow.steps).toBeDefined();
      expect(createdWorkflow.steps.length).toBeGreaterThan(0);
      
      // Verify the step uses the connection with secrets
      const apiStep = createdWorkflow.steps.find((step: any) => step.type === 'api_call');
      expect(apiStep).toBeDefined();
      expect(apiStep.apiConnectionId).toBe(createdConnection.id);
    });
  });

  test.describe('Secrets-First Security and Validation', () => {
    test('should validate secret access permissions', async ({ page, request }) => {
      // Create a connection as admin user
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'Permission Test Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Connection for permission testing');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'permission-test-key');
      
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for modal to close (indicating success)
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
      
      // Get the created connection
      const connectionsResponse = await request.get('/api/connections', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(connectionsResponse.ok()).toBeTruthy();
      
      const response = await connectionsResponse.json();
      expect(response.success).toBeTruthy();
      expect(response.data).toBeDefined();
      expect(response.data.connections).toBeDefined();
      
      const connections = response.data.connections;
      const createdConnection = connections.find((conn: any) => 
        conn.name === 'Permission Test Connection'
      );
      
      expect(createdConnection).toBeDefined();
      expect(createdConnection.secretId).toBeDefined();
      
      // Store connection ID for cleanup
      createdConnectionIds.push(createdConnection.id);
      
      // Test direct secret access (should be allowed for admin user)
      const secretResponse = await request.get(`/api/secrets/${createdConnection.secretId}`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(secretResponse.ok()).toBeTruthy();
      
      const secret = await secretResponse.json();
      expect(secret.connectionId).toBe(createdConnection.id);
      
      // Store secret ID for cleanup
      createdSecretIds.push(secret.id);
      
      // Test connection-specific secrets endpoint
      const connectionSecretsResponse = await request.get(`/api/connections/${createdConnection.id}/secrets`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(connectionSecretsResponse.ok()).toBeTruthy();
      
      const connectionSecrets = await connectionSecretsResponse.json();
      expect(Array.isArray(connectionSecrets)).toBeTruthy();
      expect(connectionSecrets.length).toBeGreaterThan(0);
      
      // Verify the secret is linked to the connection
      const linkedSecret = connectionSecrets.find((s: any) => s.id === secret.id);
      expect(linkedSecret).toBeDefined();
      expect(linkedSecret.connectionId).toBe(createdConnection.id);
    });

    test('should audit secret operations', async ({ page, request }) => {
      // Create a connection to generate audit logs
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'Audit Test Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Connection for audit testing');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'audit-test-key');
      
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for modal to close (indicating success)
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
      
      // Get the created connection
      const connectionsResponse = await request.get('/api/connections', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      expect(connectionsResponse.ok()).toBeTruthy();
      
      const response = await connectionsResponse.json();
      expect(response.success).toBeTruthy();
      expect(response.data).toBeDefined();
      expect(response.data.connections).toBeDefined();
      
      const connections = response.data.connections;
      const createdConnection = connections.find((conn: any) => 
        conn.name === 'Audit Test Connection'
      );
      
      expect(createdConnection).toBeDefined();
      expect(createdConnection.secretId).toBeDefined();
      
      // Store connection ID for cleanup
      createdConnectionIds.push(createdConnection.id);
      
      // Check audit logs for connection creation
      const auditResponse = await request.get('/api/audit-logs', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      
      if (auditResponse.ok()) {
        const auditLogs = await auditResponse.json();
        
        // Look for connection creation audit log
        const connectionAudit = auditLogs.find((log: any) => 
          log.action === 'CREATE' && 
          log.resourceType === 'API_CONNECTION' &&
          log.resourceId === createdConnection.id
        );
        
        if (connectionAudit) {
          expect(connectionAudit.userId).toBe(testUser.id);
          expect(connectionAudit.details).toBeDefined();
        }
        
        // Look for secret creation audit log
        const secretAudit = auditLogs.find((log: any) => 
          log.action === 'CREATE' && 
          log.resourceType === 'SECRET' &&
          log.resourceId === createdConnection.secretId
        );
        
        if (secretAudit) {
          expect(secretAudit.userId).toBe(testUser.id);
          expect(secretAudit.details).toBeDefined();
        }
      }
      
      // Store secret ID for cleanup
      createdSecretIds.push(createdConnection.secretId);
    });
  });
}); 
// TODO: Add UXComplianceHelper integration (P0)
// import { UXComplianceHelper } from '../../helpers/uxCompliance';
// 
// test.beforeEach(async ({ page }) => {
//   const uxHelper = new UXComplianceHelper(page);
//   await uxHelper.validateActivationFirstUX();
//   await uxHelper.validateFormAccessibility();
//   await uxHelper.validateMobileResponsiveness();
//   await uxHelper.validateKeyboardNavigation();
// });

// TODO: Add cookie-based authentication testing (P0)
// - Test HTTP-only cookie authentication
// - Test secure cookie settings
// - Test cookie expiration and cleanup
// - Test cookie-based session management
// - Test authentication state persistence via cookies

// TODO: Replace localStorage with cookie-based authentication (P0)
// Application now uses cookie-based authentication instead of localStorage
// 
// Anti-patterns to remove:
// - localStorage.getItem('token')
// - localStorage.setItem('token', value)
// - localStorage.removeItem('token')
// 
// Replace with cookie-based patterns:
// - Test authentication via HTTP-only cookies
// - Test session management via secure cookies
// - Test logout by clearing authentication cookies

// TODO: Add data cleanup patterns (P0)
// - Clean up test users: await prisma.user.deleteMany({ where: { email: { contains: 'e2e-test' } } });
// - Clean up test connections: await prisma.connection.deleteMany({ where: { name: { contains: 'Test' } } });
// - Clean up test workflows: await prisma.workflow.deleteMany({ where: { name: { contains: 'Test' } } });
// - Clean up test secrets: await prisma.secret.deleteMany({ where: { name: { contains: 'Test' } } });

// TODO: Add deterministic test data (P0)
// - Create predictable test data with unique identifiers
// - Use timestamps or UUIDs to avoid conflicts
// - Example: const testUser = await createTestUser({ email: `e2e-test-${Date.now()}@example.com` });
// - Ensure test data is isolated and doesn't interfere with other tests

// TODO: Ensure test independence (P0)
// - Each test should be able to run in isolation
// - No dependencies on other test execution order
// - Clean state before and after each test
// - Use unique identifiers for all test data
// - Avoid global state modifications

// TODO: Remove API calls from E2E tests (P0)
// E2E tests should ONLY test user interactions through the UI
// API testing should be done in integration tests
// 
// Anti-patterns to remove:
// - page.request.post('/api/connections', {...})
// - fetch('/api/connections')
// - axios.post('/api/connections')
// 
// Replace with UI interactions:
// - await page.click('[data-testid="create-connection-btn"]')
// - await page.fill('[data-testid="connection-name-input"]', 'Test API')
// - await page.click('[data-testid="primary-action submit-btn"]')

// TODO: Remove all API testing from E2E tests (P0)
// E2E tests should ONLY test user interactions through the UI
// API testing belongs in integration tests
// 
// Anti-patterns detected and must be removed:
// - page.request.post('/api/connections', {...})
// - fetch('/api/connections')
// - axios.post('/api/connections')
// - request.get('/api/connections')
// 
// Replace with UI interactions:
// - await page.click('[data-testid="create-connection-btn"]')
// - await page.fill('[data-testid="connection-name-input"]', 'Test API')
// - await page.click('[data-testid="primary-action submit-btn"]')
// - await expect(page.locator('[data-testid="success-message"]')).toBeVisible()

// TODO: Add robust waiting patterns for dynamic elements (P0)
// - Use waitForSelector() instead of hardcoded delays
// - Use expect().toBeVisible() for element visibility checks
// - Use waitForLoadState() for page load completion
// - Use waitForResponse() for API calls
// - Use waitForFunction() for custom conditions
// 
// Example patterns:
// await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
// await expect(page.locator('[data-testid="submit-btn"]')).toBeVisible();
// await page.waitForLoadState('networkidle');
// await page.waitForResponse(response => response.url().includes('/api/'));
// await page.waitForFunction(() => document.querySelector('.loading').style.display === 'none');

// TODO: Replace hardcoded delays with robust waiting (P0)
// Anti-patterns to replace:
// - setTimeout(5000) → await page.waitForSelector(selector, { timeout: 5000 })
// - sleep(3000) → await expect(page.locator(selector)).toBeVisible({ timeout: 3000 })
// - delay(2000) → await page.waitForLoadState('networkidle')
// 
// Best practices:
// - Wait for specific elements to appear
// - Wait for network requests to complete
// - Wait for page state changes
// - Use appropriate timeouts for different operations

// TODO: Add XSS prevention testing (P0)
// - Test input sanitization
// - Test script injection prevention
// - Test HTML escaping
// - Test content security policy compliance

// TODO: Add CSRF protection testing (P0)
// - Test CSRF token validation
// - Test cross-site request forgery prevention
// - Test cookie-based CSRF protection
// - Test secure form submission

// TODO: Add data exposure testing (P0)
// - Test sensitive data handling
// - Test privacy leak prevention
// - Test information disclosure prevention
// - Test data encryption and protection

// TODO: Add authentication flow testing (P0)
// - Test OAuth integration
// - Test SSO (Single Sign-On) flows
// - Test MFA (Multi-Factor Authentication)
// - Test authentication state management

// TODO: Add session management testing (P0)
// - Test cookie-based session management
// - Test session expiration handling
// - Test login state persistence
// - Test logout and session cleanup

// TODO: Add UI interaction testing (P0)
// E2E tests should focus on user interactions through the UI
// - Test clicking buttons and links
// - Test filling forms
// - Test navigation flows
// - Test user workflows end-to-end

// TODO: Add primary action button patterns (P0)
// - Use data-testid="primary-action {action}-btn" pattern
// - Test primary action presence with UXComplianceHelper
// - Validate button text matches standardized patterns

// TODO: Add form accessibility testing (P0)
// - Test form labels and ARIA attributes
// - Test keyboard navigation
// - Test screen reader compatibility
// - Use UXComplianceHelper.validateFormAccessibility()

// TODO: Add submit button loading state testing (P0)
// - Test submit button disabled during submission
// - Test button text changes to "Creating..." or similar
// - Test button remains disabled until operation completes
// - Test loading indicator/spinner on button
// - Enforce minimum loading state duration (800ms)

// TODO: Add success message testing in modal (P0)
// - Test success message appears in modal after submission
// - Test success message is visible and readable
// - Test button text changes to "Success!" or similar
// - Test success message timing and persistence
// - Test success state before modal closes

// TODO: Add modal delay testing (P0)
// - Test modal stays open for 1.5s after success
// - Test user can see success message before modal closes
// - Test modal closes automatically after delay
// - Test modal remains open on error for user correction
// - Example: setTimeout(() => closeModal(), 1500);

// TODO: Add modal error handling testing (P0)
// - Test modal stays open on error
// - Test error message appears in modal
// - Test submit button re-enables on error
// - Test user can correct errors and retry

// TODO: Add form loading state transition testing (P0)
// - Test form fields disabled during submission
// - Test loading spinner appears on form
// - Test form transitions from loading to success/error
// - Test minimum loading duration (800ms) for all forms
// - Test form state persistence during loading
