#!/usr/bin/env node

/**
 * E2E Test Evaluation Tool
 * 
 * This tool evaluates E2E test files against the project's documentation standards:
 * - PRD.md compliance (core feature coverage, success/failure scenarios)
 * - Implementation Plan compliance (P0/P1/P2 priorities, real data usage)
 * - UX_SPEC.md compliance (primary action patterns, accessibility, mobile responsiveness)
 * - Testing Best Practices (UXComplianceHelper usage, cookie-based authentication)
 * - Waiting Strategies (robust element waiting, dynamic content handling)
 * - Modal & Dialog Behavior (modal states, loading patterns, success feedback)
 * - Edge Cases & Security (error scenarios, security validation)
 * - Cookie-based Authentication (HTTP-only cookies, secure session management)
 * 
 * Usage: node scripts/evaluate-e2e-tests.js [test-file-path]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const TEST_DIR = 'tests/e2e';
const DOCS_DIR = 'docs';
const SRC_DIR = 'src';

// Evaluation criteria weights
const CRITERIA_WEIGHTS = {
  prdCompliance: 0.10,
  implementationPlanCompliance: 0.08,
  uxSpecCompliance: 0.11,
  testingBestPractices: 0.10,
  e2EvsAPISeparation: 0.10, // New dedicated criteria for E2E vs API separation
  waitingStrategies: 0.11,
  modalBehavior: 0.08,
  testReliability: 0.10,
  stateManagement: 0.08,
  performanceTesting: 0.08,
  advancedSecurity: 0.08,
  seoTesting: 0.04,
  pwaTesting: 0.04,
  analyticsMonitoring: 0.04,
  edgeCasesSecurity: 0.06,
  documentationCompliance: 0.04  // New criteria for documentation rules
};

class E2ETestEvaluator {
  constructor() {
    this.results = {};
    this.todos = [];
  }

  /**
   * Main evaluation function
   */
  async evaluateTestFile(testFilePath) {
    console.log(`🔍 Evaluating: ${testFilePath}`);
    
    if (!fs.existsSync(testFilePath)) {
      console.error(`❌ Test file not found: ${testFilePath}`);
      return;
    }

    const content = fs.readFileSync(testFilePath, 'utf8');
    const fileName = path.basename(testFilePath);
    
    this.results[fileName] = {
      filePath: testFilePath,
      compliance: {},
      issues: [],
      recommendations: [],
      score: 0
    };

    // Evaluate against each criteria
    await this.evaluatePRDCompliance(fileName, content);
    await this.evaluateImplementationPlanCompliance(fileName, content);
    await this.evaluateUXSpecCompliance(fileName, content);
    await this.evaluateTestingBestPractices(fileName, content);
    await this.evaluateE2EvsAPISeparation(fileName, content);
    await this.evaluateWaitingStrategies(fileName, content);
    await this.evaluateModalBehavior(fileName, content);
    await this.evaluateTestReliability(fileName, content);
    await this.evaluateStateManagement(fileName, content);
    await this.evaluatePerformanceTesting(fileName, content);
    await this.evaluateAdvancedSecurity(fileName, content);
    await this.evaluateSEOTesting(fileName, content);
    await this.evaluatePWATesting(fileName, content);
    await this.evaluateAnalyticsMonitoring(fileName, content);
    await this.evaluateEdgeCasesSecurity(fileName, content);
    await this.evaluateDocumentationCompliance(fileName, content);

    // Calculate overall score
    this.calculateOverallScore(fileName);
    
    // Generate recommendations
    this.generateRecommendations(fileName);
    
    return this.results[fileName];
  }

  /**
   * Evaluate PRD.md compliance
   */
  async evaluatePRDCompliance(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Core feature coverage
    const coreFeatures = [
      'natural language workflow creation',
      'workflow execution engine',
      'api connection management',
      'secrets vault',
      'authentication flows',
      'dashboard functionality'
    ];

    let featureCoverage = 0;
    coreFeatures.forEach(feature => {
      if (content.toLowerCase().includes(feature.replace(/\s+/g, '')) || 
          content.toLowerCase().includes(feature)) {
        featureCoverage++;
        result.compliant.push(`✅ Tests ${feature}`);
      } else {
        result.nonCompliant.push(`❌ Missing ${feature} testing`);
        // Add TODO for missing core feature
        this.addTodo(fileName, 'P0', `Add ${feature} testing`, 
          `// TODO: Add ${feature} testing to ${fileName}
// - Test ${feature} functionality
// - Test ${feature} integration with other features
// - Test ${feature} error scenarios
// - Test ${feature} user workflows`);
      }
    });

    // Success/failure scenarios
    const hasSuccessScenarios = /expect.*toBeVisible|expect.*toHaveText|expect.*toHaveURL/.test(content);
    const hasFailureScenarios = /error|invalid|failed|timeout/.test(content);
    
    if (hasSuccessScenarios) {
      result.compliant.push('✅ Tests success scenarios');
    } else {
      result.nonCompliant.push('❌ Missing success scenario testing');
      this.addTodo(fileName, 'P0', 'Add success scenario testing', 
        `// TODO: Add success scenario testing to ${fileName}
// - Test successful form submissions
// - Test successful navigation flows
// - Test successful data operations
// - Validate expected outcomes and state changes`);
    }

    if (hasFailureScenarios) {
      result.compliant.push('✅ Tests failure scenarios');
    } else {
      result.nonCompliant.push('❌ Missing failure scenario testing');
      this.addTodo(fileName, 'P0', 'Add failure scenario testing', 
        `// TODO: Add failure scenario testing to ${fileName}
// - Test invalid input handling
// - Test network error scenarios
// - Test authentication failures
// - Test validation error messages`);
    }

    // Performance requirements
    const hasPerformanceTesting = /timeout|performance|load|speed/.test(content);
    if (hasPerformanceTesting) {
      result.compliant.push('✅ Includes performance testing');
    } else {
      result.nonCompliant.push('❌ Missing performance testing');
      this.addTodo(fileName, 'P1', 'Add performance testing', 
        `// TODO: Add performance testing to ${fileName}
// - Test page load times
// - Test API response times
// - Test UI responsiveness
// - Test memory usage patterns`);
    }

    // Business logic validation
    const hasBusinessLogic = /workflow|connection|secret|user|authentication/.test(content);
    if (hasBusinessLogic) {
      result.compliant.push('✅ Tests business logic');
    } else {
      result.nonCompliant.push('❌ Missing business logic validation');

      // Add TODO for business logic testing
      this.addTodo(fileName, 'P0', 'Add business logic validation tests', 
        `// TODO: Add business logic validation tests for ${fileName}
// - Test workflow creation and execution
// - Test API connection management
// - Test secrets vault operations
// - Test user authentication flows`);
    }

    result.score = (featureCoverage / coreFeatures.length) * 0.4 + 
                   (hasSuccessScenarios ? 0.3 : 0) + 
                   (hasFailureScenarios ? 0.2 : 0) + 
                   (hasPerformanceTesting ? 0.1 : 0);

    this.results[fileName].compliance.prdCompliance = result;
  }

  /**
   * Evaluate Implementation Plan compliance
   */
  async evaluateImplementationPlanCompliance(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // P0/P1/P2 feature coverage
    const p0Features = ['authentication', 'workflow', 'connection', 'secret'];
    const p1Features = ['oauth2', 'dashboard', 'monitoring'];
    const p2Features = ['admin', 'audit', 'performance'];

    let p0Coverage = 0;
    p0Features.forEach(feature => {
      if (content.toLowerCase().includes(feature)) {
        p0Coverage++;
        result.compliant.push(`✅ Tests P0 feature: ${feature}`);
      }
    });

    // Real data usage (no mocking)
    const hasRealData = !content.includes('mock') && !content.includes('jest.mock') && 
                       !content.includes('vi.mock') && !content.includes('cy.stub');
    
    if (hasRealData) {
      result.compliant.push('✅ Uses real data (no mocking)');
    } else {
      result.nonCompliant.push('❌ Uses mocked data (violates no-mock-data policy)');
      
      // Add TODO for real data usage
      this.addTodo(fileName, 'P0', 'Replace mocked data with real data', 
        `// TODO: Replace mocked data with real data in ${fileName}
// - Use real authentication cookies
// - Use real API endpoints
// - Use real database operations
// - Remove all jest.mock() and vi.mock() calls`);
    }

    // Error handling and edge cases
    const hasErrorHandling = /try.*catch|error.*handling|edge.*case/.test(content);
    if (hasErrorHandling) {
      result.compliant.push('✅ Tests error handling and edge cases');
    } else {
      result.nonCompliant.push('❌ Missing error handling and edge case testing');
      
      // Add TODO for error handling
      this.addTodo(fileName, 'P1', 'Add comprehensive error handling tests', 
        `// TODO: Add comprehensive error handling tests for ${fileName}
// - Test network failures
// - Test invalid input scenarios
// - Test timeout scenarios
// - Test rate limiting scenarios`);
    }

    // Integration with other features
    const hasIntegration = /beforeEach|afterEach|setup|teardown/.test(content);
    if (hasIntegration) {
      result.compliant.push('✅ Tests integration with other features');
    } else {
      result.nonCompliant.push('❌ Missing integration testing');
      this.addTodo(fileName, 'P1', 'Add integration testing', 
        `// TODO: Add integration testing to ${fileName}
// - Test integration with other features
// - Test setup and teardown procedures
// - Test data flow between components
// - Test cross-feature dependencies`);
    }

    result.score = (p0Coverage / p0Features.length) * 0.5 + 
                   (hasRealData ? 0.3 : 0) + 
                   (hasErrorHandling ? 0.2 : 0);

    this.results[fileName].compliance.implementationPlanCompliance = result;
  }

  /**
   * Evaluate UX_SPEC.md compliance
   */
  async evaluateUXSpecCompliance(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Primary action button patterns
    const hasPrimaryActionPatterns = /data-testid.*primary-action/.test(content);
    if (hasPrimaryActionPatterns) {
      result.compliant.push('✅ Uses primary action button patterns');
    } else {
      result.nonCompliant.push('❌ Missing primary action button patterns');
      
      // Add TODO for primary action patterns
      this.addTodo(fileName, 'P0', 'Add primary action button patterns', 
        `// TODO: Add primary action button patterns to ${fileName}
// - Use data-testid="primary-action {action}-btn" pattern
// - Test primary action presence with UXComplianceHelper
// - Validate button text matches standardized patterns`);
    }

    // Form accessibility
    const hasFormAccessibility = /getByLabel|getByRole.*button|aria-required|aria-label/.test(content);
    if (hasFormAccessibility) {
      result.compliant.push('✅ Tests form accessibility');
    } else {
      result.nonCompliant.push('❌ Missing form accessibility testing');
      
      // Add TODO for form accessibility
      this.addTodo(fileName, 'P0', 'Add form accessibility testing', 
        `// TODO: Add form accessibility testing to ${fileName}
// - Test form labels and ARIA attributes
// - Test keyboard navigation
// - Test screen reader compatibility
// - Use UXComplianceHelper.validateFormAccessibility()`);
    }

    // Error/success message containers
    const hasMessageContainers = /data-testid.*error|data-testid.*success|role.*alert/.test(content);
    if (hasMessageContainers) {
      result.compliant.push('✅ Tests error/success message containers');
    } else {
      result.nonCompliant.push('❌ Missing error/success message container testing');
      this.addTodo(fileName, 'P1', 'Add error/success message container testing', 
        `// TODO: Add error/success message container testing to ${fileName}
// - Test error message display and content
// - Test success message display and content
// - Test message container accessibility
// - Test message timing and persistence`);
    }

    // Loading states and feedback
    const hasLoadingStates = /loading|spinner|waitFor|timeout/.test(content);
    if (hasLoadingStates) {
      result.compliant.push('✅ Tests loading states and feedback');
    } else {
      result.nonCompliant.push('❌ Missing loading state testing');
      this.addTodo(fileName, 'P1', 'Add loading state testing', 
        `// TODO: Add loading state testing to ${fileName}
// - Test loading spinner visibility
// - Test loading state transitions
// - Test loading timeout scenarios
// - Test loading state accessibility`);
    }

    // Mobile responsiveness
    const hasMobileTesting = /mobile|responsive|viewport|touch/.test(content);
    if (hasMobileTesting) {
      result.compliant.push('✅ Tests mobile responsiveness');
    } else {
      result.nonCompliant.push('❌ Missing mobile responsiveness testing');
      
      // Add TODO for mobile testing
      this.addTodo(fileName, 'P1', 'Add mobile responsiveness testing', 
        `// TODO: Add mobile responsiveness testing to ${fileName}
// - Test mobile viewport (375x667)
// - Test touch interactions
// - Test responsive layout
// - Use UXComplianceHelper.validateMobileResponsiveness()`);
    }

    // Keyboard navigation
    const hasKeyboardNavigation = /keyboard|tab|focus|navigation/.test(content);
    if (hasKeyboardNavigation) {
      result.compliant.push('✅ Tests keyboard navigation');
    } else {
      result.nonCompliant.push('❌ Missing keyboard navigation testing');
      
      // Add TODO for keyboard navigation
      this.addTodo(fileName, 'P1', 'Add keyboard navigation testing', 
        `// TODO: Add keyboard navigation testing to ${fileName}
// - Test tab navigation
// - Test focus management
// - Test keyboard shortcuts
// - Use UXComplianceHelper.validateKeyboardNavigation()`);
    }

    // Screen reader compatibility
    const hasScreenReaderTesting = /screen.*reader|aria|semantic/.test(content);
    if (hasScreenReaderTesting) {
      result.compliant.push('✅ Tests screen reader compatibility');
    } else {
      result.nonCompliant.push('❌ Missing screen reader compatibility testing');
      
      // Add TODO for screen reader testing
      this.addTodo(fileName, 'P1', 'Add screen reader compatibility testing', 
        `// TODO: Add screen reader compatibility testing to ${fileName}
// - Test ARIA landmarks and roles
// - Test semantic HTML structure
// - Test screen reader announcements
// - Use UXComplianceHelper.validateScreenReaderCompatibility()`);
    }

    result.score = (hasPrimaryActionPatterns ? 0.3 : 0) + 
                   (hasFormAccessibility ? 0.25 : 0) + 
                   (hasMessageContainers ? 0.15 : 0) + 
                   (hasLoadingStates ? 0.15 : 0) + 
                   (hasMobileTesting ? 0.1 : 0) + 
                   (hasKeyboardNavigation ? 0.05 : 0);

    this.results[fileName].compliance.uxSpecCompliance = result;
  }

  /**
   * Evaluate Waiting Strategies for Dynamic Elements
   */
  async evaluateWaitingStrategies(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for robust element waiting patterns
    const robustWaitingPatterns = [
      // Playwright-specific waiting patterns
      /waitForSelector|waitForElement|waitForLoadState|waitForResponse/,
      // Generic waiting patterns
      /waitFor|waitUntil|waitForElementToBeVisible|waitForElementToBePresent/,
      // Expect-based waiting
      /expect.*toBeVisible|expect.*toHaveText|expect.*toHaveURL|expect.*toBeAttached/,
      // Network waiting
      /waitForResponse|waitForRequest|waitForNetworkIdle/,
      // State-based waiting
      /waitForLoadState|waitForFunction|waitForCondition/
    ];

    let robustWaitingScore = 0;
    robustWaitingPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        robustWaitingScore++;
      }
    });

    if (robustWaitingScore >= 3) {
      result.compliant.push('✅ Uses robust waiting patterns for dynamic elements');
    } else if (robustWaitingScore >= 1) {
      result.compliant.push('⚠️ Uses some waiting patterns but could be more robust');
    } else {
      result.nonCompliant.push('❌ Missing robust waiting patterns for dynamic elements');
      
      // Add TODO for robust waiting
      this.addTodo(fileName, 'P0', 'Add robust waiting patterns for dynamic elements', 
        `// TODO: Add robust waiting patterns for dynamic elements in ${fileName}
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
// await page.waitForFunction(() => document.querySelector('.loading').style.display === 'none');`);
    }

    // Check for hardcoded delays (anti-pattern)
    const hardcodedDelays = [
      /setTimeout.*\d{4,}/,  // setTimeout with 4+ digits (likely milliseconds)
      /sleep.*\d{4,}/,       // sleep with 4+ digits
      /delay.*\d{4,}/,       // delay with 4+ digits
      /wait.*\d{4,}/,        // wait with 4+ digits
      /pause.*\d{4,}/        // pause with 4+ digits
    ];

    let hasHardcodedDelays = false;
    hardcodedDelays.forEach(pattern => {
      if (pattern.test(content)) {
        hasHardcodedDelays = true;
      }
    });

    if (!hasHardcodedDelays) {
      result.compliant.push('✅ No hardcoded delays found');
    } else {
      result.nonCompliant.push('❌ Uses hardcoded delays (anti-pattern)');
      
      // Add TODO for removing hardcoded delays
      this.addTodo(fileName, 'P0', 'Replace hardcoded delays with robust waiting', 
        `// TODO: Replace hardcoded delays with robust waiting in ${fileName}
// Anti-patterns to replace:
// - setTimeout(5000) → await page.waitForSelector(selector, { timeout: 5000 })
// - sleep(3000) → await expect(page.locator(selector)).toBeVisible({ timeout: 3000 })
// - delay(2000) → await page.waitForLoadState('networkidle')
// 
// Best practices:
// - Wait for specific elements to appear
// - Wait for network requests to complete
// - Wait for page state changes
// - Use appropriate timeouts for different operations`);
    }

    // Check for proper timeout configurations
    const hasTimeoutConfig = /timeout.*\d{4,}|setTimeout.*\d{4,}/.test(content);
    if (hasTimeoutConfig) {
      result.compliant.push('✅ Has appropriate timeout configurations');
    } else {
      result.nonCompliant.push('❌ Missing timeout configurations');
      
      // Add TODO for timeout configuration
      this.addTodo(fileName, 'P1', 'Add appropriate timeout configurations', 
        `// TODO: Add appropriate timeout configurations to ${fileName}
// test.setTimeout(30000); // Global test timeout
// await page.waitForSelector(selector, { timeout: 10000 }); // Element timeout
// await expect(page.locator(selector)).toBeVisible({ timeout: 5000 }); // Expect timeout
// await page.waitForResponse(response => response.url().includes('/api/'), { timeout: 15000 }); // API timeout`);
    }

    // Check for conditional waiting (waiting for specific states)
    const conditionalWaiting = [
      /waitForFunction|waitForCondition|waitUntil/,
      /expect.*toHaveText.*\w+|expect.*toHaveValue.*\w+/,
      /waitForResponse.*response.*url|waitForRequest.*request.*url/
    ];

    let conditionalWaitingScore = 0;
    conditionalWaiting.forEach(pattern => {
      if (pattern.test(content)) {
        conditionalWaitingScore++;
      }
    });

    if (conditionalWaitingScore >= 2) {
      result.compliant.push('✅ Uses conditional waiting for specific states');
    } else if (conditionalWaitingScore >= 1) {
      result.compliant.push('⚠️ Uses some conditional waiting but could be more specific');
    } else {
      result.nonCompliant.push('❌ Missing conditional waiting for specific states');
      
      // Add TODO for conditional waiting
      this.addTodo(fileName, 'P1', 'Add conditional waiting for specific states', 
        `// TODO: Add conditional waiting for specific states in ${fileName}
// - Wait for specific text content to appear
// - Wait for specific element states
// - Wait for specific API responses
// 
// Examples:
// await page.waitForFunction(() => document.querySelector('.status').textContent === 'Complete');
// await expect(page.locator('.status')).toHaveText('Complete');
// await page.waitForResponse(response => response.url().includes('/api/workflow') && response.status() === 200);`);
    }

    // Check for network-aware waiting
    const networkWaiting = [
      /waitForResponse|waitForRequest|waitForNetworkIdle/,
      /waitForLoadState.*networkidle|waitForLoadState.*domcontentloaded/
    ];

    let networkWaitingScore = 0;
    networkWaiting.forEach(pattern => {
      if (pattern.test(content)) {
        networkWaitingScore++;
      }
    });

    if (networkWaitingScore >= 1) {
      result.compliant.push('✅ Uses network-aware waiting patterns');
    } else {
      result.nonCompliant.push('❌ Missing network-aware waiting patterns');
      
      // Add TODO for network waiting
      this.addTodo(fileName, 'P1', 'Add network-aware waiting patterns', 
        `// TODO: Add network-aware waiting patterns to ${fileName}
// - Wait for network requests to complete
// - Wait for page load states
// - Wait for specific API responses
// 
// Examples:
// await page.waitForLoadState('networkidle');
// await page.waitForResponse(response => response.url().includes('/api/'));
// await page.waitForLoadState('domcontentloaded');`);
    }

    // Check for element state waiting
    const elementStateWaiting = [
      /toBeVisible|toBeHidden|toBeEnabled|toBeDisabled/,
      /toHaveAttribute|toHaveClass|toHaveValue/,
      /waitForSelector.*state|waitForElement.*state/
    ];

    let elementStateScore = 0;
    elementStateWaiting.forEach(pattern => {
      if (pattern.test(content)) {
        elementStateScore++;
      }
    });

    if (elementStateScore >= 2) {
      result.compliant.push('✅ Waits for specific element states');
    } else if (elementStateScore >= 1) {
      result.compliant.push('⚠️ Waits for some element states but could be more comprehensive');
    } else {
      result.nonCompliant.push('❌ Missing element state waiting');
      
      // Add TODO for element state waiting
      this.addTodo(fileName, 'P1', 'Add element state waiting', 
        `// TODO: Add element state waiting to ${fileName}
// - Wait for elements to be visible/hidden
// - Wait for elements to be enabled/disabled
// - Wait for specific element attributes or classes
// 
// Examples:
// await expect(page.locator('[data-testid="submit-btn"]')).toBeVisible();
// await expect(page.locator('[data-testid="loading"]')).toBeHidden();
// await expect(page.locator('[data-testid="input"]')).toBeEnabled();
// await expect(page.locator('[data-testid="checkbox"]')).toHaveAttribute('checked');`);
    }

    // Calculate score based on all waiting strategy criteria
    const maxScore = 6; // Total number of criteria
    let totalScore = 0;
    
    if (robustWaitingScore >= 3) totalScore += 1;
    if (!hasHardcodedDelays) totalScore += 1;
    if (hasTimeoutConfig) totalScore += 1;
    if (conditionalWaitingScore >= 2) totalScore += 1;
    if (networkWaitingScore >= 1) totalScore += 1;
    if (elementStateScore >= 2) totalScore += 1;

    result.score = totalScore / maxScore;

    this.results[fileName].compliance.waitingStrategies = result;
  }

  /**
   * Evaluate Modal & Dialog Behavior
   */
  async evaluateModalBehavior(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for modal/dialog testing
    const hasModalTesting = /modal|dialog|popup|overlay/.test(content);
    if (!hasModalTesting) {
      result.nonCompliant.push('❌ No modal/dialog testing found');
      this.addTodo(fileName, 'P1', 'Add modal/dialog testing', 
        `// TODO: Add modal/dialog testing to ${fileName}
// - Test modal opening and closing
// - Test modal form interactions
// - Test modal loading states
// - Test modal success/error feedback`);
      result.score = 0;
      this.results[fileName].compliance.modalBehavior = result;
      return;
    }

    // Check for submit button loading state testing
    const hasSubmitLoadingState = /disabled.*submit|submit.*disabled|creating.*\.\.\.|loading.*submit/.test(content);
    if (hasSubmitLoadingState) {
      result.compliant.push('✅ Tests submit button loading states');
    } else {
      result.nonCompliant.push('❌ Missing submit button loading state testing');
      this.addTodo(fileName, 'P0', 'Add submit button loading state testing', 
        `// TODO: Add submit button loading state testing to ${fileName}
// - Test submit button disabled during submission
// - Test button text changes to "Creating..." or similar
// - Test button remains disabled until operation completes
// - Test loading indicator/spinner on button
// - Enforce minimum loading state duration (800ms)`);
    }

    // Check for minimum loading state duration
    const hasLoadingDuration = /800ms|minimum.*loading|loading.*duration|setTimeout.*800/.test(content);
    if (hasLoadingDuration) {
      result.compliant.push('✅ Enforces minimum loading state duration');
    } else {
      result.nonCompliant.push('❌ Missing minimum loading state duration');
      this.addTodo(fileName, 'P0', 'Add minimum loading state duration', 
        `// TODO: Add minimum loading state duration to ${fileName}
// - Enforce minimum 800ms loading state duration
// - Example: await new Promise(resolve => setTimeout(resolve, 800));
// - Ensure users see loading feedback even for fast operations
// - Prevent flickering loading states`);
    }

    // Check for success message testing in modal
    const hasSuccessMessageInModal = /success.*message.*modal|modal.*success|success.*dialog|success.*button|button.*success/.test(content);
    if (hasSuccessMessageInModal) {
      result.compliant.push('✅ Tests success messages in modal');
    } else {
      result.nonCompliant.push('❌ Missing success message testing in modal');
      this.addTodo(fileName, 'P0', 'Add success message testing in modal', 
        `// TODO: Add success message testing in modal to ${fileName}
// - Test success message appears in modal after submission
// - Test success message is visible and readable
// - Test button text changes to "Success!" or similar
// - Test success message timing and persistence
// - Test success state before modal closes`);
    }

    // Check for modal delay before closing
    const hasModalDelay = /setTimeout.*close|delay.*close|wait.*close.*modal|1500ms|1\.5s/.test(content);
    if (hasModalDelay) {
      result.compliant.push('✅ Tests modal delay before closing');
    } else {
      result.nonCompliant.push('❌ Missing modal delay testing');
      this.addTodo(fileName, 'P0', 'Add modal delay testing', 
        `// TODO: Add modal delay testing to ${fileName}
// - Test modal stays open for 1.5s after success
// - Test user can see success message before modal closes
// - Test modal closes automatically after delay
// - Test modal remains open on error for user correction
// - Example: setTimeout(() => closeModal(), 1500);`);
    }

    // Check for error handling in modal
    const hasModalErrorHandling = /error.*modal|modal.*error|error.*dialog/.test(content);
    if (hasModalErrorHandling) {
      result.compliant.push('✅ Tests error handling in modal');
    } else {
      result.nonCompliant.push('❌ Missing modal error handling testing');
      this.addTodo(fileName, 'P0', 'Add modal error handling testing', 
        `// TODO: Add modal error handling testing to ${fileName}
// - Test modal stays open on error
// - Test error message appears in modal
// - Test submit button re-enables on error
// - Test user can correct errors and retry`);
    }

    // Check for modal accessibility
    const hasModalAccessibility = /aria-modal|role.*dialog|focus.*trap|escape.*close/.test(content);
    if (hasModalAccessibility) {
      result.compliant.push('✅ Tests modal accessibility');
    } else {
      result.nonCompliant.push('❌ Missing modal accessibility testing');
      this.addTodo(fileName, 'P1', 'Add modal accessibility testing', 
        `// TODO: Add modal accessibility testing to ${fileName}
// - Test focus trap within modal
// - Test escape key closes modal
// - Test ARIA attributes and roles
// - Test screen reader announcements`);
    }

    // Check for modal state transitions
    const hasModalStateTransitions = /modal.*state|dialog.*state|loading.*state.*modal/.test(content);
    if (hasModalStateTransitions) {
      result.compliant.push('✅ Tests modal state transitions');
    } else {
      result.nonCompliant.push('❌ Missing modal state transition testing');
      this.addTodo(fileName, 'P1', 'Add modal state transition testing', 
        `// TODO: Add modal state transition testing to ${fileName}
// - Test modal opening state
// - Test modal loading state during submission
// - Test modal success state with message
// - Test modal error state with error message
// - Test modal closing state`);
    }

    // Check for form validation in modal
    const hasModalFormValidation = /validation.*modal|modal.*validation|form.*error.*modal/.test(content);
    if (hasModalFormValidation) {
      result.compliant.push('✅ Tests form validation in modal');
    } else {
      result.nonCompliant.push('❌ Missing modal form validation testing');
      this.addTodo(fileName, 'P1', 'Add modal form validation testing', 
        `// TODO: Add modal form validation testing to ${fileName}
// - Test real-time form validation
// - Test validation error messages in modal
// - Test submit button disabled until form valid
// - Test validation state persistence`);
    }

    // Check for form loading state transitions
    const hasFormLoadingTransitions = /form.*loading|loading.*form|submit.*loading|loading.*submit/.test(content);
    if (hasFormLoadingTransitions) {
      result.compliant.push('✅ Tests form loading state transitions');
    } else {
      result.nonCompliant.push('❌ Missing form loading state transition testing');
      this.addTodo(fileName, 'P0', 'Add form loading state transition testing', 
        `// TODO: Add form loading state transition testing to ${fileName}
// - Test form fields disabled during submission
// - Test loading spinner appears on form
// - Test form transitions from loading to success/error
// - Test minimum loading duration (800ms) for all forms
// - Test form state persistence during loading`);
    }

    // Calculate score based on modal behavior criteria
    const maxScore = 9; // Total number of criteria
    let totalScore = 0;
    
    if (hasSubmitLoadingState) totalScore += 1;
    if (hasLoadingDuration) totalScore += 1;
    if (hasSuccessMessageInModal) totalScore += 1;
    if (hasModalDelay) totalScore += 1;
    if (hasModalErrorHandling) totalScore += 1;
    if (hasModalAccessibility) totalScore += 1;
    if (hasModalStateTransitions) totalScore += 1;
    if (hasModalFormValidation) totalScore += 1;
    if (hasFormLoadingTransitions) totalScore += 1;

    result.score = totalScore / maxScore;

    this.results[fileName].compliance.modalBehavior = result;
  }

  /**
   * Evaluate Test Reliability & Flakiness Prevention
   */
  async evaluateTestReliability(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Test Isolation - Proper cleanup and setup
    const hasTestIsolation = /beforeEach|afterEach|beforeAll|afterAll|cleanup|teardown/.test(content);
    if (hasTestIsolation) {
      result.compliant.push('✅ Has proper test isolation setup');
    } else {
      result.nonCompliant.push('❌ Missing test isolation setup');
      this.addTodo(fileName, 'P0', 'Add test isolation setup', 
        `// TODO: Add test isolation setup to ${fileName}
// test.beforeEach(async () => {
//   // Setup test data
//   await createTestData();
// });
// 
// test.afterEach(async () => {
//   // Clean up test data
//   await cleanupTestData();
//   await prisma.user.deleteMany({ where: { email: { contains: 'e2e-test' } } });
//   await prisma.connection.deleteMany({ where: { name: { contains: 'Test' } } });
// });`);
    }

    // Data cleanup patterns
    const hasDataCleanup = /deleteMany|cleanup|remove|truncate/.test(content);
    if (hasDataCleanup) {
      result.compliant.push('✅ Has proper data cleanup');
    } else {
      result.nonCompliant.push('❌ Missing data cleanup patterns');
      this.addTodo(fileName, 'P0', 'Add data cleanup patterns', 
        `// TODO: Add data cleanup patterns to ${fileName}
// - Clean up test users: await prisma.user.deleteMany({ where: { email: { contains: 'e2e-test' } } });
// - Clean up test connections: await prisma.connection.deleteMany({ where: { name: { contains: 'Test' } } });
// - Clean up test workflows: await prisma.workflow.deleteMany({ where: { name: { contains: 'Test' } } });
// - Clean up test secrets: await prisma.secret.deleteMany({ where: { name: { contains: 'Test' } } });`);
    }

    // Stable selectors (data-testid usage)
    const hasStableSelectors = /data-testid|getByTestId|locator.*data-testid/.test(content);
    if (hasStableSelectors) {
      result.compliant.push('✅ Uses stable selectors (data-testid)');
    } else {
      result.nonCompliant.push('❌ Missing stable selectors');
      this.addTodo(fileName, 'P0', 'Add stable selectors', 
        `// TODO: Add stable selectors to ${fileName}
// - Use data-testid attributes instead of CSS classes
// - Example: await page.locator('[data-testid="submit-button"]').click();
// - Avoid: await page.locator('.btn-primary').click();
// - Add data-testid to all interactive elements being tested`);
    }

    // Retry mechanisms for flaky operations
    const hasRetryMechanisms = /retry|retryOnFailure|retry.*times|attempt.*retry/.test(content);
    if (hasRetryMechanisms) {
      result.compliant.push('✅ Has retry mechanisms for flaky operations');
    } else {
      result.nonCompliant.push('❌ Missing retry mechanisms');
      this.addTodo(fileName, 'P1', 'Add retry mechanisms', 
        `// TODO: Add retry mechanisms to ${fileName}
// - Use Playwright's built-in retry: await expect(page.locator(selector)).toBeVisible({ timeout: 10000 });
// - Implement custom retry logic for flaky operations
// - Retry network requests that might fail intermittently
// - Add exponential backoff for critical operations`);
    }

    // Deterministic test data
    const hasDeterministicData = /createTestData|setupTestData|seed.*data|fixture/.test(content);
    if (hasDeterministicData) {
      result.compliant.push('✅ Uses deterministic test data');
    } else {
      result.nonCompliant.push('❌ Missing deterministic test data');
      this.addTodo(fileName, 'P0', 'Add deterministic test data', 
        `// TODO: Add deterministic test data to ${fileName}
// - Create predictable test data with unique identifiers
// - Use timestamps or UUIDs to avoid conflicts
// - Example: const testUser = await createTestUser({ email: \`e2e-test-\${Date.now()}@example.com\` });
// - Ensure test data is isolated and doesn't interfere with other tests`);
    }

    // Timeout configurations
    const hasTimeoutConfig = /setTimeout|timeout.*\d{4,}|test\.setTimeout/.test(content);
    if (hasTimeoutConfig) {
      result.compliant.push('✅ Has appropriate timeout configurations');
    } else {
      result.nonCompliant.push('❌ Missing timeout configurations');
      this.addTodo(fileName, 'P1', 'Add timeout configurations', 
        `// TODO: Add timeout configurations to ${fileName}
// test.setTimeout(30000); // Global test timeout
// await page.waitForSelector(selector, { timeout: 10000 }); // Element timeout
// await expect(page.locator(selector)).toBeVisible({ timeout: 5000 }); // Expect timeout
// Use different timeouts for different types of operations`);
    }

    // Error handling and recovery
    const hasErrorRecovery = /try.*catch|error.*handling|recovery|fallback/.test(content);
    if (hasErrorRecovery) {
      result.compliant.push('✅ Has error handling and recovery');
    } else {
      result.nonCompliant.push('❌ Missing error handling and recovery');
      this.addTodo(fileName, 'P1', 'Add error handling and recovery', 
        `// TODO: Add error handling and recovery to ${fileName}
// - Handle network failures gracefully
// - Implement fallback mechanisms
// - Log errors for debugging
// - Provide meaningful error messages
// - Test error recovery scenarios`);
    }

    // Test independence (no shared state)
    const hasTestIndependence = /beforeEach.*clean|afterEach.*clean|isolated.*test/.test(content);
    if (hasTestIndependence) {
      result.compliant.push('✅ Tests are independent (no shared state)');
    } else {
      result.nonCompliant.push('❌ Tests may have shared state dependencies');
      this.addTodo(fileName, 'P0', 'Ensure test independence', 
        `// TODO: Ensure test independence in ${fileName}
// - Each test should be able to run in isolation
// - No dependencies on other test execution order
// - Clean state before and after each test
// - Use unique identifiers for all test data
// - Avoid global state modifications`);
    }

    // Parallel execution safety
    const hasParallelSafety = /parallel.*safe|concurrent.*safe|isolated.*parallel/.test(content);
    if (hasParallelSafety) {
      result.compliant.push('✅ Tests are safe for parallel execution');
    } else {
      result.nonCompliant.push('❌ Tests may not be safe for parallel execution');
      this.addTodo(fileName, 'P1', 'Ensure parallel execution safety', 
        `// TODO: Ensure parallel execution safety in ${fileName}
// - Use unique database records for each test
// - Avoid shared file system operations
// - Use isolated browser contexts
// - Ensure no cross-test interference
// - Test with parallel execution enabled`);
    }

    // Calculate score based on test reliability criteria
    const maxScore = 9; // Total number of criteria
    let totalScore = 0;
    
    if (hasTestIsolation) totalScore += 1;
    if (hasDataCleanup) totalScore += 1;
    if (hasStableSelectors) totalScore += 1;
    if (hasRetryMechanisms) totalScore += 1;
    if (hasDeterministicData) totalScore += 1;
    if (hasTimeoutConfig) totalScore += 1;
    if (hasErrorRecovery) totalScore += 1;
    if (hasTestIndependence) totalScore += 1;
    if (hasParallelSafety) totalScore += 1;

    result.score = totalScore / maxScore;

    this.results[fileName].compliance.testReliability = result;
  }

  /**
   * Evaluate State Management Testing
   */
  async evaluateStateManagement(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // URL state testing (browser back/forward navigation)
    const hasURLStateTesting = /goBack|goForward|history|back.*forward|url.*state/.test(content);
    if (hasURLStateTesting) {
      result.compliant.push('✅ Tests URL state and browser navigation');
    } else {
      result.nonCompliant.push('❌ Missing URL state testing');
      this.addTodo(fileName, 'P1', 'Add URL state testing', 
        `// TODO: Add URL state testing to ${fileName}
// - Test browser back/forward navigation
// - Test URL changes reflect application state
// - Test deep linking functionality
// - Test URL persistence across page reloads`);
    }

    // Form state persistence testing
    const hasFormStatePersistence = /draft.*save|auto.*save|form.*persist|cookie.*form|sessionStorage.*form/.test(content);
    if (hasFormStatePersistence) {
      result.compliant.push('✅ Tests form state persistence');
    } else {
      result.nonCompliant.push('❌ Missing form state persistence testing');
      this.addTodo(fileName, 'P1', 'Add form state persistence testing', 
        `// TODO: Add form state persistence testing to ${fileName}
// - Test draft saving functionality
// - Test auto-save behavior
// - Test form data persistence across sessions
// - Test form recovery after browser crash`);
    }

    // Session management testing
    const hasSessionManagement = /session.*refresh|token.*refresh|login.*state|session.*expire/.test(content);
    if (hasSessionManagement) {
      result.compliant.push('✅ Tests session management');
    } else {
      result.nonCompliant.push('❌ Missing session management testing');
      this.addTodo(fileName, 'P0', 'Add session management testing', 
        `// TODO: Add session management testing to ${fileName}
// - Test cookie-based session management
// - Test session expiration handling
// - Test login state persistence
// - Test logout and session cleanup`);
    }

    // Data synchronization testing
    const hasDataSync = /websocket|real.*time|sync|polling|live.*update/.test(content);
    if (hasDataSync) {
      result.compliant.push('✅ Tests data synchronization');
    } else {
      result.nonCompliant.push('❌ Missing data synchronization testing');
      this.addTodo(fileName, 'P1', 'Add data synchronization testing', 
        `// TODO: Add data synchronization testing to ${fileName}
// - Test real-time updates via WebSockets
// - Test data polling mechanisms
// - Test offline/online synchronization
// - Test conflict resolution for concurrent updates`);
    }

    // Calculate score based on state management criteria
    const maxScore = 4;
    let totalScore = 0;
    
    if (hasURLStateTesting) totalScore += 1;
    if (hasFormStatePersistence) totalScore += 1;
    if (hasSessionManagement) totalScore += 1;
    if (hasDataSync) totalScore += 1;

    result.score = totalScore / maxScore;

    this.results[fileName].compliance.stateManagement = result;
  }

  /**
   * Evaluate Performance & Load Testing
   */
  async evaluatePerformanceTesting(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Page load time testing
    const hasPageLoadTesting = /load.*time|performance|core.*web.*vitals|lighthouse/.test(content);
    if (hasPageLoadTesting) {
      result.compliant.push('✅ Tests page load times');
    } else {
      result.nonCompliant.push('❌ Missing page load time testing');
      this.addTodo(fileName, 'P1', 'Add page load time testing', 
        `// TODO: Add page load time testing to ${fileName}
// - Test Core Web Vitals (LCP, FID, CLS)
// - Test page load performance metrics
// - Test resource loading optimization
// - Test performance budgets and thresholds`);
    }

    // Memory leak testing
    const hasMemoryLeakTesting = /memory.*leak|memory.*usage|long.*running|memory.*test/.test(content);
    if (hasMemoryLeakTesting) {
      result.compliant.push('✅ Tests for memory leaks');
    } else {
      result.nonCompliant.push('❌ Missing memory leak testing');
      this.addTodo(fileName, 'P1', 'Add memory leak testing', 
        `// TODO: Add memory leak testing to ${fileName}
// - Test long-running scenarios for memory leaks
// - Test component cleanup and disposal
// - Test memory usage patterns
// - Test garbage collection behavior`);
    }

    // Concurrent operations testing
    const hasConcurrentTesting = /concurrent|parallel|multiple.*user|race.*condition/.test(content);
    if (hasConcurrentTesting) {
      result.compliant.push('✅ Tests concurrent operations');
    } else {
      result.nonCompliant.push('❌ Missing concurrent operations testing');
      this.addTodo(fileName, 'P1', 'Add concurrent operations testing', 
        `// TODO: Add concurrent operations testing to ${fileName}
// - Test multiple users performing actions simultaneously
// - Test race condition scenarios
// - Test data consistency under load
// - Test system behavior under concurrent stress`);
    }

    // API performance testing
    const hasAPIPerformanceTesting = /api.*performance|response.*time|api.*load|endpoint.*performance/.test(content);
    if (hasAPIPerformanceTesting) {
      result.compliant.push('✅ Tests API performance');
    } else {
      result.nonCompliant.push('❌ Missing API performance testing');
      this.addTodo(fileName, 'P1', 'Add API performance testing', 
        `// TODO: Add API performance testing to ${fileName}
// - Test API response times
// - Test API endpoint performance under load
// - Test API rate limiting behavior
// - Test API error handling under stress`);
    }

    // Calculate score based on performance testing criteria
    const maxScore = 4;
    let totalScore = 0;
    
    if (hasPageLoadTesting) totalScore += 1;
    if (hasMemoryLeakTesting) totalScore += 1;
    if (hasConcurrentTesting) totalScore += 1;
    if (hasAPIPerformanceTesting) totalScore += 1;

    result.score = totalScore / maxScore;

    this.results[fileName].compliance.performanceTesting = result;
  }

  /**
   * Evaluate Advanced Security Testing
   */
  async evaluateAdvancedSecurity(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // XSS prevention testing
    const hasXSSPrevention = /xss|script.*injection|input.*sanitization|html.*escape/.test(content);
    if (hasXSSPrevention) {
      result.compliant.push('✅ Tests XSS prevention');
    } else {
      result.nonCompliant.push('❌ Missing XSS prevention testing');
      this.addTodo(fileName, 'P0', 'Add XSS prevention testing', 
        `// TODO: Add XSS prevention testing to ${fileName}
// - Test input sanitization
// - Test script injection prevention
// - Test HTML escaping
// - Test content security policy compliance`);
    }

    // CSRF protection testing
    const hasCSRFProtection = /csrf|csrf.*token|cross.*site.*request|forgery/.test(content);
    if (hasCSRFProtection) {
      result.compliant.push('✅ Tests CSRF protection');
    } else {
      result.nonCompliant.push('❌ Missing CSRF protection testing');
      this.addTodo(fileName, 'P0', 'Add CSRF protection testing', 
        `// TODO: Add CSRF protection testing to ${fileName}
// - Test CSRF token validation
// - Test cross-site request forgery prevention
// - Test cookie-based CSRF protection
// - Test secure form submission`);
    }

    // Data exposure testing
    const hasDataExposureTesting = /data.*exposure|sensitive.*data|privacy.*leak|information.*disclosure/.test(content);
    if (hasDataExposureTesting) {
      result.compliant.push('✅ Tests data exposure prevention');
    } else {
      result.nonCompliant.push('❌ Missing data exposure testing');
      this.addTodo(fileName, 'P0', 'Add data exposure testing', 
        `// TODO: Add data exposure testing to ${fileName}
// - Test sensitive data handling
// - Test privacy leak prevention
// - Test information disclosure prevention
// - Test data encryption and protection`);
    }

    // Authentication flow testing
    const hasAuthFlowTesting = /oauth|sso|mfa|multi.*factor|authentication.*flow/.test(content);
    if (hasAuthFlowTesting) {
      result.compliant.push('✅ Tests authentication flows');
    } else {
      result.nonCompliant.push('❌ Missing authentication flow testing');
      this.addTodo(fileName, 'P0', 'Add authentication flow testing', 
        `// TODO: Add authentication flow testing to ${fileName}
// - Test OAuth integration
// - Test SSO (Single Sign-On) flows
// - Test MFA (Multi-Factor Authentication)
// - Test authentication state management`);
    }

    // Calculate score based on advanced security criteria
    const maxScore = 4;
    let totalScore = 0;
    
    if (hasXSSPrevention) totalScore += 1;
    if (hasCSRFProtection) totalScore += 1;
    if (hasDataExposureTesting) totalScore += 1;
    if (hasAuthFlowTesting) totalScore += 1;

    result.score = totalScore / maxScore;

    this.results[fileName].compliance.advancedSecurity = result;
  }

  /**
   * Evaluate SEO & Meta Testing
   */
  async evaluateSEOTesting(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Meta tags testing
    const hasMetaTagTesting = /meta.*tag|title.*tag|description.*tag|open.*graph/.test(content);
    if (hasMetaTagTesting) {
      result.compliant.push('✅ Tests meta tags');
    } else {
      result.nonCompliant.push('❌ Missing meta tag testing');
      this.addTodo(fileName, 'P2', 'Add meta tag testing', 
        `// TODO: Add meta tag testing to ${fileName}
// - Test title tag presence and content
// - Test meta description tags
// - Test Open Graph tags
// - Test Twitter Card tags`);
    }

    // Structured data testing
    const hasStructuredDataTesting = /json.*ld|microdata|structured.*data|schema\.org/.test(content);
    if (hasStructuredDataTesting) {
      result.compliant.push('✅ Tests structured data');
    } else {
      result.nonCompliant.push('❌ Missing structured data testing');
      this.addTodo(fileName, 'P2', 'Add structured data testing', 
        `// TODO: Add structured data testing to ${fileName}
// - Test JSON-LD structured data
// - Test microdata implementation
// - Test schema.org markup
// - Test structured data validation`);
    }

    // URL structure testing
    const hasURLStructureTesting = /url.*structure|clean.*url|semantic.*url|seo.*friendly/.test(content);
    if (hasURLStructureTesting) {
      result.compliant.push('✅ Tests URL structure');
    } else {
      result.nonCompliant.push('❌ Missing URL structure testing');
      this.addTodo(fileName, 'P2', 'Add URL structure testing', 
        `// TODO: Add URL structure testing to ${fileName}
// - Test clean, semantic URLs
// - Test SEO-friendly URL patterns
// - Test URL redirects and canonicalization
// - Test URL structure consistency`);
    }

    // Sitemap testing
    const hasSitemapTesting = /sitemap|xml.*sitemap|sitemap.*validation/.test(content);
    if (hasSitemapTesting) {
      result.compliant.push('✅ Tests sitemap functionality');
    } else {
      result.nonCompliant.push('❌ Missing sitemap testing');
      this.addTodo(fileName, 'P2', 'Add sitemap testing', 
        `// TODO: Add sitemap testing to ${fileName}
// - Test XML sitemap generation
// - Test sitemap validation
// - Test sitemap submission to search engines
// - Test sitemap update mechanisms`);
    }

    // Calculate score based on SEO testing criteria
    const maxScore = 4;
    let totalScore = 0;
    
    if (hasMetaTagTesting) totalScore += 1;
    if (hasStructuredDataTesting) totalScore += 1;
    if (hasURLStructureTesting) totalScore += 1;
    if (hasSitemapTesting) totalScore += 1;

    result.score = totalScore / maxScore;

    this.results[fileName].compliance.seoTesting = result;
  }

  /**
   * Evaluate PWA Testing
   */
  async evaluatePWATesting(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Service worker testing
    const hasServiceWorkerTesting = /service.*worker|sw.*register|offline.*functionality/.test(content);
    if (hasServiceWorkerTesting) {
      result.compliant.push('✅ Tests service worker functionality');
    } else {
      result.nonCompliant.push('❌ Missing service worker testing');
      this.addTodo(fileName, 'P2', 'Add service worker testing', 
        `// TODO: Add service worker testing to ${fileName}
// - Test service worker registration
// - Test offline functionality
// - Test cache management
// - Test service worker updates`);
    }

    // App manifest testing
    const hasAppManifestTesting = /app.*manifest|manifest.*json|install.*prompt/.test(content);
    if (hasAppManifestTesting) {
      result.compliant.push('✅ Tests app manifest');
    } else {
      result.nonCompliant.push('❌ Missing app manifest testing');
      this.addTodo(fileName, 'P2', 'Add app manifest testing', 
        `// TODO: Add app manifest testing to ${fileName}
// - Test app manifest configuration
// - Test install prompt functionality
// - Test app icon and branding
// - Test PWA installation flow`);
    }

    // Push notification testing
    const hasPushNotificationTesting = /push.*notification|notification.*permission|notification.*api/.test(content);
    if (hasPushNotificationTesting) {
      result.compliant.push('✅ Tests push notifications');
    } else {
      result.nonCompliant.push('❌ Missing push notification testing');
      this.addTodo(fileName, 'P2', 'Add push notification testing', 
        `// TODO: Add push notification testing to ${fileName}
// - Test notification permission requests
// - Test push notification delivery
// - Test notification interaction handling
// - Test notification settings management`);
    }

    // Background sync testing
    const hasBackgroundSyncTesting = /background.*sync|sync.*api|periodic.*sync/.test(content);
    if (hasBackgroundSyncTesting) {
      result.compliant.push('✅ Tests background sync');
    } else {
      result.nonCompliant.push('❌ Missing background sync testing');
      this.addTodo(fileName, 'P2', 'Add background sync testing', 
        `// TODO: Add background sync testing to ${fileName}
// - Test background sync API
// - Test data synchronization in background
// - Test periodic sync functionality
// - Test sync status monitoring`);
    }

    // Calculate score based on PWA testing criteria
    const maxScore = 4;
    let totalScore = 0;
    
    if (hasServiceWorkerTesting) totalScore += 1;
    if (hasAppManifestTesting) totalScore += 1;
    if (hasPushNotificationTesting) totalScore += 1;
    if (hasBackgroundSyncTesting) totalScore += 1;

    result.score = totalScore / maxScore;

    this.results[fileName].compliance.pwaTesting = result;
  }

  /**
   * Evaluate Analytics & Monitoring Testing
   */
  async evaluateAnalyticsMonitoring(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Event tracking testing
    const hasEventTracking = /event.*tracking|analytics.*event|track.*event|user.*interaction/.test(content);
    if (hasEventTracking) {
      result.compliant.push('✅ Tests event tracking');
    } else {
      result.nonCompliant.push('❌ Missing event tracking testing');
      this.addTodo(fileName, 'P2', 'Add event tracking testing', 
        `// TODO: Add event tracking testing to ${fileName}
// - Test user interaction analytics
// - Test conversion event tracking
// - Test custom event tracking
// - Test analytics data accuracy`);
    }

    // Error monitoring testing
    const hasErrorMonitoring = /error.*monitoring|sentry|logrocket|error.*tracking/.test(content);
    if (hasErrorMonitoring) {
      result.compliant.push('✅ Tests error monitoring');
    } else {
      result.nonCompliant.push('❌ Missing error monitoring testing');
      this.addTodo(fileName, 'P2', 'Add error monitoring testing', 
        `// TODO: Add error monitoring testing to ${fileName}
// - Test error reporting to monitoring services
// - Test error context and stack traces
// - Test error categorization and severity
// - Test error alerting mechanisms`);
    }

    // Performance monitoring testing
    const hasPerformanceMonitoring = /performance.*monitoring|rum|real.*user.*monitoring/.test(content);
    if (hasPerformanceMonitoring) {
      result.compliant.push('✅ Tests performance monitoring');
    } else {
      result.nonCompliant.push('❌ Missing performance monitoring testing');
      this.addTodo(fileName, 'P2', 'Add performance monitoring testing', 
        `// TODO: Add performance monitoring testing to ${fileName}
// - Test Real User Monitoring (RUM)
// - Test performance metric collection
// - Test performance alerting
// - Test performance trend analysis`);
    }

    // Business metrics testing
    const hasBusinessMetrics = /business.*metrics|conversion.*funnel|kpi.*tracking/.test(content);
    if (hasBusinessMetrics) {
      result.compliant.push('✅ Tests business metrics');
    } else {
      result.nonCompliant.push('❌ Missing business metrics testing');
      this.addTodo(fileName, 'P2', 'Add business metrics testing', 
        `// TODO: Add business metrics testing to ${fileName}
// - Test conversion funnel tracking
// - Test KPI measurement accuracy
// - Test business goal tracking
// - Test revenue and engagement metrics`);
    }

    // Calculate score based on analytics monitoring criteria
    const maxScore = 4;
    let totalScore = 0;
    
    if (hasEventTracking) totalScore += 1;
    if (hasErrorMonitoring) totalScore += 1;
    if (hasPerformanceMonitoring) totalScore += 1;
    if (hasBusinessMetrics) totalScore += 1;

    result.score = totalScore / maxScore;

    this.results[fileName].compliance.analyticsMonitoring = result;
  }

  /**
   * Evaluate Testing Best Practices
   */
  async evaluateTestingBestPractices(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // UXComplianceHelper usage
    const hasUXComplianceHelper = /UXComplianceHelper|uxHelper/.test(content);
    if (hasUXComplianceHelper) {
      result.compliant.push('✅ Uses UXComplianceHelper');
    } else {
      result.nonCompliant.push('❌ Missing UXComplianceHelper usage');
      
      // Add TODO for UXComplianceHelper
      this.addTodo(fileName, 'P0', 'Add UXComplianceHelper integration', 
        `// TODO: Add UXComplianceHelper integration to ${fileName}
// import { UXComplianceHelper } from '../../helpers/uxCompliance';
// 
// test.beforeEach(async ({ page }) => {
//   const uxHelper = new UXComplianceHelper(page);
//   await uxHelper.validateActivationFirstUX();
//   await uxHelper.validateFormAccessibility();
//   await uxHelper.validateMobileResponsiveness();
//   await uxHelper.validateKeyboardNavigation();
// });`);
    }

    // Real authentication (via UI, not API) - Cookie-based
    const hasRealAuth = /jwt|token|cookie|session|login/.test(content);
    if (hasRealAuth) {
      result.compliant.push('✅ Uses real authentication via UI (cookie-based)');
    } else {
      result.nonCompliant.push('❌ Missing real authentication testing');
    }

    // Cookie-based authentication patterns
    const hasCookieAuth = /cookie.*auth|cookie.*session|httpOnly.*cookie|secure.*cookie/.test(content);
    if (hasCookieAuth) {
      result.compliant.push('✅ Tests cookie-based authentication patterns');
    } else {
      result.nonCompliant.push('❌ Missing cookie-based authentication testing');
      this.addTodo(fileName, 'P0', 'Add cookie-based authentication testing', 
        `// TODO: Add cookie-based authentication testing to ${fileName}
// - Test HTTP-only cookie authentication
// - Test secure cookie settings
// - Test cookie expiration and cleanup
// - Test cookie-based session management
// - Test authentication state persistence via cookies`);
    }

    // Database operations (for setup/cleanup only)
    const hasDatabaseOps = /prisma|database|createTestData|cleanup/.test(content);
    if (hasDatabaseOps) {
      result.compliant.push('✅ Uses real database operations for setup/cleanup');
    } else {
      result.nonCompliant.push('❌ Missing real database operations for setup/cleanup');
    }

    // E2E vs API testing separation
    const hasAPITesting = /page\.request\.|request\.|fetch\(|axios\.|superagent\.|got\.|node-fetch/.test(content);
    if (!hasAPITesting) {
      result.compliant.push('✅ Properly separates E2E from API testing');
    } else {
      result.nonCompliant.push('❌ Uses API calls in E2E tests (violates separation of concerns)');
      
      // Add TODO for API testing removal
      this.addTodo(fileName, 'P0', 'Remove API calls from E2E tests', 
        `// TODO: Remove API calls from E2E tests in ${fileName}
// E2E tests should only test user interactions through the UI
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
// - await page.click('[data-testid="primary-action submit-btn"]')`);
    }

    // Check for localStorage anti-patterns (should use cookies instead)
    const hasLocalStorageAntiPattern = /localStorage\.|localStorage\[|localStorage\.getItem|localStorage\.setItem/.test(content);
    if (!hasLocalStorageAntiPattern) {
      result.compliant.push('✅ No localStorage anti-patterns found (uses cookie-based auth)');
    } else {
      result.nonCompliant.push('❌ Uses localStorage for authentication (anti-pattern - should use cookies)');
      this.addTodo(fileName, 'P0', 'Replace localStorage with cookie-based authentication', 
        `// TODO: Replace localStorage with cookie-based authentication in ${fileName}
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
// - Test logout by clearing authentication cookies`);
    }

    // UI-only interactions (positive check)
    const hasUIIntractions = /page\.click|page\.fill|page\.selectOption|page\.type|page\.press|page\.hover|page\.dragAndDrop/.test(content);
    if (hasUIIntractions) {
      result.compliant.push('✅ Uses UI interactions for testing');
    } else {
      result.nonCompliant.push('❌ Missing UI interaction testing');
      this.addTodo(fileName, 'P0', 'Add UI interaction testing', 
        `// TODO: Add UI interaction testing to ${fileName}
// E2E tests should focus on user interactions through the UI
// - Test clicking buttons and links
// - Test filling forms
// - Test navigation flows
// - Test user workflows end-to-end`);
    }

    // Proper cleanup and test isolation
    const hasCleanup = /afterEach|afterAll|cleanup|deleteMany/.test(content);
    if (hasCleanup) {
      result.compliant.push('✅ Has proper cleanup and test isolation');
    } else {
      result.nonCompliant.push('❌ Missing proper cleanup and test isolation');
      
      // Add TODO for cleanup
      this.addTodo(fileName, 'P1', 'Add proper cleanup and test isolation', 
        `// TODO: Add proper cleanup and test isolation to ${fileName}
// test.afterEach(async () => {
//   // Clean up test data
//   await prisma.user.deleteMany({ where: { email: { contains: 'e2e-test' } } });
//   await prisma.connection.deleteMany({ where: { name: { contains: 'Test' } } });
//   await prisma.workflow.deleteMany({ where: { name: { contains: 'Test' } } });
// });`);
    }

    // Clear test descriptions
    const hasClearDescriptions = /should.*test|should.*validate|should.*complete/.test(content);
    if (hasClearDescriptions) {
      result.compliant.push('✅ Has clear test descriptions');
    } else {
      result.nonCompliant.push('❌ Missing clear test descriptions');
    }

    // Test data management
    const hasTestDataManagement = /createTestData|setupTestData|cleanupTestData|beforeEach.*data/.test(content);
    if (hasTestDataManagement) {
      result.compliant.push('✅ Has proper test data management');
    } else {
      result.nonCompliant.push('❌ Missing proper test data management');
      
      // Add TODO for test data management
      this.addTodo(fileName, 'P1', 'Add proper test data management', 
        `// TODO: Add proper test data management to ${fileName}
// test.beforeEach(async () => {
//   // Create test data
//   const testUser = await createTestUser();
//   const testConnection = await createTestConnection(testUser.id);
//   const testWorkflow = await createTestWorkflow(testUser.id);
// });
// 
// test.afterEach(async () => {
//   // Clean up test data
//   await cleanupTestData();
// });`);
    }

    // Calculate score with API testing penalty
    let baseScore = (hasUXComplianceHelper ? 0.12 : 0) + 
                   (hasRealAuth ? 0.12 : 0) + 
                   (hasCookieAuth ? 0.12 : 0) + 
                   (hasDatabaseOps ? 0.12 : 0) + 
                   (hasUIIntractions ? 0.12 : 0) + 
                   (hasCleanup ? 0.1 : 0) + 
                   (hasTestDataManagement ? 0.1 : 0) +
                   (hasClearDescriptions ? 0.05 : 0) +
                   (!hasLocalStorageAntiPattern ? 0.05 : 0);

    // Apply penalty for API testing in E2E tests
    if (hasAPITesting) {
      baseScore = Math.max(0, baseScore - 0.3); // 30% penalty for API testing
    }

    result.score = baseScore;

    this.results[fileName].compliance.testingBestPractices = result;
  }

  /**
   * Evaluate E2E vs API Testing Separation
   */
  async evaluateE2EvsAPISeparation(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for API testing patterns (anti-patterns for E2E tests)
    const apiTestingPatterns = [
      /page\.request\./,
      /request\./,
      /fetch\(/,
      /axios\./,
      /superagent\./,
      /got\./,
      /node-fetch/,
      /\.post\(.*\/api\//,
      /\.get\(.*\/api\//,
      /\.put\(.*\/api\//,
      /\.delete\(.*\/api\//,
      /\.patch\(.*\/api\//
    ];

    let apiTestingViolations = 0;
    apiTestingPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        apiTestingViolations++;
      }
    });

    if (apiTestingViolations === 0) {
      result.compliant.push('✅ No API testing found in E2E tests');
    } else {
      result.nonCompliant.push(`❌ Found ${apiTestingViolations} API testing patterns (violates E2E testing principles)`);
      
      // Add TODO for API testing removal
      this.addTodo(fileName, 'P0', 'Remove all API testing from E2E tests', 
        `// TODO: Remove all API testing from E2E tests in ${fileName}
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
// - await expect(page.locator('[data-testid="success-message"]')).toBeVisible()`);
    }

    // Check for UI interaction patterns (positive patterns for E2E tests)
    const uiInteractionPatterns = [
      /page\.click/,
      /page\.fill/,
      /page\.selectOption/,
      /page\.type/,
      /page\.press/,
      /page\.hover/,
      /page\.dragAndDrop/,
      /page\.check/,
      /page\.uncheck/,
      /page\.setInputFiles/,
      /page\.screenshot/,
      /page\.waitForSelector/,
      /page\.waitForLoadState/,
      /page\.waitForResponse/,
      /expect.*toBeVisible/,
      /expect.*toHaveText/,
      /expect.*toHaveURL/,
      /expect.*toBeAttached/,
      /expect.*toHaveValue/,
      /expect.*toBeChecked/
    ];

    let uiInteractionScore = 0;
    uiInteractionPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        uiInteractionScore++;
      }
    });

    if (uiInteractionScore >= 5) {
      result.compliant.push('✅ Comprehensive UI interaction testing');
    } else if (uiInteractionScore >= 3) {
      result.compliant.push('⚠️ Some UI interaction testing, but could be more comprehensive');
    } else {
      result.nonCompliant.push('❌ Insufficient UI interaction testing');
      this.addTodo(fileName, 'P0', 'Add comprehensive UI interaction testing', 
        `// TODO: Add comprehensive UI interaction testing to ${fileName}
// E2E tests should focus on user interactions through the UI
// - Test clicking buttons and links: await page.click('[data-testid="button"]')
// - Test filling forms: await page.fill('[data-testid="input"]', 'value')
// - Test navigation flows: await page.goto('/dashboard')
// - Test user workflows end-to-end
// - Test form submissions through UI
// - Test data validation through UI
// - Test error handling through UI`);
    }

    // Check for proper E2E test structure
    const hasE2EStructure = /test\.describe.*E2E|test.*should.*user|test.*end.*to.*end|test.*workflow/.test(content);
    if (hasE2EStructure) {
      result.compliant.push('✅ Proper E2E test structure and descriptions');
    } else {
      result.nonCompliant.push('❌ Missing proper E2E test structure');
      this.addTodo(fileName, 'P1', 'Add proper E2E test structure', 
        `// TODO: Add proper E2E test structure to ${fileName}
// test.describe('User Workflow E2E Tests', () => {
//   test('should complete full user workflow end-to-end', async ({ page }) => {
//     // Test user journey from start to finish
//     // Focus on user interactions, not API calls
//   });
// });`);
    }

    // Check for user journey testing
    const hasUserJourney = /user.*journey|workflow.*test|end.*to.*end|complete.*flow/.test(content);
    if (hasUserJourney) {
      result.compliant.push('✅ Tests complete user journeys');
    } else {
      result.nonCompliant.push('❌ Missing user journey testing');
      this.addTodo(fileName, 'P1', 'Add user journey testing', 
        `// TODO: Add user journey testing to ${fileName}
// - Test complete user workflows from start to finish
// - Test user registration → login → dashboard → feature usage
// - Test user onboarding flows
// - Test user task completion workflows`);
    }

    // Check for UI state validation
    const hasUIStateValidation = /expect.*toBeVisible|expect.*toHaveText|expect.*toHaveURL|expect.*toBeAttached/.test(content);
    if (hasUIStateValidation) {
      result.compliant.push('✅ Validates UI state changes');
    } else {
      result.nonCompliant.push('❌ Missing UI state validation');
      this.addTodo(fileName, 'P1', 'Add UI state validation', 
        `// TODO: Add UI state validation to ${fileName}
// - Validate UI elements appear/disappear correctly
// - Validate text content changes
// - Validate URL changes
// - Validate form state changes
// - Validate loading states`);
    }

    // Check for cookie-based authentication in E2E tests
    const hasCookieAuthInE2E = /cookie.*auth|cookie.*session|httpOnly.*cookie|secure.*cookie/.test(content);
    if (hasCookieAuthInE2E) {
      result.compliant.push('✅ Tests cookie-based authentication in E2E context');
    } else {
      result.nonCompliant.push('❌ Missing cookie-based authentication testing in E2E context');
      this.addTodo(fileName, 'P1', 'Add cookie-based authentication testing in E2E context', 
        `// TODO: Add cookie-based authentication testing in E2E context to ${fileName}
// - Test authentication via HTTP-only cookies
// - Test session persistence across page reloads
// - Test logout by clearing authentication cookies
// - Test authentication state in browser context
// - Test cookie security settings (httpOnly, secure, sameSite)`);
    }

    // Calculate score
    let score = 0;
    
    // Base score from UI interactions
    if (uiInteractionScore >= 5) score += 0.35;
    else if (uiInteractionScore >= 3) score += 0.15;
    
    // Penalty for API testing
    if (apiTestingViolations === 0) score += 0.25;
    else score = Math.max(0, score - (apiTestingViolations * 0.1));
    
    // Bonus for proper structure
    if (hasE2EStructure) score += 0.1;
    if (hasUserJourney) score += 0.1;
    if (hasUIStateValidation) score += 0.05;
    if (hasCookieAuthInE2E) score += 0.05;

    result.score = Math.min(1, score);

    this.results[fileName].compliance.e2EvsAPISeparation = result;
  }

  /**
   * Evaluate Edge Cases & Security
   */
  async evaluateEdgeCasesSecurity(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Error scenarios and failure modes
    const hasErrorScenarios = /error|invalid|failed|exception|timeout/.test(content);
    if (hasErrorScenarios) {
      result.compliant.push('✅ Tests error scenarios and failure modes');
    } else {
      result.nonCompliant.push('❌ Missing error scenario testing');
      
      // Add TODO for error scenarios
      this.addTodo(fileName, 'P0', 'Add error scenario testing', 
        `// TODO: Add error scenario testing to ${fileName}
// - Test invalid input validation
// - Test network failure scenarios
// - Test timeout scenarios
// - Test rate limiting scenarios
// - Test authentication failure scenarios`);
    }

    // Security validation
    const hasSecurityValidation = /permission|access|authorization|security|encryption/.test(content);
    if (hasSecurityValidation) {
      result.compliant.push('✅ Tests security validation');
    } else {
      result.nonCompliant.push('❌ Missing security validation testing');
      
      // Add TODO for security validation
      this.addTodo(fileName, 'P0', 'Add security validation testing', 
        `// TODO: Add security validation testing to ${fileName}
// - Test permission checks
// - Test access control
// - Test input validation
// - Test authentication requirements
// - Test encryption validation`);
    }

    // Network failures and timeouts
    const hasNetworkTesting = /network|timeout|retry|offline/.test(content);
    if (hasNetworkTesting) {
      result.compliant.push('✅ Tests network failures and timeouts');
    } else {
      result.nonCompliant.push('❌ Missing network failure testing');
      this.addTodo(fileName, 'P1', 'Add network failure testing', 
        `// TODO: Add network failure testing to ${fileName}
// - Test network timeout scenarios
// - Test offline mode handling
// - Test retry mechanisms
// - Test network error recovery`);
    }

    // Data integrity and race conditions
    const hasDataIntegrity = /race|concurrent|integrity|consistency/.test(content);
    if (hasDataIntegrity) {
      result.compliant.push('✅ Tests data integrity and race conditions');
    } else {
      result.nonCompliant.push('❌ Missing data integrity testing');
      this.addTodo(fileName, 'P1', 'Add data integrity testing', 
        `// TODO: Add data integrity testing to ${fileName}
// - Test concurrent operations
// - Test race condition scenarios
// - Test data consistency checks
// - Test transaction rollback scenarios`);
    }

    result.score = (hasErrorScenarios ? 0.4 : 0) + 
                   (hasSecurityValidation ? 0.4 : 0) + 
                   (hasNetworkTesting ? 0.1 : 0) + 
                   (hasDataIntegrity ? 0.1 : 0);

    this.results[fileName].compliance.edgeCasesSecurity = result;
  }

  /**
   * Evaluate Documentation Compliance
   */
  async evaluateDocumentationCompliance(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for clear test descriptions
    const hasClearDescriptions = /should.*test|should.*validate|should.*complete|test.*description/.test(content);
    if (hasClearDescriptions) {
      result.compliant.push('✅ Has clear test descriptions');
    } else {
      result.nonCompliant.push('❌ Missing clear test descriptions');
      this.addTodo(fileName, 'P1', 'Add clear test descriptions', 
        `// TODO: Add clear test descriptions to ${fileName}
// - Use descriptive test names that explain what is being tested
// - Include context about user scenarios being validated
// - Document expected outcomes and success criteria
// - Reference relevant documentation sections when applicable`);
    }

    // Check for documentation references
    const hasDocReferences = /docs\/|documentation|prd\.md|ux_spec\.md|implementation.*plan/.test(content);
    if (hasDocReferences) {
      result.compliant.push('✅ References relevant documentation');
    } else {
      result.nonCompliant.push('❌ Missing documentation references');
      this.addTodo(fileName, 'P2', 'Add documentation references', 
        `// TODO: Add documentation references to ${fileName}
// - Reference relevant sections of docs/prd.md for feature requirements
// - Reference docs/UX_SPEC.md for UX compliance requirements
// - Reference docs/implementation-plan.md for current project status
// - Include links to API documentation when testing API integrations`);
    }

    // Check for cross-referencing
    const hasCrossReferences = /see.*also|related.*test|similar.*test|compare.*with/.test(content);
    if (hasCrossReferences) {
      result.compliant.push('✅ Includes cross-references to related tests');
    } else {
      result.nonCompliant.push('❌ Missing cross-references to related tests');
      this.addTodo(fileName, 'P2', 'Add cross-references to related tests', 
        `// TODO: Add cross-references to related tests in ${fileName}
// - Reference similar tests for comparison
// - Link to integration tests that test the same functionality
// - Reference unit tests for component-level validation
// - Include notes about test dependencies and relationships`);
    }

    // Check for implementation plan alignment
    const hasImplementationAlignment = /p0|p1|p2|priority|phase.*\d|step.*\d/.test(content);
    if (hasImplementationAlignment) {
      result.compliant.push('✅ Aligns with implementation plan priorities');
    } else {
      result.nonCompliant.push('❌ Missing implementation plan alignment');
      this.addTodo(fileName, 'P1', 'Add implementation plan alignment', 
        `// TODO: Add implementation plan alignment to ${fileName}
// - Reference P0/P1/P2 priorities from implementation plan
// - Align test coverage with current development phase
// - Ensure tests validate completed implementation steps
// - Reference specific implementation plan sections`);
    }

    // Calculate score
    let score = 0;
    if (hasClearDescriptions) score += 0.4;
    if (hasDocReferences) score += 0.3;
    if (hasCrossReferences) score += 0.2;
    if (hasImplementationAlignment) score += 0.1;

    result.score = Math.min(1, score);
    this.results[fileName].compliance.documentationCompliance = result;
  }

  /**
   * Calculate overall compliance score
   */
  calculateOverallScore(fileName) {
    const compliance = this.results[fileName].compliance;
    let totalScore = 0;

    Object.keys(CRITERIA_WEIGHTS).forEach(criteria => {
      if (compliance[criteria]) {
        totalScore += compliance[criteria].score * CRITERIA_WEIGHTS[criteria];
      }
    });

    this.results[fileName].score = Math.round(totalScore * 100);
  }

  /**
   * Generate priority recommendations
   */
  generateRecommendations(fileName) {
    const result = this.results[fileName];
    const recommendations = [];

    // P0 (Critical) recommendations
    const p0Issues = this.todos.filter(todo => todo.file === fileName && todo.priority === 'P0');
    if (p0Issues.length > 0) {
      recommendations.push('🚨 **P0 (Critical) Issues:**');
      p0Issues.forEach(issue => {
        recommendations.push(`- ${issue.description}`);
      });
    }

    // P1 (High) recommendations
    const p1Issues = this.todos.filter(todo => todo.file === fileName && todo.priority === 'P1');
    if (p1Issues.length > 0) {
      recommendations.push('⚠️ **P1 (High) Issues:**');
      p1Issues.forEach(issue => {
        recommendations.push(`- ${issue.description}`);
      });
    }

    // P2 (Medium) recommendations
    const p2Issues = this.todos.filter(todo => todo.file === fileName && todo.priority === 'P2');
    if (p2Issues.length > 0) {
      recommendations.push('📝 **P2 (Medium) Issues:**');
      p2Issues.forEach(issue => {
        recommendations.push(`- ${issue.description}`);
      });
    }

    result.recommendations = recommendations;
  }

  /**
   * Add TODO item
   */
  addTodo(file, priority, description, code) {
    this.todos.push({
      file,
      priority,
      description,
      code
    });
  }

  /**
   * Implement TODOs in the test file
   */
  async implementTodos(testFilePath) {
    const fileName = path.basename(testFilePath);
    const fileTodos = this.todos.filter(todo => todo.file === fileName);
    
    if (fileTodos.length === 0) {
      console.log(`✅ No TODOs to implement for ${fileName}`);
      return;
    }

    console.log(`🔧 Implementing ${fileTodos.length} TODOs for ${fileName}`);
    
    let content = fs.readFileSync(testFilePath, 'utf8');
    
    // Sort TODOs by priority (P0 first, then P1, then P2)
    const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2 };
    fileTodos.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Add TODOs to the file
    fileTodos.forEach(todo => {
      const todoComment = `\n${todo.code}\n`;
      
      // Add TODO at the end of the file
      content += todoComment;
      
      console.log(`  ✅ Added ${todo.priority} TODO: ${todo.description}`);
    });

    // Write the updated content back to the file
    fs.writeFileSync(testFilePath, content);
    console.log(`✅ Updated ${testFilePath} with ${fileTodos.length} TODOs`);
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('\n📊 E2E Test Evaluation Report');
    console.log('=' .repeat(50));

    Object.keys(this.results).forEach(fileName => {
      const result = this.results[fileName];
      
      console.log(`\n📁 ${fileName}`);
      console.log(`📊 Overall Compliance Score: ${result.score}%`);
      
      // Show compliance breakdown
      Object.keys(result.compliance).forEach(criteria => {
        const compliance = result.compliance[criteria];
        console.log(`  ${criteria}: ${Math.round(compliance.score * 100)}%`);
      });

      // Show waiting strategies details (new section)
      if (result.compliance.waitingStrategies) {
        const waiting = result.compliance.waitingStrategies;
        console.log('\n⏱️  Waiting Strategies Analysis:');
        
        if (waiting.compliant.length > 0) {
          console.log('  ✅ Strong Areas:');
          waiting.compliant.forEach(item => {
            console.log(`    ${item}`);
          });
        }
        
        if (waiting.nonCompliant.length > 0) {
          console.log('  ❌ Areas for Improvement:');
          waiting.nonCompliant.forEach(item => {
            console.log(`    ${item}`);
          });
        }
      }

      // Show modal behavior details (new section)
      if (result.compliance.modalBehavior) {
        const modal = result.compliance.modalBehavior;
        console.log('\n🪟 Modal Behavior Analysis:');
        
        if (modal.compliant.length > 0) {
          console.log('  ✅ Strong Areas:');
          modal.compliant.forEach(item => {
            console.log(`    ${item}`);
          });
        }
        
        if (modal.nonCompliant.length > 0) {
          console.log('  ❌ Areas for Improvement:');
          modal.nonCompliant.forEach(item => {
            console.log(`    ${item}`);
          });
        }
      }

      // Show test reliability details (new section)
      if (result.compliance.testReliability) {
        const reliability = result.compliance.testReliability;
        console.log('\n🛡️  Test Reliability Analysis:');
        
        if (reliability.compliant.length > 0) {
          console.log('  ✅ Strong Areas:');
          reliability.compliant.forEach(item => {
            console.log(`    ${item}`);
          });
        }
        
        if (reliability.nonCompliant.length > 0) {
          console.log('  ❌ Areas for Improvement:');
          reliability.nonCompliant.forEach(item => {
            console.log(`    ${item}`);
          });
        }
      }

      // Show E2E vs API separation details (new section)
      if (result.compliance.e2EvsAPISeparation) {
        const e2eApi = result.compliance.e2EvsAPISeparation;
        console.log('\n🎯 E2E vs API Separation Analysis:');
        
        if (e2eApi.compliant.length > 0) {
          console.log('  ✅ Strong Areas:');
          e2eApi.compliant.forEach(item => {
            console.log(`    ${item}`);
          });
        }
        
        if (e2eApi.nonCompliant.length > 0) {
          console.log('  ❌ Areas for Improvement:');
          e2eApi.nonCompliant.forEach(item => {
            console.log(`    ${item}`);
          });
        }
      }

      // Show compliant areas
      if (result.compliance.prdCompliance?.compliant.length > 0) {
        console.log('\n✅ Compliant Areas:');
        result.compliance.prdCompliance.compliant.forEach(item => {
          console.log(`  ${item}`);
        });
      }

      // Show non-compliant areas
      if (result.compliance.prdCompliance?.nonCompliant.length > 0) {
        console.log('\n❌ Non-Compliant Areas:');
        result.compliance.prdCompliance.nonCompliant.forEach(item => {
          console.log(`  ${item}`);
        });
      }

      // Show recommendations
      if (result.recommendations.length > 0) {
        console.log('\n🎯 Priority Recommendations:');
        result.recommendations.forEach(rec => {
          console.log(`  ${rec}`);
        });
      }

      console.log('\n' + '-'.repeat(50));
    });

    // Summary statistics
    const totalFiles = Object.keys(this.results).length;
    const avgScore = Object.values(this.results).reduce((sum, result) => sum + result.score, 0) / totalFiles;
    const p0Todos = this.todos.filter(todo => todo.priority === 'P0').length;
    const p1Todos = this.todos.filter(todo => todo.priority === 'P1').length;
    const p2Todos = this.todos.filter(todo => todo.priority === 'P2').length;

    // Calculate average scores for each criteria
    const avgPRDScore = Object.values(this.results).reduce((sum, result) => 
      sum + (result.compliance.prdCompliance?.score || 0), 0) / totalFiles;
    const avgImplementationScore = Object.values(this.results).reduce((sum, result) => 
      sum + (result.compliance.implementationPlanCompliance?.score || 0), 0) / totalFiles;
    const avgUXScore = Object.values(this.results).reduce((sum, result) => 
      sum + (result.compliance.uxSpecCompliance?.score || 0), 0) / totalFiles;
    const avgTestingScore = Object.values(this.results).reduce((sum, result) => 
      sum + (result.compliance.testingBestPractices?.score || 0), 0) / totalFiles;
    const avgE2EvsAPIScore = Object.values(this.results).reduce((sum, result) => 
      sum + (result.compliance.e2EvsAPISeparation?.score || 0), 0) / totalFiles;
    const avgWaitingScore = Object.values(this.results).reduce((sum, result) => 
      sum + (result.compliance.waitingStrategies?.score || 0), 0) / totalFiles;
    const avgModalScore = Object.values(this.results).reduce((sum, result) => 
      sum + (result.compliance.modalBehavior?.score || 0), 0) / totalFiles;
    const avgReliabilityScore = Object.values(this.results).reduce((sum, result) => 
      sum + (result.compliance.testReliability?.score || 0), 0) / totalFiles;
    const avgStateManagementScore = Object.values(this.results).reduce((sum, result) => 
      sum + (result.compliance.stateManagement?.score || 0), 0) / totalFiles;
    const avgPerformanceScore = Object.values(this.results).reduce((sum, result) => 
      sum + (result.compliance.performanceTesting?.score || 0), 0) / totalFiles;
    const avgAdvancedSecurityScore = Object.values(this.results).reduce((sum, result) => 
      sum + (result.compliance.advancedSecurity?.score || 0), 0) / totalFiles;
    const avgSEOScore = Object.values(this.results).reduce((sum, result) => 
      sum + (result.compliance.seoTesting?.score || 0), 0) / totalFiles;
    const avgPWAScore = Object.values(this.results).reduce((sum, result) => 
      sum + (result.compliance.pwaTesting?.score || 0), 0) / totalFiles;
    const avgAnalyticsScore = Object.values(this.results).reduce((sum, result) => 
      sum + (result.compliance.analyticsMonitoring?.score || 0), 0) / totalFiles;
    const avgSecurityScore = Object.values(this.results).reduce((sum, result) => 
      sum + (result.compliance.edgeCasesSecurity?.score || 0), 0) / totalFiles;

    // Categorize TODOs by type
    const waitingTodos = this.todos.filter(todo => 
      todo.description.includes('waiting') || 
      todo.description.includes('delay') || 
      todo.description.includes('timeout') ||
      todo.description.includes('dynamic')
    );
    const waitingP0Todos = waitingTodos.filter(todo => todo.priority === 'P0').length;
    const waitingP1Todos = waitingTodos.filter(todo => todo.priority === 'P1').length;

    const accessibilityTodos = this.todos.filter(todo => 
      todo.description.includes('accessibility') || 
      todo.description.includes('form accessibility') ||
      todo.description.includes('screen reader') ||
      todo.description.includes('keyboard navigation') ||
      todo.description.includes('mobile responsiveness')
    );
    const accessibilityP0Todos = accessibilityTodos.filter(todo => todo.priority === 'P0').length;
    const accessibilityP1Todos = accessibilityTodos.filter(todo => todo.priority === 'P1').length;

    const prdTodos = this.todos.filter(todo => 
      todo.description.includes('business logic') ||
      todo.description.includes('feature') ||
      todo.description.includes('workflow') ||
      todo.description.includes('connection') ||
      todo.description.includes('secret')
    );
    const prdP0Todos = prdTodos.filter(todo => todo.priority === 'P0').length;
    const prdP1Todos = prdTodos.filter(todo => todo.priority === 'P1').length;

    const implementationTodos = this.todos.filter(todo => 
      todo.description.includes('real data') ||
      todo.description.includes('mocked data') ||
      todo.description.includes('error handling') ||
      todo.description.includes('cleanup') ||
      todo.description.includes('test data')
    );
    const implementationP0Todos = implementationTodos.filter(todo => todo.priority === 'P0').length;
    const implementationP1Todos = implementationTodos.filter(todo => todo.priority === 'P1').length;

    const testingTodos = this.todos.filter(todo => 
      todo.description.includes('UXComplianceHelper') ||
      todo.description.includes('authentication') ||
      todo.description.includes('database') ||
      todo.description.includes('cleanup') ||
      todo.description.includes('test data')
    );
    const testingP0Todos = testingTodos.filter(todo => todo.priority === 'P0').length;
    const testingP1Todos = testingTodos.filter(todo => todo.priority === 'P1').length;

    const e2eApiTodos = this.todos.filter(todo => 
      todo.description.includes('API testing') ||
      todo.description.includes('Remove API calls') ||
      todo.description.includes('UI interaction') ||
      todo.description.includes('user journey') ||
      todo.description.includes('E2E test structure')
    );
    const e2eApiP0Todos = e2eApiTodos.filter(todo => todo.priority === 'P0').length;
    const e2eApiP1Todos = e2eApiTodos.filter(todo => todo.priority === 'P1').length;

    const securityTodos = this.todos.filter(todo => 
      todo.description.includes('error scenario') ||
      todo.description.includes('security validation') ||
      todo.description.includes('network') ||
      todo.description.includes('data integrity')
    );
    const securityP0Todos = securityTodos.filter(todo => todo.priority === 'P0').length;
    const securityP1Todos = securityTodos.filter(todo => todo.priority === 'P1').length;

    const modalTodos = this.todos.filter(todo => 
      todo.description.includes('modal') ||
      todo.description.includes('dialog') ||
      todo.description.includes('submit button') ||
      todo.description.includes('success message') ||
      todo.description.includes('modal delay')
    );
    const modalP0Todos = modalTodos.filter(todo => todo.priority === 'P0').length;
    const modalP1Todos = modalTodos.filter(todo => todo.priority === 'P1').length;

    const reliabilityTodos = this.todos.filter(todo => 
      todo.description.includes('test isolation') ||
      todo.description.includes('data cleanup') ||
      todo.description.includes('stable selectors') ||
      todo.description.includes('retry mechanisms') ||
      todo.description.includes('deterministic data') ||
      todo.description.includes('test independence') ||
      todo.description.includes('parallel execution')
    );
    const reliabilityP0Todos = reliabilityTodos.filter(todo => todo.priority === 'P0').length;
    const reliabilityP1Todos = reliabilityTodos.filter(todo => todo.priority === 'P1').length;

    const stateManagementTodos = this.todos.filter(todo => 
      todo.description.includes('URL state') ||
      todo.description.includes('form state persistence') ||
      todo.description.includes('session management') ||
      todo.description.includes('data synchronization')
    );
    const stateManagementP0Todos = stateManagementTodos.filter(todo => todo.priority === 'P0').length;
    const stateManagementP1Todos = stateManagementTodos.filter(todo => todo.priority === 'P1').length;

    const performanceTodos = this.todos.filter(todo => 
      todo.description.includes('page load time') ||
      todo.description.includes('memory leak') ||
      todo.description.includes('concurrent operations') ||
      todo.description.includes('API performance')
    );
    const performanceP0Todos = performanceTodos.filter(todo => todo.priority === 'P0').length;
    const performanceP1Todos = performanceTodos.filter(todo => todo.priority === 'P1').length;

    const advancedSecurityTodos = this.todos.filter(todo => 
      todo.description.includes('XSS prevention') ||
      todo.description.includes('CSRF protection') ||
      todo.description.includes('data exposure') ||
      todo.description.includes('authentication flow')
    );
    const advancedSecurityP0Todos = advancedSecurityTodos.filter(todo => todo.priority === 'P0').length;
    const advancedSecurityP1Todos = advancedSecurityTodos.filter(todo => todo.priority === 'P1').length;

    const seoTodos = this.todos.filter(todo => 
      todo.description.includes('meta tag') ||
      todo.description.includes('structured data') ||
      todo.description.includes('URL structure') ||
      todo.description.includes('sitemap')
    );
    const seoP0Todos = seoTodos.filter(todo => todo.priority === 'P0').length;
    const seoP1Todos = seoTodos.filter(todo => todo.priority === 'P1').length;

    const pwaTodos = this.todos.filter(todo => 
      todo.description.includes('service worker') ||
      todo.description.includes('app manifest') ||
      todo.description.includes('push notification') ||
      todo.description.includes('background sync')
    );
    const pwaP0Todos = pwaTodos.filter(todo => todo.priority === 'P0').length;
    const pwaP1Todos = pwaTodos.filter(todo => todo.priority === 'P1').length;

    const analyticsTodos = this.todos.filter(todo => 
      todo.description.includes('event tracking') ||
      todo.description.includes('error monitoring') ||
      todo.description.includes('performance monitoring') ||
      todo.description.includes('business metrics')
    );
    const analyticsP0Todos = analyticsTodos.filter(todo => todo.priority === 'P0').length;
    const analyticsP1Todos = analyticsTodos.filter(todo => todo.priority === 'P1').length;

    console.log('\n📈 Summary Statistics:');
    console.log(`  Total Files Evaluated: ${totalFiles}`);
    console.log(`  Average Compliance Score: ${Math.round(avgScore)}%`);
    console.log(`  P0 (Critical) TODOs: ${p0Todos}`);
    console.log(`  P1 (High) TODOs: ${p1Todos}`);
    console.log(`  P2 (Medium) TODOs: ${p2Todos}`);
    console.log(`  Total TODOs: ${this.todos.length}`);

    console.log('\n📊 Criteria Breakdown:');
    console.log(`  PRD Compliance: ${Math.round(avgPRDScore * 100)}% (${prdTodos.length} TODOs)`);
    console.log(`  Implementation Plan: ${Math.round(avgImplementationScore * 100)}% (${implementationTodos.length} TODOs)`);
    console.log(`  UX Specification: ${Math.round(avgUXScore * 100)}% (${accessibilityTodos.length} TODOs)`);
    console.log(`  Testing Best Practices: ${Math.round(avgTestingScore * 100)}% (${testingTodos.length} TODOs)`);
    console.log(`  E2E vs API Separation: ${Math.round(avgE2EvsAPIScore * 100)}% (${e2eApiTodos.length} TODOs)`);
    console.log(`  Waiting Strategies: ${Math.round(avgWaitingScore * 100)}% (${waitingTodos.length} TODOs)`);
    console.log(`  Modal Behavior: ${Math.round(avgModalScore * 100)}% (${modalTodos.length} TODOs)`);
    console.log(`  Test Reliability: ${Math.round(avgReliabilityScore * 100)}% (${reliabilityTodos.length} TODOs)`);
    console.log(`  State Management: ${Math.round(avgStateManagementScore * 100)}% (${stateManagementTodos.length} TODOs)`);
    console.log(`  Performance & Load: ${Math.round(avgPerformanceScore * 100)}% (${performanceTodos.length} TODOs)`);
    console.log(`  Advanced Security: ${Math.round(avgAdvancedSecurityScore * 100)}% (${advancedSecurityTodos.length} TODOs)`);
    console.log(`  SEO & Meta: ${Math.round(avgSEOScore * 100)}% (${seoTodos.length} TODOs)`);
    console.log(`  PWA Features: ${Math.round(avgPWAScore * 100)}% (${pwaTodos.length} TODOs)`);
    console.log(`  Analytics & Monitoring: ${Math.round(avgAnalyticsScore * 100)}% (${analyticsTodos.length} TODOs)`);
    console.log(`  Security & Edge Cases: ${Math.round(avgSecurityScore * 100)}% (${securityTodos.length} TODOs)`);
    
    console.log('\n🎯 Detailed TODO Breakdown:');
    console.log(`  📋 PRD Compliance TODOs: ${prdTodos.length} (P0: ${prdP0Todos}, P1: ${prdP1Todos})`);
    console.log(`  🔧 Implementation TODOs: ${implementationTodos.length} (P0: ${implementationP0Todos}, P1: ${implementationP1Todos})`);
    console.log(`  ♿ Accessibility TODOs: ${accessibilityTodos.length} (P0: ${accessibilityP0Todos}, P1: ${accessibilityP1Todos})`);
    console.log(`  🧪 Testing Practice TODOs: ${testingTodos.length} (P0: ${testingP0Todos}, P1: ${testingP1Todos})`);
    console.log(`  🎯 E2E vs API Separation TODOs: ${e2eApiTodos.length} (P0: ${e2eApiP0Todos}, P1: ${e2eApiP1Todos})`);
    console.log(`  ⏱️  Waiting Strategy TODOs: ${waitingTodos.length} (P0: ${waitingP0Todos}, P1: ${waitingP1Todos})`);
    console.log(`  🪟 Modal Behavior TODOs: ${modalTodos.length} (P0: ${modalP0Todos}, P1: ${modalP1Todos})`);
    console.log(`  🛡️  Test Reliability TODOs: ${reliabilityTodos.length} (P0: ${reliabilityP0Todos}, P1: ${reliabilityP1Todos})`);
    console.log(`  🔄 State Management TODOs: ${stateManagementTodos.length} (P0: ${stateManagementP0Todos}, P1: ${stateManagementP1Todos})`);
    console.log(`  ⚡ Performance TODOs: ${performanceTodos.length} (P0: ${performanceP0Todos}, P1: ${performanceP1Todos})`);
    console.log(`  🔒 Advanced Security TODOs: ${advancedSecurityTodos.length} (P0: ${advancedSecurityP0Todos}, P1: ${advancedSecurityP1Todos})`);
    console.log(`  🔍 SEO TODOs: ${seoTodos.length} (P0: ${seoP0Todos}, P1: ${seoP1Todos})`);
    console.log(`  📱 PWA TODOs: ${pwaTodos.length} (P0: ${pwaP0Todos}, P1: ${pwaP1Todos})`);
    console.log(`  📊 Analytics TODOs: ${analyticsTodos.length} (P0: ${analyticsP0Todos}, P1: ${analyticsP1Todos})`);
    console.log(`  🔒 Security TODOs: ${securityTodos.length} (P0: ${securityP0Todos}, P1: ${securityP1Todos})`);
  }

  /**
   * Evaluate all E2E test files
   */
  async evaluateAllTests() {
    console.log('🔍 Evaluating all E2E test files...');
    
    const testFiles = this.findTestFiles(TEST_DIR);
    
    for (const testFile of testFiles) {
      await this.evaluateTestFile(testFile);
    }
    
    this.generateReport();
  }

  /**
   * Find all test files in the given directory
   */
  findTestFiles(dir) {
    const testFiles = [];
    
    if (!fs.existsSync(dir)) {
      return testFiles;
    }

    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        testFiles.push(...this.findTestFiles(fullPath));
      } else if (item.endsWith('.test.ts') || item.endsWith('.test.js')) {
        testFiles.push(fullPath);
      }
    }
    
    return testFiles;
  }
}

// Main execution
async function main() {
  const evaluator = new E2ETestEvaluator();
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Evaluate all test files
    await evaluator.evaluateAllTests();
  } else {
    // Evaluate specific test file
    const testFilePath = args[0];
    await evaluator.evaluateTestFile(testFilePath);
    evaluator.generateReport();
    
    // Ask if user wants to implement TODOs
    if (evaluator.todos.length > 0) {
      console.log('\n🔧 Would you like to implement the TODOs? (y/n)');
      process.stdin.once('data', async (data) => {
        const answer = data.toString().trim().toLowerCase();
        if (answer === 'y' || answer === 'yes') {
          await evaluator.implementTodos(testFilePath);
        }
        process.exit(0);
      });
    }
  }
}

// Run the evaluator
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { E2ETestEvaluator }; 