# Testing Strategy - UX Simplification

## 🆕 DASHBOARD NAVIGATION & TEST UPDATE
- Dashboard navigation now uses Chat, Workflows, Connections as main tabs
- Settings, Profile, Secrets, and Audit Log are only accessible via the user dropdown
- All navigation and E2E tests updated to use new dropdown `data-testid` patterns
- Documentation files synchronized to reflect new navigation and test structure

## Overview

This document outlines the comprehensive testing strategy for the UX simplification project, covering unit tests, integration tests, E2E tests, and accessibility testing.

## 🎯 **Testing Philosophy**

### **Principles**
- **No Mocking Policy:** No mocking in production code - all services use real implementations
- **No Mock Data in E2E:** Real data for realistic testing scenarios
- **Real AI Services:** All AI orchestrator tests use real OpenAI API calls
- **Primary Action Patterns:** Consistent `data-testid="primary-action {action}-btn"` patterns
- **Accessibility First:** WCAG 2.1 AA compliance for all components
- **Performance Testing:** Load testing and optimization validation
  - **Performance Monitoring:** Real-time metrics tracking with `PerformanceMonitor`
  - **Cache Testing:** Validate intelligent caching with `AICacheService`
  - **Parallel Processing:** Test concurrent AI operations with `ParallelAIService`
  - **Token Optimization:** Verify context-aware endpoint filtering (83% reduction)
  - **Response Time Testing:** Ensure 60-70% faster workflow generation
- **Security Testing:** Authentication flows and data protection
- **Hybrid Testing Strategy:** E2E tests for user journeys, unit tests for form logic

### **React Form Testing Strategy**
- **E2E Tests**: Focus on user journey validation using API-based authentication
  - Full user flow testing (login → dashboard → functionality)
  - Form UI validation (elements present, accessible)
  - User experience validation with real data
- **Unit Tests**: Comprehensive form logic testing using React Testing Library
  - All form submission scenarios (success/failure)
  - Error handling (network errors, validation)
  - Loading states and UX compliance
  - OAuth2 integration testing
- **Rationale**: Playwright cannot update React controlled component state, requiring hybrid approach

### **Test Organization**
```
tests/
├── e2e/                    # End-to-end user flows
│   ├── auth/              # Authentication and authorization
│   ├── ui/                # UI and navigation testing
│   ├── onboarding/        # User onboarding flows
│   ├── performance/       # Load and performance testing
│   ├── security/          # Security and compliance testing
│   └── workflow-engine/   # Workflow generation and execution
├── integration/           # API and service integration
├── unit/                  # Component and utility testing
└── fixtures/              # Test data and utilities
```

## 🧪 **Unit Testing**

### **Dashboard Components**
- **26 Unit Tests** for dashboard functionality
- **3-Tab Structure** validation
- **Role-Based Access** testing
- **Mobile Navigation** integration
- **Performance Optimizations** validation

### **New Components**
- `MobileNavigation` - Touch interactions and responsive behavior
- `GuidedTour` - Step navigation and accessibility
- `ProgressiveDisclosure` - Feature gating logic
- `SettingsTab` - Tabbed interface and data management
- `MessageBanner` - Message display and auto-clear functionality

### **Test Patterns**
```typescript
// Example: Dashboard page test structure
describe('DashboardPage', () => {
  describe('3-Tab Structure', () => {
    test('renders 3-tab navigation structure', async () => {
      // Test implementation
    });
  });

  describe('Role-Based Access', () => {
    test('shows admin functions in dropdown for admin users', async () => {
      // Test implementation
    });
  });

  describe('Mobile Navigation', () => {
    test('handles mobile tab navigation', async () => {
      // Test implementation
    });
  });
});
```

## 🤖 **AI Orchestrator Testing**

### **Testing Philosophy**
- **Real AI Services:** All tests use real OpenAI API calls, no mocking
- **Production-Ready:** Tests must work in production environment
- **Real Data:** Use real user data and real API connections
- **End-to-End:** Test complete AI orchestrator flow from user input to response

### **AI Orchestrator Test Categories**

