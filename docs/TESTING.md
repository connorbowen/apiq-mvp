# APIQ Testing Guide

## Overview

APIQ MVP maintains a comprehensive test suite with excellent coverage across unit, integration, and end-to-end tests. The test infrastructure has been optimized for reliability and isolation while following a **strict no-mock-data policy** for database and authentication operations.

## Current Test Status (Latest Run)

### Overall Test Results
- **Integration Tests**: 111/111 tests passing ✅
- **Unit Tests**: All passing ✅
- **E2E Tests**: 87/144 tests passing (60% success rate) ⚠️
- **OAuth2 Tests**: Comprehensive coverage with all integration tests passing ✅

### Test Categories Breakdown

#### Integration Tests (111/111 passing) ✅
- **OAuth2 Core Tests**: 16/16 passing
- **Provider-Specific OAuth2 Tests**: 72/72 passing
  - GitHub OAuth2: All tests passing
  - Google OAuth2: All tests passing
  - Slack OAuth2: All tests passing
  - OAuth2 Security: All tests passing
- **SSO Authentication Flow**: 23/23 passing
- **API Integration**: All tests passing
- **Database Integration**: All tests passing

#### E2E Tests (87/144 passing) ⚠️
- **API Health Check Tests**: All passing ✅
- **API Integration Tests**: All passing ✅
- **Database Integration Tests**: All passing ✅
- **Core APIQ Functionality**: All passing ✅
- **Security Tests**: All passing ✅
- **Performance Tests**: All passing ✅
- **Frontend UI Tests**: 18 failures (missing UI components) ❌
- **OAuth2 Workflow Tests**: 36 failures (missing OAuth2 UI) ❌

### Key Findings

**Strengths:**
- **API Layer**: Excellent coverage and functionality
- **Database Integration**: Robust and reliable
- **Security**: Properly implemented
- **Performance**: Good baseline metrics
- **Core Business Logic**: APIQ functionality working correctly
- **OAuth2 Backend**: Comprehensive integration test coverage

**Areas for Improvement:**
- **Frontend UI**: Missing user interface components
- **OAuth2 UI**: Missing frontend OAuth2 flow components
- **User Experience**: Authentication and dashboard UI needed

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

## Test Infrastructure

### Test Helper Scripts

**Location**: `tests/helpers/`
**Purpose**: Manual testing utilities and debugging tools

**Available Scripts**:
- `debug-parser.ts` - Debug OpenAPI parser issues
- `test-db.ts` - Test database connectivity and operations
- `test-petstore-api.ts` - Test against Swagger Petstore API
- `test-petstore-endpoints.ts` - Test endpoint extraction from Petstore
- `test-stripe-auth.ts` - Test Stripe OAuth authentication
- `oauth2TestUtils.ts` - OAuth2 testing utilities and helpers
- `testUtils.ts` - Shared test utilities and helpers

**Usage**:
```bash
# Run TypeScript test helpers
npx tsx tests/helpers/test-db.ts
npx tsx tests/helpers/debug-parser.ts

# Run with environment variables
dotenv -e .env.test -- npx tsx tests/helpers/test-stripe-auth.ts
```

**Note**: All test helper scripts are TypeScript-only for consistency and type safety.

### Test Isolation Improvements

The test suite has been enhanced with robust isolation mechanisms:

- **Unique Suite Identifiers**: Each test suite generates unique identifiers to prevent conflicts
- **Comprehensive Cleanup**: Automatic cleanup of test data between test runs
- **Race Condition Prevention**: Improved user creation with upsert pattern
- **Database Isolation**: Proper cleanup of orphaned connections and endpoints
- **Mock Detection**: Automated detection and prevention of OpenAPI spec mocks

### Test Categories

#### Unit Tests
- **Location**: `tests/unit/`
- **Coverage**: Core business logic, utilities, and middleware
- **Count**: 8 test suites, 95 tests
- **Status**: ✅ All passing
- **Mocking**: Only mock external services (OpenAI, external APIs, Winston logger), never database or auth

#### Integration Tests
- **Location**: `tests/integration/`
- **Coverage**: API endpoints, database operations, real API connections, OAuth2 flows
- **Count**: 6 test suites, 111 tests
- **Status**: ✅ All passing
- **Authentication**: Real users with bcrypt-hashed passwords
- **Database**: Real PostgreSQL connections, no mocks
- **OAuth2**: Comprehensive provider testing (GitHub, Google, Slack)

#### End-to-End Tests
- **Location**: `tests/e2e/`
- **Coverage**: Full user workflows and application behavior
- **Count**: 2 test suites, 144 tests
- **Status**: ⚠️ 87/144 passing (60% success rate)
- **Data**: Real database with test users
- **Issues**: Missing frontend UI components for OAuth2 and authentication

