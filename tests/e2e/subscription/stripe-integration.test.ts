/**
 * E2E Tests: Stripe Integration and Billing Flow
 * 
 * These tests validate the Stripe integration for subscription management,
 * payment processing, and billing operations.
 * 
 * Test Strategy:
 * - Stripe checkout flow testing
 * - Subscription creation and management
 * - Payment processing validation
 * - Webhook handling simulation
 * - Error handling for payment failures
 */

import { test, expect, Page } from '@playwright/test';
import { 
  setupE2E,
  loginAndNavigate,
  getPrimaryActionButton
} from '../../helpers/e2eHelpers';
import { cleanupTestUser } from '../../helpers/testUtils';
import { TestUser, createTestUser } from '../../helpers/testUtils.auth';

test.describe('Stripe Integration and Billing Flow', () => {
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

  test.describe('Stripe Checkout Flow', () => {
    test('should redirect to Stripe checkout for plan upgrade', async () => {
      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Click upgrade to starter button
      await page.click('[data-testid="upgrade-to-starter-btn"]');
      await page.waitForSelector('[data-testid="upgrade-modal"]');

      // Select monthly billing
      await page.click('[data-testid="monthly-billing-option"]');

      // Confirm upgrade
      await page.click('[data-testid="confirm-upgrade-btn"]');

      // Mock Stripe checkout session creation
      await page.route('/api/subscription/create-checkout', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            checkoutUrl: 'https://checkout.stripe.com/test-session-123',
            sessionId: 'cs_test_123'
          })
        });
      });

      // Verify redirect to Stripe checkout
      await page.waitForURL('https://checkout.stripe.com/test-session-123');
    });

    test('should handle Stripe checkout session creation errors', async () => {
      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Click upgrade and proceed to checkout
      await page.click('[data-testid="upgrade-to-starter-btn"]');
      await page.waitForSelector('[data-testid="upgrade-modal"]');
      await page.click('[data-testid="confirm-upgrade-btn"]');

      // Mock Stripe API error
      await page.route('/api/subscription/create-checkout', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid request parameters' })
        });
      });

      // Verify error message is shown
      await expect(page.locator('[data-testid="checkout-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="checkout-error"]')).toContainText('Unable to create checkout session');
    });

    test('should show loading state during checkout creation', async () => {
      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Click upgrade and proceed to checkout
      await page.click('[data-testid="upgrade-to-starter-btn"]');
      await page.waitForSelector('[data-testid="upgrade-modal"]');
      await page.click('[data-testid="confirm-upgrade-btn"]');

      // Verify loading state
      await expect(page.locator('[data-testid="confirm-upgrade-btn"]')).toHaveAttribute('disabled');
      await expect(page.locator('[data-testid="confirm-upgrade-btn"]')).toContainText('Creating checkout session...');
    });
  });

  test.describe('Subscription Success Flow', () => {
    test('should handle successful subscription creation', async () => {
      // Mock successful checkout completion
      await page.goto('/dashboard?subscription=success&session_id=cs_test_123');
      await page.waitForLoadState('networkidle');

      // Verify success message
      await expect(page.locator('[data-testid="subscription-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="subscription-success"]')).toContainText('Welcome to Starter Plan!');

      // Verify plan status updated
      await expect(page.locator('[data-testid="current-plan-status"]')).toContainText('Starter Plan');
      await expect(page.locator('[data-testid="plan-price"]')).toContainText('$29/month');
    });

    test('should update usage limits after successful upgrade', async () => {
      // Mock successful subscription with updated limits
      await page.route('/api/subscription/current', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            planType: 'STARTER',
            status: 'active',
            apiConnectionsLimit: 25,
            workflowExecutionsLimit: 500,
            directApiCallsLimit: 500,
            totalExecutionsLimit: 1000
          })
        });
      });

      await page.goto('/dashboard?subscription=success&session_id=cs_test_123');
      await page.waitForLoadState('networkidle');

      // Verify updated limits are displayed
      await expect(page.locator('[data-testid="api-connections-text"]')).toContainText('0 / 25 connections');
      await expect(page.locator('[data-testid="workflow-executions-text"]')).toContainText('0 / 500 executions');
      await expect(page.locator('[data-testid="direct-api-calls-text"]')).toContainText('0 / 500 calls');
      await expect(page.locator('[data-testid="total-executions-text"]')).toContainText('0 / 1,000 total executions');
    });

    test('should redirect to subscription page after success', async () => {
      await page.goto('/dashboard?subscription=success&session_id=cs_test_123');
      await page.waitForLoadState('networkidle');

      // Verify redirect to subscription tab
      await expect(page).toHaveURL('/dashboard?tab=subscription');
    });
  });

  test.describe('Subscription Cancellation Flow', () => {
    test('should allow subscription cancellation', async () => {
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

      // Click cancel plan button
      await page.click('[data-testid="cancel-plan-btn"]');
      await page.waitForSelector('[data-testid="cancel-plan-modal"]');

      // Verify cancellation modal
      await expect(page.locator('[data-testid="cancel-plan-title"]')).toContainText('Cancel Subscription');
      await expect(page.locator('[data-testid="cancel-plan-warning"]')).toContainText('Are you sure you want to cancel your subscription?');
    });

    test('should confirm cancellation and update plan status', async () => {
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

      // Mock successful cancellation
      await page.route('/api/subscription/cancel', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Subscription cancelled successfully'
          })
        });
      });

      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Cancel subscription
      await page.click('[data-testid="cancel-plan-btn"]');
      await page.waitForSelector('[data-testid="cancel-plan-modal"]');
      await page.click('[data-testid="confirm-cancel-btn"]');

      // Verify cancellation success
      await expect(page.locator('[data-testid="cancellation-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancellation-success"]')).toContainText('Subscription cancelled successfully');
    });

    test('should handle cancellation errors', async () => {
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

      // Mock cancellation error
      await page.route('/api/subscription/cancel', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unable to cancel subscription' })
        });
      });

      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Try to cancel subscription
      await page.click('[data-testid="cancel-plan-btn"]');
      await page.waitForSelector('[data-testid="cancel-plan-modal"]');
      await page.click('[data-testid="confirm-cancel-btn"]');

      // Verify error message
      await expect(page.locator('[data-testid="cancellation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancellation-error"]')).toContainText('Unable to cancel subscription');
    });
  });

  test.describe('Billing History and Invoices', () => {
    test('should display billing history for paid plans', async () => {
      // Mock paid plan with invoices
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

      await page.route('/api/subscription/invoices', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'in_123',
              amount: 2900,
              currency: 'usd',
              status: 'paid',
              createdAt: '2024-01-01T00:00:00Z',
              downloadUrl: '/api/invoices/in_123/download'
            },
            {
              id: 'in_124',
              amount: 2900,
              currency: 'usd',
              status: 'paid',
              createdAt: '2024-02-01T00:00:00Z',
              downloadUrl: '/api/invoices/in_124/download'
            }
          ])
        });
      });

      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Verify billing history section
      await expect(page.locator('[data-testid="billing-history-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="billing-history-title"]')).toContainText('Billing History');

      // Verify invoices are displayed
      await expect(page.locator('[data-testid="invoice-item"]')).toHaveCount(2);
      await expect(page.locator('[data-testid="invoice-amount"]').first()).toContainText('$29.00');
      await expect(page.locator('[data-testid="invoice-status"]').first()).toContainText('Paid');
    });

    test('should allow invoice download', async () => {
      // Mock paid plan with invoices
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

      await page.route('/api/subscription/invoices', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'in_123',
              amount: 2900,
              currency: 'usd',
              status: 'paid',
              createdAt: '2024-01-01T00:00:00Z',
              downloadUrl: '/api/invoices/in_123/download'
            }
          ])
        });
      });

      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Click download invoice button
      await page.click('[data-testid="download-invoice-btn"]');

      // Verify download starts (mocked)
      await expect(page.locator('[data-testid="download-started"]')).toBeVisible();
    });

    test('should show no invoices message for free plan', async () => {
      // Mock free plan user
      await page.route('/api/subscription/current', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            planType: 'FREE',
            status: 'active'
          })
        });
      });

      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Verify no invoices message
      await expect(page.locator('[data-testid="no-invoices-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="no-invoices-message"]')).toContainText('No billing history for free plan');
    });
  });

  test.describe('Payment Method Management', () => {
    test('should allow payment method updates', async () => {
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

      // Click update payment method
      await page.click('[data-testid="update-payment-method-btn"]');

      // Verify Stripe customer portal opens
      await expect(page.locator('[data-testid="stripe-customer-portal"]')).toBeVisible();
    });

    test('should handle payment method update errors', async () => {
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

      // Mock payment method update error
      await page.route('/api/subscription/customer-portal', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unable to access customer portal' })
        });
      });

      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Try to update payment method
      await page.click('[data-testid="update-payment-method-btn"]');

      // Verify error message
      await expect(page.locator('[data-testid="payment-method-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-method-error"]')).toContainText('Unable to access payment settings');
    });
  });

  test.describe('Webhook Handling Simulation', () => {
    test('should handle subscription created webhook', async () => {
      // Mock webhook payload
      const webhookPayload = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
          }
        }
      };

      // Simulate webhook call
      const response = await page.request.post('/api/webhooks/stripe', {
        data: webhookPayload
      });

      expect(response.status()).toBe(200);
    });

    test('should handle subscription updated webhook', async () => {
      const webhookPayload = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
          }
        }
      };

      const response = await page.request.post('/api/webhooks/stripe', {
        data: webhookPayload
      });

      expect(response.status()).toBe(200);
    });

    test('should handle subscription deleted webhook', async () => {
      const webhookPayload = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'canceled'
          }
        }
      };

      const response = await page.request.post('/api/webhooks/stripe', {
        data: webhookPayload
      });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle Stripe API errors gracefully', async () => {
      // Mock Stripe API error
      await page.route('/api/subscription/create-checkout', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Stripe API error' })
        });
      });

      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Try to upgrade
      await page.click('[data-testid="upgrade-to-starter-btn"]');
      await page.waitForSelector('[data-testid="upgrade-modal"]');
      await page.click('[data-testid="confirm-upgrade-btn"]');

      // Verify error handling
      await expect(page.locator('[data-testid="checkout-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="checkout-error"]')).toContainText('Payment service temporarily unavailable');
    });

    test('should handle network errors during checkout', async () => {
      await page.goto('/dashboard?tab=subscription');
      await page.waitForLoadState('networkidle');

      // Click upgrade and proceed to checkout
      await page.click('[data-testid="upgrade-to-starter-btn"]');
      await page.waitForSelector('[data-testid="upgrade-modal"]');
      await page.click('[data-testid="confirm-upgrade-btn"]');

      // Mock network error
      await page.route('/api/subscription/create-checkout', route => {
        route.abort('Failed');
      });

      // Verify error handling
      await expect(page.locator('[data-testid="checkout-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="checkout-error"]')).toContainText('Network error occurred');
    });

    test('should validate webhook signatures', async () => {
      // Mock invalid webhook signature
      const response = await page.request.post('/api/webhooks/stripe', {
        data: { type: 'test' },
        headers: {
          'stripe-signature': 'invalid_signature'
        }
      });

      expect(response.status()).toBe(400);
    });
  });
});
