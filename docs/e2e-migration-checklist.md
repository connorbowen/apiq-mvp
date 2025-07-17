# E2E Test Migration Checklist

## Overview

This document provides a systematic checklist for migrating each E2E test file to use the new helper structure. Each file must be checked against these criteria to ensure proper migration, maintainability, and compliance with user-rules.md.

## Migration Checklist Template

For each E2E test file, complete the following checklist:

### 📁 File: `[FILENAME]`
**Category:** [auth|connections|workflow-engine|ui|security|performance|onboarding]  
**Priority:** [High|Medium|Low]  
**Estimated Lines:** [XXX]  
**Migration Status:** [Not Started|In Progress|Completed|Verified]

---

### 🔧 **Phase 1: Import Updates**
- [ ] **Remove old imports** - Remove imports from `testUtils.ts` that are now in specialized helpers
- [ ] **Add new helper imports** - Import from appropriate helper files:
  - [ ] `e2eHelpers.ts` - For `setupE2E`, `closeAllModals`, `resetRateLimits`, `getPrimaryActionButton`
  - [ ] `authHelpers.ts` - For `createE2EUser`, `authenticateE2EPage`
  - [ ] `uiHelpers.ts` - For `waitForDashboard`, `validateUXCompliance`
  - [ ] `dataHelpers.ts` - For test data creation/cleanup
  - [ ] `waitHelpers.ts` - For robust waiting patterns
- [ ] **Keep existing imports** - Maintain imports for specialized helpers (e.g., `oauth2TestUtils.ts`, `uxCompliance.ts`)
- [ ] **Verify import organization** - Group imports logically (core, helpers, utilities)

**Example Before:**
```typescript
import { createTestUser, cleanupTestUser, generateTestId, TestUser } from '../../helpers/testUtils';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
```

**Example After:**
```typescript
import { TestUser, generateTestId } from '../../helpers/testUtils';
import { createE2EUser, cleanupTestUser } from '../../helpers/authHelpers';
import { setupE2E, closeAllModals, resetRateLimits } from '../../helpers/e2eHelpers';
import { validateUXCompliance } from '../../helpers/uiHelpers';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
```

---

### 🔐 **Phase 2: Authentication & Setup**
- [ ] **Replace `beforeAll` logic** - Use `createE2EUser()` instead of `createTestUser()`
- [ ] **Replace `beforeEach` logic** - Use `setupE2E()` instead of inline login/navigation
- [ ] **Replace `afterAll` logic** - Use `cleanupTestUser()` for proper cleanup
- [ ] **Remove inline authentication** - Remove manual login flows
- [ ] **Remove inline navigation** - Remove manual dashboard navigation

**Example Before:**
```typescript
test.beforeEach(async ({ page }) => {
  // Clean up any existing modals first
  try {
    const modalOverlay = page.locator('.fixed.inset-0.bg-gray-600.bg-opacity-50');
    if (await modalOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      const closeButton = page.locator('button[aria-label="Close modal"]');
      if (await closeButton.isVisible({ timeout: 500 }).catch(() => false)) {
        await closeButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await modalOverlay.isHidden({ timeout: 2000 }).catch(() => {});
    }
  } catch (error) {}
  
  // Login before each test
  await page.goto('/login');
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*dashboard/);
});
```

**Example After:**
```typescript
test.beforeEach(async ({ page }) => {
  await setupE2E(page, testUser, { 
    tab: 'settings', 
    section: 'connections', 
    validateUX: true 
  });
});
```

---

### 🧹 **Phase 3: Modal & UI Management**
- [ ] **Replace modal cleanup** - Use `closeAllModals()` instead of inline modal cleanup
- [ ] **Replace rate limit reset** - Use `resetRateLimits()` instead of inline reset logic
- [ ] **Replace primary action selectors** - Use `getPrimaryActionButton()` instead of hardcoded selectors
- [ ] **Remove inline modal handling** - Remove manual modal open/close logic
- [ ] **Remove inline rate limit logic** - Remove manual rate limit management

**Example Before:**
```typescript
test.afterEach(async ({ page }) => {
  // Clean up any open modals
  try {
    const modalOverlay = page.locator('.fixed.inset-0.bg-gray-600.bg-opacity-50');
    if (await modalOverlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await modalOverlay.isHidden({ timeout: 2000 }).catch(() => {});
    }
  } catch (error) {}
  
  // Reset rate limits
  try {
    await page.request.post('/api/test/reset-rate-limits');
  } catch (error) {}
});
```

