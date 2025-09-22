/**
 * E2E Tests: Subscription Management System
 * 
 * These tests serve as implementation guidance for the SaaS freemium billing system.
 * Tests cover subscription management in user dropdown, usage tracking, and plan enforcement.
 * 
 * Test Strategy:
 * - User journey tests for subscription management
 * - Plan limit enforcement validation
 * - Usage tracking verification
 * - UI/UX compliance validation
 * - Error handling and edge cases
 */

import { test, expect, Page } from '@playwright/test';
import { 
  setupE2E,
  loginAndNavigate,
  getPrimaryActionButton
} from '../../helpers/e2eHelpers';
import { cleanupTestUser } from '../../helpers/testUtils';
import { TestUser, createTestUser } from '../../helpers/testUtils.auth';

test.describe('Subscription Management System', () => {
  let page: Page;
  let testUser: TestUser;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    testUser = await createTestUser();
    await loginAndNavigate(page, testUser);
  });

  test.afterEach(async () => {
    await cleanupTestUser(testUser);
    await page.close();
  });

  test.describe('User Dropdown Subscription Access', () => {
    test('should display subscription option in user dropdown', async () => {
      // Navigate to dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Click user dropdown
      await page.click('[data-testid="user-dropdown-trigger"]');
      await page.waitForSelector('[data-testid="user-dropdown-menu"]');

      // Verify subscription option is visible
      await expect(page.locator('[data-testid="subscription-menu-item"]')).toBeVisible();
      await expect(page.locator('[data-testid="subscription-menu-item"]')).toContainText('Subscription');
    });

    test('should show current plan status in dropdown', async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Open user dropdown
      await page.click('[data-testid="user-dropdown-trigger"]');
      await page.waitForSelector('[data-testid="user-dropdown-menu"]');

      // Verify plan status is displayed
      await expect(page.locator('[data-testid="current-plan-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-plan-status"]')).toContainText('Free Plan');
    });

    test('should navigate to subscription page when clicked', async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Open user dropdown and click subscription
      await page.click('[data-testid="user-dropdown-trigger"]');
      await page.waitForSelector('[data-testid="user-dropdown-menu"]');
      await page.click('[data-testid="subscription-menu-item"]');

      // Verify navigation to subscription page
      await expect(page).toHaveURL('/dashboard?tab=subscription');
      await expect(page.locator('h1')).toContainText('Subscription Management');
    });
  });

  test.describe('Subscription Dashboard', () => {
    test.beforeEach(async () => {
      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');
    });

    test('should display current plan information', async () => {
      // Verify plan details are shown
      await expect(page.locator('[data-testid="current-plan-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-name"]')).toContainText('Free Plan');
      await expect(page.locator('[data-testid="plan-price"]')).toContainText('$0/month');
    });

    test('should display usage statistics with progress bars', async () => {
      // Verify usage section is visible
      await expect(page.locator('[data-testid="usage-section"]')).toBeVisible();
      
      // Check API connections usage
      await expect(page.locator('[data-testid="api-connections-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-connections-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-connections-text"]')).toContainText('0 / 5 connections');

      // Check workflow executions usage
      await expect(page.locator('[data-testid="workflow-executions-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-executions-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-executions-text"]')).toContainText('0 / 50 executions');

      // Check direct API calls usage
      await expect(page.locator('[data-testid="direct-api-calls-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="direct-api-calls-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="direct-api-calls-text"]')).toContainText('0 / 50 calls');

      // Check total executions usage
      await expect(page.locator('[data-testid="total-executions-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-executions-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-executions-text"]')).toContainText('0 / 100 total executions');
    });

    test('should display available plans for upgrade', async () => {
      // Verify plans section is visible
      await expect(page.locator('[data-testid="available-plans-section"]')).toBeVisible();
      
      // Check Starter plan
      await expect(page.locator('[data-testid="starter-plan-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="starter-plan-name"]')).toContainText('Starter');
      await expect(page.locator('[data-testid="starter-plan-price"]')).toContainText('$29/month');
      await expect(page.locator('[data-testid="starter-plan-connections"]')).toContainText('25 connections');
      await expect(page.locator('[data-testid="starter-plan-executions"]')).toContainText('1,000 executions');

      // Check Professional plan
      await expect(page.locator('[data-testid="professional-plan-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="professional-plan-name"]')).toContainText('Professional');
      await expect(page.locator('[data-testid="professional-plan-price"]')).toContainText('$99/month');
      await expect(page.locator('[data-testid="professional-plan-connections"]')).toContainText('100 connections');
      await expect(page.locator('[data-testid="professional-plan-executions"]')).toContainText('10,000 executions');
    });

    test('should show upgrade buttons for each plan', async () => {
      // Verify upgrade buttons are present and functional
      await expect(page.locator('[data-testid="upgrade-to-starter-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-to-starter-btn"]')).toContainText('Upgrade to Starter');
      
      await expect(page.locator('[data-testid="upgrade-to-professional-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-to-professional-btn"]')).toContainText('Upgrade to Professional');
    });
  });

  test.describe('Plan Upgrade Flow', () => {
    test.beforeEach(async () => {
      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');
    });

    test('should open upgrade modal when upgrade button is clicked', async () => {
      // Click upgrade to starter button
      await page.click('[data-testid="upgrade-to-starter-btn"]');
      
      // Verify upgrade modal opens
      await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-modal-title"]')).toContainText('Upgrade to Starter Plan');
    });

    test('should display plan comparison in upgrade modal', async () => {
      await page.click('[data-testid="upgrade-to-starter-btn"]');
      await page.waitForSelector('[data-testid="upgrade-modal"]');

      // Verify current vs new plan comparison
      await expect(page.locator('[data-testid="current-plan-comparison"]')).toBeVisible();
      await expect(page.locator('[data-testid="new-plan-comparison"]')).toBeVisible();
      
      // Check feature comparison
      await expect(page.locator('[data-testid="connections-comparison"]')).toBeVisible();
      await expect(page.locator('[data-testid="executions-comparison"]')).toBeVisible();
    });

    test('should show billing cycle options', async () => {
      await page.click('[data-testid="upgrade-to-starter-btn"]');
      await page.waitForSelector('[data-testid="upgrade-modal"]');

      // Verify billing cycle options
      await expect(page.locator('[data-testid="monthly-billing-option"]')).toBeVisible();
      await expect(page.locator('[data-testid="yearly-billing-option"]')).toBeVisible();
      
      // Check yearly discount is shown
      await expect(page.locator('[data-testid="yearly-discount"]')).toBeVisible();
      await expect(page.locator('[data-testid="yearly-discount"]')).toContainText('Save 20%');
    });

    test('should proceed to Stripe checkout when confirmed', async () => {
      await page.click('[data-testid="upgrade-to-starter-btn"]');
      await page.waitForSelector('[data-testid="upgrade-modal"]');

      // Select monthly billing
      await page.click('[data-testid="monthly-billing-option"]');
      
      // Click confirm upgrade
      await page.click('[data-testid="confirm-upgrade-btn"]');

      // Verify Stripe checkout opens (mocked in test environment)
      await expect(page.locator('[data-testid="stripe-checkout"]')).toBeVisible();
    });
  });

  test.describe('Usage Limit Enforcement', () => {
    test('should show warning when approaching API connection limit', async () => {
      // Mock user with 4/5 connections used
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 4, limit: 5 },
            workflowExecutions: { used: 10, limit: 50 },
            directApiCalls: { used: 5, limit: 50 },
            totalExecutions: { used: 15, limit: 100 }
          })
        });
      });

      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Verify warning is shown
      await expect(page.locator('[data-testid="api-connections-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-connections-warning"]')).toContainText('You are approaching your connection limit');
    });

    test('should block new API connection when limit reached', async () => {
      // Mock user at connection limit
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 5, limit: 5 },
            workflowExecutions: { used: 10, limit: 50 },
            directApiCalls: { used: 5, limit: 50 },
            totalExecutions: { used: 15, limit: 100 }
          })
        });
      });

      await page.goto('/dashboard?tab=connections');
      await page.waitForLoadState('networkidle');

      // Try to create new connection
      await page.click('[data-testid="create-connection-btn"]');

      // Verify limit reached modal appears
      await expect(page.locator('[data-testid="limit-reached-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="limit-reached-title"]')).toContainText('API Connection Limit Reached');
      await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible();
    });

    test('should block workflow execution when limit reached', async () => {
      // Mock user at execution limit
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            apiConnections: { used: 3, limit: 5 },
            workflowExecutions: { used: 50, limit: 50 },
            directApiCalls: { used: 50, limit: 50 },
            totalExecutions: { used: 100, limit: 100 }
          })
        });
      });

      await page.goto('/dashboard?tab=workflows');
      await page.waitForLoadState('networkidle');

      // Try to execute workflow
      await page.click('[data-testid="execute-workflow-btn"]');

      // Verify limit reached modal appears
      await expect(page.locator('[data-testid="limit-reached-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="limit-reached-title"]')).toContainText('Execution Limit Reached');
    });
  });

  test.describe('Billing History and Management', () => {
    test.beforeEach(async () => {
      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');
    });

    test('should display billing history section', async () => {
      // Verify billing history section exists
      await expect(page.locator('[data-testid="billing-history-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="billing-history-title"]')).toContainText('Billing History');
    });

    test('should show no invoices for free plan', async () => {
      // Verify no invoices message for free plan
      await expect(page.locator('[data-testid="no-invoices-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="no-invoices-message"]')).toContainText('No billing history for free plan');
    });

    test('should display invoices for paid plans', async () => {
      // Mock paid plan with invoices
      await page.route('/api/subscription/invoices', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'inv_123',
              amount: 2900,
              currency: 'usd',
              status: 'paid',
              createdAt: '2024-01-01T00:00:00Z',
              downloadUrl: '/api/invoices/inv_123/download'
            }
          ])
        });
      });

      // Refresh page to load invoices
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify invoice is displayed
      await expect(page.locator('[data-testid="invoice-item"]')).toBeVisible();
      await expect(page.locator('[data-testid="invoice-amount"]')).toContainText('$29.00');
      await expect(page.locator('[data-testid="invoice-status"]')).toContainText('Paid');
    });
  });

  test.describe('Plan Management Actions', () => {
    test('should allow plan cancellation for paid plans', async () => {
      // Mock paid plan user
      await page.route('/api/subscription/current', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            planType: 'STARTER',
            status: 'active',
            stripeSubscriptionId: 'sub_123'
          })
        });
      });

      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Verify cancel plan option is available
      await expect(page.locator('[data-testid="cancel-plan-btn"]')).toBeVisible();
    });

    test('should show plan cancellation confirmation', async () => {
      await page.route('/api/subscription/current', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            planType: 'STARTER',
            status: 'active',
            stripeSubscriptionId: 'sub_123'
          })
        });
      });

      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Click cancel plan
      await page.click('[data-testid="cancel-plan-btn"]');

      // Verify cancellation modal
      await expect(page.locator('[data-testid="cancel-plan-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-plan-warning"]')).toContainText('Are you sure you want to cancel your subscription?');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle subscription API errors gracefully', async () => {
      // Mock API error
      await page.route('/api/subscription/usage', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Verify error message is shown
      await expect(page.locator('[data-testid="subscription-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="subscription-error"]')).toContainText('Unable to load subscription data');
    });

    test('should handle Stripe checkout errors', async () => {
      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Click upgrade and proceed to checkout
      await page.click('[data-testid="upgrade-to-starter-btn"]');
      await page.waitForSelector('[data-testid="upgrade-modal"]');
      await page.click('[data-testid="confirm-upgrade-btn"]');

      // Mock Stripe error
      await page.route('/api/subscription/create-checkout', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid payment method' })
        });
      });

      // Verify error handling
      await expect(page.locator('[data-testid="checkout-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="checkout-error"]')).toContainText('Unable to process payment');
    });
  });

  test.describe('UX Compliance and Accessibility', () => {
    test('should have proper heading hierarchy', async () => {
      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Verify main heading
      await expect(page.locator('h1')).toContainText('Subscription Management');
      
      // Verify section headings
      await expect(page.locator('h2[data-testid="current-plan-heading"]')).toBeVisible();
      await expect(page.locator('h2[data-testid="usage-heading"]')).toBeVisible();
      await expect(page.locator('h2[data-testid="available-plans-heading"]')).toBeVisible();
    });

    test('should have proper form labels and accessibility', async () => {
      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Open upgrade modal
      await page.click('[data-testid="upgrade-to-starter-btn"]');
      await page.waitForSelector('[data-testid="upgrade-modal"]');

      // Verify form accessibility
      await expect(page.locator('[data-testid="billing-cycle-radio-group"]')).toHaveAttribute('role', 'radiogroup');
      await expect(page.locator('[data-testid="monthly-billing-option"]')).toHaveAttribute('aria-label', 'Monthly billing');
      await expect(page.locator('[data-testid="yearly-billing-option"]')).toHaveAttribute('aria-label', 'Yearly billing');
    });

    test('should have proper button states and loading indicators', async () => {
      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Click upgrade button
      await page.click('[data-testid="upgrade-to-starter-btn"]');
      await page.waitForSelector('[data-testid="upgrade-modal"]');

      // Verify loading state on confirm button
      await page.click('[data-testid="confirm-upgrade-btn"]');
      await expect(page.locator('[data-testid="confirm-upgrade-btn"]')).toHaveAttribute('disabled');
      await expect(page.locator('[data-testid="confirm-upgrade-btn"]')).toContainText('Processing...');
    });
  });
});
