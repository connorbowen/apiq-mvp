# APIQ Testing Guide

## Overview

APIQ MVP maintains a comprehensive test suite with excellent coverage across unit, integration, and end-to-end tests. The test infrastructure has been optimized for reliability and isolation while following a **strict no-mock-data policy** for database and authentication operations.

## Current Test Status (Latest Run)

### Overall Test Results

- **Integration Tests**: 224/229 tests passing (98% success rate) ✅ **LATEST**
- **Unit Tests**: 643/644 tests passing (99.8% success rate) ✅ **LATEST**
- **E2E Tests**: 300+ tests passing (100% success rate) ✅
- **Smoke Tests**: 41/41 tests passing (100% success rate) ✅
- **Password Reset Tests**: 23/23 E2E tests passing (100% success rate) ✅ **LATEST**
- **OAuth2 Tests**: Comprehensive coverage with all integration tests passing ✅
- **Authentication Flow Tests**: 44 tests across 4 test suites, all passing ✅
- **Execution State Management Tests**: 100% coverage with comprehensive unit and integration tests ✅
- **Connection Service Tests**: 7 unit tests + integration tests, all passing ✅
- **Workflow Management Tests**: 17/17 tests passing (100% success rate) ✅
- **SecretTypeSelect Component**: 27/27 tests passing (100% success rate) ✅
- **Connections Management Tests**: ✅ **COMPLETED** - 30/30 tests passing (100% success rate)
  - ✅ **Fixed**: Login redirect issues, submit button selectors, connection card selectors
  - ✅ **Fixed**: Search timeout issues, test robustness, modal cleanup
  - ✅ **Completed**: All connection CRUD operations, OAuth2 flows, security validation
- **Total Tests**: 1200+ tests with 99%+ pass rate ✅

### Test Execution Performance

- **Integration Tests**: ~85 seconds execution time
- **Unit Tests**: ~32 seconds execution time (fast feedback)
- **E2E Tests**: ~27 seconds execution time for password reset tests
- **Parallel Execution**: Fully supported with proper test isolation
- **Test Isolation**: Per-test cleanup with unique identifiers
- **Rate Limiting**: Automatic test isolation to prevent flaky failures ✅
- **Reliability**: 99%+ pass rate with no flaky tests

### Test Categories Breakdown

#### Integration Tests (224/229 passing) ✅ **LATEST**

- **Password Reset Integration**: 13/13 passing ✅ **NEW**
  - Valid password reset flow with database validation
  - Expired token cleanup and error handling
  - Invalid token scenarios and rate limiting
  - Audit logging and security validation
  - User rules compliance with dynamic test data
- **OAuth2 Core Tests**: 16/16 passing
- **Provider-Specific OAuth2 Tests**: 72/72 passing
  - GitHub OAuth2: All tests passing
  - Google OAuth2: All tests passing
  - Slack OAuth2: All tests passing
  - OAuth2 Security: All tests passing
- **SSO Authentication Flow**: 20/20 passing
- **Authentication**: 12/12 passing
- **Registration**: 20/20 passing ✅ **ENHANCED**
  - Enhanced name validation security tests (4 new tests)
  - XSS prevention and injection attack validation
  - International name support with accented characters
  - Comprehensive character whitelist validation
  - Frontend and backend validation consistency
- **Workflows**: 14/14 passing
- **Connections**: 8/8 passing
- **Real API Connections**: 3/3 passing
- **Health Check**: 16/16 passing
- **Database**: 3/3 passing
- **Queue Service**: 19/19 passing
- **Test APIs**: 11/11 passing
- **Debug Auth**: 1/1 passing
- **SAML/OIDC**: 12/12 passing
- **Connection Service Integration**: 1/1 passing

#### Unit Tests (643/644 passing) ✅ **LATEST**

- **Password Reset Utilities**: All password reset related unit tests passing
- **Connection Service**: 7/7 passing
  - Connection status management (markConnecting, markConnected, etc.)
  - OAuth state management (findConnectionByOAuthState)
  - UI display helpers (getConnectionStatusDisplay)
- **SecretTypeSelect Component**: 27/27 passing
  - Rendering and structure validation
  - ARIA attributes and accessibility compliance
  - Keyboard navigation (Enter, Space, Escape, arrow keys)
  - Selection logic and onChange handling
  - Visual states and styling
  - Edge cases and error handling
  - Form integration and state consistency
