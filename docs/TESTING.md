# APIQ Testing Guide

## Overview

This document outlines the testing strategy and guidelines for the APIQ platform. We follow a **strict no-mock-data policy** for database and authentication operations, ensuring all tests use real database connections and real authentication flows.

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

## Test Categories

### 1. Unit Tests (`/tests/unit/`)

**Purpose**: Test individual functions and components in isolation
**Scope**: Utility functions, business logic, component rendering, middleware, services
**Mocking**: Only mock external services (OpenAI, external APIs, Winston logger), never database or auth
**Coverage Target**: >90% on business logic, >80% on utilities and middleware

#### Recent Improvements
- **Comprehensive utility testing**: All encryption, logging, and parsing utilities are fully tested
- **Middleware coverage**: Error handling and rate limiting middleware have complete test coverage
- **Service testing**: OpenAI service has 89%+ coverage with robust mocking
- **Structured logging**: All logging follows safe, non-circular patterns

```typescript
// ✅ GOOD: Unit test for utility function
describe('encryption utilities', () => {
  it('should encrypt and decrypt data correctly', () => {
    const originalData = { apiKey: 'secret-key' };
    const encrypted = encryptData(originalData);
    const decrypted = decryptData(encrypted);
    
    expect(decrypted).toEqual(originalData);
  });
});

// ✅ GOOD: Mock external service only
jest.mock('openai', () => jest.fn());
jest.mock('axios', () => jest.fn());

// ✅ GOOD: Structured logging test
it('should log error with safe metadata', () => {
  const error = new Error('Test error');
  logError('Operation failed', error, { 
    userId: '123', 
    operation: 'test' 
  });
  
  expect(mockLogger.error).toHaveBeenCalledWith(
    'Operation failed',
    expect.objectContaining({
      error: 'Test error',
      userId: '123',
      operation: 'test'
    })
  );
});
```

### 2. Integration Tests (`/tests/integration/`)

**Purpose**: Test API endpoints and database interactions end-to-end
**Scope**: Full request/response cycles with real database
**Authentication**: Real users with bcrypt-hashed passwords
**Database**: Real PostgreSQL connections, no mocks
**Cleanup**: Proper test data cleanup between tests

```typescript
// ✅ GOOD: Real integration test
describe('API Connections Integration Tests', () => {
  let accessToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create real test user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const testUser = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Test Admin User',
        role: 'ADMIN'
      }
    });
    
    // Login to get real JWT
    const { req, res } = createMocks({
      method: 'POST',
      body: { email: 'admin@example.com', password: 'admin123' }
    });
    await loginHandler(req as any, res as any);
    const data = JSON.parse(res._getData());
    accessToken = data.data.accessToken;
    testUserId = data.data.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.apiConnection.deleteMany({
      where: { userId: testUserId }
    });
    await prisma.user.deleteMany({
      where: { id: testUserId }
    });
    await prisma.$disconnect();
  });

  it('should create API connection', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
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
});
```

### 3. End-to-End Tests (`/tests/e2e/`)

**Purpose**: Test complete user workflows
**Scope**: Full browser automation with real backend
**Data**: Real database with test users
**Environment**: Separate test database

```typescript
// ✅ GOOD: E2E test with real data
test('complete workflow creation', async ({ page }) => {
  // Navigate to dashboard
  await page.goto('/dashboard');
  
  // Login with real credentials
  await page.fill('[data-testid="email"]', 'admin@example.com');
  await page.fill('[data-testid="password"]', 'admin123');
  await page.click('[data-testid="login-button"]');
  
  // Add API connection
  await page.click('[data-testid="add-api-button"]');
  await page.fill('[data-testid="api-name"]', 'Test API');
  await page.fill('[data-testid="api-url"]', 'https://api.example.com');
  await page.click('[data-testid="submit-api"]');
  
  // Verify success
  await expect(page.locator('[data-testid="api-success"]')).toBeVisible();
});
```

## Testing Best Practices

### Database Testing

```typescript
// ✅ GOOD: Real database operations
beforeAll(async () => {
  // Test database connection
  await prisma.$connect();
  
  // Create test data
  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: await bcrypt.hash('testpass123', 10),
      name: 'Test User',
      role: 'USER'
    }
  });
});

// ❌ BAD: Mocking database
jest.mock('../../../lib/database/client', () => ({
  prisma: { user: { findFirst: jest.fn() } }
}));
```

### Authentication Testing

