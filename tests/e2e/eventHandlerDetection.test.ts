/**
 * Event Handler Detection E2E Tests
 * 
 * Tests the automated detection of conflicting event handlers
 * and validates proper form submission patterns.
 */

import { test, expect } from '@playwright/test';
import { TestUser, generateTestId } from '../helpers/testUtils';
import { createE2EUser } from '../helpers/authHelpers';
import { cleanupTestUser } from '../helpers/testUtils';
import { setupE2E, closeAllModals, resetRateLimits } from '../helpers/e2eHelpers';
import { 
  waitForDashboard, 
  validateUXCompliance, 
  closeGuidedTourIfPresent, 
  waitForElement,
  waitForDashboardReady
} from '../helpers/uiHelpers';
import { 
  detectEventConflicts, 
  validateFormPatterns, 
  assertNoCriticalConflicts, 
  assertProperFormPatterns,
  TestEventHandlerDetector
} from '../helpers/eventHandlerDetection';
import { Role } from '../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Event Handler Detection E2E Tests', () => {
  let testUser: TestUser;

  test.beforeAll(async () => {
    testUser = await createE2EUser(Role.USER, {
      email: `e2e-event-detection-${generateTestId('user')}@testuser.local`,
      password: 'e2eTestPass123',
      name: 'E2E Event Detection Test User'
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    // Set longer timeouts for this test suite
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    
    await setupE2E(page, testUser, { 
      tab: 'connections', 
      validateUX: true 
    });
    await closeGuidedTourIfPresent(page);
    await waitForDashboardReady(page);
  });

  test.afterEach(async ({ page }) => {
    await closeAllModals(page);
    await resetRateLimits(page);
  });

  test.describe('Form Submission Pattern Detection', () => {
    test('should detect proper form submission patterns', async ({ page }) => {
      // Navigate to connections page where forms are present
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Validate form patterns
      const detector = new TestEventHandlerDetector();
      const validation = await detector.validateFormSubmissionPatterns(page);
      
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    test('should detect forms with proper data-testid attributes', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Check for forms with data-testid
      const formsWithTestId = await page.locator('form[data-testid]').count();
      const totalForms = await page.locator('form').count();
      
      expect(formsWithTestId).toBeGreaterThan(0);
      expect(formsWithTestId).toBe(totalForms);
    });

    test('should detect submit buttons with proper primary-action data-testid', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Check for submit buttons with proper data-testid
      const submitButtonsWithTestId = await page.locator('button[data-testid*="primary-action"]').count();
      const totalSubmitButtons = await page.locator('button[type="submit"]').count();
      
      expect(submitButtonsWithTestId).toBeGreaterThan(0);
      expect(submitButtonsWithTestId).toBe(totalSubmitButtons);
    });

    test('should validate specific form submission patterns', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      const detector = new TestEventHandlerDetector();
      
      // Validate create connection form
      const createFormValidation = await detector.validateFormSubmission(
        page, 
        '[data-testid="create-connection-form"]', 
        'create-connection'
      );
      
      expect(createFormValidation.valid).toBe(true);
      expect(createFormValidation.issues).toHaveLength(0);
    });
  });

  test.describe('Event Handler Conflict Detection', () => {
    test('should detect no critical event handler conflicts', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Detect conflicts
      const conflicts = await detectEventConflicts(page);
      
      // Filter for critical conflicts
      const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
      
      expect(criticalConflicts).toHaveLength(0);
    });

    test('should detect no high severity conflicts', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      const conflicts = await detectEventConflicts(page);
      const highConflicts = conflicts.filter(c => c.severity === 'high');
      
      expect(highConflicts).toHaveLength(0);
    });

    test('should provide recommendations for detected conflicts', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      const conflicts = await detectEventConflicts(page);
      
      // All conflicts should have recommendations
      conflicts.forEach(conflict => {
        expect(conflict.recommendation).toBeTruthy();
        expect(conflict.recommendation.length).toBeGreaterThan(0);
      });
    });
  });

  test.describe('Chat Interface Event Handler Detection', () => {
    test('should detect proper chat form submission patterns', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      const detector = new TestEventHandlerDetector();
      
      // Validate chat form
      const chatFormValidation = await detector.validateFormSubmission(
        page, 
        '[data-testid="chat-form"]', 
        'chat-send'
      );
      
      expect(chatFormValidation.valid).toBe(true);
    });

    test('should detect no conflicting event handlers in chat interface', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      const conflicts = await detectEventConflicts(page);
      const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
      
      expect(criticalConflicts).toHaveLength(0);
    });
  });

  test.describe('Comprehensive Event Handler Detection', () => {
    test('should generate comprehensive detection report', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await waitForDashboard(page);

      const detector = new TestEventHandlerDetector();
      const report = await detector.generateComprehensiveReport(page);
      
      expect(report).toBeTruthy();
      expect(report).toContain('Event Handler Detection Report');
      
      // Log the report for debugging
      console.log('Event Handler Detection Report:');
      console.log(report);
    });

    test('should assert no critical conflicts across all pages', async ({ page }) => {
      const pages = ['connections', 'chat', 'workflows', 'profile'];
      
      for (const pageName of pages) {
        await page.goto(`${BASE_URL}/dashboard?tab=${pageName}`);
        await waitForDashboard(page);
        
        // Assert no critical conflicts
        await assertNoCriticalConflicts(page);
      }
    });

    test('should assert proper form patterns across all pages', async ({ page }) => {
      const pages = ['connections', 'chat', 'workflows', 'profile'];
      
      for (const pageName of pages) {
        await page.goto(`${BASE_URL}/dashboard?tab=${pageName}`);
        await waitForDashboard(page);
        
        // Assert proper form patterns
        await assertProperFormPatterns(page);
      }
    });
  });

  test.describe('Development Mode Event Handler Detection', () => {
    test('should detect conflicts in development mode', async ({ page }) => {
      // This test simulates development mode detection
      await page.goto(`${BASE_URL}/dashboard?tab=connections`);
      await waitForDashboard(page);

      // Enable development detection
      await page.evaluate(() => {
        (window as any).eventHandlerDetection = {
          enabled: true,
          logLevel: 'warn'
        };
      });

      // Detect conflicts
      const conflicts = await detectEventConflicts(page);
      
      // Should not have critical conflicts
      const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
      expect(criticalConflicts).toHaveLength(0);
    });
  });
});