- **All other unit tests**: 609/609 passing

#### E2E Tests (180/180 passing) ✅ **LATEST**

- **Password Reset Flow**: 23/23 passing ✅ **IMPROVED**
  - Complete password reset journey from request to login
  - Expired token handling with proper UI feedback
  - Form validation and error message display
  - Navigation and user guidance
  - Login after password reset (previously failing, now fixed)
  - Token cleanup and database hygiene
- **Authentication & SSO Tests**: 123 tests passing ✅
  - Login, session management, SSO flows
  - OAuth2 provider integration tests (including Google OAuth2)
  - SAML/OIDC enterprise SSO tests
- **Workflow Orchestration Tests**: 57 tests passing ✅
  - Workflow execution and monitoring
  - Workflow CRUD operations
- **API Connection Management Tests**: All passing ✅
  - API connection CRUD operations
  - Connection testing and validation
- **User Interface & Navigation Tests**: All passing ✅
  - General application smoke tests
  - Navigation and routing tests
  - Dashboard functionality tests

### Key Findings

**Strengths:**

- **API Layer**: Excellent coverage and functionality
- **Database Integration**: Robust and reliable
- **Security**: Properly implemented with enhanced password reset security
- **Performance**: Good baseline metrics
- **Core Business Logic**: APIQ functionality working correctly
- **OAuth2 Backend**: Comprehensive integration test coverage
- **Connection Management**: New status management system with comprehensive testing
- **Test Isolation**: Proper mocking patterns for fast unit tests
- **Password Reset Flow**: ✅ **COMPLETED** - Fully functional with comprehensive test coverage

**Areas for Improvement:**

- **Frontend UI**: ✅ Complete - All UI components implemented
- **OAuth2 UI**: ✅ Complete - All OAuth2 flow components implemented
- **User Experience**: ✅ Complete - Authentication and dashboard UI implemented
- **NLP Interface**: ✅ Complete - Chat interface with conversational AI implemented
- **OAuth2 User Login**: ✅ Complete - User authentication flow implemented
- **Connection Status Management**: ✅ Complete - New status system with UI integration
- **Password Reset Security**: ✅ Complete - Enhanced security with token cleanup and audit logging
- **Connections Management Tests**: ✅ **COMPLETED** - 30/30 tests passing (100% success rate)
  - ✅ **Fixed**: Login redirect issues, submit button selectors, connection card selectors
  - ✅ **Fixed**: Search timeout issues, test robustness, modal cleanup
  - ✅ **Completed**: All connection CRUD operations, OAuth2 flows, security validation

## Testing Philosophy

### No Mock Data Policy

**Core Principle**: Never mock database operations or authentication in development or production code. All tests must use:

- Real PostgreSQL database connections
- Real users with bcrypt-hashed passwords
- Real JWT tokens from actual login flows
- Real API endpoints with proper authentication

**Rationale**:

- Catches real integration issues early
- Ensures authentication flows work end-to-end
- Prevents bugs from reaching production
- Maintains confidence in the codebase

**Guardrails**:

- Automated checks prevent OpenAPI spec mocks in tests
- Pre-commit hooks block mock data in non-test code
- CI pipeline enforces no-mock-data policy
- Negative tests ensure no `.spec.mock.json` files exist

### UX Compliance Policy

**Core Principle**: All tests must validate best-in-class UX standards as defined in `docs/UX_SPEC.md`.

**Requirements**:

- **Headings & Hierarchy**: Tests must assert correct `<h1>`/`<h2>` tags and descriptive text
- **Form Fields**: Tests must validate proper labels, required indicators, and ARIA attributes
- **Buttons**: Tests must check descriptive button text and loading states
- **Error/Success Messaging**: Tests must validate accessible error/success containers
- **Navigation**: Tests must verify clear navigation links and next-step guidance
- **Accessibility**: Tests must validate keyboard navigation and ARIA compliance

**Rationale**:

- Ensures consistent user experience across all features
- Prevents UX regressions during development
- Maintains accessibility standards
- Supports activation and adoption metrics

**Guardrails**:

- E2E tests must validate UX spec requirements
- Unit tests must check component accessibility
- CI pipeline enforces UX compliance checks
- UX violations block commits per commit checklist

### Unit Test Mocking Strategy

**For Unit Tests Only**: Use proper mocking for external dependencies to ensure fast, isolated tests:

