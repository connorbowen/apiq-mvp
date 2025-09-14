/**
 * Usage Tracking E2E Test Helpers
 * 
 * Comprehensive helper functions for testing usage tracking, billing, and analytics functionality.
 * Follows user-rules.md requirements for real data testing and UX compliance.
 */

import { Page, expect } from '@playwright/test';
import { TestUser } from './testUtils';
import { prisma } from '../../lib/database/client';
import { generateTestId } from './testUtils';

// Usage tracking test data interfaces
export interface UsageTestData {
  userId: string;
  usageRecords: any[];
  pricingConfigs: any[];
  usageSummaries: any[];
  cleanup: () => Promise<void>;
}

export interface UsageDashboardData {
  currentUsage: {
    totalTokens: number;
    totalCost: number;
    requests: number;
  };
  monthlyUsage: {
    tokens: number;
    cost: number;
    requests: number;
  };
  planLimits: {
    tokens: number;
    cost: number;
    requests: number;
  };
}

/**
 * Create comprehensive usage test data
 */
export async function createUsageTestData(userId: string): Promise<UsageTestData> {
  const testId = generateTestId('usage');
  
  // Create test pricing configurations
  const pricingConfigs = await Promise.all([
    prisma.pricingConfig.create({
      data: {
        serviceType: 'openai_chat',
        model: 'gpt-4-turbo-preview',
        promptPricePer1K: 30, // $0.30 per 1K tokens
        completionPricePer1K: 60, // $0.60 per 1K tokens
        freeTierLimit: 10000, // 10K tokens
        proTierLimit: 100000, // 100K tokens
        businessTierLimit: 1000000, // 1M tokens
        overagePricePer1K: 90, // $0.90 per 1K tokens
        isActive: true,
        effectiveFrom: new Date(),
      }
    }),
    prisma.pricingConfig.create({
      data: {
        serviceType: 'openai_workflow_generation',
        model: 'gpt-4-turbo-preview',
        promptPricePer1K: 30,
        completionPricePer1K: 60,
        freeTierLimit: 5000,
        proTierLimit: 50000,
        businessTierLimit: 500000,
        overagePricePer1K: 90,
        isActive: true,
        effectiveFrom: new Date(),
      }
    })
  ]);

  // Create test usage records
  const usageRecords = await Promise.all([
    prisma.usageRecord.create({
      data: {
        userId,
        serviceType: 'openai_chat',
        model: 'gpt-4-turbo-preview',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        promptCost: 3, // 0.03 cents
        completionCost: 3, // 0.03 cents
        totalCost: 6, // 0.06 cents
        requestId: `test-request-${testId}-1`,
        endpoint: '/api/chat',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      }
    }),
    prisma.usageRecord.create({
      data: {
        userId,
        serviceType: 'openai_workflow_generation',
        model: 'gpt-4-turbo-preview',
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300,
        promptCost: 6,
        completionCost: 6,
        totalCost: 12,
        requestId: `test-request-${testId}-2`,
        endpoint: '/api/workflows/generate',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      }
    }),
    prisma.usageRecord.create({
      data: {
        userId,
        serviceType: 'openai_chat',
        model: 'gpt-4-turbo-preview',
        promptTokens: 150,
        completionTokens: 75,
        totalTokens: 225,
        promptCost: 5,
        completionCost: 5,
        totalCost: 10,
        requestId: `test-request-${testId}-3`,
        endpoint: '/api/chat',
        createdAt: new Date(), // Now
      }
    })
  ]);

  // Create monthly usage summary
  const currentMonth = new Date();
  const usageSummaries = await Promise.all([
    prisma.usageSummary.create({
      data: {
        userId,
        year: currentMonth.getFullYear(),
        month: currentMonth.getMonth() + 1,
        serviceType: 'openai_chat',
        totalRequests: 2,
        totalTokens: 375, // 150 + 225
        totalCost: 16, // 6 + 10
        planLimit: 10000,
        overageAmount: 0,
        overageCharges: 0,
      }
    }),
    prisma.usageSummary.create({
      data: {
        userId,
        year: currentMonth.getFullYear(),
        month: currentMonth.getMonth() + 1,
        serviceType: 'openai_workflow_generation',
        totalRequests: 1,
        totalTokens: 300,
        totalCost: 12,
        planLimit: 5000,
        overageAmount: 0,
        overageCharges: 0,
      }
    })
  ]);

  const cleanup = async () => {
    await prisma.usageRecord.deleteMany({
      where: { userId }
    });
    await prisma.usageSummary.deleteMany({
      where: { userId }
    });
    await prisma.pricingConfig.deleteMany({
      where: { id: { in: pricingConfigs.map(p => p.id) } }
    });
  };

  return {
    userId,
    usageRecords,
    pricingConfigs,
    usageSummaries,
    cleanup
  };
}

/**
 * Verify usage tracking is working correctly
 */
