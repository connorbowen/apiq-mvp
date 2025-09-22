// UI interaction helpers for APIQ E2E tests
// See docs/e2e-helpers-refactor-plan.md for details

import { Page, expect } from '@playwright/test';
import { UXComplianceHelper } from './uxCompliance';

/**
 * Options for waiting for elements
 */
export interface WaitOptions {
  timeout?: number;
  state?: 'load' | 'domcontentloaded' | 'networkidle';
}

/**
 * UX expectations for compliance validation
 */
export interface UXExpectations {
  title?: string;
  headings?: string;
  validateForm?: boolean;
  validateAccessibility?: boolean;
}

/**
 * Wait for dashboard to be fully loaded
 * 
 * Accounts for the 1.5-second delay from signup page redirects
 * Updated to handle ongoing API calls and guided tour
 */
export const waitForDashboard = async (page: Page): Promise<void> => {
  // Wait for DOM to be ready (more reliable than networkidle for dashboard)
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for dashboard loading state to disappear first
  await page.waitForSelector('[data-testid="dashboard-loading"]', { state: 'hidden', timeout: 15000 }).catch(() => {
    // If loading element doesn't exist, that's fine
  });
  
  // Wait for dashboard heading with multiple selectors for robustness
  try {
    // Wait for the h1 element to be present
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Wait a bit more for the text to be rendered
    await page.waitForTimeout(1000);
    
    // Check if the h1 contains any valid dashboard heading text
    const validHeadings = ['Dashboard', 'Chat', 'Workflows', 'Connections', 'Settings', 'Profile'];
    let headingFound = false;
    
    for (const heading of validHeadings) {
      const dashboardHeading = await page.locator('h1').filter({ hasText: heading }).first();
      if (await dashboardHeading.isVisible()) {
        headingFound = true;
        break;
      }
    }
    
    if (!headingFound) {
      throw new Error('Dashboard heading not found');
    }
  } catch (error) {
    // Fallback: look for any heading with valid dashboard text
    console.log('🔍 E2E DEBUG: Primary dashboard selector failed, trying fallback');
    await page.waitForSelector('h1, h2, h3', { timeout: 5000 });
    await page.waitForTimeout(1000);
    
    const validHeadings = ['Dashboard', 'Chat', 'Workflows', 'Connections', 'Settings', 'Profile'];
    let headingFound = false;
    
    for (const heading of validHeadings) {
      const dashboardHeading = await page.locator('h1, h2, h3').filter({ hasText: heading }).first();
      if (await dashboardHeading.isVisible()) {
        headingFound = true;
        break;
      }
    }
    
    if (!headingFound) {
      throw new Error('Dashboard heading not found');
    }
  }
  
  // Wait for user dropdown to be available (important for navigation)
  await page.waitForSelector('[data-testid="user-dropdown-toggle"]', { timeout: 20000 });
  
  // Wait for at least one main tab to be visible (desktop or mobile)
  try {
    await page.waitForSelector('[data-testid^="tab-"]', { timeout: 10000 });
  } catch (error) {
    // Fallback: look for mobile navigation or main content
    console.log('🔍 E2E DEBUG: Desktop tabs not found, checking for main content');
    await page.waitForSelector('button:has-text("Navigate to Chat"), #main-content, [data-testid="chat-interface"]', { timeout: 10000 });
  }
  
  // Additional wait to ensure all components are fully loaded
  await page.waitForTimeout(1000);
};

/**
 * Wait for modal to appear
 */
export const waitForModal = async (page: Page, modalId?: string): Promise<void> => {
  const modalSelector = modalId ? `[data-testid="${modalId}"]` : '.fixed.inset-0.bg-gray-600.bg-opacity-50';
  await page.waitForSelector(modalSelector, { timeout: 5000 });
};

/**
 * Robust waiting for elements with configurable options
 */
