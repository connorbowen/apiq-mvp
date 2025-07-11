#!/usr/bin/env node

/**
 * Integration Test Evaluation Tool
 * 
 * This tool evaluates integration test files against the project's documentation standards:
 * - API testing coverage (endpoints, cookie-based authentication, error handling)
 * - Database integration testing (real database operations, transactions)
 * - Service layer testing (business logic, external service integration)
 * - Authentication & authorization testing (cookie-based sessions)
 * - Error handling and edge cases
 * - Performance and load testing
 * - Security testing (input validation, data protection)
 * - Proper separation from E2E tests (no UI testing)
 * - Cookie-based Authentication (HTTP-only cookies, secure session management)
 * 
 * Usage: node scripts/evaluate-integration-tests.js [test-file-path]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const TEST_DIR = 'tests/integration';
const DOCS_DIR = 'docs';
const SRC_DIR = 'src';

// Evaluation criteria weights
const CRITERIA_WEIGHTS = {
  apiTesting: 0.13,           // API endpoint testing
  databaseIntegration: 0.12,  // Database operations and transactions
  serviceLayer: 0.12,         // Service layer and business logic
  authentication: 0.12,       // Auth flows and authorization (increased for OAuth2 focus)
  workflowEngine: 0.10,       // Workflow execution engine testing
  errorHandling: 0.08,        // Error scenarios and edge cases
  performance: 0.06,          // Performance and load testing
  security: 0.10,             // Security validation
  codeQuality: 0.08,          // Code quality and standards compliance
  apiStandards: 0.07,         // API development standards
  developmentWorkflow: 0.03,  // Development workflow compliance
  complianceAudit: 0.03       // Compliance and audit requirements
};

class IntegrationTestEvaluator {
  constructor() {
    this.results = {};
    this.todos = [];
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
    
    this.results[fileName] = {
      filePath: testFilePath,
      compliance: {},
      issues: [],
      recommendations: [],
      score: 0
    };

    // Evaluate against each criteria
    await this.evaluateAPITesting(fileName, content);
    await this.evaluateDatabaseIntegration(fileName, content);
    await this.evaluateServiceLayer(fileName, content);
    await this.evaluateAuthentication(fileName, content);
    await this.evaluateWorkflowEngine(fileName, content);
    await this.evaluateErrorHandling(fileName, content);
    await this.evaluatePerformance(fileName, content);
    await this.evaluateSecurity(fileName, content);
    await this.evaluateCodeQuality(fileName, content);
    await this.evaluateAPIStandards(fileName, content);
    await this.evaluateDevelopmentWorkflow(fileName, content);

    // Calculate overall score
    this.calculateOverallScore(fileName);
    
    // Generate recommendations
    this.generateRecommendations(fileName);
    
    return this.results[fileName];
  }

  /**
   * Evaluate API Testing Coverage
   */
  async evaluateAPITesting(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for API endpoint testing patterns
    const apiTestingPatterns = [
      /request\.post|request\.get|request\.put|request\.delete|request\.patch/,
      /fetch\(|axios\.|superagent\.|got\.|node-fetch/,
      /\.post\(.*\/api\//,
      /\.get\(.*\/api\//,
      /\.put\(.*\/api\//,
      /\.delete\(.*\/api\//,
      /\.patch\(.*\/api\//
    ];

    let apiTestingScore = 0;
    apiTestingPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        apiTestingScore++;
      }
    });

    if (apiTestingScore >= 3) {
      result.compliant.push('✅ Comprehensive API endpoint testing');
    } else if (apiTestingScore >= 1) {
      result.compliant.push('⚠️ Some API endpoint testing, but could be more comprehensive');
    } else {
      result.nonCompliant.push('❌ Missing API endpoint testing');
      this.addTodo(fileName, 'P0', 'Add comprehensive API endpoint testing', 
        `// TODO: Add comprehensive API endpoint testing to ${fileName}
// - Test all HTTP methods (GET, POST, PUT, DELETE, PATCH)
// - Test API endpoints with proper authentication
// - Test API response formats and status codes
// - Test API error handling and validation
// 
// Example patterns:
// const response = await request.post('/api/connections', { data: {...} });
// const response = await request.get('/api/connections');
// expect(response.status()).toBe(200);
// expect(response.json()).toHaveProperty('data');`);
    }

    // Check for HTTP status code testing
    const hasStatusCodeTesting = /status.*200|status.*201|status.*400|status.*401|status.*403|status.*404|status.*500/.test(content);
    if (hasStatusCodeTesting) {
      result.compliant.push('✅ Tests HTTP status codes');
    } else {
      result.nonCompliant.push('❌ Missing HTTP status code testing');
      this.addTodo(fileName, 'P1', 'Add HTTP status code testing', 
        `// TODO: Add HTTP status code testing to ${fileName}
// - Test successful responses (200, 201)
// - Test error responses (400, 401, 403, 404, 500)
// - Test validation error responses
// - Test authentication error responses`);
    }

    // Check for response validation
    const hasResponseValidation = /expect.*json|expect.*data|expect.*property|expect.*toHaveProperty/.test(content);
    if (hasResponseValidation) {
      result.compliant.push('✅ Validates API responses');
    } else {
      result.nonCompliant.push('❌ Missing API response validation');
      this.addTodo(fileName, 'P1', 'Add API response validation', 
        `// TODO: Add API response validation to ${fileName}
// - Validate response structure and format
// - Validate response data types
// - Validate required fields in responses
// - Validate error message formats`);
    }

    // Check for request payload testing
    const hasRequestPayloadTesting = /data.*{|body.*{|payload.*{|request.*data/.test(content);
    if (hasRequestPayloadTesting) {
      result.compliant.push('✅ Tests request payloads');
    } else {
      result.nonCompliant.push('❌ Missing request payload testing');
      this.addTodo(fileName, 'P1', 'Add request payload testing', 
        `// TODO: Add request payload testing to ${fileName}
// - Test different request payload formats
// - Test required vs optional fields
// - Test payload validation
// - Test malformed payload handling`);
    }

    // Check for query parameter testing
    const hasQueryParamTesting = /query.*{|params.*{|search.*{|filter.*{|sort.*{/.test(content);
    if (hasQueryParamTesting) {
      result.compliant.push('✅ Tests query parameters');
    } else {
      result.nonCompliant.push('❌ Missing query parameter testing');
      this.addTodo(fileName, 'P2', 'Add query parameter testing', 
        `// TODO: Add query parameter testing to ${fileName}
// - Test pagination parameters
// - Test filtering parameters
// - Test sorting parameters
// - Test search parameters`);
    }

    // Calculate score
    let score = 0;
    if (apiTestingScore >= 3) score += 0.4;
    else if (apiTestingScore >= 1) score += 0.2;
    if (hasStatusCodeTesting) score += 0.2;
    if (hasResponseValidation) score += 0.2;
    if (hasRequestPayloadTesting) score += 0.1;
    if (hasQueryParamTesting) score += 0.1;

    result.score = Math.min(1, score);
    this.results[fileName].compliance.apiTesting = result;
  }

  /**
   * Evaluate Database Integration Testing
   */
  async evaluateDatabaseIntegration(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for database operations
    const hasDatabaseOps = /prisma\.|database\.|create|update|delete|find|query/.test(content);
    if (hasDatabaseOps) {
      result.compliant.push('✅ Tests database operations');
    } else {
      result.nonCompliant.push('❌ Missing database operation testing');
      this.addTodo(fileName, 'P0', 'Add database operation testing', 
        `// TODO: Add database operation testing to ${fileName}
// - Test database create operations
// - Test database read operations
// - Test database update operations
// - Test database delete operations
// - Test database transactions`);
    }

    // Check for transaction testing
    const hasTransactionTesting = /transaction|beginTransaction|commit|rollback/.test(content);
    if (hasTransactionTesting) {
      result.compliant.push('✅ Tests database transactions');
    } else {
      result.nonCompliant.push('❌ Missing database transaction testing');
      this.addTodo(fileName, 'P1', 'Add database transaction testing', 
        `// TODO: Add database transaction testing to ${fileName}
// - Test transaction rollback on errors
// - Test transaction commit on success
// - Test concurrent transaction handling
// - Test transaction isolation levels`);
    }

    // Check for data cleanup
    const hasDataCleanup = /deleteMany|cleanup|teardown|afterEach.*delete/.test(content);
    if (hasDataCleanup) {
      result.compliant.push('✅ Has proper data cleanup');
    } else {
      result.nonCompliant.push('❌ Missing data cleanup');
      this.addTodo(fileName, 'P0', 'Add data cleanup', 
        `// TODO: Add data cleanup to ${fileName}
// test.afterEach(async () => {
//   await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
//   await prisma.connection.deleteMany({ where: { name: { contains: 'Test' } } });
// });`);
    }

    // Check for data integrity testing
    const hasDataIntegrity = /integrity|constraint|foreign.*key|unique.*constraint/.test(content);
    if (hasDataIntegrity) {
      result.compliant.push('✅ Tests data integrity constraints');
    } else {
      result.nonCompliant.push('❌ Missing data integrity testing');
      this.addTodo(fileName, 'P1', 'Add data integrity testing', 
        `// TODO: Add data integrity testing to ${fileName}
// - Test foreign key constraints
// - Test unique constraints
// - Test required field constraints
// - Test data validation rules`);
    }

    // Check for real database usage (no mocking)
    const hasRealDatabase = !content.includes('mock') && !content.includes('jest.mock') && 
                           !content.includes('vi.mock') && !content.includes('cy.stub');
    if (hasRealDatabase) {
      result.compliant.push('✅ Uses real database (no mocking)');
    } else {
      result.nonCompliant.push('❌ Uses mocked database (violates integration testing principles)');
      this.addTodo(fileName, 'P0', 'Replace mocked database with real database', 
        `// TODO: Replace mocked database with real database in ${fileName}
// Integration tests should use real database operations
// - Remove all jest.mock() calls for database
// - Use real Prisma client
// - Use test database with real schema
// - Test actual database behavior`);
    }

    // Calculate score
    let score = 0;
    if (hasDatabaseOps) score += 0.3;
    if (hasTransactionTesting) score += 0.2;
    if (hasDataCleanup) score += 0.2;
    if (hasDataIntegrity) score += 0.15;
    if (hasRealDatabase) score += 0.15;

    result.score = Math.min(1, score);
    this.results[fileName].compliance.databaseIntegration = result;
  }

  /**
   * Evaluate Service Layer Testing
   */
  async evaluateServiceLayer(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for API connection service testing
    const hasAPIConnectionTesting = /api.*connection|connection.*service|openapi.*integration/.test(content);
    if (hasAPIConnectionTesting) {
      result.compliant.push('✅ Tests API connection service layer');
    } else {
      result.nonCompliant.push('❌ Missing API connection service testing');
      this.addTodo(fileName, 'P0', 'Add API connection service testing', 
        `// TODO: Add API connection service testing to ${fileName}
// - Test API connection creation and management
// - Test OpenAPI specification parsing
// - Test endpoint discovery and validation
// - Test connection health monitoring`);
    }

    // Check for secrets vault service testing
    const hasSecretsVaultTesting = /secrets.*vault|secret.*service|encrypted.*storage/.test(content);
    if (hasSecretsVaultTesting) {
      result.compliant.push('✅ Tests secrets vault service layer');
    } else {
      result.nonCompliant.push('❌ Missing secrets vault service testing');
      this.addTodo(fileName, 'P0', 'Add secrets vault service testing', 
        `// TODO: Add secrets vault service testing to ${fileName}
// - Test encrypted secret storage
// - Test secret rotation and management
// - Test secure secret retrieval
// - Test audit logging for secret operations`);
    }

    // Check for natural language workflow service testing
    const hasNLWorkflowServiceTesting = /natural.*language.*service|openai.*service|workflow.*generation.*service/.test(content);
    if (hasNLWorkflowServiceTesting) {
      result.compliant.push('✅ Tests natural language workflow service');
    } else {
      result.nonCompliant.push('❌ Missing natural language workflow service testing');
      this.addTodo(fileName, 'P0', 'Add natural language workflow service testing', 
        `// TODO: Add natural language workflow service testing to ${fileName}
// - Test OpenAI GPT-4 integration service
// - Test natural language to workflow conversion
// - Test function calling service
// - Test workflow generation validation`);
    }

    // Check for email service testing
    const hasEmailServiceTesting = /email.*service|smtp|sendgrid|email.*integration/.test(content);
    if (hasEmailServiceTesting) {
      result.compliant.push('✅ Tests email service integration');
    } else {
      result.nonCompliant.push('❌ Missing email service testing');
      this.addTodo(fileName, 'P1', 'Add email service testing', 
        `// TODO: Add email service testing to ${fileName}
// - Test email sending functionality
// - Test email template processing
// - Test email delivery confirmation
// - Test email error handling`);
    }

    // Check for audit logging service testing
    const hasAuditLoggingTesting = /audit.*logging|audit.*service|log.*service/.test(content);
    if (hasAuditLoggingTesting) {
      result.compliant.push('✅ Tests audit logging service');
    } else {
      result.nonCompliant.push('❌ Missing audit logging service testing');
      this.addTodo(fileName, 'P1', 'Add audit logging service testing', 
        `// TODO: Add audit logging service testing to ${fileName}
// - Test audit log generation
// - Test log persistence and retrieval
// - Test compliance logging requirements
// - Test log security and access control`);
    }

    // Check for rate limiting service testing
    const hasRateLimitingTesting = /rate.*limiting|rate.*limit.*service|throttling/.test(content);
    if (hasRateLimitingTesting) {
      result.compliant.push('✅ Tests rate limiting service');
    } else {
      result.nonCompliant.push('❌ Missing rate limiting service testing');
      this.addTodo(fileName, 'P1', 'Add rate limiting service testing', 
        `// TODO: Add rate limiting service testing to ${fileName}
// - Test rate limit enforcement
// - Test rate limit reset mechanisms
// - Test per-user rate limiting
// - Test rate limit error handling`);
    }

    // Calculate score
    let score = 0;
    if (hasAPIConnectionTesting) score += 0.25;
    if (hasSecretsVaultTesting) score += 0.25;
    if (hasNLWorkflowServiceTesting) score += 0.20;
    if (hasEmailServiceTesting) score += 0.15;
    if (hasAuditLoggingTesting) score += 0.10;
    if (hasRateLimitingTesting) score += 0.05;

    result.score = Math.min(1, score);
    this.results[fileName].compliance.serviceLayer = result;
  }

  /**
   * Evaluate Authentication Testing
   */
  async evaluateAuthentication(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for OAuth2 testing (primary focus for APIQ)
    const hasOAuth2Testing = /oauth2|oauth.*2|google.*oauth|github.*oauth|slack.*oauth/.test(content);
    if (hasOAuth2Testing) {
      result.compliant.push('✅ Tests OAuth2 flows (Google, GitHub, Slack)');
    } else {
      result.nonCompliant.push('❌ Missing OAuth2 testing');
      this.addTodo(fileName, 'P0', 'Add OAuth2 testing', 
        `// TODO: Add OAuth2 testing to ${fileName}
// - Test Google OAuth2 for user authentication
// - Test GitHub OAuth2 for API integration
// - Test Slack OAuth2 for API integration
// - Test OAuth2 callback handling and cookie-based session management
// - Test OAuth2 session refresh and management`);
    }

    // Check for API authentication testing
    const hasAPIAuthTesting = /api.*key|bearer.*token|basic.*auth|auth.*type/.test(content);
    if (hasAPIAuthTesting) {
      result.compliant.push('✅ Tests API authentication methods');
    } else {
      result.nonCompliant.push('❌ Missing API authentication testing');
      this.addTodo(fileName, 'P0', 'Add API authentication testing', 
        `// TODO: Add API authentication testing to ${fileName}
// - Test API Key authentication
// - Test Bearer Token authentication
// - Test Basic Authentication
// - Test OAuth2 for API connections`);
    }

    // Check for credential storage testing
    const hasCredentialStorage = /credential.*storage|secret.*vault|encrypted.*storage/.test(content);
    if (hasCredentialStorage) {
      result.compliant.push('✅ Tests secure credential storage');
    } else {
      result.nonCompliant.push('❌ Missing credential storage testing');
      this.addTodo(fileName, 'P0', 'Add credential storage testing', 
        `// TODO: Add credential storage testing to ${fileName}
// - Test encrypted credential storage
// - Test secrets vault operations
// - Test credential rotation
// - Test secure credential retrieval`);
    }

    // Check for session management testing
    const hasSessionManagement = /session.*management|jwt|cookie.*session|session.*timeout/.test(content);
    if (hasSessionManagement) {
      result.compliant.push('✅ Tests session management');
    } else {
      result.nonCompliant.push('❌ Missing session management testing');
      this.addTodo(fileName, 'P1', 'Add session management testing', 
        `// TODO: Add session management testing to ${fileName}
// - Test JWT token generation and validation
// - Test session timeout handling
// - Test cookie-based session management
// - Test logout and session cleanup`);
    }

    // Check for authorization testing
    const hasAuthorizationTesting = /authorization|permission|role|rbac|access.*control/.test(content);
    if (hasAuthorizationTesting) {
      result.compliant.push('✅ Tests authorization and permissions');
    } else {
      result.nonCompliant.push('❌ Missing authorization testing');
      this.addTodo(fileName, 'P1', 'Add authorization testing', 
        `// TODO: Add authorization testing to ${fileName}
// - Test role-based access control (RBAC)
// - Test permission checks for API connections
// - Test workflow access authorization
// - Test admin vs user permissions`);
    }

    // Check for cookie-based authentication testing
    const hasCookieAuthTesting = /cookie.*auth|cookie.*session|httpOnly.*cookie|secure.*cookie/.test(content);
    if (hasCookieAuthTesting) {
      result.compliant.push('✅ Tests cookie-based authentication');
    } else {
      result.nonCompliant.push('❌ Missing cookie-based authentication testing');
      this.addTodo(fileName, 'P0', 'Add cookie-based authentication testing', 
        `// TODO: Add cookie-based authentication testing to ${fileName}
// - Test HTTP-only cookie authentication
// - Test secure cookie settings
// - Test cookie expiration and cleanup
// - Test cookie-based session validation
// - Test authentication middleware with cookies`);
    }

    // Check for localStorage anti-patterns in integration tests
    const hasLocalStorageAntiPattern = /localStorage\.|localStorage\[|localStorage\.getItem|localStorage\.setItem/.test(content);
    if (!hasLocalStorageAntiPattern) {
      result.compliant.push('✅ No localStorage anti-patterns found (uses cookie-based auth)');
    } else {
      result.nonCompliant.push('❌ Uses localStorage for authentication (anti-pattern - should use cookies)');
      this.addTodo(fileName, 'P0', 'Replace localStorage with cookie-based authentication', 
        `// TODO: Replace localStorage with cookie-based authentication in ${fileName}
// Application now uses cookie-based authentication instead of localStorage
// 
// Anti-patterns to remove:
// - localStorage.getItem('token')
// - localStorage.setItem('token', value)
// - localStorage.removeItem('token')
// 
// Replace with cookie-based patterns:
// - Test authentication via HTTP-only cookies
// - Test session management via secure cookies
// - Test logout by clearing authentication cookies`);
    }

    // Calculate score
    let score = 0;
    if (hasOAuth2Testing) score += 0.25;
    if (hasAPIAuthTesting) score += 0.20;
    if (hasCredentialStorage) score += 0.20;
    if (hasSessionManagement) score += 0.15;
    if (hasCookieAuthTesting) score += 0.10;
    if (hasAuthorizationTesting) score += 0.05;
    if (!hasLocalStorageAntiPattern) score += 0.05;

    result.score = Math.min(1, score);
    this.results[fileName].compliance.authentication = result;
  }

  /**
   * Evaluate Workflow Engine Testing
   */
  async evaluateWorkflowEngine(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for workflow execution testing
    const hasWorkflowExecution = /workflow.*execution|execute.*workflow|step.*runner/.test(content);
    if (hasWorkflowExecution) {
      result.compliant.push('✅ Tests workflow execution engine');
    } else {
      result.nonCompliant.push('❌ Missing workflow execution testing');
      this.addTodo(fileName, 'P0', 'Add workflow execution testing', 
        `// TODO: Add workflow execution testing to ${fileName}
// - Test workflow step execution
// - Test step runner engine
// - Test execution state management
// - Test workflow lifecycle (create, execute, monitor)`);
    }

    // Check for natural language workflow generation testing
    const hasNLWorkflowGeneration = /natural.*language|openai|gpt|workflow.*generation/.test(content);
    if (hasNLWorkflowGeneration) {
      result.compliant.push('✅ Tests natural language workflow generation');
    } else {
      result.nonCompliant.push('❌ Missing natural language workflow generation testing');
      this.addTodo(fileName, 'P0', 'Add natural language workflow generation testing', 
        `// TODO: Add natural language workflow generation testing to ${fileName}
// - Test OpenAI GPT-4 integration
// - Test natural language to workflow conversion
// - Test function calling from OpenAPI specs
// - Test workflow generation validation`);
    }

    // Check for workflow state management testing
    const hasWorkflowStateManagement = /execution.*state|workflow.*state|pause.*resume|cancel.*execution/.test(content);
    if (hasWorkflowStateManagement) {
      result.compliant.push('✅ Tests workflow state management');
    } else {
      result.nonCompliant.push('❌ Missing workflow state management testing');
      this.addTodo(fileName, 'P1', 'Add workflow state management testing', 
        `// TODO: Add workflow state management testing to ${fileName}
// - Test execution state tracking
// - Test pause/resume functionality
// - Test execution cancellation
// - Test state persistence and recovery`);
    }

    // Check for queue system testing
    const hasQueueTesting = /queue.*system|job.*queue|pg-boss|background.*processing/.test(content);
    if (hasQueueTesting) {
      result.compliant.push('✅ Tests queue system and background processing');
    } else {
      result.nonCompliant.push('❌ Missing queue system testing');
      this.addTodo(fileName, 'P1', 'Add queue system testing', 
        `// TODO: Add queue system testing to ${fileName}
// - Test PgBoss job queue
// - Test background job processing
// - Test queue concurrency and limits
// - Test job retry and failure handling`);
    }

    // Check for data flow testing
    const hasDataFlowTesting = /data.*flow|step.*to.*step|output.*input|parameter.*mapping/.test(content);
    if (hasDataFlowTesting) {
      result.compliant.push('✅ Tests data flow between workflow steps');
    } else {
      result.nonCompliant.push('❌ Missing data flow testing');
      this.addTodo(fileName, 'P1', 'Add data flow testing', 
        `// TODO: Add data flow testing to ${fileName}
// - Test data mapping between steps
// - Test parameter passing
// - Test output to input transformation
// - Test data validation between steps`);
    }

    // Check for workflow monitoring testing
    const hasWorkflowMonitoring = /execution.*monitoring|real.*time.*monitoring|execution.*logs/.test(content);
    if (hasWorkflowMonitoring) {
      result.compliant.push('✅ Tests workflow monitoring and logging');
    } else {
      result.nonCompliant.push('❌ Missing workflow monitoring testing');
      this.addTodo(fileName, 'P2', 'Add workflow monitoring testing', 
        `// TODO: Add workflow monitoring testing to ${fileName}
// - Test real-time execution monitoring
// - Test execution log generation
// - Test progress tracking
// - Test execution history and audit trails`);
    }

    // Calculate score
    let score = 0;
    if (hasWorkflowExecution) score += 0.25;
    if (hasNLWorkflowGeneration) score += 0.25;
    if (hasWorkflowStateManagement) score += 0.20;
    if (hasQueueTesting) score += 0.15;
    if (hasDataFlowTesting) score += 0.10;
    if (hasWorkflowMonitoring) score += 0.05;

    result.score = Math.min(1, score);
    this.results[fileName].compliance.workflowEngine = result;
  }

  /**
   * Evaluate Error Handling
   */
  async evaluateErrorHandling(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for error scenario testing
    const hasErrorTesting = /error|exception|failure|timeout|network.*error/.test(content);
    if (hasErrorTesting) {
      result.compliant.push('✅ Tests error scenarios and failures');
    } else {
      result.nonCompliant.push('❌ Missing error scenario testing');
      this.addTodo(fileName, 'P0', 'Add error scenario testing', 
        `// TODO: Add error scenario testing to ${fileName}
// - Test network failures
// - Test timeout scenarios
// - Test validation errors
// - Test authentication failures
// - Test database connection errors`);
    }

    // Check for try-catch blocks
    const hasTryCatch = /try.*catch|catch.*error/.test(content);
    if (hasTryCatch) {
      result.compliant.push('✅ Uses proper error handling (try-catch)');
    } else {
      result.nonCompliant.push('❌ Missing proper error handling');
      this.addTodo(fileName, 'P1', 'Add proper error handling', 
        `// TODO: Add proper error handling to ${fileName}
// - Use try-catch blocks for error handling
// - Test error recovery mechanisms
// - Test graceful degradation
// - Test error logging and reporting`);
    }

    // Check for edge case testing
    const hasEdgeCaseTesting = /edge.*case|boundary|limit|invalid.*input/.test(content);
    if (hasEdgeCaseTesting) {
      result.compliant.push('✅ Tests edge cases and boundaries');
    } else {
      result.nonCompliant.push('❌ Missing edge case testing');
      this.addTodo(fileName, 'P1', 'Add edge case testing', 
        `// TODO: Add edge case testing to ${fileName}
// - Test boundary conditions
// - Test invalid input handling
// - Test limit testing
// - Test extreme data scenarios`);
    }

    // Check for retry mechanism testing
    const hasRetryTesting = /retry|retry.*mechanism|exponential.*backoff/.test(content);
    if (hasRetryTesting) {
      result.compliant.push('✅ Tests retry mechanisms');
    } else {
      result.nonCompliant.push('❌ Missing retry mechanism testing');
      this.addTodo(fileName, 'P2', 'Add retry mechanism testing', 
        `// TODO: Add retry mechanism testing to ${fileName}
// - Test retry logic for failed operations
// - Test exponential backoff
// - Test retry limits
// - Test retry success scenarios`);
    }

    // Calculate score
    let score = 0;
    if (hasErrorTesting) score += 0.4;
    if (hasTryCatch) score += 0.3;
    if (hasEdgeCaseTesting) score += 0.2;
    if (hasRetryTesting) score += 0.1;

    result.score = Math.min(1, score);
    this.results[fileName].compliance.errorHandling = result;
  }

  /**
   * Evaluate Performance Testing
   */
  async evaluatePerformance(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for performance testing
    const hasPerformanceTesting = /performance|load.*test|stress.*test|benchmark/.test(content);
    if (hasPerformanceTesting) {
      result.compliant.push('✅ Includes performance testing');
    } else {
      result.nonCompliant.push('❌ Missing performance testing');
      this.addTodo(fileName, 'P1', 'Add performance testing', 
        `// TODO: Add performance testing to ${fileName}
// - Test API response times
// - Test database query performance
// - Test load handling capabilities
// - Test memory usage patterns`);
    }

    // Check for response time testing
    const hasResponseTimeTesting = /response.*time|timeout|duration|speed/.test(content);
    if (hasResponseTimeTesting) {
      result.compliant.push('✅ Tests response times and timeouts');
    } else {
      result.nonCompliant.push('❌ Missing response time testing');
      this.addTodo(fileName, 'P1', 'Add response time testing', 
        `// TODO: Add response time testing to ${fileName}
// - Test API endpoint response times
// - Test database query execution times
// - Test timeout handling
// - Test performance thresholds`);
    }

    // Check for concurrent testing
    const hasConcurrentTesting = /concurrent|parallel|multiple.*request|race.*condition/.test(content);
    if (hasConcurrentTesting) {
      result.compliant.push('✅ Tests concurrent operations');
    } else {
      result.nonCompliant.push('❌ Missing concurrent operation testing');
      this.addTodo(fileName, 'P2', 'Add concurrent operation testing', 
        `// TODO: Add concurrent operation testing to ${fileName}
// - Test multiple concurrent requests
// - Test race condition scenarios
// - Test parallel processing
// - Test system behavior under load`);
    }

    // Calculate score
    let score = 0;
    if (hasPerformanceTesting) score += 0.5;
    if (hasResponseTimeTesting) score += 0.3;
    if (hasConcurrentTesting) score += 0.2;

    result.score = Math.min(1, score);
    this.results[fileName].compliance.performance = result;
  }

  /**
   * Evaluate Security Testing
   */
  async evaluateSecurity(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for input validation testing
    const hasInputValidation = /input.*validation|validation.*error|sanitize|escape/.test(content);
    if (hasInputValidation) {
      result.compliant.push('✅ Tests input validation');
    } else {
      result.nonCompliant.push('❌ Missing input validation testing');
      this.addTodo(fileName, 'P0', 'Add input validation testing', 
        `// TODO: Add input validation testing to ${fileName}
// - Test input sanitization
// - Test validation error responses
// - Test malicious input handling
// - Test data type validation`);
    }

    // Check for XSS prevention testing
    const hasXSSPrevention = /xss|script.*injection|html.*escape/.test(content);
    if (hasXSSPrevention) {
      result.compliant.push('✅ Tests XSS prevention');
    } else {
      result.nonCompliant.push('❌ Missing XSS prevention testing');
      this.addTodo(fileName, 'P0', 'Add XSS prevention testing', 
        `// TODO: Add XSS prevention testing to ${fileName}
// - Test script injection prevention
// - Test HTML escaping
// - Test content security policy
// - Test XSS payload handling`);
    }

    // Check for SQL injection testing
    const hasSQLInjectionTesting = /sql.*injection|injection.*attack/.test(content);
    if (hasSQLInjectionTesting) {
      result.compliant.push('✅ Tests SQL injection prevention');
    } else {
      result.nonCompliant.push('❌ Missing SQL injection testing');
      this.addTodo(fileName, 'P0', 'Add SQL injection testing', 
        `// TODO: Add SQL injection testing to ${fileName}
// - Test SQL injection prevention
// - Test parameterized queries
// - Test malicious SQL payload handling
// - Test database query security`);
    }

    // Check for data exposure testing
    const hasDataExposureTesting = /data.*exposure|sensitive.*data|privacy.*leak/.test(content);
    if (hasDataExposureTesting) {
      result.compliant.push('✅ Tests data exposure prevention');
    } else {
      result.nonCompliant.push('❌ Missing data exposure testing');
      this.addTodo(fileName, 'P0', 'Add data exposure testing', 
        `// TODO: Add data exposure testing to ${fileName}
// - Test sensitive data handling
// - Test privacy leak prevention
// - Test data encryption
// - Test secure data transmission`);
    }

    // Calculate score
    let score = 0;
    if (hasInputValidation) score += 0.3;
    if (hasXSSPrevention) score += 0.25;
    if (hasSQLInjectionTesting) score += 0.25;
    if (hasDataExposureTesting) score += 0.2;

    result.score = Math.min(1, score);
    this.results[fileName].compliance.security = result;
  }

  /**
   * Evaluate Code Quality
   */
  async evaluateCodeQuality(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for consistent code style
    const hasConsistentStyle = /prettier|eslint|standard/.test(content);
    if (hasConsistentStyle) {
      result.compliant.push('✅ Uses consistent code style (Prettier, ESLint, Standard)');
    } else {
      result.nonCompliant.push('❌ Missing consistent code style');
      this.addTodo(fileName, 'P0', 'Add consistent code style', 
        `// TODO: Add consistent code style to ${fileName}
// - Use Prettier for code formatting
// - Use ESLint for linting
// - Use Standard for code style`);
    }

    // Check for type safety
    const hasTypeSafety = /type.*annotation|type.*definition|interface/.test(content);
    if (hasTypeSafety) {
      result.compliant.push('✅ Uses type safety (TypeScript, Flow)');
    } else {
      result.nonCompliant.push('❌ Missing type safety');
      this.addTodo(fileName, 'P0', 'Add type safety', 
        `// TODO: Add type safety to ${fileName}
// - Use TypeScript/Flow for type annotations
// - Define interfaces and types for data structures`);
    }

    // Check for error handling patterns
    const hasErrorHandlingPatterns = /try.*catch|error.*handling|recovery|fallback/.test(content);
    if (hasErrorHandlingPatterns) {
      result.compliant.push('✅ Uses robust error handling patterns');
    } else {
      result.nonCompliant.push('❌ Missing robust error handling');
      this.addTodo(fileName, 'P1', 'Add robust error handling', 
        `// TODO: Add robust error handling to ${fileName}
// - Use try-catch blocks for error handling
// - Implement fallback mechanisms
// - Log errors for debugging
// - Provide meaningful error messages`);
    }

    // Check for test isolation
    const hasTestIsolation = /beforeEach|afterEach|beforeAll|afterAll|setup|teardown/.test(content);
    if (hasTestIsolation) {
      result.compliant.push('✅ Has proper test isolation setup');
    } else {
      result.nonCompliant.push('❌ Missing test isolation setup');
      this.addTodo(fileName, 'P0', 'Add test isolation setup', 
        `// TODO: Add test isolation setup to ${fileName}
// test.beforeEach(async () => {
//   // Setup test data
//   await createTestData();
// });
// 
// test.afterEach(async () => {
//   // Clean up test data
//   await cleanupTestData();
// });`);
    }

    // Check for deterministic tests
    const hasDeterministicTests = /createTestData|setupTestData|seed.*data|fixture/.test(content);
    if (hasDeterministicTests) {
      result.compliant.push('✅ Uses deterministic test data');
    } else {
      result.nonCompliant.push('❌ Missing deterministic test data');
      this.addTodo(fileName, 'P0', 'Add deterministic test data', 
        `// TODO: Add deterministic test data to ${fileName}
// - Create predictable test data with unique identifiers
// - Use timestamps or UUIDs to avoid conflicts
// - Ensure test data is isolated and doesn't interfere with other tests`);
    }

    // Check for timeout configurations
    const hasTimeoutConfig = /setTimeout|timeout.*\d{4,}|test\.setTimeout/.test(content);
    if (hasTimeoutConfig) {
      result.compliant.push('✅ Has appropriate timeout configurations');
    } else {
      result.nonCompliant.push('❌ Missing timeout configurations');
      this.addTodo(fileName, 'P1', 'Add timeout configurations', 
        `// TODO: Add timeout configurations to ${fileName}
// test.setTimeout(30000); // Global test timeout
// Use different timeouts for different types of operations`);
    }

    // Check for error recovery
    const hasErrorRecovery = /try.*catch|error.*handling|recovery|fallback/.test(content);
    if (hasErrorRecovery) {
      result.compliant.push('✅ Has error handling and recovery');
    } else {
      result.nonCompliant.push('❌ Missing error handling and recovery');
      this.addTodo(fileName, 'P1', 'Add error handling and recovery', 
        `// TODO: Add error handling and recovery to ${fileName}
// - Handle network failures gracefully
// - Implement fallback mechanisms
// - Log errors for debugging
// - Provide meaningful error messages`);
    }

    // Calculate score
    let score = 0;
    if (hasConsistentStyle) score += 0.2;
    if (hasTypeSafety) score += 0.2;
    if (hasErrorHandlingPatterns) score += 0.2;
    if (hasTestIsolation) score += 0.2;
    if (hasDeterministicTests) score += 0.1;
    if (hasTimeoutConfig) score += 0.1;
    if (hasErrorRecovery) score += 0.1;

    result.score = Math.min(1, score);
    this.results[fileName].compliance.codeQuality = result;
  }

  /**
   * Evaluate API Standards
   */
  async evaluateAPIStandards(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for OpenAPI/Swagger documentation
    const hasOpenAPIDoc = /openapi|swagger/.test(content);
    if (hasOpenAPIDoc) {
      result.compliant.push('✅ Has OpenAPI/Swagger documentation');
    } else {
      result.nonCompliant.push('❌ Missing OpenAPI/Swagger documentation');
      this.addTodo(fileName, 'P0', 'Add OpenAPI/Swagger documentation', 
        `// TODO: Add OpenAPI/Swagger documentation to ${fileName}
// - Define API endpoints and their specifications
// - Document request/response formats
// - Define authentication methods
// - Document error responses`);
    }

    // Check for versioning
    const hasVersioning = /v\d+\.\d+\.\d+|version.*\d+\.\d+\.\d+/.test(content);
    if (hasVersioning) {
      result.compliant.push('✅ Uses API versioning');
    } else {
      result.nonCompliant.push('❌ Missing API versioning');
      this.addTodo(fileName, 'P1', 'Add API versioning', 
        `// TODO: Add API versioning to ${fileName}
// - Use semantic versioning (major.minor.patch)
// - Document API version changes`);
    }

    // Check for rate limiting
    const hasRateLimiting = /rate.*limiting|rate.*limit.*service|throttling/.test(content);
    if (hasRateLimiting) {
      result.compliant.push('✅ Implements rate limiting');
    } else {
      result.nonCompliant.push('❌ Missing rate limiting');
      this.addTodo(fileName, 'P1', 'Add rate limiting', 
        `// TODO: Add rate limiting to ${fileName}
// - Implement per-endpoint rate limits
// - Use a centralized rate limiting service`);
    }

    // Check for authentication methods
    const hasAuthMethods = /oauth2|oauth.*2|google.*oauth|github.*oauth|slack.*oauth/.test(content) || 
                           /api.*key|bearer.*token|basic.*auth|auth.*type/.test(content);
    if (hasAuthMethods) {
      result.compliant.push('✅ Implements multiple authentication methods');
    } else {
      result.nonCompliant.push('❌ Missing authentication methods');
      this.addTodo(fileName, 'P1', 'Add authentication methods', 
        `// TODO: Add authentication methods to ${fileName}
// - Implement OAuth2 (Google, GitHub, Slack)
// - Implement API Key authentication
// - Implement Bearer Token authentication
// - Implement Basic Authentication
// - Implement cookie-based session authentication`);
    }

    // Check for data validation
    const hasDataValidation = /expect.*json|expect.*data|expect.*property|expect.*toHaveProperty/.test(content);
    if (hasDataValidation) {
      result.compliant.push('✅ Validates API responses');
    } else {
      result.nonCompliant.push('❌ Missing API response validation');
      this.addTodo(fileName, 'P1', 'Add API response validation', 
        `// TODO: Add API response validation to ${fileName}
// - Validate response structure and format
// - Validate response data types
// - Validate required fields in responses
// - Validate error message formats`);
    }

    // Check for request payload validation
    const hasRequestPayloadValidation = /data.*{|body.*{|payload.*{|request.*data/.test(content);
    if (hasRequestPayloadValidation) {
      result.compliant.push('✅ Validates request payloads');
    } else {
      result.nonCompliant.push('❌ Missing request payload validation');
      this.addTodo(fileName, 'P1', 'Add request payload validation', 
        `// TODO: Add request payload validation to ${fileName}
// - Validate different request payload formats
// - Validate required vs optional fields
// - Validate payload validation
// - Validate malformed payload handling`);
    }

    // Check for query parameter validation
    const hasQueryParamValidation = /query.*{|params.*{|search.*{|filter.*{|sort.*{/.test(content);
    if (hasQueryParamValidation) {
      result.compliant.push('✅ Validates query parameters');
    } else {
      result.nonCompliant.push('❌ Missing query parameter validation');
      this.addTodo(fileName, 'P1', 'Add query parameter validation', 
        `// TODO: Add query parameter validation to ${fileName}
// - Validate pagination parameters
// - Validate filtering parameters
// - Validate sorting parameters
// - Validate search parameters`);
    }

    // Calculate score
    let score = 0;
    if (hasOpenAPIDoc) score += 0.2;
    if (hasVersioning) score += 0.1;
    if (hasRateLimiting) score += 0.1;
    if (hasAuthMethods) score += 0.1;
    if (hasDataValidation) score += 0.1;
    if (hasRequestPayloadValidation) score += 0.1;
    if (hasQueryParamValidation) score += 0.1;

    result.score = Math.min(1, score);
    this.results[fileName].compliance.apiStandards = result;
  }

  /**
   * Evaluate Development Workflow
   */
  async evaluateDevelopmentWorkflow(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for test isolation
    const hasTestIsolation = /beforeEach|afterEach|beforeAll|afterAll|setup|teardown/.test(content);
    if (hasTestIsolation) {
      result.compliant.push('✅ Has proper test isolation setup');
    } else {
      result.nonCompliant.push('❌ Missing test isolation setup');
      this.addTodo(fileName, 'P0', 'Add test isolation setup', 
        `// TODO: Add test isolation setup to ${fileName}
// test.beforeEach(async () => {
//   // Setup test data
//   await createTestData();
// });
// 
// test.afterEach(async () => {
//   // Clean up test data
//   await cleanupTestData();
// });`);
    }

    // Check for deterministic tests
    const hasDeterministicTests = /createTestData|setupTestData|seed.*data|fixture/.test(content);
    if (hasDeterministicTests) {
      result.compliant.push('✅ Uses deterministic test data');
    } else {
      result.nonCompliant.push('❌ Missing deterministic test data');
      this.addTodo(fileName, 'P0', 'Add deterministic test data', 
        `// TODO: Add deterministic test data to ${fileName}
// - Create predictable test data with unique identifiers
// - Use timestamps or UUIDs to avoid conflicts
// - Ensure test data is isolated and doesn't interfere with other tests`);
    }

    // Check for timeout configurations
    const hasTimeoutConfig = /setTimeout|timeout.*\d{4,}|test\.setTimeout/.test(content);
    if (hasTimeoutConfig) {
      result.compliant.push('✅ Has appropriate timeout configurations');
    } else {
      result.nonCompliant.push('❌ Missing timeout configurations');
      this.addTodo(fileName, 'P1', 'Add timeout configurations', 
        `// TODO: Add timeout configurations to ${fileName}
// test.setTimeout(30000); // Global test timeout
// Use different timeouts for different types of operations`);
    }

    // Check for error recovery
    const hasErrorRecovery = /try.*catch|error.*handling|recovery|fallback/.test(content);
    if (hasErrorRecovery) {
      result.compliant.push('✅ Has error handling and recovery');
    } else {
      result.nonCompliant.push('❌ Missing error handling and recovery');
      this.addTodo(fileName, 'P1', 'Add error handling and recovery', 
        `// TODO: Add error handling and recovery to ${fileName}
// - Handle network failures gracefully
// - Implement fallback mechanisms
// - Log errors for debugging
// - Provide meaningful error messages`);
    }

    // Calculate score
    let score = 0;
    if (hasTestIsolation) score += 0.3;
    if (hasDeterministicTests) score += 0.3;
    if (hasTimeoutConfig) score += 0.2;
    if (hasErrorRecovery) score += 0.2;

    result.score = Math.min(1, score);
    this.results[fileName].compliance.developmentWorkflow = result;
  }

  /**
   * Evaluate Test Reliability
   */
  async evaluateTestReliability(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Check for test isolation
    const hasTestIsolation = /beforeEach|afterEach|beforeAll|afterAll|setup|teardown/.test(content);
    if (hasTestIsolation) {
      result.compliant.push('✅ Has proper test isolation setup');
    } else {
      result.nonCompliant.push('❌ Missing test isolation setup');
      this.addTodo(fileName, 'P0', 'Add test isolation setup', 
        `// TODO: Add test isolation setup to ${fileName}
// test.beforeEach(async () => {
//   // Setup test data
//   await createTestData();
// });
// 
// test.afterEach(async () => {
//   // Clean up test data
//   await cleanupTestData();
// });`);
    }

    // Check for deterministic tests
    const hasDeterministicTests = /createTestData|setupTestData|seed.*data|fixture/.test(content);
    if (hasDeterministicTests) {
      result.compliant.push('✅ Uses deterministic test data');
    } else {
      result.nonCompliant.push('❌ Missing deterministic test data');
      this.addTodo(fileName, 'P0', 'Add deterministic test data', 
        `// TODO: Add deterministic test data to ${fileName}
// - Create predictable test data with unique identifiers
// - Use timestamps or UUIDs to avoid conflicts
// - Ensure test data is isolated and doesn't interfere with other tests`);
    }

    // Check for timeout configurations
    const hasTimeoutConfig = /setTimeout|timeout.*\d{4,}|test\.setTimeout/.test(content);
    if (hasTimeoutConfig) {
      result.compliant.push('✅ Has appropriate timeout configurations');
    } else {
      result.nonCompliant.push('❌ Missing timeout configurations');
      this.addTodo(fileName, 'P1', 'Add timeout configurations', 
        `// TODO: Add timeout configurations to ${fileName}
// test.setTimeout(30000); // Global test timeout
// Use different timeouts for different types of operations`);
    }

    // Check for error recovery
    const hasErrorRecovery = /try.*catch|error.*handling|recovery|fallback/.test(content);
    if (hasErrorRecovery) {
      result.compliant.push('✅ Has error handling and recovery');
    } else {
      result.nonCompliant.push('❌ Missing error handling and recovery');
      this.addTodo(fileName, 'P1', 'Add error handling and recovery', 
        `// TODO: Add error handling and recovery to ${fileName}
// - Handle network failures gracefully
// - Implement fallback mechanisms
// - Log errors for debugging
// - Provide meaningful error messages`);
    }

    // Calculate score
    let score = 0;
    if (hasTestIsolation) score += 0.3;
    if (hasDeterministicTests) score += 0.3;
    if (hasTimeoutConfig) score += 0.2;
    if (hasErrorRecovery) score += 0.2;

    result.score = Math.min(1, score);
    this.results[fileName].compliance.testReliability = result;
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
    this.todos.push({
      file,
      priority,
      description,
      code
    });
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
      console.log(`📊 Overall Compliance Score: ${result.score}%`);
      
      // Show compliance breakdown
      Object.keys(result.compliance).forEach(criteria => {
        const compliance = result.compliance[criteria];
        console.log(`  ${criteria}: ${Math.round(compliance.score * 100)}%`);
      });

      // Show compliant areas
      if (result.compliance.apiTesting?.compliant.length > 0) {
        console.log('\n✅ Compliant Areas:');
        result.compliance.apiTesting.compliant.forEach(item => {
          console.log(`  ${item}`);
        });
      }

      // Show non-compliant areas
      if (result.compliance.apiTesting?.nonCompliant.length > 0) {
        console.log('\n❌ Non-Compliant Areas:');
        result.compliance.apiTesting.nonCompliant.forEach(item => {
          console.log(`  ${item}`);
        });
      }

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