**Example After:**
```typescript
test.afterEach(async ({ page }) => {
  await closeAllModals(page);
  await resetRateLimits(page);
});
```

---

### ⏱️ **Phase 4: Waiting & State Management**
- [ ] **Replace dashboard waits** - Use `waitForDashboard()` instead of manual waits
- [ ] **Replace element waits** - Use `waitForElement()` instead of manual `waitForSelector()`
- [ ] **Replace network waits** - Use `waitForNetworkIdle()` instead of manual network waits
- [ ] **Remove inline waiting logic** - Remove manual timeout and wait patterns
- [ ] **Replace loading state waits** - Use helper functions for loading state management

**Example Before:**
```typescript
await page.waitForSelector('[data-testid="dashboard-content"]', { timeout: 10000 });
await page.waitForLoadState('networkidle');
```

**Example After:**
```typescript
await waitForDashboard(page);
```

---

### 🎯 **Phase 5: Primary Action & UX Compliance**
- [ ] **Replace primary action selectors** - Use `getPrimaryActionButton()` for all primary actions
- [ ] **Add UX compliance validation** - Use `validateUXCompliance()` for page validation
- [ ] **Replace hardcoded button selectors** - Use helper functions for button selection
- [ ] **Add accessibility validation** - Use accessibility helpers where appropriate
- [ ] **Remove inline UX validation** - Remove manual UX compliance checks

**Example Before:**
```typescript
await page.click('[data-testid="primary-action create-connection-header-btn"]');
await expect(page.locator('h2:has-text("Add API Connection")')).toBeVisible();
```

**Example After:**
```typescript
await getPrimaryActionButton(page, 'create-connection-header').click();
await validateUXCompliance(page, {
  title: 'APIQ',
  headings: 'Add API Connection',
  validateForm: true,
  validateAccessibility: true
});
```

---

### 🧪 **Phase 6: Test Data Management**
- [ ] **Replace test data creation** - Use `dataHelpers.ts` functions for data creation
- [ ] **Replace test data cleanup** - Use `dataHelpers.ts` functions for cleanup
- [ ] **Remove inline data creation** - Remove manual test data setup
- [ ] **Remove inline data cleanup** - Remove manual test data teardown
- [ ] **Use proper test isolation** - Ensure each test has clean data

**Example Before:**
```typescript
// Create test connection
const connectionData = {
  name: `Test Connection ${Date.now()}`,
  description: 'Test connection',
  baseUrl: 'https://api.example.com',
  authType: 'API_KEY',
  apiKey: 'test-key'
};
await page.request.post('/api/connections', { data: connectionData });
```

**Example After:**
```typescript
const connection = await createTestConnection({
  name: `Test Connection ${generateTestId()}`,
  description: 'Test connection',
  baseUrl: 'https://api.example.com',
  authType: 'API_KEY',
  apiKey: 'test-key'
});
```

---

### 🔍 **Phase 7: Error Handling & Validation**
- [ ] **Replace error validation** - Use helper functions for error message validation
- [ ] **Replace success validation** - Use helper functions for success message validation
- [ ] **Remove inline error handling** - Remove manual error checking logic
- [ ] **Add proper error boundaries** - Use try-catch blocks with helper functions
- [ ] **Validate error messages** - Use consistent error message validation

**Example Before:**
```typescript
try {
  await page.click('[data-testid="submit-button"]');
  await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
} catch (error) {
  console.log('Error occurred:', error);
}
```

**Example After:**
```typescript
await testModalErrorHandling(page, '[data-testid="error-message"]', 'Expected error message');
```

---

### 📊 **Phase 8: Performance & Security**
- [ ] **Add performance validation** - Use `performanceHelpers.ts` for performance testing
- [ ] **Add security validation** - Use `securityHelpers.ts` for security testing
- [ ] **Add accessibility validation** - Use `accessibilityHelpers.ts` for accessibility testing
- [ ] **Remove inline performance checks** - Remove manual performance measurement
- [ ] **Remove inline security checks** - Remove manual security validation