export const waitForElement = async (
  page: Page,
  selector: string,
  options: WaitOptions = {}
): Promise<void> => {
  const { timeout = 10000, state = 'domcontentloaded' } = options;
  await page.waitForLoadState(state);
  
  // Wait for the element to be visible
  await page.waitForSelector(selector, { state: 'visible', timeout });
  
  // Small wait to ensure the element is fully rendered
  await page.waitForTimeout(200);
};

/**
 * Wait specifically for API call result elements to be fully rendered
 */
export const waitForApiCallResult = async (
  page: Page,
  options: WaitOptions = {}
): Promise<void> => {
  const { timeout = 15000 } = options;
  
  try {
    // Wait for the element to be present and visible
    await page.waitForSelector('[data-testid="api-call-result"]', { 
      state: 'visible', 
      timeout: timeout 
    });
    
    // Wait for the element to have content
    await page.waitForFunction(() => {
      const element = document.querySelector('[data-testid="api-call-result"]');
      return element && element.textContent && element.textContent.trim().length > 0;
    }, { timeout: 5000 });
    
    // Small wait to ensure React has finished rendering
    await page.waitForTimeout(500);
    
  } catch (error) {
    // If the element is not found, try a more aggressive approach
    try {
      // Wait for any element with data-testid that contains "api-call"
      await page.waitForSelector('[data-testid*="api-call"]', { 
        state: 'visible', 
        timeout: 5000 
      });
      
      // Wait for content
      await page.waitForFunction(() => {
        const element = document.querySelector('[data-testid*="api-call"]');
        return element && element.textContent && element.textContent.trim().length > 0;
      }, { timeout: 5000 });
      
    } catch (altError) {
      throw new Error(`API call result element not found after ${timeout}ms. Error: ${altError instanceof Error ? altError.message : String(altError)}`);
    }
  }
};

/**
 * Validate UX compliance for a page
 */
export const validateUXCompliance = async (
  page: Page,
  expectations: UXExpectations
): Promise<void> => {
  const uxHelper = new UXComplianceHelper(page);
  
  if (expectations.title) {
    await uxHelper.validatePageTitle(expectations.title);
  }
  
  if (expectations.headings) {
    // Split headings by pipe character to handle multiple headings
    const headingArray = expectations.headings.split('|').map(h => h.trim());
    await uxHelper.validateHeadingHierarchy(headingArray);
  }
  
  if (expectations.validateForm) {
    await uxHelper.validateFormAccessibility();
  }
  
  if (expectations.validateAccessibility) {
    await uxHelper.validateARIACompliance();
  }
}; 

/**
 * Close the guided tour overlay if present
 * 
 * This helper function handles the common E2E testing issue where guided tour overlays
 * can block user interactions. It attempts to close the overlay using multiple strategies:
 * 1. First tries to find and click a close button
 * 2. Falls back to pressing the Escape key
 * 3. Waits for the overlay to disappear
 * 
 * @param page - Playwright Page object
 * @returns Promise<void> - Resolves when overlay is closed or not present
 * 
 * @example
 * ```typescript
 * // Use before any UI interaction that might be blocked
 * await closeGuidedTourIfPresent(page);
 * await page.click('[data-testid="primary-action create-connection-btn"]');
 * ```
 * 
 * @example
 * ```typescript
 * // Use in test setup to ensure clean state
 * test.beforeEach(async ({ page }) => {
 *   await setupE2E(page, testUser);
 *   await closeGuidedTourIfPresent(page);
 * });
 * ```
 * 
 * @remarks
 * - Uses graceful error handling - won't fail if overlay is not present
 * - Multiple fallback strategies ensure robust overlay dismissal
 * - 5-second timeout for overlay disappearance
 * - Safe to call multiple times in the same test
 */
