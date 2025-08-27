// E2E Tests for Connections CRUD Operations
// Tests basic connection creation, editing, and deletion functionality

import { test, expect } from '../../helpers/serverHealthCheck';
import { TestUser, generateTestId, cleanupTestUser } from '../../helpers/testUtils';
import { closeAllModals, resetRateLimits, getPrimaryActionButton, completeTestTeardown, setupE2E } from '../../helpers/e2eHelpers';
import { createE2EUser } from '../../helpers/authHelpers';
import { validateUXCompliance } from '../../helpers/uiHelpers';
import { testConnectionCreation, testConnectionCreationWithValidation } from '../../helpers/dataHelpers';
import { testModalSuccessMessage } from '../../helpers/modalHelpers';
import { testPageLoadTime } from '../../helpers/performanceHelpers';
import { testXSSPrevention } from '../../helpers/securityHelpers';
import { testFormAccessibility } from '../../helpers/accessibilityHelpers';
import { waitForVisible } from '../../helpers/waitHelpers';
import { Role } from '../../../src/generated/prisma';

let testUser: TestUser;
let jwt: string;
const createdConnectionIds: string[] = [];

// Helper function to track created connections for cleanup
const trackConnection = (connectionId: string) => {
  createdConnectionIds.push(connectionId);
  console.log(`🔗 Tracked connection: ${connectionId} (total: ${createdConnectionIds.length})`);
};

test.describe('Connections CRUD Operations E2E Tests', () => {
  test.beforeAll(async () => {
    testUser = await createE2EUser(Role.ADMIN, {
      email: `e2e-conn-crud-${generateTestId('user')}@example.com`,
      password: 'e2eTestPass123',
      name: 'E2E Connections CRUD Test User'
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
        console.log(`🗑️ Cleaned up connection: ${id}`);
      } catch (error) {
        console.warn(`Failed to cleanup connection ${id}:`, error);
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

  test.describe('Connection Creation', () => {
    test('should create a new API connection with UX compliance', async ({ page }) => {
      const connectionId = await testConnectionCreation(page, {
        name: 'Test Connection',
        description: 'Connection for testing',
        baseUrl: 'https://httpbin.org/get',
        authType: 'API_KEY',
        apiKey: 'test-key'
      });
      
      if (connectionId) {
        trackConnection(connectionId);
      }
    });

    test('should create connection with Bearer token auth', async ({ page }) => {
      const connectionId = await testConnectionCreation(page, {
        name: 'Bearer Token Connection',
        description: 'Bearer token test connection',
        baseUrl: 'https://api.example.com',
        authType: 'BEARER_TOKEN',
        bearerToken: 'test-bearer-token-123'
      });
      
      if (connectionId) {
        trackConnection(connectionId);
      }
    });

    test('should create connection with Basic auth', async ({ page }) => {
      const connectionId = await testConnectionCreation(page, {
        name: 'Basic Auth Connection',
        description: 'Basic auth test connection',
        baseUrl: 'https://api.example.com',
        authType: 'BASIC_AUTH',
        username: 'testuser',
        password: 'testpass'
      });
      
      if (connectionId) {
        trackConnection(connectionId);
      }
    });
  });

  test.describe('Connection Editing', () => {
    test('should edit an existing connection', async ({ page }) => {
      // Test page load time for connections page
      const loadTime = await testPageLoadTime(page, '/dashboard?tab=settings&section=connections', { 
        threshold: 3000 
      });
      console.log('🪵 Connections page load time:', loadTime, 'ms');
      
      // First create a connection to edit
      await testConnectionCreationWithValidation(page, {
        name: 'Connection to Edit',
        description: 'Connection to be edited',
        baseUrl: 'https://api.example.com',
        authType: 'API_KEY',
        apiKey: 'test-edit-key'
      });
      
      // Find and click edit button for the created connection
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("Connection to Edit")');
      await waitForVisible(page, '[data-testid="connection-card"]:has-text("Connection to Edit")', 5000);
      await connectionCard.locator('[data-testid="edit-connection-btn"]').click();
      
      // Validate edit form UX compliance using helpers
      await validateUXCompliance(page, {
        title: 'APIQ',
        headings: 'Edit API Connection',
        validateForm: true,
        validateAccessibility: true
      });
      await testFormAccessibility(page, { submitButton: 'primary-action update-connection-btn' });
      
      // Test XSS prevention on form inputs AFTER the form is loaded
      await testXSSPrevention(page, '[data-testid="connection-name-input"]', '<script>alert("xss")</script>');
      
      // Modify the connection
      await page.fill('[data-testid="connection-name-input"]', 'Connection to Edit - Updated');
      await page.fill('[data-testid="connection-description-input"]', 'Updated description');
      
      // Submit the edit using the correct primary action button
      const updateButton = getPrimaryActionButton(page, 'update-connection');
      await updateButton.click();
      
      // Wait for update processing
      await testModalSuccessMessage(page, '[data-testid="success-message"]', 'Connection updated successfully');
      
      // Should show the updated connection in the list
      await expect(page.locator('[data-testid="connection-card"]:has-text("Connection to Edit - Updated")')).toBeVisible();
    });
  });

  test.describe('Connection Deletion', () => {
    test('should delete a connection', async ({ page }) => {
      // First create a connection to delete
      await testConnectionCreationWithValidation(page, {
        name: 'Connection to Delete',
        description: 'Connection to be deleted',
        baseUrl: 'https://api.example.com',
        authType: 'API_KEY',
        apiKey: 'test-key'
      });
      
      // Find and click delete button for the created connection
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("Connection to Delete")');
      await connectionCard.locator('[data-testid="delete-connection-btn"]').click();
      
      // Confirm deletion using the correct primary action button
      const confirmButton = getPrimaryActionButton(page, 'confirm-delete');
      await confirmButton.click();
      
      // Wait for deletion processing
      await testModalSuccessMessage(page, '[data-testid="success-message"]', 'Connection deleted successfully');
      
      // Should not show the deleted connection in the list
      await expect(page.locator('[data-testid="connection-card"]:has-text("Connection to Delete")')).not.toBeVisible();
    });

    test('should cancel connection deletion', async ({ page }) => {
      // First create a connection
      await testConnectionCreationWithValidation(page, {
        name: 'Connection to Cancel Delete',
        description: 'Connection for cancel delete test',
        baseUrl: 'https://api.example.com',
        authType: 'API_KEY',
        apiKey: 'test-key'
      });
      
      // Find and click delete button
      const connectionCard = page.locator('[data-testid="connection-card"]:has-text("Connection to Cancel Delete")');
      await connectionCard.locator('[data-testid="delete-connection-btn"]').click();
      
      // Cancel deletion using the correct button selector
      const cancelButton = page.locator('[data-testid="cancel-delete-btn"]');
      await cancelButton.click();
      
      // Should still show the connection in the list
      await expect(page.locator('[data-testid="connection-card"]:has-text("Connection to Cancel Delete")')).toBeVisible();
    });
  });
});