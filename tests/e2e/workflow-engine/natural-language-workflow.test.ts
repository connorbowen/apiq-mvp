import { test, expect } from '@playwright/test';
import { UXComplianceHelper } from '../../helpers/uxCompliance';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Natural Language Workflow Creation E2E Tests - Core P0 Feature', () => {
  let uxHelper: UXComplianceHelper;

  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
    
    // Create test user and login
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Email address').fill('e2e-test@example.com');
    await page.getByLabel('Password').fill('e2eTestPass123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Wait for dashboard to load
    await Promise.all([
      page.waitForURL(/.*dashboard/),
      page.waitForSelector('h1:has-text("Dashboard")')
    ]);
  });

  test.describe('Natural Language Workflow Creation - Core Differentiator', () => {
    test('should create workflow from natural language description', async ({ page }) => {
      // Navigate to workflow creation
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      // Wait for chat interface to load
      await page.waitForSelector('[data-testid="natural-language-chat"]');
      
      // Validate UX compliance
      await uxHelper.validatePageTitle('Create Workflow');
      await uxHelper.validateHeadingHierarchy(['Create Workflow', 'Natural Language Workflow Creation']);
      
      // Test natural language workflow creation
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('When a new GitHub issue is created, send a Slack notification and create a Trello card');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      // Wait for workflow generation
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate generated workflow
      await expect(page.getByText('GitHub Issue Created')).toBeVisible();
      await expect(page.getByText('Send Slack Notification')).toBeVisible();
      await expect(page.getByText('Create Trello Card')).toBeVisible();
      
      // Test workflow confirmation
      await page.getByRole('button', { name: 'Save Workflow' }).click();
      
      // Validate success message
      await uxHelper.validateSuccessContainer('Workflow created successfully');
      
      // Verify workflow appears in list
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await expect(page.getByText('GitHub Issue → Slack → Trello')).toBeVisible();
    });

    test('should handle complex multi-step workflows', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('When a customer places an order: 1) Create invoice in QuickBooks, 2) Send confirmation email, 3) Update inventory in Shopify, 4) Create shipping label in ShipStation');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      // Wait for complex workflow generation
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 45000 });
      
      // Validate all steps are generated
      await expect(page.getByText('Create Invoice')).toBeVisible();
      await expect(page.getByText('Send Email')).toBeVisible();
      await expect(page.getByText('Update Inventory')).toBeVisible();
      await expect(page.getByText('Create Shipping Label')).toBeVisible();
      
      // Test step explanations
      await page.getByText('Create Invoice').click();
      await expect(page.getByText('Creates a new invoice in QuickBooks')).toBeVisible();
    });

    test('should provide workflow optimization suggestions', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send email when new user signs up');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]');
      
      // Check for optimization suggestions
      await expect(page.getByText('Optimization Suggestions')).toBeVisible();
      await expect(page.getByText('Consider adding email templates')).toBeVisible();
      await expect(page.getByText('Add error handling for email failures')).toBeVisible();
    });

    test('should handle workflow modifications and iterations', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send Slack notification for new orders');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]');
      
      // Modify the workflow
      await page.getByRole('button', { name: 'Edit Workflow' }).click();
      await page.getByPlaceholder('Describe your workflow in natural language...').fill('Send Slack notification for new orders and also send an email to the customer');
      await page.getByRole('button', { name: 'Update Workflow' }).click();
      
      // Validate updated workflow
      await expect(page.getByText('Send Slack Notification')).toBeVisible();
      await expect(page.getByText('Send Customer Email')).toBeVisible();
    });
  });

  test.describe('Context-Aware Conversation', () => {
    test('should maintain conversation context for follow-up questions', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Create a workflow for customer onboarding');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]');
      
      // Ask follow-up question
      await chatInput.fill('Add a step to send a welcome email');
      await page.getByRole('button', { name: 'Update Workflow' }).click();
      
      // Validate context is maintained
      await expect(page.getByText('Customer Onboarding')).toBeVisible();
      await expect(page.getByText('Send Welcome Email')).toBeVisible();
    });

    test('should handle clarification requests intelligently', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send notification when something happens');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      // Should ask for clarification
      await expect(page.getByText('Could you please specify what event should trigger this notification?')).toBeVisible();
      await expect(page.getByText('What type of notification would you like to send?')).toBeVisible();
      
      // Provide clarification
      await chatInput.fill('Send Slack notification when a new GitHub issue is created');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]');
      await expect(page.getByText('GitHub Issue Created')).toBeVisible();
      await expect(page.getByText('Send Slack Notification')).toBeVisible();
    });
  });

  test.describe('Performance Requirements', () => {
    test('should generate workflows within 5 seconds for simple requests', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      const startTime = Date.now();
      
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send email when form is submitted');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 10000 });
      
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      
      // Should complete within 5 seconds
      expect(generationTime).toBeLessThan(5000);
    });

    test('should handle concurrent workflow generation requests', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      // Start multiple workflow generations
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      
      // First workflow
      await chatInput.fill('Send Slack notification for new orders');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      // Open new tab for second workflow
      const newPage = await page.context().newPage();
      await newPage.goto(`${BASE_URL}/dashboard`);
      await newPage.getByRole('tab', { name: 'Workflows' }).click();
      await newPage.getByRole('button', { name: 'Create Workflow' }).click();
      
      const newChatInput = newPage.getByPlaceholder('Describe your workflow in natural language...');
      await newChatInput.fill('Send email for new user registrations');
      await newPage.getByRole('button', { name: 'Generate Workflow' }).click();
      
      // Both should complete successfully
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 15000 });
      await newPage.waitForSelector('[data-testid="workflow-preview"]', { timeout: 15000 });
      
      await newPage.close();
    });
  });

  test.describe('Error Handling & Edge Cases', () => {
    test('should handle invalid or unclear workflow descriptions', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('do something');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      // Should show helpful error message
      await uxHelper.validateErrorContainer('Please provide more details about what you want to automate');
      await expect(page.getByText('Try describing the specific actions and triggers')).toBeVisible();
    });

    test('should handle API service unavailability gracefully', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      // Mock API failure
      await page.route('**/api/workflows/generate', route => {
        route.fulfill({ status: 503, body: 'Service Unavailable' });
      });
      
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send notification for new orders');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      // Should show graceful error message
      await uxHelper.validateErrorContainer('Workflow generation service is temporarily unavailable');
      await expect(page.getByText('Please try again in a few minutes')).toBeVisible();
    });

    test('should validate workflow before saving', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send notification to invalid API');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]');
      
      // Try to save invalid workflow
      await page.getByRole('button', { name: 'Save Workflow' }).click();
      
      // Should show validation errors
      await uxHelper.validateErrorContainer('Workflow validation failed');
      await expect(page.getByText('Please configure the required API connections')).toBeVisible();
    });
  });

  test.describe('UX Compliance & Accessibility', () => {
    test('should meet WCAG 2.1 AA accessibility standards', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      // Validate comprehensive UX compliance
      await uxHelper.validateCompleteUXCompliance();
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('role', 'textbox');
      
      // Test ARIA labels
      await expect(page.getByLabel('Workflow description')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Generate Workflow' })).toBeVisible();
    });

    test('should provide clear progress indicators', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send notification for new orders');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      // Should show loading state
      await expect(page.getByText('Generating workflow...')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Generate Workflow' })).toBeDisabled();
      
      // Should show progress steps
      await expect(page.getByText('Analyzing workflow requirements')).toBeVisible();
      await expect(page.getByText('Generating workflow steps')).toBeVisible();
      await expect(page.getByText('Validating workflow logic')).toBeVisible();
    });

    test('should provide helpful guidance and examples', async ({ page }) => {
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByRole('button', { name: 'Create Workflow' }).click();
      
      // Check for helpful examples
      await expect(page.getByText('Try these examples:')).toBeVisible();
      await expect(page.getByText('When a new order is placed, send a Slack notification')).toBeVisible();
      await expect(page.getByText('Create a Trello card when a GitHub issue is opened')).toBeVisible();
      
      // Test quick example selection
      await page.getByText('When a new order is placed, send a Slack notification').click();
      await expect(page.getByPlaceholder('Describe your workflow in natural language...')).toHaveValue('When a new order is placed, send a Slack notification');
    });
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