export async function verifyUsageTracking(
  page: Page, 
  expectedTokens: number, 
  expectedCost: number,
  serviceType: string = 'openai_chat'
): Promise<void> {
  // Wait for usage to be tracked
  await page.waitForTimeout(2000);
  
  // Navigate to usage dashboard
  await page.goto('/dashboard?tab=usage');
  await page.waitForSelector('[data-testid="usage-dashboard"]', { timeout: 10000 });
  
  // Verify usage metrics are displayed
  await expect(page.locator('[data-testid="current-usage-tokens"]')).toContainText(expectedTokens.toString());
  await expect(page.locator('[data-testid="current-usage-cost"]')).toContainText(`$${(expectedCost / 100).toFixed(2)}`);
  
  // Verify service type breakdown
  await expect(page.locator(`[data-testid="usage-breakdown-${serviceType}"]`)).toBeVisible();
}

/**
 * Test usage dashboard functionality
 */
export async function testUsageDashboard(page: Page): Promise<void> {
  // Navigate to usage dashboard
  await page.goto('/dashboard?tab=usage');
  await page.waitForSelector('[data-testid="usage-dashboard"]', { timeout: 10000 });
  
  // Validate UX compliance
  await validateUsageUXCompliance(page);
  
  // Test dashboard elements
  await expect(page.locator('h1, h2')).toContainText(/usage|billing|analytics/i);
  await expect(page.locator('[data-testid="current-usage-card"]')).toBeVisible();
  await expect(page.locator('[data-testid="monthly-usage-card"]')).toBeVisible();
  await expect(page.locator('[data-testid="plan-limits-card"]')).toBeVisible();
  
  // Test usage metrics display
  await expect(page.locator('[data-testid="total-tokens"]')).toBeVisible();
  await expect(page.locator('[data-testid="total-cost"]')).toBeVisible();
  await expect(page.locator('[data-testid="total-requests"]')).toBeVisible();
  
  // Test service breakdown
  await expect(page.locator('[data-testid="usage-breakdown"]')).toBeVisible();
  await expect(page.locator('[data-testid="usage-chart"]')).toBeVisible();
}

/**
 * Validate UX compliance for usage features
 */
export async function validateUsageUXCompliance(page: Page): Promise<void> {
  // Test headings and hierarchy
  const headings = page.locator('h1, h2, h3');
  await expect(headings.first()).toBeVisible();
  
  // Test form accessibility
  const forms = page.locator('form');
  if (await forms.count() > 0) {
    for (let i = 0; i < await forms.count(); i++) {
      const form = forms.nth(i);
      const inputs = form.locator('input, select, textarea');
      
      for (let j = 0; j < await inputs.count(); j++) {
        const input = inputs.nth(j);
        const id = await input.getAttribute('id');
        if (id) {
          await expect(form.locator(`label[for="${id}"]`)).toBeVisible();
        }
      }
    }
  }
  
  // Test primary action buttons
  const primaryButtons = page.locator('[data-testid*="primary-action"]');
  if (await primaryButtons.count() > 0) {
    for (let i = 0; i < await primaryButtons.count(); i++) {
      const button = primaryButtons.nth(i);
      await expect(button).toBeVisible();
      await expect(button).toHaveAttribute('type', 'button');
    }
  }
  
  // Test error/success messaging
  const messages = page.locator('[data-testid*="message"], [role="alert"]');
  if (await messages.count() > 0) {
    for (let i = 0; i < await messages.count(); i++) {
      const message = messages.nth(i);
      await expect(message).toBeVisible();
    }
  }
  
  // Test mobile responsiveness
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator('[data-testid="usage-dashboard"]')).toBeVisible();
  
  // Reset viewport
  await page.setViewportSize({ width: 1280, height: 720 });
}

/**
 * Test billing integration functionality
 */
export async function testBillingIntegration(page: Page): Promise<void> {
  // Navigate to billing section
  await page.goto('/dashboard?tab=billing');
  await page.waitForSelector('[data-testid="billing-dashboard"]', { timeout: 10000 });
  
  // Test plan display
  await expect(page.locator('[data-testid="current-plan"]')).toBeVisible();
  await expect(page.locator('[data-testid="plan-limits"]')).toBeVisible();
  
  // Test usage vs limits
  await expect(page.locator('[data-testid="usage-progress"]')).toBeVisible();
  
  // Test upgrade prompts (if applicable)
  const upgradeButton = page.locator('[data-testid="primary-action upgrade-plan"]');
  if (await upgradeButton.count() > 0) {
    await expect(upgradeButton).toBeVisible();
  }
  
  // Test billing history
  await expect(page.locator('[data-testid="billing-history"]')).toBeVisible();
  
  // Validate UX compliance
  await validateUsageUXCompliance(page);
}

/**
 * Test usage analytics functionality
 */
