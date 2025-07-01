# APIQ Testing Guide

## Overview

APIQ MVP maintains a comprehensive test suite with excellent coverage across unit, integration, and end-to-end tests. The test infrastructure has been optimized for reliability and isolation while following a **strict no-mock-data policy** for database and authentication operations.

## Current Test Status (Latest Run)

### Overall Test Results
- **Integration Tests**: 111/111 tests passing ✅
- **Unit Tests**: 602/602 tests passing (100% success rate) ✅
- **E2E Tests**: 180/180 tests passing (100% success rate) ✅
- **OAuth2 Tests**: Comprehensive coverage with all integration tests passing ✅
- **Authentication Flow Tests**: 44 tests across 4 test suites, all passing ✅
- **Total Tests**: 602 tests with 100% pass rate ✅

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

#### E2E Tests (180/180 passing) ✅
- **Authentication & SSO Tests**: 123 tests passing ✅
  - Login, session management, SSO flows
  - OAuth2 provider integration tests
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

**Areas for Improvement:**
- **Frontend UI**: ✅ Complete - All UI components implemented
- **OAuth2 UI**: ✅ Complete - All OAuth2 flow components implemented
- **User Experience**: ✅ Complete - Authentication and dashboard UI implemented
- **NLP Interface**: ✅ Complete - Chat interface with conversational AI implemented
- **OAuth2 User Login**: ✅ Complete - User authentication flow implemented

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

### E2E Test Organization

The E2E tests have been organized into logical groups for faster execution and better maintainability:

#### Test Group Structure
```
tests/e2e/
├── auth/                    # Authentication & SSO tests (123 tests)
│   ├── authentication-session.test.ts
│   ├── oauth2-workflow.test.ts
│   └── sso-workflows.test.ts
├── workflows/               # Workflow orchestration tests (57 tests)
│   ├── workflow-execution.test.ts
│   └── workflow-management.test.ts
├── connections/             # API connection management tests
│   ├── api-connection-management.test.ts
│   └── connections-management.test.ts
└── ui/                      # User interface and navigation tests
    ├── app.test.ts
    ├── basic-navigation.test.ts
    └── dashboard-navigation.test.ts
```

#### Benefits of Test Grouping
- **Faster Execution**: Run only the tests you need (e.g., `npm run test:e2e:auth`)
- **Better Organization**: Logical grouping by functionality
- **Easier Debugging**: Isolate issues to specific areas
- **Parallel Development**: Teams can work on different test groups
- **CI/CD Optimization**: Run critical tests first, others in parallel

#### Running Test Groups
```bash
# Run specific test groups
npm run test:e2e:auth        # Authentication & SSO (123 tests)
npm run test:e2e:workflows   # Workflow orchestration (57 tests)
npm run test:e2e:connections # API connections
npm run test:e2e:ui          # UI & navigation

# Run all E2E tests
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui-interactive
```

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
- **Coverage**: Core business logic, utilities, middleware, authentication flows, and components
- **Count**: 52 test suites, 602 tests (including 44 authentication flow tests)
- **Status**: ✅ All passing (100% success rate)
- **Mocking**: Only mock external services (OpenAI, external APIs, Winston logger), never database or auth
- **Recent Fixes**: 
  - ChatInterface component tests (Jest mock injection issues resolved)
  - OpenApiCache eviction tests (deterministic timestamp handling)
  - StepRunner tests (proper duration calculation for noop actions)
- **Authentication Flow Tests**: 
  - Signup page tests (redirect to success page)
  - Verify page tests (automatic sign-in and dashboard redirect)
  - Signup success page tests (resend verification, navigation)
  - Forgot password success page tests (security messaging, instructions)
- **QueueService Tests**: 
  - 36 comprehensive unit tests covering all QueueService functionality
  - PgBoss 10.3.2 compatibility testing with proper mocking
  - Job submission, cancellation, and status checking
  - Worker registration and health monitoring
  - Error handling and validation scenarios
  - Type safety and API compliance testing

#### Integration Tests
- **Location**: `tests/integration/`
- **Coverage**: API endpoints, database operations, real API connections, OAuth2 flows
- **Count**: 6 test suites, 111 tests
- **Status**: ✅ All passing
- **Authentication**: Real users with bcrypt-hashed passwords
- **Database**: Real PostgreSQL connections, no mocks
- **OAuth2**: Comprehensive provider testing (GitHub, Google, Slack)

#### End-to-End Tests
- **Location**: `tests/e2e/` (organized into logical groups)
- **Coverage**: Full user workflows and application behavior
- **Count**: 4 test groups, 180 tests total
- **Status**: ✅ 180/180 passing (100% success rate)
- **Data**: Real database with test users
- **Issues**: ✅ All frontend UI components implemented and working

**Test Groups:**
- **`tests/e2e/auth/`** - Authentication & SSO tests (123 tests)
  - `authentication-session.test.ts` - Login, session management, SSO flows
  - `oauth2-workflow.test.ts` - OAuth2 provider integration tests
  - `sso-workflows.test.ts` - SAML/OIDC enterprise SSO tests
