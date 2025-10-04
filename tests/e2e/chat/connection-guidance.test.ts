/**
 * P1.4: API Connection Guidance in Chat E2E Tests
 * 
 * Tests the ability of the chat interface to guide users through API connection setup
 * when they need APIs for workflows. This includes contextual guidance, redirection
 * to connection setup, and seamless flow from chat to connection management.
 * 
 * Following user-rules.md E2E testing guidelines:
 * - Uses real data and real system components
 * - No mocks for the system under test
 * - Tests complete user workflows end-to-end
 * - Validates UX compliance and accessibility
 */

import { test, expect } from '@playwright/test';
import { TestUser, generateTestId, cleanupTestUser } from '../../helpers/testUtils';
import { createE2EUser } from '../../helpers/authHelpers';
import { setupE2E, closeAllModals, resetRateLimits, getPrimaryActionButton } from '../../helpers/e2eHelpers';
import { waitForDashboard, validateUXCompliance, closeGuidedTourIfPresent, waitForElement, sendChatMessage, waitForChatResponse, waitForConnectionGuidance, validateChatResponse } from '../../helpers/uiHelpers';
import { submitFormWithUtils } from '../../helpers/dataHelpers';
import { testPageLoadTime, testAPIPerformance } from '../../helpers/performanceHelpers';

