import { test, expect } from '@playwright/test';
import { TestUser, generateTestId } from '../helpers/testUtils';
import { setupE2E, closeAllModals, resetRateLimits, cleanupE2E } from '../helpers/e2eHelpers';
import { createTestData, cleanupTestData } from '../helpers/dataHelpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: TestUser;
let testData: any;

test.describe('Debug Connection Creation', () => {
  test.beforeAll(async () => {
    testData = await createTestData({
      user: {
        email: `debug-connection-${generateTestId('user')}@testuser.local`,
        password: 'e2eTestPass123',
        role: 'ADMIN',
        name: 'Debug Connection Test User'
      }
    });
    testUser = testData.user!;
  });

  test.afterAll(async () => {
    await cleanupTestData(testData);
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔍 Browser console error:', msg.text());
      }
    });
    
    // Listen for network requests
    page.on('request', request => {
      if (request.url().includes('/api/connections')) {
        console.log('🔍 API Request:', request.method(), request.url(), request.postData());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/connections')) {
        console.log('🔍 API Response:', response.status(), response.url());
      }
    });
    
    await setupE2E(page, testUser, { 
      tab: 'connections', 
      validateUX: false 
    });
  });

  test.afterEach(async ({ page }) => {
    await closeAllModals(page);
    await resetRateLimits(page);
  });

  test('should create a simple connection', async ({ page }) => {
    console.log('🔍 Starting connection creation test');
    
    // Navigate to connections tab
    await page.goto('/dashboard?tab=connections');
    await page.waitForTimeout(1000);
    
    // Check that we can see the connections page
    await expect(page.locator('h1, h2, h3')).toContainText(['Manage your API integrations and connections']);
    console.log('✅ Connections page loaded successfully');
    
    // Click create connection button
    console.log('🔍 Clicking create connection button');
    await page.click('[data-testid="primary-action create-connection-header-btn"]');
    
    // Wait a moment for any modals to appear
    await page.waitForTimeout(2000);
    
    // Check what modals are visible
    const visibleModals = await page.evaluate(() => {
      const modals = document.querySelectorAll('[data-testid*="modal"]');
      return Array.from(modals).map(modal => ({
        testid: modal.getAttribute('data-testid'),
        visible: modal.offsetParent !== null
      }));
    });
    console.log('🔍 Visible modals:', visibleModals);
    
    // Check for guided tour modal and close it if present
    const guidedTourModal = page.locator('[data-testid="guided-tour-modal"]');
    if (await guidedTourModal.isVisible()) {
      console.log('🔍 Guided tour modal detected, closing it...');
      await page.click('[data-testid="guided-tour-skip-btn"]');
      await page.waitForTimeout(1000);
    }
    
    // Wait for create connection modal to appear
    await page.waitForSelector('[data-testid="create-connection-modal"]', { timeout: 10000 });
    console.log('✅ Create connection modal opened');
    
    // Fill in the form
    console.log('🔍 Filling connection name');
    await page.fill('[data-testid="connection-name-input"]', 'Debug Test Connection');
    
    console.log('🔍 Filling connection base URL');
    await page.fill('[data-testid="connection-baseurl-input"]', 'https://petstore3.swagger.io/api/v3');
    
    // Wait for the auth type select to be available and select NONE
    console.log('🔍 Selecting auth type');
    await page.waitForSelector('[data-testid="connection-authtype-select"]', { state: 'visible' });
    await page.selectOption('[data-testid="connection-authtype-select"]', 'NONE');
    
    // Fill in OpenAPI URL
    console.log('🔍 Filling OpenAPI URL');
    await page.fill('[data-testid="openapi-url-input"]', 'https://petstore3.swagger.io/api/v3/openapi.json');
    
    // Submit the form
    console.log('🔍 Submitting form');
    await page.click('[data-testid="primary-action submit-connection-btn"]');
    
    // Wait for response
    console.log('🔍 Waiting for form submission response...');
    await page.waitForTimeout(5000);
    
    // Check if modal closed (indicating success)
    const modalClosed = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="create-connection-modal"]') as HTMLElement;
      return !modal || modal.offsetParent === null;
    });
    
    console.log('🔍 Modal closed check result:', modalClosed);
    
    if (modalClosed) {
      console.log('✅ Connection creation successful (modal closed)');
    } else {
      console.log('❌ Connection creation failed - modal still open');
      
      // Check for error messages
      const errorMessage = await page.locator('[data-testid="modal-error-message"]').textContent();
      if (errorMessage) {
        console.log('❌ Error message found:', errorMessage);
      }
      
      // Check for success messages
      const successMessage = await page.locator('[data-testid="modal-success-message"]').textContent();
      if (successMessage) {
        console.log('✅ Success message found:', successMessage);
      }
    }
    
    // Check if connection was actually created
    console.log('🔍 Checking if connection was created...');
    const response = await page.request.get('/api/connections');
    if (response.ok()) {
      const connections = await response.json();
      console.log('🔍 Available connections:', connections.data?.length || 0);
      if (connections.data && connections.data.length > 0) {
        const conn = connections.data[0];
        console.log('🔍 Connection details:', {
          name: conn.name,
          endpointCount: conn.endpoints?.length || 0,
          ingestionStatus: conn.ingestionStatus
        });
      }
    }
  });
});