**Example Before:**
```typescript
const startTime = Date.now();
await page.click('[data-testid="submit-button"]');
const endTime = Date.now();
expect(endTime - startTime).toBeLessThan(5000);
```

**Example After:**
```typescript
const loadTime = await testPageLoadTime(page, '/dashboard', { threshold: 5000 });
expect(loadTime).toBeLessThan(5000);
```

---

### 🧹 **Phase 9: Code Cleanup**
- [ ] **Remove obsolete imports** - Remove unused imports
- [ ] **Remove duplicate code** - Remove any remaining duplicate logic
- [ ] **Remove inline comments** - Remove unnecessary inline comments
- [ ] **Clean up variable declarations** - Remove unused variables
- [ ] **Verify file length** - Ensure file is under 300 lines (user-rules.md compliance)

---

### ✅ **Phase 10: Validation & Testing**
- [ ] **Run individual test file** - Verify the specific file passes
- [ ] **Run related test suite** - Verify the entire category passes
- [ ] **Run full E2E suite** - Verify no regressions in other tests
- [ ] **Validate UX compliance** - Ensure UX compliance is maintained
- [ ] **Validate test isolation** - Ensure tests don't interfere with each other
- [ ] **Check performance** - Ensure no performance regressions
- [ ] **Verify error handling** - Ensure proper error handling is maintained

---

## File-Specific Checklists

### 🔐 **Auth Tests**

#### `tests/e2e/auth/authentication-session.test.ts`
- [ ] Replace inline registration flow with `setupE2E()`
- [ ] Replace inline login flow with `authenticateE2EPage()`
- [ ] Use `validateUXCompliance()` for form validation
- [ ] Use `testAuthenticationFlow()` for security testing
- [ ] Remove manual email verification logic

#### `tests/e2e/auth/password-reset.test.ts`
- [ ] Replace inline password reset flow with helpers
- [ ] Use `testModalSubmitLoading()` for form submission
- [ ] Use `testModalSuccessMessage()` for success validation
- [ ] Use `testModalErrorHandling()` for error validation

#### `tests/e2e/auth/oauth2.test.ts`
- [ ] Keep existing `oauth2TestUtils.ts` imports
- [ ] Replace inline OAuth2 flow with helper functions
- [ ] Use `testAuthenticationFlow()` for security validation
- [ ] Use `validateUXCompliance()` for OAuth2 pages

#### `tests/e2e/auth/registration-verification.test.ts`
- [ ] Replace inline registration with `createE2EUser()`
- [ ] Use `testModalDelayBeforeClosing()` for modal behavior
- [ ] Use `testMinimumLoadingDuration()` for loading states
- [ ] Use `validateUXCompliance()` for form validation

### 🔗 **Connections Tests**

#### `tests/e2e/connections/connections-management.test.ts`
- [x] Replace inline connection creation with `dataHelpers.ts`
- [x] Use `getPrimaryActionButton()` for all primary actions
- [x] Use `testModalSubmitLoading()` for form submission
- [x] Use `validateUXCompliance()` for connection forms
- [x] Use `testModalSuccessMessage()` for success validation
- [x] Use `testModalErrorHandling()` for error validation
- [x] Use `testPageLoadTime()` for performance testing
- [x] Use `testAPIPerformance()` for API performance testing
- [x] Use `testDataExposure()` for security validation
- [x] Use `testXSSPrevention()` for XSS testing
- [x] Use `testFormAccessibility()` for form validation
- [x] Use `testPrimaryActionPatterns()` for action validation
- [x] Replace inline modal cleanup with `closeAllModals()`
- [x] Replace inline rate limit reset with `resetRateLimits()`
- [x] Replace inline authentication with `setupE2E()`
- [x] Replace inline waiting logic with helper functions
- [x] Replace inline error handling with helper functions
- [x] Remove obsolete imports and duplicate code
- [x] Verify file length compliance (under 300 lines)
- [ ] **Migration Status: In Progress (90% complete)**

#### `tests/e2e/connections/secrets-first-connection.test.ts`
- [ ] Replace inline secrets management with `dataHelpers.ts`
- [ ] Use `testModalAccessibility()` for modal validation
- [ ] Use `testFormAccessibility()` for form validation
- [ ] Use `testDataExposure()` for security validation

