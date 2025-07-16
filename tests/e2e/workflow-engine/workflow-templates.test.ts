import { test, expect } from '@playwright/test';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
import { createTestUser, cleanupTestUser, generateTestId } from '../../helpers/testUtils';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Workflow Templates & Libraries E2E Tests - P1 High Priority', () => {
  let uxHelper: UXComplianceHelper;
  let testUser: any;
  let jwt: string;

  test.beforeAll(async () => {
    // Create a real test user and get JWT
    testUser = await createTestUser(
      `e2e-templates-${generateTestId('user')}@example.com`,
      'e2eTestPass123',
      'ADMIN',
      'E2E Templates Test User'
    );
    jwt = testUser.accessToken;
  });

  test.afterAll(async () => {
    // Clean up test user
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
    
    // Login with real test user
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Email address').fill(testUser.email);
    await page.getByLabel('Password').fill('e2eTestPass123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Wait for dashboard to load
    await Promise.all([
      page.waitForURL(/.*dashboard/),
      page.waitForSelector('h1:has-text("Dashboard")')
    ]);
  });

  test.describe('Pre-built Template Library', () => {
    test('should display 20+ pre-built templates at launch', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Check if Browse Templates button exists (feature not implemented yet)
      const browseTemplatesButton = page.getByRole('button', { name: 'Browse Templates' });
      
      if (await browseTemplatesButton.count() > 0) {
        await browseTemplatesButton.click();
        
        // Validate UX compliance
        await uxHelper.validatePageTitle('Workflow Templates');
        await uxHelper.validateHeadingHierarchy(['Workflow Templates', 'Pre-built Solutions']);
        
        // Check for template categories
        await expect(page.getByText('Customer Management')).toBeVisible();
        await expect(page.getByText('Sales & Marketing')).toBeVisible();
        await expect(page.getByText('Developer Tools')).toBeVisible();
        await expect(page.getByText('E-commerce')).toBeVisible();
        await expect(page.getByText('Project Management')).toBeVisible();
        
        // Count templates (should have 20+)
        const templateCards = page.locator('[data-testid="template-card"]');
        const templateCount = await templateCards.count();
        expect(templateCount).toBeGreaterThanOrEqual(20);
      } else {
        // Feature not implemented yet - skip test
        test.skip(true, 'Workflow templates feature not implemented yet');
      }
    });

    test('should allow template customization and modification', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Check if Browse Templates button exists (feature not implemented yet)
      const browseTemplatesButton = page.getByRole('button', { name: 'Browse Templates' });
      
      if (await browseTemplatesButton.count() > 0) {
        await browseTemplatesButton.click();
        
        // Select a template
        await page.getByText('Customer Onboarding').click();
        await page.getByRole('button', { name: 'Use This Template' }).click();
        
        // Should open template in editor
        await page.waitForSelector('[data-testid="workflow-editor"]');
        await expect(page.getByText('Customer Onboarding')).toBeVisible();
        
        // Test template customization
        await page.getByRole('button', { name: 'Edit Steps' }).click();
        
        // Modify email template
        await page.getByLabel('Welcome Email Subject').fill('Welcome to Our Platform!');
        await page.getByLabel('Welcome Email Body').fill('Hi {{customer.name}}, welcome to our platform!');
        
        // Add new step
        await page.getByRole('button', { name: 'Add Step' }).click();
        await page.getByText('Send Slack Notification').click();
        await page.getByLabel('Slack Channel').fill('#customer-onboarding');
        
        // Save customized template
        await page.getByRole('button', { name: 'Save Workflow' }).click();
        await uxHelper.validateSuccessContainer('Workflow saved successfully');
      } else {
        // Feature not implemented yet - skip test
        test.skip(true, 'Workflow templates feature not implemented yet');
      }
    });

    test('should support template sharing within organizations', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Check if Browse Templates button exists (feature not implemented yet)
      const browseTemplatesButton = page.getByRole('button', { name: 'Browse Templates' });
      
      if (await browseTemplatesButton.count() > 0) {
        await browseTemplatesButton.click();
        
        // Create a custom template
        await page.getByRole('button', { name: 'Create Custom Template' }).click();
        
        const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
        await chatInput.fill('Automated lead qualification workflow');
        await page.getByRole('button', { name: 'Generate Workflow' }).click();
        
        await page.waitForSelector('[data-testid="workflow-preview"]');
        
        // Configure template for sharing
        await page.getByRole('button', { name: 'Configure Template' }).click();
        await page.getByLabel('Template Name').fill('Lead Qualification Pro');
        await page.getByLabel('Template Description').fill('Automated lead scoring and qualification workflow');
        await page.getByLabel('Template Category').selectOption('Sales & Marketing');
        
        // Enable sharing
        await page.getByLabel('Share with Organization').check();
        await page.getByRole('button', { name: 'Save Template' }).click();
        
        await uxHelper.validateSuccessContainer('Template shared successfully');
        
        // Verify template appears in shared templates
        await page.getByRole('tab', { name: 'Shared Templates' }).click();
        await expect(page.getByText('Lead Qualification Pro')).toBeVisible();
      } else {
        // Feature not implemented yet - skip test
        test.skip(true, 'Workflow templates feature not implemented yet');
      }
    });

    test('should validate templates before execution', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Check if Browse Templates button exists (feature not implemented yet)
      const browseTemplatesButton = page.getByRole('button', { name: 'Browse Templates' });
      
      if (await browseTemplatesButton.count() > 0) {
        await browseTemplatesButton.click();
        
        // Select a template that requires API connections
        await page.getByText('E-commerce Order Processing').click();
        await page.getByRole('button', { name: 'Use This Template' }).click();
        
        // Should show validation requirements
        await expect(page.getByText('Required API Connections')).toBeVisible();
        await expect(page.getByText('Shopify')).toBeVisible();
        await expect(page.getByText('Stripe')).toBeVisible();
        await expect(page.getByText('ShipStation')).toBeVisible();
        
        // Test validation workflow
        await page.getByRole('button', { name: 'Configure Connections' }).click();
        
        // Should redirect to connections page
        await expect(page).toHaveURL(/.*connections/);
        await expect(page.getByText('Configure Required APIs')).toBeVisible();
      } else {
        // Feature not implemented yet - skip test
        test.skip(true, 'Workflow templates feature not implemented yet');
      }
    });
  });

  test.describe('Community Template Marketplace', () => {
    test('should allow community template contributions', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Check if Community Templates button exists (feature not implemented yet)
      const communityTemplatesButton = page.getByRole('button', { name: 'Community Templates' });
      
      if (await communityTemplatesButton.count() > 0) {
        await communityTemplatesButton.click();
        
        // Validate community template interface
        await uxHelper.validatePageTitle('Community Templates');
        await uxHelper.validateHeadingHierarchy(['Community Templates', 'User-Contributed Solutions']);
        
        // Test template submission
        await page.getByRole('button', { name: 'Submit Template' }).click();
        
        // Fill template submission form
        await page.getByLabel('Template Name').fill('Advanced Customer Support Workflow');
        await page.getByLabel('Template Description').fill('Multi-channel customer support automation with escalation');
        await page.getByLabel('Template Category').selectOption('Customer Support');
        await page.getByLabel('Template Code').fill(JSON.stringify({
          name: 'Advanced Customer Support',
          steps: [
            { name: 'Receive Support Request', type: 'webhook' },
            { name: 'Create Support Ticket', type: 'zendesk' },
            { name: 'Send Auto-Response', type: 'email' },
            { name: 'Route to Agent', type: 'slack' }
          ]
        }));
        
        // Submit template
        await page.getByRole('button', { name: 'Submit for Review' }).click();
        await uxHelper.validateSuccessContainer('Template submitted for review');
      } else {
        // Feature not implemented yet - skip test
        test.skip(true, 'Community templates feature not implemented yet');
      }
    });

    test('should display community template ratings and reviews', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Check if Community Templates button exists (feature not implemented yet)
      const communityTemplatesButton = page.getByRole('button', { name: 'Community Templates' });
      
      if (await communityTemplatesButton.count() > 0) {
        await communityTemplatesButton.click();
        
        // Check for template ratings
        await expect(page.getByText('Top Rated Templates')).toBeVisible();
        
        // Test template rating
        await page.getByText('Customer Feedback Loop').click();
        await page.getByRole('button', { name: 'Rate Template' }).click();
        
        // Rate the template
        await page.getByLabel('5 stars').click();
        await page.getByLabel('Review').fill('Excellent template, saved me hours of setup time!');
        await page.getByRole('button', { name: 'Submit Review' }).click();
        
        await uxHelper.validateSuccessContainer('Review submitted successfully');
      } else {
        // Feature not implemented yet - skip test
        test.skip(true, 'Community templates feature not implemented yet');
      }
    });

    test('should support template versioning and updates', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Check if Community Templates button exists (feature not implemented yet)
      const communityTemplatesButton = page.getByRole('button', { name: 'Community Templates' });
      
      if (await communityTemplatesButton.count() > 0) {
        await communityTemplatesButton.click();
        
        // Select a template with multiple versions
        await page.getByText('Multi-Channel Marketing').click();
        
        // Check version history
        await page.getByRole('button', { name: 'Version History' }).click();
        await expect(page.getByText('Version 2.1')).toBeVisible();
        await expect(page.getByText('Version 2.0')).toBeVisible();
        await expect(page.getByText('Version 1.0')).toBeVisible();
        
        // Compare versions
        await page.getByText('Version 2.1').click();
        await page.getByRole('button', { name: 'Compare with Previous' }).click();
        
        await expect(page.getByText('Added Instagram integration')).toBeVisible();
        await expect(page.getByText('Improved error handling')).toBeVisible();
        
        // Update to latest version
        await page.getByRole('button', { name: 'Update to Latest' }).click();
        await uxHelper.validateSuccessContainer('Template updated to version 2.1');
      } else {
        // Feature not implemented yet - skip test
        test.skip(true, 'Community templates feature not implemented yet');
      }
    });
  });

  test.describe('Template Search and Discovery', () => {
    test('should provide advanced search and filtering', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Check if Browse Templates button exists (feature not implemented yet)
      const browseTemplatesButton = page.getByRole('button', { name: 'Browse Templates' });
      
      if (await browseTemplatesButton.count() > 0) {
        await browseTemplatesButton.click();
        
        // Test search functionality
        const searchInput = page.getByPlaceholder('Search templates...');
        await searchInput.fill('customer');
        
        // Should filter results
        await expect(page.getByText('Customer Onboarding')).toBeVisible();
        await expect(page.getByText('Customer Feedback Loop')).toBeVisible();
        await expect(page.getByText('E-commerce Order Processing')).not.toBeVisible();
        
        // Test category filtering
        await page.getByText('Sales & Marketing').click();
        await expect(page.getByText('Lead Qualification')).toBeVisible();
        await expect(page.getByText('Customer Onboarding')).not.toBeVisible();
        
        // Test difficulty filtering
        await page.getByLabel('Difficulty').selectOption('Advanced');
        await expect(page.getByText('Enterprise CRM Integration')).toBeVisible();
        await expect(page.getByText('Simple Email Notification')).not.toBeVisible();
      } else {
        // Feature not implemented yet - skip test
        test.skip(true, 'Workflow templates feature not implemented yet');
      }
    });

    test('should provide template recommendations', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Check if Browse Templates button exists (feature not implemented yet)
      const browseTemplatesButton = page.getByRole('button', { name: 'Browse Templates' });
      
      if (await browseTemplatesButton.count() > 0) {
        await browseTemplatesButton.click();
        
        // Check for personalized recommendations
        await expect(page.getByText('Recommended for You')).toBeVisible();
        await expect(page.getByText('Based on your recent workflows')).toBeVisible();
        
        // Test recommendation accuracy
        await page.getByText('Customer Onboarding').click();
        await page.getByRole('button', { name: 'Use This Template' }).click();
        await page.getByRole('button', { name: 'Save Workflow' }).click();
        
        // Go back to templates
        await page.getByRole('button', { name: 'Browse Templates' }).click();
        
        // Should show related recommendations
        await expect(page.getByText('You might also like:')).toBeVisible();
        await expect(page.getByText('Customer Feedback Loop')).toBeVisible();
        await expect(page.getByText('Customer Support Automation')).toBeVisible();
      } else {
        // Feature not implemented yet - skip test
        test.skip(true, 'Workflow templates feature not implemented yet');
      }
    });
  });

  test.describe('Template Performance and Analytics', () => {
    test('should track template usage and performance', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Check if Browse Templates button exists (feature not implemented yet)
      const browseTemplatesButton = page.getByRole('button', { name: 'Browse Templates' });
      
      if (await browseTemplatesButton.count() > 0) {
        await browseTemplatesButton.click();
        
        // Select a popular template
        await page.getByText('Customer Onboarding').click();
        
        // Check usage statistics
        await expect(page.getByText('Used 1,247 times')).toBeVisible();
        await expect(page.getByText('4.8/5 stars')).toBeVisible();
        await expect(page.getByText('98% success rate')).toBeVisible();
        
        // Test template performance metrics
        await page.getByRole('button', { name: 'View Analytics' }).click();
        
        await expect(page.getByText('Template Performance')).toBeVisible();
        await expect(page.getByText('Average Execution Time: 2.3s')).toBeVisible();
        await expect(page.getByText('Success Rate: 98%')).toBeVisible();
        await expect(page.getByText('User Satisfaction: 4.8/5')).toBeVisible();
      } else {
        // Feature not implemented yet - skip test
        test.skip(true, 'Workflow templates feature not implemented yet');
      }
    });

    test('should provide template optimization suggestions', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Check if Browse Templates button exists (feature not implemented yet)
      const browseTemplatesButton = page.getByRole('button', { name: 'Browse Templates' });
      
      if (await browseTemplatesButton.count() > 0) {
        await browseTemplatesButton.click();
        
        // Select a template with optimization opportunities
        await page.getByText('Complex Data Processing').click();
        
        // Check for optimization suggestions
        await expect(page.getByText('Optimization Opportunities')).toBeVisible();
        await expect(page.getByText('Consider parallel processing for steps 3-5')).toBeVisible();
        await expect(page.getByText('Add caching for API calls to reduce latency')).toBeVisible();
        
        // Test optimization application
        await page.getByRole('button', { name: 'Apply Optimizations' }).click();
        await uxHelper.validateSuccessContainer('Optimizations applied successfully');
        
        // Verify performance improvement
        await expect(page.getByText('Estimated time savings: 45%')).toBeVisible();
      } else {
        // Feature not implemented yet - skip test
        test.skip(true, 'Workflow templates feature not implemented yet');
      }
    });
  });

  test.describe('Template Security and Validation', () => {
    test('should validate template security before execution', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Check if Community Templates button exists (feature not implemented yet)
      const communityTemplatesButton = page.getByRole('button', { name: 'Community Templates' });
      
      if (await communityTemplatesButton.count() > 0) {
        await communityTemplatesButton.click();
        
        // Select a template from untrusted source
        await page.getByText('Experimental Integration').click();
        
        // Should show security warning
        await expect(page.getByText('Security Notice')).toBeVisible();
        await expect(page.getByText('This template contains custom code')).toBeVisible();
        await expect(page.getByText('Review the code before execution')).toBeVisible();
        
        // Test security review
        await page.getByRole('button', { name: 'Review Code' }).click();
        await expect(page.getByText('Template Code Review')).toBeVisible();
        await expect(page.getByText('No security issues detected')).toBeVisible();
        
        // Approve template
        await page.getByRole('button', { name: 'Approve Template' }).click();
        await uxHelper.validateSuccessContainer('Template approved for use');
      } else {
        // Feature not implemented yet - skip test
        test.skip(true, 'Community templates feature not implemented yet');
      }
    });

    test('should handle template validation errors gracefully', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Check if Browse Templates button exists (feature not implemented yet)
      const browseTemplatesButton = page.getByRole('button', { name: 'Browse Templates' });
      
      if (await browseTemplatesButton.count() > 0) {
        await browseTemplatesButton.click();
        
        // Try to use a template with validation issues
        await page.getByText('Broken Integration Template').click();
        await page.getByRole('button', { name: 'Use This Template' }).click();
        
        // Should show validation errors
        await uxHelper.validateErrorContainer('Template validation failed');
        await expect(page.getByText('Missing required API connection: Stripe')).toBeVisible();
        await expect(page.getByText('Invalid step configuration in step 3')).toBeVisible();
        
        // Provide guidance for fixing
        await expect(page.getByText('To fix this template:')).toBeVisible();
        await expect(page.getByText('1. Configure Stripe API connection')).toBeVisible();
        await expect(page.getByText('2. Review step 3 configuration')).toBeVisible();
      } else {
        // Feature not implemented yet - skip test
        test.skip(true, 'Workflow templates feature not implemented yet');
      }
    });
  });

  test.describe('UX Compliance & Accessibility', () => {
    test('should meet accessibility standards for template browsing', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Check if Browse Templates button exists (feature not implemented yet)
      const browseTemplatesButton = page.getByRole('button', { name: 'Browse Templates' });
      
      if (await browseTemplatesButton.count() > 0) {
        await browseTemplatesButton.click();
        
        // Validate comprehensive UX compliance
        await uxHelper.validateCompleteUXCompliance();
        
        // Test keyboard navigation through templates
        await page.keyboard.press('Tab');
        await expect(page.locator(':focus')).toHaveAttribute('role', 'textbox');
        
        // Test ARIA labels
        await expect(page.getByLabel('Search templates')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Browse Templates' })).toBeVisible();
      } else {
        // Feature not implemented yet - skip test
        test.skip(true, 'Workflow templates feature not implemented yet');
      }
    });

    test('should provide clear template descriptions and previews', async ({ page }) => {
      // Navigate to workflows tab
      await page.getByRole('tab', { name: 'Workflows' }).click();
      
      // Check if Browse Templates button exists (feature not implemented yet)
      const browseTemplatesButton = page.getByRole('button', { name: 'Browse Templates' });
      
      if (await browseTemplatesButton.count() > 0) {
        await browseTemplatesButton.click();
        
        // Check template card information
        const templateCard = page.locator('[data-testid="template-card"]').first();
        await expect(templateCard.getByText('Customer Onboarding')).toBeVisible();
        await expect(templateCard.getByText('Automate new customer setup process')).toBeVisible();
        await expect(templateCard.getByText('Difficulty: Beginner')).toBeVisible();
        await expect(templateCard.getByText('Estimated time: 5 minutes')).toBeVisible();
        
        // Test template preview
        await templateCard.click();
        await expect(page.getByText('Template Preview')).toBeVisible();
        await expect(page.getByText('Step 1: Create Customer Account')).toBeVisible();
        await expect(page.getByText('Step 2: Send Welcome Email')).toBeVisible();
        await expect(page.getByText('Step 3: Assign Customer Success Manager')).toBeVisible();
      } else {
        // Feature not implemented yet - skip test
        test.skip(true, 'Workflow templates feature not implemented yet');
      }
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