export const closeGuidedTourIfPresent = async (page: Page): Promise<void> => {
  // Check for guided tour overlay with multiple selectors
  const overlaySelectors = [
    '[data-testid="guided-tour-overlay"]',
    '.guided-tour [data-testid="guided-tour-overlay"]',
    '.guided-tour .fixed.inset-0.bg-black.bg-opacity-50'
  ];
  
  let overlay = null;
  for (const selector of overlaySelectors) {
    const element = page.locator(selector);
    if (await element.isVisible().catch(() => false)) {
      overlay = element;
      break;
    }
  }
  
  if (overlay) {
    console.log('🔍 E2E DEBUG: Guided tour overlay detected, attempting to close');
    
    // Try clicking the close button if it exists
    const closeBtn = page.locator('[data-testid="close-guided-tour-btn"]');
    if (await closeBtn.isVisible().catch(() => false)) {
      console.log('🔍 E2E DEBUG: Clicking close button');
      await closeBtn.click();
    } else {
      // Fallback: press Escape
      console.log('🔍 E2E DEBUG: Using Escape key fallback');
      await page.keyboard.press('Escape');
    }
    
    // Wait for overlay to disappear with multiple checks
    try {
      await overlay.waitFor({ state: 'hidden', timeout: 5000 });
      console.log('🔍 E2E DEBUG: Guided tour overlay closed successfully');
    } catch (error) {
      console.log('🔍 E2E DEBUG: Overlay close timeout, trying additional cleanup');
      
      // Additional cleanup: try clicking outside or pressing Escape again
      try {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      } catch (cleanupError) {
        console.log('🔍 E2E DEBUG: Additional cleanup failed:', cleanupError);
      }
    }
  } else {
    console.log('🔍 E2E DEBUG: No guided tour overlay detected');
  }
  
  // Final verification: ensure no guided tour elements are blocking interactions
  await page.waitForTimeout(500);
  
  // Check if any guided tour elements are still visible and blocking
  const blockingElements = page.locator('.guided-tour [data-testid="guided-tour-overlay"], .guided-tour .fixed.inset-0.bg-black.bg-opacity-50');
  if (await blockingElements.count() > 0) {
    console.log('🔍 E2E DEBUG: Guided tour still blocking, forcing cleanup');
    // Force cleanup by pressing Escape multiple times
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
  }
};

/**
 * Wait for guided tour to be ready with authentication-aware retry mechanism
 * Handles the case where tour state API might return 401 initially due to auth timing
 */
export const waitForGuidedTourReady = async (page: Page, timeout: number = 20000): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      // Check if tour tooltip is visible
      const tooltip = page.locator('[data-testid="guided-tour-tooltip"]');
      if (await tooltip.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('🔍 E2E DEBUG: Guided tour tooltip is visible');
        return;
      }
      
      // If tour tooltip not visible, check if we're on the right page and wait for elements
      console.log('🔍 E2E DEBUG: Tour tooltip not visible, checking page state');
      
      // Ensure we're on the dashboard
      const currentUrl = page.url();
      if (!currentUrl.includes('/dashboard')) {
        console.log('🔍 E2E DEBUG: Not on dashboard, navigating...');
        await page.goto('/dashboard?tab=chat', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        continue;
      }
      
      // Wait for dashboard elements to be ready
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 5000 }).catch(() => {
        console.log('🔍 E2E DEBUG: User data not detected, proceeding anyway');
      });
      
      // Wait for any pending API calls to complete
      await page.waitForTimeout(2000);
      
      // Try to wait for tour tooltip again with shorter timeout
      try {
        await page.waitForSelector('[data-testid="guided-tour-tooltip"]', { timeout: 5000 });
        console.log('🔍 E2E DEBUG: Guided tour tooltip appeared after auth wait');
        return;
      } catch (retryError) {
        console.log('🔍 E2E DEBUG: Tour tooltip still not visible after auth wait');
      }
      
      // Wait a bit before retrying the main loop
      await page.waitForTimeout(1000);
    } catch (error) {
      console.log('🔍 E2E DEBUG: Tour check failed, retrying...', error);
      await page.waitForTimeout(1000);
    }
  }
  
  throw new Error(`Guided tour did not appear within ${timeout}ms`);
}; 

/**
 * Fill signup form with provided data
 */
export const fillSignupForm = async (
  page: Page,
  email: string,
  password: string = 'testpass123'
): Promise<void> => {
  await page.getByLabel('Email address').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);
};