#### `tests/e2e/connections/openapi-integration.test.ts`
- [ ] Replace inline OpenAPI parsing with helper functions
- [ ] Use `testAPIPerformance()` for API performance testing
- [ ] Use `testConcurrentOperations()` for concurrent testing
- [ ] Use `validateUXCompliance()` for OpenAPI forms

#### `tests/e2e/connections/oauth2-flows.test.ts`
- [ ] Keep existing `oauth2TestUtils.ts` imports
- [ ] Replace inline OAuth2 flow with helper functions
- [ ] Use `testAuthenticationFlow()` for OAuth2 security
- [ ] Use `testModalDelayBeforeClosing()` for OAuth2 modals

### ⚙️ **Workflow Engine Tests**

#### `tests/e2e/workflow-engine/core-workflow-generation.test.ts`
- [ ] Replace inline workflow creation with `dataHelpers.ts`
- [ ] Use `getPrimaryActionButton()` for workflow actions
- [ ] Use `testModalSubmitLoading()` for workflow submission
- [ ] Use `validateUXCompliance()` for workflow forms

#### `tests/e2e/workflow-engine/workflow-management.test.ts`
- [ ] Replace inline workflow management with helper functions
- [ ] Use `testModalSuccessMessage()` for workflow success
- [ ] Use `testModalErrorHandling()` for workflow errors
- [ ] Use `testConcurrentOperations()` for concurrent workflows

#### `tests/e2e/workflow-engine/natural-language-workflow.test.ts`
- [ ] Replace inline NLP workflow with helper functions
- [ ] Use `testPageLoadTime()` for performance validation
- [ ] Use `validateUXCompliance()` for chat interface
- [ ] Use `testPrimaryActionPatterns()` for chat actions

#### `tests/e2e/workflow-engine/multi-step-workflow-generation.test.ts`
- [ ] Replace inline multi-step workflow with helper functions
- [ ] Use `testModalDelayBeforeClosing()` for step transitions
- [ ] Use `testMinimumLoadingDuration()` for step processing
- [ ] Use `validateUXCompliance()` for workflow steps

#### `tests/e2e/workflow-engine/step-runner-engine.test.ts`
- [ ] Replace inline step execution with helper functions
- [ ] Use `testConcurrentOperations()` for step concurrency
- [ ] Use `testMemoryLeak()` for memory validation
- [ ] Use `validateUXCompliance()` for step UI

#### `tests/e2e/workflow-engine/queue-concurrency.test.ts`
- [ ] Replace inline queue testing with helper functions
- [ ] Use `testConcurrentOperations()` for queue concurrency
- [ ] Use `testAPIPerformance()` for queue performance
- [ ] Use `testMemoryLeak()` for memory validation

#### `tests/e2e/workflow-engine/pause-resume.test.ts`
- [ ] Replace inline pause/resume with helper functions
- [ ] Use `testModalSubmitLoading()` for pause/resume actions
- [ ] Use `testModalSuccessMessage()` for state changes
- [ ] Use `validateUXCompliance()` for pause/resume UI

#### `tests/e2e/workflow-engine/workflow-templates.test.ts`
- [ ] Replace inline template management with helper functions
- [ ] Use `getPrimaryActionButton()` for template actions
- [ ] Use `testModalAccessibility()` for template modals
- [ ] Use `validateUXCompliance()` for template forms

#### `tests/e2e/workflow-engine/workflow-planning.test.ts`
- [ ] Replace inline planning with helper functions
- [ ] Use `testPageLoadTime()` for planning performance
- [ ] Use `validateUXCompliance()` for planning interface
- [ ] Use `testPrimaryActionPatterns()` for planning actions

### 🎨 **UI Tests**

#### `tests/e2e/ui/ui-compliance.test.ts`
- [ ] Replace inline UX validation with `validateUXCompliance()`
- [ ] Use `testPrimaryActionPatterns()` for action validation
- [ ] Use `testFormAccessibility()` for form validation
- [ ] Use `testMessageContainers()` for message validation

#### `tests/e2e/ui/support-modal.e2e.test.ts`
- [ ] Replace inline modal testing with `modalHelpers.ts`
- [ ] Use `testModalSubmitLoading()` for modal submission
- [ ] Use `testModalDelayBeforeClosing()` for modal behavior
- [ ] Use `testModalAccessibility()` for accessibility

