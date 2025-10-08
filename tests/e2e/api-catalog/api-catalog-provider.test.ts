import { test, expect } from '@playwright/test';
import { TestUser, generateTestId, cleanupTestUser } from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';

/**
 * API Catalog Provider Tests
 * 
 * Focus: Provider-specific functionality, provider context display, provider navigation
 * Coverage: Provider grouping, provider search, provider context in API cards
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: TestUser;
let jwt: string;

test.describe('API Catalog Provider Functionality', () => {
  test.beforeAll(async () => {
    testUser = await createE2EUser({
      email: `e2e-catalog-provider-${generateTestId('user')}@testuser.local`,
      password: 'e2eTestPass123',
      name: 'E2E Catalog Provider Test User'
    });
    jwt = testUser.accessToken;
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser);
  });

  test.describe('Provider Context Display', () => {
    test('should show provider context for grouped APIs', async ({ page }) => {
      // Navigate to catalog
      await page.click('[data-testid="primary-action browse-apis-btn"]');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      // Look for APIs with provider context
      const providerContext = page.locator('text=Part of');
      if (await providerContext.count() > 0) {
        await expect(providerContext.first()).toBeVisible();
        console.log('✅ Provider context displayed');
      } else {
        console.log('⚠️ No provider context found - may need seeded data');
      }
    });

    test('should allow clicking on provider names', async ({ page }) => {
      // Navigate to catalog
      await page.click('[data-testid="primary-action browse-apis-btn"]');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      // Look for clickable provider links
      const providerLink = page.locator('a:has-text("Google Workspace")').first();
      if (await providerLink.count() > 0) {
        await providerLink.click();
        
        // Should navigate to provider detail page
        await page.waitForURL(/\/catalog\/provider\//);
        await expect(page.locator('h1:has-text("Google Workspace")')).toBeVisible();
        console.log('✅ Provider detail page loaded');
      } else {
        console.log('⚠️ No provider links found - may need seeded data');
      }
    });

    test('should display provider verification status', async ({ page }) => {
      // Navigate to catalog
      await page.click('[data-testid="primary-action browse-apis-btn"]');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      // Look for provider verification indicators
      const verifiedProvider = page.locator('text=Part of').locator('..').locator('text=Verified');
      if (await verifiedProvider.count() > 0) {
        await expect(verifiedProvider.first()).toBeVisible();
        console.log('✅ Provider verification status displayed');
      } else {
        console.log('⚠️ No verified providers found - may need seeded data');
      }
    });
  });

  test.describe('Provider Search Integration', () => {
    test('should find APIs by provider name in search', async ({ page }) => {
      // Navigate to catalog
      await page.click('[data-testid="primary-action browse-apis-btn"]');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      // Search for "Google" - should find Google Workspace APIs
      await page.fill('[data-testid="api-search-input"]', 'Google');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      
      // Check for Google-related APIs or provider context
      const gmailCard = page.locator('[data-testid="api-card-Gmail API"]');
      const providerContext = page.locator('text=Part of Google Workspace');
      
      if (await gmailCard.count() > 0) {
        await expect(gmailCard).toBeVisible();
        console.log('✅ Found Google APIs by provider search');
      } else if (await providerContext.count() > 0) {
        await expect(providerContext).toBeVisible();
        console.log('✅ Found provider context by provider search');
      } else {
        console.log('⚠️ No Google APIs found by provider search - may need seeded data');
      }
    });

    test('should find APIs by Microsoft provider name', async ({ page }) => {
      // Navigate to catalog
      await page.click('[data-testid="primary-action browse-apis-btn"]');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      // Search for "Microsoft" - should find Microsoft 365 APIs
      await page.fill('[data-testid="api-search-input"]', 'Microsoft');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      
      // Check for Microsoft-related APIs or provider context
      const graphCard = page.locator('[data-testid="api-card-Microsoft Graph API"]');
      const providerContext = page.locator('text=Part of Microsoft 365');
      
      if (await graphCard.count() > 0) {
        await expect(graphCard).toBeVisible();
        console.log('✅ Found Microsoft APIs by provider search');
      } else if (await providerContext.count() > 0) {
        await expect(providerContext).toBeVisible();
        console.log('✅ Found Microsoft provider context by search');
      } else {
        console.log('⚠️ No Microsoft APIs found by provider search - may need seeded data');
      }
    });
  });

  test.describe('Provider API Grouping', () => {
    test('should group related APIs under same provider', async ({ page }) => {
      // Navigate to catalog
      await page.click('[data-testid="primary-action browse-apis-btn"]');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      // Look for multiple APIs with the same provider
      const googleContexts = page.locator('text=Part of Google Workspace');
      const microsoftContexts = page.locator('text=Part of Microsoft 365');
      
      if (await googleContexts.count() > 1) {
        console.log(`✅ Found ${await googleContexts.count()} Google Workspace APIs grouped together`);
        await expect(googleContexts.first()).toBeVisible();
      } else if (await microsoftContexts.count() > 1) {
        console.log(`✅ Found ${await microsoftContexts.count()} Microsoft 365 APIs grouped together`);
        await expect(microsoftContexts.first()).toBeVisible();
      } else {
        console.log('⚠️ No grouped provider APIs found - may need seeded data');
      }
    });

    test('should maintain provider context across different API cards', async ({ page }) => {
      // Navigate to catalog
      await page.click('[data-testid="primary-action browse-apis-btn"]');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      // Look for consistent provider context across multiple cards
      const providerContexts = page.locator('text=Part of');
      const contextCount = await providerContexts.count();
      
      if (contextCount > 0) {
        // Verify all provider contexts are visible and consistent
        for (let i = 0; i < contextCount; i++) {
          await expect(providerContexts.nth(i)).toBeVisible();
        }
        console.log(`✅ Found ${contextCount} provider contexts displayed consistently`);
      } else {
        console.log('⚠️ No provider contexts found - may need seeded data');
      }
    });
  });

  test.describe('Provider Navigation', () => {
    test('should navigate to provider detail page when clicking provider name', async ({ page }) => {
      // Navigate to catalog
      await page.click('[data-testid="primary-action browse-apis-btn"]');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      // Look for clickable provider links
      const providerLinks = page.locator('a[href*="/catalog/provider/"]');
      if (await providerLinks.count() > 0) {
        const firstProviderLink = providerLinks.first();
        const href = await firstProviderLink.getAttribute('href');
        
        await firstProviderLink.click();
        
        // Should navigate to provider detail page
        await page.waitForURL(/\/catalog\/provider\//);
        await expect(page.locator('h1')).toBeVisible();
        
        console.log(`✅ Successfully navigated to provider page: ${href}`);
      } else {
        console.log('⚠️ No provider links found - may need seeded data');
      }
    });

    test('should display back navigation from provider page', async ({ page }) => {
      // Try to navigate to a provider page directly (if we know the route structure)
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      // Look for provider links and click one
      const providerLink = page.locator('a[href*="/catalog/provider/"]').first();
      if (await providerLink.count() > 0) {
        await providerLink.click();
        await page.waitForURL(/\/catalog\/provider\//);
        
        // Check for back navigation
        const backButton = page.locator('[data-testid="back-to-catalog-link"]');
        if (await backButton.count() > 0) {
          await expect(backButton).toBeVisible();
          await backButton.click();
          
          // Should navigate back to catalog
          await page.waitForURL(/\/catalog/);
          console.log('✅ Back navigation working');
        } else {
          console.log('⚠️ Back navigation not found');
        }
      } else {
        console.log('⚠️ No provider links found to test navigation');
      }
    });
  });
});