#### **1. Message Classification Testing**
```typescript
// tests/e2e/ai-orchestrator/classification.test.ts
test('should classify workflow requests correctly', async ({ page }) => {
  await loginAsTestUser(page);
  
  // Test workflow classification
  await page.fill('[data-testid="chat-input"]', 'Create a workflow to send Slack notifications');
  await page.click('[data-testid="primary-action chat-send-btn"]');
  
  // Verify workflow generation response
  await page.waitForSelector('[data-testid="workflow-generated"]');
  const response = await page.textContent('[data-testid="ai-response"]');
  expect(response).toContain('workflow');
});

test('should classify connection guidance requests', async ({ page }) => {
  await loginAsTestUser(page);
  
  // Test connection guidance classification
  await page.fill('[data-testid="chat-input"]', 'How do I connect to Discord?');
  await page.click('[data-testid="primary-action chat-send-btn"]');
  
  // Verify connection guidance response
  await page.waitForSelector('[data-testid="connection-guidance"]');
  const response = await page.textContent('[data-testid="ai-response"]');
  expect(response).toContain('connect');
});
```

#### **2. Workflow Generation Testing**
```typescript
// tests/e2e/ai-orchestrator/workflow-generation.test.ts
test('should generate multi-step workflows via AI orchestrator', async ({ page }) => {
  await loginAsTestUser(page);
  await createTestApiConnections(page); // Real API connections
  
  // Test complex workflow generation
  await page.fill('[data-testid="chat-input"]', 'When a GitHub issue is created, send Slack notification and create Trello card');
  await page.click('[data-testid="primary-action chat-send-btn"]');
  
  // Verify workflow was generated
  await page.waitForSelector('[data-testid="workflow-generated"]');
  
  // Verify workflow has multiple steps
  const steps = await page.locator('[data-testid="workflow-step"]').count();
  expect(steps).toBeGreaterThan(1);
  
  // Verify workflow uses real connection IDs
  const workflowData = await page.evaluate(() => {
    return JSON.parse(document.querySelector('[data-testid="workflow-data"]').textContent);
  });
  expect(workflowData.steps[0].apiConnectionId).toMatch(/^cm[a-z0-9]+$/);
});
```

#### **3. Connection Guidance Testing**
```typescript
// tests/e2e/ai-orchestrator/connection-guidance.test.ts
test('should provide connection guidance for missing APIs', async ({ page }) => {
  await loginAsTestUser(page);
  // Only create GitHub connection, not Discord
  
  // Test connection guidance
  await page.fill('[data-testid="chat-input"]', 'Create a workflow using GitHub and Discord');
  await page.click('[data-testid="primary-action chat-send-btn"]');
  
  // Verify connection guidance response
  await page.waitForSelector('[data-testid="connection-guidance"]');
  const response = await page.textContent('[data-testid="ai-response"]');
  expect(response).toContain('Discord');
  expect(response).toContain('connect');
});
```

#### **4. Error Handling Testing**
```typescript
// tests/e2e/ai-orchestrator/error-handling.test.ts
test('should handle AI service errors gracefully', async ({ page }) => {
  await loginAsTestUser(page);
  
  // Mock AI service failure
  await page.route('**/api/chat/process', route => {
    route.fulfill({ 
      status: 500, 
      body: JSON.stringify({
        success: false,
        error: 'AI service temporarily unavailable'
      })
    });
  });
  
  await page.fill('[data-testid="chat-input"]', 'Create a workflow');
  await page.click('[data-testid="primary-action chat-send-btn"]');
  
  // Verify error handling
  await page.waitForSelector('[data-testid="error-message"]');
  const error = await page.textContent('[data-testid="error-message"]');
  expect(error).toContain('temporarily unavailable');
});
```

