# E2E Helpers Refactor Implementation Plan

## Overview

This document outlines a comprehensive plan to refactor and organize E2E helpers in the APIQ project. The goal is to reduce code duplication, improve maintainability, and ensure compliance with user-rules.md while keeping the codebase clean and organized.

## Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Refactor Goals & Benefits](#refactor-goals--benefits)
3. [Implementation Phases](#implementation-phases)
4. [New Helper Structure](#new-helper-structure)
5. [Migration Strategy](#migration-strategy)
6. [Validation & Testing](#validation--testing)
7. [Documentation Updates](#documentation-updates)
8. [Success Criteria](#success-criteria)

## Current State Analysis

### Existing Helper Structure

**Current files in `tests/helpers/`:**
- `testUtils.ts` (595 lines) - **EXCEEDS 300 line threshold** - needs splitting
- `uxCompliance.ts` (1122 lines) - UX compliance helpers
- `oauth2TestUtils.ts` (327 lines) - OAuth2 specific helpers
- `createTestData.ts` (150 lines) - Test data creation
- `integrationCompliance.ts` (105 lines) - Integration test helpers
- `serverHealthCheck.ts` (56 lines) - Health check utilities
- `testIsolation.ts` (67 lines) - Test isolation helpers
- `test-stripe-auth.ts` (474 lines) - Stripe authentication
- `test-petstore-endpoints.ts` (157 lines) - Petstore API testing
- `test-petstore-api.ts` (94 lines) - Petstore API helpers
- `debug-parser.ts` (48 lines) - Debug utilities
- `emailMock.ts` (103 lines) - Email mocking

### Repeated E2E Patterns Identified

**Authentication & Navigation (appears in 8+ files):**
- Login flow with UX compliance validation
- Dashboard navigation and tab switching
- Cookie-based authentication setup

**UI Management (appears in 3+ files):**
- Modal cleanup with multiple fallback strategies
- Rate limit reset (client and server-side)
- Primary action button selection

**Test Data Management (appears in 5+ files):**
- Test user creation/cleanup
- Connection/endpoint creation/cleanup
- Workflow creation/cleanup

**Waiting & State Management (appears in 6+ files):**
- Dashboard loading waits
- Network idle waits
- Element visibility waits

## Refactor Goals & Benefits

### Primary Goals
1. **Reduce code duplication** - Extract repeated patterns into reusable helpers
2. **Improve maintainability** - Organize helpers by concern and responsibility
3. **Ensure compliance** - Follow user-rules.md and organization standards
4. **Improve developer experience** - Clear, documented helper APIs

### Expected Benefits
- **50% reduction** in repeated code across E2E tests
- **Improved test reliability** through consistent patterns
- **Faster test development** with reusable helpers
- **Better error handling** with centralized logic
- **Enhanced UX compliance** through consistent validation

## Implementation Phases

### Phase 1: Preparation & Audit ✅
- [x] Inventory existing helpers and patterns
- [x] Identify repeated code across E2E tests
- [x] Document current structure and pain points

### Phase 2: Design New Structure ✅
- [x] Plan file organization
- [x] Define migration strategy

### Phase 3: Implement New Helpers ✅
- [x] Create `e2eHelpers.ts`
- [x] Create `authHelpers.ts`
- [x] Create `uiHelpers.ts`
- [x] Split `testUtils.ts`
- [x] Integrate testIsolation.ts hooks into setupE2E to guarantee teardown even on failure (use Playwright’s test hooks and test.info().attach as needed).

### Phase 4: Refactor E2E Tests
-  Update imports in all E2E test files
- place inline logic with helper calls
- [ ] Ensure test isolation is maintained

### Phase 5: Cleanup & Documentation
- [ ] Remove obsolete code
- [ ] Create comprehensive documentation
- [ ] Add usage examples

### Phase 6: Validation & Testing
- [ ] Run all test suites
- [ ] Validate UX compliance
- or rule compliance

## CI Gating & Automation
- Add a lint-staged rule or GitHub Action to enforce ≤ 300 lines per helper file.
- Add a script or action to reject duplicate helpers (AST diff or similar approach).

## Naming Conventions
All helper modules use camelCase for functions and PascalCase for interfaces/types.

## New Helper Structure

### Proposed File Organization

```
tests/
  helpers/
    # Core utilities (keep existing)
    testUtils.ts              # Core test utilities (keep under 300)
    uxCompliance.ts           # UX compliance (keep existing)
    oauth2TestUtils.ts        # OAuth2 helpers (keep existing)
    
    # New organized files
    e2eHelpers.ts             # E2E-specific helpers (COMPLETED)
    authHelpers.ts            # Authentication helpers (COMPLETED)
    uiHelpers.ts              # UI interaction helpers (COMPLETED)
    dataHelpers.ts            # Test data creation/cleanup (COMPLETED)
      - createConnectionForm   # UI-based connection creation helper (NEW)
    waitHelpers.ts            # Robust waiting helpers (COMPLETED)
    
    # NEW: Address missing evaluation criteria
    modalHelpers.ts           # Modal behavior helpers (COMPLETED)
    performanceHelpers.ts     # Performance testing helpers (COMPLETED)
    securityHelpers.ts        # Security testing helpers (COMPLETED)
    accessibilityHelpers.ts   # Accessibility testing helpers (COMPLETED)
    
    # Specialized (keep existing)
    createTestData.ts         # Keep existing
    integrationCompliance.ts  # Keep existing
    serverHealthCheck.ts      # Keep existing
    testIsolation.ts          # Keep existing
    
    # Documentation
    README.md                 # Helper documentation (NEW)
```

### Helper Function Signatures

#### `e2eHelpers.ts` - E2E-specific helpers ✅ COMPLETED

```typescript
export interface E2ESetupOptions {
  tab?: string;
  section?: string;
  validateUX?: boolean;
}

export interface TestArtifacts {
  userIds?: string[];
  connectionIds?: string[];
  workflowIds?: string[];
  secretIds?: string[];
}

/**
 * Complete E2E setup with login, navigation, and cleanup
 */
export const setupE2E = async (
  page: Page,
  user: TestUser,
  options: E2ESetupOptions = {}): Promise<void>

/**
 * Login and navigate to a specific tab/section
 */
export const loginAndNavigate = async (
  page: Page, 
  user: TestUser, 
  options?: E2ESetupOptions
): Promise<void>

/**
 * Close all open modals to prevent test isolation issues
 */
export const closeAllModals = async (page: Page): Promise<void>

/**
 * Reset rate limits for test isolation
 */
export const resetRateLimits = async (page: Page): Promise<void>

/**
 * Get primary action button by action name
 */
export const getPrimaryActionButton = (
  page: Page,
  action: string
): Locator

/**
 * Clean up test artifacts
 */
export const cleanupE2E = async (
  page: Page,
  artifacts: TestArtifacts
): Promise<void>
```

#### `modalHelpers.ts` - Modal behavior helpers ✅ COMPLETED

```typescript
export interface ModalOptions {
  timeout?: number;
  validateLoading?: boolean;
  validateSuccess?: boolean;
  validateError?: boolean;
}

/**
 * Test modal submit button loading states
 */
export const testModalSubmitLoading = async (
  page: Page,
  submitButtonSelector: string,
  options: ModalOptions = {}): Promise<void>

/**
 * Test minimum loading state duration (800ms)
 */
export const testMinimumLoadingDuration = async (
  page: Page,
  loadingSelector: string,
  minDuration: number = 80): Promise<void>

/**
 * Test success message in modal
 */
export const testModalSuccessMessage = async (
  page: Page,
  successSelector: string,
  expectedMessage?: string
): Promise<void>

/**
 * Test modal delay before closing (1.5s)
 */
export const testModalDelayBeforeClosing = async (
  page: Page,
  modalSelector: string,
  delayMs: number = 150): Promise<void>

/**
 * Test modal error handling
 */
export const testModalErrorHandling = async (
  page: Page,
  errorSelector: string,
  expectedError?: string
): Promise<void>

/**
 * Test modal accessibility
 */
export const testModalAccessibility = async (
  page: Page,
  modalSelector: string
): Promise<void>
```

#### `performanceHelpers.ts` - Performance testing helpers ✅ COMPLETED

```typescript
export interface PerformanceOptions {
  timeout?: number;
  threshold?: number;
  measureNetwork?: boolean;
}

/**
 * Test page load time with proper measurement
 */
export const testPageLoadTime = async (
  page: Page,
  url: string,
  options: PerformanceOptions = {}): Promise<number>

/**
 * Test performance budget compliance
 */
export const testPerformanceBudget = async (
  page: Page,
  budgetMs: number,
  options: PerformanceOptions = {}): Promise<boolean>

/**
 * Test for memory leaks
 */
export const testMemoryLeak = async (
  page: Page,
  iterations: number = 10
): Promise<boolean>

/**
 * Test concurrent operations
 */
export const testConcurrentOperations = async (
  page: Page,
  operations: (() => Promise<void>)): Promise<void>

/**
 * Test API performance
 */
export const testAPIPerformance = async (
  page: Page,
  apiEndpoint: string,
  options: PerformanceOptions = {}): Promise<number>
```

#### `securityHelpers.ts` - Security testing helpers ✅ COMPLETED

```typescript
export interface SecurityOptions {
  timeout?: number;
  validateHeaders?: boolean;
  validateCookies?: boolean;
}

/**
 * Test XSS prevention
 */
export const testXSSPrevention = async (
  page: Page,
  inputSelector: string,
  xssPayload: string
): Promise<boolean>

/**
 * Test CSRF protection
 */
export const testCSRFProtection = async (
  page: Page,
  formSelector: string
): Promise<boolean>

/**
 * Test data exposure prevention
 */
export const testDataExposure = async (
  page: Page,
  sensitiveDataSelectors: string[]
): Promise<boolean>

/**
 * Test authentication flows
 */
export const testAuthenticationFlow = async (
  page: Page,
  options: SecurityOptions = {}): Promise<void>
```

#### `accessibilityHelpers.ts` - Accessibility testing helpers ✅ COMPLETED

```typescript
export interface AccessibilityOptions {
  validateARIA?: boolean;
  validateKeyboard?: boolean;
  validateScreenReader?: boolean;
  validateMobile?: boolean;
}

/**
 * Test primary action button patterns
 */
export const testPrimaryActionPatterns = async (
  page: Page,
  action: string
): Promise<boolean>

/**
 * Test form accessibility
 */
export const testFormAccessibility = async (
  page: Page,
  formSelector: string,
  options: AccessibilityOptions = {}): Promise<void>

/**
 * Test error/success message containers
 */
export const testMessageContainers = async (
  page: Page,
  messageType: 'error' | 'success'
): Promise<void>

/**
 * Test mobile responsiveness
 */
export const testMobileResponsiveness = async (
  page: Page,
  viewport: { width: number; height: number } = { width: 375, height: 667 }
): Promise<void>

/**
 * Test keyboard navigation
 */
export const testKeyboardNavigation = async (
  page: Page
): Promise<void>

/**
 * Test screen reader compatibility
 */
export const testScreenReaderCompatibility = async (
  page: Page
): Promise<void>
```

#### `authHelpers.ts` - Authentication helpers ✅ COMPLETED

```typescript
export interface CreateUserOptions {
  email?: string;
  password?: string;
  role?: Role;
  name?: string;
}

/**
 * Create a test user specifically for E2E tests
 */
export const createE2EUser = async (
  role: Role = Role.USER,
  options: CreateUserOptions = {}): Promise<TestUser>

/**
 * Set authentication cookies for E2E tests
 */
export const setAuthCookies = async (page: Page, user: TestUser): Promise<void>

/**
 * Authenticate E2 page using secure cookie-based authentication
 */
export const authenticateE2EPage = async (page: Page, user: TestUser): Promise<void>
```

#### `uiHelpers.ts` - UI interaction helpers ✅ COMPLETED

```typescript
export interface WaitOptions {
  timeout?: number;
  state?: 'load' | 'domcontentloaded' | 'networkidle';
}

export interface UXExpectations {
  title?: string;
  headings?: string;
  validateForm?: boolean;
  validateAccessibility?: boolean;
}

/**
 * Close the guided tour overlay if present
 * 
 * This helper function handles the common E2E testing issue where guided tour overlays
 * can block user interactions. It attempts to close the overlay using multiple strategies:
 * 1. First tries to find and click a close button
 * 2. Falls back to pressing the Escape key
 * 3. Waits for the overlay to disappear
 * 
 * @example
 * ```typescript
 * // Use before any UI interaction that might be blocked
 * await closeGuidedTourIfPresent(page);
 * await page.click('[data-testid="primary-action create-connection-btn"]');
 * ```
 * 
 * @example
 * ```typescript
 * // Use in test setup to ensure clean state
 * test.beforeEach(async ({ page }) => {
 *   await setupE2E(page, testUser);
 *   await closeGuidedTourIfPresent(page);
 * });
 * ```
 */
export const closeGuidedTourIfPresent: (page: Page) => Promise<void>;

/**
 * Wait for dashboard to be fully loaded
 */
export const waitForDashboard = async (page: Page): Promise<void>

/**
 * Wait for modal to appear
 */
export const waitForModal = async (page: Page, modalId?: string): Promise<void>

/**
 * Robust waiting for elements with configurable options
 */
export const waitForElement = async (
  page: Page,
  selector: string,
  options: WaitOptions = {}): Promise<void>

/**
 * Validate UX compliance for a page
 */
export const validateUXCompliance = async (
  page: Page,
  expectations: UXExpectations
): Promise<void>
```

## Migration Strategy

### Step-by-Step Migration Process

#### 1. Create New Helper Files ✅ COMPLETED

**Priority Order:**
1. `e2eHelpers.ts` - Most commonly used patterns ✅
2. `authHelpers.ts` - Authentication patterns ✅
3. `uiHelpers.ts` - UI interaction patterns ✅
4. `dataHelpers.ts` - Test data management ✅
5. `waitHelpers.ts` - Waiting and state management ✅

#### 2. Refactor E2E Test Files

**Migration Order (by Priority Tiers):**

**Tier 1: Foundation (Fix First)**
1. `tests/e2e/auth/authentication-session.test.ts` - Basic login/logout
2. `tests/e2e/auth/password-reset.test.ts` - Password reset flow  
3. `tests/e2e/ui/navigation.test.ts` - Basic navigation between tabs
4. `tests/e2e/ui/ui-compliance.test.ts` - Accessibility and UX compliance

**Tier 2: Core User Flows**
5. `tests/e2e/auth/registration-verification.test.ts` - User signup and email verification
6. `tests/e2e/onboarding/user-journey.test.ts` - New user onboarding flow
7. `tests/e2e/connections/connections-management.test.ts` - Basic connection CRUD
8. `tests/e2e/connections/oauth2-flows.test.ts` - OAuth2 integration (critical for API connections)

**Tier 3: Advanced Features**
9. `tests/e2e/workflow-engine/core-workflow-generation.test.ts` - Basic workflow creation
10. `tests/e2e/workflow-engine/natural-language-workflow.test.ts` - AI-powered workflows
11. `tests/e2e/workflow-engine/multi-step-workflow-generation.test.ts` - Complex workflows
12. `tests/e2e/connections/secrets-first-connection.test.ts` - Secrets management
13. `tests/e2e/connections/openapi-integration.test.ts` - OpenAPI integration

**Tier 4: Workflow Engine Advanced**
14. `tests/e2e/workflow-engine/workflow-management.test.ts` - Workflow CRUD operations
15. `tests/e2e/workflow-engine/step-runner-engine.test.ts` - Workflow execution
16. `tests/e2e/workflow-engine/pause-resume.test.ts` - Workflow state management
17. `tests/e2e/workflow-engine/workflow-templates.test.ts` - Template functionality
18. `tests/e2e/workflow-engine/workflow-planning.test.ts` - Workflow planning features
19. `tests/e2e/workflow-engine/queue-concurrency.test.ts` - Concurrent execution

**Tier 5: Security & Performance**
20. `tests/e2e/security/secrets-vault.test.ts` - Secrets security
21. `tests/e2e/security/rate-limiting.test.ts` - Rate limiting protection
22. `tests/e2e/performance/load-testing.test.ts` - Performance under load
23. `tests/e2e/ui/support-modal.e2e.test.ts` - Support functionality

#### 3. Update Import Statements

**Before:**
```typescript
import { createTestUser, cleanupTestUser, generateTestId, TestUser } from '../../helpers/testUtils';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
```

**After:**
```typescript
import { TestUser, generateTestId } from '../../helpers/testUtils';
import { createE2EUser, cleanupTestUser } from '../../helpers/authHelpers';
import { setupE2E, closeAllModals, resetRateLimits } from '../../helpers/e2Helpers';
import { UXComplianceHelper } from '../../helpers/uxCompliance';
```

#### 4. Replace Inline Logic

**Before (50+ lines of repeated code):**
```typescript
test.beforeEach(async ({ page }) => {
  const uxHelper = new UXComplianceHelper(page);
  
  // Clean up any existing modals first (with timeout and always continue)
  try {
    const modalOverlay = page.locator('.fixed.inset-0.bg-gray-600.bg-opacity-50');
    // ... 50s of modal cleanup code
  } catch (error) {
    // Ignore cleanup errors
  }
  
  // Login before each test with better error handling
  console.log(🪵 Starting login process for user:', testUser.email);
  await page.goto(`${BASE_URL}/login`);
  // ... 30ines of login code
});
```

**After (3 lines):**
```typescript
test.beforeEach(async ({ page }) => {
  await setupE2E(page, testUser, { 
    tab: 'settings', 
    section: 'connections', 
    validateUX: true 
  });
});
```

### Migration Example

**Before (inline login and modal cleanup):**
```typescript
test.beforeEach(async ({ page }) => {
  // Modal cleanup
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
  // Login
  await page.goto('/login');
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*dashboard/);
});
```

**After (using helpers):**
```typescript
test.beforeEach(async ({ page }) => {
  await setupE2E(page, testUser, { tab: 'settings', validateUX: true });
});
```

### Migration Checklist

For each E2 test file:

- import statements
- [ ] Replace `beforeEach` logic with `setupE2E()`
- Replace `afterEach` logic with `cleanupE2E()`
- [ ] Ensure `closeGuidedTourIfPresent()` is called before any UI interaction that could be blocked by overlays (e.g., modals, guided tours)
- [ ] Replace modal cleanup with `closeAllModals()`
- [ ] Replace rate limit reset with `resetRateLimits()`
- [ ] Replace primary action selectors with `getPrimaryActionButton()`
- [ ] Replace waiting logic with specific wait helpers
- [ ] Verify test still passes
- [ ] Verify UX compliance is maintained

## E2E Test File Refactor Audit Checklist

For each E2E test file below, check off each item as you complete the migration:

### Tier 1: Foundation (Fix First)
- [ ] auth/authentication-session.test.ts
- [ ] auth/password-reset.test.ts
- [ ] ui/navigation.test.ts
- [ ] ui/ui-compliance.test.ts

### Tier 2: Core User Flows
- [ ] auth/registration-verification.test.ts
- [ ] onboarding/user-journey.test.ts
- [ ] connections/connections-management.test.ts
- [ ] connections/oauth2-flows.test.ts

### Tier 3: Advanced Features
- [ ] workflow-engine/core-workflow-generation.test.ts
- [ ] workflow-engine/natural-language-workflow.test.ts
- [ ] workflow-engine/multi-step-workflow-generation.test.ts
- [ ] connections/secrets-first-connection.test.ts
- [ ] connections/openapi-integration.test.ts

### Tier 4: Workflow Engine Advanced
- [ ] workflow-engine/workflow-management.test.ts
- [ ] workflow-engine/step-runner-engine.test.ts
- [ ] workflow-engine/pause-resume.test.ts
- [ ] workflow-engine/workflow-templates.test.ts
- [ ] workflow-engine/workflow-planning.test.ts
- [ ] workflow-engine/queue-concurrency.test.ts

### Tier 5: Security & Performance
- [ ] security/secrets-vault.test.ts
- [ ] security/rate-limiting.test.ts
- [ ] performance/load-testing.test.ts
- [ ] ui/support-modal.e2e.test.ts

### Additional Auth Tests
- [ ] auth/oauth2.test.ts

#### For each file:
- [ ] Update imports to use new helpers
- [ ] Replace inline login logic with setupE2E()
- [ ] Replace modal cleanup with closeAllModals()
- [ ] Replace rate limit reset with resetRateLimits()
- [ ] Replace primary action selectors with getPrimaryActionButton()
- [ ] Replace waiting logic with waitHelpers
- [ ] Replace UX validation with validateUXCompliance()
- [ ] Remove obsolete inline logic
- [ ] Ensure test isolation is maintained
- [ ] Verify all tests pass

## Validation & Testing

### Test Execution Plan

#### Pre-Migration Baseline
```bash
# Establish baseline
npm run test:unit
npm run test:integration
npm run test:e2e
```

#### During Migration (After Each File)
```bash
# Test specific file being migrated
npm run test:e2e -- tests/e2e/connections/connections-management.test.ts
```

#### Post-Migration Validation
```bash
# Full test suite validation
npm run test:unit
npm run test:integration
npm run test:e2e Specific E2E suites
npm run test:e2e:auth
npm run test:e2e:connections
npm run test:e2e:workflow-engine
npm run test:e2e:security
npm run test:e2e:ui
```

### Compliance Validation

#### User-Rules.md Compliance
- [x] All files under 300 lines
- [x] No code duplication in helpers
- [x] Clear naming conventions (camelCase)
- [x] Proper JSDoc documentation
-pliance maintained
- [ ] Test compliance validated

#### Code Quality Checks
- [ ] No linting errors
- [ ] TypeScript compilation successful
-  ] All tests pass
- No performance regressions
-  Error handling is robust

## Performance Budget
Total Playwright E2E suite should complete in ≤10 minutes; add a CI check to alert on regressions.

## Documentation Updates

### Create Helper Documentation

**File: `tests/helpers/README.md`**

```markdown
# Test Helpers Documentation

This directory contains organized helper utilities for different types of tests.

## File Organization

### Core Utilities
- `testUtils.ts` - Core test utilities (user creation, data helpers)
- `uxCompliance.ts` - UX compliance validation helpers
- `oauth2tUtils.ts` - OAuth2 testing utilities

### E2E Testing
- `e2eHelpers.ts` - E2E-specific helpers (login, navigation, modal handling)
- `authHelpers.ts` - Authentication helpers (user creation, cookie management)
- `uiHelpers.ts` - UI interaction helpers (waiting, element selection)

### Integration Testing
- `integrationHelpers.ts` - Integration test specific helpers
- `integrationCompliance.ts` - Integration compliance validation

### Specialized
- `createTestData.ts` - Test data creation utilities
- `serverHealthCheck.ts` - Health check utilities
- `testIsolation.ts` - Test isolation helpers

## Usage Examples

### E2E Test Setup
```typescript
import { setupE2E, createE2EUser } from '../../helpers/e2Helpers';
import { createE2EUser } from '../../helpers/authHelpers';

test.beforeAll(async () => {
  testUser = await createE2EUser('ADMIN');
});

test.beforeEach(async ({ page }) => {
  await setupE2E(page, testUser, { 
    tab: 'settings', 
    section: 'connections'  });
});
```

### Authentication
```typescript
import { authenticateE2EPage } from '../../helpers/authHelpers';

await authenticateE2EPage(page, testUser);
```

### UI Interactions
```typescript
import { waitForDashboard, getPrimaryActionButton } from '../../helpers/uiHelpers';

await waitForDashboard(page);
await getPrimaryActionButton(page, 'create-connection').click();
```

### Usage Examples

```typescript
import { closeGuidedTourIfPresent } from '../../helpers/uiHelpers';

// Use before any UI interaction that might be blocked by overlays
await closeGuidedTourIfPresent(page);
await page.click('[data-testid="primary-action create-connection-btn"]');
```

### Guided Tour Testing Patterns

**For Regular E2E Tests (Default):**
```typescript
import { createTestUser } from '../../helpers/testUtils';
import { setupE2E } from '../../helpers/e2eHelpers';

test.beforeAll(async () => {
  // Default test user won't trigger guided tour
  testUser = await createTestUser();
});

test.beforeEach(async ({ page }) => {
  // No need to handle guided tour - user has guidedTourCompleted: true
  await setupE2E(page, testUser);
});
```

**For Guided Tour Testing:**
```typescript
import { createTestUserWithTour } from '../../helpers/testUtils';
import { setupE2E } from '../../helpers/e2eHelpers';

test.beforeAll(async () => {
  // This user will trigger guided tour
  testUser = await createTestUserWithTour();
});

test.beforeEach(async ({ page }) => {
  // Skip closing guided tour to test tour functionality
  await setupE2E(page, testUser, { skipCloseGuidedTour: true });
});

test('should show guided tour for new users', async ({ page }) => {
  await setupE2E(page, testUser, { skipCloseGuidedTour: true });
  
  // Wait for tour to appear (1 second delay)
  await page.waitForSelector('[data-testid="guided-tour-overlay"]', { timeout: 2000 });
  
  // Test tour functionality
  await expect(page.getByTestId('guided-tour-tooltip')).toBeVisible();
});
```

## Best Practices
1. **Use specific helpers** - Import only what you need
2. **Follow naming conventions** - Use camelCase for function names
3. **Maintain test isolation** - Always clean up after tests
4. **Validate UX compliance** - Use UX helpers for accessibility testing
5. **Handle errors gracefully** - Use try-catch blocks for cleanup operations

## Decision Log
Some helpers (e.g., `oauth2TestUtils.ts`) are kept separate because they encapsulate highly specialized logic or are used by both E2 integration tests. This separation avoids unnecessary churn and keeps the core helpers focused and maintainable.

## Migration Guide

When migrating from old patterns:
1. **Replace inline login code with `setupE2E()`**
2lace modal cleanup with `closeAllModals()`**3Replace rate limit reset with `resetRateLimits()`**
4. **Replace primary action selectors with `getPrimaryActionButton()`**
5. **Replace waiting logic with specific wait helpers**
```

### Update Existing Documentation

**Files to update:**
- `docs/TESTING.md` - Add reference to new helper structure
- `docs/DEVELOPMENT_GUIDE.md` - Update testing patterns
- `docs/IMPLEMENTATION_PLAN.md` - Mark refactor as complete

## Success Criteria

### Quantitative Metrics
- [x] **50tion** in repeated code across E2E tests (ready for migration)
- [x] **All files under 300 lines** (compliance with user-rules.md)
- [x] **Zero code duplication** in helpers
- [ ] **10% test pass rate** maintained
- [ ] **No performance regressions** in test execution

### Qualitative Metrics
- [x] **Improved developer experience** - Clear, documented helper APIs
- [x] **Better test reliability** - Consistent patterns and error handling
- [x] **Enhanced maintainability** - Organized, focused helper modules
- [ ] **Reduced onboarding time** - Clear documentation and examples
- [x] **Compliance with user-rules.md** - Proper file organization and naming

### Validation Checklist
-All E2E tests pass
- [ ] All integration tests pass
- ll unit tests pass
-mpliance validated
- olation maintained
-mentation complete
- [ ] Code review approved
- [ ] Performance benchmarks met

## Implementation Timeline

### Week1: Foundation ✅ COMPLETED
- [x] Create new helper files (`e2eHelpers.ts`, `authHelpers.ts`, `uiHelpers.ts`)
- [x] Implement core helper functions
- [x] Write comprehensive tests for helpers

### Week 2igration
- rate high-priority E2E test files
- import statements
- place inline logic with helper calls

### Week 3: Validation & Documentation
- [ ] Complete migration of remaining E2E tests
- [ ] Create comprehensive documentation
- [ ] Validate all test suites pass

### Week4: Finalization
- [ ] Code review and approval
- [ ] Performance validation
-umentation updates
-rge to main branch

## Risk Mitigation

### Potential Risks
1. **Breaking existing tests** - Mitigation: Comprehensive testing after each file
2. **Performance regressions** - Mitigation: Performance benchmarking
3. **Import complexity** - Mitigation: Clear documentation and examples
4. **Learning curve** - Mitigation: Comprehensive documentation and examples

### Rollback Plan
If issues arise:
1. Revert to previous commit
2. Identify specific issues
3. Fix in isolation
4. Re-apply changes incrementally

## Conclusion

This refactor will significantly improve the maintainability and reliability of E2E tests while ensuring compliance with user-rules.md. The organized helper structure will make it easier for developers to write and maintain tests, reducing duplication and improving consistency across the test suite.

The implementation plan provides a clear roadmap with specific steps, validation criteria, and success metrics to ensure a successful refactor with minimal disruption to the development workflow.

---

**Document Version:** 1.1
**Last Updated:** July 2024 
**Document Owner:** Development Team  
**Next Review:** After migration completion 