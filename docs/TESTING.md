# APIQ Testing Guide

## Overview

APIQ MVP maintains a comprehensive test suite with **100% test success rate** (206/206 tests passing) across unit, integration, and end-to-end tests. The test infrastructure has been optimized for reliability and isolation while following a **strict no-mock-data policy** for database and authentication operations.

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
- **Coverage**: API endpoints, database operations, real API connections
- **Count**: 6 test suites, 89 tests
- **Status**: ✅ All passing
- **Authentication**: Real users with bcrypt-hashed passwords
- **Database**: Real PostgreSQL connections, no mocks

#### End-to-End Tests
- **Location**: `tests/e2e/`
- **Coverage**: Full user workflows and application behavior
- **Count**: 1 test suite, 22 tests
- **Status**: ✅ All passing
- **Data**: Real database with test users

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
- **Overall Coverage**: 89%+ across all test categories
- **Unit Tests**: 95%+ coverage on business logic
- **Integration Tests**: 100% coverage on API endpoints
- **E2E Tests**: Full workflow coverage

### Coverage Targets
- **Business Logic**: >90% coverage
- **Utilities and Middleware**: >80% coverage
- **API Endpoints**: 100% coverage
- **Authentication Flows**: 100% coverage

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

### ❌ DON'T
- Mock database operations
- Mock authentication flows
- Use hardcoded test credentials
- Leave test data in database
- Use mock OpenAPI specifications
- Log circular structures
- Skip cleanup in tests

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

### Stress Testing
- **Concurrent Users**: Multiple simultaneous requests
- **Database Connections**: Connection pool management
- **Memory Usage**: Memory leaks and garbage collection
- **Error Handling**: System behavior under stress

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
      - run: npm run test:e2e
      - run: npm run check:no-mock-data
```

### Quality Gates
- **Test Coverage**: Minimum 80% overall coverage
- **Test Success**: 100% test pass rate required
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

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test with verbose output
npm test -- --verbose --testNamePattern="API Connections"
```

## Test Metrics

### Current Status
- **Total Tests**: 206 tests
- **Success Rate**: 100% (206/206 passing)
- **Coverage**: 89%+ overall
- **Performance**: <2s average test execution
- **Reliability**: 0% flaky tests

### Historical Trends
- **Test Count**: Increased from 150 to 206 tests
- **Coverage**: Improved from 75% to 89%+
- **Success Rate**: Improved from 88.8% to 100%
- **Execution Time**: Reduced from 5s to <2s average

---

**Note**: This testing guide reflects the current state of the APIQ test suite. All tests must pass before any code is merged to main, and the no-mock-data policy is strictly enforced through automated checks and code reviews.