#### **5. Confidence Confirmation Testing**
```typescript
// tests/e2e/chat/confidence-confirmation.test.ts
test('should show confidence confirmation when AI has uncertainty', async ({ page }) => {
  await loginAsTestUser(page);
  
  // Use high confidence threshold to trigger confirmations
  await page.goto('/dashboard?tab=chat');
  
  // Send ambiguous message that should trigger confidence confirmation
  await page.fill('[data-testid="chat-input"]', 'Create something with APIs');
  await page.click('[data-testid="primary-action chat-send-btn"]');
  
  // Verify confidence confirmation appears
  await page.waitForSelector('[data-testid="confidence-confirmation"]');
  
  // Verify uncertainty type and explanation
  const confirmation = page.locator('[data-testid="confidence-confirmation"]');
  await expect(confirmation).toContainText('I\'m not sure');
  
  // Verify suggestions are present
  const suggestions = page.locator('[data-testid^="suggestion-"]');
  await expect(suggestions).toHaveCount.greaterThan(0);
  
  // Test user interaction with suggestions
  await page.click('[data-testid="confirm-option-0"]');
  
  // Verify confirmation is handled
  await expect(page.locator('[data-testid="confidence-confirmation"]')).not.toBeVisible();
});

test('should handle confidence confirmation user actions', async ({ page }) => {
  await loginAsTestUser(page);
  
  // Trigger confidence confirmation
  await page.fill('[data-testid="chat-input"]', 'Do something with data');
  await page.click('[data-testid="primary-action chat-send-btn"]');
  
  await page.waitForSelector('[data-testid="confidence-confirmation"]');
  
  // Test "Proceed Anyway" action
  await page.click('[data-testid="primary-action proceed-anyway-btn"]');
  await expect(page.locator('[data-testid="confidence-confirmation"]')).not.toBeVisible();
  
  // Test "Refine Request" action
  await page.fill('[data-testid="chat-input"]', 'Do something with data');
  await page.click('[data-testid="primary-action chat-send-btn"]');
  await page.waitForSelector('[data-testid="confidence-confirmation"]');
  
  await page.click('[data-testid="refine-request-btn"]');
  await expect(page.locator('[data-testid="confidence-confirmation"]')).not.toBeVisible();
  
  // Test "Cancel" action
  await page.fill('[data-testid="chat-input"]', 'Do something with data');
  await page.click('[data-testid="primary-action chat-send-btn"]');
  await page.waitForSelector('[data-testid="confidence-confirmation"]');
  
  await page.click('[data-testid="secondary-action cancel-btn"]');
  await expect(page.locator('[data-testid="confidence-confirmation"]')).not.toBeVisible();
});
```

**Confidence Confirmation Test Configuration:**
- **Dedicated Test Config**: `playwright.confidence.config.ts` with `CONFIDENCE_THRESHOLD=0.95`
- **Test Environment**: `.env.test-confidence` for high confidence threshold
- **Test Commands**: 
  ```bash
  npx playwright test --config=playwright.confidence.config.ts
  npm run test:e2e:confidence
  ```

### **AI Orchestrator Test Environment**

#### **Environment Setup**
```bash
# .env.test - Use real OpenAI API key for testing
OPENAI_API_KEY=sk-real-test-key-here
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/apiq_test
```

#### **Test Data Requirements**
- **Real Users:** Create real test users with real authentication
- **Real API Connections:** Create real API connections for testing
- **Real AI Responses:** Use real OpenAI API calls for all tests
- **Real Database:** Use real PostgreSQL database for all operations

#### **Performance Considerations**
- **AI API Rate Limits:** Respect OpenAI rate limits in tests
- **Test Timeout:** Allow sufficient time for AI processing (30+ seconds)
- **Parallel Testing:** Limit concurrent AI API calls to avoid rate limits
- **Test Isolation:** Each test should be independent and clean up after itself

### **AI Orchestrator Test Patterns**

#### **Real Service Testing Pattern**
```typescript
// ✅ GOOD: Real AI service testing
test('should process message with real AI', async () => {
  const result = await HybridMessageClassificationService.classifyMessage(
    'Create a workflow',
    'user-id'
  );
  
  expect(result.type).toBe('workflow');
  expect(result.confidence).toBeGreaterThan(0.8);
});

// ❌ BAD: Mocked AI service testing
test('should process message with mock', async () => {
  jest.mock('HybridMessageClassificationService');
  const mockClassify = jest.fn().mockResolvedValue({ type: 'workflow' });
  
  const result = await mockClassify('Create a workflow');
  expect(result.type).toBe('workflow');
});
```

#### **E2E AI Testing Pattern**
```typescript
// ✅ GOOD: E2E AI orchestrator testing
test('should generate workflow end-to-end', async ({ page }) => {
  // 1. Setup real environment
  await loginAsTestUser(page);
  await createTestApiConnections(page);
  
  // 2. Send real message to AI orchestrator
  await page.fill('[data-testid="chat-input"]', 'Create a Slack workflow');
  await page.click('[data-testid="primary-action chat-send-btn"]');
  
  // 3. Wait for real AI response
  await page.waitForSelector('[data-testid="workflow-generated"]');
  
  // 4. Verify real workflow was created
  const workflow = await page.textContent('[data-testid="workflow-name"]');
  expect(workflow).toContain('Slack');
});
```