- **`tests/e2e/workflows/`** - Workflow orchestration tests (57 tests)
  - `workflow-execution.test.ts` - Workflow execution and monitoring
  - `workflow-management.test.ts` - Workflow CRUD operations
- **`tests/e2e/connections/`** - API connection management tests
  - `api-connection-management.test.ts` - API connection CRUD
  - `connections-management.test.ts` - Connection testing and validation
- **`tests/e2e/ui/`** - User interface and navigation tests
  - `app.test.ts` - General application smoke tests
  - `basic-navigation.test.ts` - Navigation and routing tests
  - `dashboard-navigation.test.ts` - Dashboard functionality tests

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

# Run E2E test groups (faster execution)
npm run test:e2e:auth        # Authentication & SSO tests
npm run test:e2e:workflows   # Workflow orchestration tests
npm run test:e2e:connections # API connection management tests
npm run test:e2e:ui          # User interface and navigation tests

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
npm run test:e2e:auth

# Run specific E2E test groups
npm run test:e2e:auth        # Authentication & SSO (123 tests)
npm run test:e2e:workflows   # Workflow orchestration (57 tests)
npm run test:e2e:connections # API connections (varies)
npm run test:e2e:ui          # UI & navigation (varies)

# Run all E2E tests (full suite)
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
- **E2E Tests**: 180/180 tests passing (100% success rate)
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

## QueueService Testing

### Overview
The QueueService includes comprehensive unit tests covering all functionality with proper PgBoss 10.3.2 mocking and type safety validation.

### Test Coverage
- **36 unit tests** covering all QueueService methods
- **100% method coverage** for core functionality
- **Error scenario testing** for all failure modes
- **Type safety validation** with TypeScript compliance
- **API compatibility testing** with PgBoss 10.3.2

### Running QueueService Tests
```bash
# Run QueueService tests specifically
npm test -- tests/unit/lib/queue/queueService.test.ts

# Run with coverage
npm test -- tests/unit/lib/queue/queueService.test.ts --coverage

# Run with verbose output
npm test -- tests/unit/lib/queue/queueService.test.ts --verbose
```

### Test Categories

#### 1. Service Initialization
```typescript
describe('QueueService Initialization', () => {
  it('should initialize successfully with valid configuration', async () => {
    const queueService = new QueueService(mockPrisma);
    await queueService.initialize();
    expect(queueService.isInitialized()).toBe(true);
  });

  it('should handle initialization errors gracefully', async () => {
    mockBoss.start.mockRejectedValue(new Error('Connection failed'));
    const queueService = new QueueService(mockPrisma);
    await expect(queueService.initialize()).rejects.toThrow('Connection failed');
  });
});
```

#### 2. Job Submission
```typescript
describe('Job Submission', () => {
  it('should submit a job successfully', async () => {
    const job: QueueJob = {
      queueName: 'test-queue',
      name: 'test-job',
      data: { test: 'data' }
    };

    mockBoss.createQueue.mockResolvedValue(undefined);
    mockBoss.send.mockResolvedValue('job-123');

    const result = await queueService.submitJob(job);

    expect(result).toEqual({ queueName: 'test-queue', jobId: 'job-123' });
  });

  it('should handle jobKey deduplication', async () => {
    const job: QueueJob = {
      queueName: 'test-queue',
      name: 'test-job',
      data: { test: 'data' },
      jobKey: 'unique-key-123'
    };

    mockBoss.send.mockResolvedValue(null); // Simulate duplicate jobKey

    await expect(queueService.submitJob(job)).rejects.toThrow(
      'Failed to enqueue job (likely duplicate jobKey)'
    );
  });
});
```

#### 3. Worker Registration
```typescript
describe('Worker Registration', () => {
  it('should register a worker successfully', async () => {
    const handler = jest.fn().mockResolvedValue('success');
    const options = {
      teamSize: 5,
      timeout: 300000,
      retryLimit: 3
    };

    mockBoss.createQueue.mockResolvedValue(undefined);
    mockBoss.work.mockResolvedValue(undefined);

    await queueService.registerWorker('test-queue', handler, options);

    expect(mockBoss.createQueue).toHaveBeenCalledWith('test-queue');
    expect(mockBoss.work).toHaveBeenCalledWith('test-queue', expect.any(Function), options);
  });

  it('should handle worker registration errors', async () => {
    const handler = jest.fn();
    const error = new Error('Worker registration failed');
    mockBoss.work.mockRejectedValue(error);

    await expect(queueService.registerWorker('test-queue', handler)).rejects.toThrow(
      'Worker registration failed'
    );
  });
});
```

#### 4. Job Management
```typescript
describe('Job Management', () => {
  it('should cancel a job successfully', async () => {
    mockBoss.cancel.mockResolvedValue(undefined);

    await queueService.cancelJob('test-queue', 'job-123');

    expect(mockBoss.cancel).toHaveBeenCalledWith('job-123');
  });

  it('should get job status successfully', async () => {
    const mockJob = {
      id: 'job-123',
      name: 'test-job',
      data: { test: 'data' },
      state: 'completed',
      retryLimit: 3,
      retryCount: 0,
      createdOn: new Date(),
      completedOn: new Date()
    };

    mockBoss.getJobById.mockResolvedValue(mockJob);

    const status = await queueService.getJobStatus('test-queue', 'job-123');

    expect(status).toEqual(expect.objectContaining({
      id: 'job-123',
      state: 'completed'
    }));
  });
});
```

