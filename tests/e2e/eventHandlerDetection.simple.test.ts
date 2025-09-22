/**
 * Simplified Event Handler Detection E2E Tests
 * 
 * Focused tests for event handler conflict detection with minimal setup.
 */

import { test, expect } from '@playwright/test';
import { TestUser, generateTestId } from '../helpers/testUtils';
import { createE2EUser } from '../helpers/authHelpers';
import { cleanupTestUser } from '../helpers/testUtils';
import { setupE2E, closeAllModals, resetRateLimits } from '../helpers/e2eHelpers';
import { 
  waitForDashboard, 
  closeGuidedTourIfPresent, 
  waitForDashboardReady
} from '../helpers/uiHelpers';
import { 
  detectEventConflicts, 
  validateFormPatterns, 
  assertNoCriticalConflicts, 
  assertProperFormPatterns
} from '../helpers/eventHandlerDetection';
import { Role } from '../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Event Handler Detection - Simple Tests', () => {
  let testUser: TestUser;

  test.beforeAll(async () => {
    testUser = await createE2EUser(Role.USER, {
      email: `e2e-event-detection-simple-${generateTestId('user')}@testuser.local`,
      password: 'e2eTestPass123',
      name: 'E2E Event Detection Simple Test User'
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser);
  });

  test('should detect no critical event handler conflicts on connections page', async ({ page }) => {
    // Set reasonable timeouts
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(20000);
    
    await setupE2E(page, testUser, { 
      tab: 'connections', 
      validateUX: false // Skip UX validation to speed up
    });
    await closeGuidedTourIfPresent(page);
    await waitForDashboardReady(page);

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Detect conflicts
    const conflicts = await detectEventConflicts(page);
    
    // Filter for critical conflicts
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
    
    expect(criticalConflicts).toHaveLength(0);
    
    // Log all conflicts for debugging
    if (conflicts.length > 0) {
      console.log('Detected conflicts:', JSON.stringify(conflicts, null, 2));
    }
  });

  test('should detect proper form patterns on connections page', async ({ page }) => {
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(20000);
    
    await setupE2E(page, testUser, { 
      tab: 'connections', 
      validateUX: false
    });
    await closeGuidedTourIfPresent(page);
    await waitForDashboardReady(page);

    await page.waitForLoadState('networkidle');

    // Check for forms with data-testid
    const formsWithTestId = await page.locator('form[data-testid]').count();
    const totalForms = await page.locator('form').count();
    
    expect(formsWithTestId).toBeGreaterThan(0);
    expect(formsWithTestId).toBe(totalForms);
  });

  test('should detect submit buttons with proper data-testid', async ({ page }) => {
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(20000);
    
    await setupE2E(page, testUser, { 
      tab: 'connections', 
      validateUX: false
    });
    await closeGuidedTourIfPresent(page);
    await waitForDashboardReady(page);

    await page.waitForLoadState('networkidle');

    // Check for submit buttons with proper data-testid
    const submitButtonsWithTestId = await page.locator('button[data-testid*="primary-action"]').count();
    const totalSubmitButtons = await page.locator('button[type="submit"]').count();
    
    expect(submitButtonsWithTestId).toBeGreaterThan(0);
    expect(submitButtonsWithTestId).toBe(totalSubmitButtons);
  });

  test('should validate form submission patterns', async ({ page }) => {
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(20000);
    
    await setupE2E(page, testUser, { 
      tab: 'connections', 
      validateUX: false
    });
    await closeGuidedTourIfPresent(page);
    await waitForDashboardReady(page);

    await page.waitForLoadState('networkidle');

    // Validate form patterns
    const isValid = await validateFormPatterns(page);
    expect(isValid).toBe(true);
  });

  test.afterEach(async ({ page }) => {
    await closeAllModals(page);
    await resetRateLimits(page);
  });
});
