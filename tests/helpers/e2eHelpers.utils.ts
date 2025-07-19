// E2E utility helpers - extracted from e2eHelpers.ts
// Focused on tracing, error handling, and server utilities

import { Page } from '@playwright/test';

/**
 * Setup global error listeners for better debugging
 */
export const setupGlobalErrorListeners = async (page: Page): Promise<void> => {
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('🔍 E2E DEBUG: Console error:', msg.text());
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.error('🔍 E2E DEBUG: Page error:', error.message);
  });

  // Listen for request failures
  page.on('requestfailed', request => {
    console.error('🔍 E2E DEBUG: Request failed:', request.url(), request.failure()?.errorText);
  });
};

/**
 * Setup tracing for debugging
 */
export const setupTracing = async (page: Page): Promise<void> => {
  // Start tracing if not already started
  if (!page.context().tracing) {
    await page.context().tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true
    });
  }
};

/**
 * Stop tracing and save trace file
 */
export const stopTracing = async (
  page: Page, 
  testInfo: any
): Promise<void> => {
  try {
    // Only try to stop tracing if it exists
    if (page.context().tracing) {
      const tracePath = testInfo.outputPath('trace.zip');
      await page.context().tracing.stop({ path: tracePath });
    }
  } catch (error) {
    // Ignore tracing errors - they're not critical for test execution
    // This can happen if tracing wasn't started or was already stopped
    console.warn('Tracing stop failed:', error);
  }
};

/**
 * Clear authentication state
 */
export const clearAuthState = async (page: Page): Promise<void> => {
  // Clear cookies
  await page.context().clearCookies();
  
  // Clear localStorage and sessionStorage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Clear any remaining auth state
  await page.evaluate(() => {
    // Remove any auth-related items
    const authKeys = ['accessToken', 'refreshToken', 'user', 'auth'];
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  });
};

/**
 * Enhanced server request with retry logic for multi-worker stability
 * Use this for API calls that might fail due to server load
 */
export const retryServerRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Server request attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
};

/**
 * Wait for server to be ready for multi-worker scenarios
 */
export const waitForServerReady = async (page: Page, timeout: number = 10000): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await page.request.get('/api/health');
      if (response.status() === 200) {
        return; // Server is ready
      }
    } catch (error) {
      // Server not ready yet, continue waiting
    }
    
    // Wait a bit before retrying
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`Server not ready after ${timeout}ms`);
}; 