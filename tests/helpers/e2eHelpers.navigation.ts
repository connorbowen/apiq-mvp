// E2E navigation helpers - extracted from e2eHelpers.ts
// Focused on navigation and UI interaction

import { Page, Locator } from '@playwright/test';

/**
 * Navigate to user dropdown item
 */
export const navigateToUserDropdownItem = async (page: Page, item: string): Promise<void> => {
  // Open user dropdown
  await page.getByTestId('user-dropdown-toggle').click();
  
  // Wait for dropdown to be visible
  await page.waitForSelector('[data-testid="user-dropdown-menu"]', { timeout: 5000 });
  
  // Click on the specific item
  await page.getByTestId(`user-dropdown-${item}`).click();
  
  // Wait for dropdown to close
  await page.waitForSelector('[data-testid="user-dropdown-menu"]', { state: 'hidden', timeout: 5000 });
};

/**
 * Navigate to settings page
 */
export const navigateToSettings = async (page: Page): Promise<void> => {
  // Open user dropdown
  await page.getByTestId('user-dropdown-toggle').click();
  
  // Wait for dropdown to be visible by checking for settings button
  await page.waitForSelector('[data-testid="user-dropdown-settings"]', { timeout: 5000 });
  
  // Click on settings
  await page.getByTestId('user-dropdown-settings').click();
  
  // Wait for dropdown to close by checking that settings button is no longer visible
  await page.waitForSelector('[data-testid="user-dropdown-settings"]', { state: 'hidden', timeout: 5000 });
  
  // Wait for settings page to load
  await page.waitForURL(/.*dashboard.*tab=settings/, { timeout: 10000 });
  
  // Wait for settings content to be visible
  await page.waitForSelector('[data-testid="settings-tab"]', { timeout: 10000 });
};

/**
 * Navigate to profile page
 */
export const navigateToProfile = async (page: Page): Promise<void> => {
  // Open user dropdown
  await page.getByTestId('user-dropdown-toggle').click();
  
  // Wait for dropdown to be visible by checking for profile button
  await page.waitForSelector('[data-testid="user-dropdown-profile"]', { timeout: 5000 });
  
  // Click on profile
  await page.getByTestId('user-dropdown-profile').click();
  
  // Wait for dropdown to close by checking that profile button is no longer visible
  await page.waitForSelector('[data-testid="user-dropdown-profile"]', { state: 'hidden', timeout: 5000 });
  
  // Wait for profile page to load
  await page.waitForURL(/.*dashboard.*tab=profile/, { timeout: 10000 });
  
  // Wait for profile content to be visible
  await page.waitForSelector('[data-testid="profile-tab"]', { timeout: 10000 });
};

/**
 * Get primary action button by action name
 */
export const getPrimaryActionButton = (
  page: Page,
  action: string
): Locator => {
  return page.getByTestId(`primary-action ${action}`);
};

/**
 * Navigate with keyboard (for accessibility testing)
 */
export const navigateWithKeyboard = async (page: Page, selectors: string[]): Promise<void> => {
  for (const selector of selectors) {
    await page.keyboard.press('Tab');
    await page.waitForSelector(selector, { state: 'visible', timeout: 1000 });
  }
}; 