#### 5. Health Monitoring
```typescript
describe('Health Monitoring', () => {
  it('should return healthy status when service is initialized', async () => {
    await queueService.initialize();
    const health = await queueService.getHealthStatus();

    expect(health.status).toBe('healthy');
    expect(health.message).toBe('Queue service is running');
  });

  it('should return worker statistics', () => {
    const stats = queueService.getWorkerStats();
    expect(Array.isArray(stats)).toBe(true);
  });
});
```

#### 6. Error Handling
```typescript
describe('Error Handling', () => {
  it('should validate job data with zod schema', async () => {
    const invalidJob = {
      queueName: 'test-queue',
      name: 'test-job',
      data: null // Invalid data
    };

    await expect(queueService.submitJob(invalidJob as any)).rejects.toThrow(
      'Job data is required'
    );
  });

  it('should handle null returns from PgBoss', async () => {
    mockBoss.send.mockResolvedValue(null);
    
    const job: QueueJob = {
      queueName: 'test-queue',
      name: 'test-job',
      data: { test: 'data' }
    };

    await expect(queueService.submitJob(job)).rejects.toThrow(
      'Failed to enqueue job (likely duplicate jobKey)'
    );
  });
});
```

### Mocking Strategy

#### PgBoss Mocking
```typescript
// Mock PgBoss instance
const mockBoss = {
  start: jest.fn(),
  stop: jest.fn(),
  createQueue: jest.fn(),
  send: jest.fn(),
  work: jest.fn(),
  cancel: jest.fn(),
  getJobById: jest.fn(),
  getQueueSize: jest.fn(),
  getJobCounts: jest.fn()
};

jest.mock('pg-boss', () => {
  return jest.fn().mockImplementation(() => mockBoss);
});
```

#### Prisma Mocking
```typescript
// Mock Prisma client
const mockPrisma = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  // Add other Prisma methods as needed
} as jest.Mocked<PrismaClient>;
```

### Best Practices

#### Test Organization
- **Group related tests** in describe blocks
- **Use descriptive test names** that explain the scenario
- **Test both success and failure cases**
- **Validate error messages** for debugging
- **Test edge cases** and boundary conditions

#### Mock Management
- **Reset mocks** between tests using `beforeEach`
- **Verify mock calls** to ensure correct API usage
- **Mock external dependencies** (PgBoss, Prisma)
- **Don't mock internal logic** unless testing error handling

#### Type Safety
- **Use proper TypeScript types** in tests
- **Validate return types** match expected interfaces
- **Test type guards** and validation logic
- **Ensure API compatibility** with PgBoss 10.3.2

### Integration with Workflow System
The QueueService tests ensure compatibility with the workflow execution system:
- **Job submission** for workflow steps
- **Worker registration** for step processing
- **Health monitoring** for system reliability
- **Error handling** for graceful failures

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

### Integration Test Mocking and Reliability

- All integration tests mock external API calls (such as OpenAPI spec fetches and third-party HTTP requests) to ensure tests are fast, reliable, and do not depend on network access.
- Only the database and authentication flows use real infrastructure; all other external dependencies must be mocked in integration tests.
- If you add new integration tests that interact with external APIs, you must mock those calls using Jest or a similar framework.
- Never mock database or authentication logic in any environment except for isolated unit tests (see "No Mock Data Policy" above).

## Test Coverage Report

### Current Test Status
- **Total Tests**: 602 tests passing (100% success rate)
- **Test Suites**: 52 test suites all passing
- **Coverage**: Comprehensive coverage across all components

### Test Categories
- **Unit Tests**: 45 test suites covering utilities, services, and components
- **Integration Tests**: 7 test suites covering API endpoints and database operations
- **E2E Tests**: 144 tests covering complete user workflows

## Encrypted Secrets Vault Testing

### Overview
The Encrypted Secrets Vault requires comprehensive testing to ensure security, reliability, and compliance. All tests must validate encryption, input validation, rate limiting, and audit logging without exposing sensitive data.

### Unit Testing