## Running Tests

### Full Test Suite
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e

# Run OAuth2 tests specifically
npm run test:oauth2

# Run E2E tests with development server
npm run test:e2e:with-server
```

### OAuth2 Testing

**Integration Tests**
```bash
# Run all OAuth2 integration tests
npx dotenv -e .env.test -- jest tests/integration/api/oauth2*.test.ts

# Run specific OAuth2 provider tests
npx dotenv -e .env.test -- jest tests/integration/api/oauth2-github.test.ts
npx dotenv -e .env.test -- jest tests/integration/api/oauth2-google.test.ts
npx dotenv -e .env.test -- jest tests/integration/api/oauth2-slack.test.ts
npx dotenv -e .env.test -- jest tests/integration/api/oauth2-security.test.ts
```

**E2E Tests**
```bash
# Run OAuth2 E2E tests (requires running server)
npm run test:e2e:with-server tests/e2e/oauth2-workflow.test.ts
```

### Test Utilities

**Test Helper Functions**
```typescript
// ✅ GOOD: Real integration test with proper authentication
describe('API Connections Integration Tests', () => {
  const testSuite = createTestSuite('Connections Tests');
  let testUser: any;

  beforeAll(async () => {
    await testSuite.beforeAll();
    
    // Create test user with real authentication
    testUser = await testSuite.createUser(
      'admin@example.com',
      'admin123',
      Role.ADMIN,
      'Test Admin User'
    );
  });

  afterAll(async () => {
    await testSuite.afterAll();
  });

  it('should create API connection with authentication', async () => {
    const { req, res } = createAuthenticatedRequest('POST', testUser, {
      body: {
        name: 'Test API',
        baseUrl: 'https://api.example.com',
        authType: 'NONE'
      }
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Test API');
  });

  it('should retrieve connections with proper response structure', async () => {
    // Create test connections first
    await testSuite.createConnection(testUser, 'Conn1', 'https://api1.example.com', 'NONE');
    await testSuite.createConnection(testUser, 'Conn2', 'https://api2.example.com', 'NONE');

    const { req, res } = createAuthenticatedRequest('GET', testUser);

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    
    // ✅ CORRECT: Expect structured response with connections array
    expect(Array.isArray(data.data.connections)).toBe(true);
    expect(data.data.connections.length).toBeGreaterThanOrEqual(2);
    
    // Verify metadata fields
    expect(data.data.total).toBeDefined();
    expect(data.data.active).toBeDefined();
    expect(data.data.failed).toBeDefined();
    
    // Verify our test connections are included
    const connectionNames = data.data.connections.map((conn: any) => conn.name);
    expect(connectionNames).toContain('Conn1');
    expect(connectionNames).toContain('Conn2');
  });

  it('should reject unauthenticated requests', async () => {
    const { req, res } = createUnauthenticatedRequest('POST', {
      body: {
        name: 'Test API',
        baseUrl: 'https://api.example.com',
        authType: 'NONE'
      }
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(401);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
    expect(data.error).toBe('Authentication required');
  });
});
```

**OAuth2 Test Helpers**
```typescript
// ✅ GOOD: OAuth2 integration test with proper setup
import { 
  createTestOAuth2Connection, 
  createTestOAuth2State, 
  cleanupOAuth2TestData 
} from '../../helpers/oauth2TestUtils';

describe('GitHub OAuth2 Flow Integration Tests', () => {
  let testUser: any;
  let testApiConnection: any;

  beforeAll(async () => {
    testUser = await createTestUser('github-oauth2-test@example.com', 'test-password-123');
    testApiConnection = await createTestOAuth2Connection(prisma, testUser.id, 'github');
  });

  afterAll(async () => {
    await cleanupOAuth2TestData(prisma, testUser.id, testApiConnection.id);
  });

  it('should generate GitHub OAuth2 authorization URL', async () => {
    const { req, res } = createOAuth2AuthenticatedRequest('GET', testUser, {
      query: {
        provider: 'github',
        connectionId: testApiConnection.id,
        scope: 'repo,user'
      }
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.data.authorizationUrl).toContain('github.com');
    expect(data.data.state).toBeDefined();
  });
});
```

**Test Suite Management**
```typescript
// ✅ GOOD: Test suite with proper cleanup
const testSuite = createTestSuite('API Connections');

describe('API Connection Tests', () => {
  beforeAll(testSuite.beforeAll);
  afterAll(testSuite.afterAll);

  it('should create connection', async () => {
    const user = await testSuite.createUser();
    const connection = await testSuite.createConnection(user);
    
    expect(connection.id).toBeDefined();
    expect(connection.userId).toBe(user.id);
  });
});
```

## Test Coverage

### Current Coverage Status
- **Integration Tests**: 111/111 tests passing (100% success rate)
- **Unit Tests**: All passing
- **E2E Tests**: 87/144 tests passing (60% success rate)
- **OAuth2 Integration**: 111/111 tests passing (100% success rate)

### Coverage Targets
- **Business Logic**: >90% coverage
- **Utilities and Middleware**: >80% coverage
- **API Endpoints**: 100% coverage
- **Authentication Flows**: 100% coverage
- **OAuth2 Flows**: 100% coverage

## OAuth2 Testing

### Comprehensive OAuth2 Test Coverage

The OAuth2 implementation has extensive test coverage across all major providers:

#### Provider-Specific Tests
- **GitHub OAuth2**: Complete flow testing including authorization, callback, token refresh
- **Google OAuth2**: Full OAuth2 workflow with Gmail scope support
- **Slack OAuth2**: Comprehensive testing with users scope
- **Security Tests**: State parameter validation, authentication requirements, error handling

#### Test Scenarios Covered
- ✅ Authorization URL generation
- ✅ OAuth2 callback processing
- ✅ Token refresh mechanisms
- ✅ State parameter validation
- ✅ Error handling for OAuth2 flows
- ✅ Provider configuration management
- ✅ Token encryption and security
- ✅ SSO integration flows

#### Test Results
- **Integration Tests**: 111/111 passing ✅
- **Security Validation**: All security tests passing ✅
- **Provider Support**: All supported providers tested ✅
- **Error Handling**: Comprehensive error scenario coverage ✅

### OAuth2 Test Utilities

```typescript
// OAuth2 test helper functions
import { 
  createTestOAuth2Connection,
  createTestOAuth2State,
  createExpiredOAuth2State,
  cleanupOAuth2TestData,
  createOAuth2AuthenticatedRequest
} from '../../helpers/oauth2TestUtils';

// Create OAuth2 connection for testing
const testApiConnection = await createTestOAuth2Connection(prisma, testUser.id, 'github');

// Create valid OAuth2 state
const validState = createTestOAuth2State(testUser.id, testApiConnection.id, 'github');

// Create expired OAuth2 state for testing
const expiredState = createExpiredOAuth2State(testUser.id, testApiConnection.id, 'github');

// Clean up OAuth2 test data
await cleanupOAuth2TestData(prisma, testUser.id, testApiConnection.id);
```

## Authentication Testing

### Real Authentication Flow

All integration tests use real authentication with the following pattern:

1. **Create Real User**: Use `createTestUser()` with bcrypt-hashed passwords
2. **Login to Get Tokens**: Call the actual login endpoint to get JWT tokens
3. **Use Authenticated Requests**: Use `createAuthenticatedRequest()` helper
4. **Test Unauthenticated Access**: Use `createUnauthenticatedRequest()` to verify rejection

### Authentication Helpers

```typescript
// ✅ GOOD: Use authentication helpers
import { createAuthenticatedRequest, createUnauthenticatedRequest } from '../../helpers/testUtils';

// For authenticated requests
const { req, res } = createAuthenticatedRequest('POST', testUser, {
  body: { /* request data */ }
});

// For unauthenticated requests (to test rejection)
const { req, res } = createUnauthenticatedRequest('POST', {
  body: { /* request data */ }
});
```

### Response Structure Validation

When testing API endpoints, ensure you validate the correct response structure:

```typescript
// ✅ CORRECT: For /api/connections GET endpoint
expect(Array.isArray(data.data.connections)).toBe(true);
expect(data.data.total).toBeDefined();
expect(data.data.active).toBeDefined();
expect(data.data.failed).toBeDefined();

// ❌ INCORRECT: Don't expect data.data to be an array directly
expect(Array.isArray(data.data)).toBe(true); // This will fail
```

## Mock Data Prevention

### Automated Checks

**Pre-commit Hook**
```bash
# Check for forbidden patterns
npm run check:no-mock-data
```

**CI Pipeline**
```yaml
# GitHub Actions workflow
- name: Check for mock data
  run: npm run check:no-mock-data
```

**Negative Tests**
```typescript
// ✅ GOOD: Negative test to prevent mocks
describe('Mock Prevention', () => {
  it('should not have OpenAPI spec mocks', () => {
    const mockFiles = glob.sync('**/*.spec.mock.json', { cwd: process.cwd() });
    expect(mockFiles).toHaveLength(0);
  });
});
```

### Forbidden Patterns
- `test-user-123`, `test-user-456`
- `demo-key`, `demo-token`
- `fake API`, `mock.*api`
- `create-test-user`
- `.spec.mock.json` files
- `__mocks__` directories for OpenAPI

## Test Best Practices

### ✅ DO
- Use real database connections
- Create real users with bcrypt-hashed passwords
- Use real JWT tokens from login flows
- Clean up test data properly
- Use unique identifiers to prevent conflicts
- Mock only external services (OpenAI, external APIs)
- Use structured logging with safe patterns
- Test error scenarios with real data
- Test OAuth2 flows with real provider configurations

### ❌ DON'T
- Mock database operations
- Mock authentication flows
- Use hardcoded test credentials
- Leave test data in database
- Use mock OpenAPI specifications
- Log circular structures
- Skip cleanup in tests
- Mock OAuth2 provider responses

## Test Environment Setup

### Database Configuration
```typescript
// Use real development database for tests
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/apiq_dev';
process.env.NODE_ENV = 'test';
```

### Authentication Setup
```typescript
// Real authentication environment
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-jwt-secret';
```

### OAuth2 Test Configuration
```typescript
// OAuth2 provider test configuration
process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.SLACK_CLIENT_ID = 'test-slack-client-id';
process.env.SLACK_CLIENT_SECRET = 'test-slack-client-secret';
```

### Test Data Management
```typescript
// Proper test data cleanup
export const cleanupTestData = async () => {
  await prisma.endpoint.deleteMany({
    where: { apiConnection: { user: { email: { contains: 'test-' } } } }
  });
  await prisma.apiConnection.deleteMany({
    where: { user: { email: { contains: 'test-' } } }
  });
  await prisma.user.deleteMany({
    where: { email: { contains: 'test-' } }
  });
};
```

## Performance Testing

### Load Testing
- **API Endpoint Performance**: Response time under load
- **Database Performance**: Query optimization and indexing
- **Authentication Performance**: Token validation and refresh
- **Cache Performance**: OpenAPI cache hit rates
- **OAuth2 Performance**: Authorization flow response times

### Stress Testing
- **Concurrent Users**: Multiple simultaneous requests
- **Database Connections**: Connection pool management
- **Memory Usage**: Memory leaks and garbage collection
- **Error Handling**: System behavior under stress
- **OAuth2 Flows**: Concurrent OAuth2 authorization requests

## Security Testing

### Authentication Testing
- **JWT Token Validation**: Token expiration and refresh
- **API Key Authentication**: Real API key validation
- **OAuth2 Flow Testing**: Complete OAuth2 flow validation
- **RBAC Testing**: Role-based access control
- **Session Management**: Session timeout and cleanup

### Security Validation
- **Input Validation**: SQL injection prevention
- **Output Encoding**: XSS prevention
- **Rate Limiting**: Abuse prevention
- **Error Handling**: Secure error responses
- **Audit Logging**: Security event logging
- **OAuth2 Security**: State parameter validation, CSRF protection

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:oauth2
      - run: npm run test:e2e
      - run: npm run check:no-mock-data
```

### Quality Gates
- **Test Coverage**: Minimum 80% overall coverage
- **Integration Tests**: 100% test pass rate required
- **OAuth2 Tests**: 100% OAuth2 integration test pass rate required
- **Mock Prevention**: No mock data in non-test code
- **Security Checks**: All security tests passing
- **Performance**: Response times within acceptable limits

## Troubleshooting

### Common Issues

**Test Isolation Problems**
```bash
# Clean up test database
npm run db:reset

# Clear test cache
npm run test -- --clearCache
```

**Authentication Issues**
```typescript
// Ensure proper JWT setup
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '24h';
```

**Database Connection Issues**
```typescript
// Ensure database connection
await prisma.$connect();
// ... tests ...
await prisma.$disconnect();
```

**OAuth2 Test Issues**
```typescript
// Ensure OAuth2 provider configuration
process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';

// Check OAuth2 state parameter
const state = createTestOAuth2State(userId, connectionId, 'github');
expect(state).toBeDefined();
```

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific OAuth2 tests with debug
DEBUG=oauth2:* npm run test:oauth2
```

## Future Improvements

### E2E Test Enhancements
- **Frontend UI Implementation**: Add missing UI components for OAuth2 flows
- **Authentication UI**: Implement login/signup forms
- **Dashboard UI**: Create user dashboard for managing connections
- **OAuth2 UI**: Build OAuth2 provider selection interface

### Test Coverage Expansion
- **Additional OAuth2 Providers**: Test more OAuth2 providers
- **Advanced OAuth2 Scenarios**: Test complex OAuth2 flows
- **Performance Testing**: Add load testing for OAuth2 flows
- **Security Testing**: Enhanced security validation for OAuth2

### Test Infrastructure
- **Test Data Management**: Improved test data cleanup
- **Parallel Testing**: Optimize test execution for faster feedback
- **Visual Testing**: Add visual regression testing for UI components
- **Accessibility Testing**: Ensure UI components meet accessibility standards