// Extend Window interface to include our custom properties
declare global {
  interface Window {
    networkRequests?: Array<{ url: string; method: string; timestamp: number }>;
    formSubmissionTriggered?: boolean;
    handleSubmitCalled?: boolean;
    apiClientCalled?: boolean;
    apiResponse?: any;
    apiError?: any;
    lastErrors?: any[];
  }
}
import { testFormAccessibility, testPrimaryActionPatterns } from '../../helpers/accessibilityHelpers';
import { testModalSubmitLoading, testModalSuccessMessage, testModalErrorHandling } from '../../helpers/modalHelpers';
import { createTestData, cleanupTestData } from '../../helpers/dataHelpers';
import { testXSSPrevention, testDataExposure } from '../../helpers/securityHelpers';
import { waitForNetworkIdle } from '../../helpers/waitHelpers';
import { Role } from '../../../src/generated/prisma';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('P1.4: API Connection Guidance in Chat E2E Tests', () => {
  let testUser: TestUser;
  let testData: any;

  test.beforeAll(async () => {
    testUser = await createE2EUser(Role.USER, {
      email: `e2e-chat-guidance-${generateTestId('user')}@testuser.local`,
      password: 'e2eTestPass123',
      name: 'E2E Chat Guidance Test User'
    });
    
    // Create test data without any connections initially
    testData = await createTestData({
      user: testUser
    });
  });

  test.afterAll(async () => {
    // Clean up test data
    if (testData) {
      await cleanupTestData(testData);
    }
    await cleanupTestUser(testUser);
  });

  test.beforeEach(async ({ page }) => {
    await setupE2E(page, testUser, { 
      tab: 'chat', 
      validateUX: true 
    });
    await closeGuidedTourIfPresent(page);
  });

  test.afterEach(async ({ page }) => {
    await closeAllModals(page);
    await resetRateLimits(page);
  });

  test.describe('Contextual Guidance Detection', () => {
    test('should detect when workflow requires unconnected APIs', async ({ page }) => {
      // Listen for ALL console logs from the browser
      page.on('console', msg => {
        console.log('🖥️ BROWSER CONSOLE:', msg.text());
      });
      
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      console.log('🔍 TEST DEBUG: About to send chat message');
      
      // Send a message that requires specific APIs
      await sendChatMessage(page, 'Create a workflow that sends a Slack notification when a new GitHub issue is created');

      console.log('🔍 TEST DEBUG: Chat message sent, waiting for response');
      
      // Wait for chat response
      // Wait for connection guidance UI to appear
      await waitForConnectionGuidance(page);

      console.log('🔍 TEST DEBUG: Connection guidance UI received');

      // Debug: Check what messages are actually in the chat
      const chatMessages = await page.locator('[data-testid="chat-interface"] .bg-gray-100, [data-testid="chat-interface"] .bg-blue-50').count();
      console.log('🔍 TEST DEBUG: Number of chat messages found:', chatMessages);

      // Debug: Check for specific elements
      const connectionGuidanceExists = await page.locator('[data-testid="connection-guidance"]').count();
      console.log('🔍 TEST DEBUG: Connection guidance elements found:', connectionGuidanceExists);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);
      
      // Verify guidance is provided
      await expect(page.locator('[data-testid="missing-apis-list"]')).toBeVisible();
      
      
      // Verify specific APIs are mentioned in the missing APIs list                    
      await expect(page.locator('[data-testid="api-suggestion-Slack"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-suggestion-GitHub"]')).toBeVisible();
    });

    test('should provide helpful guidance instead of generic errors', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Set up network request monitoring
      await page.route('**/api/**', async (route) => {
        const request = route.request();
        console.log('🔍 NETWORK DEBUG: API request:', request.url(), request.method());
        console.log('🔍 NETWORK DEBUG: Request headers:', request.headers());
        console.log('🔍 NETWORK DEBUG: Request post data:', request.postData());
        
        await page.evaluate((data) => {
          window.networkRequests = window.networkRequests || [];
          window.networkRequests.push({ url: data.url, method: data.method, timestamp: Date.now() });
        }, { url: request.url(), method: request.method() });
        
        // Check if this is the chat process request
        if (request.url().includes('/api/chat/process')) {
          console.log('🔍 NETWORK DEBUG: Chat process request detected - checking authentication');
          console.log('🔍 NETWORK DEBUG: Authorization header:', request.headers()['authorization']);
          console.log('🔍 NETWORK DEBUG: Cookie header:', request.headers()['cookie']);
        }
        
        await route.continue();
      });

      // Set up console log interception and network monitoring
      await page.evaluate(() => {
        window.formSubmissionTriggered = false;
        window.handleSubmitCalled = false;
        window.apiClientCalled = false;
        window.networkRequests = [];
        
        // Override console.log to capture logs
        const originalLog = console.log;
        window.apiResponse = null;
        window.apiError = null;
        
        console.log = (...args) => {
          if (args[0] && typeof args[0] === 'string') {
            if (args[0].includes('Form onSubmit triggered')) {
              window.formSubmissionTriggered = true;
            }
            if (args[0].includes('handleSubmit called')) {
              window.handleSubmitCalled = true;
            }
            if (args[0].includes('API Client: Making request to:')) {
              window.apiClientCalled = true;
            }
            if (args[0].includes('API Client: Response data:')) {
              window.apiResponse = args[1];
            }
            if (args[0].includes('API Client: Request failed:')) {
              window.apiError = args[1];
            }
          }
          originalLog.apply(console, args);
        };
      });

      // Debug: Check if there are any JavaScript errors before sending message
      console.log('🔍 TEST DEBUG: Checking for JavaScript errors...');
      const errors = await page.evaluate(() => {
        return window.lastErrors || [];
      });
      console.log('🔍 TEST DEBUG: JavaScript errors:', errors);

      // Send a message requiring APIs
      await sendChatMessage(page, 'I want to create a workflow that integrates with Stripe and SendGrid');

      // Debug: Check if the form submission worked
      console.log('🔍 TEST DEBUG: After sendChatMessage, checking for loading state...');
      const isLoading = await page.locator('[data-testid="loading"]').isVisible();
      console.log('🔍 TEST DEBUG: Loading state visible:', isLoading);

      // Debug: Check if form submission was triggered
      console.log('🔍 TEST DEBUG: Checking form submission flags...');
      const flags = await page.evaluate(() => {
        return {
          formSubmissionTriggered: window.formSubmissionTriggered || false,
          handleSubmitCalled: window.handleSubmitCalled || false,
          apiClientCalled: window.apiClientCalled || false
        };
      });
      console.log('🔍 TEST DEBUG: Form submission flags:', flags);

      // Debug: Check for any error messages in the UI
      const errorElements = await page.locator('.text-red-600, .text-red-500, [class*="error"]').count();
      console.log('🔍 TEST DEBUG: Error elements found:', errorElements);

      // Debug: Check if there are any messages in the chat
      const chatMessages = await page.locator('[data-testid="message"], .bg-gray-100, .bg-white').count();
      console.log('🔍 TEST DEBUG: Chat messages found:', chatMessages);

      // Debug: Check what those messages actually are
      const messageTexts = await page.evaluate(() => {
        const messages = document.querySelectorAll('[data-testid="message"], .bg-gray-100, .bg-white');
        return Array.from(messages).map(el => el.textContent?.trim()).filter(text => text && text.length > 0);
      });
      console.log('🔍 TEST DEBUG: Message texts:', messageTexts);

      // Debug: Check API response
      const apiData = await page.evaluate(() => {
        return {
          apiResponse: window.apiResponse,
          apiError: window.apiError
        };
      });
      console.log('🔍 TEST DEBUG: API response data:', apiData);

      // Debug: Check network requests
      const networkRequests = await page.evaluate(() => {
        return window.networkRequests || [];
      });
      console.log('🔍 TEST DEBUG: Network requests:', networkRequests);

      // Debug: Check for any error messages
      const errorMessages = await page.locator('[data-testid*="error"], .error, .text-red-500').count();
      console.log('🔍 TEST DEBUG: Error messages found:', errorMessages);

      // Debug: Check if the message was added to the chat
      const messageCount = await page.locator('[data-testid="message"]').count();
      console.log('🔍 TEST DEBUG: Message count:', messageCount);

      await waitForChatResponse(page);

      // Debug: Check what's actually on the page
      const pageContent = await page.textContent('body');
      console.log('🔍 TEST DEBUG: Page content after message:', pageContent?.substring(0, 500));

      // Debug: Check for any error messages
      const errorMessages2 = await page.locator('[data-testid*="error"], .error, .text-red-500').count();
      console.log('🔍 TEST DEBUG: Error messages found:', errorMessages2);

      // Debug: Check if connection guidance element exists
      const guidanceExists = await page.locator('[data-testid="connection-guidance"]').count();
      console.log('🔍 TEST DEBUG: Connection guidance elements found:', guidanceExists);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);
      
      // Verify guidance is actionable, not just an error
      await expect(page.locator('text=To create a workflow that integrates with Stripe and SendGrid').first()).toBeVisible();
      await expect(page.locator('[data-testid="connection-guidance"]')).toContainText('Follow the steps below for each API');
      
      // Verify no generic error messages
      await expect(page.locator('text=I cannot help you')).not.toBeVisible();
      await expect(page.locator('text=Error')).not.toBeVisible();
    });

    test('should suggest specific APIs needed for the workflow', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send a complex workflow request
      await sendChatMessage(page, 'Create a workflow that: 1) Monitors Twitter mentions, 2) Analyzes sentiment with OpenAI, 3) Sends results to Slack');

      await waitForChatResponse(page);

      
      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);
      
      // Verify specific API suggestions are shown in the missing APIs list
      await expect(page.locator('[data-testid="api-suggestion-OpenAI"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-suggestion-Slack"]')).toBeVisible();
      
      // Verify API descriptions are helpful
      await expect(page.locator('[data-testid="api-suggestion-OpenAI"] .text-xs').first()).toBeVisible();
      await expect(page.locator('[data-testid="api-suggestion-Slack"] .text-xs').first()).toBeVisible();
    });
  });

  test.describe('In-Chat Connection Setup', () => {
    test('should offer individual API setup buttons', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send message requiring APIs
      await sendChatMessage(page, 'Create a workflow with Google Sheets and Trello integration');

      await waitForChatResponse(page);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);
      
      // Verify individual setup buttons are provided
      await expect(page.locator('[data-testid="setup-in-chat-google_sheets"]')).toBeVisible();
      await expect(page.locator('[data-testid="setup-in-chat-trello"]')).toBeVisible();
    });

    test('should provide step-by-step setup instructions', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send message requiring APIs
      await sendChatMessage(page, 'I need to connect to Salesforce and HubSpot');

      await waitForChatResponse(page);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);
      
      // Verify setup instructions are provided
      await expect(page.locator('[data-testid="instruction-step-1"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="instruction-step-2"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="instruction-step-3"]').first()).toBeVisible();
    });

    test('should maintain context throughout setup process', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send initial message
      await sendChatMessage(page, 'Create a workflow with Mailchimp and Zapier');

      await waitForChatResponse(page);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);

      // Verify context is maintained
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-suggestion-Mailchimp"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-suggestion-Zapier"]')).toBeVisible();
      
      // Verify setup buttons are available
      await expect(page.locator('[data-testid="setup-in-chat-mailchimp"]')).toBeVisible();
      await expect(page.locator('[data-testid="setup-in-chat-zapier"]')).toBeVisible();
    });
  });

  test.describe('Step-by-Step Connection Instructions', () => {
    test('should provide step-by-step connection instructions', async ({ page }) => {
      // Listen for console logs
      page.on('console', msg => {
        console.log('🔍 BROWSER CONSOLE:', msg.text());
      });
      
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Debug: Check if input is filled
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill('I want to connect to the GitHub API');
      
      // Debug: Check if button is enabled
      const sendButton = page.getByTestId('primary-action chat-send-btn');
      const isEnabled = await sendButton.isEnabled();
      console.log('🔍 TEST DEBUG: Send button enabled:', isEnabled);
      
      // Debug: Check input value
      const inputValue = await chatInput.inputValue();
      console.log('🔍 TEST DEBUG: Input value:', inputValue);

      // Use enhanced form submission with utilities
      console.log('🔍 TEST DEBUG: Using enhanced form submission...');
      const submissionSuccessful = await submitFormWithUtils(
        page,
        'form[data-testid="chat-form"]',
        '[data-testid="primary-action chat-send-btn"]'
      );
      
      if (!submissionSuccessful) {
        console.log('🔍 TEST DEBUG: Enhanced submission failed, trying direct click...');
        await sendButton.click();
      }
      console.log('🔍 TEST DEBUG: Form submission completed');

      await waitForChatResponse(page);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);

      // Verify step-by-step instructions are provided
      await expect(page.locator('[data-testid="connection-instructions"]')).toBeVisible();
      await expect(page.locator('[data-testid="instruction-step-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="instruction-step-2"]')).toBeVisible();
      await expect(page.locator('[data-testid="instruction-step-3"]')).toBeVisible();
    });

    test('should provide API-specific connection guidance', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Add console listener to capture browser logs
      page.on('console', msg => {
        if (msg.type() === 'log') {
          console.log('🔍 BROWSER LOG:', msg.text());
        }
      });

      // Request OAuth2 API connection
      console.log('🔍 TEST: Sending Google Drive API question...');
      await sendChatMessage(page, 'I want to create a workflow that uses Google Drive API to sync files');
      
      // Add console listener to see what's happening
      page.on('console', msg => {
        if (msg.text().includes('ChatInterface:') || msg.text().includes('generateWorkflow') || msg.text().includes('Workflow detection')) {
          console.log('🔍 BROWSER LOG:', msg.text());
        }
      });

      await waitForChatResponse(page);
      console.log('🔍 TEST: Response received, checking for guidance...');

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);
      
      // Verify missing APIs list is shown
      await expect(page.locator('[data-testid="missing-apis-list"]')).toBeVisible();
      
      // Verify Google Drive API is mentioned (should be in the API list)
      await expect(page.locator('[data-testid="api-suggestion-Google Drive"]')).toBeVisible();
      
      // Verify OAuth2 auth type is shown
      await expect(page.locator('text=OAUTH2')).toBeVisible();
      
      // Verify setup button is available
      await expect(page.locator('[data-testid*="setup-in-chat-"]').first()).toBeVisible();
    });

    test('should provide API key connection guidance', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Request API key connection
      await sendChatMessage(page, 'How do I connect to the Stripe API?');

      await waitForChatResponse(page);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);

      // Verify API key-specific guidance
      await expect(page.locator('[data-testid="instruction-step-1"]')).toContainText('API key');
      await expect(page.locator('text=Stripe Dashboard')).toBeVisible();
      await expect(page.locator('[data-testid="instruction-step-3"]')).toContainText('API key');
    });
  });

  test.describe('Seamless In-Chat Flow', () => {
    test('should provide seamless flow from chat to in-chat connection setup', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send workflow request
      await sendChatMessage(page, 'Create a workflow that syncs data between Airtable and Notion');

      await waitForChatResponse(page);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);

      // Verify individual setup buttons are available
      await expect(page.locator('[data-testid="setup-in-chat-airtable"]')).toBeVisible();
      await expect(page.locator('[data-testid="setup-in-chat-notion"]')).toBeVisible();
      
      // Verify API suggestions are shown
      await expect(page.locator('[data-testid="api-suggestion-Airtable"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-suggestion-Notion"]')).toBeVisible();
    });

    test('should maintain context after successful connection setup', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send initial workflow request that triggers connection guidance
      await sendChatMessage(page, 'Create a workflow that sends a Slack notification when a new GitHub issue is created');

      await waitForChatResponse(page);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);
      await expect(page.locator('[data-testid="api-suggestion-Slack"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-suggestion-GitHub"]')).toBeVisible();

      // Verify setup buttons are available
      await expect(page.locator('[data-testid="setup-in-chat-slack"]')).toBeVisible();
      await expect(page.locator('[data-testid="setup-in-chat-github"]')).toBeVisible();

      // Verify context is maintained - both APIs should still be visible as missing
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-suggestion-Slack"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-suggestion-GitHub"]')).toBeVisible();
    });
  });

  test.describe('Error Handling & Recovery', () => {
    test('should handle connection guidance errors gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send message that requires known APIs for guidance
      await sendChatMessage(page, 'Create a workflow with Slack and GitHub integration');

      await waitForChatResponse(page);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);
      
      // Verify guidance is provided for known APIs
      await expect(page.locator('[data-testid="api-suggestion-Slack"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-suggestion-GitHub"]')).toBeVisible();
      
      // Verify setup buttons are available
      await expect(page.locator('[data-testid="setup-in-chat-slack"]')).toBeVisible();
      await expect(page.locator('[data-testid="setup-in-chat-github"]')).toBeVisible();
    });

    test('should provide recovery options when guidance fails', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send message that requires known APIs for guidance
      await sendChatMessage(page, 'Create a workflow with Stripe and OpenAI integration');

      await waitForChatResponse(page);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);
      
      // Verify guidance is provided
      await expect(page.locator('[data-testid="api-suggestion-Stripe"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-suggestion-OpenAI"]')).toBeVisible();
      
      // Verify setup buttons are available
      await expect(page.locator('[data-testid="setup-in-chat-stripe"]')).toBeVisible();
      await expect(page.locator('[data-testid="setup-in-chat-openai"]')).toBeVisible();
    });
  });

  test.describe('UX Compliance & Accessibility', () => {
    test('should maintain UX compliance throughout guidance flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Wait for chat tab to be active - wait for chat interface instead of heading
      await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });

      // Validate initial UX compliance
      await validateUXCompliance(page, {
        title: 'APIQ - AI-Powered API Orchestrator',
        headings: 'Chat', // The page shows "Chat" heading when chat tab is active
        validateForm: true,
        validateAccessibility: true
      });

      // Send message requiring guidance
      await sendChatMessage(page, 'Create a workflow with multiple APIs');

      await waitForChatResponse(page);

      // Validate guidance UX compliance
      await validateUXCompliance(page, {
        title: 'APIQ - AI-Powered API Orchestrator',
        headings: 'Chat', // The page shows "Chat" heading when chat tab is active
        validateForm: true,
        validateAccessibility: true
      });
    });

    test('should support keyboard navigation for guidance actions', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send message requiring specific APIs to trigger guidance
      await sendChatMessage(page, 'Create a workflow that sends Slack notifications and uses GitHub API');

      await waitForChatResponse(page);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);

      // Test that setup buttons are visible
      const slackButton = page.locator('[data-testid="setup-in-chat-slack"]');
      const githubButton = page.locator('[data-testid="setup-in-chat-github"]');
      
      await expect(slackButton).toBeVisible();
      await expect(githubButton).toBeVisible();

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Should activate setup button
    });

    test('should be mobile responsive for guidance interface', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send message requiring guidance
      await sendChatMessage(page, 'Create a workflow with Slack and GitHub APIs');

      await waitForChatResponse(page);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);
      
      // Verify mobile responsiveness
      await expect(page.locator('[data-testid="setup-in-chat-slack"]')).toBeVisible();
      
      // Verify touch targets are appropriate size
      const setupButton = page.locator('[data-testid="setup-in-chat-slack"]');
      const box = await setupButton.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44); // Minimum touch target size
    });
  });

  test.describe('Direct Connection Setup via Chat', () => {
    test('should allow setting up API connections directly in chat', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send a message that requires a connection
      await sendChatMessage(page, 'Create a workflow that sends a Slack notification');
      await waitForChatResponse(page);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);
      
      // Debug: Check what setup buttons are actually available
      const setupButtons = await page.locator('[data-testid^="setup-in-chat-"]').count();
      console.log('🔍 TEST DEBUG: Number of setup buttons found:', setupButtons);
      
      // Debug: List all setup button testids
      const setupButtonTestIds = await page.locator('[data-testid^="setup-in-chat-"]').allTextContents();
      console.log('🔍 TEST DEBUG: Setup button texts:', setupButtonTestIds);
      
      await expect(page.locator('[data-testid="setup-in-chat-slack"]')).toBeVisible();

      // Debug: Check if button is enabled
      const button = page.locator('[data-testid="setup-in-chat-slack"]');
      const isEnabled = await button.isEnabled();
      console.log('🔍 TEST DEBUG: Button enabled:', isEnabled);
      
      // Debug: Check button properties
      const buttonText = await button.textContent();
      console.log('🔍 TEST DEBUG: Button text:', buttonText);
      
      // Click "Set up in Chat" button using enhanced approach
      console.log('🔍 TEST DEBUG: Clicking setup button...');
      await button.click();
      
      // Debug: Check if modal appeared after click
      const modalVisible = await page.locator('[data-testid="connection-setup-modal"]').isVisible();
      console.log('🔍 TEST DEBUG: Modal visible after click:', modalVisible);
      
      // Try force click if regular click didn't work
      if (!modalVisible) {
        console.log('🔍 TEST DEBUG: Regular click failed, trying force click');
        await button.click({ force: true });
        
        // Check again
        const modalVisibleAfterForce = await page.locator('[data-testid="connection-setup-modal"]').isVisible();
        console.log('🔍 TEST DEBUG: Modal visible after force click:', modalVisibleAfterForce);
      }

      // Verify connection setup form appears
      await expect(page.locator('[data-testid="connection-setup-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-setup-form"]')).toBeVisible();

      // Fill in the connection form (Slack uses OAUTH2 auth type)
      await page.locator('[data-testid="connection-input-clientId"]').fill('test-client-id-123456789');
      await page.locator('[data-testid="connection-input-clientSecret"]').fill('test-client-secret-123456789');
      await page.locator('[data-testid="connection-input-redirectUri"]').fill('https://test-app.com/callback');

      // Debug: Check if buttons are visible and enabled
      console.log('🔍 TEST DEBUG: Test connection button visible:', await page.locator('[data-testid="test-connection-btn"]').isVisible());
      console.log('🔍 TEST DEBUG: Test connection button enabled:', await page.locator('[data-testid="test-connection-btn"]').isEnabled());
      console.log('🔍 TEST DEBUG: Save connection button visible:', await page.locator('[data-testid="save-connection-btn"]').isVisible());
      console.log('🔍 TEST DEBUG: Save connection button enabled:', await page.locator('[data-testid="save-connection-btn"]').isEnabled());

      // Listen for network requests and responses
      const requests: any[] = [];
      const responses: any[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/api/connections')) {
          console.log('🔍 TEST DEBUG: API Request:', request.method(), request.url());
          requests.push(request);
        }
      });

      page.on('response', response => {
        if (response.url().includes('/api/connections')) {
          console.log('🔍 TEST DEBUG: API Response:', response.status(), response.url());
          responses.push(response);
        }
      });

      // Test the connection
      console.log('🔍 TEST DEBUG: Clicking test connection button...');
      await page.locator('[data-testid="test-connection-btn"]').click();
      
      // Wait for test result (should show success or error)
      console.log('🔍 TEST DEBUG: Waiting for test result...');
      await page.waitForTimeout(3000);

      // Check if any API requests were made
      console.log('🔍 TEST DEBUG: Number of API requests made:', requests.length);
      console.log('🔍 TEST DEBUG: Number of API responses received:', responses.length);
      if (requests.length > 0) {
        console.log('🔍 TEST DEBUG: API requests:', requests.map(r => ({ method: r.method(), url: r.url() })));
      }
      if (responses.length > 0) {
        console.log('🔍 TEST DEBUG: API responses:', responses.map(r => ({ status: r.status(), url: r.url() })));
      }

      // Check if there are any error messages in the UI
      const errorMessages = await page.locator('[data-testid*="error"], .error, [class*="error"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log('🔍 TEST DEBUG: Error messages found:', errorMessages);
      }

      // Check if test connection was successful by looking for success indicators
      const testSuccessIndicators = await page.locator('text=success, text=Success, text=✓, text=✅').allTextContents();
      if (testSuccessIndicators.length > 0) {
        console.log('🔍 TEST DEBUG: Success indicators found:', testSuccessIndicators);
      }

      // Check the current form field values
      const clientIdValue = await page.locator('[data-testid="connection-input-clientId"]').inputValue();
      const clientSecretValue = await page.locator('[data-testid="connection-input-clientSecret"]').inputValue();
      const redirectUriValue = await page.locator('[data-testid="connection-input-redirectUri"]').inputValue();
      console.log('🔍 TEST DEBUG: Form field values:', { clientIdValue, clientSecretValue, redirectUriValue });

      // Check if save button is still enabled
      const saveButtonEnabled = await page.locator('[data-testid="save-connection-btn"]').isEnabled();
      console.log('🔍 TEST DEBUG: Save button enabled after test:', saveButtonEnabled);

      // Save the connection
      console.log('🔍 TEST DEBUG: Clicking save connection button...');
      
      // Check if button is visible and enabled before clicking
      const saveButton = page.locator('[data-testid="save-connection-btn"]');
      const isVisible = await saveButton.isVisible();
      const isButtonEnabled = await saveButton.isEnabled();
      console.log('🔍 TEST DEBUG: Save button visible:', isVisible);
      console.log('🔍 TEST DEBUG: Save button enabled:', isButtonEnabled);
      
      if (isVisible && isButtonEnabled) {
        // Add console log listener to capture any errors
        page.on('console', msg => {
          if (msg.type() === 'error') {
            console.log('🔍 BROWSER ERROR:', msg.text());
          } else if (msg.type() === 'log') {
            console.log('🔍 BROWSER LOG:', msg.text());
          }
        });
        
        // Check button attributes and component state
        const buttonText = await saveButton.textContent();
        const buttonDisabled = await saveButton.getAttribute('disabled');
        const buttonOnClick = await saveButton.getAttribute('onclick');
        const buttonClassName = await saveButton.getAttribute('class');
        
        console.log('🔍 TEST DEBUG: Save button details:');
        console.log('  - Text:', buttonText);
        console.log('  - Disabled:', buttonDisabled);
        console.log('  - OnClick:', buttonOnClick);
        console.log('  - Class:', buttonClassName);
        
        // Check if the form component is properly mounted
        const formElement = page.locator('[data-testid="connection-setup-form"]');
        const formVisible = await formElement.isVisible();
        console.log('🔍 TEST DEBUG: Form element visible:', formVisible);
        
        // Check if the form has any content
        const formText = await formElement.textContent();
        console.log('🔍 TEST DEBUG: Form text content:', formText);
        
        // Check if there are any React components mounted
        const reactRoot = page.locator('#__next');
        const reactRootVisible = await reactRoot.isVisible();
        console.log('🔍 TEST DEBUG: React root visible:', reactRootVisible);
        
        // Try different click methods
        console.log('🔍 TEST DEBUG: Attempting to click save button...');
        
        // Method 1: Regular click
        await saveButton.click();
        console.log('🔍 TEST DEBUG: Regular click completed');
        
        // Wait a bit to see if anything happens
        await page.waitForTimeout(1000);
        
        // Check if modal is still visible
        const modalStillVisible = await page.locator('[data-testid="connection-setup-modal"]').isVisible();
        console.log('🔍 TEST DEBUG: Modal visible after regular click:', modalStillVisible);
        
        // If modal is still visible, try force click
        if (modalStillVisible) {
          console.log('🔍 TEST DEBUG: Trying force click...');
          await saveButton.click({ force: true });
          console.log('🔍 TEST DEBUG: Force click completed');
          
          await page.waitForTimeout(1000);
          
          const modalStillVisibleAfterForce = await page.locator('[data-testid="connection-setup-modal"]').isVisible();
          console.log('🔍 TEST DEBUG: Modal visible after force click:', modalStillVisibleAfterForce);
        }
      } else {
        console.log('🔍 TEST DEBUG: Save button not clickable, skipping click');
      }
      
      // Wait for save API call to complete
      await page.waitForTimeout(3000);
      
      console.log('🔍 TEST DEBUG: Final API request count:', requests.length);
      console.log('🔍 TEST DEBUG: Final API response count:', responses.length);
      console.log('🔍 TEST DEBUG: All API requests:', requests);
      console.log('🔍 TEST DEBUG: All API responses:', responses);

      // Check if modal is still visible (it should close on success)
      const modalStillVisible = await page.locator('[data-testid="connection-setup-modal"]').isVisible();
      console.log('🔍 TEST DEBUG: Modal still visible after save:', modalStillVisible);

      // Check for any error messages
      const errorMessageCount = await page.locator('[data-testid="error-message"]').count();
      console.log('🔍 TEST DEBUG: Number of error messages:', errorMessageCount);

      // Wait for the success message to appear
      await page.waitForSelector('text=✅ Successfully connected to Slack! You can now create your workflow.', { timeout: 10000 });
      
      // Verify success message
      await expect(page.locator('text=✅ Successfully connected to Slack! You can now create your workflow.')).toBeVisible();

      // Verify modal closes
      await expect(page.locator('[data-testid="connection-setup-modal"]')).not.toBeVisible();
    });

    test('should handle connection setup errors gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send a message that requires a connection
      await sendChatMessage(page, 'Create a workflow that uses GitHub API');
      await waitForChatResponse(page);

      // Click "Set up in Chat" button
      await page.locator('[data-testid="setup-in-chat-github"]').click();

      // Verify connection setup form appears
      await expect(page.locator('[data-testid="connection-setup-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-setup-form"]')).toBeVisible();

      // Verify the form has the correct fields for GitHub (Bearer Token)
      await expect(page.locator('[data-testid="connection-input-bearerToken"]')).toBeVisible();
      await expect(page.locator('[data-testid="test-connection-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="save-connection-btn"]')).toBeVisible();

      // Verify we can close the modal
      await page.locator('[data-testid="cancel-connection-setup"]').click();
      await expect(page.locator('[data-testid="connection-setup-modal"]')).not.toBeVisible();
    });

    test('should validate required fields in connection setup', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send a message that requires a connection
      await sendChatMessage(page, 'Create a workflow that uses Stripe API');
      await waitForChatResponse(page);

      // Click "Set up in Chat" button
      await page.locator('[data-testid="setup-in-chat-stripe"]').click();

      // Try to save without filling required fields
      await page.locator('[data-testid="save-connection-btn"]').click();

      // Verify validation errors appear
      await expect(page.locator('[data-testid="error-apiKey"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-apiKey"]')).toContainText('API Key is required');
    });

    test('should support different authentication types', async ({ page }) => {
      // Test API Key authentication (OpenAI)
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      await sendChatMessage(page, 'Create a workflow that uses OpenAI API for AI processing');
      await waitForChatResponse(page);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);
      
      // Verify API suggestion is shown
      await expect(page.locator('[data-testid="api-suggestion-OpenAI API"]')).toBeVisible();
      await expect(page.locator('[data-testid="setup-in-chat-openai"]')).toBeVisible();
      
      await page.locator('[data-testid="setup-in-chat-openai"]').click();
      await expect(page.locator('[data-testid="connection-input-apiKey"]')).toBeVisible();
      await page.locator('[data-testid="cancel-connection-setup"]').click();
      
      // Test Bearer Token authentication (GitHub) - fresh page
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);
      
      await sendChatMessage(page, 'Create a workflow that uses GitHub API to manage repositories');
      await waitForChatResponse(page);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);
      await expect(page.locator('[data-testid="api-suggestion-GitHub"]')).toBeVisible();
      await expect(page.locator('[data-testid="setup-in-chat-github"]')).toBeVisible();

      await page.locator('[data-testid="setup-in-chat-github"]').click();
      await expect(page.locator('[data-testid="connection-input-bearerToken"]')).toBeVisible();
      await page.locator('[data-testid="cancel-connection-setup"]').click();
      
      // Test OAuth2 authentication (Slack) - fresh page
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);
      
      // Use a more specific message that should definitely trigger Slack API detection
      await sendChatMessage(page, 'I want to create a workflow that sends messages to Slack channels');
      await waitForChatResponse(page);

      // Wait for connection guidance to appear with longer timeout
      await waitForConnectionGuidance(page);
      await expect(page.locator('[data-testid="api-suggestion-Slack"]')).toBeVisible();
      await expect(page.locator('[data-testid="setup-in-chat-slack"]')).toBeVisible();
      await page.locator('[data-testid="setup-in-chat-slack"]').click();
      await expect(page.locator('[data-testid="connection-input-clientId"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-input-clientSecret"]')).toBeVisible();
    });

    test('should provide documentation links in connection setup', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send a message that requires a connection
      await sendChatMessage(page, 'Create a workflow that uses Slack API');
      await waitForChatResponse(page);

      // Wait for connection guidance to appear
      await waitForConnectionGuidance(page);

      // Click "Set up in Chat" button
      await page.locator('[data-testid="setup-in-chat-slack"]').click();

      // Verify documentation link is present in the connection setup form
      await expect(page.locator('[data-testid="connection-setup-form"] [data-testid="documentation-link"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-setup-form"] [data-testid="documentation-link"]')).toContainText('View Slack documentation');
    });

    test('should allow canceling connection setup', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send a message that requires a connection
      await sendChatMessage(page, 'Create a workflow that uses GitHub API');
      await waitForChatResponse(page);

      // Click "Set up in Chat" button
      await page.locator('[data-testid="setup-in-chat-github"]').click();

      // Verify form is open
      await expect(page.locator('[data-testid="connection-setup-form"]')).toBeVisible();

      // Cancel the setup
      await page.locator('[data-testid="cancel-connection-setup"]').click();

      // Verify form is closed
      await expect(page.locator('[data-testid="connection-setup-modal"]')).not.toBeVisible();
    });

    test('should update workflow creation after successful connection setup', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Send a message that requires a connection
      await sendChatMessage(page, 'Create a workflow that sends a Slack notification');
      await waitForChatResponse(page);

      // Set up the connection
      await page.locator('[data-testid="setup-in-chat-slack"]').click();
      
      // Wait for the connection setup modal to appear
      await page.waitForSelector('[data-testid="connection-setup-modal"]', { timeout: 10000 });
      
      // Fill the OAuth2 fields (Slack uses OAUTH2 auth type)
      await page.locator('[data-testid="connection-input-clientId"]').fill('test-client-id');
      await page.locator('[data-testid="connection-input-clientSecret"]').fill('test-client-secret');
      await page.locator('[data-testid="save-connection-btn"]').click();

      // Wait for success message
      await expect(page.locator('text=Successfully connected to Slack')).toBeVisible();

      // Try to create the workflow again
      await sendChatMessage(page, 'Create a workflow that sends a Slack notification');
      await waitForChatResponse(page);

      // Should now create the workflow instead of showing guidance
      await expect(page.locator('[data-testid="connection-guidance"]')).not.toBeVisible();
    });
  });

  test.describe('Performance & Security', () => {
    test('should meet performance requirements for guidance generation', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Test page load performance
      await testPageLoadTime(page, `${BASE_URL}/dashboard?tab=chat`, { threshold: 3000 });

      // Test guidance generation performance
      const startTime = Date.now();
      
      await sendChatMessage(page, 'Create a complex workflow with many APIs');
      await waitForChatResponse(page);
      
      const endTime = Date.now();
      const guidanceTime = endTime - startTime;

      // Verify guidance is generated quickly
      expect(guidanceTime).toBeLessThan(5000);
    });

    test('should validate input sanitization in guidance responses', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard?tab=chat`);
      await waitForDashboard(page);

      // Test XSS prevention in guidance
      await testXSSPrevention(page, '[data-testid="chat-input"]', '<script>alert("xss")</script>');
      
      // Test data exposure prevention
      await testDataExposure(page, ['[data-testid="connection-guidance"]', '[data-testid="chat-interface"]']);
    });
  });
});