#### SecretsVault Class Tests
```typescript
describe('SecretsVault', () => {
  let vault: SecretsVault;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      secret: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      }
    };
    vault = new SecretsVault(mockPrisma);
  });

  describe('storeSecret', () => {
    it('should store and encrypt secret successfully', async () => {
      const secretData = { value: 'test-secret-value' };
      const mockSecret = {
        id: 'secret_123',
        name: 'test-secret',
        type: 'api_key',
        isActive: true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.secret.create.mockResolvedValue(mockSecret);

      const result = await vault.storeSecret('user1', 'test-secret', secretData, 'api_key');

      expect(result.name).toBe('test-secret');
      expect(result.type).toBe('api_key');
      expect(mockPrisma.secret.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user1',
          name: 'test-secret',
          type: 'api_key',
          encryptedData: expect.any(String), // Encrypted value
          keyId: expect.any(String)
        })
      });
    });

    it('should validate input parameters', async () => {
      const secretData = { value: 'test-secret' };

      // Test invalid userId
      await expect(
        vault.storeSecret('', 'test-secret', secretData)
      ).rejects.toThrow('Invalid userId: must be a non-empty string');

      // Test invalid name
      await expect(
        vault.storeSecret('user1', '', secretData)
      ).rejects.toThrow('Invalid secret name: must be a non-empty string');

      // Test invalid characters in name
      await expect(
        vault.storeSecret('user1', 'secret with spaces', secretData)
      ).rejects.toThrow('Invalid secret name: contains invalid characters');

      // Test name too long
      const longName = 'a'.repeat(101);
      await expect(
        vault.storeSecret('user1', longName, secretData)
      ).rejects.toThrow('Invalid secret name: too long (max 100 characters)');

      // Test value too long
      const longValue = 'a'.repeat(10001);
      await expect(
        vault.storeSecret('user1', 'test-secret', { value: longValue })
      ).rejects.toThrow('Invalid secret value: too long (max 10,000 characters)');
    });

    it('should enforce rate limiting', async () => {
      const secretData = { value: 'test-secret' };
      mockPrisma.secret.create.mockResolvedValue({ id: 'secret_123' });

      // Submit requests up to limit
      for (let i = 0; i < 100; i++) {
        await vault.storeSecret('user1', `secret-${i}`, secretData);
      }

      // Next request should be rate limited
      await expect(
        vault.storeSecret('user1', 'secret-101', secretData)
      ).rejects.toThrow('Rate limit exceeded: maximum 100 requests per minute');
    });

    it('should not log sensitive data', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const secretValue = 'sk_test_sensitive_key_123';
      const secretData = { value: secretValue };

      mockPrisma.secret.create.mockResolvedValue({ id: 'secret_123' });

      await vault.storeSecret('user1', 'test-secret', secretData);

      // Verify no sensitive data in logs
      expect(logSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(secretValue)
      );

      logSpy.mockRestore();
    });
  });

  describe('getSecret', () => {
    it('should retrieve and decrypt secret successfully', async () => {
      const encryptedData = 'encrypted-secret-data';
      const mockSecret = {
        id: 'secret_123',
        encryptedData,
        keyId: 'master_key_v1',
        isActive: true
      };

      mockPrisma.secret.findFirst.mockResolvedValue(mockSecret);

      const result = await vault.getSecret('user1', 'test-secret');

      expect(result).toBeDefined();
      expect(mockPrisma.secret.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          name: 'test-secret',
          isActive: true
        }
      });
    });

    it('should handle non-existent secrets', async () => {
      mockPrisma.secret.findFirst.mockResolvedValue(null);

      await expect(
        vault.getSecret('user1', 'non-existent')
      ).rejects.toThrow('Secret not found: non-existent');
    });
  });

  describe('listSecrets', () => {
    it('should return metadata only (no sensitive data)', async () => {
      const mockSecrets = [
        {
          id: 'secret_123',
          name: 'test-secret',
          type: 'api_key',
          isActive: true,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.secret.findMany.mockResolvedValue(mockSecrets);

      const result = await vault.listSecrets('user1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-secret');
      expect(result[0]).not.toHaveProperty('encryptedData'); // No sensitive data
      expect(mockPrisma.secret.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          isActive: true
        },
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
          version: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true
        }
      });
    });
  });

  describe('deleteSecret', () => {
    it('should soft delete secret', async () => {
      const mockSecret = {
        id: 'secret_123',
        isActive: true
      };

      mockPrisma.secret.findFirst.mockResolvedValue(mockSecret);
      mockPrisma.secret.update.mockResolvedValue({ ...mockSecret, isActive: false });

      await vault.deleteSecret('user1', 'test-secret');

      expect(mockPrisma.secret.update).toHaveBeenCalledWith({
        where: { id: 'secret_123' },
        data: { isActive: false, updatedAt: expect.any(Date) }
      });
    });
  });

  describe('rotateKeys', () => {
    it('should re-encrypt all secrets with new key', async () => {
      const mockSecrets = [
        {
          id: 'secret_123',
          encryptedData: 'old-encrypted-data',
          keyId: 'old-key'
        }
      ];

      mockPrisma.secret.findMany.mockResolvedValue(mockSecrets);
      mockPrisma.secret.update.mockResolvedValue({ id: 'secret_123' });

      await vault.rotateKeys();

      expect(mockPrisma.secret.findMany).toHaveBeenCalledWith({
        where: { isActive: true }
      });
      expect(mockPrisma.secret.update).toHaveBeenCalledWith({
        where: { id: 'secret_123' },
        data: expect.objectContaining({
          encryptedData: expect.any(String), // New encrypted data
          keyId: expect.any(String), // New key ID
          version: expect.any(Number) // Incremented version
        })
      });
    });
  });

  describe('getHealthStatus', () => {
    it('should return vault health information', async () => {
      mockPrisma.secret.count.mockResolvedValue(10);

      const health = await vault.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.activeSecrets).toBe(10);
      expect(health.keyCount).toBe(1);
      expect(health.message).toContain('Vault is operating normally');
    });
  });
});
```

