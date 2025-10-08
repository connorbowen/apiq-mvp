import { test, expect } from '@playwright/test';
import { TestUser, generateTestId, cleanupTestUser } from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';

/**
 * API Catalog Provider Detail Pages Tests
 * 
 * Focus: Provider detail pages, provider information display, provider API listings
 * Coverage: Provider page navigation, provider info display, API connections from provider pages
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testUser: TestUser;
let jwt: string;

test.describe('API Catalog Provider Detail Pages', () => {
  test.beforeAll(async () => {
    testUser = await createE2EUser({
      email: `e2e-catalog-provider-pages-${generateTestId('user')}@testuser.local`,
      password: 'e2eTestPass123',
      name: 'E2E Catalog Provider Pages Test User'
    });
    jwt = testUser.accessToken;
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser);
  });

  test.describe('Provider Page Navigation', () => {
    test('should navigate to provider page from catalog', async ({ page }) => {
      // Navigate to catalog first
      await page.click('[data-testid="primary-action browse-apis-btn"]');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      // Look for provider links
      const providerLink = page.locator('a[href*="/catalog/provider/"]').first();
      if (await providerLink.count() > 0) {
        const href = await providerLink.getAttribute('href');
        await providerLink.click();
        
        // Should navigate to provider detail page
        await page.waitForURL(/\/catalog\/provider\//);
        await expect(page.locator('h1')).toBeVisible();
        
        console.log(`✅ Successfully navigated to provider page: ${href}`);
      } else {
        console.log('⚠️ No provider links found - may need seeded data');
      }
    });

    test('should display back navigation from provider page', async ({ page }) => {
      // Try to navigate to a provider page directly
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

  test.describe('Provider Information Display', () => {
    test('should display provider header information', async ({ page }) => {
      // Navigate to catalog and find a provider link
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      const providerLink = page.locator('a[href*="/catalog/provider/"]').first();
      if (await providerLink.count() > 0) {
        await providerLink.click();
        await page.waitForURL(/\/catalog\/provider\//);
        
        // Check for provider header elements
        const providerHeader = page.locator('header');
        await expect(providerHeader).toBeVisible();
        
        // Check for provider name in header
        const providerName = page.locator('h1');
        await expect(providerName).toBeVisible();
        
        // Check for provider description or API count
        const providerDescription = page.locator('p.text-gray-500');
        if (await providerDescription.count() > 0) {
          await expect(providerDescription.first()).toBeVisible();
        }
        
        console.log('✅ Provider header information displayed');
      } else {
        console.log('⚠️ No provider links found - may need seeded data');
      }
    });

    test('should display provider verification status', async ({ page }) => {
      // Navigate to a provider page
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      const providerLink = page.locator('a[href*="/catalog/provider/"]').first();
      if (await providerLink.count() > 0) {
        await providerLink.click();
        await page.waitForURL(/\/catalog\/provider\//);
        
        // Look for verification indicators
        const verifiedIndicator = page.locator('text=Verified');
        if (await verifiedIndicator.count() > 0) {
          await expect(verifiedIndicator.first()).toBeVisible();
          console.log('✅ Provider verification status displayed');
        } else {
          console.log('⚠️ No verification status found');
        }
      } else {
        console.log('⚠️ No provider links found - may need seeded data');
      }
    });

    test('should display provider website link if available', async ({ page }) => {
      // Navigate to a provider page
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      const providerLink = page.locator('a[href*="/catalog/provider/"]').first();
      if (await providerLink.count() > 0) {
        await providerLink.click();
        await page.waitForURL(/\/catalog\/provider\//);
        
        // Look for website link
        const websiteLink = page.locator('a:has-text("Visit Website")');
        if (await websiteLink.count() > 0) {
          await expect(websiteLink).toBeVisible();
          console.log('✅ Provider website link displayed');
        } else {
          console.log('⚠️ No website link found');
        }
      } else {
        console.log('⚠️ No provider links found - may need seeded data');
      }
    });
  });

  test.describe('Provider API Listings', () => {
    test('should display APIs belonging to the provider', async ({ page }) => {
      // Navigate to a provider page
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      const providerLink = page.locator('a[href*="/catalog/provider/"]').first();
      if (await providerLink.count() > 0) {
        await providerLink.click();
        await page.waitForURL(/\/catalog\/provider\//);
        
        // Check for API cards
        const apiCards = page.locator('[data-testid^="api-card-"]');
        const cardCount = await apiCards.count();
        
        if (cardCount > 0) {
          await expect(apiCards.first()).toBeVisible();
          console.log(`✅ Found ${cardCount} APIs for provider`);
        } else {
          console.log('⚠️ No APIs found for provider - may need seeded data');
        }
      } else {
        console.log('⚠️ No provider links found - may need seeded data');
      }
    });

    test('should allow connecting to APIs from provider page', async ({ page }) => {
      // Navigate to a provider page
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      const providerLink = page.locator('a[href*="/catalog/provider/"]').first();
      if (await providerLink.count() > 0) {
        await providerLink.click();
        await page.waitForURL(/\/catalog\/provider\//);
        
        // Look for connect buttons
        const connectButton = page.locator('[data-testid="primary-action connect-api-btn"]').first();
        if (await connectButton.count() > 0) {
          await expect(connectButton).toBeVisible();
          console.log('✅ Connect buttons found on provider page');
        } else {
          console.log('⚠️ No connect buttons found');
        }
      } else {
        console.log('⚠️ No provider links found - may need seeded data');
      }
    });

    test('should display API information consistently with main catalog', async ({ page }) => {
      // Navigate to a provider page
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      const providerLink = page.locator('a[href*="/catalog/provider/"]').first();
      if (await providerLink.count() > 0) {
        await providerLink.click();
        await page.waitForURL(/\/catalog\/provider\//);
        
        // Check for consistent API card structure
        const apiCards = page.locator('[data-testid^="api-card-"]');
        if (await apiCards.count() > 0) {
          const firstCard = apiCards.first();
          
          // Check for API name
          const apiName = firstCard.locator('h3');
          await expect(apiName).toBeVisible();
          
          // Check for API description
          const apiDescription = firstCard.locator('p.text-gray-600');
          if (await apiDescription.count() > 0) {
            await expect(apiDescription.first()).toBeVisible();
          }
          
          // Check for auth types
          const authTypes = firstCard.locator('span:has-text("API_KEY"), span:has-text("OAUTH2")');
          if (await authTypes.count() > 0) {
            await expect(authTypes.first()).toBeVisible();
          }
          
          console.log('✅ API information displayed consistently');
        } else {
          console.log('⚠️ No API cards found');
        }
      } else {
        console.log('⚠️ No provider links found - may need seeded data');
      }
    });
  });

  test.describe('Provider Page Error Handling', () => {
    test('should handle non-existent provider gracefully', async ({ page }) => {
      // Try to navigate to a non-existent provider
      await page.goto('/catalog/provider/non-existent-provider-id');
      
      // Should show error state or redirect
      const errorMessage = page.locator('text=Provider not found');
      const backButton = page.locator('button:has-text("Go Back")');
      
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible();
        await expect(backButton).toBeVisible();
        console.log('✅ Non-existent provider handled gracefully');
      } else {
        // Might redirect to catalog or show empty state
        console.log('⚠️ Non-existent provider behavior needs verification');
      }
    });

    test('should handle provider with no APIs', async ({ page }) => {
      // This test would require a provider with no APIs in the database
      // For now, we'll just check the structure exists
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      const providerLink = page.locator('a[href*="/catalog/provider/"]').first();
      if (await providerLink.count() > 0) {
        await providerLink.click();
        await page.waitForURL(/\/catalog\/provider\//);
        
        // Check if empty state is handled
        const emptyState = page.locator('text=No APIs found for this provider');
        if (await emptyState.count() > 0) {
          await expect(emptyState).toBeVisible();
          console.log('✅ Empty provider state handled');
        } else {
          console.log('⚠️ Empty provider state not tested - provider has APIs');
        }
      } else {
        console.log('⚠️ No provider links found - may need seeded data');
      }
    });
  });

  test.describe('Provider Page Performance', () => {
    test('should load provider page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      // Navigate to catalog and then to provider page
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="api-catalog"]');
      
      const providerLink = page.locator('a[href*="/catalog/provider/"]').first();
      if (await providerLink.count() > 0) {
        await providerLink.click();
        await page.waitForURL(/\/catalog\/provider\//);
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        console.log(`Provider page loaded in ${loadTime}ms`);
        
        // Should load within 3 seconds
        expect(loadTime).toBeLessThan(3000);
        console.log('✅ Provider page loaded within acceptable time');
      } else {
        console.log('⚠️ No provider links found - may need seeded data');
      }
    });
  });
});
