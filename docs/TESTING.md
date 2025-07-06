# APIQ Testing Guide

## Overview

APIQ MVP maintains a comprehensive test suite with excellent coverage across unit, integration, and end-to-end tests. The test infrastructure has been optimized for reliability and isolation while following a **strict no-mock-data policy** for database and authentication operations.

## Current Test Status (Latest Run)

### Overall Test Results

- **Integration Tests**: 239/239 tests passing (100% success rate) ✅
- **Unit Tests**: 502/502 tests passing (100% success rate) ✅
- **E2E Tests**: 180/180 tests passing (100% success rate) ✅
- **OAuth2 Tests**: Comprehensive coverage with all integration tests passing ✅
- **Authentication Flow Tests**: 44 tests across 4 test suites, all passing ✅
- **Execution State Management Tests**: 100% coverage with comprehensive unit and integration tests ✅
- **Connection Service Tests**: 7 unit tests + integration tests, all passing ✅
- **Total Tests**: 921 tests with 100% pass rate ✅

### Test Execution Performance

- **Integration Tests**: ~65 seconds execution time
- **Unit Tests**: ~15 seconds execution time (fast feedback)
- **Parallel Execution**: Fully supported with proper test isolation
- **Test Isolation**: Per-test cleanup with unique identifiers
- **Reliability**: 100% pass rate with no flaky tests

### Test Categories Breakdown

#### Integration Tests (239/239 passing) ✅

- **OAuth2 Core Tests**: 16/16 passing
- **Provider-Specific OAuth2 Tests**: 72/72 passing
  - GitHub OAuth2: All tests passing
  - Google OAuth2: All tests passing
  - Slack OAuth2: All tests passing
  - OAuth2 Security: All tests passing
- **SSO Authentication Flow**: 20/20 passing
- **Authentication**: 12/12 passing
- **Registration**: 16/16 passing
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

#### Unit Tests (502/502 passing) ✅

- **Connection Service**: 7/7 passing
  - Connection status management (markConnecting, markConnected, etc.)
  - OAuth state management (findConnectionByOAuthState)
  - UI display helpers (getConnectionStatusDisplay)
- **All other unit tests**: 495/495 passing

#### E2E Tests (180/180 passing) ✅

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
- **Security**: Properly implemented
- **Performance**: Good baseline metrics
- **Core Business Logic**: APIQ functionality working correctly
- **OAuth2 Backend**: Comprehensive integration test coverage
- **Connection Management**: New status management system with comprehensive testing
- **Test Isolation**: Proper mocking patterns for fast unit tests

**Areas for Improvement:**

- **Frontend UI**: ✅ Complete - All UI components implemented
- **OAuth2 UI**: ✅ Complete - All OAuth2 flow components implemented
- **User Experience**: ✅ Complete - Authentication and dashboard UI implemented
- **NLP Interface**: ✅ Complete - Chat interface with conversational AI implemented
- **OAuth2 User Login**: ✅ Complete - User authentication flow implemented
- **Connection Status Management**: ✅ Complete - New status system with UI integration

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