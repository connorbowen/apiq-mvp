#!/usr/bin/env node

/**
 * Add P0 TODOs to E2E Test Files
 * 
 * This script adds comprehensive P0 (Critical) TODOs to all E2E test files
 * based on the evaluation results from evaluate-e2e-tests.js
 */

const fs = require('fs');
const path = require('path');

// P0 TODO templates organized by category
const P0_TODOS = {
  // E2E vs API Separation (37 P0 issues)
  e2eApiSeparation: [
    {
      title: 'Remove API calls from E2E tests',
      description: 'E2E tests should only test user interactions through the UI',
      code: `// TODO: Remove API calls from E2E tests (P0)
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
// - await page.click('[data-testid="primary-action submit-btn"]')`
    },
    {
      title: 'Remove all API testing from E2E tests',
      description: 'Found API testing patterns that violate E2E testing principles',
      code: `// TODO: Remove all API testing from E2E tests (P0)
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
// - await expect(page.locator('[data-testid="success-message"]')).toBeVisible()`
    }
  ],

  // Testing Best Practices (119 P0 issues)
  testingBestPractices: [
    {
      title: 'Add UXComplianceHelper integration',
      description: 'Missing UXComplianceHelper usage for accessibility and UX compliance',
      code: `// TODO: Add UXComplianceHelper integration (P0)
// import { UXComplianceHelper } from '../../helpers/uxCompliance';
// 
// test.beforeEach(async ({ page }) => {
//   const uxHelper = new UXComplianceHelper(page);
//   await uxHelper.validateActivationFirstUX();
//   await uxHelper.validateFormAccessibility();
//   await uxHelper.validateMobileResponsiveness();
//   await uxHelper.validateKeyboardNavigation();
// });`
    },
    {
      title: 'Add cookie-based authentication testing',
      description: 'Missing cookie-based authentication testing',
      code: `// TODO: Add cookie-based authentication testing (P0)
// - Test HTTP-only cookie authentication
// - Test secure cookie settings
// - Test cookie expiration and cleanup
// - Test cookie-based session management
// - Test authentication state persistence via cookies`
    },
    {
      title: 'Replace localStorage with cookie-based authentication',
      description: 'Uses localStorage for authentication (anti-pattern - should use cookies)',
      code: `// TODO: Replace localStorage with cookie-based authentication (P0)
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
// - Test logout by clearing authentication cookies`
    },
    {
      title: 'Add data cleanup patterns',
      description: 'Missing data cleanup patterns',
      code: `// TODO: Add data cleanup patterns (P0)
// - Clean up test users: await prisma.user.deleteMany({ where: { email: { contains: 'e2e-test' } } });
// - Clean up test connections: await prisma.connection.deleteMany({ where: { name: { contains: 'Test' } } });
// - Clean up test workflows: await prisma.workflow.deleteMany({ where: { name: { contains: 'Test' } } });
// - Clean up test secrets: await prisma.secret.deleteMany({ where: { name: { contains: 'Test' } } });`
    },
    {
      title: 'Add deterministic test data',
      description: 'Missing deterministic test data',
      code: `// TODO: Add deterministic test data (P0)
// - Create predictable test data with unique identifiers
// - Use timestamps or UUIDs to avoid conflicts
// - Example: const testUser = await createTestUser({ email: \`e2e-test-\${Date.now()}@example.com\` });
// - Ensure test data is isolated and doesn't interfere with other tests`
    },
    {
      title: 'Ensure test independence',
      description: 'Tests may have shared state dependencies',
      code: `// TODO: Ensure test independence (P0)
// - Each test should be able to run in isolation
// - No dependencies on other test execution order
// - Clean state before and after each test
// - Use unique identifiers for all test data
// - Avoid global state modifications`
    }
  ],

  // Modal Behavior (20 P0 issues)
  modalBehavior: [
    {
      title: 'Add submit button loading state testing',
      description: 'Missing submit button loading state testing',
      code: `// TODO: Add submit button loading state testing (P0)
// - Test submit button disabled during submission
// - Test button text changes to "Creating..." or similar
// - Test button remains disabled until operation completes
// - Test loading indicator/spinner on button
// - Enforce minimum loading state duration (800ms)`
    },
    {
      title: 'Add success message testing in modal',
      description: 'Missing success message testing in modal',
      code: `// TODO: Add success message testing in modal (P0)
// - Test success message appears in modal after submission
// - Test success message is visible and readable
// - Test button text changes to "Success!" or similar
// - Test success message timing and persistence
// - Test success state before modal closes`
    },
    {
      title: 'Add modal delay testing',
      description: 'Missing modal delay testing',
      code: `// TODO: Add modal delay testing (P0)
// - Test modal stays open for 1.5s after success
// - Test user can see success message before modal closes
// - Test modal closes automatically after delay
// - Test modal remains open on error for user correction
// - Example: setTimeout(() => closeModal(), 1500);`
    },
    {
      title: 'Add modal error handling testing',
      description: 'Missing modal error handling testing',
      code: `// TODO: Add modal error handling testing (P0)
// - Test modal stays open on error
// - Test error message appears in modal
// - Test submit button re-enables on error
// - Test user can correct errors and retry`
    },
    {
      title: 'Add form loading state transition testing',
      description: 'Missing form loading state transition testing',
      code: `// TODO: Add form loading state transition testing (P0)
// - Test form fields disabled during submission
// - Test loading spinner appears on form
// - Test form transitions from loading to success/error
// - Test minimum loading duration (800ms) for all forms
// - Test form state persistence during loading`
    }
  ],

  // Waiting Strategies (27 P0 issues)
  waitingStrategies: [
    {
      title: 'Add robust waiting patterns for dynamic elements',
      description: 'Missing robust waiting patterns for dynamic elements',
      code: `// TODO: Add robust waiting patterns for dynamic elements (P0)
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
// await page.waitForFunction(() => document.querySelector('.loading').style.display === 'none');`
    },
    {
      title: 'Replace hardcoded delays with robust waiting',
      description: 'Uses hardcoded delays (anti-pattern)',
      code: `// TODO: Replace hardcoded delays with robust waiting (P0)
// Anti-patterns to replace:
// - setTimeout(5000) → await page.waitForSelector(selector, { timeout: 5000 })
// - sleep(3000) → await expect(page.locator(selector)).toBeVisible({ timeout: 3000 })
// - delay(2000) → await page.waitForLoadState('networkidle')
// 
// Best practices:
// - Wait for specific elements to appear
// - Wait for network requests to complete
// - Wait for page state changes
// - Use appropriate timeouts for different operations`
    }
  ],

  // Advanced Security (84 P0 issues)
  advancedSecurity: [
    {
      title: 'Add XSS prevention testing',
      description: 'Missing XSS prevention testing',
      code: `// TODO: Add XSS prevention testing (P0)
// - Test input sanitization
// - Test script injection prevention
// - Test HTML escaping
// - Test content security policy compliance`
    },
    {
      title: 'Add CSRF protection testing',
      description: 'Missing CSRF protection testing',
      code: `// TODO: Add CSRF protection testing (P0)
// - Test CSRF token validation
// - Test cross-site request forgery prevention
// - Test cookie-based CSRF protection
// - Test secure form submission`
    },
    {
      title: 'Add data exposure testing',
      description: 'Missing data exposure testing',
      code: `// TODO: Add data exposure testing (P0)
// - Test sensitive data handling
// - Test privacy leak prevention
// - Test information disclosure prevention
// - Test data encryption and protection`
    },
    {
      title: 'Add authentication flow testing',
      description: 'Missing authentication flow testing',
      code: `// TODO: Add authentication flow testing (P0)
// - Test OAuth integration
// - Test SSO (Single Sign-On) flows
// - Test MFA (Multi-Factor Authentication)
// - Test authentication state management`
    }
  ],

  // Session Management (27 P0 issues)
  sessionManagement: [
    {
      title: 'Add session management testing',
      description: 'Missing session management testing',
      code: `// TODO: Add session management testing (P0)
// - Test cookie-based session management
// - Test session expiration handling
// - Test login state persistence
// - Test logout and session cleanup`
    }
  ],

  // UI Interactions (P0 issues)
  uiInteractions: [
    {
      title: 'Add UI interaction testing',
      description: 'Missing UI interaction testing',
      code: `// TODO: Add UI interaction testing (P0)
// E2E tests should focus on user interactions through the UI
// - Test clicking buttons and links
// - Test filling forms
// - Test navigation flows
// - Test user workflows end-to-end`
    }
  ],

  // Primary Action Patterns (P0 issues)
  primaryActionPatterns: [
    {
      title: 'Add primary action button patterns',
      description: 'Missing primary action button patterns',
      code: `// TODO: Add primary action button patterns (P0)
// - Use data-testid="primary-action {action}-btn" pattern
// - Test primary action presence with UXComplianceHelper
// - Validate button text matches standardized patterns`
    }
  ],

  // Form Accessibility (P0 issues)
  formAccessibility: [
    {
      title: 'Add form accessibility testing',
      description: 'Missing form accessibility testing',
      code: `// TODO: Add form accessibility testing (P0)
// - Test form labels and ARIA attributes
// - Test keyboard navigation
// - Test screen reader compatibility
// - Use UXComplianceHelper.validateFormAccessibility()`
    }
  ],

  // Workflow Engine Testing (P0 issues)
  workflowEngine: [
    {
      title: 'Add workflow execution engine testing',
      description: 'Missing workflow execution engine testing',
      code: `// TODO: Add workflow execution engine testing (P0)
// - Test workflow execution from start to finish
// - Test step-by-step execution
// - Test execution state management
// - Test execution error handling
// - Test execution monitoring and logging`
    },
    {
      title: 'Add natural language workflow creation testing',
      description: 'Missing natural language workflow creation testing',
      code: `// TODO: Add natural language workflow creation testing (P0)
// - Test workflow generation from natural language descriptions
// - Test complex multi-step workflow creation
// - Test workflow parameter mapping
// - Test workflow validation and error handling`
    }
  ]
};