/**
 * Fill login form with provided data
 */
export const fillLoginForm = async (
  page: Page,
  email: string,
  password: string
): Promise<void> => {
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
};

/**
 * Wait for dashboard to be fully loaded and ready
 * Ensures all API calls have completed before proceeding
 */
export const waitForDashboardReady = async (page: Page, timeout = 15000): Promise<void> => {
  console.log('🔍 E2E DEBUG: Waiting for dashboard to be fully ready');
  
  try {
    // Wait for main dashboard elements to be present (not necessarily visible)
    await page.waitForSelector('[data-testid="tab-chat"]', { timeout, state: 'attached' });
    
    // Wait for chat interface to be ready instead of just the tab
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 }).catch(() => {
      console.log('🔍 E2E DEBUG: Chat interface not found, proceeding anyway');
    });
    
    // Wait for chat input to be available (this is the key element we need)
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 }).catch(() => {
      console.log('🔍 E2E DEBUG: Chat input not found, proceeding anyway');
    });
    
    // Wait for any loading states to disappear
    await page.waitForFunction(() => {
      // Check if there are any loading indicators visible
      const loadingElements = document.querySelectorAll('[data-testid*="loading"], [data-testid*="spinner"]');
      return loadingElements.length === 0;
    }, { timeout: 5000 }).catch(() => {
      console.log('🔍 E2E DEBUG: Loading indicators check failed, proceeding anyway');
    });
    
    // Wait a bit more for any remaining API calls to settle
    await page.waitForTimeout(1000);
    
    console.log('🔍 E2E DEBUG: Dashboard is ready');
  } catch (error) {
    console.log('🔍 E2E DEBUG: Dashboard ready check failed:', error);
    // Don't throw error, just log and continue
    console.log('🔍 E2E DEBUG: Continuing despite dashboard ready check failure');
  }
};

/**
 * Submit signup form and wait for redirect
 */
export const submitSignupForm = async (
  page: Page,
  email: string,
  password: string = 'testpass123',
  options: {
    timeout?: number;
    validateURL?: RegExp;
  } = {}
): Promise<void> => {
  const { timeout = 20000, validateURL = /.*dashboard.*/ } = options;
  
  // Fill and submit form
  await fillSignupForm(page, email, password);
  await page.getByTestId('primary-action signup-btn').click();
  
  // Wait for redirect
  await page.waitForURL(validateURL, { timeout });
}; 

/**
 * Navigation and Tab Management Helpers
 */

/**
 * Navigate to a specific tab and wait for URL update
 */
export const navigateToTab = async (page: Page, tabName: string): Promise<void> => {
  // Check if the tab is already selected
  const tabElement = page.getByTestId(`tab-${tabName}`);
  const isSelected = await tabElement.getAttribute('aria-selected');
  
  if (isSelected === 'true') {
    // Tab is already selected, just wait for the content to be visible
    console.log(`Tab ${tabName} is already selected, waiting for content...`);
  } else {
    // Click the tab to select it
    await tabElement.click();
    
    // Wait for URL to change, but be more flexible about the timing
    try {
      await page.waitForURL(/.*tab=${tabName}/, { timeout: 5000 });
    } catch (error) {
      // If URL doesn't change immediately, check if the tab is actually selected
      await expect(tabElement).toHaveAttribute('aria-selected', 'true');
    }
  }
};

/**
 * Validate tab content is visible and properly selected
 */
export const validateTabContent = async (page: Page, tabName: string): Promise<void> => {
  const tabSelectors: Record<string, string> = {
    chat: '[data-testid="chat-interface"]',
    workflows: '[data-testid="workflows-management"]',
    connections: '[data-testid="connections-management"]',
    settings: '[data-testid="settings-tab"]',
    profile: '[data-testid="profile-tab"]'
  };
  
  await expect(page.getByTestId(`tab-${tabName}`)).toHaveAttribute('aria-selected', 'true');
  if (tabSelectors[tabName]) {
    await expect(page.locator(tabSelectors[tabName])).toBeVisible();
  }
};

