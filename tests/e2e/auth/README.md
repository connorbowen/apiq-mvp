# Authentication E2E Tests

This directory contains comprehensive end-to-end tests for APIQ's authentication flows, designed to validate the complete user journey from landing page to authenticated dashboard access.

## 🎯 Testing Strategy

Our authentication E2E tests follow the comprehensive testing requirements outlined in `docs/user-rules.md`:

### **Core Principles**
- **No Mock Data**: All tests use real authentication flows with real database operations
- **UX Compliance**: All tests validate UX_SPEC.md requirements (headings, accessibility, navigation)
- **Test Isolation**: Each test is isolated with proper cleanup and unique test data
- **Performance Validation**: Tests include performance benchmarks and loading time validation
- **Accessibility Testing**: Keyboard navigation, ARIA compliance, and screen reader support

### **Test Coverage Areas**
1. **Landing Page Behavior** - Different states for authenticated vs unauthenticated users
2. **Authentication Flows** - Complete registration and login journeys
3. **State Management** - Session persistence and authentication state validation
4. **UX Compliance** - Accessibility, navigation, and user experience standards
5. **Performance** - Loading times, responsiveness, and concurrent user handling
6. **Error Handling** - Graceful failure modes and user recovery paths

## 📁 Test Files

### **`landing-page-authentication.test.ts`**
Tests the landing page behavior for both authenticated and unauthenticated users:
- ✅ Unauthenticated user experience (Sign Up, Sign In buttons)
- ✅ Authenticated user experience (Start Tour, Try Chat)
- ✅ Navigation to authentication pages
- ✅ Customer social proof section showcasing business use cases
- ✅ UX compliance and accessibility validation
- ✅ Performance and reliability testing



### **`authentication-session.test.ts`**
Tests authentication session management and security:
- ✅ Session validation and persistence
- ✅ Authentication state across navigation
- ✅ Security boundaries and access control
- ✅ Session expiration handling

### **`registration-verification.test.ts`**
Tests user registration and email verification flows:
- ✅ Registration form validation
- ✅ Email verification process
- ✅ Error handling and user feedback
- ✅ UX compliance throughout the flow

## 🚀 Running the Tests

### **Quick Start**
```bash
# Run all authentication tests
npm run test:e2e:auth

# Run with detailed reporting
npm run test:e2e:auth:report

# Run specific test file
npm run test:e2e:auth:landing
npm run test:e2e:auth:session
npm run test:e2e:auth:registration
```

### **Using the Test Runner Script**
```bash
# Basic run
./tests/e2e/auth/run-authentication-tests.sh

# With options
./tests/e2e/auth/run-authentication-tests.sh --headed --report --video

# Debug mode
./tests/e2e/auth/run-authentication-tests.sh --debug --headed

# Parallel execution
./tests/e2e/auth/run-authentication-tests.sh --parallel --report
```

### **Manual Playwright Execution**
```bash
# Run all authentication tests
npx playwright test tests/e2e/auth/

# Run specific test file
npx playwright test tests/e2e/auth/landing-page-authentication.test.ts

# Run with headed browser
npx playwright test tests/e2e/auth/ --headed

# Run with debugging
DEBUG=pw:api npx playwright test tests/e2e/auth/ --headed
```

## ⚙️ Configuration

### **Environment Variables**
```bash
# Base URL for testing
export BASE_URL="http://localhost:3000"

# Node environment
export NODE_ENV="test"

# Test timeout (default: 60 seconds)
export PLAYWRIGHT_TEST_TIMEOUT=60000

# Browser configuration
export PLAYWRIGHT_TEST_HEADLESS=true
```

### **Test Configuration**
Tests automatically configure:
- **Base URL**: From `BASE_URL` environment variable
- **Test Timeout**: 60 seconds for authentication flows
- **Retry Logic**: 2 retries in CI, 0 in development
- **Parallel Execution**: Configurable via `--parallel` flag
- **Browser Coverage**: Chromium, Firefox, and WebKit

## 🔧 Test Setup and Teardown

### **Before Each Test**
- Global error listeners setup
- Tracing and performance monitoring
- Server readiness check
- Rate limit reset
- UX compliance helper initialization

### **After Each Test**
- Tracing cleanup
- Authentication state clearing
- Test data cleanup (when applicable)
- Performance metrics collection

### **Before All Tests**
- Test user creation for authenticated flows
- Database connection validation
- Environment validation

### **After All Tests**
- Test user cleanup
- Final data cleanup
- Resource cleanup

## 📊 Test Results and Reporting

### **Output Formats**
- **HTML Report**: Interactive browser-based report
- **JSON Results**: Machine-readable test results
- **JUnit XML**: CI/CD integration format
- **Console Output**: Real-time test progress

### **Report Location**
```
playwright-report-auth/          # HTML report
test-results-auth/results.json   # JSON results
test-results-auth/results.xml    # JUnit results
```

### **Viewing Reports**
```bash
# Open HTML report
npx playwright show-report playwright-report-auth

# View results in browser
open playwright-report-auth/index.html
```