#### `tests/e2e/ui/navigation.test.ts`
- [ ] Replace inline navigation with `uiHelpers.ts`
- [ ] Use `waitForDashboard()` for navigation waits
- [ ] Use `validateUXCompliance()` for page validation
- [ ] Use `testKeyboardNavigation()` for keyboard testing

### 🔒 **Security Tests**

#### `tests/e2e/security/secrets-vault.test.ts`
- [ ] Replace inline secrets testing with `securityHelpers.ts`
- [ ] Use `testDataExposure()` for data exposure testing
- [ ] Use `testXSSPrevention()` for XSS testing
- [ ] Use `testCSRFProtection()` for CSRF testing

#### `tests/e2e/security/rate-limiting.test.ts`
- [ ] Replace inline rate limiting with `securityHelpers.ts`
- [ ] Use `resetRateLimits()` for test isolation
- [ ] Use `testAuthenticationFlow()` for auth testing
- [ ] Use `validateUXCompliance()` for error pages

### ⚡ **Performance Tests**

#### `tests/e2e/performance/load-testing.test.ts`
- [ ] Replace inline performance testing with `performanceHelpers.ts`
- [ ] Use `testPageLoadTime()` for load time testing
- [ ] Use `testPerformanceBudget()` for budget validation
- [ ] Use `testMemoryLeak()` for memory testing

### 🚀 **Onboarding Tests**

#### `tests/e2e/onboarding/user-journey.test.ts`
- [ ] Replace inline onboarding with helper functions
- [ ] Use `validateUXCompliance()` for onboarding pages
- [ ] Use `testPrimaryActionPatterns()` for onboarding actions
- [ ] Use `testMobileResponsiveness()` for mobile testing

---

## Migration Progress Tracking

### Overall Progress
- [ ] **Phase 1 Complete** - All imports updated
- [ ] **Phase 2 Complete** - All authentication migrated
- [ ] **Phase 3 Complete** - All modal/UI management migrated
- [ ] **Phase 4 Complete** - All waiting logic migrated
- [ ] **Phase 5 Complete** - All primary actions migrated
- [ ] **Phase 6 Complete** - All test data migrated
- [ ] **Phase 7 Complete** - All error handling migrated
- [ ] **Phase 8 Complete** - All performance/security migrated
- [ ] **Phase 9 Complete** - All code cleanup complete
- [ ] **Phase 10 Complete** - All validation complete

### File Completion Status
- [ ] **Auth Tests** (4/4 files) - 0% complete
- [ ] **Connections Tests** (4/4 files) - 0% complete
- [ ] **Workflow Engine Tests** (9/9 files) - 0% complete
- [ ] **UI Tests** (3/3 files) - 0% complete
- [ ] **Security Tests** (2/2 files) - 0% complete
- [ ] **Performance Tests** (1/1 file) - 0% complete
- [ ] **Onboarding Tests** (1/1 file) - 0% complete

### Total Progress: 0/24 files (0%)

---

## Success Criteria

### Quantitative Metrics
- [ ] **100% of E2E tests pass** after migration
- [ ] **50% reduction** in repeated code across E2E tests
- [ ] **All files under 300 lines** (user-rules.md compliance)
- [ ] **Zero code duplication** in helpers
- [ ] **No performance regressions** in test execution

### Qualitative Metrics
- [ ] **Improved maintainability** - Clear, organized helper structure
- [ ] **Better test reliability** - Consistent patterns and error handling
- [ ] **Enhanced developer experience** - Clear, documented helper APIs
- [ ] **Compliance with user-rules.md** - Proper file organization and naming
- [ ] **Reduced onboarding time** - Clear documentation and examples

### Validation Checklist
- [ ] All E2E tests pass
- [ ] All integration tests pass
- [ ] All unit tests pass
- [ ] UX compliance validated
- [ ] Test isolation maintained
- [ ] Documentation complete
- [ ] Code review approved
- [ ] Performance benchmarks met

---

## Notes

- **Priority Order**: Start with high-priority files that have the most repeated code
- **Incremental Migration**: Migrate one file at a time and validate after each
- **Rollback Plan**: Keep original files as backup until migration is complete
- **Documentation**: Update this checklist as migration progresses
- **Validation**: Run full test suite after each file migration

---

**Document Version:** 1.0  
**Last Updated:** July 2024  
**Document Owner:** Development Team  
**Next Review:** After migration completion 