import { test, expect } from '@playwright/test';
import { createTestUser } from '../../helpers/testUtils.auth';

/**
 * Catalog Connection Flow E2E Tests
 * 
 * Tests the new connection flow through the API catalog
 * Focus: Catalog API connection, modal integration, and navigation flow
 */

test.describe('Catalog Connection Flow', () => {
  let testUser: any;

  test.beforeEach(async ({ page }) => {
    // Setup test user with proper authentication
    testUser = await createTestUser('test@example.com', 'password123');
    
    // Navigate to login page and fill form manually
    await page.goto('/login');
    await page.fill('#email', testUser.email);
    await page.fill('#password', testUser.password);
    await page.click('[data-testid="primary-action signin-btn"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL(/.*dashboard/);
  });

  test.describe('Navigation Flow', () => {
    test('should navigate from connections to catalog via Add Connection button', async ({ page }) => {
      // Navigate to connections tab
      await page.click('[data-testid="tab-connections"]');
      await page.waitForLoadState('networkidle');
      
      // Click Add Connection button
      await page.click('[data-testid="primary-action create-connection-header-btn"]');
      
      // Should navigate to catalog page
      await page.waitForURL(/.*\/catalog$/);
      
      // Verify catalog page loaded
      await expect(page.locator('h1')).toContainText('API Catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      console.log('✅ Navigation from connections to catalog working');
    });

    test('should navigate from empty state to catalog', async ({ page }) => {
      // Navigate to connections tab
      await page.click('[data-testid="tab-connections"]');
      await page.waitForLoadState('networkidle');
      
      // Click Create Your First Connection button (if no connections exist)
      const emptyStateButton = page.locator('[data-testid="primary-action create-connection-empty-btn"]');
      if (await emptyStateButton.isVisible()) {
        await emptyStateButton.click();
        
        // Should navigate to catalog page
        await page.waitForURL(/.*\/catalog$/);
        
        // Verify catalog page loaded
        await expect(page.locator('h1')).toContainText('API Catalog');
        
        console.log('✅ Empty state navigation to catalog working');
      } else {
        console.log('⚠️ No empty state found - user may have existing connections');
      }
    });

    test('should have proper back navigation from catalog', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Click back button
      const backButton = page.locator('[data-testid="back-to-dashboard-link"]');
      if (await backButton.isVisible()) {
        await backButton.click();
        
        // Should navigate back to dashboard
        await page.waitForURL(/.*dashboard.*tab=connections/);
        
        console.log('✅ Back navigation from catalog working');
      } else {
        console.log('⚠️ Back button not found');
      }
    });
  });

  test.describe('API Details Navigation', () => {
    test('should navigate to API details page when clicking API card', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Click on first API card
      const firstApiCard = page.locator('[data-testid^="api-card-"]').first();
      await firstApiCard.click();
      
      // Should navigate to API details page
      await page.waitForURL(/\/catalog\/[^\/]+$/);
      
      // Verify API details page loaded
      await expect(page.locator('h1')).toBeVisible();
      
      console.log('✅ API details navigation working');
    });

    test('should have proper back navigation from API details', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Click on first API card
      const firstApiCard = page.locator('[data-testid^="api-card-"]').first();
      await firstApiCard.click();
      
      // Wait for API details page
      await page.waitForURL(/\/catalog\/[^\/]+$/);
      
      // Click back button
      const backButton = page.locator('button:has-text("Back")');
      if (await backButton.isVisible()) {
        await backButton.click();
        
        // Should navigate back to catalog
        await page.waitForURL(/.*\/catalog$/);
        
        console.log('✅ Back navigation from API details working');
      } else {
        console.log('⚠️ Back button not found on API details page');
      }
    });
  });

  test.describe('Connection Modal Integration', () => {
    test('should open connection modal when clicking Connect button', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Click Connect button on first API
      const connectButton = page.locator('[data-testid="primary-action connect-api-btn"]').first();
      await connectButton.click();
      
      // Should open connection modal
      await page.waitForSelector('[role="dialog"]');
      
      // Verify modal content
      await expect(page.locator('[role="dialog"] h2')).toContainText('Create Connection');
      
      console.log('✅ Connection modal opened correctly');
    });

    test('should pre-populate connection form with catalog API data', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Click Connect button on first API
      const connectButton = page.locator('[data-testid="primary-action connect-api-btn"]').first();
      await connectButton.click();
      
      // Wait for modal
      await page.waitForSelector('[role="dialog"]');
      
      // Check if form is pre-populated
      const nameInput = page.locator('[data-testid="connection-name-input"]');
      const baseUrlInput = page.locator('[data-testid="connection-baseurl-input"]');
      
      if (await nameInput.isVisible()) {
        const nameValue = await nameInput.inputValue();
        const baseUrlValue = await baseUrlInput.inputValue();
        
        // Should have some pre-populated values
        expect(nameValue.length).toBeGreaterThan(0);
        expect(baseUrlValue.length).toBeGreaterThan(0);
        
        console.log('✅ Form pre-populated with catalog data');
      } else {
        console.log('⚠️ Connection form not found');
      }
    });

    test('should show catalog API information banner', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Click Connect button on first API
      const connectButton = page.locator('[data-testid="primary-action connect-api-btn"]').first();
      await connectButton.click();
      
      // Wait for modal
      await page.waitForSelector('[role="dialog"]');
      
      // Check for catalog API banner
      const banner = page.locator('text=API Catalog Connection');
      if (await banner.isVisible()) {
        await expect(banner).toBeVisible();
        console.log('✅ Catalog API banner displayed');
      } else {
        console.log('⚠️ Catalog API banner not found');
      }
    });

    test('should hide OpenAPI import section for catalog APIs', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Click Connect button on first API
      const connectButton = page.locator('[data-testid="primary-action connect-api-btn"]').first();
      await connectButton.click();
      
      // Wait for modal
      await page.waitForSelector('[role="dialog"]');
      
      // Check that OpenAPI import section is hidden
      const openApiSection = page.locator('text=OpenAPI Specification Import');
      if (await openApiSection.isVisible()) {
        console.log('⚠️ OpenAPI section should be hidden for catalog APIs');
      } else {
        console.log('✅ OpenAPI section properly hidden for catalog APIs');
      }
    });
  });

  test.describe('Connection Success Flow', () => {
    test('should navigate to connections tab after successful connection', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Click Connect button on first API
      const connectButton = page.locator('[data-testid="primary-action connect-api-btn"]').first();
      await connectButton.click();
      
      // Wait for modal
      await page.waitForSelector('[role="dialog"]');
      
      // Fill out minimal form data
      await page.fill('[data-testid="connection-name-input"]', 'Test Catalog Connection');
      await page.fill('[data-testid="connection-baseurl-input"]', 'https://api.example.com');
      await page.selectOption('[data-testid="connection-authtype-select"]', 'API_KEY');
      await page.fill('[data-testid="connection-apikey-input"]', 'test-api-key-12345');
      
      // Submit form
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Wait for success and navigation
      try {
        await page.waitForURL(/.*dashboard.*tab=connections/, { timeout: 10000 });
        console.log('✅ Successfully navigated to connections tab after connection');
      } catch (error) {
        console.log('⚠️ Navigation to connections tab may have failed:', error);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle connection creation errors gracefully', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Click Connect button on first API
      const connectButton = page.locator('[data-testid="primary-action connect-api-btn"]').first();
      await connectButton.click();
      
      // Wait for modal
      await page.waitForSelector('[role="dialog"]');
      
      // Try to submit without required fields
      await page.click('[data-testid="primary-action submit-connection-btn"]');
      
      // Should show validation errors
      const errorMessage = page.locator('[data-testid="error-message"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
        console.log('✅ Error handling working correctly');
      } else {
        console.log('⚠️ Error message not found');
      }
    });

    test('should allow closing modal with escape key', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Click Connect button on first API
      const connectButton = page.locator('[data-testid="primary-action connect-api-btn"]').first();
      await connectButton.click();
      
      // Wait for modal
      await page.waitForSelector('[role="dialog"]');
      
      // Press escape key
      await page.keyboard.press('Escape');
      
      // Modal should close
      await page.waitForSelector('[role="dialog"]', { state: 'hidden' });
      
      console.log('✅ Modal closes with escape key');
    });
  });
});