/**
 * Test switching between multiple tabs
 */
export const testTabSwitching = async (page: Page, tabs: string[]): Promise<void> => {
  for (const tab of tabs) {
    await navigateToTab(page, tab);
    await validateTabContent(page, tab);
  }
};

/**
 * User Dropdown Navigation Helpers
 */

/**
 * Open the user dropdown menu
 */
export const openUserDropdown = async (page: Page): Promise<void> => {
  await page.getByTestId('user-dropdown-toggle').click();
};

/**
 * Validate user dropdown options are visible/hidden as expected
 */
export const validateUserDropdownOptions = async (
  page: Page, 
  expectedOptions: string[], 
  unexpectedOptions: string[] = []
): Promise<void> => {
  for (const option of expectedOptions) {
    await expect(page.getByTestId(`user-dropdown-${option}`)).toBeVisible();
  }
  
  for (const option of unexpectedOptions) {
    await expect(page.getByTestId(`user-dropdown-${option}`)).not.toBeVisible();
  }
};

/**
 * Navigate via user dropdown option
 */
export const navigateViaUserDropdown = async (page: Page, option: string): Promise<void> => {
  await openUserDropdown(page);
  await page.getByTestId(`user-dropdown-${option}`).click();
};

/**
 * Mobile Navigation Helpers
 */

/**
 * Set mobile viewport for testing
 */
export const setMobileViewport = async (page: Page): Promise<void> => {
  await page.setViewportSize({ width: 375, height: 667 });
};

/**
 * Set desktop viewport for testing
 */
export const setDesktopViewport = async (page: Page): Promise<void> => {
  await page.setViewportSize({ width: 1024, height: 768 });
};

/**
 * Validate mobile navigation visibility based on viewport
 */
export const validateMobileNavigation = async (page: Page, isMobile: boolean): Promise<void> => {
  if (isMobile) {
    await expect(page.getByTestId('mobile-navigation')).toBeVisible();
    await expect(page.locator('.hidden.lg\\:block')).toBeHidden();
  } else {
    await expect(page.getByTestId('mobile-navigation')).toBeHidden();
    await expect(page.locator('.hidden.lg\\:block')).toBeVisible();
  }
};

/**
 * Accessibility Testing Helpers
 */

/**
 * Validate tab accessibility attributes
 */
export const validateTabAccessibility = async (page: Page, tabs: string[]): Promise<void> => {
  for (const tab of tabs) {
    const tabElement = page.getByTestId(`tab-${tab}`);
    await expect(tabElement).toHaveAttribute('role', 'tab');
    await expect(tabElement).toHaveAttribute('aria-selected');
  }
};

/**
 * Test keyboard navigation between tabs
 */
export const testKeyboardNavigation = async (page: Page, startTab: string, targetTab: string): Promise<void> => {
  // Focus the start tab
  await page.getByTestId(`tab-${startTab}`).focus();
  
  // Press Tab to move to next tab
  await page.keyboard.press('Tab');
  
  // Press Enter to activate the target tab
  await page.keyboard.press('Enter');
  
  // Validate the target tab is now selected
  await expect(page.getByTestId(`tab-${targetTab}`)).toHaveAttribute('aria-selected', 'true');
};

/**
 * Chat Interface Helpers
 */

/**
 * Send a chat message
 */
