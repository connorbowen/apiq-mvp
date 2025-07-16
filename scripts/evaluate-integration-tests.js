#!/usr/bin/env node

/**
 * Integration Test Evaluation Tool
 * 
 * This tool evaluates integration test files against the project's documentation standards:
 * - API testing best practices (endpoint coverage, response validation, error handling)
 * - Database integration testing (setup, teardown, data isolation)
 * - Service layer testing (business logic, external service integration)
 * - Authentication & authorization testing (JWT, cookies, role-based access)
 * - Error handling & edge cases (network failures, validation errors, timeouts)
 * - Performance & load testing (response times, concurrent requests)
 * - Security testing (input validation, SQL injection, XSS prevention)
 * - Test data management (fixtures, seeding, cleanup)
 * 
 * Usage: node scripts/evaluate-integration-tests.js [test-file-path]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const TEST_DIR = 'tests/integration';
const DOCS_DIR = 'docs';
const SRC_DIR = 'src';

// Evaluation criteria weights
const CRITERIA_WEIGHTS = {
  apiTesting: 0.15,
  databaseIntegration: 0.12,
  serviceLayerTesting: 0.12,
  authenticationTesting: 0.10,
  errorHandling: 0.10,
  performanceTesting: 0.08,
  securityTesting: 0.10,
  testDataManagement: 0.08,
  testIsolation: 0.08,
  documentationCompliance: 0.07
};

class IntegrationTestEvaluator {
  constructor() {
    this.results = {};
    this.todos = [];
  }

  /**
   * Detect test file context and scope
   */
  detectTestContext(fileName, filePath, content) {
    const context = {
      type: 'general',
      scope: 'focused',
      expectedFeatures: [],
      excludedFeatures: [],
      description: ''
    };

    const lowerFileName = fileName.toLowerCase();
    const lowerFilePath = filePath.toLowerCase();
    const lowerContent = content.toLowerCase();

    // Detect test type based on file name and path
    if (lowerFileName.includes('auth') || lowerFilePath.includes('auth')) {
      context.type = 'authentication';
      context.expectedFeatures = ['authentication flows', 'JWT validation', 'cookie management', 'session handling'];
      context.excludedFeatures = ['workflow execution', 'UI interactions'];
      context.description = 'Authentication integration test file';
    } else if (lowerFileName.includes('api') || lowerFilePath.includes('api')) {
      context.type = 'api';
      context.expectedFeatures = ['API endpoints', 'request/response validation', 'HTTP status codes', 'error handling'];
      context.excludedFeatures = ['UI interactions', 'database operations'];
      context.description = 'API integration test file';
    } else if (lowerFileName.includes('database') || lowerFilePath.includes('database')) {
      context.type = 'database';
      context.expectedFeatures = ['database operations', 'data persistence', 'transactions', 'data integrity'];
      context.excludedFeatures = ['UI interactions', 'external API calls'];
      context.description = 'Database integration test file';
    } else if (lowerFileName.includes('service') || lowerFilePath.includes('service')) {
      context.type = 'service';
      context.expectedFeatures = ['service layer logic', 'business rules', 'external service integration'];
      context.excludedFeatures = ['UI interactions', 'direct database access'];
      context.description = 'Service layer integration test file';
    } else if (lowerFileName.includes('workflow') || lowerFilePath.includes('workflow')) {
      context.type = 'workflow';
      context.expectedFeatures = ['workflow execution', 'step processing', 'state management'];
      context.excludedFeatures = ['UI interactions'];
      context.description = 'Workflow integration test file';
    } else if (lowerFileName.includes('connection') || lowerFilePath.includes('connection')) {
      context.type = 'connection';
      context.expectedFeatures = ['API connection management', 'OAuth2 flows', 'credential handling'];
      context.excludedFeatures = ['UI interactions'];
      context.description = 'Connection integration test file';
    } else if (lowerFileName.includes('secret') || lowerFilePath.includes('secret')) {
      context.type = 'secrets';
      context.expectedFeatures = ['secrets management', 'encryption', 'vault operations'];
      context.excludedFeatures = ['UI interactions'];
      context.description = 'Secrets integration test file';
    } else {
      context.type = 'general';
      context.expectedFeatures = ['API testing', 'database operations'];
      context.excludedFeatures = ['UI interactions'];
      context.description = 'General integration test file';
    }

    return context;
  }

  /**
   * Main evaluation function
   */
  async evaluateTestFile(testFilePath) {
    console.log(`🔍 Evaluating: ${testFilePath}`);
    
    if (!fs.existsSync(testFilePath)) {
      console.error(`❌ Test file not found: ${testFilePath}`);
      return;
    }

    const content = fs.readFileSync(testFilePath, 'utf8');
    const fileName = path.basename(testFilePath);
    
    // Detect test context
    const testContext = this.detectTestContext(fileName, testFilePath, content);
    
    this.results[fileName] = {
      filePath: testFilePath,
      context: testContext,
      compliance: {},
      issues: [],
      recommendations: [],
      score: 0
    };

    console.log(`📋 Test Context: ${testContext.description} (${testContext.type})`);

    // Evaluate against each criteria
    await this.evaluateAPITesting(fileName, content, testContext);
    await this.evaluateDatabaseIntegration(fileName, content, testContext);
    await this.evaluateServiceLayerTesting(fileName, content, testContext);
    await this.evaluateAuthenticationTesting(fileName, content, testContext);
    await this.evaluateErrorHandling(fileName, content, testContext);
    await this.evaluatePerformanceTesting(fileName, content, testContext);
    await this.evaluateSecurityTesting(fileName, content, testContext);
    await this.evaluateTestDataManagement(fileName, content, testContext);
    await this.evaluateTestIsolation(fileName, content, testContext);
    await this.evaluateDocumentationCompliance(fileName, content, testContext);

    // Calculate overall score
    this.calculateOverallScore(fileName);
    
    // Generate recommendations
    this.generateRecommendations(fileName);
    
    return this.results[fileName];
  }

  /**
   * Evaluate API Testing best practices
   */
  async evaluateAPITesting(fileName, content, context) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // API endpoint testing
    const hasEndpointTesting = /\.get\(|\.post\(|\.put\(|\.delete\(|\.patch\(|request\.|fetch\(|axios\.|superagent\.|got\./.test(content);
    if (hasEndpointTesting) {
      result.compliant.push('✅ Tests API endpoints');
    } else {
      result.nonCompliant.push('❌ Missing API endpoint testing');
      this.addTodo(fileName, 'P0', 'Add API endpoint testing', 
        `// TODO: Add API endpoint testing to ${fileName}
// - Test all HTTP methods (GET, POST, PUT, DELETE, PATCH)
// - Test request/response validation
// - Test HTTP status codes
// - Test response body structure`);
    }

    // Response validation
    const hasResponseValidation = /expect.*status|expect.*json|expect.*body|expect.*headers|response.*validation/.test(content);
    if (hasResponseValidation) {
      result.compliant.push('✅ Validates API responses');
    } else {
      result.nonCompliant.push('❌ Missing response validation');
      this.addTodo(fileName, 'P0', 'Add response validation', 
        `// TODO: Add response validation to ${fileName}
// - Validate HTTP status codes
// - Validate response body structure
// - Validate response headers
// - Validate data types and formats`);
    }

    // Error handling
    const hasErrorHandling = /error.*status|4\d\d|5\d\d|error.*response|exception.*handling/.test(content);
    if (hasErrorHandling) {
      result.compliant.push('✅ Tests error scenarios');
    } else {
      result.nonCompliant.push('❌ Missing error scenario testing');
      this.addTodo(fileName, 'P0', 'Add error scenario testing', 
        `// TODO: Add error scenario testing to ${fileName}
// - Test 4xx error responses
// - Test 5xx error responses
// - Test validation errors
// - Test authentication errors`);
    }

    // Request validation
    const hasRequestValidation = /invalid.*request|malformed.*request|request.*validation/.test(content);
    if (hasRequestValidation) {
      result.compliant.push('✅ Tests request validation');
    } else {
      result.nonCompliant.push('❌ Missing request validation testing');
      this.addTodo(fileName, 'P1', 'Add request validation testing', 
        `// TODO: Add request validation testing to ${fileName}
// - Test invalid request bodies
// - Test missing required fields
// - Test malformed JSON
// - Test invalid data types`);
    }

    // Authentication in API calls
    const hasAuthInAPI = /authorization.*header|bearer.*token|api.*key|auth.*header/.test(content);
    if (hasAuthInAPI) {
      result.compliant.push('✅ Tests authentication in API calls');
    } else {
      result.nonCompliant.push('❌ Missing authentication testing in API calls');
      this.addTodo(fileName, 'P0', 'Add authentication testing in API calls', 
        `// TODO: Add authentication testing in API calls to ${fileName}
// - Test with valid authentication tokens
// - Test with invalid/expired tokens
// - Test without authentication
// - Test different user roles and permissions`);
    }

    result.score = (hasEndpointTesting ? 0.25 : 0) + 
                   (hasResponseValidation ? 0.25 : 0) + 
                   (hasErrorHandling ? 0.2 : 0) + 
                   (hasRequestValidation ? 0.15 : 0) + 
                   (hasAuthInAPI ? 0.15 : 0);

    this.results[fileName].compliance.apiTesting = result;
  }

  /**
   * Evaluate Database Integration Testing
   */
  async evaluateDatabaseIntegration(fileName, content, context) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Database operations testing
    const hasDatabaseOps = /prisma\.|database\.|create\(|update\(|delete\(|findMany\(|findUnique\(/.test(content);
    if (hasDatabaseOps) {
      result.compliant.push('✅ Tests database operations');
    } else {
      result.nonCompliant.push('❌ Missing database operations testing');
      this.addTodo(fileName, 'P0', 'Add database operations testing', 
        `// TODO: Add database operations testing to ${fileName}
// - Test CRUD operations
// - Test database queries
// - Test data persistence
// - Test data retrieval`);
    }

    // Transaction testing
    const hasTransactionTesting = /transaction|beginTransaction|commit|rollback/.test(content);
    if (hasTransactionTesting) {
      result.compliant.push('✅ Tests database transactions');
    } else {
      result.nonCompliant.push('❌ Missing transaction testing');
      this.addTodo(fileName, 'P1', 'Add transaction testing', 
        `// TODO: Add transaction testing to ${fileName}
// - Test transaction rollback on errors
// - Test transaction commit on success
// - Test data consistency across transactions
// - Test concurrent transaction handling`);
    }

    // Data integrity testing
    const hasDataIntegrity = /constraint|foreign.*key|unique.*constraint|data.*integrity/.test(content);
    if (hasDataIntegrity) {
      result.compliant.push('✅ Tests data integrity');
    } else {
      result.nonCompliant.push('❌ Missing data integrity testing');
      this.addTodo(fileName, 'P1', 'Add data integrity testing', 
        `// TODO: Add data integrity testing to ${fileName}
// - Test foreign key constraints
// - Test unique constraints
// - Test data validation rules
// - Test referential integrity`);
    }

    // Database cleanup
    const hasDatabaseCleanup = /deleteMany|truncate|cleanup|teardown|afterEach.*clean/.test(content);
    if (hasDatabaseCleanup) {
      result.compliant.push('✅ Has proper database cleanup');
    } else {
      result.nonCompliant.push('❌ Missing database cleanup');
      this.addTodo(fileName, 'P0', 'Add database cleanup', 
        `// TODO: Add database cleanup to ${fileName}
// test.afterEach(async () => {
//   await prisma.user.deleteMany({ where: { email: { contains: 'test-' } } });
//   await prisma.connection.deleteMany({ where: { name: { contains: 'Test' } } });
//   await prisma.workflow.deleteMany({ where: { name: { contains: 'Test' } } });
// });`);
    }

    result.score = (hasDatabaseOps ? 0.3 : 0) + 
                   (hasTransactionTesting ? 0.25 : 0) + 
                   (hasDataIntegrity ? 0.25 : 0) + 
                   (hasDatabaseCleanup ? 0.2 : 0);

    this.results[fileName].compliance.databaseIntegration = result;
  }

  /**
   * Evaluate Service Layer Testing
   */
  async evaluateServiceLayerTesting(fileName, content, context) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Service method testing
    const hasServiceTesting = /service\.|Service\.|business.*logic|service.*method/.test(content);
    if (hasServiceTesting) {
      result.compliant.push('✅ Tests service layer methods');
    } else {
      result.nonCompliant.push('❌ Missing service layer testing');
      this.addTodo(fileName, 'P0', 'Add service layer testing', 
        `// TODO: Add service layer testing to ${fileName}
// - Test business logic methods
// - Test service layer functions
// - Test data processing logic
// - Test business rules validation`);
    }

    // External service integration
    const hasExternalServiceTesting = /external.*api|third.*party|integration.*test|mock.*external/.test(content);
    if (hasExternalServiceTesting) {
      result.compliant.push('✅ Tests external service integration');
    } else {
      result.nonCompliant.push('❌ Missing external service integration testing');
      this.addTodo(fileName, 'P1', 'Add external service integration testing', 
        `// TODO: Add external service integration testing to ${fileName}
// - Test third-party API integrations
// - Test external service responses
// - Test integration error handling
// - Test service availability scenarios`);
    }

    // Business logic validation
    const hasBusinessLogicValidation = /business.*rule|validation.*logic|workflow.*logic/.test(content);
    if (hasBusinessLogicValidation) {
      result.compliant.push('✅ Tests business logic validation');
    } else {
      result.nonCompliant.push('❌ Missing business logic validation');
      this.addTodo(fileName, 'P0', 'Add business logic validation', 
        `// TODO: Add business logic validation to ${fileName}
// - Test business rules enforcement
// - Test workflow logic
// - Test data validation rules
// - Test business constraints`);
    }

    result.score = (hasServiceTesting ? 0.4 : 0) + 
                   (hasExternalServiceTesting ? 0.3 : 0) + 
                   (hasBusinessLogicValidation ? 0.3 : 0);

    this.results[fileName].compliance.serviceLayerTesting = result;
  }

  /**
   * Evaluate Authentication Testing
   */
  async evaluateAuthenticationTesting(fileName, content, context) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // JWT testing
    const hasJWTTesting = /jwt|token.*validation|bearer.*token/.test(content);
    if (hasJWTTesting) {
      result.compliant.push('✅ Tests JWT authentication');
    } else {
      result.nonCompliant.push('❌ Missing JWT testing');
      this.addTodo(fileName, 'P0', 'Add JWT testing', 
        `// TODO: Add JWT testing to ${fileName}
// - Test JWT token validation
// - Test token expiration
// - Test invalid token handling
// - Test token refresh logic`);
    }

    // Cookie-based authentication
    const hasCookieAuth = /cookie.*auth|cookie.*session|httpOnly.*cookie/.test(content);
    if (hasCookieAuth) {
      result.compliant.push('✅ Tests cookie-based authentication');
    } else {
      result.nonCompliant.push('❌ Missing cookie-based authentication testing');
      this.addTodo(fileName, 'P0', 'Add cookie-based authentication testing', 
        `// TODO: Add cookie-based authentication testing to ${fileName}
// - Test HTTP-only cookie authentication
// - Test secure cookie settings
// - Test cookie expiration
// - Test session management via cookies`);
    }

    // Role-based access control
    const hasRBACTesting = /role.*based|permission.*check|authorization.*test|user.*role/.test(content);
    if (hasRBACTesting) {
      result.compliant.push('✅ Tests role-based access control');
    } else {
      result.nonCompliant.push('❌ Missing RBAC testing');
      this.addTodo(fileName, 'P1', 'Add RBAC testing', 
        `// TODO: Add RBAC testing to ${fileName}
// - Test different user roles
// - Test permission checks
// - Test access control enforcement
// - Test unauthorized access scenarios`);
    }

    // OAuth2 testing
    const hasOAuth2Testing = /oauth2|oauth.*flow|sso.*test/.test(content);
    if (hasOAuth2Testing) {
      result.compliant.push('✅ Tests OAuth2 flows');
    } else {
      result.nonCompliant.push('❌ Missing OAuth2 testing');
      this.addTodo(fileName, 'P1', 'Add OAuth2 testing', 
        `// TODO: Add OAuth2 testing to ${fileName}
// - Test OAuth2 authorization flow
// - Test token exchange
// - Test refresh token logic
// - Test OAuth2 error scenarios`);
    }

    result.score = (hasJWTTesting ? 0.3 : 0) + 
                   (hasCookieAuth ? 0.3 : 0) + 
                   (hasRBACTesting ? 0.2 : 0) + 
                   (hasOAuth2Testing ? 0.2 : 0);

    this.results[fileName].compliance.authenticationTesting = result;
  }

  /**
   * Evaluate Error Handling
   */
  async evaluateErrorHandling(fileName, content, context) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Network error handling
    const hasNetworkErrorHandling = /network.*error|timeout.*error|connection.*error/.test(content);
    if (hasNetworkErrorHandling) {
      result.compliant.push('✅ Tests network error handling');
    } else {
      result.nonCompliant.push('❌ Missing network error handling');
      this.addTodo(fileName, 'P1', 'Add network error handling', 
        `// TODO: Add network error handling to ${fileName}
// - Test network timeouts
// - Test connection failures
// - Test retry mechanisms
// - Test fallback strategies`);
    }

    // Validation error handling
    const hasValidationErrorHandling = /validation.*error|invalid.*input|error.*message/.test(content);
    if (hasValidationErrorHandling) {
      result.compliant.push('✅ Tests validation error handling');
    } else {
      result.nonCompliant.push('❌ Missing validation error handling');
      this.addTodo(fileName, 'P0', 'Add validation error handling', 
        `// TODO: Add validation error handling to ${fileName}
// - Test input validation errors
// - Test error message accuracy
// - Test error response format
// - Test error recovery scenarios`);
    }

    // Database error handling
    const hasDatabaseErrorHandling = /database.*error|sql.*error|constraint.*error/.test(content);
    if (hasDatabaseErrorHandling) {
      result.compliant.push('✅ Tests database error handling');
    } else {
      result.nonCompliant.push('❌ Missing database error handling');
      this.addTodo(fileName, 'P1', 'Add database error handling', 
        `// TODO: Add database error handling to ${fileName}
// - Test database constraint violations
// - Test connection failures
// - Test transaction rollbacks
// - Test data integrity errors`);
    }

    result.score = (hasNetworkErrorHandling ? 0.4 : 0) + 
                   (hasValidationErrorHandling ? 0.4 : 0) + 
                   (hasDatabaseErrorHandling ? 0.2 : 0);

    this.results[fileName].compliance.errorHandling = result;
  }

  /**
   * Evaluate Performance Testing
   */
  async evaluatePerformanceTesting(fileName, content, context) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Response time testing
    const hasResponseTimeTesting = /response.*time|performance.*test|timeout.*test/.test(content);
    if (hasResponseTimeTesting) {
      result.compliant.push('✅ Tests response times');
    } else {
      result.nonCompliant.push('❌ Missing response time testing');
      this.addTodo(fileName, 'P1', 'Add response time testing', 
        `// TODO: Add response time testing to ${fileName}
// - Test API response times
// - Test database query performance
// - Test timeout scenarios
// - Test performance thresholds`);
    }

    // Load testing
    const hasLoadTesting = /load.*test|concurrent.*request|stress.*test/.test(content);
    if (hasLoadTesting) {
      result.compliant.push('✅ Tests load scenarios');
    } else {
      result.nonCompliant.push('❌ Missing load testing');
      this.addTodo(fileName, 'P2', 'Add load testing', 
        `// TODO: Add load testing to ${fileName}
// - Test concurrent requests
// - Test system under load
// - Test performance degradation
// - Test resource usage patterns`);
    }

    result.score = (hasResponseTimeTesting ? 0.6 : 0) + 
                   (hasLoadTesting ? 0.4 : 0);

    this.results[fileName].compliance.performanceTesting = result;
  }

  /**
   * Evaluate Security Testing
   */
  async evaluateSecurityTesting(fileName, content, context) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Input validation testing
    const hasInputValidation = /input.*validation|sql.*injection|xss.*prevention/.test(content);
    if (hasInputValidation) {
      result.compliant.push('✅ Tests input validation');
    } else {
      result.nonCompliant.push('❌ Missing input validation testing');
      this.addTodo(fileName, 'P0', 'Add input validation testing', 
        `// TODO: Add input validation testing to ${fileName}
// - Test SQL injection prevention
// - Test XSS prevention
// - Test input sanitization
// - Test malicious input handling`);
    }

    // Authorization testing
    const hasAuthorizationTesting = /unauthorized.*access|permission.*denied|access.*control/.test(content);
    if (hasAuthorizationTesting) {
      result.compliant.push('✅ Tests authorization');
    } else {
      result.nonCompliant.push('❌ Missing authorization testing');
      this.addTodo(fileName, 'P0', 'Add authorization testing', 
        `// TODO: Add authorization testing to ${fileName}
// - Test unauthorized access attempts
// - Test permission boundary enforcement
// - Test access control validation
// - Test privilege escalation prevention`);
    }

    // Data exposure testing
    const hasDataExposureTesting = /data.*exposure|sensitive.*data|privacy.*leak/.test(content);
    if (hasDataExposureTesting) {
      result.compliant.push('✅ Tests data exposure prevention');
    } else {
      result.nonCompliant.push('❌ Missing data exposure testing');
      this.addTodo(fileName, 'P1', 'Add data exposure testing', 
        `// TODO: Add data exposure testing to ${fileName}
// - Test sensitive data handling
// - Test data encryption
// - Test privacy protection
// - Test information disclosure prevention`);
    }

    result.score = (hasInputValidation ? 0.4 : 0) + 
                   (hasAuthorizationTesting ? 0.4 : 0) + 
                   (hasDataExposureTesting ? 0.2 : 0);

    this.results[fileName].compliance.securityTesting = result;
  }

  /**
   * Evaluate Test Data Management
   */
  async evaluateTestDataManagement(fileName, content, context) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Test data setup
    const hasTestDataSetup = /createTestData|setupTestData|fixture|seed.*data/.test(content);
    if (hasTestDataSetup) {
      result.compliant.push('✅ Has proper test data setup');
    } else {
      result.nonCompliant.push('❌ Missing test data setup');
      this.addTodo(fileName, 'P0', 'Add test data setup', 
        `// TODO: Add test data setup to ${fileName}
// test.beforeEach(async () => {
//   const testUser = await createTestUser();
//   const testConnection = await createTestConnection(testUser.id);
//   const testWorkflow = await createTestWorkflow(testUser.id);
// });`);
    }

    // Test data cleanup
    const hasTestDataCleanup = /cleanupTestData|deleteMany|truncate|afterEach.*clean/.test(content);
    if (hasTestDataCleanup) {
      result.compliant.push('✅ Has proper test data cleanup');
    } else {
      result.nonCompliant.push('❌ Missing test data cleanup');
      this.addTodo(fileName, 'P0', 'Add test data cleanup', 
        `// TODO: Add test data cleanup to ${fileName}
// test.afterEach(async () => {
//   await cleanupTestData();
//   await prisma.user.deleteMany({ where: { email: { contains: 'test-' } } });
//   await prisma.connection.deleteMany({ where: { name: { contains: 'Test' } } });
// });`);
    }

    // Deterministic test data
    const hasDeterministicData = /unique.*id|timestamp|uuid|deterministic.*data/.test(content);
    if (hasDeterministicData) {
      result.compliant.push('✅ Uses deterministic test data');
    } else {
      result.nonCompliant.push('❌ Missing deterministic test data');
      this.addTodo(fileName, 'P1', 'Add deterministic test data', 
        `// TODO: Add deterministic test data to ${fileName}
// - Use unique identifiers for test data
// - Use timestamps to avoid conflicts
// - Ensure test data isolation
// - Example: const testId = \`test-\${Date.now()}\`;`);
    }

    result.score = (hasTestDataSetup ? 0.4 : 0) + 
                   (hasTestDataCleanup ? 0.4 : 0) + 
                   (hasDeterministicData ? 0.2 : 0);

    this.results[fileName].compliance.testDataManagement = result;
  }

  /**
   * Evaluate Test Isolation
   */
  async evaluateTestIsolation(fileName, content, context) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Test isolation setup
    const hasTestIsolation = /beforeEach|afterEach|beforeAll|afterAll|isolated.*test/.test(content);
    if (hasTestIsolation) {
      result.compliant.push('✅ Has proper test isolation');
    } else {
      result.nonCompliant.push('❌ Missing test isolation');
      this.addTodo(fileName, 'P0', 'Add test isolation', 
        `// TODO: Add test isolation to ${fileName}
// test.beforeEach(async () => {
//   // Setup isolated test environment
// });
// 
// test.afterEach(async () => {
//   // Clean up test environment
// });`);
    }

    // Independent tests
    const hasIndependentTests = /independent.*test|no.*shared.*state|isolated.*execution/.test(content);
    if (hasIndependentTests) {
      result.compliant.push('✅ Tests are independent');
    } else {
      result.nonCompliant.push('❌ Tests may have dependencies');
      this.addTodo(fileName, 'P1', 'Ensure test independence', 
        `// TODO: Ensure test independence in ${fileName}
// - Each test should be able to run in isolation
// - No dependencies on other test execution order
// - Clean state before and after each test
// - Use unique identifiers for all test data`);
    }

    result.score = (hasTestIsolation ? 0.6 : 0) + 
                   (hasIndependentTests ? 0.4 : 0);

    this.results[fileName].compliance.testIsolation = result;
  }

  /**
   * Evaluate Documentation Compliance
   */
  async evaluateDocumentationCompliance(fileName, content, context) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Clear test descriptions
    const hasClearDescriptions = /should.*test|should.*validate|should.*complete|test.*description/.test(content);
    if (hasClearDescriptions) {
      result.compliant.push('✅ Has clear test descriptions');
    } else {
      result.nonCompliant.push('❌ Missing clear test descriptions');
      this.addTodo(fileName, 'P1', 'Add clear test descriptions', 
        `// TODO: Add clear test descriptions to ${fileName}
// - Use descriptive test names
// - Include context about what is being tested
// - Document expected outcomes
// - Reference relevant documentation`);
    }

    // Documentation references
    const hasDocReferences = /docs\/|documentation|api.*doc|integration.*guide/.test(content);
    if (hasDocReferences) {
      result.compliant.push('✅ References documentation');
    } else {
      result.nonCompliant.push('❌ Missing documentation references');
      this.addTodo(fileName, 'P2', 'Add documentation references', 
        `// TODO: Add documentation references to ${fileName}
// - Reference API documentation
// - Reference integration guides
// - Include links to relevant docs
// - Document test assumptions`);
    }

    result.score = (hasClearDescriptions ? 0.6 : 0) + 
                   (hasDocReferences ? 0.4 : 0);

    this.results[fileName].compliance.documentationCompliance = result;
  }

  /**
   * Calculate overall compliance score
   */
  calculateOverallScore(fileName) {
    const compliance = this.results[fileName].compliance;
    let totalScore = 0;

    Object.keys(CRITERIA_WEIGHTS).forEach(criteria => {
      if (compliance[criteria]) {
        totalScore += compliance[criteria].score * CRITERIA_WEIGHTS[criteria];
      }
    });

    this.results[fileName].score = Math.round(totalScore * 100);
  }

  /**
   * Generate priority recommendations
   */
  generateRecommendations(fileName) {
    const result = this.results[fileName];
    const recommendations = [];

    // P0 (Critical) recommendations
    const p0Issues = this.todos.filter(todo => todo.file === fileName && todo.priority === 'P0');
    if (p0Issues.length > 0) {
      recommendations.push('🚨 **P0 (Critical) Issues:**');
      p0Issues.forEach(issue => {
        recommendations.push(`- ${issue.description}`);
      });
    }

    // P1 (High) recommendations
    const p1Issues = this.todos.filter(todo => todo.file === fileName && todo.priority === 'P1');
    if (p1Issues.length > 0) {
      recommendations.push('⚠️ **P1 (High) Issues:**');
      p1Issues.forEach(issue => {
        recommendations.push(`- ${issue.description}`);
      });
    }

    // P2 (Medium) recommendations
    const p2Issues = this.todos.filter(todo => todo.file === fileName && todo.priority === 'P2');
    if (p2Issues.length > 0) {
      recommendations.push('📝 **P2 (Medium) Issues:**');
      p2Issues.forEach(issue => {
        recommendations.push(`- ${issue.description}`);
      });
    }

    result.recommendations = recommendations;
  }

  /**
   * Add TODO item
   */
  addTodo(file, priority, description, code) {
    const existingTodo = this.todos.find(todo => 
      todo.file === file && 
      todo.description.toLowerCase().includes(description.toLowerCase().split(' ').slice(0, 3).join(' '))
    );
    
    if (!existingTodo) {
      this.todos.push({
        file,
        priority,
        description,
        code
      });
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('\n📊 Integration Test Evaluation Report');
    console.log('=' .repeat(50));

    Object.keys(this.results).forEach(fileName => {
      const result = this.results[fileName];
      
      console.log(`\n📁 ${fileName}`);
      console.log(`📋 Test Context: ${result.context.description} (${result.context.type})`);
      console.log(`📊 Overall Compliance Score: ${result.score}%`);
      
      // Show compliance breakdown
      Object.keys(result.compliance).forEach(criteria => {
        const compliance = result.compliance[criteria];
        console.log(`  ${criteria}: ${Math.round(compliance.score * 100)}%`);
      });

      // Show recommendations
      if (result.recommendations.length > 0) {
        console.log('\n🎯 Priority Recommendations:');
        result.recommendations.forEach(rec => {
          console.log(`  ${rec}`);
        });
      }

      console.log('\n' + '-'.repeat(50));
    });

    // Summary statistics
    const totalFiles = Object.keys(this.results).length;
    const avgScore = Object.values(this.results).reduce((sum, result) => sum + result.score, 0) / totalFiles;
    const p0Todos = this.todos.filter(todo => todo.priority === 'P0').length;
    const p1Todos = this.todos.filter(todo => todo.priority === 'P1').length;
    const p2Todos = this.todos.filter(todo => todo.priority === 'P2').length;

    console.log('\n📈 Summary Statistics:');
    console.log(`  Total Files Evaluated: ${totalFiles}`);
    console.log(`  Average Compliance Score: ${Math.round(avgScore)}%`);
    console.log(`  P0 (Critical) TODOs: ${p0Todos}`);
    console.log(`  P1 (High) TODOs: ${p1Todos}`);
    console.log(`  P2 (Medium) TODOs: ${p2Todos}`);
    console.log(`  Total TODOs: ${this.todos.length}`);
  }

  /**
   * Evaluate all integration test files
   */
  async evaluateAllTests() {
    console.log('🔍 Evaluating all integration test files...');
    
    const testFiles = this.findTestFiles(TEST_DIR);
    
    for (const testFile of testFiles) {
      await this.evaluateTestFile(testFile);
    }
    
    this.generateReport();
  }

  /**
   * Find all test files in the given directory
   */
  findTestFiles(dir) {
    const testFiles = [];
    
    if (!fs.existsSync(dir)) {
      return testFiles;
    }

    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        testFiles.push(...this.findTestFiles(fullPath));
      } else if (item.endsWith('.test.ts') || item.endsWith('.test.js')) {
        testFiles.push(fullPath);
      }
    }
    
    return testFiles;
  }
}

// Main execution
async function main() {
  const evaluator = new IntegrationTestEvaluator();
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Evaluate all test files
    await evaluator.evaluateAllTests();
  } else {
    // Evaluate specific test file
    const testFilePath = args[0];
    await evaluator.evaluateTestFile(testFilePath);
    evaluator.generateReport();
  }
}

// Run the evaluator
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { IntegrationTestEvaluator };