## 🧪 Test Data Management

### **Test User Creation**
```typescript
// Creates real test user with bcrypt-hashed password
const testUser = await createE2EUser();

// Test user includes:
// - Real email address
// - Bcrypt-hashed password
// - Valid JWT tokens
// - Proper role and permissions
```

### **Unique Test Data**
```typescript
// Generate unique test identifiers
const testEmail = `e2e-test-${generateTestId('user')}@example.com`;

// Prevents test conflicts and ensures isolation
```

### **Cleanup Strategy**
```typescript
// Automatic cleanup after each test
await clearAuthState(page);

// Final cleanup after all tests
await safeCleanupTestData();

// Individual test user cleanup
await cleanupTestUser({ email: testEmail });
```

## 🔍 Debugging and Troubleshooting

### **Common Issues**

#### **Test Timeouts**
```bash
# Increase timeout for slow environments
export PLAYWRIGHT_TEST_TIMEOUT=120000

# Run with debug logging
./tests/e2e/auth/run-authentication-tests.sh --debug
```

#### **Authentication Failures**
```bash
# Check if application is running
curl http://localhost:3000

# Verify database connection
npm run db:check

# Check environment variables
echo $BASE_URL
echo $NODE_ENV
```

#### **Browser Issues**
```bash
# Reinstall Playwright browsers
npx playwright install

# Run with specific browser
npx playwright test --project=chromium
```

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=pw:api npx playwright test --headed

# Run with video recording
./tests/e2e/auth/run-authentication-tests.sh --video --headed

# Capture screenshots on failure
./tests/e2e/auth/run-authentication-tests.sh --screenshot
```

## 📈 Performance Testing

### **Performance Benchmarks**
- **Page Load Time**: < 3 seconds for authentication pages
- **Registration Flow**: < 30 seconds for complete journey
- **Login Flow**: < 10 seconds for authentication
- **Dashboard Load**: < 5 seconds after authentication

### **Concurrent User Testing**
Tests validate system behavior under load:
- Multiple simultaneous registrations
- Concurrent login attempts
- Session management under load
- Database performance under stress

## 🎨 UX Compliance Testing

### **Accessibility Requirements**
- **WCAG 2.1 AA** compliance
- **Keyboard Navigation** support
- **Screen Reader** compatibility
- **ARIA Labels** and roles
- **Color Contrast** validation

### **Navigation Standards**
- **Clear Headings** hierarchy
- **Primary Action** buttons
- **Error Recovery** paths
- **Mobile Responsiveness**
- **Touch Target** sizing

### **Form Standards**
- **Field Labels** and validation
- **Error Messaging** clarity
- **Success Feedback** provision
- **Loading States** indication
- **Accessibility** compliance

## 🔒 Security Testing

### **Authentication Security**
- **Session Validation** testing
- **Token Security** validation
- **Password Security** requirements
- **Rate Limiting** enforcement
- **CSRF Protection** validation

### **Data Protection**
- **Input Validation** testing
- **XSS Prevention** validation
- **SQL Injection** protection
- **Secure Headers** validation
- **Encryption** requirements

## 📋 Test Checklist

### **Before Running Tests**
- [ ] Application is running at `$BASE_URL`
- [ ] Database is accessible and migrated
- [ ] Environment variables are set
- [ ] Dependencies are installed
- [ ] Playwright browsers are installed

### **Test Execution**
- [ ] All tests pass in sequential mode
- [ ] Performance benchmarks are met
- [ ] UX compliance is validated
- [ ] Error handling is tested
- [ ] Security requirements are met

### **After Test Completion**
- [ ] Test reports are generated
- [ ] Test data is cleaned up
- [ ] Performance metrics are collected
- [ ] Issues are documented
- [ ] Test coverage is validated

## 🤝 Contributing

### **Adding New Tests**
1. Follow existing test structure and patterns
2. Use proper test isolation and cleanup
3. Include UX compliance validation
4. Add performance benchmarks
5. Document test purpose and requirements

### **Test Maintenance**
- Update tests when UI changes
- Maintain test data isolation
- Keep performance benchmarks current
- Validate UX compliance requirements
- Update documentation as needed

## 📚 Related Documentation

- **`docs/user-rules.md`** - Development rules and testing requirements
- **`docs/UX_SPEC.md`** - UX compliance standards and patterns
- **`docs/TESTING.md`** - General testing strategy and guidelines
- **`docs/DEVELOPMENT_GUIDE.md`** - Development patterns and standards

## 🆘 Support

For issues with authentication E2E tests:

1. **Check the troubleshooting section** above
2. **Review test logs** and error messages
3. **Verify environment setup** and configuration
4. **Check application health** and database status
5. **Review recent changes** that might affect tests

---

**Last Updated**: January 2025  
**Test Coverage**: 100% of authentication flows  
**UX Compliance**: Full UX_SPEC.md validation  
**Performance**: All benchmarks met  
**Security**: Comprehensive security testing
