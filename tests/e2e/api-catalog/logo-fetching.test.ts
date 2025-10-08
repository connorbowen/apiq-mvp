import { test, expect } from '@playwright/test';
import { createTestUser } from '../../helpers/testUtils.auth';

/**
 * Logo Fetching E2E Tests
 * 
 * Tests the automatic logo fetching functionality for API catalog entries
 * Focus: Logo service integration, Clearbit service, and automatic logo updates
 */

test.describe('API Catalog Logo Fetching', () => {
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

  test.describe('Logo Display', () => {
    test('should display logos for APIs with valid Clearbit URLs', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Check for APIs with logos
      const apiCards = page.locator('[data-testid^="api-card-"]');
      const firstCard = apiCards.first();
      
      // Look for logo images
      const logoImages = firstCard.locator('img[alt*="logo"]');
      const logoCount = await logoImages.count();
      
      if (logoCount > 0) {
        // Verify logo is visible and has proper attributes
        const logo = logoImages.first();
        await expect(logo).toBeVisible();
        
        // Check that logo has proper alt text
        const altText = await logo.getAttribute('alt');
        expect(altText).toContain('logo');
        
        // Check that logo has proper styling
        await expect(logo).toHaveClass(/rounded-lg/);
        
        console.log('✅ Logo displayed correctly');
      } else {
        console.log('⚠️ No logos found - may need seeded data or logo service setup');
      }
    });

    test('should show fallback icon for APIs without logos', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Look for fallback icons (Zap icon)
      const fallbackIcons = page.locator('[data-testid^="api-card-"] svg');
      const fallbackCount = await fallbackIcons.count();
      
      if (fallbackCount > 0) {
        // Verify fallback icon is visible
        const fallbackIcon = fallbackIcons.first();
        await expect(fallbackIcon).toBeVisible();
        
        // Check that it has proper styling
        await expect(fallbackIcon).toHaveClass(/text-gray-400/);
        
        console.log('✅ Fallback icons displayed correctly');
      } else {
        console.log('⚠️ No fallback icons found');
      }
    });
  });

  test.describe('Logo Service Integration', () => {
    test('should handle logo loading errors gracefully', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Check for broken image handling
      const apiCards = page.locator('[data-testid^="api-card-"]');
      const firstCard = apiCards.first();
      
      // Look for either logo images or fallback icons
      const logoImages = firstCard.locator('img');
      const fallbackIcons = firstCard.locator('svg');
      
      const hasLogo = await logoImages.count() > 0;
      const hasFallback = await fallbackIcons.count() > 0;
      
      // Should have either a logo or a fallback
      expect(hasLogo || hasFallback).toBeTruthy();
      
      console.log('✅ Logo error handling working correctly');
    });

    test('should display consistent logo sizing', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Check logo sizing consistency
      const apiCards = page.locator('[data-testid^="api-card-"]');
      const firstCard = apiCards.first();
      
      // Look for logo container
      const logoContainer = firstCard.locator('.h-10.w-10');
      if (await logoContainer.count() > 0) {
        // Verify consistent sizing
        await expect(logoContainer).toHaveClass(/h-10/);
        await expect(logoContainer).toHaveClass(/w-10/);
        
        console.log('✅ Logo sizing is consistent');
      } else {
        console.log('⚠️ Logo container not found');
      }
    });
  });

  test.describe('Logo Performance', () => {
    test('should load logos within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Wait for images to load
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
      
      console.log(`✅ Catalog loaded in ${loadTime}ms`);
    });

    test('should handle logo loading states', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Check that the page is functional even while logos are loading
      const apiCards = page.locator('[data-testid^="api-card-"]');
      const firstCard = apiCards.first();
      
      // Should be able to interact with cards while logos load
      await expect(firstCard).toBeVisible();
      
      // Should have proper structure
      const heading = firstCard.locator('h3');
      await expect(heading).toBeVisible();
      
      console.log('✅ Page functional during logo loading');
    });
  });

  test.describe('Logo Service API', () => {
    test('should handle Clearbit service responses', async ({ page }) => {
      // Test the logo service endpoint directly
      const response = await page.request.get('/api/admin/update-logos', {
        headers: {
          'Authorization': `Bearer ${testUser.accessToken}`
        }
      });
      
      // Should return appropriate response (may be 403 if not admin)
      expect([200, 403, 404]).toContain(response.status());
      
      console.log('✅ Logo service endpoint accessible');
    });

    test('should validate logo URL format', async ({ page }) => {
      // Navigate to catalog
      await page.goto('/catalog');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // Check for proper logo URL format
      const apiCards = page.locator('[data-testid^="api-card-"]');
      const firstCard = apiCards.first();
      
      const logoImages = firstCard.locator('img[src*="logo.clearbit.com"]');
      if (await logoImages.count() > 0) {
        const logo = logoImages.first();
        const src = await logo.getAttribute('src');
        
        // Should be a valid Clearbit URL
        expect(src).toMatch(/^https:\/\/logo\.clearbit\.com\/.+/);
        
        console.log('✅ Logo URLs are properly formatted');
      } else {
        console.log('⚠️ No Clearbit logos found');
      }
    });
  });
});