## 🔄 **Integration Testing**

### **API Integration**
- **Authentication Flows** - Login, logout, token management
- **Database Operations** - CRUD operations and data persistence
- **OAuth2 Flows** - Provider integration and token handling
- **Workflow Generation** - AI integration and workflow creation

### **Service Integration**
- **OnboardingContext** - State management and persistence
- **ProgressiveDisclosure** - Feature unlocking logic
- **MessageBanner** - Message state management
- **MobileNavigation** - URL parameter handling

### **Test Data Management**
```typescript
// Example: Integration test setup
beforeAll(async () => {
  // Create test users with different roles
  regularUser = await createTestUser({ role: 'user' });
  adminUser = await createTestUser({ role: 'admin' });
});

afterAll(async () => {
  // Clean up test data
  await cleanupTestData();
});
```

## 🌐 **E2E Testing**

### **Navigation Testing**
- **3-Tab Structure** - Tab switching and URL handling (Chat, Workflows, Connections)
- **Dropdown Navigation** - Settings, Profile, Secrets, and Audit Log via dropdown
- **Admin Access** - Dropdown navigation and role-based access
- **URL Parameters** - Tab state persistence and validation

### **User Flow Testing**
- **Onboarding Journey** - New user experience validation
- **Authentication Flows** - Login, signup, password reset
- **Workflow Creation** - Natural language to workflow generation
- **Settings Management** - Connection and secret management

### **Accessibility Testing**
- **Screen Reader** - VoiceOver and NVDA compatibility
- **Keyboard Navigation** - Tab order and focus management
- **ARIA Labels** - Proper labeling and descriptions
- **Color Contrast** - WCAG 2.1 AA compliance

### **Performance Testing**
- **Load Times** - Page load and component rendering
- **Memory Usage** - Memory leaks and optimization
- **Bundle Size** - Code splitting and lazy loading
- **Mobile Performance** - Touch responsiveness and battery usage

### **E2E Test Structure**
```typescript
// Example: E2E navigation test
test.describe('UX Simplification - Navigation', () => {
  test.describe('3-Tab Structure', () => {
    test('should render 3-tab navigation structure', async ({ page }) => {
      await loginAsUser(page, regularUser);
      await page.goto('/dashboard');

      // Verify 3-tab structure
      await expect(page.getByTestId('tab-chat')).toBeVisible();
      await expect(page.getByTestId('tab-workflows')).toBeVisible();
      await expect(page.getByTestId('tab-connections')).toBeVisible();
    });
  });
  test('should open Settings from dropdown', async ({ page }) => {
    await page.click('[data-testid="user-dropdown-toggle"]');
    await page.click('[data-testid="dropdown-settings"]');
    await expect(page.getByTestId('settings-page')).toBeVisible();
  });
});
```

### **Connection Testing Patterns**

#### **Specialized Connection Creation Helpers**
```typescript
// API Key Connection Creation
const connectionId = await testApiKeyConnectionCreation(page, {
  name: 'Test API Connection',
  description: 'Test connection for API key auth',
  baseUrl: 'https://api.example.com',
  apiKey: 'test-key-123'
});

// Bearer Token Connection Creation
const connectionId = await testBearerTokenConnectionCreation(page, {
  name: 'Test Bearer Connection',
  description: 'Test connection for Bearer token auth',
  baseUrl: 'https://api.example.com',
  bearerToken: 'bearer-token-123'
});

// Basic Auth Connection Creation
const connectionId = await testBasicAuthConnectionCreation(page, {
  name: 'Test Basic Auth Connection',
  description: 'Test connection for Basic auth',
  baseUrl: 'https://api.example.com',
  username: 'testuser',
  password: 'testpass'
});

// OAuth2 Connection Creation
const connectionId = await testOAuth2ConnectionCreation(page, {
  name: 'Test OAuth2 Connection',
  description: 'Test connection for OAuth2 auth',
  baseUrl: 'https://api.example.com',
  provider: 'github',
  clientId: 'client-id-123',
  clientSecret: 'client-secret-456',
  redirectUri: 'https://app.example.com/callback',
  scope: 'read:user'
});
```

