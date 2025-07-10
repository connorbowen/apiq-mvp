import { test, expect } from '../../helpers/serverHealthCheck';
import { createTestUser, cleanupTestUser, generateTestId, TestUser } from '../../helpers/testUtils';
import { UXComplianceHelper } from '../../helpers/uxCompliance';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: TestUser;
let jwt: string;
const createdConnectionIds: string[] = [];

test.describe('Connections Management E2E Tests', () => {
  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-conn-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Connections Test User'
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
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    const uxHelper = new UXComplianceHelper(page);
    
    // Login before each test
    await page.goto(`${BASE_URL}/login`);
    
    // Add UX compliance validation for login page
    await uxHelper.validatePageTitle('APIQ');
    await uxHelper.validateHeadingHierarchy(['Sign in to APIQ']);
    await uxHelper.validateFormAccessibility();
    
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', 'e2eTestPass123');
    
    // Fix primary action data-testid pattern for login
    await page.getByTestId('primary-action signin-btn').click();
    
    // Wait for successful login and redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Add UX compliance validation for dashboard
    await uxHelper.validateHeadingHierarchy(['Dashboard']);
    
    // Navigate to connections tab
    await page.click('[data-testid="tab-connections"]');
    
    // Add comprehensive UX compliance validation
    await uxHelper.validateHeadingHierarchy(['Dashboard', 'API Connections']);
    await uxHelper.validateFormAccessibility();
    
    // Validate UX compliance - heading hierarchy
    await expect(page.locator('h1')).toHaveText('Dashboard');
    await expect(page.locator('h2')).toHaveText('API Connections');
    
    // Refresh the page to ensure clean state for each test
    await page.reload();
    await page.click('[data-testid="tab-connections"]');
  });

  test.describe('Connection CRUD Operations', () => {
    test('should create a new API connection with UX compliance', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // Click create connection button
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      // Add comprehensive UX compliance validation
      await uxHelper.validateHeadingHierarchy(['Add API Connection']);
      await uxHelper.validateFormAccessibility();
      await uxHelper.validateActivationFirstUX();
      
      // Validate UX compliance - heading hierarchy for create form
      await expect(page.locator('h2:has-text("Add API Connection")')).toBeVisible();
      
      // Validate UX compliance - accessible form fields
      const nameInput = page.locator('[data-testid="connection-name-input"]');
      const descriptionInput = page.locator('[data-testid="connection-description-input"]');
      const baseUrlInput = page.locator('[data-testid="connection-baseurl-input"]');
      
      await expect(nameInput).toBeVisible();
      await expect(descriptionInput).toBeVisible();
      await expect(baseUrlInput).toBeVisible();
      
      // Validate UX compliance - required field indicators
      await expect(nameInput).toHaveAttribute('aria-required', 'true');
      await expect(baseUrlInput).toHaveAttribute('aria-required', 'true');
      
      // Fill form fields using data-testid selectors
      await nameInput.fill('Test API Connection');
      await descriptionInput.fill('A test API connection');
      await baseUrlInput.fill('https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'test-api-key-123');
      
      // Validate UX compliance - descriptive button text
      await expect(page.locator('[data-testid="primary-action submit-connection-btn"]')).toHaveText('Create Connection');
      
      // Submit form
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Validate UX compliance - loading state
      await expect(page.locator('[data-testid="primary-action submit-connection-btn"]')).toBeDisabled();
      await expect(page.locator('[data-testid="primary-action submit-connection-btn"]')).toHaveText('Creating...');
      
      // Wait for form processing
      await page.waitForTimeout(2000);
      
      // Add comprehensive success message validation
      await uxHelper.validateSuccessContainer('Connection created successfully');
      
      // Validate UX compliance - success message in accessible container
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('.bg-green-50')).toBeVisible();
      
      // Should show the new connection in the list
      await expect(page.locator('[data-testid="connection-card"]:has-text("Test API Connection")')).toBeVisible();
    });

    test('should create connection with Bearer token auth', async ({ page }) => {
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'Bearer Token Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Bearer token test connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'BEARER_TOKEN');
      await page.fill('[data-testid="connection-bearertoken-input"]', 'test-bearer-token-123');
      
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for form processing
      await page.waitForTimeout(2000);
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-card"]:has-text("Bearer Token Connection")')).toBeVisible();
    });

    test('should create connection with Basic auth', async ({ page }) => {
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'Basic Auth Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Basic auth test connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'BASIC_AUTH');
      await page.fill('[data-testid="connection-username-input"]', 'testuser');
      await page.fill('[data-testid="connection-password-input"]', 'testpass');
      
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for form processing
      await page.waitForTimeout(2000);
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-card"]:has-text("Basic Auth Connection")')).toBeVisible();
    });

    test('should create connection with OAuth2 provider selection', async ({ page }) => {
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'GitHub OAuth2 Connection');
      await page.fill('[data-testid="connection-description-input"]', 'GitHub OAuth2 test connection');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      
      // Select GitHub provider
      await page.selectOption('[data-testid="connection-provider-select"]', 'github');
      
      // Verify auto-populated fields
      await expect(page.locator('[data-testid="connection-baseurl-input"]')).toHaveValue('https://api.github.com');
      await expect(page.locator('[data-testid="connection-scope-input"]')).toHaveValue('repo user');
      await expect(page.locator('[data-testid="connection-redirecturi-input"]')).toHaveValue('http://localhost:3000/api/oauth/callback');
      
      // Fill OAuth2 credentials
      await page.fill('[data-testid="connection-clientid-input"]', 'test-github-client-id');
      await page.fill('[data-testid="connection-clientsecret-input"]', 'test-github-client-secret');
      
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for form processing
      await page.waitForTimeout(2000);
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-card"]:has-text("GitHub OAuth2 Connection")')).toBeVisible();
    });

    test('should create connection with custom OAuth2 provider', async ({ page }) => {
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'Custom OAuth2 Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Custom OAuth2 test connection');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      
      // Select custom provider
      await page.selectOption('[data-testid="connection-provider-select"]', 'custom');
      
      // Fill all required fields manually
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.custom.com');
      await page.fill('[data-testid="connection-clientid-input"]', 'test-custom-client-id');
      await page.fill('[data-testid="connection-clientsecret-input"]', 'test-custom-client-secret');
      await page.fill('[data-testid="connection-redirecturi-input"]', 'http://localhost:3000/api/oauth/callback');
      await page.fill('[data-testid="connection-scope-input"]', 'read write');
      
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for form processing
      await page.waitForTimeout(2000);
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-card"]:has-text("Custom OAuth2 Connection")')).toBeVisible();
    });

    test('should edit an existing connection', async ({ page }) => {
      // TODO: Implement edit functionality
      // This test is skipped because edit functionality is not yet implemented
      const uxHelper = new UXComplianceHelper(page);
      
      // First create a connection to edit
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'Connection to Edit');
      await page.fill('[data-testid="connection-description-input"]', 'Connection to be edited');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      await page.waitForTimeout(2000);
      
      // Find and click edit button for the created connection
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("Connection to Edit")');
      await connectionCard.locator('[data-testid="edit-connection-btn"]').click();
      
      // Validate edit form UX compliance
      await uxHelper.validateHeadingHierarchy(['Edit API Connection']);
      await uxHelper.validateFormAccessibility();
      
      // Modify the connection
      await page.fill('[data-testid="connection-name-input"]', 'Connection to Edit - Updated');
      await page.fill('[data-testid="connection-description-input"]', 'Updated description');
      
      // Submit the edit
      await page.click('[data-testid="primary-action update-connection-btn"]');
      
      // Wait for update processing
      await page.waitForTimeout(2000);
      
      // Validate success message
      await uxHelper.validateSuccessContainer('Connection updated successfully');
      
      // Should show the updated connection in the list
      await expect(page.locator('[data-testid="connection-card"]:has-text("Connection to Edit - Updated")')).toBeVisible();
    });

    test('should delete a connection', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // First create a connection to delete
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'Connection to Delete');
      await page.fill('[data-testid="connection-description-input"]', 'Connection to be deleted');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      await page.waitForTimeout(2000);
      
      // Find and click delete button for the created connection
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("Connection to Delete")');
      await connectionCard.locator('[data-testid="delete-connection-btn"]').click();
      
      // Validate confirmation dialog UX compliance
      await uxHelper.validateConfirmationDialogs();
      
      // Confirm deletion
      await page.click('[data-testid="primary-action confirm-delete-btn"]');
      
      // Wait for deletion processing
      await page.waitForTimeout(2000);
      
      // Validate success message
      await uxHelper.validateSuccessContainer('Connection deleted successfully');
      
      // Should not show the deleted connection in the list
      await expect(page.locator('[data-testid="connection-card"]:has-text("Connection to Delete")')).not.toBeVisible();
    });

    test('should cancel connection deletion', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // First create a connection
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'Connection to Cancel Delete');
      await page.fill('[data-testid="connection-description-input"]', 'Connection for cancel delete test');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      await page.waitForTimeout(2000);
      
      // Find and click delete button
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("Connection to Cancel Delete")');
      await connectionCard.locator('[data-testid="delete-connection-btn"]').click();
      
      // Validate confirmation dialog
      await uxHelper.validateConfirmationDialogs();
      
      // Cancel deletion
      await page.click('[data-testid="cancel-delete-btn"]');
      
      // Should still show the connection in the list
      await expect(page.locator('[data-testid="connection-card"]:has-text("Connection to Cancel Delete")')).toBeVisible();
    });
  });

  test.describe('UX Compliance & Accessibility', () => {
    test('should have accessible form fields and keyboard navigation', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // Click create connection button
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      // Add comprehensive UX compliance validation
      await uxHelper.validateHeadingHierarchy(['Add API Connection']);
      await uxHelper.validateFormAccessibility();
      
      // Validate UX compliance - heading hierarchy
      await expect(page.locator('h2:has-text("Add API Connection")')).toBeVisible();
      
      // Test auto-focus on modal open
      const nameInput = page.locator('[data-testid="connection-name-input"]');
      await expect(nameInput).toBeFocused();
      
      // Add comprehensive keyboard navigation testing
      // Test keyboard navigation - Tab should move to next element
      await page.keyboard.press('Tab');
      const descriptionInput = page.locator('[data-testid="connection-description-input"]');
      await expect(descriptionInput).toBeFocused();
      
      // Add complete keyboard navigation through entire form
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="connection-baseurl-input"]')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="connection-authtype-select"]')).toBeFocused();
      
      // Test form field accessibility
      await expect(nameInput).toHaveAttribute('aria-required', 'true');
      await expect(nameInput).toHaveAttribute('type', 'text');
      
      // Test ARIA labels
      await expect(descriptionInput).toHaveAttribute('aria-label');
      
      // Add comprehensive ARIA attribute validation
      await expect(page.locator('[data-testid="connection-baseurl-input"]')).toHaveAttribute('aria-required', 'true');
      await expect(page.locator('form')).toHaveAttribute('role', 'form');
      
      // Test form validation accessibility
      await nameInput.fill('');
      await page.keyboard.press('Tab');
      await expect(page.locator('[role="alert"]')).toBeVisible();
      
      // Add escape key testing for modal closure
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="primary-action create-connection-header-btn"]')).toBeVisible();
    });

    test('should handle form validation errors with accessible messaging', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // Form validation error handling has been improved with ARIA attributes and field-level errors
      // Click create connection button
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      // Try to submit empty form
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Add comprehensive error container validation
      await uxHelper.validateErrorContainer(/required|fill in/i);
      
      // Validate UX compliance - accessible error containers
      await expect(page.locator('[role="alert"]').first()).toBeVisible();
      await expect(page.locator('[role="alert"]').first()).toContainText(/required|fill in/i);
      
      // Test error message clarity
      await expect(page.locator('[role="alert"]:not([id="__next-route-announcer__"])').first()).toContainText(/name.*required|connection name/i);
    });

    test('should have mobile responsive design', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Click create connection button
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      // Add comprehensive mobile responsiveness validation
      await uxHelper.validateMobileResponsiveness();
      await uxHelper.validateMobileAccessibility();
      
      // Validate mobile layout
      await expect(page.locator('[data-testid="connection-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="primary-action submit-connection-btn"]')).toBeVisible();
      
      // Add touch target size validation
      const submitBtn = page.locator('[data-testid="primary-action submit-connection-btn"]');
      const box = await submitBtn.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      
      // Test mobile form interaction
      await page.locator('[data-testid="connection-name-input"]').fill('Mobile Test Connection');
      await expect(page.locator('[data-testid="connection-name-input"]')).toHaveValue('Mobile Test Connection');
    });
  });

  test.describe('Security Edge Cases', () => {
    test('should validate input sanitization', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      // Test XSS attempt in connection name
      await page.fill('[data-testid="connection-name-input"]', '<script>alert("xss")</script>');
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Should handle malicious input gracefully
      await uxHelper.validateErrorContainer(/invalid|unsafe/i);
    });

    test('should handle rate limiting', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // Test multiple rapid connection creation attempts
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="primary-action create-connection-header-btn"]');
        await page.fill('[data-testid="connection-name-input"]', `Rate Limit Test ${i}`);
        await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
        await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
        await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
        await page.click('[data-testid="primary-action submit-connection-btn"]');
        await page.waitForTimeout(500); // Quick submissions
      }
      
      // Should show rate limit error
      await uxHelper.validateErrorContainer(/rate limit|too many requests/i);
    });

    test('should validate HTTPS requirements', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // Test HTTP URL (should be rejected)
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'Test Connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'http://insecure-api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
      
      // Try to submit the form to trigger validation
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Should show security error
      await expect(page.locator('[data-testid="baseUrl-error"]')).toContainText('HTTPS is required for security');
    });
  });

  test.describe('Performance Validation', () => {
    test('should meet page load performance requirements', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      const startTime = Date.now();
      await page.goto(`${BASE_URL}/dashboard`);
      await page.click('[data-testid="tab-connections"]');
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
      
      // Validate performance requirements
      await uxHelper.validatePerformanceRequirements();
    });

    test('should handle concurrent connection creation', async ({ context }) => {
      // Test multiple concurrent connection creation requests
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 3; i++) {
        const newPage = await context.newPage();
        promises.push(
          newPage.click('[data-testid="primary-action create-connection-header-btn"]').then(() => {
            return newPage.fill('[data-testid="connection-name-input"]', `Test API ${i}`);
          })
        );
      }
      
      await Promise.all(promises);
      // Should handle concurrent requests without errors
    });
  });

  test.describe('Accessibility Compliance', () => {
    test('should have proper ARIA attributes', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      // Test ARIA attributes
      await expect(page.locator('[data-testid="connection-name-input"]')).toHaveAttribute('aria-required', 'true');
      await expect(page.locator('[data-testid="connection-baseurl-input"]')).toHaveAttribute('aria-required', 'true');
      
      // Test form labels
      await expect(page.locator('label[for="connection-name"]')).toContainText('Connection Name');
      
      // Validate comprehensive ARIA compliance
      await uxHelper.validateARIACompliance();
    });

    test('should support screen readers', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      // Test semantic HTML structure
      await expect(page.locator('form')).toHaveAttribute('role', 'form');
      await expect(page.locator('[data-testid="connection-name-input"]')).toHaveAttribute('aria-label');
      
      // Validate screen reader compatibility
      await uxHelper.validateScreenReaderCompatibility();
    });
  });

  test.describe('OAuth2 Connection Management', () => {
    test('should create OAuth2 connection with GitHub provider', async ({ page }) => {
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'GitHub OAuth2 Connection');
      await page.fill('[data-testid="connection-description-input"]', 'GitHub OAuth2 test connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.github.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      await page.selectOption('[data-testid="connection-provider-select"]', 'github');
      await page.fill('[data-testid="connection-clientid-input"]', 'test-github-client-id');
      await page.fill('[data-testid="connection-clientsecret-input"]', 'test-github-client-secret');
      await page.fill('[data-testid="connection-redirecturi-input"]', 'http://localhost:3000/api/oauth/callback');
      await page.fill('[data-testid="connection-scope-input"]', 'repo user');
      
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for form processing
      await page.waitForTimeout(2000);
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Should show the connection in the list
      await expect(page.locator('[data-testid="connection-card"]:has-text("GitHub OAuth2 Connection")')).toBeVisible();
    });

    test('should create OAuth2 connection with Google provider', async ({ page }) => {
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      await page.fill('[data-testid="connection-name-input"]', 'Google OAuth2 Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Google OAuth2 test connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://www.googleapis.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      await page.selectOption('[data-testid="connection-provider-select"]', 'google');
      await page.fill('[data-testid="connection-clientid-input"]', 'test-google-client-id');
      await page.fill('[data-testid="connection-clientsecret-input"]', 'test-google-client-secret');
      await page.fill('[data-testid="connection-redirecturi-input"]', 'http://localhost:3000/api/oauth/callback');
      await page.fill('[data-testid="connection-scope-input"]', 'https://www.googleapis.com/auth/calendar');
      
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for form processing
      await page.waitForTimeout(2000);
      
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-card"]:has-text("Google OAuth2 Connection")')).toBeVisible();
    });

    test('should handle OAuth2 callback and complete connection', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // Create OAuth2 connection
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'OAuth2 Callback Test');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      await page.selectOption('[data-testid="connection-provider-select"]', 'github');
      await page.fill('[data-testid="connection-clientid-input"]', 'test-client-id');
      await page.fill('[data-testid="connection-clientsecret-input"]', 'test-client-secret');
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      await page.waitForTimeout(2000);
      
      // Click authorize button to start OAuth2 flow
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("OAuth2 Callback Test")');
      await connectionCard.locator('[data-testid="authorize-oauth2-btn"]').click();
      
      // Should redirect to OAuth2 provider
      await expect(page).toHaveURL(/github\.com/);
      
      // Simulate OAuth2 callback (this would normally come from the provider)
      await page.goto(`${BASE_URL}/api/oauth/callback?code=test-code&state=test-state`);
      
      // Should show success message
      await uxHelper.validateSuccessContainer('OAuth2 authorization completed');
      
      // Connection should show as authorized
      await expect(connectionCard.locator('[data-testid="connection-status"]')).toHaveText('Authorized');
    });

    test('should handle OAuth2 token refresh', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // Create OAuth2 connection
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'OAuth2 Token Refresh Test');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      await page.selectOption('[data-testid="connection-provider-select"]', 'github');
      await page.fill('[data-testid="connection-clientid-input"]', 'test-client-id');
      await page.fill('[data-testid="connection-clientsecret-input"]', 'test-client-secret');
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      await page.waitForTimeout(2000);
      
      // Click refresh token button
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("OAuth2 Token Refresh Test")');
      await connectionCard.locator('[data-testid="refresh-token-btn"]').click();
      
      // Should show loading state
      await expect(connectionCard.locator('[data-testid="refresh-token-btn"]')).toBeDisabled();
      
      // Wait for refresh to complete
      await page.waitForTimeout(2000);
      
      // Should show success message
      await uxHelper.validateSuccessContainer('Token refreshed successfully');
      
      // Connection should show as active
      await expect(connectionCard.locator('[data-testid="connection-status"]')).toHaveText('Active');
    });
  });

  test.describe('Connection Testing', () => {
    test('should test API connection successfully', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // First create a connection
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'Test Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Connection for testing');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for connection to be created
      await page.waitForTimeout(2000);
      
      // Test connection functionality
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("Test Connection")');
      await connectionCard.locator('[data-testid="test-connection-list-btn"]').click();
      
      // Should show loading state
      await expect(connectionCard.locator('[data-testid="test-connection-list-btn"]')).toBeDisabled();
      
      // Wait for test to complete
      await page.waitForTimeout(3000);
      
      // Should show success result
      await expect(page.locator('[data-testid="test-result"]')).toContainText('Connection successful');
      await uxHelper.validateSuccessContainer('Connection test passed');
    });

    test('should handle connection test failure', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // First create a connection with invalid URL
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'Connection with invalid URL');
      await page.fill('[data-testid="connection-description-input"]', 'Connection with invalid URL');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://invalid-api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'invalid-key');
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for connection to be created
      await page.waitForTimeout(2000);
      
      // Test connection functionality
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("Connection with invalid URL")');
      await connectionCard.locator('[data-testid="test-connection-list-btn"]').click();
      
      // Wait for test to complete
      await page.waitForTimeout(3000);
      
      // Should show failure result
      await expect(page.locator('[data-testid="test-result"]')).toContainText('Connection failed');
      await uxHelper.validateErrorContainer(/connection failed|unable to connect/i);
    });
  });

  test.describe('Connection Search and Filter', () => {
    test('should search connections by name', async ({ page }) => {
      // Create multiple connections first
      const connections = [
        { name: 'Search Test Connection 1', description: 'First test connection' },
        { name: 'Search Test Connection 2', description: 'Second test connection' },
        { name: 'Different Name Connection', description: 'Third test connection' }
      ];

      for (const connection of connections) {
        await page.click('[data-testid="primary-action create-connection-header-btn"]');
        await page.fill('[data-testid="connection-name-input"]', connection.name);
        await page.fill('[data-testid="connection-description-input"]', connection.description);
        await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
        await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
        await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
        await page.click('[data-testid="primary-action submit-connection-btn"]');
        await page.waitForTimeout(1000);
      }

      // Search for connections containing "Search Test"
      await page.fill('[data-testid="search-connections"]', 'Search Test');
      
      // Should show only connections with "Search Test" in the name
      await expect(page.locator('[data-testid="connection-card"]:has-text("Search Test Connection 1")')).toBeVisible();
      await expect(page.locator('[data-testid="connection-card"]:has-text("Search Test Connection 2")')).toBeVisible();
      await expect(page.locator('[data-testid="connection-card"]:has-text("Different Name Connection")')).not.toBeVisible();
    });

    test('should filter connections by auth type', async ({ page }) => {
      // Create connections with different auth types
      const authTypes = [
        { type: 'API_KEY', name: 'API Key Connection' },
        { type: 'BEARER_TOKEN', name: 'Bearer Token Connection' },
        { type: 'BASIC_AUTH', name: 'Basic Auth Connection' }
      ];

      for (const auth of authTypes) {
        await page.click('[data-testid="primary-action create-connection-header-btn"]');
        await page.fill('[data-testid="connection-name-input"]', `${auth.type} test connection`);
        await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
        await page.selectOption('[data-testid="connection-authtype-select"]', auth.type);
        
        // Fill auth-specific fields
        if (auth.type === 'API_KEY') {
          await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
        } else if (auth.type === 'BEARER_TOKEN') {
          await page.fill('[data-testid="connection-bearertoken-input"]', 'test-token');
        } else if (auth.type === 'BASIC_AUTH') {
          await page.fill('[data-testid="connection-username-input"]', 'testuser');
          await page.fill('[data-testid="connection-password-input"]', 'testpass');
        }
        
        await page.click('[data-testid="primary-action submit-connection-btn"]');
        await page.waitForTimeout(1000);
      }

      // Filter by API Key
      await page.selectOption('[data-testid="filter-dropdown"]', 'API_KEY');
      
      // Should show only API Key connections
      await expect(page.locator('[data-testid="connection-card"]:has-text("API_KEY test connection")')).toBeVisible();
      await expect(page.locator('[data-testid="connection-card"]:has-text("BEARER_TOKEN test connection")')).not.toBeVisible();
      await expect(page.locator('[data-testid="connection-card"]:has-text("BASIC_AUTH test connection")')).not.toBeVisible();
    });
  });

  test.describe('Connection Status Monitoring', () => {
    test('should monitor connection status and health', async ({ page }) => {
      // Create a connection
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'Connection for status monitoring');
      await page.fill('[data-testid="connection-description-input"]', 'Connection for status monitoring');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for connection to be created
      await page.waitForTimeout(2000);
      
      // Should show connection with ACTIVE status
      await expect(page.locator('[data-testid="connection-card"]:has-text("Connection for status monitoring")')).toBeVisible();
      
      // Check status indicator
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("Connection for status monitoring")');
      await expect(connectionCard.locator('[data-testid="connection-status"]')).toHaveText('Active');
    });

    test('should handle connection status errors gracefully', async ({ page }) => {
      // Create a connection with invalid URL
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'Connection with potential errors');
      await page.fill('[data-testid="connection-description-input"]', 'Connection with potential errors');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://invalid-api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'invalid-key');
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for connection to be created
      await page.waitForTimeout(2000);
      
      // Should still show the connection (even if it has errors)
      await expect(page.locator('[data-testid="connection-card"]:has-text("Connection with potential errors")')).toBeVisible();
      
      // Check error status indicator
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("Connection with potential errors")');
      await expect(connectionCard.locator('[data-testid="connection-status"]')).toHaveText('Error');
    });
  });

  test.describe('Connection Performance Testing', () => {
    test('should measure connection response time', async ({ page }) => {
      const uxHelper = new UXComplianceHelper(page);
      
      // Create a connection
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      await page.fill('[data-testid="connection-name-input"]', 'Connection for performance testing');
      await page.fill('[data-testid="connection-description-input"]', 'Connection for performance testing');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'test-key');
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for connection to be created
      await page.waitForTimeout(2000);
      
      // Performance testing functionality
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("Connection for performance testing")');
      await connectionCard.locator('[data-testid="test-connection-list-btn"]').click();
      
      // Wait for test to complete
      await page.waitForTimeout(3000);
      
      // Should show response time
      await expect(page.locator('[data-testid="response-time"]')).toBeVisible();
      
      // Validate performance requirements
      await uxHelper.validatePerformanceRequirements();
    });
  });
}); 