export async function testUsageAnalytics(page: Page): Promise<void> {
  // Navigate to analytics section
  await page.goto('/dashboard?tab=analytics');
  await page.waitForSelector('[data-testid="analytics-dashboard"]', { timeout: 10000 });
  
  // Test analytics charts
  await expect(page.locator('[data-testid="usage-trend-chart"]')).toBeVisible();
  await expect(page.locator('[data-testid="cost-breakdown-chart"]')).toBeVisible();
  
  // Test date range selector
  const dateRange = page.locator('[data-testid="date-range-selector"]');
  if (await dateRange.count() > 0) {
    await expect(dateRange).toBeVisible();
  }
  
  // Test export functionality
  const exportButton = page.locator('[data-testid="primary-action export-data"]');
  if (await exportButton.count() > 0) {
    await expect(exportButton).toBeVisible();
  }
  
  // Test filter options
  const filters = page.locator('[data-testid="analytics-filters"]');
  if (await filters.count() > 0) {
    await expect(filters).toBeVisible();
  }
  
  // Validate UX compliance
  await validateUsageUXCompliance(page);
}

/**
 * Simulate usage for testing scenarios
 */
export async function simulateUsage(
  userId: string, 
  serviceType: string, 
  tokens: number, 
  cost: number
): Promise<void> {
  const testId = generateTestId('simulated-usage');
  
  await prisma.usageRecord.create({
    data: {
      userId,
      serviceType,
      model: 'gpt-4-turbo-preview',
      promptTokens: Math.floor(tokens * 0.6),
      completionTokens: Math.floor(tokens * 0.4),
      totalTokens: tokens,
      promptCost: Math.floor(cost * 0.5),
      completionCost: Math.floor(cost * 0.5),
      totalCost: cost,
      requestId: `simulated-${testId}`,
      endpoint: `/api/${serviceType}`,
      createdAt: new Date(),
    }
  });
}

/**
 * Reset usage limits for testing
 */
export async function resetUsageLimits(userId: string): Promise<void> {
  await prisma.usageSummary.deleteMany({
    where: { userId }
  });
  
  await prisma.usageRecord.deleteMany({
    where: { userId }
  });
}

/**
 * Create test pricing configuration
 */
export async function createTestPricingConfig(
  serviceType: string,
  model: string,
  promptPrice: number,
  completionPrice: number
): Promise<any> {
  return await prisma.pricingConfig.create({
    data: {
      serviceType,
      model,
      promptPricePer1K: promptPrice,
      completionPricePer1K: completionPrice,
      freeTierLimit: 1000,
      proTierLimit: 10000,
      businessTierLimit: 100000,
      overagePricePer1K: Math.floor(promptPrice * 1.5),
      isActive: true,
      effectiveFrom: new Date(),
    }
  });
}

/**
 * Clean up usage test data
 */
export async function cleanupUsageTestData(userId: string): Promise<void> {
  await prisma.usageRecord.deleteMany({
    where: { userId }
  });
  
  await prisma.usageSummary.deleteMany({
    where: { userId }
  });
  
  await prisma.pricingConfig.deleteMany({
    where: {
      serviceType: { in: ['openai_chat', 'openai_workflow_generation'] },
      model: 'gpt-4-turbo-preview'
    }
  });
}

/**
 * Test usage limit enforcement
 */
export async function testUsageLimitEnforcement(page: Page, userId: string): Promise<void> {
  // Simulate hitting usage limits
  await simulateUsage(userId, 'openai_chat', 50000, 5000); // 50K tokens, $50
  
  // Navigate to usage dashboard
  await page.goto('/dashboard?tab=usage');
  await page.waitForSelector('[data-testid="usage-dashboard"]', { timeout: 10000 });
  
  // Verify limit warnings are displayed
  await expect(page.locator('[data-testid="usage-limit-warning"]')).toBeVisible();
  await expect(page.locator('[data-testid="overage-notice"]')).toBeVisible();
  
  // Test upgrade prompt
  await expect(page.locator('[data-testid="primary-action upgrade-plan"]')).toBeVisible();
}

/**
 * Test real-time usage updates
 */
export async function testRealTimeUsageUpdates(page: Page, userId: string): Promise<void> {
  // Navigate to usage dashboard
  await page.goto('/dashboard?tab=usage');
  await page.waitForSelector('[data-testid="usage-dashboard"]', { timeout: 10000 });
  
  // Get initial usage count
  const initialTokens = await page.locator('[data-testid="current-usage-tokens"]').textContent();
  const initialCost = await page.locator('[data-testid="current-usage-cost"]').textContent();
  
  // Simulate new usage
  await simulateUsage(userId, 'openai_chat', 100, 10);
  
  // Wait for real-time update
  await page.waitForTimeout(3000);
  
  // Verify usage updated
  const updatedTokens = await page.locator('[data-testid="current-usage-tokens"]').textContent();
  const updatedCost = await page.locator('[data-testid="current-usage-cost"]').textContent();
  
  expect(updatedTokens).not.toBe(initialTokens);
  expect(updatedCost).not.toBe(initialCost);
}