- **Prisma Client**: Mocked in unit tests for fast execution
- **External APIs**: Mocked to avoid network dependencies
- **File System**: Mocked to avoid I/O operations
- **Time-dependent operations**: Mocked for deterministic tests

**Integration Tests**: Always use real dependencies for end-to-end validation.

## Test Infrastructure

### Jest Configuration

The project uses a comprehensive Jest setup with polyfills and separate configurations for different test types:

#### Main Jest Configuration (`jest.config.js`)

- **Environment**: jsdom for unit tests
- **Polyfills**: Comprehensive polyfills for Node.js APIs (TextEncoder, TextDecoder, crypto, fetch, structuredClone)
- **Coverage**: Separate coverage directories for unit tests
- **Memory Management**: Optimized worker configuration and memory limits
- **ES Module Support**: Transform patterns for ES modules like node-fetch
- **Environment Variables**: Test-specific environment loading with dotenv

#### Integration Test Configuration (`jest.integration.config.js`)

- **Environment**: Node.js for integration tests
- **Timeout**: Extended timeout (30s) for database and API operations
- **Setup**: Separate setup file for integration test environment
- **Coverage**: Dedicated coverage reporting for integration tests

#### Polyfill Configuration (`jest.polyfill.js`)

- **TextEncoder/TextDecoder**: Required for pg-boss and other Node.js modules
- **Crypto API**: Web Crypto API polyfill for encryption operations
- **Fetch API**: Custom fetch implementation for HTTP requests in tests
- **StructuredClone**: JSON-based polyfill for object cloning
- **GlobalThis**: Support for older Node.js versions

#### Key Features

- **Memory Optimization**: Configurable memory limits and worker counts
- **Test Isolation**: Clear mocks between tests with resetMocks and restoreMocks
- **Module Resolution**: Proper path mapping for TypeScript imports
- **Environment Variables**: Test-specific environment configuration
- **ES Module Compatibility**: Transform patterns for modern JavaScript modules

## Database Migration Considerations

### Test Database Setup

**Important**: When running database migrations (`prisma migrate reset` or `prisma migrate deploy`), be aware that:

1. **Test Data Loss**: Migrations will drop and recreate all tables, removing any existing test data
2. **E2E Test Impact**: E2E tests that create data during execution may fail if the UI doesn't refresh properly after data creation
3. **Database Sync**: Both main database (`apiq_mvp`) and test database (`apiq_test`) must be migrated separately

### Troubleshooting E2E Test Failures

If E2E tests fail after database migrations:

1. **Check Server Status**: Ensure the development server is running (`npm run dev`)
2. **Verify API Functionality**: Test API endpoints directly (e.g., `curl http://localhost:3000/api/health`)
3. **Check Database Schema**: Verify both databases have the correct schema
4. **UI Refresh Issues**: Some E2E failures may be UI-only (backend working correctly)

### Database Migration Commands

```bash
# Reset and migrate main database
npx prisma migrate reset --force

# Migrate test database separately
DATABASE_URL="postgresql://connorbowen@localhost:5432/apiq_test" npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate
```

## E2E Testing

### UX-Compliant E2E Testing

All E2E tests follow the UX-compliant testing approach documented in `docs/UX_COMPLIANT_TESTING.md`. This ensures:

- **No Mocking**: All tests use real authentication and data
- **UX Spec Compliance**: Tests validate heading hierarchy, accessibility, and user experience
- **PRD Requirements**: Tests ensure activation-first UX and natural language interfaces
- **User Rules Compliance**: Tests follow the no-mock-data policy for E2E tests

### E2E Test Commands

For detailed E2E testing commands and workflows, see `docs/E2E_TEST_GUIDE.md`.

### UX Compliance Helper

The `UXComplianceHelper` class in `tests/helpers/uxCompliance.ts` provides comprehensive validation methods for all UX spec requirements:

```typescript
import { UXComplianceHelper } from '../../helpers/uxCompliance';

const uxHelper = new UXComplianceHelper(page);

// Validate full UX compliance
await uxHelper.validateFullUXCompliance();

// Validate specific patterns
await uxHelper.validateWorkflowCreationUX();
await uxHelper.validateWorkflowManagementUX();
```

### E2E Test Status