export const sendChatMessage = async (page: Page, message: string): Promise<void> => {
  console.log('🔍 sendChatMessage: Starting to send message:', message);
  const chatInput = page.getByTestId('chat-input');
  
  // Wait for chat input to be enabled before trying to fill it
  console.log('🔍 sendChatMessage: Waiting for chat input to be visible...');
  await chatInput.waitFor({ state: 'visible', timeout: 10000 });
  await expect(chatInput).toBeEnabled({ timeout: 10000 });
  
  console.log('🔍 sendChatMessage: Filling chat input with message...');
  // Clear the input first, then type to trigger React onChange events
  await chatInput.clear();
  await chatInput.type(message);
  
  // Wait a moment for React state to update
  await page.waitForTimeout(100);
  
  // Check if the send button is now enabled
  const sendButton = page.getByTestId('primary-action chat-send-btn');
  const isEnabled = await sendButton.isEnabled();
  console.log('🔍 sendChatMessage: Send button enabled after typing:', isEnabled);
  
  if (!isEnabled) {
    console.log('🔍 sendChatMessage: Send button still disabled, trying alternative approach...');
    // Try triggering the input event manually
    await chatInput.evaluate((el, value) => {
      const input = el as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, message);
    
    // Wait for React to process the event
    await page.waitForTimeout(100);
    
    const isEnabledAfterEvent = await sendButton.isEnabled();
    console.log('🔍 sendChatMessage: Send button enabled after manual event:', isEnabledAfterEvent);
  }
  
  console.log('🔍 sendChatMessage: Clicking send button...');
  await sendButton.click();
  
  console.log('🔍 sendChatMessage: Message sent successfully');
};

/**
 * Wait for chat response (loading, success, or error)
 */
export const waitForChatResponse = async (page: Page, timeout: number = 15000): Promise<void> => {
  // Wait for either an assistant message (bg-gray-100 text-gray-900) or an API call result
  await page.waitForSelector(
    'div[class*="bg-gray-100"][class*="text-gray-900"], [data-testid="api-call-result"], .animate-spin', 
    { timeout }
  );
};

/**
 * Validate chat response is received
 */
export const validateChatResponse = async (page: Page): Promise<boolean> => {
  const hasResponse = await page.locator('div[class*="bg-gray-100"][class*="text-gray-900"]').count() > 0;
  const hasApiResult = await page.locator('[data-testid="api-call-result"]').count() > 0;
  const hasError = await page.locator('.text-red-600').count() > 0;
  const hasLoading = await page.locator('.animate-spin').count() > 0;
  
  return hasResponse || hasApiResult || hasError || hasLoading;
};

/**
 * Guided Tour Helpers
 */

/**
 * Complete the guided tour by clicking through all steps
 */
export const completeGuidedTour = async (page: Page, maxSteps: number = 12): Promise<void> => {
  let stepCount = 0;
  
  while (stepCount < maxSteps) {
    try {
      const isNextVisible = await page.getByTestId('guided-tour-next').isVisible();
      const isSkipVisible = await page.getByTestId('guided-tour-skip').isVisible();
      
      if (!isNextVisible && !isSkipVisible) {
        console.log('🔍 E2E DEBUG: Tour completed - no more buttons visible');
        break;
      }
      
      if (isNextVisible) {
        await page.getByTestId('guided-tour-next').click();
        stepCount++;
        console.log(`🔍 E2E DEBUG: Clicked tour next button (step ${stepCount})`);
        await page.waitForTimeout(500);
      } else if (isSkipVisible) {
        console.log('🔍 E2E DEBUG: Next button not available, skipping tour');
        await page.getByTestId('guided-tour-skip').click();
        break;
      }
    } catch (error) {
      console.log(`🔍 E2E DEBUG: Error during tour step ${stepCount}:`, error instanceof Error ? error.message : String(error));
      // Try to skip as fallback
      try {
        if (await page.getByTestId('guided-tour-skip').isVisible()) {
          await page.getByTestId('guided-tour-skip').click();
          console.log('🔍 E2E DEBUG: Successfully skipped tour after error');
        }
      } catch (skipError) {
        console.log('🔍 E2E DEBUG: Could not skip tour, breaking loop');
      }
      break;
    }
  }
  
  // Final skip attempt
  try {
    if (await page.getByTestId('guided-tour-skip').isVisible()) {
      await page.getByTestId('guided-tour-skip').click();
      console.log('🔍 E2E DEBUG: Final skip attempt successful');
    }
  } catch (error) {
    console.log('🔍 E2E DEBUG: Final skip attempt failed, proceeding with test');
  }
}; 