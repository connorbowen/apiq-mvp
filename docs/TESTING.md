# Testing Guide

## Overview

APIQ MVP maintains a comprehensive test suite with **100% test success rate** (206/206 tests passing) across unit, integration, and end-to-end tests. The test infrastructure has been optimized for reliability and isolation.

## Test Infrastructure

### Test Isolation Improvements

The test suite has been enhanced with robust isolation mechanisms:

- **Unique Suite Identifiers**: Each test suite generates unique identifiers to prevent conflicts
- **Comprehensive Cleanup**: Automatic cleanup of test data between test runs
- **Race Condition Prevention**: Improved user creation with upsert pattern
- **Database Isolation**: Proper cleanup of orphaned connections and endpoints

### Test Categories

#### Unit Tests
- **Location**: `tests/unit/`
- **Coverage**: Core business logic, utilities, and middleware
- **Count**: 8 test suites, 95 tests
- **Status**: ✅ All passing

#### Integration Tests
- **Location**: `tests/integration/`
- **Coverage**: API endpoints, database operations, real API connections
- **Count**: 6 test suites, 89 tests
- **Status**: ✅ All passing

#### End-to-End Tests
- **Location**: `tests/e2e/`
- **Coverage**: Full user workflows and application behavior
- **Count**: 1 test suite, 22 tests
- **Status**: ✅ All passing

## Running Tests

### Full Test Suite
```bash
npm test
```

### Specific Test Categories
```bash
# Unit tests only
npm test -- tests/unit/

# Integration tests only
npm test -- tests/integration/

# End-to-end tests only
npm test -- tests/e2e/
```

### Individual Test Files
```bash
# Specific test file
npm test -- tests/integration/api/auth.test.ts

# With verbose output
npm test -- tests/integration/api/auth.test.ts --verbose
```

### Test Coverage
```bash
npm run test:coverage
```

## Test Utilities

### Test Suite Creation
```typescript
import { createTestSuite } from '../helpers/testUtils';

describe('My Test Suite', () => {
  const testSuite = createTestSuite('My Test Suite');
  
  beforeAll(async () => {
    await testSuite.beforeAll();
  });
  
  afterAll(async () => {
    await testSuite.afterAll();
  });
  
  it('should test something', async () => {
    const user = await testSuite.createUser('test@example.com');
    // Test implementation
  });
});
```

### Authentication Helpers
```typescript
import { createAuthenticatedRequest, createUnauthenticatedRequest } from '../helpers/testUtils';

// Create authenticated request
const { req, res } = createAuthenticatedRequest('POST', testUser, {
  body: { key: 'value' }
});

// Create unauthenticated request
const { req, res } = createUnauthenticatedRequest('GET', {
  query: { param: 'value' }
});
```

## Authentication Testing

### Test Coverage
- **Login/Logout**: 4 tests
- **Token Refresh**: 2 tests
- **User Information**: 3 tests
- **Role Management**: 1 test
- **Error Handling**: 2 tests

### Test Scenarios
1. **Valid Credentials**: Successful login with proper token generation
2. **Invalid Credentials**: Proper error handling for wrong credentials
3. **Missing Credentials**: Validation of required fields
4. **Token Refresh**: JWT token refresh mechanism
5. **Role-Based Access**: Different user roles and permissions
6. **Authentication Middleware**: Proper auth requirement enforcement

## API Connection Testing

### Real API Integration
- **Petstore API**: 20 endpoints extracted from live OpenAPI spec
- **JSONPlaceholder API**: Basic API connection testing
- **Invalid APIs**: Error handling for unreachable endpoints
- **OpenAPI Parsing**: Live spec validation and endpoint extraction

### Test Coverage
- **Connection Creation**: 6 tests
- **OpenAPI Integration**: 4 tests
- **Error Handling**: 3 tests
- **Authentication**: 2 tests
- **Real API Connections**: 3 tests

## Credential Management Testing

### Security Features
- **AES-256 Encryption**: All credentials encrypted at rest
- **Audit Logging**: Comprehensive logging of credential access
- **Soft Delete**: Credentials marked inactive rather than deleted
- **Access Control**: User-specific credential isolation

### Test Coverage
- **Credential Storage**: Secure storage and retrieval
- **Credential Updates**: Safe update mechanisms
- **Credential Deletion**: Soft delete functionality
- **Access Control**: User isolation and authorization

## Performance Testing

### Health Check Endpoints
- **Response Time**: <50ms average response time
- **Concurrent Requests**: Handles multiple simultaneous requests
- **Error Recovery**: Graceful handling of service failures
- **Resource Monitoring**: Database, encryption, and external service checks

## Error Handling Testing

### Comprehensive Error Coverage
- **Network Errors**: Timeout and connection failure handling
- **Authentication Errors**: Invalid tokens and expired credentials
- **Validation Errors**: Input validation and sanitization
- **Database Errors**: Connection failures and constraint violations
- **External API Errors**: Rate limiting and service unavailability

## Test Data Management

### Automatic Cleanup
- **User Cleanup**: Removes test users after each suite
- **Connection Cleanup**: Removes API connections and endpoints
- **Credential Cleanup**: Removes test credentials
- **Database Reset**: Ensures clean state between tests

### Test Data Patterns
- **Unique Emails**: Each test suite uses unique email patterns
- **Isolated Users**: No cross-contamination between test suites
- **Temporary Data**: All test data is temporary and cleaned up

## Continuous Integration

### GitHub Actions
- **Automated Testing**: Runs on every pull request
- **Test Coverage**: Enforces minimum coverage thresholds
- **Build Verification**: Ensures production builds work
- **Security Scanning**: Automated security checks

### Quality Gates
- **Test Success Rate**: Must maintain 100% pass rate
- **Coverage Threshold**: Minimum 80% code coverage
- **Build Success**: All builds must pass
- **Security Checks**: No security vulnerabilities

## Troubleshooting

### Common Issues

#### Test Isolation Failures
```bash
# Clean up test database
npm run test:cleanup

# Reset database
npm run db:reset
```

#### Authentication Issues
```bash
# Check JWT configuration
echo $JWT_SECRET

# Verify database connection
npm run db:test
```

#### Real API Connection Issues
```bash
# Test external API connectivity
curl https://petstore.swagger.io/v2/swagger.json

# Check rate limiting
npm run test:rate-limit
```

### Debug Mode
```bash
# Run tests with debug logging
DEBUG=* npm test

# Run specific test with debug
DEBUG=* npm test -- tests/integration/api/auth.test.ts
```

## Best Practices

### Writing Tests
1. **Use Test Utilities**: Leverage existing test helpers
2. **Clean Up Data**: Always clean up test data
3. **Isolate Tests**: Ensure tests don't depend on each other
4. **Mock External Services**: Mock external APIs in unit tests
5. **Test Error Cases**: Include error scenarios in tests

### Test Maintenance
1. **Regular Updates**: Keep tests current with code changes
2. **Performance Monitoring**: Monitor test execution time
3. **Coverage Tracking**: Maintain high test coverage
4. **Documentation**: Keep test documentation current

## Metrics and Monitoring

### Current Test Metrics
- **Total Tests**: 206
- **Success Rate**: 100%
- **Test Suites**: 16
- **Coverage**: 80%+ (core logic >90%)
- **Execution Time**: <10 seconds for full suite

### Performance Benchmarks
- **Unit Tests**: <2 seconds
- **Integration Tests**: <5 seconds
- **End-to-End Tests**: <3 seconds
- **Full Suite**: <10 seconds

This comprehensive testing infrastructure ensures APIQ MVP maintains high quality and reliability throughout development and deployment. 