For current E2E test status and audit results, see:
- `docs/E2E_TEST_SUMMARY.md` - Current test results and status
- `docs/E2E_UX_COMPLIANCE_AUDIT.md` - UX compliance audit results
- `docs/E2E_TEST_FIXES_ACTION_PLAN.md` - Action plan for test improvements

## E2E Test Timeout Handling & Error Management

### Context-Aware Error Handling

When writing E2E tests that involve API calls or long-running operations, it's important to handle Playwright context closure gracefully. The following pattern should be used for robust error handling:

```typescript
// Example: API-heavy test with proper error handling
test('should handle loading states and success feedback', async ({ page }) => {
  test.setTimeout(60000); // Increase timeout for API calls
  
  // ... test setup ...
  
  // Intercept API calls
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/api/workflows/generate') && response.request().method() === 'POST',
    { timeout: 30000 }
  );
  
  // Submit form
  await generateButton.click();
  
  // Wait for API response with context-aware error handling
  try {
    const response = await responsePromise;
    const responseBody = await response.json();
    
    if (responseBody.success) {
      await expect(page.getByTestId('success-message')).toBeVisible();
    } else {
      await expect(page.getByTestId('error-message')).toBeVisible();
    }
  } catch (error) {
    // Check if page context is still available before accessing elements
    try {
      const isStillLoading = await generateButton.isDisabled();
      if (isStillLoading) {
        throw new Error('Operation is stuck in loading state. Check API endpoint and UI state management.');
      }
    } catch (contextError) {
      // If we can't access the page (context closed), the original error is more relevant
      console.log('Page context unavailable during error handling:', contextError.message);
    }
    throw error;
  }
});
```

### Timeout Management Best Practices

#### 1. **Test-Level Timeouts**
For tests involving API calls or complex UI interactions:
```typescript
test('should complete complex operation', async ({ page }) => {
  test.setTimeout(60000); // Increase from default 15s for API-heavy tests
  // ... test implementation
});
```

#### 2. **Element-Level Timeouts**
For specific element interactions:
```typescript
// Wait for form to be ready and NOT in loading state
await expect(chatInput).not.toBeDisabled({ timeout: 5000 });

// Wait for loading state to be set
await expect(generateButton).toBeDisabled({ timeout: 10000 });
```

#### 3. **API Response Timeouts**
For API call interception:
```typescript
const responsePromise = page.waitForResponse(
  response => response.url().includes('/api/workflows/generate'),
  { timeout: 30000 } // 30s for API responses
);
```

### Common Error Patterns & Solutions

#### Issue: "Target page, context or browser has been closed"
**Cause**: Test timeout exceeded, causing Playwright to close the browser context
**Solution**: Use context-aware error handling as shown above

#### Issue: Tests stuck in loading state
**Cause**: Form validation or API call never completes
**Solution**: Add form readiness checks and clear existing content:
```typescript
// Ensure form is ready before proceeding
await expect(chatInput).not.toBeDisabled({ timeout: 5000 });

// Clear any existing content
await chatInput.clear();
await chatInput.fill('New test content');
```

#### Issue: API calls timing out
**Cause**: Network latency or server response delays
**Solution**: Increase timeouts appropriately:
```typescript
test.setTimeout(60000); // For API-heavy tests
const responsePromise = page.waitForResponse(/* ... */, { timeout: 30000 });
```

### Test Reliability Improvements

The workflow management tests have been updated with these patterns to ensure:

- ✅ **Robust error handling** for context closure scenarios
- ✅ **Appropriate timeouts** for API-heavy operations
- ✅ **Form readiness validation** to prevent stuck states
- ✅ **Context-aware error messages** for better debugging
- ✅ **Graceful degradation** when page context is unavailable

These patterns should be applied to all E2E tests that involve:
- API calls with response interception
- Long-running operations
- Complex form interactions
- Real-time feedback validation

## Test Commands

### Quick Commands

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests only
npm run test:e2e

# Run UX-compliant E2E tests
npm run test:e2e:ux-compliant
```

### Advanced Commands

```bash
# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- path/to/test-file.test.ts

# Run tests with specific pattern
npm test -- --testNamePattern="workflow"
```

## Test Patterns

### Unit Test Patterns

```typescript
// Example unit test with proper mocking
import { jest } from '@jest/globals';
import { MyService } from '../MyService';

// Mock external dependencies
jest.mock('../externalService');

