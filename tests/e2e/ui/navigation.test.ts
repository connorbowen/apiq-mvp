import { test, expect } from '@playwright/test';
import { createTestUser, loginAsUser, loginAsAdmin } from '../../helpers/createTestData';

test.describe('UX Simplification - Navigation', () => {
  let regularUser: any;
  let adminUser: any;

  test.beforeAll(async () => {
    // Create test users for different roles
    regularUser = await createTestUser({ role: 'user' });
    adminUser = await createTestUser({ role: 'admin' });
  });

  test.describe('3-Tab Structure', () => {
    test('should render 3-tab navigation structure for regular users', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard');

      // Verify 3-tab structure
      await expect(page.getByTestId('tab-chat')).toBeVisible();
      await expect(page.getByTestId('tab-workflows')).toBeVisible();
      await expect(page.getByTestId('tab-connections')).toBeVisible();

      // Verify no old tabs are present
      await expect(page.getByText('Overview')).not.toBeVisible();
      await expect(page.getByText('Settings')).not.toBeVisible();
      await expect(page.getByText('Profile')).not.toBeVisible();
      await expect(page.getByText('Secrets')).not.toBeVisible();
      await expect(page.getByText('Admin')).not.toBeVisible();
      await expect(page.getByText('Audit')).not.toBeVisible();
    });

    test('should render 3-tab navigation structure for admin users', async ({ page }) => {
      await loginAsAdmin(page, adminUser);
      await page.goto('/dashboard');

      // Verify 3-tab structure
      await expect(page.getByTestId('tab-chat')).toBeVisible();
      await expect(page.getByTestId('tab-workflows')).toBeVisible();
      await expect(page.getByTestId('tab-connections')).toBeVisible();

      // Verify no old tabs are present
      await expect(page.getByText('Overview')).not.toBeVisible();
      await expect(page.getByText('Settings')).not.toBeVisible();
      await expect(page.getByText('Profile')).not.toBeVisible();
      await expect(page.getByText('Secrets')).not.toBeVisible();
      await expect(page.getByText('Admin')).not.toBeVisible();
      await expect(page.getByText('Audit')).not.toBeVisible();
    });

    test('should show Chat tab as default', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard');

      // Verify Chat tab is active by default
      await expect(page.getByTestId('tab-chat')).toHaveClass(/bg-indigo-100/);
      await expect(page.getByTestId('chat-interface')).toBeVisible();

      // Verify URL defaults to chat tab
      await expect(page).toHaveURL(/.*tab=chat/);
    });

    test('should navigate between tabs correctly', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard');

      // Navigate to Workflows tab
      await page.getByTestId('tab-workflows').click();
      await expect(page.getByTestId('tab-workflows')).toHaveClass(/bg-indigo-100/);
      await expect(page).toHaveURL(/.*tab=workflows/);

      // Navigate to Connections tab
      await page.getByTestId('tab-connections').click();
      await expect(page.getByTestId('tab-connections')).toHaveClass(/bg-indigo-100/);
      await expect(page).toHaveURL(/.*tab=connections/);

      // Navigate back to Chat tab
      await page.getByTestId('tab-chat').click();
      await expect(page.getByTestId('tab-chat')).toHaveClass(/bg-indigo-100/);
      await expect(page).toHaveURL(/.*tab=chat/);
    });

    test('should maintain tab state on page refresh', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard?tab=workflows');

      // Verify Workflows tab is active
      await expect(page.getByTestId('tab-workflows')).toHaveClass(/bg-indigo-100/);

      // Refresh page
      await page.reload();

      // Verify Workflows tab is still active
      await expect(page.getByTestId('tab-workflows')).toHaveClass(/bg-indigo-100/);
      await expect(page).toHaveURL(/.*tab=workflows/);
    });
  });

  test.describe('Best Practice Admin Access', () => {
    test('should show admin functions in user dropdown for admin users', async ({ page }) => {
      await loginAsAdmin(page, adminUser);
      await page.goto('/dashboard');

      // Open user dropdown
      await page.getByTestId('user-dropdown-toggle').click();

      // Verify admin functions are present
      await expect(page.getByTestId('user-dropdown-audit')).toBeVisible();
      await expect(page.getByTestId('user-dropdown-profile')).toBeVisible();
      await expect(page.getByTestId('user-dropdown-settings')).toBeVisible();
      await expect(page.getByTestId('user-dropdown-secrets')).toBeVisible();
      await expect(page.getByTestId('user-dropdown-help')).toBeVisible();
      await expect(page.getByTestId('user-dropdown-logout')).toBeVisible();
    });

    test('should not show admin functions in user dropdown for regular users', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard');

      // Open user dropdown
      await page.getByTestId('user-dropdown-toggle').click();

      // Verify admin functions are NOT present
      await expect(page.getByTestId('user-dropdown-audit')).not.toBeVisible();

      // Verify regular functions are present
      await expect(page.getByTestId('user-dropdown-profile')).toBeVisible();
      await expect(page.getByTestId('user-dropdown-settings')).toBeVisible();
      await expect(page.getByTestId('user-dropdown-secrets')).toBeVisible();
      await expect(page.getByTestId('user-dropdown-help')).toBeVisible();
      await expect(page.getByTestId('user-dropdown-logout')).toBeVisible();
    });

    test('should navigate to admin panel from dropdown', async ({ page }) => {
      await loginAsAdmin(page, adminUser);
      await page.goto('/dashboard');

      // Open user dropdown and click Admin Panel
      await page.getByTestId('user-dropdown-toggle').click();
      await page.getByText('Admin Panel').click();

      // Verify navigation to admin panel
      await expect(page).toHaveURL(/.*tab=admin/);
      await expect(page.getByTestId('admin-tab')).toBeVisible();
    });

    test('should navigate to audit logs from dropdown', async ({ page }) => {
      await loginAsAdmin(page, adminUser);
      await page.goto('/dashboard');

      // Open user dropdown and click Audit Log
      await page.getByTestId('user-dropdown-toggle').click();
      await page.getByTestId('user-dropdown-audit').click();

      // Verify navigation to audit logs
      await expect(page).toHaveURL(/.*tab=settings&section=audit/);
      await expect(page.getByTestId('settings-tab')).toBeVisible();
    });

    test('should navigate to profile from dropdown', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard');

      // Open user dropdown and click Profile
      await page.getByTestId('user-dropdown-toggle').click();
      await page.getByTestId('user-dropdown-profile').click();

      // Verify navigation to profile
      await expect(page).toHaveURL(/.*tab=profile/);
      await expect(page.getByTestId('profile-tab')).toBeVisible();
    });

    test('should not show Settings/Profile as main tabs', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard');

      // Main navigation should not have Settings/Profile tabs
      await expect(page.getByTestId('tab-settings')).not.toBeVisible();
      await expect(page.getByTestId('tab-profile')).not.toBeVisible();

      // Settings/Profile should be accessible via dropdown
      await page.getByTestId('user-dropdown-toggle').click();
      await expect(page.getByTestId('user-dropdown-settings')).toBeVisible();
      await expect(page.getByTestId('user-dropdown-profile')).toBeVisible();
    });
  });

  test.describe('Mobile Navigation', () => {
    test('should show mobile navigation on mobile devices', async ({ page }) => {
      await loginAsUser(page, regularUser);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      // Verify mobile navigation is visible
      await expect(page.getByTestId('mobile-navigation')).toBeVisible();

      // Verify desktop navigation is hidden
      await expect(page.locator('.hidden.lg\\:block')).toBeHidden();
    });

    test('should hide mobile navigation on desktop', async ({ page }) => {
      await loginAsUser(page, regularUser);
      
      // Set desktop viewport
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto('/dashboard');

      // Verify mobile navigation is hidden
      await expect(page.getByTestId('mobile-navigation')).toBeHidden();

      // Verify desktop navigation is visible
      await expect(page.locator('.hidden.lg\\:block')).toBeVisible();
    });

    test('should handle mobile tab navigation', async ({ page }) => {
      await loginAsUser(page, regularUser);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      // Navigate using mobile navigation
      await page.getByTestId('mobile-navigation').getByText('Workflows').click();
      await expect(page).toHaveURL(/.*tab=workflows/);

      await page.getByTestId('mobile-navigation').getByText('Settings').click();
      await expect(page).toHaveURL(/.*tab=settings/);

      await page.getByTestId('mobile-navigation').getByText('Chat').click();
      await expect(page).toHaveURL(/.*tab=chat/);
    });

    test('should have proper touch targets on mobile', async ({ page }) => {
      await loginAsUser(page, regularUser);
      
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
  });

  test.describe('Simplified Header', () => {
    test('should show simplified header without breadcrumbs', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard');

      // Verify header elements
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByText('Dashboard')).toBeVisible();
      await expect(page.getByTestId('user-dropdown-toggle')).toBeVisible();

      // Verify breadcrumbs are NOT present
      await expect(page.getByText('Home')).not.toBeVisible();
      await expect(page.getByText('Dashboard')).not.toBeVisible();
      await expect(page.locator('[data-testid="breadcrumbs"]')).not.toBeVisible();
    });

    test('should maintain logout functionality', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard');

      // Open user dropdown and logout
      await page.getByTestId('user-dropdown-toggle').click();
      await page.getByText('Logout').click();

      // Verify redirect to login page
      await expect(page).toHaveURL(/.*\/login/);
    });
  });

  test.describe('Message Banner Integration', () => {
    test('should display success messages', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard?tab=settings');

      // Trigger a success message (e.g., create a connection)
      await page.getByTestId('create-connection-btn').click();
      await page.fill('[data-testid="connection-name"]', 'Test Connection');
      await page.getByTestId('primary-action save-connection').click();

      // Verify success message is displayed
      await expect(page.getByTestId('message-banner')).toBeVisible();
      await expect(page.getByTestId('message-banner')).toHaveAttribute('data-type', 'success');
    });

    test('should display error messages', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard?tab=settings');

      // Trigger an error message (e.g., invalid connection data)
      await page.getByTestId('create-connection-btn').click();
      await page.getByTestId('primary-action save-connection').click();

      // Verify error message is displayed
      await expect(page.getByTestId('message-banner')).toBeVisible();
      await expect(page.getByTestId('message-banner')).toHaveAttribute('data-type', 'error');
    });

    test('should auto-clear messages after timeout', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard?tab=settings');

      // Trigger a success message
      await page.getByTestId('create-connection-btn').click();
      await page.fill('[data-testid="connection-name"]', 'Test Connection');
      await page.getByTestId('primary-action save-connection').click();

      // Verify message appears
      await expect(page.getByTestId('message-banner')).toBeVisible();

      // Wait for auto-clear (assuming 5 second timeout)
      await page.waitForTimeout(6000);

      // Verify message is cleared
      await expect(page.getByTestId('message-banner')).not.toBeVisible();
    });
  });

  test.describe('Accessibility Compliance', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard');

      // Verify ARIA labels
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('navigation')).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();

      // Verify tab navigation has proper ARIA attributes
      await expect(page.getByTestId('tab-chat')).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByTestId('tab-workflows')).toHaveAttribute('aria-selected', 'false');
      await expect(page.getByTestId('tab-settings')).toHaveAttribute('aria-selected', 'false');
    });

    test('should support keyboard navigation', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard');

      // Focus on first tab
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('tab-chat')).toBeFocused();

      // Navigate between tabs with arrow keys
      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('tab-workflows')).toBeFocused();

      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('tab-settings')).toBeFocused();

      // Activate tab with Enter
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('tab-settings')).toHaveClass(/bg-indigo-100/);
    });

    test('should have proper focus management', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard');

      // Verify skip links are present
      await expect(page.getByText('Skip to main content')).toBeVisible();
      await expect(page.getByText('Skip to workflows')).toBeVisible();

      // Test skip link functionality
      await page.getByText('Skip to main content').focus();
      await page.keyboard.press('Enter');
      
      // Verify focus moved to main content
      await expect(page.getByRole('main')).toBeFocused();
    });
  });

  test.describe('Performance Optimizations', () => {
    test('should lazy load non-critical components', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard');

      // Verify Chat tab loads immediately (critical)
      await expect(page.getByTestId('chat-interface')).toBeVisible();

      // Navigate to Workflows tab (non-critical)
      await page.getByTestId('tab-workflows').click();
      
      // Should show loading state briefly
      await expect(page.getByTestId('lazy-loaded-component')).toBeVisible();
      
      // Then load the actual component
      await expect(page.getByTestId('workflows-tab')).toBeVisible();
    });

    test('should have proper loading states', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard');

      // Navigate to Settings tab
      await page.getByTestId('tab-settings').click();
      
      // Should show loading spinner
      await expect(page.locator('.animate-spin')).toBeVisible();
      
      // Then load the actual component
      await expect(page.getByTestId('settings-tab')).toBeVisible();
    });
  });

  test.describe('URL Parameter Handling', () => {
    test('should handle invalid tab parameters gracefully', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard?tab=invalid');

      // Should default to chat tab
      await expect(page.getByTestId('tab-chat')).toHaveClass(/bg-indigo-100/);
      await expect(page).toHaveURL(/.*tab=chat/);
    });

    test('should preserve tab state in URL', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard?tab=workflows');

      // Should show workflows tab
      await expect(page.getByTestId('tab-workflows')).toHaveClass(/bg-indigo-100/);
      await expect(page.getByTestId('workflows-tab')).toBeVisible();
    });
  });
}); 
