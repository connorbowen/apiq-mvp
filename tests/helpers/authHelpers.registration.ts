// Authentication registration helpers - extracted from authHelpers.ts
// Focused on user registration and email verification

import { Page, expect } from '@playwright/test';
import { Role } from '../../src/generated/prisma';
import { TestUser } from './testUtils.auth';
import { createTestUser } from './testUtils.auth';
import { waitForDashboard, closeGuidedTourIfPresent } from './uiHelpers';

/**
 * Options for creating a test user
 */
export interface CreateUserOptions {
  email?: string;
  password?: string;
  role?: Role;
  name?: string;
}

/**
 * Create a test user specifically for E2E tests
 */
export const createE2EUser = async (
  role: Role = Role.USER,
  options: CreateUserOptions = {}
): Promise<TestUser> => {
  const { email, password, name } = options;
  return await createTestUser(email, password, role, name);
};

/**
 * Complete user registration flow with optional verification
 */
export const registerUser = async (
  page: Page,
  email: string,
  password: string = 'testpass123',
  options: {
    waitForDashboard?: boolean;
    closeGuidedTour?: boolean;
    timeout?: number;
  } = {}
): Promise<void> => {
  const {
    waitForDashboard: shouldWaitForDashboard = true,
    closeGuidedTour = true,
    timeout = 20000
  } = options;

  // Navigate to signup
  await page.goto('/signup');
  
  // Fill registration form
  await page.getByLabel('Email address').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);
  
  // Submit form
  await page.getByTestId('primary-action signup-btn').click();
  
  // Wait for redirect to dashboard (with optional tour parameter)
  await page.waitForURL(/.*dashboard.*/, { timeout });
  
  // Optional: Wait for dashboard to be fully loaded
  if (shouldWaitForDashboard) {
    await waitForDashboard(page);
  }
  
  // Optional: Close guided tour if present
  if (closeGuidedTour) {
    await closeGuidedTourIfPresent(page);
  }
};

/**
 * Register user with comprehensive validation
 */
export const registerUserWithValidation = async (
  page: Page,
  email: string,
  password: string = 'testpass123',
  options: {
    validateChatInterface?: boolean;
    validateUserDropdown?: boolean;
    validateURL?: RegExp;
    timeout?: number;
  } = {}
): Promise<void> => {
  const {
    validateChatInterface = false,
    validateUserDropdown = false,
    validateURL,
    timeout = 20000
  } = options;

  // Perform registration
  await registerUser(page, email, password, { timeout });

  // Validate chat interface if requested
  if (validateChatInterface) {
    await expect(page.getByTestId('chat-interface')).toBeVisible();
  }

  // Validate user dropdown if requested
  if (validateUserDropdown) {
    await expect(page.getByTestId('user-dropdown-toggle')).toBeVisible();
  }

  // Validate URL if specified
  if (validateURL) {
    await expect(page).toHaveURL(validateURL);
  }
};

/**
 * Register user and redirect to chat interface
 */
export const registerUserToChat = async (
  page: Page,
  email: string,
  password: string = 'testpass123'
): Promise<void> => {
  await registerUserWithValidation(page, email, password, {
    validateChatInterface: true,
    validateURL: /.*dashboard.*tab=chat/
  });
};

/**
 * Register user and navigate to profile page
 */
export const registerUserAndNavigateToProfile = async (
  page: Page,
  email: string,
  password: string = 'testpass123'
): Promise<void> => {
  // Register user first
  await registerUser(page, email, password);

  // Navigate to profile page
  await page.getByTestId('user-dropdown-toggle').click();
  await page.getByTestId('user-dropdown-profile').click();

  // Wait for profile page to load
  await page.waitForURL(/.*dashboard.*tab=profile/, { timeout: 10000 });
  await page.waitForSelector('[data-testid="profile-tab"]', { timeout: 10000 });

  // Verify profile content is visible
  await expect(page.getByText('Profile Settings')).toBeVisible();
  await expect(page.getByText('Manage your account information and preferences.')).toBeVisible();
};

/**
 * Navigate to email verification page and handle verification
 */
export const handleEmailVerification = async (
  page: Page,
  token: string = 'test-verification-token',
  options: {
    expectSuccess?: boolean;
    timeout?: number;
  } = {}
): Promise<boolean> => {
  const { expectSuccess = false, timeout = 5000 } = options;
  
  // Navigate to verification page
  await page.goto(`/verify?token=${token}`);
  
  // Check for either success or error message
  const successMessage = page.getByText('Email verified successfully! Welcome to APIQ!');
  const errorMessage = page.getByText('Email verification failed');
  
  // Wait for either message to appear
  await Promise.race([
    successMessage.waitFor({ timeout }),
    errorMessage.waitFor({ timeout })
  ]);
  
  // Check which message appeared
  const isSuccess = await successMessage.isVisible();
  
  // If expecting success but got error, throw
  if (expectSuccess && !isSuccess) {
    throw new Error('Email verification failed when success was expected');
  }
  
  // If successful, wait for redirect to dashboard
  if (isSuccess) {
    await page.waitForURL(/.*dashboard/);
  }
  
  return isSuccess;
};

/**
 * Test email verification resend functionality
 */
export const testEmailVerificationResend = async (
  page: Page,
  email: string
): Promise<void> => {
  // Test the resend verification API
  const apiResponse = await page.request.post('/api/auth/resend-verification', {
    data: { email },
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Verify the API response
  expect(apiResponse.status()).toBe(200);
  const apiData = await apiResponse.json();
  expect(apiData.success).toBe(true);
  expect(apiData.data.message).toBe('Verification email sent successfully. Please check your inbox.');
};

/**
 * Test email verification status
 */
export const testEmailVerificationStatus = async (
  page: Page,
  email: string,
  expectedVerified: boolean = false
): Promise<void> => {
  // Navigate to profile page to check verification status
  await page.getByTestId('user-dropdown-toggle').click();
  await page.getByTestId('user-dropdown-profile').click();

  // Wait for profile page to load
  await page.waitForURL(/.*dashboard.*tab=profile/, { timeout: 10000 });

  if (expectedVerified) {
    // Should not show verify button if already verified
    await expect(page.getByTestId('verify-email-btn')).not.toBeVisible();
  } else {
    // Should show verify button if not verified
    await expect(page.getByTestId('verify-email-btn')).toBeVisible();
  }
};

/**
 * Test complete email verification flow
 */
export const testCompleteEmailVerificationFlow = async (
  page: Page,
  email: string,
  password: string = 'testpass123'
): Promise<void> => {
  // Register user first
  await registerUserAndNavigateToProfile(page, email, password);

  // Test resend verification
  await testEmailVerificationResend(page, email);

  // Test verification status (should be unverified)
  await testEmailVerificationStatus(page, email, false);
}; 