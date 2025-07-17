// Performance testing helpers for APIQ E2E tests
// See docs/e2e-helpers-refactor-plan.md for details

import { Page } from '@playwright/test';

export interface PerformanceOptions {
  timeout?: number;
  threshold?: number;
  measureNetwork?: boolean;
}

/**
 * Test page load time with proper measurement
 */
export const testPageLoadTime = async (
  page: Page,
  url: string,
  options: PerformanceOptions = {}
): Promise<number> => {
  const { timeout = 10000 } = options;
  const start = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout });
  await page.waitForLoadState('networkidle', { timeout });
  const elapsed = Date.now() - start;
  return elapsed;
};

/**
 * Test performance budget compliance
 */
export const testPerformanceBudget = async (
  page: Page,
  budgetMs: number,
  options: PerformanceOptions = {}
): Promise<boolean> => {
  const loadTime = await testPageLoadTime(page, page.url(), options);
  return loadTime <= budgetMs;
};

/**
 * Test for memory leaks (basic repeated navigation)
 */
export const testMemoryLeak = async (
  page: Page,
  iterations: number = 10
): Promise<boolean> => {
  // Type guard for memory property
  const getHeap = () => {
    const perf = window.performance as any;
    return perf.memory?.usedJSHeapSize || 0;
  };
  let before = await page.evaluate(getHeap);
  for (let i = 0; i < iterations; i++) {
    await page.reload();
    await page.waitForLoadState('networkidle');
  }
  let after = await page.evaluate(getHeap);
  // Allow 10% increase as threshold
  return after <= before * 1.1;
};

/**
 * Test concurrent operations
 */
export const testConcurrentOperations = async (
  page: Page,
  operations: Array<() => Promise<void>>
): Promise<void> => {
  await Promise.all(operations.map(op => op()));
};

/**
 * Test API performance
 */
export const testAPIPerformance = async (
  page: Page,
  apiEndpoint: string,
  options: PerformanceOptions = {}
): Promise<number> => {
  const { timeout = 10000 } = options;
  const start = Date.now();
  await page.evaluate(
    (endpoint: string) => fetch(endpoint, { method: 'GET', cache: 'no-store' }),
    apiEndpoint
  );
  const elapsed = Date.now() - start;
  return elapsed;
}; 