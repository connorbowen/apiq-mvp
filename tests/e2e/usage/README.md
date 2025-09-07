# Usage Tracking E2E Tests

This directory contains comprehensive end-to-end tests for APIQ's usage tracking and billing functionality, designed to validate the complete user journey from usage tracking to billing management.

## 🎯 Testing Strategy

Our usage tracking E2E tests follow the comprehensive testing requirements outlined in `docs/user-rules.md`:

### **Core Principles**
- **No Mock Data**: All tests use real usage tracking with real database operations
- **UX Compliance**: All tests validate UX_SPEC.md requirements (headings, accessibility, navigation)
- **Test Isolation**: Each test is isolated with proper cleanup and unique test data
- **Performance Validation**: Tests include performance benchmarks and loading time validation
- **Accessibility Testing**: Keyboard navigation, ARIA compliance, and screen reader support

### **Test Coverage Areas**
1. **Usage Dashboard** - Real-time usage display and analytics
2. **Usage Tracking** - Live tracking of AI service usage and costs
3. **Billing Integration** - Plan limits, overages, and billing calculations
4. **Analytics & Reporting** - Usage reports and trend analysis
5. **UX Compliance** - Accessibility, navigation, and user experience standards
6. **Performance** - Loading times, responsiveness, and concurrent user handling
7. **Error Handling** - Graceful failure modes and user recovery paths

## 📁 Test Files

### **`usage-dashboard.test.ts`**
Tests the usage dashboard functionality:
- ✅ Real-time usage metrics display
- ✅ Cost breakdown by service type
- ✅ Plan limits and overage warnings
- ✅ Usage trends and patterns
- ✅ UX compliance and accessibility validation
- ✅ Performance and reliability testing

### **`real-usage-tracking.test.ts`**
Tests live usage tracking functionality:
- ✅ OpenAI chat usage tracking
- ✅ Workflow generation usage tracking
- ✅ API execution usage tracking
- ✅ Token counting and cost calculation
- ✅ Real-time usage updates
- ✅ Usage record accuracy validation

### **`billing-integration.test.ts`**
Tests billing and plan management:
- ✅ Plan limit enforcement
- ✅ Overage charge calculation
- ✅ Upgrade flow testing
- ✅ Billing notification system
- ✅ Payment processing integration
- ✅ Plan change workflows

### **`usage-analytics.test.ts`**
Tests analytics and reporting functionality:
- ✅ Monthly usage summaries
- ✅ Usage trend analysis
- ✅ Data export functionality
- ✅ Report generation
- ✅ Historical data display
- ✅ Analytics dashboard functionality

## 🚀 How to Use These Tests

### **Quick Start Commands**
```bash
# Run all usage tracking tests
npm run test:e2e:usage

# Run specific test areas
npm run test:e2e:usage:dashboard      # Usage dashboard tests
npm run test:e2e:usage:tracking       # Real usage tracking tests
npm run test:e2e:usage:billing        # Billing integration tests
npm run test:e2e:usage:analytics      # Analytics and reporting tests

# Run with detailed reporting
npm run test:e2e:usage:report
```

### **Test Runner Script Options**
```bash
# Basic execution
./tests/e2e/usage/run-usage-tests.sh

# Debug mode with headed browser
./tests/e2e/usage/run-usage-tests.sh --debug --headed

# Full reporting with video capture
./tests/e2e/usage/run-usage-tests.sh --report --video --screenshot

# Parallel execution for faster results
./tests/e2e/usage/run-usage-tests.sh --parallel --report
```

## ✅ User-Rules.md Compliance

### **Testing Rules Compliance**
- ✅ **No Mock Data**: All tests use real usage tracking with real database operations
- ✅ **Test Isolation**: Each test is properly isolated with cleanup and unique test data
- ✅ **E2E Coverage**: Complete user journey testing from usage tracking to billing
- ✅ **Performance Testing**: Performance benchmarks and loading time validation
- ✅ **Error Handling**: Comprehensive error scenario testing

### **UX Compliance Rules**
- ✅ **UX_SPEC.md Validation**: All tests validate UX compliance requirements
- ✅ **Accessibility Testing**: Keyboard navigation, ARIA compliance, screen reader support
- ✅ **Navigation Standards**: Clear headings, primary actions, error recovery paths
- ✅ **Form Standards**: Field validation, error messaging, accessibility compliance
- ✅ **Mobile Responsiveness**: Touch targets, responsive layout testing

### **Code Quality Rules**
- ✅ **TypeScript Standards**: Strict typing, proper interfaces, null safety
- ✅ **Error Handling**: Comprehensive error handling and graceful degradation
- ✅ **Security Testing**: XSS prevention, data exposure testing
- ✅ **Performance Standards**: Page load time validation, API response time testing

## 🔧 Helper Functions

### **Usage Test Helpers**
- `createUsageTestData()` - Create test usage records and pricing configs
- `verifyUsageTracking()` - Verify usage was tracked correctly
- `testUsageDashboard()` - Test usage dashboard functionality
- `validateUsageUXCompliance()` - Validate UX compliance for usage features
- `testBillingIntegration()` - Test billing and payment flows
- `testUsageAnalytics()` - Test analytics and reporting features

### **Data Management**
- `cleanupUsageTestData()` - Clean up usage test data
- `resetUsageLimits()` - Reset user usage limits for testing
- `createTestPricingConfig()` - Create test pricing configurations
- `simulateUsage()` - Simulate usage for testing scenarios

## 📊 Test Data Management

### **Test User Creation**
- Dynamic test user generation with unique identifiers
- Proper cleanup after each test
- Test isolation with unique test data
- Real authentication flows

### **Usage Data Generation**
- Dynamic usage record creation
- Realistic token counts and costs
- Various service types and models
- Historical usage data for analytics testing

### **Pricing Configuration**
- Test pricing configurations for different models
- Plan limits and overage pricing
- Dynamic pricing updates for testing
- Realistic cost calculations

## 🎯 Success Criteria

### **Functional Requirements**
- ✅ Usage tracking works correctly for all AI services
- ✅ Cost calculations are accurate and real-time
- ✅ Plan limits are enforced properly
- ✅ Billing integration functions correctly
- ✅ Analytics provide meaningful insights

### **UX Requirements**
- ✅ Usage dashboard is intuitive and accessible
- ✅ All forms follow UX spec requirements
- ✅ Error messages are clear and actionable
- ✅ Mobile experience is optimized
- ✅ Navigation is clear and logical

### **Performance Requirements**
- ✅ Dashboard loads within performance budget
- ✅ Usage updates are real-time and responsive
- ✅ Analytics queries perform efficiently
- ✅ Billing calculations are fast and accurate

### **Security Requirements**
- ✅ Usage data is properly secured
- ✅ Billing information is protected
- ✅ User data isolation is maintained
- ✅ Audit logging is comprehensive
