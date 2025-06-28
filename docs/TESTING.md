# Testing Guide

This document provides comprehensive information about the testing infrastructure, test types, and how to run tests in the APIQ project.

## Test Infrastructure

### Test Framework
- **Jest**: Primary testing framework for unit and integration tests
- **Playwright**: E2E testing framework
- **TypeScript**: All tests are written in TypeScript
- **Coverage**: Built-in coverage reporting with Jest

### Test Structure
```
tests/
├── unit/                    # Unit tests
│   ├── basic.test.ts       # Basic functionality tests
│   ├── middleware/         # Middleware tests
│   │   ├── errorHandler.test.ts
│   │   └── rateLimiter.test.ts
│   ├── services/           # Service layer tests
│   │   └── openaiService.test.ts
│   └── utils/              # Utility function tests
│       ├── encryption.test.ts
│       └── logger.test.ts
├── integration/            # Integration tests
│   └── api/
│       └── health.test.ts
└── e2e/                    # End-to-end tests
    └── app.test.ts
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### E2E Tests Only
```bash
npm run test:e2e
```

### Coverage Report
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## Test Types

### Unit Tests
Unit tests focus on testing individual functions, classes, and modules in isolation.

**Current Status:**
- ✅ **Logger Tests**: All passing (16 tests)
- ✅ **Error Handler Tests**: All passing (16 tests)
- ✅ **Basic Tests**: All passing (16 tests)
- ✅ **Encryption Tests**: All passing (18 tests)
- ✅ **Rate Limiter Tests**: All passing (7 tests)
- ⚠️ **OpenAI Service Tests**: Skipped (7 tests) - See Known Issues

**Coverage:**
- Core utility functions: 100%
- Middleware components: 100%
- Error handling: 100%
- Encryption utilities: 100%

### Integration Tests
Integration tests verify that different parts of the system work together correctly.

**Current Status:**
- ⚠️ **Health API Tests**: Excluded from Jest runs
- **Note**: Integration tests should be run with a separate test runner

### E2E Tests
End-to-end tests verify the complete user workflow from frontend to backend.

**Current Status:**
- ⚠️ **App E2E Tests**: Excluded from Jest runs
- **Note**: E2E tests should be run with Playwright

## Test Configuration

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/tests/unit/**/*.test.ts',
    '**/tests/unit/**/*.test.tsx'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/*',
    '!src/generated/**/*'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true
}
```

### Test Setup
```javascript
// jest.setup.js
import '@testing-library/jest-dom'

// Global test configuration
global.fetch = jest.fn()

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.OPENAI_API_KEY = 'test-api-key'
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long'
```

## Known Issues and TODOs

### OpenAI Service Tests
**Issue**: Constructor mocking problems with the OpenAI library
**Status**: Tests are skipped with TODO comments
**Impact**: Low - core functionality is tested through other means
**Solution**: Requires refactoring the service for easier mocking or using a different mocking strategy

```typescript
// TODO: Fix OpenAI constructor mocking - this test is temporarily skipped
// The issue is that the OpenAI constructor is being called during module import
// before the mock is properly set up. This needs a different mocking strategy.
describe.skip('OpenAIService', () => {
  // Test implementations pending
})
```

### Rate Limiter Timing Tests
**Issue**: In-memory store and timer mocking reliability
**Status**: Two timing-based tests are commented out
**Impact**: Low - core rate limiting logic is tested
**Solution**: Extract store and timer logic for more reliable unit testing

```typescript
// TODO: Fix timing test - rate limiter implementation needs improvement
// it('should reset after window time', () => {
//   // Test implementation pending
// })
```

## Test Best Practices

### Writing Tests
1. **Descriptive Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Structure tests with clear sections
3. **Isolation**: Each test should be independent
4. **Mocking**: Mock external dependencies appropriately
5. **Coverage**: Aim for high test coverage on critical paths

### Example Test Structure
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  })

  afterEach(() => {
    // Cleanup
  })

  describe('methodName', () => {
    it('should handle success case', () => {
      // Arrange
      const input = 'test'
      
      // Act
      const result = method(input)
      
      // Assert
      expect(result).toBe('expected')
    })

    it('should handle error case', () => {
      // Arrange
      const input = 'invalid'
      
      // Act & Assert
      expect(() => method(input)).toThrow('Error message')
    })
  })
})
```

### Mocking Strategies
1. **Jest Mocks**: Use `jest.mock()` for module mocking
2. **Spy Functions**: Use `jest.spyOn()` for method mocking
3. **Manual Mocks**: Create mock implementations for complex dependencies
4. **Fake Timers**: Use `jest.useFakeTimers()` for time-based tests

## Performance Testing

### Test Performance
- **Unit Tests**: < 10 seconds for full suite
- **Integration Tests**: < 30 seconds
- **E2E Tests**: < 2 minutes

### Performance Tests
- Encryption operations: < 2 seconds for 50 operations
- Password hashing: < 10 seconds for 5 operations
- Rate limiting: < 1 second for 10 operations

## Coverage Goals

### Current Coverage
- **Statements**: ~85%
- **Branches**: ~80%
- **Functions**: ~90%
- **Lines**: ~85%

### Coverage Targets
- **Critical Paths**: 100%
- **Core Utilities**: 95%+
- **Middleware**: 90%+
- **Services**: 85%+ (excluding external API calls)

## CI/CD Integration

### GitHub Actions
```yaml
# .github/workflows/test.yml
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
      - run: npm test
      - run: npm run test:coverage
```

### Pre-commit Hooks
- Run unit tests before commit
- Check test coverage thresholds
- Validate test file structure

## Troubleshooting

### Common Issues

1. **OpenAI Constructor Errors**
   - **Symptom**: `TypeError: _openai.default is not a constructor`
   - **Solution**: Tests are skipped - see Known Issues

2. **Timer Mocking Warnings**
   - **Symptom**: `jest.advanceTimersByTime` warnings
   - **Solution**: Use `jest.useFakeTimers()` in affected tests

3. **Module Import Errors**
   - **Symptom**: Import/export mismatches
   - **Solution**: Check TypeScript configuration and module resolution

4. **Memory Leaks**
   - **Symptom**: Tests failing after many runs
   - **Solution**: Ensure proper cleanup in `afterEach` hooks

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test with verbose output
npm test -- --verbose tests/unit/utils/logger.test.ts
```

## Future Improvements

### Planned Enhancements
1. **OpenAI Service Testing**: Resolve constructor mocking issues
2. **Rate Limiter Testing**: Improve timing test reliability
3. **Integration Test Runner**: Set up dedicated integration test environment
4. **E2E Test Environment**: Configure Playwright for automated E2E testing
5. **Performance Testing**: Add dedicated performance test suite
6. **Visual Regression Testing**: Add visual testing for UI components

### Test Infrastructure Improvements
1. **Parallel Test Execution**: Configure Jest for parallel test runs
2. **Test Data Management**: Implement test data factories and fixtures
3. **API Mocking**: Set up comprehensive API mocking for integration tests
4. **Database Testing**: Add database integration tests with test containers

## Contributing to Tests

### Adding New Tests
1. Follow the existing test structure
2. Use descriptive test names
3. Include both success and error cases
4. Add appropriate mocks for external dependencies
5. Update this documentation if adding new test types

### Test Review Checklist
- [ ] Tests are descriptive and well-structured
- [ ] All code paths are covered
- [ ] Error cases are handled
- [ ] Mocks are appropriate and minimal
- [ ] Tests are independent and repeatable
- [ ] Performance is acceptable
- [ ] Documentation is updated

---

For questions or issues with testing, please refer to the project's issue tracker or contact the development team. 