#### Security Tests
```typescript
describe('SecretsVault Security', () => {
  it('should prevent SQL injection in secret names', async () => {
    const vault = new SecretsVault(mockPrisma);
    const secretData = { value: 'test-secret' };

    const sqlInjectionAttempts = [
      "'; DROP TABLE secrets; --",
      "' OR '1'='1",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --",
      "'; UPDATE secrets SET encryptedData = 'hacked'; --"
    ];

    for (const attempt of sqlInjectionAttempts) {
      await expect(
        vault.storeSecret('user1', attempt, secretData)
      ).rejects.toThrow('Invalid secret name: contains invalid characters');
    }
  });

  it('should validate secret types', async () => {
    const vault = new SecretsVault(mockPrisma);
    const secretData = { value: 'test-secret' };

    const validTypes = ['api_key', 'oauth2_token', 'webhook_secret', 'custom'];
    const invalidTypes = ['invalid_type', 'password', 'token', ''];

    for (const type of validTypes) {
      mockPrisma.secret.create.mockResolvedValue({ id: 'secret_123' });
      await expect(
        vault.storeSecret('user1', 'test-secret', secretData, type as any)
      ).resolves.toBeDefined();
    }

    for (const type of invalidTypes) {
      await expect(
        vault.storeSecret('user1', 'test-secret', secretData, type as any)
      ).rejects.toThrow(`Invalid secret type: must be one of ${validTypes.join(', ')}`);
    }
  });

  it('should validate expiration dates', async () => {
    const vault = new SecretsVault(mockPrisma);
    const secretData = { value: 'test-secret' };

    // Past date should be rejected
    const pastDate = new Date(Date.now() - 86400000); // 1 day ago
    await expect(
      vault.storeSecret('user1', 'test-secret', secretData, 'api_key', pastDate)
    ).rejects.toThrow('Expiration date must be in the future');

    // Future date should be accepted
    const futureDate = new Date(Date.now() + 86400000); // 1 day from now
    mockPrisma.secret.create.mockResolvedValue({ id: 'secret_123' });
    await expect(
      vault.storeSecret('user1', 'test-secret', secretData, 'api_key', futureDate)
    ).resolves.toBeDefined();
  });
});
```

### Integration Testing

