import { test, expect } from '@playwright/test';
import { UXComplianceHelper } from '../../helpers/uxCompliance';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Onboarding & User Journey E2E Tests - P1 High Priority', () => {
  let uxHelper: UXComplianceHelper;

  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
  });

  test.describe('User Registration & Onboarding Flow', () => {
    test('should complete onboarding in under 10 minutes', async ({ page }) => {
      const startTime = Date.now();
      
      // Start registration
      await page.goto(`${BASE_URL}/signup`);
      
      // Validate UX compliance
      await uxHelper.validatePageTitle('Sign up for APIQ');
      await uxHelper.validateHeadingHierarchy(['Create your account', 'Start automating your workflows']);
      
      // Fill registration form
      await page.getByLabel('Full name').fill('Test User');
      await page.getByLabel('Email address').fill('onboarding-test@example.com');
      await page.getByLabel('Password').fill('SecurePass123!');
      await page.getByRole('button', { name: 'Create account' }).click();
      
      // Wait for email verification
      await page.waitForURL(/.*signup-success/);
      await expect(page.getByText('Check your email')).toBeVisible();
      
      // Simulate email verification (in real test, would check email)
      await page.goto(`${BASE_URL}/verify?token=test-verification-token`);
      await expect(page.getByText('Email verified successfully')).toBeVisible();
      
      // Complete onboarding wizard
      await page.getByRole('button', { name: 'Get Started' }).click();
      
      // Step 1: Welcome
      await expect(page.getByText('Welcome to APIQ')).toBeVisible();
      await expect(page.getByText('Let\'s set up your first workflow')).toBeVisible();
      await page.getByRole('button', { name: 'Next' }).click();
      
      // Step 2: Choose use case
      await expect(page.getByText('What would you like to automate?')).toBeVisible();
      await page.getByText('Customer Management').click();
      await page.getByRole('button', { name: 'Next' }).click();
      
      // Step 3: Connect first API
      await expect(page.getByText('Connect your first API')).toBeVisible();
      await page.getByText('Slack').click();
      await page.getByRole('button', { name: 'Connect Slack' }).click();
      
      // Step 4: Create first workflow
      await expect(page.getByText('Create your first workflow')).toBeVisible();
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send Slack notification when new customer signs up');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]');
      await page.getByRole('button', { name: 'Save Workflow' }).click();
      
      // Step 5: Success
      await expect(page.getByText('Congratulations!')).toBeVisible();
      await expect(page.getByText('Your first workflow is ready')).toBeVisible();
      await page.getByRole('button', { name: 'Go to Dashboard' }).click();
      
      // Verify onboarding completion
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.getByText('Welcome back, Test User')).toBeVisible();
      
      const endTime = Date.now();
      const onboardingTime = (endTime - startTime) / 1000; // Convert to seconds
      
      // Should complete in under 10 minutes (600 seconds)
      expect(onboardingTime).toBeLessThan(600);
    });

    test('should provide guided tour of key features', async ({ page }) => {
      // Register and login
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel('Full name').fill('Tour User');
      await page.getByLabel('Email address').fill('tour-test@example.com');
      await page.getByLabel('Password').fill('SecurePass123!');
      await page.getByRole('button', { name: 'Create account' }).click();
      
      // Complete verification and onboarding
      await page.goto(`${BASE_URL}/verify?token=test-verification-token`);
      await page.getByRole('button', { name: 'Get Started' }).click();
      
      // Skip to dashboard
      await page.getByRole('button', { name: 'Skip Tutorial' }).click();
      await page.getByRole('button', { name: 'Go to Dashboard' }).click();
      
      // Start guided tour
      await page.getByRole('button', { name: 'Take Tour' }).click();
      
      // Tour step 1: Dashboard overview
      await expect(page.getByText('Welcome to your Dashboard')).toBeVisible();
      await expect(page.getByText('Here you can manage all your workflows and connections')).toBeVisible();
      await page.getByRole('button', { name: 'Next' }).click();
      
      // Tour step 2: Workflows tab
      await expect(page.getByText('Workflows Tab')).toBeVisible();
      await expect(page.getByText('Create and manage your automated workflows')).toBeVisible();
      await page.getByRole('button', { name: 'Next' }).click();
      
      // Tour step 3: Connections tab
      await expect(page.getByText('Connections Tab')).toBeVisible();
      await expect(page.getByText('Connect your favorite apps and services')).toBeVisible();
      await page.getByRole('button', { name: 'Next' }).click();
      
      // Tour step 4: Natural language creation
      await expect(page.getByText('Natural Language Creation')).toBeVisible();
      await expect(page.getByText('Describe what you want to automate in plain English')).toBeVisible();
      await page.getByRole('button', { name: 'Finish Tour' }).click();
      
      // Verify tour completion
      await expect(page.getByText('Tour completed!')).toBeVisible();
      await expect(page.getByText('You\'re ready to start automating')).toBeVisible();
    });

    test('should provide sample workflows for demonstration', async ({ page }) => {
      // Register and complete onboarding
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel('Full name').fill('Sample User');
      await page.getByLabel('Email address').fill('sample-test@example.com');
      await page.getByLabel('Password').fill('SecurePass123!');
      await page.getByRole('button', { name: 'Create account' }).click();
      
      await page.goto(`${BASE_URL}/verify?token=test-verification-token`);
      await page.getByRole('button', { name: 'Get Started' }).click();
      
      // Check for sample workflows
      await expect(page.getByText('Try these sample workflows:')).toBeVisible();
      
      // Test sample workflow 1: Customer notification
      await page.getByText('Customer Notification Workflow').click();
      await expect(page.getByText('Send welcome email to new customers')).toBeVisible();
      await page.getByRole('button', { name: 'Try This Workflow' }).click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]');
      await expect(page.getByText('Customer Signup')).toBeVisible();
      await expect(page.getByText('Send Welcome Email')).toBeVisible();
      
      // Test sample workflow 2: Lead qualification
      await page.getByRole('button', { name: 'Back to Samples' }).click();
      await page.getByText('Lead Qualification Workflow').click();
      await expect(page.getByText('Automatically qualify and route leads')).toBeVisible();
      await page.getByRole('button', { name: 'Try This Workflow' }).click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]');
      await expect(page.getByText('New Lead Created')).toBeVisible();
      await expect(page.getByText('Score Lead')).toBeVisible();
      await expect(page.getByText('Route to Sales')).toBeVisible();
    });
  });

  test.describe('Quick Start Guide', () => {
    test('should provide step-by-step getting started process', async ({ page }) => {
      // Login as existing user
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel('Email address').fill('e2e-test@example.com');
      await page.getByLabel('Password').fill('e2eTestPass123');
      await page.getByRole('button', { name: 'Sign in' }).click();
      
      await Promise.all([
        page.waitForURL(/.*dashboard/),
        page.waitForSelector('h1:has-text("Dashboard")')
      ]);
      
      // Access quick start guide
      await page.getByRole('button', { name: 'Quick Start Guide' }).click();
      
      // Step 1: Connect your first API
      await expect(page.getByText('Step 1: Connect Your First API')).toBeVisible();
      await expect(page.getByText('Start by connecting one of your favorite apps')).toBeVisible();
      
      await page.getByText('Slack').click();
      await page.getByRole('button', { name: 'Connect Slack' }).click();
      
      // Step 2: Create your first workflow
      await expect(page.getByText('Step 2: Create Your First Workflow')).toBeVisible();
      await expect(page.getByText('Describe what you want to automate')).toBeVisible();
      
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send Slack notification when new order is placed');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]');
      await page.getByRole('button', { name: 'Save Workflow' }).click();
      
      // Step 3: Test your workflow
      await expect(page.getByText('Step 3: Test Your Workflow')).toBeVisible();
      await expect(page.getByText('Make sure everything works as expected')).toBeVisible();
      
      await page.getByRole('button', { name: 'Test Workflow' }).click();
      await expect(page.getByText('Workflow test completed successfully')).toBeVisible();
      
      // Step 4: Monitor and optimize
      await expect(page.getByText('Step 4: Monitor and Optimize')).toBeVisible();
      await expect(page.getByText('Track performance and make improvements')).toBeVisible();
      
      await page.getByRole('button', { name: 'View Analytics' }).click();
      await expect(page.getByText('Workflow Analytics')).toBeVisible();
      
      // Complete quick start
      await page.getByRole('button', { name: 'Complete Quick Start' }).click();
      await uxHelper.validateSuccessContainer('Quick start guide completed!');
    });

    test('should provide helpful tips and best practices', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel('Email address').fill('e2e-test@example.com');
      await page.getByLabel('Password').fill('e2eTestPass123');
      await page.getByRole('button', { name: 'Sign in' }).click();
      
      await Promise.all([
        page.waitForURL(/.*dashboard/),
        page.waitForSelector('h1:has-text("Dashboard")')
      ]);
      
      // Access tips and best practices
      await page.getByRole('button', { name: 'Tips & Best Practices' }).click();
      
      // Check for helpful tips
      await expect(page.getByText('Workflow Design Tips')).toBeVisible();
      await expect(page.getByText('Start simple and add complexity gradually')).toBeVisible();
      await expect(page.getByText('Use descriptive names for your workflows')).toBeVisible();
      await expect(page.getByText('Test workflows before going live')).toBeVisible();
      
      // Check for best practices
      await expect(page.getByText('Best Practices')).toBeVisible();
      await expect(page.getByText('Always include error handling')).toBeVisible();
      await expect(page.getByText('Use rate limiting for API calls')).toBeVisible();
      await expect(page.getByText('Monitor workflow performance regularly')).toBeVisible();
      
      // Test interactive tips
      await page.getByText('How to write effective workflow descriptions').click();
      await expect(page.getByText('Be specific about triggers and actions')).toBeVisible();
      await expect(page.getByText('Include relevant context and conditions')).toBeVisible();
    });
  });

  test.describe('Welcome Flow for First-Time Users', () => {
    test('should provide personalized welcome experience', async ({ page }) => {
      // Register new user
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel('Full name').fill('Welcome User');
      await page.getByLabel('Email address').fill('welcome-test@example.com');
      await page.getByLabel('Password').fill('SecurePass123!');
      await page.getByRole('button', { name: 'Create account' }).click();
      
      await page.goto(`${BASE_URL}/verify?token=test-verification-token`);
      
      // Welcome screen
      await expect(page.getByText('Welcome to APIQ, Welcome User!')).toBeVisible();
      await expect(page.getByText('Let\'s get you started with workflow automation')).toBeVisible();
      
      // Personalization questions
      await expect(page.getByText('What industry are you in?')).toBeVisible();
      await page.getByText('Technology').click();
      
      await expect(page.getByText('What\'s your primary use case?')).toBeVisible();
      await page.getByText('Customer Management').click();
      
      await expect(page.getByText('How experienced are you with automation?')).toBeVisible();
      await page.getByText('Beginner').click();
      
      await page.getByRole('button', { name: 'Continue' }).click();
      
      // Personalized recommendations
      await expect(page.getByText('Recommended for You')).toBeVisible();
      await expect(page.getByText('Based on your preferences')).toBeVisible();
      
      // Should show relevant templates
      await expect(page.getByText('Customer Onboarding Workflow')).toBeVisible();
      await expect(page.getByText('Support Ticket Automation')).toBeVisible();
    });

    test('should track onboarding progress and completion', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel('Email address').fill('e2e-test@example.com');
      await page.getByLabel('Password').fill('e2eTestPass123');
      await page.getByRole('button', { name: 'Sign in' }).click();
      
      await Promise.all([
        page.waitForURL(/.*dashboard/),
        page.waitForSelector('h1:has-text("Dashboard")')
      ]);
      
      // Check onboarding progress
      await page.getByRole('button', { name: 'Onboarding Progress' }).click();
      
      await expect(page.getByText('Onboarding Progress')).toBeVisible();
      await expect(page.getByText('Step 1: Account Setup')).toBeVisible();
      await expect(page.getByText('Step 2: First API Connection')).toBeVisible();
      await expect(page.getByText('Step 3: First Workflow')).toBeVisible();
      await expect(page.getByText('Step 4: First Execution')).toBeVisible();
      
      // Check completion status
      await expect(page.getByText('Account Setup: Complete')).toBeVisible();
      await expect(page.getByText('First API Connection: Complete')).toBeVisible();
      await expect(page.getByText('First Workflow: Complete')).toBeVisible();
      await expect(page.getByText('First Execution: Pending')).toBeVisible();
      
      // Complete remaining step
      await page.getByRole('button', { name: 'Complete First Execution' }).click();
      await page.getByRole('button', { name: 'Run Test Workflow' }).click();
      
      await expect(page.getByText('First Execution: Complete')).toBeVisible();
      await expect(page.getByText('Onboarding Complete!')).toBeVisible();
    });
  });

  test.describe('Success Metrics and Progress Tracking', () => {
    test('should track time to first successful workflow', async ({ page }) => {
      const startTime = Date.now();
      
      // Register and complete first workflow
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel('Full name').fill('Metrics User');
      await page.getByLabel('Email address').fill('metrics-test@example.com');
      await page.getByLabel('Password').fill('SecurePass123!');
      await page.getByRole('button', { name: 'Create account' }).click();
      
      await page.goto(`${BASE_URL}/verify?token=test-verification-token`);
      await page.getByRole('button', { name: 'Get Started' }).click();
      
      // Create first workflow
      const chatInput = page.getByPlaceholder('Describe your workflow in natural language...');
      await chatInput.fill('Send email notification for new signups');
      await page.getByRole('button', { name: 'Generate Workflow' }).click();
      
      await page.waitForSelector('[data-testid="workflow-preview"]');
      await page.getByRole('button', { name: 'Save Workflow' }).click();
      
      // Execute first workflow
      await page.getByRole('button', { name: 'Run Workflow' }).click();
      await expect(page.getByText('Workflow executed successfully')).toBeVisible();
      
      const endTime = Date.now();
      const timeToFirstWorkflow = (endTime - startTime) / 1000; // Convert to seconds
      
      // Should complete in under 10 minutes (600 seconds)
      expect(timeToFirstWorkflow).toBeLessThan(600);
      
      // Check success metrics
      await page.getByRole('button', { name: 'View Success Metrics' }).click();
      await expect(page.getByText('Time to First Workflow: 3.2 minutes')).toBeVisible();
      await expect(page.getByText('Onboarding Completion Rate: 100%')).toBeVisible();
    });

    test('should provide onboarding completion incentives', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel('Email address').fill('e2e-test@example.com');
      await page.getByLabel('Password').fill('e2eTestPass123');
      await page.getByRole('button', { name: 'Sign in' }).click();
      
      await Promise.all([
        page.waitForURL(/.*dashboard/),
        page.waitForSelector('h1:has-text("Dashboard")')
      ]);
      
      // Check for completion incentives
      await expect(page.getByText('Complete onboarding to unlock premium features')).toBeVisible();
      await expect(page.getByText('Free 30-day trial of Pro features')).toBeVisible();
      
      // Complete onboarding to unlock incentives
      await page.getByRole('button', { name: 'Complete Onboarding' }).click();
      
      // Should show unlocked features
      await expect(page.getByText('Congratulations!')).toBeVisible();
      await expect(page.getByText('You\'ve unlocked premium features')).toBeVisible();
      await expect(page.getByText('Advanced workflow templates')).toBeVisible();
      await expect(page.getByText('Priority support')).toBeVisible();
      await expect(page.getByText('Advanced analytics')).toBeVisible();
    });
  });

  test.describe('Error Recovery and Support', () => {
    test('should provide helpful error recovery during onboarding', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel('Full name').fill('Error User');
      await page.getByLabel('Email address').fill('error-test@example.com');
      await page.getByLabel('Password').fill('SecurePass123!');
      await page.getByRole('button', { name: 'Create account' }).click();
      
      await page.goto(`${BASE_URL}/verify?token=test-verification-token`);
      await page.getByRole('button', { name: 'Get Started' }).click();
      
      // Simulate API connection error
      await page.getByText('Slack').click();
      await page.getByRole('button', { name: 'Connect Slack' }).click();
      
      // Mock connection failure
      await page.route('**/api/connections', route => {
        route.fulfill({ status: 500, body: 'Connection failed' });
      });
      
      // Should show helpful error message
      await uxHelper.validateErrorContainer('Failed to connect to Slack');
      await expect(page.getByText('Don\'t worry, you can try again or skip this step')).toBeVisible();
      
      // Provide recovery options
      await expect(page.getByText('Try Again')).toBeVisible();
      await expect(page.getByText('Skip for Now')).toBeVisible();
      await expect(page.getByText('Get Help')).toBeVisible();
      
      // Test help option
      await page.getByRole('button', { name: 'Get Help' }).click();
      await expect(page.getByText('Common Solutions')).toBeVisible();
      await expect(page.getByText('Check your internet connection')).toBeVisible();
      await expect(page.getByText('Verify your Slack credentials')).toBeVisible();
    });

    test('should provide contextual help and support', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.getByLabel('Email address').fill('e2e-test@example.com');
      await page.getByLabel('Password').fill('e2eTestPass123');
      await page.getByRole('button', { name: 'Sign in' }).click();
      
      await Promise.all([
        page.waitForURL(/.*dashboard/),
        page.waitForSelector('h1:has-text("Dashboard")')
      ]);
      
      // Access help and support
      await page.getByRole('button', { name: 'Help & Support' }).click();
      
      // Check help resources
      await expect(page.getByText('Help Resources')).toBeVisible();
      await expect(page.getByText('Getting Started Guide')).toBeVisible();
      await expect(page.getByText('Video Tutorials')).toBeVisible();
      await expect(page.getByText('FAQ')).toBeVisible();
      await expect(page.getByText('Contact Support')).toBeVisible();
      
      // Test contextual help
      await page.getByText('Getting Started Guide').click();
      await expect(page.getByText('Step-by-Step Guide')).toBeVisible();
      await expect(page.getByText('1. Create your account')).toBeVisible();
      await expect(page.getByText('2. Connect your first API')).toBeVisible();
      await expect(page.getByText('3. Create your first workflow')).toBeVisible();
    });
  });

  test.describe('UX Compliance & Accessibility', () => {
    test('should meet accessibility standards for onboarding', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      
      // Validate accessibility
      await uxHelper.validateCompleteUXCompliance();
      
      // Test keyboard navigation through onboarding
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('role', 'textbox');
      
      // Test ARIA labels
      await expect(page.getByLabel('Full name')).toBeVisible();
      await expect(page.getByLabel('Email address')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
    });

    test('should provide clear progress indicators and feedback', async ({ page }) => {
      await page.goto(`${BASE_URL}/signup`);
      await page.getByLabel('Full name').fill('Progress User');
      await page.getByLabel('Email address').fill('progress-test@example.com');
      await page.getByLabel('Password').fill('SecurePass123!');
      await page.getByRole('button', { name: 'Create account' }).click();
      
      await page.goto(`${BASE_URL}/verify?token=test-verification-token`);
      await page.getByRole('button', { name: 'Get Started' }).click();
      
      // Check progress indicator
      await expect(page.getByText('Step 1 of 4')).toBeVisible();
      await expect(page.getByText('Account Setup')).toBeVisible();
      
      // Progress through steps
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(page.getByText('Step 2 of 4')).toBeVisible();
      await expect(page.getByText('API Connection')).toBeVisible();
      
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(page.getByText('Step 3 of 4')).toBeVisible();
      await expect(page.getByText('Workflow Creation')).toBeVisible();
      
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(page.getByText('Step 4 of 4')).toBeVisible();
      await expect(page.getByText('Completion')).toBeVisible();
    });
  });
}); 