```typescript
// ✅ GOOD: Real authentication flow
it('should authenticate with valid credentials', async () => {
  const { req, res } = createMocks({
    method: 'POST',
    body: { email: 'admin@example.com', password: 'admin123' }
  });
  
  await loginHandler(req as any, res as any);
  
  expect(res._getStatusCode()).toBe(200);
  const data = JSON.parse(res._getData());
  expect(data.success).toBe(true);
  expect(data.data.accessToken).toBeDefined();
});

// ❌ BAD: Mocking JWT
jest.mock('jsonwebtoken');
(jwt.sign as jest.Mock).mockReturnValue('fake-token');
```

### Test Data Management

```typescript
// ✅ GOOD: Proper cleanup
afterEach(async () => {
  // Clean up test data
  await prisma.apiConnection.deleteMany({
    where: { userId: testUserId }
  });
  await prisma.user.deleteMany({
    where: { id: testUserId }
  });
});

// ✅ GOOD: Unique test data
const uniqueEmail = `test-${Date.now()}@example.com`;
```

### Logging and Error Handling

```typescript
// ✅ GOOD: Safe, structured logging
logError('API call failed', error, {
  endpoint: '/api/users',
  method: 'GET',
  userId: user.id,
  statusCode: 500
});

// ❌ BAD: Logging entire objects
logError('API call failed', error, { request, response, user });
```

## Current Test Coverage

### High Coverage Areas (>80%)
- **Services**: OpenAI service (89.55% lines, 100% functions)
- **Utilities**: Encryption (91.48% lines), Logger (87.17% lines)
- **API Parser**: 100% lines and functions
- **RBAC**: 100% lines and functions
- **Database**: 98.55% lines and functions
- **Middleware**: Error handling (80.72% lines), Rate limiting (82.45% lines)

### Test Statistics
- **Total test suites**: 15
- **Total tests**: 203
- **Pass rate**: 100%
- **Coverage**: 60.12% lines (core business logic >80%)

## Running Tests

### All Tests
```bash
npm test
```

### With Coverage
```bash
npm test -- --coverage
```

### Specific Test Categories
```bash
# Unit tests only
npm test -- --testPathPattern="unit"

# Integration tests only
npm test -- --testPathPattern="integration"

# E2E tests only
npm test -- --testPathPattern="e2e"

# Specific file
npm test -- --testPathPattern="openaiService"
```

### Test Environment Setup
```bash
# Ensure test database is running
npm run db:test:setup

# Run tests with proper environment
NODE_ENV=test npm test
```

## Test Utilities

### Test Helpers (`/tests/helpers/`)
- `testUtils.ts`: Common test utilities for creating users, connections, and endpoints
- Real JWT generation from login endpoints
- Database cleanup utilities
- Mock request/response creators

### Test Data Factories
```typescript
// Create test user with real password hash
const testUser = await createTestUser({
  email: 'test@example.com',
  password: 'testpass123',
  role: 'ADMIN'
});

// Create API connection
const connection = await createTestConnection({
  userId: testUser.id,
  name: 'Test API',
  baseUrl: 'https://api.example.com'
});

// Get real JWT token
const token = await getAuthToken(testUser.email, 'testpass123');
```

## Continuous Integration

### GitHub Actions
- Runs all test suites on every PR
- Enforces coverage thresholds
- Validates no-mock-data policy
- Ensures all tests pass before merge

### Coverage Requirements
- **Statements**: 80% minimum (core business logic)
- **Branches**: 80% minimum (core business logic)
- **Functions**: 80% minimum (core business logic)
- **Lines**: 80% minimum (core business logic)

## Troubleshooting

### Common Issues

#### Test Database Connection
```bash
# Ensure test database is running
docker-compose -f docker-compose.test.yml up -d

# Reset test database
npm run db:test:reset
```

#### JWT Token Issues
```typescript
// Ensure real login flow is used
const token = await getAuthToken(email, password);
// Not: const token = 'fake-jwt-token';
```

#### Test Data Cleanup
```typescript
// Always clean up in afterAll/afterEach
afterAll(async () => {
  await cleanupTestData(testUserId);
  await prisma.$disconnect();
});
```

### Debugging Tests
```bash
# Run specific test with verbose output
npm test -- --testPathPattern="specific-test" --verbose

# Run tests in watch mode
npm test -- --watch

# Debug failing tests
npm test -- --testPathPattern="failing-test" --detectOpenHandles
```

## Best Practices Summary

1. **Never mock database or authentication**
2. **Use real JWT tokens from login flows**
3. **Clean up test data properly**
4. **Log safely with structured, non-circular data**
5. **Test error conditions and edge cases**
6. **Maintain high coverage on business logic**
7. **Use descriptive test names and assertions**
8. **Follow the no-mock-data philosophy consistently**