#### **Form Submission Improvements**
```typescript
// Reliable form submission using requestSubmit()
await modal.locator('form').evaluate((form: HTMLFormElement) => {
  form.requestSubmit();
});

// Enhanced error handling with multiple selectors
const errorSelectors = [
  '[data-testid="error-message"]',
  '[data-testid="registration-error"]',
  '.text-sm.font-medium.text-red-800',
  '.text-red-600',
  '.text-red-800'
];
```

#### **API-Based Cleanup**
```typescript
// More reliable cleanup using API calls instead of UI
export const cleanupTestConnections = async (page: Page): Promise<void> => {
  const response = await page.request.get('/api/connections');
  if (response.ok()) {
    const connections = await response.json();
    for (const connection of connections) {
      await page.request.delete(`/api/connections/${connection.id}`);
    }
  }
};
```

#### **Enhanced Test Helpers with Logging and Retry Logic**
```typescript
// Enhanced connection creation with comprehensive logging
const connectionId = await createTestApiConnection(page, {
  name: 'Enhanced Test Connection',
  description: 'Test connection with enhanced logging',
  baseUrl: 'https://api.example.com',
  authType: 'API_KEY',
  authConfig: { apiKey: 'test-key-123' }
}, {
  enableLogging: true,
  retryAttempts: 3,
  timeout: 30000
});

// Enhanced workflow testing with retry logic
const workflowId = await testWorkflowGeneration(page, {
  userDescription: 'Create a workflow to send notifications',
  context: 'Test context for workflow generation'
}, {
  enableLogging: true,
  retryAttempts: 2,
  validateResponse: true
});

// Enhanced step runner testing with comprehensive logging
const executionId = await testWorkflowExecution(page, workflowId, {
  input: { testData: 'value' }
}, {
  enableLogging: true,
  retryAttempts: 3,
  timeout: 60000,
  validateSteps: true
});
```

## ♿ **Accessibility Testing**

### **WCAG 2.1 AA Compliance**
- **Perceivable** - Text alternatives, captions, color contrast
- **Operable** - Keyboard navigation, focus management, timing
- **Understandable** - Readable text, predictable navigation
- **Robust** - Compatible with assistive technologies

### **Testing Tools**
- **Playwright Accessibility** - Built-in accessibility testing
- **axe-core** - Automated accessibility testing
- **Manual Testing** - Screen reader and keyboard navigation
- **Color Contrast** - WCAG contrast ratio validation

### **Accessibility Test Examples**
```typescript
// Example: Accessibility test
test('should have proper ARIA labels', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Verify ARIA labels
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('navigation')).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
});

test('should support keyboard navigation', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Test tab navigation
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('tab-chat')).toBeFocused();
  
  // Test arrow key navigation
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('tab-workflows')).toBeFocused();
});
```

## 📊 **Performance Testing**

### **Load Testing**
- **Concurrent Users** - Multiple users accessing simultaneously
- **API Performance** - Response times and throughput
- **Database Performance** - Query optimization and indexing
- **Memory Usage** - Memory leaks and garbage collection

### **Frontend Performance**
- **Bundle Analysis** - Code splitting and optimization
- **Lazy Loading** - Component loading and Suspense boundaries
- **React.memo** - Component memoization validation
- **useCallback/useMemo** - Hook optimization testing

### **Mobile Performance**
- **Touch Responsiveness** - Touch target sizes and interactions
- **Battery Usage** - Power consumption optimization
- **Network Efficiency** - API calls and caching
- **Offline Support** - Service worker and PWA features

## 🔒 **Security Testing**

### **Authentication Security**
- **JWT Validation** - Token verification and expiration
- **OAuth2 Security** - State parameter validation and CSRF protection
- **Password Security** - Hashing and validation
- **Session Management** - Secure session handling

### **Data Protection**
- **Encryption** - AES-256 encryption for sensitive data
- **Input Validation** - XSS and injection prevention
- **Output Encoding** - Safe data rendering
- **Access Control** - Role-based access validation

### **API Security**
- **Rate Limiting** - Request throttling and abuse prevention
- **CORS Configuration** - Cross-origin request handling
- **Input Sanitization** - Parameter validation and sanitization
- **Error Handling** - Secure error messages and logging

