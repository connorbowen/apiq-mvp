import { Page } from '@playwright/test';

export interface TestUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'admin' | 'super_admin';
  onboardingStage?: 'new' | 'profile_completed' | 'tour_completed' | 'completed';
  guidedTourCompleted?: boolean;
  isActive?: boolean;
  createdAt?: Date;
}

export interface CreateTestUserOptions {
  role?: 'user' | 'admin' | 'super_admin';
  onboardingStage?: 'new' | 'profile_completed' | 'tour_completed' | 'completed';
  guidedTourCompleted?: boolean;
  isActive?: boolean;
  email?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Create a test user with specified options
 */
export async function createTestUser(options: CreateTestUserOptions = {}): Promise<TestUser> {
  const timestamp = Date.now();
  const defaultEmail = `test-user-${timestamp}@example.com`;
  
  const testUser: TestUser = {
    id: `test-user-${timestamp}`,
    email: options.email || defaultEmail,
    firstName: options.firstName || 'Test',
    lastName: options.lastName || 'User',
    role: options.role || 'user',
    onboardingStage: options.onboardingStage || 'new',
    guidedTourCompleted: options.guidedTourCompleted || false,
    isActive: options.isActive !== false, // Default to true
    createdAt: new Date(),
  };

  // In a real implementation, this would create the user in the database
  // For now, we'll return the test user object
  console.log(`Created test user: ${testUser.email} with role: ${testUser.role}`);
  
  return testUser;
}

/**
 * Login as a specific user
 */
export async function loginAsUser(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  
  // Fill login form
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password').fill('test-password-123');
  
  // Submit login form
  await page.getByRole('button', { name: 'Sign in' }).click();
  
  // Wait for successful login
  await page.waitForURL(/.*dashboard/);
  
  console.log(`Logged in as user: ${user.email}`);
}

/**
 * Login as an admin user
 */
export async function loginAsAdmin(page: Page, user: TestUser): Promise<void> {
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new Error('User must have admin role for admin login');
  }
  
  await loginAsUser(page, user);
  
  // Verify admin access is available
  await page.waitForSelector('[data-testid="user-dropdown-toggle"]');
  await page.getByTestId('user-dropdown-toggle').click();
  
  // Verify admin functions are visible
  await expect(page.getByText('Admin Panel')).toBeVisible();
  await expect(page.getByText('Audit Logs')).toBeVisible();
  
  console.log(`Logged in as admin user: ${user.email}`);
}

/**
 * Clean up test data
 */
export async function cleanupTestData(): Promise<void> {
  // In a real implementation, this would clean up test data from the database
  // For now, we'll just log the cleanup
  console.log('Cleaning up test data...');
}

/**
 * Create test users for different scenarios
 */
export const TestUsers = {
  newUser: () => createTestUser({
    role: 'user',
    onboardingStage: 'new',
    guidedTourCompleted: false,
  }),
  
  existingUser: () => createTestUser({
    role: 'user',
    onboardingStage: 'completed',
    guidedTourCompleted: true,
  }),
  
  adminUser: () => createTestUser({
    role: 'admin',
    onboardingStage: 'completed',
    guidedTourCompleted: true,
  }),
  
  superAdminUser: () => createTestUser({
    role: 'super_admin',
    onboardingStage: 'completed',
    guidedTourCompleted: true,
  }),
  
  userInProgress: () => createTestUser({
    role: 'user',
    onboardingStage: 'profile_completed',
    guidedTourCompleted: false,
  }),
};

/**
 * Helper for common test setup
 */
export async function setupTestUser(options: CreateTestUserOptions = {}): Promise<TestUser> {
  const user = await createTestUser(options);
  console.log(`Test setup complete for user: ${user.email}`);
  return user;
}

/**
 * Helper for test cleanup
 */
export async function teardownTestUser(user: TestUser): Promise<void> {
  console.log(`Cleaning up test user: ${user.email}`);
  // In a real implementation, this would delete the user from the database
} 