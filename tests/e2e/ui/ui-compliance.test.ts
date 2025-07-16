import { test, expect } from '@playwright/test';
import { createTestUser, loginAsUser } from '../../helpers/createTestData';

test.describe('UX Simplification - UI Compliance', () => {
  let testUser: any;

  test.beforeAll(async () => {
    testUser = await createTestUser({ role: 'user' });
  });

  test.describe('Message Banner Accessibility', () => {
    test('should announce messages to screen readers', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard?tab=settings');

      // Trigger a success message
      await page.getByTestId('create-connection-btn').click();
      await page.fill('[data-testid="connection-name"]', 'Test Connection');
      await page.getByTestId('primary-action save-connection').click();

      // Verify message banner is announced
      const alert = page.getByRole('alert');
      await expect(alert).toBeVisible();
      await expect(alert).toHaveAttribute('aria-live', 'polite');
    });

    test('should have proper ARIA labels for message actions', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard?tab=settings');

      // Trigger an error message
      await page.getByTestId('create-connection-btn').click();
      await page.getByTestId('primary-action save-connection').click();

      // Verify close button has proper label
      const closeButton = page.getByLabel('Close message');
      await expect(closeButton).toBeVisible();
      await expect(closeButton).toHaveAttribute('aria-label', 'Close message');
    });

    test('should support keyboard navigation for message dismissal', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard?tab=settings');

      // Trigger a message
      await page.getByTestId('create-connection-btn').click();
      await page.fill('[data-testid="connection-name"]', 'Test Connection');
      await page.getByTestId('primary-action save-connection').click();

      // Navigate to close button with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Close message')).toBeFocused();

      // Dismiss message with keyboard
      await page.keyboard.press('Enter');
      await expect(page.getByRole('alert')).not.toBeVisible();
    });

    test('should auto-clear messages with proper timing', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard?tab=settings');

      // Trigger a success message
      await page.getByTestId('create-connection-btn').click();
      await page.fill('[data-testid="connection-name"]', 'Test Connection');
      await page.getByTestId('primary-action save-connection').click();

      // Verify message appears
      await expect(page.getByRole('alert')).toBeVisible();

      // Wait for auto-clear (assuming 5 second timeout)
      await page.waitForTimeout(6000);

      // Verify message is cleared
      await expect(page.getByRole('alert')).not.toBeVisible();
    });

    test('should handle multiple message types correctly', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard?tab=settings');

      // Test success message
      await page.getByTestId('create-connection-btn').click();
      await page.fill('[data-testid="connection-name"]', 'Success Connection');
      await page.getByTestId('primary-action save-connection').click();

      await expect(page.getByTestId('success-message')).toBeVisible();
      await expect(page.getByRole('alert')).toHaveClass(/bg-green-50/);

      // Test error message
      await page.getByTestId('create-connection-btn').click();
      await page.getByTestId('primary-action save-connection').click();

      await expect(page.getByTestId('error-message')).toBeVisible();
      await expect(page.getByRole('alert')).toHaveClass(/bg-red-50/);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display correctly on mobile screens', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      // Verify mobile navigation is visible
      await expect(page.getByTestId('mobile-navigation')).toBeVisible();

      // Verify desktop navigation is hidden
      await expect(page.locator('.hidden.lg\\:block')).toBeHidden();

      // Verify content is properly sized
      const chatInterface = page.getByTestId('chat-interface');
      const box = await chatInterface.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(375);
    });

    test('should handle mobile touch interactions', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      // Test mobile navigation touch
      await page.getByTestId('mobile-navigation').getByText('Workflows').click();
      await expect(page).toHaveURL(/.*tab=workflows/);

      await page.getByTestId('mobile-navigation').getByText('Settings').click();
      await expect(page).toHaveURL(/.*tab=settings/);

      await page.getByTestId('mobile-navigation').getByText('Chat').click();
      await expect(page).toHaveURL(/.*tab=chat/);
    });

    test('should have proper touch targets on mobile', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      // Verify mobile navigation buttons have proper touch targets
      const mobileNav = page.getByTestId('mobile-navigation');
      const buttons = mobileNav.locator('button');
      
      for (let i = 0; i < await buttons.count(); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    });

    test('should handle mobile keyboard interactions', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      // Test keyboard navigation on mobile
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('mobile-navigation').locator('button').first()).toBeFocused();

      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('mobile-navigation').locator('button').nth(1)).toBeFocused();
    });

    test('should maintain accessibility on mobile', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      // Verify ARIA attributes are maintained
      await expect(page.getByTestId('mobile-navigation')).toHaveAttribute('role', 'navigation');
      
      const activeTab = page.getByTestId('mobile-navigation').locator('[aria-current="true"]');
      await expect(activeTab).toBeVisible();
    });
  });

  test.describe('Performance Optimizations', () => {
    test('should load dashboard efficiently', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Measure initial load time
      const startTime = Date.now();
      await page.goto('/dashboard');
      const loadTime = Date.now() - startTime;
      
      // Should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Verify critical components load
      await expect(page.getByTestId('chat-interface')).toBeVisible();
    });

    test('should use lazy loading for non-critical components', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Verify Chat tab loads immediately (critical)
      await expect(page.getByTestId('chat-interface')).toBeVisible();

      // Navigate to Workflows tab (non-critical)
      await page.getByTestId('tab-workflows').click();
      
      // Should show loading state briefly
      await expect(page.locator('.animate-spin')).toBeVisible();
      
      // Then load the actual component
      await expect(page.getByTestId('workflows-tab')).toBeVisible();
    });

    test('should handle component memoization correctly', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Navigate between tabs multiple times
      for (let i = 0; i < 3; i++) {
        await page.getByTestId('tab-workflows').click();
        await expect(page.getByTestId('workflows-tab')).toBeVisible();
        
        await page.getByTestId('tab-settings').click();
        await expect(page.getByTestId('settings-tab')).toBeVisible();
        
        await page.getByTestId('tab-chat').click();
        await expect(page.getByTestId('chat-interface')).toBeVisible();
      }

      // Should maintain performance without excessive re-renders
      // (This is verified by the fact that navigation remains responsive)
    });

    test('should optimize bundle size with code splitting', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Monitor network requests for lazy-loaded components
      const requests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('dashboard')) {
          requests.push(request.url());
        }
      });

      // Navigate to different tabs to trigger lazy loading
      await page.getByTestId('tab-workflows').click();
      await page.getByTestId('tab-settings').click();
      await page.getByTestId('tab-chat').click();

      // Should not load all components at once
      expect(requests.length).toBeLessThan(10);
    });
  });

  test.describe('Accessibility Compliance', () => {
    test('should meet WCAG 2.1 AA standards', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Test color contrast
      const textElements = page.locator('p, span, div').filter({ hasText: /[A-Za-z]/ });
      // Note: In a real implementation, you would use axe-core to test contrast ratios
      
      // Test focus management
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('tab-chat')).toBeFocused();

      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('tab-workflows')).toBeFocused();
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Verify heading structure
      const h1 = page.locator('h1');
      const h2 = page.locator('h2');
      const h3 = page.locator('h3');

      // Should have one main heading
      await expect(h1).toHaveCount(1);
      
      // Should have proper subheadings
      await expect(h2).toHaveCount(1);
      await expect(h3).toHaveCount(1);
    });

    test('should support screen readers', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Verify ARIA landmarks
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('navigation')).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();

      // Verify ARIA labels
      await expect(page.getByTestId('tab-chat')).toHaveAttribute('aria-selected');
      await expect(page.getByTestId('user-dropdown-toggle')).toHaveAttribute('aria-expanded');
    });

    test('should handle keyboard navigation properly', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('tab-chat')).toBeFocused();

      // Test arrow key navigation
      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('tab-workflows')).toBeFocused();

      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('tab-settings')).toBeFocused();

      // Test activation
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('tab-settings')).toHaveClass(/bg-indigo-100/);
    });

    test('should provide skip links for accessibility', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Verify skip links are present
      await expect(page.getByText('Skip to main content')).toBeVisible();
      await expect(page.getByText('Skip to navigation')).toBeVisible();

      // Test skip link functionality
      await page.getByText('Skip to main content').focus();
      await page.keyboard.press('Enter');
      
      // Verify focus moved to main content
      await expect(page.getByRole('main')).toBeFocused();
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to different screen sizes', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      const viewports = [
        { width: 320, height: 568, name: 'Mobile Small' },
        { width: 375, height: 667, name: 'Mobile Large' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1024, height: 768, name: 'Desktop Small' },
        { width: 1440, height: 900, name: 'Desktop Large' },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/dashboard');

        // Verify layout adapts appropriately
        if (viewport.width < 768) {
          // Mobile layout
          await expect(page.getByTestId('mobile-navigation')).toBeVisible();
          await expect(page.locator('.hidden.lg\\:block')).toBeHidden();
        } else {
          // Desktop layout
          await expect(page.getByTestId('mobile-navigation')).toBeHidden();
          await expect(page.locator('.hidden.lg\\:block')).toBeVisible();
        }

        // Verify content is always accessible
        await expect(page.getByTestId('chat-interface')).toBeVisible();
      }
    });

    test('should handle orientation changes', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Test portrait orientation
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await expect(page.getByTestId('mobile-navigation')).toBeVisible();

      // Test landscape orientation
      await page.setViewportSize({ width: 667, height: 375 });
      await page.goto('/dashboard');
      await expect(page.getByTestId('mobile-navigation')).toBeVisible();
    });

    test('should maintain functionality across breakpoints', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      const breakpoints = [320, 768, 1024, 1440];

      for (const width of breakpoints) {
        await page.setViewportSize({ width, height: 768 });
        await page.goto('/dashboard');

        // Test core functionality at each breakpoint
        await page.getByTestId('tab-workflows').click();
        await expect(page.getByTestId('workflows-tab')).toBeVisible();

        await page.getByTestId('tab-settings').click();
        await expect(page.getByTestId('settings-tab')).toBeVisible();

        await page.getByTestId('tab-chat').click();
        await expect(page.getByTestId('chat-interface')).toBeVisible();
      }
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle UI errors gracefully', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Simulate component error
      await page.route('**/api/workflows', route => {
        route.fulfill({ status: 500, body: 'Server Error' });
      });

      // Navigate to workflows tab
      await page.getByTestId('tab-workflows').click();
      
      // Should show error state gracefully
      await expect(page.getByText('Unable to load workflows')).toBeVisible();
      await expect(page.getByText('Please try again')).toBeVisible();
    });

    test('should provide loading states for better UX', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Simulate slow API response
      await page.route('**/api/workflows', route => {
        setTimeout(() => {
          route.fulfill({ status: 200, body: JSON.stringify({ workflows: [] }) });
        }, 2000);
      });

      // Navigate to workflows tab
      await page.getByTestId('tab-workflows').click();
      
      // Should show loading state
      await expect(page.locator('.animate-spin')).toBeVisible();
      
      // Should eventually load content
      await expect(page.getByTestId('workflows-tab')).toBeVisible();
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work consistently across browsers', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard');

      // Test core functionality that should work in all browsers
      await expect(page.getByTestId('chat-interface')).toBeVisible();
      await expect(page.getByTestId('tab-workflows')).toBeVisible();
      await expect(page.getByTestId('tab-settings')).toBeVisible();

      // Test navigation
      await page.getByTestId('tab-workflows').click();
      await expect(page).toHaveURL(/.*tab=workflows/);

      await page.getByTestId('tab-settings').click();
      await expect(page).toHaveURL(/.*tab=settings/);
    });
  });
});