## 🚀 **Test Execution**

### **CI/CD Pipeline**
```yaml
# Example: GitHub Actions workflow
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Run accessibility tests
        run: npm run test:accessibility
```

### **Local Development**
```bash
# Run all tests
npm run test:all

# Run specific test suites
npm test                    # Unit tests
npm run test:integration    # Integration tests
npm run test:e2e           # E2E tests
npm run test:accessibility # Accessibility tests

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📈 **Test Metrics**

### **Coverage Goals**
- **Unit Tests**: 90%+ line coverage
- **Integration Tests**: 85%+ API endpoint coverage
- **E2E Tests**: 100% critical user path coverage
- **Accessibility Tests**: 100% WCAG 2.1 AA compliance

### **Performance Benchmarks**
- **Page Load Time**: < 2 seconds on 3G connection
- **Time to Interactive**: < 3 seconds
- **Bundle Size**: < 500KB initial load
- **Memory Usage**: < 50MB for typical session

### **Quality Metrics**
- **Test Reliability**: 99%+ pass rate
- **Flaky Test Rate**: < 1%
- **Test Execution Time**: < 10 minutes for full suite
- **Bug Detection**: 90%+ bugs caught by tests

## 🔧 **Test Maintenance**

### **Best Practices**
- **Test Isolation** - Each test should be independent
- **Data Cleanup** - Clean up test data after each test
- **Mocking Strategy** - Mock external dependencies appropriately
- **Test Documentation** - Clear test descriptions and purpose

### **Test Review Process**
- **Code Review** - All test changes require review
- **Performance Review** - Monitor test execution time
- **Coverage Review** - Ensure adequate test coverage
- **Accessibility Review** - Validate accessibility compliance

### **Continuous Improvement**
- **Test Refactoring** - Regular test code cleanup
- **Performance Optimization** - Optimize slow tests
- **Coverage Analysis** - Identify untested code paths
- **Tool Updates** - Keep testing tools up to date

## 📚 **Resources**

### **Documentation**
- [UX Simplification Plan](UX_SIMPLIFICATION_PLAN.md)
- [API Reference](API_REFERENCE.md)
- [Architecture Guide](ARCHITECTURE.md)
- [User Rules](user-rules.md)

### **Testing Tools**
- **Jest** - Unit and integration testing
- **Playwright** - E2E testing
- **Testing Library** - Component testing utilities
- **axe-core** - Accessibility testing

### **External Resources**
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Library Documentation](https://testing-library.com/docs/)

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Maintainer**: APIQ Team 

## Text Readability Testing

### Enhanced Styling Validation

The enhanced text readability system includes comprehensive testing to ensure WCAG 2.1 AA compliance.

#### 1. **E2E Test Suite**

```typescript
// tests/e2e/ui/text-readability.test.ts
test.describe('Enhanced Text Readability & Contrast', () => {
  test('should have high contrast text in all input fields', async ({ page }) => {
    // Navigate to forms and validate enhanced styling
    await page.getByTestId('tab-connections').click();
    await page.getByTestId('primary-action create-connection-btn').click();
    
    // Verify enhanced styling is applied
    const nameInput = page.getByTestId('connection-name-input');
    await expect(nameInput).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(nameInput).toHaveCSS('color', 'rgb(17, 24, 39)');
  });
});
```

#### 2. **UX Compliance Helper Integration**

```typescript
// All existing tests automatically get text readability validation
import { UXComplianceHelper } from '@/tests/helpers/uxCompliance';

const uxHelper = new UXComplianceHelper(page);

// This now includes text readability validation
await uxHelper.validateFormAccessibility();

// Or validate specifically
await uxHelper.validateTextReadability();
```

#### 3. **Validation Script**

```bash
# Automated validation of enhanced styling system
node scripts/test-enhanced-styling.js
```

#### 4. **Test Coverage Areas**

- **Form Input Contrast**: White backgrounds with dark text
- **Label Readability**: Dark text against any background
- **Placeholder Visibility**: Optimized contrast for placeholders
- **Focus State Clarity**: Blue borders with shadows
- **Cross-Platform Consistency**: Mobile, tablet, and desktop
- **Performance Impact**: No significant load time increase

### Accessibility Testing

// ... existing code ... 