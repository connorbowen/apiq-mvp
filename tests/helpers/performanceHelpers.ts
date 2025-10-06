// Performance testing helpers for APIQ E2E tests
// See docs/e2e-helpers-refactor-plan.md for details

import { Page, expect } from '@playwright/test';

export interface PerformanceOptions {
  timeout?: number;
  threshold?: number;
  measureNetwork?: boolean;
  headers?: Record<string, string>;
}

/**
 * Test page load time with proper measurement
 */
export const testPageLoadTime = async (
  page: Page,
  url: string,
  options: PerformanceOptions = {}
): Promise<number> => {
  const { timeout = 5000, threshold = 5000 } = options;
  
  const startTime = Date.now();
  await page.goto(url);
  const loadTime = Date.now() - startTime;
  
  // Should load within threshold
  expect(loadTime).toBeLessThan(threshold);
  
  return loadTime;
};

/**
 * Test performance budget compliance
 */
export const testPerformanceBudget = async (
  page: Page,
  budgetMs: number,
  options: PerformanceOptions = {}
): Promise<boolean> => {
  const { timeout = 15000 } = options;
  
  const startTime = Date.now();
  await page.goto('/dashboard');
  const loadTime = Date.now() - startTime;
  
  const withinBudget = loadTime < budgetMs;
  expect(loadTime).toBeLessThan(budgetMs);
  
  return withinBudget;
};

/**
 * Test authentication performance
 */
export const testAuthenticationPerformance = async (
  page: Page,
  user: any,
  options: PerformanceOptions = {}
): Promise<number> => {
  const { timeout = 15000 } = options;
  
  const startTime = Date.now();
  
  // Login user (this would use your setupE2E helper)
  await page.goto('/login');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByTestId('primary-action signin-btn').click();
  await page.waitForURL(/.*dashboard/, { timeout });
  
  const loginTime = Date.now() - startTime;
  
  // Should complete login within timeout
  expect(loginTime).toBeLessThan(timeout);
  
  return loginTime;
};

/**
 * Test registration performance
 */
export const testRegistrationPerformance = async (
  page: Page,
  email: string,
  password: string = 'testpass123',
  options: PerformanceOptions = {}
): Promise<number> => {
  const { timeout = 20000 } = options;
  
  const startTime = Date.now();
  
  // Register user
  await page.goto('/signup');
  await page.getByLabel('Email address').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);
  await page.getByTestId('primary-action signup-btn').click();
  
  // Wait for redirect to dashboard
  await page.waitForURL(/.*dashboard/, { timeout });
  
  const registrationTime = Date.now() - startTime;
  
  // Should complete registration within timeout
  expect(registrationTime).toBeLessThan(timeout);
  
  return registrationTime;
};

/**
 * Test for memory leaks by performing repeated operations
 */
export const testMemoryLeak = async (
  page: Page,
  operations: (() => Promise<void>)[],
  iterations: number = 10
): Promise<boolean> => {
  const initialMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
  
  for (let i = 0; i < iterations; i++) {
    for (const operation of operations) {
      await operation();
    }
  }
  
  const finalMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
  const memoryIncrease = finalMemory - initialMemory;
  
  // Allow for some memory increase but not excessive
  const maxAllowedIncrease = 50 * 1024 * 1024; // 50MB
  const hasLeak = memoryIncrease > maxAllowedIncrease;
  
  expect(memoryIncrease).toBeLessThan(maxAllowedIncrease);
  
  return !hasLeak;
};

/**
 * Test concurrent operations
 */
export const testConcurrentOperations = async (
  page: Page,
  operations: (() => Promise<void>)[]
): Promise<void> => {
  await Promise.all(operations.map(operation => operation()));
};

/**
 * Test API performance
 */
export const testAPIPerformance = async (
  page: Page,
  apiEndpoint: string,
  options: PerformanceOptions = {}
): Promise<number> => {
  const { timeout = 5000, threshold = 5000, headers = {} } = options;
  
  const startTime = Date.now();
  
  const response = await page.request.get(apiEndpoint, { headers });
  const responseTime = Date.now() - startTime;
  
  expect(response.status()).toBe(200);
  expect(responseTime).toBeLessThan(threshold);
  
  return responseTime;
}; 