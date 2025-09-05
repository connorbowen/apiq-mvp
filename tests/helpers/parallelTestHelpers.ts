// Helpers for better parallel test execution
// These functions help prevent resource conflicts between parallel tests

import { Page } from '@playwright/test';
import { PrismaClient } from '../../src/generated/prisma';

const prisma = new PrismaClient();

/**
 * Generate a unique test identifier for parallel test isolation
 */
export const generateTestId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
};

/**
 * Create a unique test user for parallel execution
 */
export const createParallelTestUser = async (testId: string, role: string = 'USER') => {
  const email = `e2e-parallel-${testId}@example.com`;
  const password = 'e2eTestPass123';
  const name = `E2E Parallel Test User ${testId}`;
  
  try {
    const user = await prisma.user.create({
      data: {
        email,
        password: await hashPassword(password),
        name,
        role: role as any,
        isActive: true,
        onboardingStage: 'COMPLETED'
      }
    });
    
    return { ...user, password };
  } catch (error) {
    console.error('Failed to create parallel test user:', error);
    throw error;
  }
};

/**
 * Clean up test user and all associated data for parallel execution
 */
export const cleanupParallelTestUser = async (testId: string) => {
  try {
    const email = `e2e-parallel-${testId}@example.com`;
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (user) {
      // Delete associated connections
      await prisma.apiConnection.deleteMany({
        where: { userId: user.id }
      });
      
      // Delete associated secrets
      await prisma.secret.deleteMany({
        where: { userId: user.id }
      });
      
      // Delete the user
      await prisma.user.delete({
        where: { id: user.id }
      });
    }
  } catch (error) {
    console.warn(`Failed to cleanup parallel test user ${testId}:`, error);
  }
};

/**
 * Wait for a specific condition with exponential backoff
 * Useful for parallel tests that might have timing conflicts
 */
export const waitForCondition = async (
  condition: () => Promise<boolean>,
  timeout: number = 10000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
    interval = Math.min(interval * 1.2, 1000); // Exponential backoff, max 1s
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

/**
 * Ensure unique test data names for parallel execution
 */
export const createUniqueTestName = (baseName: string, testId: string): string => {
  return `${baseName} ${testId}`;
};

/**
 * Close all modals and reset UI state for parallel test isolation
 */
export const resetUIForParallelTest = async (page: Page): Promise<void> => {
  try {
    // Close any open modals
    const modals = page.locator('[role="dialog"]');
    const count = await modals.count();
    
    for (let i = 0; i < count; i++) {
      try {
        await modals.nth(i).locator('[data-testid*="close"], [aria-label*="close"], button:has-text("Cancel")').first().click({ timeout: 1000 });
      } catch (error) {
        // Modal might already be closed
      }
    }
    
    // Clear any form inputs
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach((input: any) => {
        if (input.type !== 'checkbox' && input.type !== 'radio') {
          input.value = '';
        }
      });
    });
    
    // Wait for any animations to complete
    await page.waitForTimeout(500);
    
  } catch (error) {
    console.warn('Failed to reset UI for parallel test:', error);
  }
};

/**
 * Simple password hashing for test users
 */
async function hashPassword(password: string): Promise<string> {
  // In a real app, you'd use bcrypt or similar
  // For tests, we'll use a simple hash
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

export default {
  generateTestId,
  createParallelTestUser,
  cleanupParallelTestUser,
  waitForCondition,
  createUniqueTestName,
  resetUIForParallelTest
};
