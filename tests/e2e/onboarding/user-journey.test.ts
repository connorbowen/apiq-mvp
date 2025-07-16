/**
 * PHASE 2.2-2.4: Complete onboarding testing
 * - [x] Test progressive disclosure feature unlocking
 * - [x] Test guided tour completion flow
 * - [x] Test new user onboarding journey
 * - [x] Test onboarding state persistence
 * - [x] Test feature gating based on user stage
 * 
 * IMPLEMENTATION NOTES:
 * - Test complete new user experience from signup to feature access
 * - Test progressive disclosure unlocking features
 * - Test guided tour functionality and completion
 * - Test onboarding state persistence across sessions
 */

import { test, expect } from '@playwright/test';
import { createTestUser, loginAsUser, loginAsAdmin } from '../../helpers/createTestData';

test.describe('UX Simplification - Onboarding User Journey', () => {
  let newUser: any;
  let existingUser: any;

  test.beforeAll(async () => {
    // Create test users for different onboarding stages
    newUser = await createTestUser({ 
      role: 'user',
      onboardingStage: 'new',
      guidedTourCompleted: false
    });
    existingUser = await createTestUser({ 
      role: 'user',
      onboardingStage: 'completed',
      guidedTourCompleted: true
    });
  });

  test.describe('New User Onboarding Flow', () => {
    test('should show progressive disclosure for new users', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard');

      // Verify progressive disclosure is active
      await expect(page.getByTestId('progressive-disclosure')).toBeVisible();
      
      // Verify some features are locked
      await expect(page.getByTestId('locked-feature')).toBeVisible();
      await expect(page.getByText('Complete onboarding to unlock')).toBeVisible();
    });

    test('should show guided tour for new users', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard');

      // Verify guided tour is shown
      await expect(page.getByTestId('guided-tour')).toBeVisible();
      await expect(page.getByText('Welcome to APIQ')).toBeVisible();
    });

    test('should complete guided tour successfully', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard');

      // Start guided tour
      await expect(page.getByTestId('guided-tour')).toBeVisible();
      
      // Navigate through tour steps
      await page.getByTestId('tour-next-btn').click();
      await expect(page.getByText('Chat Interface')).toBeVisible();
      
      await page.getByTestId('tour-next-btn').click();
      await expect(page.getByText('Workflows')).toBeVisible();
      
      await page.getByTestId('tour-next-btn').click();
      await expect(page.getByText('Settings')).toBeVisible();
      
      // Complete tour
      await page.getByTestId('tour-finish-btn').click();
      
      // Verify tour is completed
      await expect(page.getByTestId('guided-tour')).not.toBeVisible();
      
      // Verify onboarding progress is updated
      await expect(page.getByTestId('onboarding-progress')).toHaveText('Completed');
    });

    test('should skip guided tour and still unlock features', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard');

      // Skip guided tour
      await page.getByTestId('tour-skip-btn').click();
      
      // Verify tour is dismissed
      await expect(page.getByTestId('guided-tour')).not.toBeVisible();
      
      // Verify features are still progressively unlocked
      await expect(page.getByTestId('progressive-disclosure')).toBeVisible();
    });

    test('should show onboarding progress indicator', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard');

      // Verify onboarding progress is shown
      await expect(page.getByTestId('onboarding-progress')).toBeVisible();
      await expect(page.getByTestId('onboarding-progress')).toHaveText('New User');
    });
  });

  test.describe('Progressive Disclosure', () => {
    test('should unlock features as user progresses', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard');

      // Initially, some features should be locked
      await expect(page.getByTestId('locked-feature')).toBeVisible();
      
      // Complete first onboarding step
      await page.getByTestId('complete-onboarding-step').click();
      
      // Verify some features are now unlocked
      await expect(page.getByTestId('unlocked-feature')).toBeVisible();
      await expect(page.getByTestId('locked-feature')).not.toBeVisible();
    });

    test('should show appropriate unlock messaging', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard?tab=settings');

      // Verify locked features show unlock messaging
      await expect(page.getByText('Complete your profile to unlock')).toBeVisible();
      await expect(page.getByText('Take the guided tour to unlock')).toBeVisible();
    });

    test('should handle different feature types', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard?tab=settings');

      // Test different feature types
      await expect(page.getByTestId('feature-connections')).toHaveClass(/locked/);
      await expect(page.getByTestId('feature-secrets')).toHaveClass(/locked/);
      await expect(page.getByTestId('feature-advanced')).toHaveClass(/locked/);
    });

    test('should show fallback content when provided', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard?tab=settings');

      // Verify fallback content is shown for locked features
      await expect(page.getByTestId('fallback-content')).toBeVisible();
      await expect(page.getByText('This feature will be available soon')).toBeVisible();
    });
  });

  test.describe('Existing User Experience', () => {
    test('should not show progressive disclosure for completed users', async ({ page }) => {
      await loginAsUser(page, existingUser);
      await page.goto('/dashboard');

      // Verify progressive disclosure is not shown
      await expect(page.getByTestId('progressive-disclosure')).not.toBeVisible();
      
      // Verify all features are unlocked
      await expect(page.getByTestId('unlocked-feature')).toBeVisible();
      await expect(page.getByTestId('locked-feature')).not.toBeVisible();
    });

    test('should not show guided tour for existing users', async ({ page }) => {
      await loginAsUser(page, existingUser);
      await page.goto('/dashboard');

      // Verify guided tour is not shown
      await expect(page.getByTestId('guided-tour')).not.toBeVisible();
    });

    test('should show completed onboarding status', async ({ page }) => {
      await loginAsUser(page, existingUser);
      await page.goto('/dashboard');

      // Verify onboarding is marked as completed
      await expect(page.getByTestId('onboarding-status')).toHaveText('Completed');
    });
  });

  test.describe('Onboarding State Persistence', () => {
    test('should persist onboarding state across sessions', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard');

      // Complete first onboarding step
      await page.getByTestId('complete-onboarding-step').click();
      
      // Verify state is updated
      await expect(page.getByTestId('onboarding-progress')).toHaveText('In Progress');
      
      // Reload page
      await page.reload();
      
      // Verify state persists
      await expect(page.getByTestId('onboarding-progress')).toHaveText('In Progress');
    });

    test('should persist guided tour completion', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard');

      // Complete guided tour
      await page.getByTestId('tour-finish-btn').click();
      
      // Reload page
      await page.reload();
      
      // Verify tour is not shown again
      await expect(page.getByTestId('guided-tour')).not.toBeVisible();
    });

    test('should sync onboarding state with backend', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard');

      // Complete onboarding
      await page.getByTestId('complete-onboarding').click();
      
      // Verify API call is made
      await expect(page).toHaveURL(/.*onboarding=completed/);
      
      // Verify state is synced
      await expect(page.getByTestId('onboarding-status')).toHaveText('Completed');
    });
  });

  test.describe('Feature Unlocking Logic', () => {
    test('should unlock features based on onboarding stage', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard?tab=settings');

      // Test different onboarding stages
      const stages = ['new', 'profile_completed', 'tour_completed', 'completed'];
      
      for (const stage of stages) {
        // Update user to specific stage
        await page.evaluate((stage) => {
          localStorage.setItem('onboardingStage', stage);
        }, stage);
        
        await page.reload();
        
        // Verify appropriate features are unlocked
        if (stage === 'completed') {
          await expect(page.getByTestId('feature-connections')).not.toHaveClass(/locked/);
          await expect(page.getByTestId('feature-secrets')).not.toHaveClass(/locked/);
        } else {
          await expect(page.getByTestId('feature-connections')).toHaveClass(/locked/);
        }
      }
    });

    test('should handle feature dependencies correctly', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard?tab=settings');

      // Verify dependent features are locked until prerequisites are met
      await expect(page.getByTestId('feature-advanced')).toHaveClass(/locked/);
      await expect(page.getByText('Complete basic setup first')).toBeVisible();
    });
  });

  test.describe('Accessibility and UX', () => {
    test('should support keyboard navigation in guided tour', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard');

      // Navigate tour with keyboard
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('tour-next-btn')).toBeFocused();
      
      await page.keyboard.press('Enter');
      await expect(page.getByText('Chat Interface')).toBeVisible();
      
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('guided-tour')).not.toBeVisible();
    });

    test('should have proper ARIA labels for progressive disclosure', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard?tab=settings');

      // Verify ARIA labels for locked features
      await expect(page.getByTestId('feature-connections')).toHaveAttribute('aria-describedby');
      await expect(page.getByTestId('locked-feature')).toHaveAttribute('role', 'button');
    });

    test('should provide clear unlock instructions', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard?tab=settings');

      // Verify clear instructions for unlocking features
      await expect(page.getByText('Complete your profile to unlock this feature')).toBeVisible();
      await expect(page.getByText('Take the guided tour to unlock advanced features')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle onboarding state errors gracefully', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard');

      // Simulate API error
      await page.route('**/api/onboarding/**', route => {
        route.fulfill({ status: 500, body: 'Server Error' });
      });

      // Try to complete onboarding step
      await page.getByTestId('complete-onboarding-step').click();
      
      // Verify error is handled gracefully
      await expect(page.getByTestId('error-message')).toBeVisible();
      await expect(page.getByText('Failed to update onboarding progress')).toBeVisible();
    });

    test('should handle guided tour errors', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard');

      // Simulate tour completion error
      await page.route('**/api/tour/complete', route => {
        route.fulfill({ status: 500, body: 'Server Error' });
      });

      // Complete tour
      await page.getByTestId('tour-finish-btn').click();
      
      // Verify error is handled
      await expect(page.getByTestId('error-message')).toBeVisible();
    });
  });

  test.describe('Performance and Loading', () => {
    test('should load onboarding state efficiently', async ({ page }) => {
      await loginAsUser(page, newUser);
      
      // Measure load time
      const startTime = Date.now();
      await page.goto('/dashboard');
      const loadTime = Date.now() - startTime;
      
      // Verify load time is reasonable
      expect(loadTime).toBeLessThan(3000);
      
      // Verify onboarding components load
      await expect(page.getByTestId('progressive-disclosure')).toBeVisible();
    });

    test('should handle slow API responses gracefully', async ({ page }) => {
      await loginAsUser(page, newUser);
      await page.goto('/dashboard');

      // Simulate slow API response
      await page.route('**/api/onboarding/**', route => {
        setTimeout(() => {
          route.fulfill({ status: 200, body: JSON.stringify({ stage: 'completed' }) });
        }, 2000);
      });

      // Verify loading state is shown
      await page.getByTestId('complete-onboarding-step').click();
      await expect(page.getByTestId('loading-spinner')).toBeVisible();
    });
  });
}); 
