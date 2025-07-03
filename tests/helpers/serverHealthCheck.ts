import { test as base } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Check if the development server is running
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for server to be healthy with timeout
 */
export async function waitForServerHealth(timeoutMs: number = 30000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await checkServerHealth()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return false;
}

/**
 * Enhanced test fixture that checks server health before running tests
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Check server health before running any test
    const isHealthy = await waitForServerHealth();
    if (!isHealthy) {
      throw new Error(
        `Development server is not running or not healthy at ${BASE_URL}. ` +
        `Please start the server with 'npm run dev' or use 'npm run test:e2e:with-server'`
      );
    }
    
    await use(page);
  },
});

export { expect } from '@playwright/test'; 