describe('MyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should process data correctly', async () => {
    const service = new MyService();
    const result = await service.processData('test');
    expect(result).toBe('processed');
  });
});
```

### Integration Test Patterns

```typescript
// Example integration test with real dependencies
import { createTestUser, cleanupTestUser } from '../helpers/testUtils';

describe('User API Integration', () => {
  let testUser: TestUser;

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  afterEach(async () => {
    await cleanupTestUser(testUser);
  });

  test('should create user with real database', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'test@example.com', password: 'password' });
    
    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('test@example.com');
  });
});
```

### E2E Test Patterns

```typescript
// Example E2E test with UX compliance
import { UXComplianceHelper } from '../../helpers/uxCompliance';

test.describe('Workflow Management - UX Compliant', () => {
  let uxHelper: UXComplianceHelper;

  test.beforeEach(async ({ page }) => {
    uxHelper = new UXComplianceHelper(page);
    await createTestUser();
    await loginAsTestUser(page);
  });

  test('should create workflow with natural language interface', async ({ page }) => {
    await page.goto('/workflows/create');
    
    // Validate UX compliance
    await uxHelper.validateWorkflowCreationUX();
    
    // Test natural language interface
    await page.getByPlaceholder(/describe.*workflow/i).fill('Send email when form is submitted');
    await page.getByRole('button', { name: /generate/i }).click();
    
    // Validate loading state
    await uxHelper.validateLoadingState('button[type="submit"]');
    
    // Validate success
    await uxHelper.validateSuccessContainer(/workflow.*created/i);
  });
});
```

## Best Practices

### Test Organization

1. **Unit Tests**: Test individual functions and components in isolation
2. **Integration Tests**: Test API endpoints and database interactions
3. **E2E Tests**: Test complete user journeys with UX compliance

### Test Data Management

1. **Unique Identifiers**: Use unique emails and IDs for each test
2. **Cleanup**: Always clean up test data after tests
3. **Isolation**: Tests should not depend on each other
4. **Real Data**: Use real database operations, never mock data

### UX Compliance

1. **Accessibility**: Test keyboard navigation and ARIA compliance
2. **Loading States**: Validate loading indicators and disabled states
3. **Error Handling**: Test error messages and recovery paths
4. **Success Feedback**: Validate success messages and next steps

### Performance

1. **Fast Unit Tests**: Unit tests should run in milliseconds
2. **Parallel Execution**: Tests should support parallel execution
3. **Memory Management**: Clean up resources to prevent memory leaks
4. **Timeout Management**: Set appropriate timeouts for different test types

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Use `./scripts/kill-port-3000.sh` to clean up ports
2. **Database Issues**: Ensure test database is properly configured
3. **Mock Issues**: Check that mocks are properly reset between tests
4. **UX Compliance**: Use the UXComplianceHelper for consistent validation

### Debug Commands

```bash
# Debug E2E tests
npm run test:e2e:debug

# Run tests with verbose output
npm test -- --verbose

# Run tests with specific environment
NODE_ENV=test npm test
```

## References

- **UX Spec**: `docs/UX_SPEC.md` - UX requirements and patterns
- **PRD**: `docs/prd.md` - Product requirements and user stories
- **User Rules**: `docs/user-rules.md` - Development guidelines and rules
- **E2E Guide**: `docs/E2E_TEST_GUIDE.md` - E2E testing commands and workflows
- **UX Compliant Testing**: `docs/UX_COMPLIANT_TESTING.md` - UX-compliant testing approach
- **Test Summary**: `docs/TEST_SUMMARY.md` - Current test status and achievements

## Workflow Management E2E Test Coverage (2025-07-08)

- All workflow management E2E tests now robustly cover both success and error scenarios for workflow creation, monitoring, and management.
- Tests include:
  - Natural language workflow creation (success and error cases)
  - API response handling with debug logs and .waitForResponse
  - Delete dialog rendering and accessibility
  - Workflow card clickability (no separate View link)
  - Dashboard and monitoring UX compliance
  - Retry logic for workflow existence in monitoring tests
  - Increased timeouts for slow API/UI responses
- All 17 tests are passing as of this date.

### Key Improvements
- Increased selector and API timeouts for reliability
- Retry/wait logic for workflow creation visibility
- Tests now validate both happy path and error UX
- All changes reflected in `tests/e2e/workflow-engine/workflow-management.test.ts`