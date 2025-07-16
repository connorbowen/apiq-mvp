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
// TODO: Add UXComplianceHelper integration (P0)
// import { UXComplianceHelper } from '../../helpers/uxCompliance';
// 
// test.beforeEach(async ({ page }) => {
//   const uxHelper = new UXComplianceHelper(page);
//   await uxHelper.validateActivationFirstUX();
//   await uxHelper.validateFormAccessibility();
//   await uxHelper.validateMobileResponsiveness();
//   await uxHelper.validateKeyboardNavigation();
// });

// TODO: Add cookie-based authentication testing (P0)
// - Test HTTP-only cookie authentication
// - Test secure cookie settings
// - Test cookie expiration and cleanup
// - Test cookie-based session management
// - Test authentication state persistence via cookies

// TODO: Replace localStorage with cookie-based authentication (P0)
// Application now uses cookie-based authentication instead of localStorage
// 
// Anti-patterns to remove:
// - localStorage.getItem('token')
// - localStorage.setItem('token', value)
// - localStorage.removeItem('token')
// 
// Replace with cookie-based patterns:
// - Test authentication via HTTP-only cookies
// - Test session management via secure cookies
// - Test logout by clearing authentication cookies

// TODO: Add data cleanup patterns (P0)
// - Clean up test users: await prisma.user.deleteMany({ where: { email: { contains: 'e2e-test' } } });
// - Clean up test connections: await prisma.connection.deleteMany({ where: { name: { contains: 'Test' } } });
// - Clean up test workflows: await prisma.workflow.deleteMany({ where: { name: { contains: 'Test' } } });
// - Clean up test secrets: await prisma.secret.deleteMany({ where: { name: { contains: 'Test' } } });

// TODO: Add deterministic test data (P0)
// - Create predictable test data with unique identifiers
// - Use timestamps or UUIDs to avoid conflicts
// - Example: const testUser = await createTestUser({ email: `e2e-test-${Date.now()}@example.com` });
// - Ensure test data is isolated and doesn't interfere with other tests

// TODO: Ensure test independence (P0)
// - Each test should be able to run in isolation
// - No dependencies on other test execution order
// - Clean state before and after each test
// - Use unique identifiers for all test data
// - Avoid global state modifications

// TODO: Remove API calls from E2E tests (P0)
// E2E tests should ONLY test user interactions through the UI
// API testing should be done in integration tests
// 
// Anti-patterns to remove:
// - page.request.post('/api/connections', {...})
// - fetch('/api/connections')
// - axios.post('/api/connections')
// 
// Replace with UI interactions:
// - await page.click('[data-testid="create-connection-btn"]')
// - await page.fill('[data-testid="connection-name-input"]', 'Test API')
// - await page.click('[data-testid="primary-action submit-btn"]')

// TODO: Remove all API testing from E2E tests (P0)
// E2E tests should ONLY test user interactions through the UI
// API testing belongs in integration tests
// 
// Anti-patterns detected and must be removed:
// - page.request.post('/api/connections', {...})
// - fetch('/api/connections')
// - axios.post('/api/connections')
// - request.get('/api/connections')
// 
// Replace with UI interactions:
// - await page.click('[data-testid="create-connection-btn"]')
// - await page.fill('[data-testid="connection-name-input"]', 'Test API')
// - await page.click('[data-testid="primary-action submit-btn"]')
// - await expect(page.locator('[data-testid="success-message"]')).toBeVisible()

// TODO: Add robust waiting patterns for dynamic elements (P0)
// - Use waitForSelector() instead of hardcoded delays
// - Use expect().toBeVisible() for element visibility checks
// - Use waitForLoadState() for page load completion
// - Use waitForResponse() for API calls
// - Use waitForFunction() for custom conditions
// 
// Example patterns:
// await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
// await expect(page.locator('[data-testid="submit-btn"]')).toBeVisible();
// await page.waitForLoadState('networkidle');
// await page.waitForResponse(response => response.url().includes('/api/'));
// await page.waitForFunction(() => document.querySelector('.loading').style.display === 'none');

// TODO: Replace hardcoded delays with robust waiting (P0)
// Anti-patterns to replace:
// - setTimeout(5000) → await page.waitForSelector(selector, { timeout: 5000 })
// - sleep(3000) → await expect(page.locator(selector)).toBeVisible({ timeout: 3000 })
// - delay(2000) → await page.waitForLoadState('networkidle')
// 
// Best practices:
// - Wait for specific elements to appear
// - Wait for network requests to complete
// - Wait for page state changes
// - Use appropriate timeouts for different operations

// TODO: Add XSS prevention testing (P0)
// - Test input sanitization
// - Test script injection prevention
// - Test HTML escaping
// - Test content security policy compliance

// TODO: Add CSRF protection testing (P0)
// - Test CSRF token validation
// - Test cross-site request forgery prevention
// - Test cookie-based CSRF protection
// - Test secure form submission

// TODO: Add data exposure testing (P0)
// - Test sensitive data handling
// - Test privacy leak prevention
// - Test information disclosure prevention
// - Test data encryption and protection

// TODO: Add authentication flow testing (P0)
// - Test OAuth integration
// - Test SSO (Single Sign-On) flows
// - Test MFA (Multi-Factor Authentication)
// - Test authentication state management

// TODO: Add session management testing (P0)
// - Test cookie-based session management
// - Test session expiration handling
// - Test login state persistence
// - Test logout and session cleanup

// TODO: Add UI interaction testing (P0)
// E2E tests should focus on user interactions through the UI
// - Test clicking buttons and links
// - Test filling forms
// - Test navigation flows
// - Test user workflows end-to-end

// TODO: Add primary action button patterns (P0)
// - Use data-testid="primary-action {action}-btn" pattern
// - Test primary action presence with UXComplianceHelper
// - Validate button text matches standardized patterns

// TODO: Add form accessibility testing (P0)
// - Test form labels and ARIA attributes
// - Test keyboard navigation
// - Test screen reader compatibility
// - Use UXComplianceHelper.validateFormAccessibility()

// TODO: Add workflow execution engine testing (P0)
// - Test workflow execution from start to finish
// - Test step-by-step execution
// - Test execution state management
// - Test execution error handling
// - Test execution monitoring and logging

// TODO: Add natural language workflow creation testing (P0)
// - Test workflow generation from natural language descriptions
// - Test complex multi-step workflow creation
// - Test workflow parameter mapping
// - Test workflow validation and error handling