/**
 * Add P0 TODOs to a test file
 */
function addP0TodosToFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Skip if file already has P0 TODOs
  if (content.includes('TODO.*P0') || content.includes('// TODO:') && content.includes('(P0)')) {
    console.log(`⚠️  File already has P0 TODOs: ${fileName}`);
    return;
  }

  let updatedContent = content;
  let todosAdded = 0;

  // Add P0 TODOs based on file context
  const lowerContent = content.toLowerCase();
  const lowerFileName = fileName.toLowerCase();

  // Determine test context
  let context = 'general';
  if (lowerFileName.includes('auth') || lowerContent.includes('login') || lowerContent.includes('signup')) {
    context = 'authentication';
  } else if (lowerFileName.includes('workflow') || lowerContent.includes('workflow')) {
    context = 'workflow';
  } else if (lowerFileName.includes('connection') || lowerContent.includes('connection')) {
    context = 'connection';
  } else if (lowerFileName.includes('secret') || lowerContent.includes('secret')) {
    context = 'secrets';
  } else if (lowerFileName.includes('dashboard') || lowerContent.includes('dashboard')) {
    context = 'dashboard';
  }

  // Add context-appropriate P0 TODOs
  const todosToAdd = [];

  // Always add these core P0 TODOs
  todosToAdd.push(...P0_TODOS.testingBestPractices);
  todosToAdd.push(...P0_TODOS.e2eApiSeparation);
  todosToAdd.push(...P0_TODOS.waitingStrategies);
  todosToAdd.push(...P0_TODOS.advancedSecurity);
  todosToAdd.push(...P0_TODOS.sessionManagement);
  todosToAdd.push(...P0_TODOS.uiInteractions);
  todosToAdd.push(...P0_TODOS.primaryActionPatterns);
  todosToAdd.push(...P0_TODOS.formAccessibility);

  // Add context-specific TODOs
  if (context === 'workflow') {
    todosToAdd.push(...P0_TODOS.workflowEngine);
  }

  // Add modal behavior TODOs if the test has modal interactions
  if (lowerContent.includes('modal') || lowerContent.includes('dialog') || lowerContent.includes('popup')) {
    todosToAdd.push(...P0_TODOS.modalBehavior);
  }

  // Add TODOs to the file
  todosToAdd.forEach(todo => {
    const todoComment = `\n${todo.code}\n`;
    updatedContent += todoComment;
    todosAdded++;
  });

  // Write the updated content back to the file
  if (todosAdded > 0) {
    fs.writeFileSync(filePath, updatedContent);
    console.log(`✅ Added ${todosAdded} P0 TODOs to ${fileName}`);
  } else {
    console.log(`ℹ️  No P0 TODOs needed for ${fileName}`);
  }

  return todosAdded;
}