#### API Endpoint Tests
```typescript
describe('Secrets API Integration', () => {
  let app: Express;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    app = createTestApp();
    testUser = await createTestUser();
    authToken = generateTestToken(testUser.id);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/secrets', () => {
    it('should create secret with proper authentication', async () => {
      const response = await request(app)
        .post('/api/secrets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'test-api-key',
          type: 'api_key',
          value: 'sk_test_1234567890',
          metadata: { description: 'Test API key' }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('test-api-key');
      expect(response.body.data.type).toBe('api_key');
      expect(response.body.data).not.toHaveProperty('value'); // No sensitive data
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .post('/api/secrets')
        .send({
          name: 'test-api-key',
          type: 'api_key',
          value: 'sk_test_1234567890'
        });

      expect(response.status).toBe(401);
    });

    it('should validate input parameters', async () => {
      const response = await request(app)
        .post('/api/secrets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'invalid name with spaces',
          type: 'api_key',
          value: 'sk_test_1234567890'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid secret name');
    });

    it('should enforce rate limiting', async () => {
      // Submit 101 requests (exceeds limit of 100)
      const requests = Array.from({ length: 101 }, (_, i) =>
        request(app)
          .post('/api/secrets')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `test-secret-${i}`,
            type: 'api_key',
            value: 'sk_test_1234567890'
          })
      );

      const responses = await Promise.all(requests);
      const successful = responses.filter(r => r.status === 201);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(successful).toHaveLength(100);
      expect(rateLimited).toHaveLength(1);
      expect(rateLimited[0].body.error).toContain('Rate limit exceeded');
    });
  });

  describe('GET /api/secrets', () => {
    it('should return user secrets (metadata only)', async () => {
      // Create test secret first
      await createTestSecret(testUser.id, 'test-secret');

      const response = await request(app)
        .get('/api/secrets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.secrets).toHaveLength(1);
      expect(response.body.data.secrets[0].name).toBe('test-secret');
      expect(response.body.data.secrets[0]).not.toHaveProperty('value'); // No sensitive data
    });

    it('should not return secrets from other users', async () => {
      const otherUser = await createTestUser();
      await createTestSecret(otherUser.id, 'other-user-secret');

      const response = await request(app)
        .get('/api/secrets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const userSecrets = response.body.data.secrets.filter(
        (s: any) => s.name === 'other-user-secret'
      );
      expect(userSecrets).toHaveLength(0);
    });
  });

  describe('GET /api/secrets/:id', () => {
    it('should return specific secret metadata', async () => {
      const secret = await createTestSecret(testUser.id, 'test-secret');

      const response = await request(app)
        .get(`/api/secrets/${secret.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('test-secret');
      expect(response.body.data).not.toHaveProperty('value'); // No sensitive data
    });

    it('should reject access to other users secrets', async () => {
      const otherUser = await createTestUser();
      const secret = await createTestSecret(otherUser.id, 'other-user-secret');

      const response = await request(app)
        .get(`/api/secrets/${secret.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/secrets/:id', () => {
    it('should soft delete user secret', async () => {
      const secret = await createTestSecret(testUser.id, 'test-secret');

      const response = await request(app)
        .delete(`/api/secrets/${secret.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify secret is soft deleted
      const getResponse = await request(app)
        .get(`/api/secrets/${secret.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });
});
```

## Queue Management Testing

### Overview
The Queue Management system requires comprehensive testing to ensure reliable job processing, proper error handling, and system health monitoring. Tests must validate job lifecycle, worker management, and system resilience.

### Unit Testing

#### QueueService Class Tests
```typescript
describe('QueueService', () => {
  let queueService: QueueService;
  let mockPrisma: any;
  let mockBoss: any;

  beforeEach(() => {
    mockPrisma = {};
    mockBoss = {
      start: jest.fn(),
      stop: jest.fn(),
      send: jest.fn(),
      work: jest.fn(),
      cancel: jest.fn(),
      getJobById: jest.fn(),
      getQueueSize: jest.fn(),
      getJobCounts: jest.fn()
    };

    // Mock PgBoss constructor
    jest.doMock('pg-boss', () => {
      return jest.fn().mockImplementation(() => mockBoss);
    });

    queueService = new QueueService(mockPrisma);
  });

  describe('initialize', () => {
    it('should initialize PgBoss successfully', async () => {
      mockBoss.start.mockResolvedValue(undefined);

      await queueService.initialize();

      expect(mockBoss.start).toHaveBeenCalled();
      expect(queueService['isInitialized']).toBe(true);
    });

    it('should handle initialization errors', async () => {
      mockBoss.start.mockRejectedValue(new Error('Connection failed'));

      await expect(queueService.initialize()).rejects.toThrow('Connection failed');
    });
  });

  describe('submitJob', () => {
    beforeEach(async () => {
      mockBoss.start.mockResolvedValue(undefined);
      await queueService.initialize();
    });

    it('should submit job successfully', async () => {
      const job: QueueJob = {
        queueName: 'test-queue',
        name: 'test-job',
        data: { input: 'test data' }
      };

      mockBoss.send.mockResolvedValue('job-123');

      const result = await queueService.submitJob(job);

      expect(result.queueName).toBe('test-queue');
      expect(result.jobId).toBe('job-123');
      expect(mockBoss.send).toHaveBeenCalledWith('test-queue', {
        name: 'test-job',
        data: { input: 'test data' }
      });
    });

    it('should validate job parameters', async () => {
      const invalidJob = {
        queueName: '', // Invalid: empty queue name
        name: 'test-job',
        data: { input: 'test data' }
      };

      await expect(queueService.submitJob(invalidJob as any)).rejects.toThrow(
        'Invalid job: queueName is required'
      );
    });

    it('should handle job submission errors', async () => {
      const job: QueueJob = {
        queueName: 'test-queue',
        name: 'test-job',
        data: { input: 'test data' }
      };

      mockBoss.send.mockRejectedValue(new Error('Queue not found'));

      await expect(queueService.submitJob(job)).rejects.toThrow('Queue not found');
    });

    it('should support job deduplication with jobKey', async () => {
      const job: QueueJob = {
        queueName: 'test-queue',
        name: 'test-job',
        data: { input: 'test data' },
        jobKey: 'unique-job-key'
      };

      mockBoss.send.mockResolvedValue('job-123');

      const result = await queueService.submitJob(job);

      expect(result.jobId).toBe('job-123');
      expect(mockBoss.send).toHaveBeenCalledWith('test-queue', {
        name: 'test-job',
        data: { input: 'test data' },
        jobKey: 'unique-job-key'
      });
    });
  });

  describe('registerWorker', () => {
    beforeEach(async () => {
      mockBoss.start.mockResolvedValue(undefined);
      await queueService.initialize();
    });

    it('should register worker successfully', async () => {
      const handler = jest.fn().mockResolvedValue({ result: 'success' });
      const options = { teamSize: 5, timeout: 300000 };

      await queueService.registerWorker('test-queue', handler, options);

      expect(mockBoss.work).toHaveBeenCalledWith(
        'test-queue',
        expect.objectContaining({
          teamSize: 5,
          timeout: 300000
        }),
        expect.any(Function)
      );
    });

    it('should handle worker registration errors', async () => {
      const handler = jest.fn();
      mockBoss.work.mockRejectedValue(new Error('Queue not found'));

      await expect(
        queueService.registerWorker('test-queue', handler)
      ).rejects.toThrow('Queue not found');
    });
  });

  describe('cancelJob', () => {
    beforeEach(async () => {
      mockBoss.start.mockResolvedValue(undefined);
      await queueService.initialize();
    });

    it('should cancel job successfully', async () => {
      mockBoss.cancel.mockResolvedValue(undefined);

      await queueService.cancelJob('test-queue', 'job-123');

      expect(mockBoss.cancel).toHaveBeenCalledWith('job-123');
    });

    it('should handle job cancellation errors', async () => {
      mockBoss.cancel.mockRejectedValue(new Error('Job not found'));

      await expect(
        queueService.cancelJob('test-queue', 'job-123')
      ).rejects.toThrow('Job not found');
    });
  });

  describe('getJobStatus', () => {
    beforeEach(async () => {
      mockBoss.start.mockResolvedValue(undefined);
      await queueService.initialize();
    });

    it('should return job status', async () => {
      const mockJob = {
        id: 'job-123',
        name: 'test-job',
        data: { input: 'test data' },
        state: 'completed',
        retryCount: 0,
        createdOn: new Date(),
        completedOn: new Date()
      };

      mockBoss.getJobById.mockResolvedValue(mockJob);

      const status = await queueService.getJobStatus('test-queue', 'job-123');

      expect(status.id).toBe('job-123');
      expect(status.state).toBe('completed');
      expect(status.retryCount).toBe(0);
    });

    it('should handle non-existent jobs', async () => {
      mockBoss.getJobById.mockResolvedValue(null);

      const status = await queueService.getJobStatus('test-queue', 'non-existent');

      expect(status).toBeNull();
    });
  });

  describe('getHealthStatus', () => {
    beforeEach(async () => {
      mockBoss.start.mockResolvedValue(undefined);
      await queueService.initialize();
    });

    it('should return health status', async () => {
      mockBoss.getQueueSize.mockResolvedValue(5);
      mockBoss.getJobCounts.mockResolvedValue({
        created: 10,
        active: 3,
        completed: 100,
        failed: 2
      });

      const health = await queueService.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.activeJobs).toBe(3);
      expect(health.queuedJobs).toBe(10);
      expect(health.failedJobs).toBe(2);
      expect(health.workers).toBe(0); // No workers registered
    });

    it('should detect unhealthy status', async () => {
      mockBoss.getQueueSize.mockRejectedValue(new Error('Connection failed'));

      const health = await queueService.getHealthStatus();

      expect(health.status).toBe('error');
      expect(health.message).toContain('Connection failed');
    });
  });
});
```

### Integration Testing

#### API Endpoint Tests
```typescript
describe('Queue API Integration', () => {
  let app: Express;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    app = createTestApp();
    testUser = await createTestUser();
    authToken = generateTestToken(testUser.id);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/queue/jobs', () => {
    it('should submit job successfully', async () => {
      const response = await request(app)
        .post('/api/queue/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          queueName: 'test-queue',
          name: 'test-job',
          data: { workflowId: 'workflow_123', userId: testUser.id }
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.queueName).toBe('test-queue');
      expect(response.body.data.jobId).toBeDefined();
    });

    it('should validate job data', async () => {
      const response = await request(app)
        .post('/api/queue/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          queueName: '', // Invalid: empty queue name
          name: 'test-job',
          data: { workflowId: 'workflow_123' }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid job data');
    });

    it('should support job options', async () => {
      const response = await request(app)
        .post('/api/queue/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          queueName: 'test-queue',
          name: 'test-job',
          data: { workflowId: 'workflow_123' },
          options: {
            priority: 5,
            delay: 1000,
            retryLimit: 3,
            jobKey: 'unique-job-key'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.data.jobKey).toBe('unique-job-key');
    });
  });

  describe('GET /api/queue/jobs/:queueName/:jobId', () => {
    it('should return job status', async () => {
      // Submit a job first
      const submitResponse = await request(app)
        .post('/api/queue/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          queueName: 'test-queue',
          name: 'test-job',
          data: { workflowId: 'workflow_123' }
        });

      const { jobId } = submitResponse.body.data;

      // Get job status
      const statusResponse = await request(app)
        .get(`/api/queue/jobs/test-queue/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data.id).toBe(jobId);
      expect(statusResponse.body.data.state).toBeDefined();
    });

    it('should handle non-existent jobs', async () => {
      const response = await request(app)
        .get('/api/queue/jobs/test-queue/non-existent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/queue/jobs/:queueName/:jobId', () => {
    it('should cancel job successfully', async () => {
      // Submit a job first
      const submitResponse = await request(app)
        .post('/api/queue/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          queueName: 'test-queue',
          name: 'test-job',
          data: { workflowId: 'workflow_123' }
        });

      const { jobId } = submitResponse.body.data;

      // Cancel the job
      const cancelResponse = await request(app)
        .delete(`/api/queue/jobs/test-queue/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(cancelResponse.status).toBe(200);
      expect(cancelResponse.body.success).toBe(true);
    });
  });

  describe('GET /api/queue/health', () => {
    it('should return queue health status', async () => {
      const response = await request(app)
        .get('/api/queue/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
      expect(response.body.data.activeJobs).toBeDefined();
      expect(response.body.data.queuedJobs).toBeDefined();
      expect(response.body.data.failedJobs).toBeDefined();
    });
  });

  describe('GET /api/queue/workers', () => {
    it('should return worker statistics', async () => {
      const response = await request(app)
        .get('/api/queue/workers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.workers).toBeDefined();
      expect(response.body.data.totalWorkers).toBeDefined();
    });
  });
});
```

### Performance Testing

#### Load Testing
```typescript
describe('Queue Performance', () => {
  it('should handle high job throughput', async () => {
    const queueService = new QueueService(mockPrisma);
    await queueService.initialize();

    const jobCount = 1000;
    const jobs = Array.from({ length: jobCount }, (_, i) => ({
      queueName: 'performance-test',
      name: `job-${i}`,
      data: { index: i }
    }));

    const startTime = Date.now();
    const results = await Promise.all(
      jobs.map(job => queueService.submitJob(job))
    );
    const endTime = Date.now();

    expect(results).toHaveLength(jobCount);
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
  });

  it('should handle concurrent worker processing', async () => {
    const queueService = new QueueService(mockPrisma);
    await queueService.initialize();

    const workerCount = 10;
    const jobsPerWorker = 100;
    const totalJobs = workerCount * jobsPerWorker;

    // Register multiple workers
    const workers = Array.from({ length: workerCount }, (_, i) =>
      queueService.registerWorker('concurrent-test', async (data) => {
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
        return { workerId: i, processed: data };
      }, { teamSize: 5 })
    );

    await Promise.all(workers);

    // Submit jobs
    const jobs = Array.from({ length: totalJobs }, (_, i) => ({
      queueName: 'concurrent-test',
      name: `concurrent-job-${i}`,
      data: { index: i }
    }));

    const startTime = Date.now();
    await Promise.all(jobs.map(job => queueService.submitJob(job)));
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
  });
});
```

### Error Handling Tests

#### Resilience Testing
```typescript
describe('Queue Error Handling', () => {
  it('should handle database connection failures', async () => {
    const queueService = new QueueService(mockPrisma);
    
    // Simulate database connection failure
    mockBoss.start.mockRejectedValue(new Error('Database connection failed'));

    await expect(queueService.initialize()).rejects.toThrow('Database connection failed');
  });

  it('should handle worker processing errors', async () => {
    const queueService = new QueueService(mockPrisma);
    await queueService.initialize();

    // Register worker that throws errors
    await queueService.registerWorker('error-test', async (data) => {
      throw new Error('Processing failed');
    });

    const job = {
      queueName: 'error-test',
      name: 'error-job',
      data: { input: 'test' }
    };

    const result = await queueService.submitJob(job);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const status = await queueService.getJobStatus('error-test', result.jobId);
    expect(status.state).toBe('failed');
  });

  it('should handle job timeout', async () => {
    const queueService = new QueueService(mockPrisma);
    await queueService.initialize();

    // Register worker that takes too long
    await queueService.registerWorker('timeout-test', async (data) => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Longer than timeout
      return { result: 'success' };
    }, { timeout: 100 }); // Short timeout

    const job = {
      queueName: 'timeout-test',
      name: 'timeout-job',
      data: { input: 'test' }
    };

    const result = await queueService.submitJob(job);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const status = await queueService.getJobStatus('timeout-test', result.jobId);
    expect(status.state).toBe('failed');
  });
});
```

## Test Best Practices

### Security Testing
- Never log sensitive data in tests
- Validate input sanitization thoroughly
- Test rate limiting and DoS protection
- Verify authentication and authorization
- Test error handling without data exposure

### Performance Testing
- Test with realistic data volumes
- Measure response times and throughput
- Test concurrent operations
- Validate resource usage
- Test under failure conditions

### Reliability Testing
- Test error recovery mechanisms
- Validate retry logic
- Test timeout handling
- Verify data consistency
- Test graceful degradation

### Documentation
- Document test scenarios and expected outcomes
- Maintain test data and fixtures
- Update tests when APIs change
- Document performance benchmarks
- Keep test coverage reports current

## Test Environment Setup

### Required Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/apiq_test"

# Encryption
ENCRYPTION_MASTER_KEY="test-master-key-32-characters-long"

# Queue
QUEUE_MAX_CONCURRENCY=5
QUEUE_RETRY_LIMIT=2
QUEUE_TIMEOUT=10000

# Testing
NODE_ENV="test"
JEST_TIMEOUT=30000
```

### Test Data Management
- Use isolated test databases
- Clean up test data after each test
- Use unique identifiers to prevent conflicts
- Mock external dependencies
- Maintain test data fixtures

### Continuous Integration
- Run all tests on every commit
- Generate coverage reports
- Fail builds on test failures
- Run security tests separately
- Monitor test performance

## Test Coverage Goals

### Unit Tests
- **Target**: 90%+ code coverage
- **Focus**: Individual functions and classes
- **Scope**: All business logic and utilities
- **Frequency**: Every commit

### Integration Tests
- **Target**: 80%+ API endpoint coverage
- **Focus**: End-to-end workflows
- **Scope**: Database operations and external integrations
- **Frequency**: Every commit

### Security Tests
- **Target**: 100% security-critical code coverage
- **Focus**: Input validation, encryption, authentication
- **Scope**: All security-sensitive operations
- **Frequency**: Every commit and security review

### Performance Tests
- **Target**: Baseline performance metrics
- **Focus**: Response times and throughput
- **Scope**: Critical user workflows
- **Frequency**: Weekly and before releases

## Test Maintenance

### Regular Tasks
- Update tests when APIs change
- Review and update test data
- Monitor test performance
- Update test documentation
- Review test coverage reports

### Quality Assurance
- Validate test reliability
- Ensure test isolation
- Review test naming conventions
- Check test data cleanup
- Verify test environment consistency

### Continuous Improvement
- Identify flaky tests
- Optimize slow tests
- Add missing test scenarios
- Improve test readability
- Enhance test automation
