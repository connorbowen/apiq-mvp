import { test, expect } from '@playwright/test';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
import { createTestUser, createTestConnection, cleanupTestUser, cleanupTestConnection, authenticateE2EPage, TestConnection } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Multi-Step Workflow Generation E2E Tests
 * 
 * Tests the critical P0.1.1 MVP blocker functionality using real data and real API connections.
 * 
 * Following user-rules.md E2E testing guidelines:
 * - Uses real data and real system components
 * - No mocks for the system under test
 * - Tests complete user workflows end-to-end
 * - Validates UX compliance and accessibility
 */
test.describe('Multi-Step Workflow Generation E2E Tests - P0.1.1 Critical MVP Blocker', () => {
  let uxHelper: UXComplianceHelper;
  let testUser: any;
  let testConnections: TestConnection[] = [];

  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
    
    // Create real test user and login (following user-rules.md: real data in E2E tests)
    testUser = await createTestUser(undefined, undefined, 'ADMIN');
    await authenticateE2EPage(page, testUser);
    
    // Create real API connections for testing (no mocks)
    testConnections = await createRealTestConnections(testUser.id);
    
    // Wait for dashboard to load
    await Promise.all([
      page.waitForURL(/.*dashboard/),
      page.waitForSelector('h1:has-text("Dashboard")')
    ]);
  });

  test.afterEach(async () => {
    // Clean up real test data
    if (testUser) {
      await cleanupTestUser(testUser);
    }
    if (testConnections && testConnections.length > 0) {
      for (const connection of testConnections) {
        await cleanupTestConnection(connection);
      }
    }
  });

  test.describe('P0.1.1: Multi-Step Workflow Generation - Core MVP Blocker', () => {
    test('should generate multi-step workflow from complex natural language description', async ({ page }) => {
      // Navigate to workflow creation
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Validate UX compliance
      await uxHelper.validatePageTitle('Create Workflow');
      await uxHelper.validateHeadingHierarchy(['Create Workflow', 'Natural Language Workflow Creation']);
      await uxHelper.validateActivationFirstUX();
      await uxHelper.validateFormAccessibility();
      await uxHelper.validateMobileResponsiveness();
      
      // Test complex multi-step workflow generation with real data
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('When a new GitHub issue is created, send a Slack notification and create a Trello card');
      
      // Start generation using real API connections
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // DEBUG: Wait a moment and check for any error messages
      await page.waitForTimeout(2000);
      
      // Check for error messages
      const errorElements = page.locator('.bg-red-50, [data-testid="workflow-error-message"], .text-red-600');
      const errorCount = await errorElements.count();
      if (errorCount > 0) {
        console.log('🔍 Found error messages:');
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorElements.nth(i).textContent();
          console.log(`🔍 Error ${i + 1}:`, errorText);
        }
        throw new Error(`Workflow generation failed: ${await errorElements.first().textContent()}`);
      }
      
      // Check for loading state
      const loadingElement = page.locator('text=Generating workflow..., text=Loading..., [data-testid="loading-indicator"]');
      const isLoading = await loadingElement.isVisible();
      console.log('🔍 Loading state visible:', isLoading);
      
      // Wait for workflow generation (should be multi-step)
      console.log('🔍 Waiting for workflow preview...');
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // CRITICAL: Validate that multiple steps were generated (not single-step)
      await expect(page.getByTestId('step-1-title')).toBeVisible();
      await expect(page.getByTestId('step-2-title')).toBeVisible();
      await expect(page.getByTestId('step-3-title')).toBeVisible();
      
      // Validate specific steps were created using real API connections
      await expect(page.getByTestId('step-1-title')).toContainText('GitHub');
      await expect(page.getByTestId('step-2-title')).toContainText('Slack');
      await expect(page.getByTestId('step-3-title')).toContainText('Trello');
      
      // Validate step explanations
      await expect(page.getByTestId('step-1-description')).toContainText('GitHub');
      await expect(page.getByTestId('step-2-description')).toContainText('Slack');
      await expect(page.getByTestId('step-3-description')).toContainText('Trello');
      
      // Test workflow confirmation and saving
      await page.getByTestId('select-workflow-btn').click();
      await page.getByTestId('primary-action save-workflow-btn').click();
      
      // Wait for redirect to workflows page
      await page.waitForURL(/.*workflows/);
      
      // Validate the new workflow appears in the list (more robust than success message)
      await expect(page.getByTestId('workflow-card')).toBeVisible();
      
      // Verify the workflow contains the expected content from our multi-step generation
      const workflowCard = page.getByTestId('workflow-card').first();
      await expect(workflowCard).toContainText(/GitHub/i);
      await expect(workflowCard).toContainText(/Slack/i);
      await expect(workflowCard).toContainText(/Trello/i);
    });

    test('should handle complex order processing workflow with real APIs', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Test complex multi-step workflow with real API connections
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('When a customer places an order: 1) Create invoice in QuickBooks, 2) Send confirmation email, 3) Update inventory in Shopify, 4) Create shipping label in ShipStation');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Wait for complex workflow generation
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 45000 });
      
      // Validate all steps are generated using real connections
      await expect(page.getByText('Step 1:')).toBeVisible();
      await expect(page.getByText('Step 2:')).toBeVisible();
      await expect(page.getByText('Step 3:')).toBeVisible();
      await expect(page.getByText('Step 4:')).toBeVisible();
      
      await expect(page.getByText(/Create.*Invoice/i)).toBeVisible();
      await expect(page.getByText(/Send.*Email/i)).toBeVisible();
      await expect(page.getByText(/Update.*Inventory/i)).toBeVisible();
      await expect(page.getByText(/Create.*Shipping.*Label/i)).toBeVisible();
      
      // Test step explanations with real API details
      await page.getByText('Step 1:').click();
      await expect(page.getByText(/creates.*invoice.*QuickBooks/i)).toBeVisible();
      
      await page.getByText('Step 2:').click();
      await expect(page.getByText(/sends.*confirmation.*email/i)).toBeVisible();
      
      await page.getByText('Step 3:').click();
      await expect(page.getByText(/updates.*inventory.*Shopify/i)).toBeVisible();
      
      await page.getByText('Step 4:').click();
      await expect(page.getByText(/creates.*shipping.*label.*ShipStation/i)).toBeVisible();
    });
  });

  test.describe('P0.1.2: Data Flow Mapping with Real APIs', () => {
    test('should map data between workflow steps using real API responses', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('When a new customer signs up, create a CRM contact and send them a welcome email with their name');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate data mapping between steps
      await expect(page.getByText('Step 1:')).toBeVisible();
      await expect(page.getByText('Step 2:')).toBeVisible();
      
      // Test data flow visualization
      await page.getByText('Data Flow').click();
      await expect(page.getByText(/customer.*name.*email/i)).toBeVisible();
      await expect(page.getByText(/step1.*output.*step2.*input/i)).toBeVisible();
      
      // Validate data mapping configuration
      await page.getByText('Configure Data Flow').click();
      await expect(page.getByText(/Map.*customer.*name.*to.*email.*subject/i)).toBeVisible();
    });
  });

  test.describe('P0.1.3: Conditional Logic with Real APIs', () => {
    test('should generate conditional workflow steps based on real API data', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('If GitHub issue is urgent, send Slack notification immediately, otherwise send email');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate conditional step generation
      await expect(page.getByText('Step 1:')).toBeVisible();
      await expect(page.getByText('Step 2:')).toBeVisible();
      await expect(page.getByText('Step 3:')).toBeVisible();
      await expect(page.getByText('Step 4:')).toBeVisible();
      
      // Validate conditional logic
      await expect(page.getByText(/Check.*Issue.*Urgency/i)).toBeVisible();
      await expect(page.getByText(/If.*urgent.*Slack/i)).toBeVisible();
      await expect(page.getByText(/Else.*email/i)).toBeVisible();
      
      // Test conditional configuration
      await page.getByText('Configure Conditions').click();
      await expect(page.getByText(/Condition.*urgent.*label/i)).toBeVisible();
      await expect(page.getByText(/True.*Slack.*notification/i)).toBeVisible();
      await expect(page.getByText(/False.*email.*notification/i)).toBeVisible();
    });
  });

  test.describe('P0.1.4: Function Name Collision Prevention', () => {
    test('should generate unique function names with API prefixes', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Send notification when GitHub issue is created');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate function names have API prefixes
      await page.getByText('Generated Functions').click();
      await expect(page.getByText(/GitHub_.*/)).toBeVisible();
      await expect(page.getByText(/Slack_.*/)).toBeVisible();
      
      // Validate no function name collisions
      const functionNames = await page.locator('[data-testid="function-name"]').allTextContents();
      const uniqueNames = new Set(functionNames);
      expect(uniqueNames.size).toBe(functionNames.length);
    });
  });

  test.describe('P0.1.5: Parameter Schema Enhancement', () => {
    test('should enhance parameter schemas with examples and validation', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Create a Slack message with attachments');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate enhanced parameter schemas
      await page.getByText('Step Parameters').click();
      await expect(page.getByText(/channel.*required.*string/i)).toBeVisible();
      await expect(page.getByText(/text.*required.*string/i)).toBeVisible();
      await expect(page.getByText(/attachments.*array.*object/i)).toBeVisible();
      
      // Validate parameter examples
      await expect(page.getByText(/Example.*#general/i)).toBeVisible();
      await expect(page.getByText(/Example.*Hello.*world/i)).toBeVisible();
      
      // Validate parameter validation
      await expect(page.getByText(/Validation.*required.*field/i)).toBeVisible();
      await expect(page.getByText(/Validation.*string.*type/i)).toBeVisible();
    });
  });

  test.describe('P0.1.6: Context-Aware Function Filtering', () => {
    test('should filter functions based on user request context', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Send Slack notification for new orders');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate function filtering
      await page.getByText('Available Functions').click();
      
      // Should prioritize Slack functions
      const slackFunctions = await page.locator('[data-testid="function-name"]').filter({ hasText: 'Slack' }).count();
      expect(slackFunctions).toBeGreaterThan(0);
      
      // Should show relevance scores
      await expect(page.getByText(/Relevance.*Score/i)).toBeVisible();
      
      // Should limit function count for token management
      const totalFunctions = await page.locator('[data-testid="function-name"]').count();
      expect(totalFunctions).toBeLessThanOrEqual(10);
    });
  });

  test.describe('P0.1.7: Workflow Validation Enhancement', () => {
    test('should validate workflow completeness and suggest improvements', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Send notification when something happens');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Should show validation issues for unclear request
      await expect(page.getByText(/Please.*provide.*more.*details/i)).toBeVisible();
      await expect(page.getByText(/Try.*describing.*specific.*actions/i)).toBeVisible();
      
      // Provide clearer request
      await chatInput.fill('Send Slack notification when a new GitHub issue is created');
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Validate workflow completeness
      await page.getByText('Workflow Validation').click();
      await expect(page.getByText(/Completeness.*Score.*\d+%/)).toBeVisible();
      await expect(page.getByText(/Validation.*Passed/i)).toBeVisible();
      
      // Validate improvement suggestions
      await expect(page.getByText(/Consider.*adding.*error.*handling/i)).toBeVisible();
      await expect(page.getByText(/Consider.*adding.*data.*validation/i)).toBeVisible();
    });
  });

  test.describe('P0.1.8: Error Handling Improvements', () => {
    test('should provide specific error messages and retry logic', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Test unclear request handling
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('do something');
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Should show specific error message
      await uxHelper.validateErrorContainer('Please provide more details about what you want to automate');
      await expect(page.getByText(/Try.*describing.*specific.*actions.*and.*triggers/i)).toBeVisible();
      
      // Test API connection failure handling
      await chatInput.fill('Send notification for new orders');
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Should show helpful error message about missing connections
      await expect(page.getByText(/No.*API.*connections.*available/i)).toBeVisible();
      await expect(page.getByText(/Please.*add.*at.*least.*one.*API.*connection/i)).toBeVisible();
      
      // Test retry functionality
      await page.getByText('Try Again').click();
      await expect(page.getByText(/Retrying.*workflow.*generation/i)).toBeVisible();
    });

    test('should provide fallback workflows for common scenarios', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('Send notification for new orders');
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Should show fallback workflows
      await expect(page.getByText(/Alternative.*Workflows/i)).toBeVisible();
      await expect(page.getByText(/Simple.*Notification.*Workflow/i)).toBeVisible();
      await expect(page.getByText(/Basic.*Email.*Workflow/i)).toBeVisible();
      
      // Test selecting fallback workflow
      await page.getByText('Simple Notification Workflow').click();
      await expect(page.getByText(/Workflow.*selected.*successfully/i)).toBeVisible();
    });
  });

  test.describe('Integration with Existing Workflow Engine', () => {
    test('should integrate with step runner engine for execution', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('When a new GitHub issue is created, send a Slack notification');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Save the workflow
      await page.getByTestId('primary-action save-workflow-btn').click();
      await uxHelper.validateSuccessContainer('Workflow created successfully');
      
      // Navigate to workflows list
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await expect(page.getByText(/GitHub.*Slack/i)).toBeVisible();
      
      // Execute the workflow
      await page.getByText(/GitHub.*Slack/i).click();
      await page.getByTestId('primary-action execute-workflow-btn').click();
      
      // Validate execution starts
      await expect(page.getByText(/Execution.*started/i)).toBeVisible();
      await expect(page.getByText(/Step.*1.*running/i)).toBeVisible();
      
      // Monitor execution progress
      await expect(page.getByText(/Step.*1.*completed/i)).toBeVisible();
      await expect(page.getByText(/Step.*2.*running/i)).toBeVisible();
      await expect(page.getByText(/Step.*2.*completed/i)).toBeVisible();
      
      // Validate execution completion
      await expect(page.getByText(/Workflow.*completed.*successfully/i)).toBeVisible();
    });

    test('should handle workflow execution state management', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('When a new GitHub issue is created, send a Slack notification');
      
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Save and execute workflow
      await page.getByTestId('primary-action save-workflow-btn').click();
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByText(/GitHub.*Slack/i).click();
      await page.getByTestId('primary-action execute-workflow-btn').click();
      
      // Test pause functionality
      await page.getByTestId('primary-action pause-workflow-btn').click();
      await expect(page.getByText(/Workflow.*paused/i)).toBeVisible();
      
      // Test resume functionality
      await page.getByTestId('primary-action resume-workflow-btn').click();
      await expect(page.getByText(/Workflow.*resumed/i)).toBeVisible();
      
      // Test cancel functionality
      await page.getByTestId('primary-action cancel-workflow-btn').click();
      await expect(page.getByText(/Workflow.*cancelled/i)).toBeVisible();
    });
  });

  test.describe('Performance Requirements', () => {
    test('should generate multi-step workflows within 5 seconds', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const startTime = Date.now();
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('When a new GitHub issue is created, send a Slack notification and create a Trello card');
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 10000 });
      
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      
      // Should complete within 5 seconds for multi-step workflows
      expect(generationTime).toBeLessThan(5000);
      
      // Validate multiple steps were generated
      await expect(page.getByText('Step 1:')).toBeVisible();
      await expect(page.getByText('Step 2:')).toBeVisible();
      await expect(page.getByText('Step 3:')).toBeVisible();
    });

    test('should handle concurrent workflow generation requests', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Start multiple workflow generations
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      
      // First workflow
      await chatInput.fill('Send Slack notification for new orders');
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Open new tab for second workflow
      const newPage = await page.context().newPage();
      await newPage.goto(`${BASE_URL}/workflows/create`);
      
      const newChatInput = newPage.getByPlaceholder('Describe your workflow...');
      await newChatInput.fill('Send email for new user registrations');
      await newPage.getByTestId('primary-action generate-workflow-btn').click();
      
      // Both should complete successfully with multiple steps
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 15000 });
      await newPage.waitForSelector('[data-testid="workflow-preview"]', { timeout: 15000 });
      
      // Validate both generated multiple steps
      await expect(page.getByText('Step 1:')).toBeVisible();
      await expect(newPage.getByText('Step 1:')).toBeVisible();
      
      await newPage.close();
    });
  });

  test.describe('UX Compliance & Accessibility', () => {
    test('should meet WCAG 2.1 AA accessibility standards for multi-step workflows', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      // Validate comprehensive UX compliance
      await uxHelper.validateCompleteUXCompliance();
      
      // Test keyboard navigation for multi-step interface
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('role', 'textbox');
      
      // Test ARIA labels for multi-step components
      await expect(page.getByLabel('Workflow description')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Generate Workflow' })).toBeVisible();
      
      // Generate workflow to test multi-step accessibility
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('When a new GitHub issue is created, send a Slack notification');
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]', { timeout: 30000 });
      
      // Test accessibility for step components
      await expect(page.getByRole('heading', { name: /Step 1:/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Configure Step 1/i })).toBeVisible();
    });

    test('should provide clear progress indicators for multi-step generation', async ({ page }) => {
      await page.goto(`${BASE_URL}/workflows/create`);
      
      const chatInput = page.getByPlaceholder('Describe your workflow...');
      await chatInput.fill('When a new GitHub issue is created, send a Slack notification and create a Trello card');
      await page.getByTestId('primary-action generate-workflow-btn').click();
      
      // Should show loading state
      await expect(page.getByText('Generating multi-step workflow...')).toBeVisible();
      await expect(page.getByTestId('primary-action generate-workflow-btn')).toBeDisabled();
      
      // Should show progress steps for multi-step generation
      await expect(page.getByText('Analyzing workflow requirements')).toBeVisible();
      await expect(page.getByText('Planning workflow steps')).toBeVisible();
      await expect(page.getByText('Generating step configurations')).toBeVisible();
      await expect(page.getByText('Validating workflow logic')).toBeVisible();
      await expect(page.getByText('Creating data flow mappings')).toBeVisible();
    });
  });
});

/**
 * Helper functions for creating real test data
 * Following user-rules.md: E2E tests use real data and real system components
 */

async function createRealTestConnections(userId: string) {
  // Create real API connections for testing multi-step workflows
  const connections = [];
  
  // Create a proper TestUser object
  const testUserObj = {
    id: userId,
    email: 'test@example.com',
    password: 'testpass123',
    name: 'Test User',
    role: 'ADMIN' as const,
    accessToken: '',
    refreshToken: ''
  };
  
  // Create GitHub connection
  const githubConnection = await createTestConnection(
    testUserObj,
    'GitHub Test Connection',
    'https://api.github.com',
    'API_KEY',
    true
  );
  connections.push(githubConnection);
  
  // Create Slack connection
  const slackConnection = await createTestConnection(
    testUserObj,
    'Slack Test Connection',
    'https://slack.com/api',
    'API_KEY',
    true
  );
  connections.push(slackConnection);
  
  // Create Trello connection
  const trelloConnection = await createTestConnection(
    testUserObj,
    'Trello Test Connection',
    'https://api.trello.com/1',
    'API_KEY',
    true
  );
  connections.push(trelloConnection);
  
  return connections;
} 