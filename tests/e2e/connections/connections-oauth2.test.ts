// E2E Tests for OAuth2 Connection Management
// Tests OAuth2 connection creation, provider selection, and token management

import { test, expect } from '../../helpers/serverHealthCheck';
import { TestUser, generateTestId, cleanupTestUser } from '../../helpers/testUtils';
import { closeAllModals, resetRateLimits, getPrimaryActionButton, completeTestTeardown, setupE2E } from '../../helpers/e2eHelpers';
import { createE2EUser } from '../../helpers/authHelpers';
import { validateUXCompliance } from '../../helpers/uiHelpers';
import { testConnectionCreation, testConnectionCreationWithValidation } from '../../helpers/dataHelpers';
import { testModalSuccessMessage } from '../../helpers/modalHelpers';
import { waitForMessage } from '../../helpers/waitHelpers';
import { Role } from '../../../src/generated/prisma';

let testUser: TestUser;
let jwt: string;
const createdConnectionIds: string[] = [];

// Helper function to track created connections for cleanup
const trackConnection = (connectionId: string) => {
  createdConnectionIds.push(connectionId);
  console.log(`🔗 Tracked OAuth2 connection: ${connectionId} (total: ${createdConnectionIds.length})`);
};

test.describe('OAuth2 Connection Management E2E Tests', () => {
  test.beforeAll(async () => {
    testUser = await createE2EUser(Role.ADMIN, {
      email: `e2e-conn-oauth2-${generateTestId('user')}@example.com`,
      password: 'e2eTestPass123',
      name: 'E2E OAuth2 Connections Test User'
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
        console.log(`🗑️ Cleaned up OAuth2 connection: ${id}`);
      } catch (error) {
        console.warn(`Failed to cleanup OAuth2 connection ${id}:`, error);
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

  test.describe('OAuth2 Connection Creation', () => {
    test('should create OAuth2 connection with GitHub provider', async ({ page }) => {
      await getPrimaryActionButton(page, 'create-connection-header').click();
      
      await page.fill('[data-testid="connection-name-input"]', 'GitHub OAuth2 Connection');
      await page.fill('[data-testid="connection-description-input"]', 'GitHub OAuth2 test connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.github.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      await page.selectOption('[data-testid="connection-provider-select"]', 'github');
      await page.fill('[data-testid="connection-clientid-input"]', 'test-github-client-id');
      await page.fill('[data-testid="connection-clientsecret-input"]', 'test-github-client-secret');
      await page.fill('[data-testid="connection-redirecturi-input"]', 'http://localhost:3000/api/connections/oauth2/callback');
      await page.fill('[data-testid="connection-scope-input"]', 'repo user');
      
      await getPrimaryActionButton(page, 'submit-connection').click();
      
      // Wait for form processing
      await waitForMessage(page, 'success');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Should show the connection in the list
      await expect(page.locator('[data-testid="connection-card"]:has-text("GitHub OAuth2 Connection")')).toBeVisible();
    });

    test('should create OAuth2 connection with Google provider', async ({ page }) => {
      await testConnectionCreationWithValidation(page, {
        name: 'Google OAuth2 Connection',
        description: 'Google OAuth2 test connection',
        baseUrl: 'https://www.googleapis.com',
        authType: 'OAUTH2',
        provider: 'google',
        clientId: 'test-google-client-id',
        clientSecret: 'test-google-client-secret',
        redirectUri: 'http://localhost:3000/api/connections/oauth2/callback',
        scope: 'https://www.googleapis.com/auth/calendar'
      });
      
      // Should show the connection in the list
      await expect(page.locator('[data-testid="connection-card"]:has-text("Google OAuth2 Connection")')).toBeVisible();
    });

    test('should create OAuth2 connection with custom provider', async ({ page }) => {
      await getPrimaryActionButton(page, 'create-connection-header').click();
      
      await page.fill('[data-testid="connection-name-input"]', 'Custom OAuth2 Connection');
      await page.fill('[data-testid="connection-description-input"]', 'Custom OAuth2 test connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.custom.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      await page.selectOption('[data-testid="connection-provider-select"]', 'custom');
      await page.fill('[data-testid="connection-clientid-input"]', 'test-custom-client-id');
      await page.fill('[data-testid="connection-clientsecret-input"]', 'test-custom-client-secret');
      await page.fill('[data-testid="connection-redirecturi-input"]', 'http://localhost:3000/api/connections/oauth2/callback');
      await page.fill('[data-testid="connection-scope-input"]', 'read write');
      
      await getPrimaryActionButton(page, 'submit-connection').click();
      
      // Wait for form processing
      await waitForMessage(page, 'success');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Should show the connection in the list
      await expect(page.locator('[data-testid="connection-card"]:has-text("Custom OAuth2 Connection")')).toBeVisible();
    });
  });

  test.describe('OAuth2 Connection Validation', () => {
    test('should validate OAuth2 connection fields', async ({ page }) => {
      await getPrimaryActionButton(page, 'create-connection-header').click();
      
      // Validate form UX compliance
      await validateUXCompliance(page, {
        title: 'APIQ',
        headings: 'Add API Connection',
        validateForm: true,
        validateAccessibility: true
      });
      
      // Test required field validation
      await getPrimaryActionButton(page, 'submit-connection').click();
      
      // Should show validation errors
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      
      // Close modal
      await page.click('button[aria-label="Close modal"]');
    });

    test('should handle OAuth2 connection errors gracefully', async ({ page }) => {
      await getPrimaryActionButton(page, 'create-connection-header').click();
      
      // Fill form with invalid data
      await page.fill('[data-testid="connection-name-input"]', 'Invalid OAuth2 Connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'invalid-url');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'OAUTH2');
      await page.selectOption('[data-testid="connection-provider-select"]', 'github');
      
      await getPrimaryActionButton(page, 'submit-connection').click();
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      
      // Close modal
      await page.click('button[aria-label="Close modal"]');
    });
  });

  test.describe('OAuth2 Connection Management', () => {
    test('should edit OAuth2 connection', async ({ page }) => {
      // First create a connection to edit
      await testConnectionCreationWithValidation(page, {
        name: 'OAuth2 Connection to Edit',
        description: 'OAuth2 connection to be edited',
        baseUrl: 'https://api.example.com',
        authType: 'OAUTH2',
        provider: 'github',
        clientId: 'test-edit-client-id',
        clientSecret: 'test-edit-client-secret',
        redirectUri: 'http://localhost:3000/api/connections/oauth2/callback',
        scope: 'repo'
      });
      
      // Find and click edit button
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("OAuth2 Connection to Edit")');
      await connectionCard.locator('[data-testid="edit-connection-btn"]').click();
      
      // Modify the connection
      await page.fill('[data-testid="connection-name-input"]', 'OAuth2 Connection to Edit - Updated');
      await page.fill('[data-testid="connection-scope-input"]', 'repo user admin');
      
      // Submit the edit
      await getPrimaryActionButton(page, 'update-connection').click();
      
      // Wait for update processing
      await testModalSuccessMessage(page, '[data-testid="success-message"]', 'Connection updated successfully');
      
      // Should show the updated connection in the list
      await expect(page.locator('[data-testid="connection-card"]:has-text("OAuth2 Connection to Edit - Updated")')).toBeVisible();
    });

    test('should delete OAuth2 connection', async ({ page }) => {
      // First create a connection to delete
      await testConnectionCreationWithValidation(page, {
        name: 'OAuth2 Connection to Delete',
        description: 'OAuth2 connection to be deleted',
        baseUrl: 'https://api.example.com',
        authType: 'OAUTH2',
        provider: 'github',
        clientId: 'test-delete-client-id',
        clientSecret: 'test-delete-client-secret',
        redirectUri: 'http://localhost:3000/api/connections/oauth2/callback',
        scope: 'repo'
      });
      
      // Find and click delete button
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("OAuth2 Connection to Delete")');
      await connectionCard.locator('[data-testid="delete-connection-btn"]').click();
      
      // Confirm deletion
      await getPrimaryActionButton(page, 'confirm-delete').click();
      
      // Wait for deletion processing
      await testModalSuccessMessage(page, '[data-testid="success-message"]', 'Connection deleted successfully');
      
      // Should not show the deleted connection in the list
      await expect(page.locator('[data-testid="connection-card"]:has-text("OAuth2 Connection to Delete")')).not.toBeVisible();
    });
  });
});