---

## 🧪 Test Types & Coverage

### 1. **Unit Tests**
- **Location:** `tests/unit/`
- **Purpose:** Test individual functions/utilities in isolation (e.g., OpenAPI parser, endpoint extraction, RBAC utils).
- **Examples:**
  - `tests/unit/lib/api/parser.test.ts` — OpenAPI spec parsing, error handling, hash generation
  - `tests/unit/lib/api/endpoints.test.ts` — Endpoint extraction, filtering, and DB logic

### 2. **Integration Tests**
- **Location:** `tests/integration/`
- **Purpose:** Test API routes and flows with mocked DB and service dependencies.
- **Examples:**
  - `tests/integration/api/connections.test.ts` — API connection creation, OpenAPI ingestion, endpoint extraction, error handling

### 3. **End-to-End (e2e) Tests**
- **Location:** `tests/e2e/`
- **Purpose:** Simulate real user/API flows across the stack (planned for Phase 3+).
- **Examples:**
  - `tests/e2e/app.test.ts` — (Planned) Full user journey: create connection → ingest spec → list endpoints → delete endpoints

## Authentication & Integration Testing

### Authentication Demo Script

- File: `scripts/test-auth.js`
- Requires: Node.js 18+ (for fetch)
- Usage:
  1. Start the dev server: `npm run dev`
  2. In another terminal: `node scripts/test-auth.js`
- The script will:
  - Log in as each test user (admin, user, super admin)
  - Test protected endpoints (listing, creating, deleting API connections/endpoints)
  - Demonstrate RBAC (e.g., only admins can delete endpoints)
  - Show error handling for invalid credentials and tokens

#### Test Users
- `admin@example.com` / `admin123` (ADMIN)
- `user@example.com` / `user123` (USER)
- `super@example.com` / `super123` (SUPER_ADMIN)

### Integration Tests

- Run all integration tests:
  ```bash
  npm test
  ```
- Run only authentication tests:
  ```bash
  npm test -- --testPathPattern=auth.test.ts
  ```
- Tests are located in `tests/integration/api/`.
- These tests cover login, token refresh, current user, and RBAC logic.

See also: `docs/QUICK_START.md` for a quick overview.

---

## 🟢 How to Run Tests

### **All Tests**
```bash
npm test
```

### **Unit Tests Only**
```bash
npm run test:unit
```

### **Integration Tests Only**
```bash
npm run test:integration
```

### **End-to-End (e2e) Tests**
```bash
npm run test:e2e
```

---

## 📝 Test Coverage Status
- [x] Unit tests for OpenAPI parser and endpoint extraction
- [x] Integration tests for API connection and endpoint flows
- [ ] e2e tests for full user journey (planned)
- [x] RBAC logic tested at unit/integration level

---

## 🛠️ Notes
- All tests use Jest (unit/integration) or Playwright (e2e)
- DB is mocked for unit/integration tests; e2e tests use a test DB
- See `package.json` scripts for more test commands

---

For any issues, see `docs/TROUBLESHOOTING.md` or ask in the project chat.

## Expanded Unit Test Coverage (2024-06)

### New and Updated Unit Tests

- **RBAC (src/lib/auth/rbac.ts)**
  - 100% coverage for all role/permission checks and user context retrieval.
  - Edge cases and role hierarchy integration.
  - File: `tests/unit/lib/auth/rbac.test.ts`

- **Database Initialization (src/database/init.ts)**
  - Initialization, reset, health check, and statistics logic.
  - All error handling paths, including admin creation and audit log failures.
  - Exported convenience functions.
  - File: `tests/unit/database/init.test.ts`

- **OpenAI Service (src/services/openaiService.ts)**
  - Constructor, workflow generation, workflow step execution, error handling, and API call logic.
  - File: `tests/unit/services/openaiService.test.ts`

### Testing Philosophy

- **Integration/E2E:** Always use real data, real DB, and real JWTs. No mock data for integration or E2E tests.
- **Unit Tests:** Mock external services (OpenAI, Prisma, etc.) and focus on logic, error handling, and edge cases.

### How to Run These Tests

- Run all tests:
  ```sh
  npm test
  ```
- Run only unit tests for a module:
  ```sh
  npm test -- --testPathPattern="rbac|init|openaiService"
  ```
- View coverage:
  ```sh
  npm test -- --coverage
  ```

### Coverage Summary
- RBAC and database initialization modules: **100% coverage**
- OpenAI service: **comprehensive logic and error handling coverage**
- Integration/E2E: All real data, no mocks 