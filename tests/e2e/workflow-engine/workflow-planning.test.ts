import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUser } from '../../helpers/testUtils';
import { createUXComplianceHelper } from '../../helpers/uxCompliance';

test.describe('Workflow Planning E2E Tests', () => {
  let testUser: any;
  let uxHelper: any;

  test.beforeEach(async ({ page }) => {
    testUser = await createTestUser();
    uxHelper = createUXComplianceHelper(page);
    
    // Login and navigate to workflow creation
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    await page.click('[data-testid="primary-action signin-btn"]');
    
    await page.waitForURL('/dashboard');
    await page.goto('/workflows/create');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await cleanupTestUser(testUser.id);
  });

  test('should decompose webhook → transform → action patterns', async ({ page }) => {
    // Test complex workflow that requires multiple steps
    const complexRequest = 'When a new GitHub issue is created, transform the data to include priority level, then send a Slack notification with the transformed data';
    
    await page.fill('[data-testid="workflow-description-input"]', complexRequest);
    await page.click('[data-testid="primary-action generate-workflow-btn"]');
    
    // Wait for workflow generation
    await page.waitForSelector('[data-testid="workflow-steps-container"]', { timeout: 30000 });
    
    // Validate multi-step workflow was generated
    const steps = await page.locator('[data-testid="workflow-step"]').count();
    expect(steps).toBeGreaterThanOrEqual(3);
    
    // Validate step types
    const stepTypes = await page.locator('[data-testid="workflow-step-type"]').allTextContents();
    expect(stepTypes).toContain('webhook');
    expect(stepTypes).toContain('transform');
    expect(stepTypes).toContain('action');
    
    // Validate step ordering
    const stepOrder = await page.locator('[data-testid="workflow-step-order"]').allTextContents();
    expect(stepOrder[0]).toBe('1');
    expect(stepOrder[1]).toBe('2');
    expect(stepOrder[2]).toBe('3');
    
    // UX compliance validation
    await uxHelper.validateWorkflowGenerationUX();
  });

  test('should handle conditional workflow branching (if/then/else)', async ({ page }) => {
    const conditionalRequest = 'When a payment is received, check if the amount is over $1000, if yes send to manager approval, if no auto-approve and send confirmation';
    
    await page.fill('[data-testid="workflow-description-input"]', conditionalRequest);
    await page.click('[data-testid="primary-action generate-workflow-btn"]');
    
    await page.waitForSelector('[data-testid="workflow-steps-container"]', { timeout: 30000 });
    
    // Validate conditional logic was detected
    const conditionalSteps = await page.locator('[data-testid="workflow-step-conditional"]').count();
    expect(conditionalSteps).toBeGreaterThan(0);
    
    // Validate branching structure
    const branchSteps = await page.locator('[data-testid="workflow-step-branch"]').count();
    expect(branchSteps).toBeGreaterThanOrEqual(2);
    
    // Validate conditional expressions
    const conditions = await page.locator('[data-testid="workflow-condition"]').allTextContents();
    expect(conditions.some(condition => condition.includes('amount > 1000'))).toBeTruthy();
    
    await uxHelper.validateWorkflowGenerationUX();
  });

  test('should support parallel step execution', async ({ page }) => {
    const parallelRequest = 'When a new order is placed, simultaneously send confirmation email, update inventory, and notify shipping department';
    
    await page.fill('[data-testid="workflow-description-input"]', parallelRequest);
    await page.click('[data-testid="primary-action generate-workflow-btn"]');
    
    await page.waitForSelector('[data-testid="workflow-steps-container"]', { timeout: 30000 });
    
    // Validate parallel execution indicators
    const parallelSteps = await page.locator('[data-testid="workflow-step-parallel"]').count();
    expect(parallelSteps).toBeGreaterThan(0);
    
    // Validate parallel step ordering (should have same order number)
    const parallelOrderNumbers = await page.locator('[data-testid="workflow-step-parallel"] [data-testid="workflow-step-order"]').allTextContents();
    const uniqueOrderNumbers = new Set(parallelOrderNumbers);
    expect(uniqueOrderNumbers.size).toBeLessThan(parallelOrderNumbers.length);
    
    await uxHelper.validateWorkflowGenerationUX();
  });

  test('should validate step dependencies and ordering', async ({ page }) => {
    const dependencyRequest = 'Fetch user data from CRM, then use that data to create a personalized email, then send the email and log the activity';
    
    await page.fill('[data-testid="workflow-description-input"]', dependencyRequest);
    await page.click('[data-testid="primary-action generate-workflow-btn"]');
    
    await page.waitForSelector('[data-testid="workflow-steps-container"]', { timeout: 30000 });
    
    // Validate dependency indicators
    const dependentSteps = await page.locator('[data-testid="workflow-step-dependent"]').count();
    expect(dependentSteps).toBeGreaterThan(0);
    
    // Validate data flow indicators
    const dataFlowSteps = await page.locator('[data-testid="workflow-step-data-flow"]').count();
    expect(dataFlowSteps).toBeGreaterThan(0);
    
    // Validate step descriptions mention dependencies
    const stepDescriptions = await page.locator('[data-testid="workflow-step-description"]').allTextContents();
    expect(stepDescriptions.some(desc => desc.includes('user data'))).toBeTruthy();
    expect(stepDescriptions.some(desc => desc.includes('personalized'))).toBeTruthy();
    
    await uxHelper.validateWorkflowGenerationUX();
  });

  test('should handle workflow templates and patterns', async ({ page }) => {
    const templateRequest = 'Create a customer onboarding workflow template that includes welcome email, account setup, and first task assignment';
    
    await page.fill('[data-testid="workflow-description-input"]', templateRequest);
    await page.click('[data-testid="primary-action generate-workflow-btn"]');
    
    await page.waitForSelector('[data-testid="workflow-steps-container"]', { timeout: 30000 });
    
    // Validate template pattern was recognized
    const templateIndicator = await page.locator('[data-testid="workflow-template-indicator"]').isVisible();
    expect(templateIndicator).toBeTruthy();
    
    // Validate template steps
    const templateSteps = await page.locator('[data-testid="workflow-step-template"]').count();
    expect(templateSteps).toBeGreaterThan(0);
    
    // Validate template name
    const templateName = await page.locator('[data-testid="workflow-template-name"]').textContent();
    expect(templateName).toContain('customer onboarding');
    
    // Validate template reusability
    const saveTemplateButton = await page.locator('[data-testid="primary-action save-template-btn"]').isVisible();
    expect(saveTemplateButton).toBeTruthy();
    
    await uxHelper.validateWorkflowGenerationUX();
  });
}); 