/**
 * Find all test files in the given directory
 */
function findTestFiles(dir) {
  const testFiles = [];
  
  if (!fs.existsSync(dir)) {
    return testFiles;
  }

  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      testFiles.push(...findTestFiles(fullPath));
    } else if (item.endsWith('.test.ts') || item.endsWith('.test.js')) {
      testFiles.push(fullPath);
    }
  }
  
  return testFiles;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Adding P0 TODOs to E2E test files...\n');
  
  const TEST_DIR = 'tests/e2e';
  const testFiles = findTestFiles(TEST_DIR);
  
  if (testFiles.length === 0) {
    console.log('❌ No test files found in', TEST_DIR);
    return;
  }

  console.log(`📁 Found ${testFiles.length} test files\n`);
  
  let totalTodosAdded = 0;
  let filesUpdated = 0;

  for (const testFile of testFiles) {
    const todosAdded = addP0TodosToFile(testFile);
    if (todosAdded > 0) {
      totalTodosAdded += todosAdded;
      filesUpdated++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Files processed: ${testFiles.length}`);
  console.log(`  Files updated: ${filesUpdated}`);
  console.log(`  Total P0 TODOs added: ${totalTodosAdded}`);
  console.log(`  Average TODOs per file: ${Math.round(totalTodosAdded / filesUpdated || 0)}`);
  
  console.log('\n🎯 Next Steps:');
  console.log('  1. Review the added P0 TODOs in each test file');
  console.log('  2. Prioritize implementation based on criticality');
  console.log('  3. Start with E2E vs API separation issues');
  console.log('  4. Implement UXComplianceHelper integration');
  console.log('  5. Add cookie-based authentication testing');
  console.log('  6. Remove all API calls from E2E tests');
  console.log('  7. Add comprehensive modal behavior testing');
  console.log('  8. Improve waiting strategies to eliminate hardcoded delays');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { addP0TodosToFile, findTestFiles }; 