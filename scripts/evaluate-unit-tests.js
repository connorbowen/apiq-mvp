#!/usr/bin/env node

/**
 * Unit Test Evaluation Tool
 * 
 * This tool evaluates unit test files against the project's documentation standards:
 * - Function/component isolation testing (pure functions, isolated components)
 * - Mocking best practices (proper mocking, dependency injection)
 * - Test coverage analysis (line coverage, branch coverage, edge cases)
 * - Assertion quality (meaningful assertions, error message clarity)
 * - Test organization (describe blocks, test naming, setup/teardown)
 * - Performance testing (function performance, memory usage)
 * - Error handling testing (exception scenarios, error propagation)
 * - Input validation testing (boundary conditions, invalid inputs)
 * 
 * Usage: node scripts/evaluate-unit-tests.js [test-file-path]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const TEST_DIR = 'tests/unit';
const DOCS_DIR = 'docs';
const SRC_DIR = 'src';

// Evaluation criteria weights
const CRITERIA_WEIGHTS = {
  testIsolation: 0.15,
  mockingBestPractices: 0.12,
  testCoverage: 0.15,
  assertionQuality: 0.12,
  testOrganization: 0.10,
  performanceTesting: 0.08,
  errorHandling: 0.10,
  inputValidation: 0.10,
  documentationCompliance: 0.08
};

class UnitTestEvaluator {
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
    if (lowerFileName.includes('component') || lowerFilePath.includes('component')) {
      context.type = 'component';
      context.expectedFeatures = ['component rendering', 'props validation', 'event handling', 'state management'];
      context.excludedFeatures = ['API calls', 'database operations'];
      context.description = 'Component unit test file';
    } else if (lowerFileName.includes('service') || lowerFilePath.includes('service')) {
      context.type = 'service';
      context.expectedFeatures = ['service methods', 'business logic', 'error handling', 'data processing'];
      context.excludedFeatures = ['UI interactions', 'database operations'];
      context.description = 'Service unit test file';
    } else if (lowerFileName.includes('util') || lowerFileName.includes('helper') || lowerFilePath.includes('utils')) {
      context.type = 'utility';
      context.expectedFeatures = ['pure functions', 'data transformation', 'validation logic', 'helper functions'];
      context.excludedFeatures = ['UI interactions', 'external dependencies'];
      context.description = 'Utility function unit test file';
    } else if (lowerFileName.includes('auth') || lowerFilePath.includes('auth')) {
      context.type = 'authentication';
      context.expectedFeatures = ['authentication logic', 'token validation', 'permission checks', 'security functions'];
      context.excludedFeatures = ['UI interactions', 'database operations'];
      context.description = 'Authentication unit test file';
    } else if (lowerFileName.includes('middleware') || lowerFilePath.includes('middleware')) {
      context.type = 'middleware';
      context.expectedFeatures = ['request processing', 'response handling', 'error middleware', 'authentication middleware'];
      context.excludedFeatures = ['UI interactions', 'database operations'];
      context.description = 'Middleware unit test file';
    } else if (lowerFileName.includes('workflow') || lowerFilePath.includes('workflow')) {
      context.type = 'workflow';
      context.expectedFeatures = ['workflow logic', 'step processing', 'state transitions', 'execution flow'];
      context.excludedFeatures = ['UI interactions', 'external API calls'];
      context.description = 'Workflow unit test file';
    } else {
      context.type = 'general';
      context.expectedFeatures = ['function testing', 'logic validation', 'error handling'];
      context.excludedFeatures = ['UI interactions', 'external dependencies'];
      context.description = 'General unit test file';
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
    await this.evaluateTestIsolation(fileName, content, testContext);
    await this.evaluateMockingBestPractices(fileName, content, testContext);
    await this.evaluateTestCoverage(fileName, content, testContext);
    await this.evaluateAssertionQuality(fileName, content, testContext);
    await this.evaluateTestOrganization(fileName, content, testContext);
    await this.evaluatePerformanceTesting(fileName, content, testContext);
    await this.evaluateErrorHandling(fileName, content, testContext);
    await this.evaluateInputValidation(fileName, content, testContext);
    await this.evaluateDocumentationCompliance(fileName, content, testContext);

    // Calculate overall score
    this.calculateOverallScore(fileName);
    
    // Generate recommendations
    this.generateRecommendations(fileName);
    
    return this.results[fileName];
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

    // Pure function testing
    const hasPureFunctionTesting = /pure.*function|no.*side.*effects|deterministic|isolated.*function/.test(content);
    if (hasPureFunctionTesting) {
      result.compliant.push('✅ Tests pure functions');
    } else {
      result.nonCompliant.push('❌ Missing pure function testing');
      this.addTodo(fileName, 'P1', 'Add pure function testing', 
        `// TODO: Add pure function testing to ${fileName}
// - Test functions with no side effects
// - Test deterministic behavior
// - Test isolated function logic
// - Test function composition`);
    }

    // Component isolation
    const hasComponentIsolation = /component.*isolation|isolated.*component|mock.*props|mock.*dependencies/.test(content);
    if (hasComponentIsolation) {
      result.compliant.push('✅ Tests component isolation');
    } else {
      result.nonCompliant.push('❌ Missing component isolation testing');
      this.addTodo(fileName, 'P0', 'Add component isolation testing', 
        `// TODO: Add component isolation testing to ${fileName}
// - Test components in isolation
// - Mock external dependencies
// - Test component props independently
// - Test component state management`);
    }

    // External dependency mocking
    const hasExternalDependencyMocking = /jest\.mock|vi\.mock|mock.*external|mock.*dependency/.test(content);
    if (hasExternalDependencyMocking) {
      result.compliant.push('✅ Mocks external dependencies');
    } else {
      result.nonCompliant.push('❌ Missing external dependency mocking');
      this.addTodo(fileName, 'P0', 'Add external dependency mocking', 
        `// TODO: Add external dependency mocking to ${fileName}
// - Mock external API calls
// - Mock database operations
// - Mock third-party services
// - Mock file system operations`);
    }

    // Test independence
    const hasTestIndependence = /independent.*test|no.*shared.*state|isolated.*test/.test(content);
    if (hasTestIndependence) {
      result.compliant.push('✅ Tests are independent');
    } else {
      result.nonCompliant.push('❌ Tests may have dependencies');
      this.addTodo(fileName, 'P0', 'Ensure test independence', 
        `// TODO: Ensure test independence in ${fileName}
// - Each test should be able to run in isolation
// - No dependencies on other test execution order
// - Clean state before and after each test
// - Use unique test data for each test`);
    }

    result.score = (hasPureFunctionTesting ? 0.25 : 0) + 
                   (hasComponentIsolation ? 0.25 : 0) + 
                   (hasExternalDependencyMocking ? 0.25 : 0) + 
                   (hasTestIndependence ? 0.25 : 0);

    this.results[fileName].compliance.testIsolation = result;
  }

  /**
   * Evaluate Mocking Best Practices
   */
  async evaluateMockingBestPractices(fileName, content, context) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Proper mocking setup
    const hasProperMockingSetup = /jest\.mock|vi\.mock|beforeEach.*mock|mock.*setup/.test(content);
    if (hasProperMockingSetup) {
      result.compliant.push('✅ Has proper mocking setup');
    } else {
      result.nonCompliant.push('❌ Missing proper mocking setup');
      this.addTodo(fileName, 'P0', 'Add proper mocking setup', 
        `// TODO: Add proper mocking setup to ${fileName}
// jest.mock('../path/to/module', () => ({
//   functionName: jest.fn()
// }));
// 
// beforeEach(() => {
//   jest.clearAllMocks();
// });`);
    }

    // Mock verification
    const hasMockVerification = /expect.*toHaveBeenCalled|expect.*toHaveBeenCalledWith|mock.*verification/.test(content);
    if (hasMockVerification) {
      result.compliant.push('✅ Verifies mock calls');
    } else {
      result.nonCompliant.push('❌ Missing mock verification');
      this.addTodo(fileName, 'P1', 'Add mock verification', 
        `// TODO: Add mock verification to ${fileName}
// - Verify mock functions were called
// - Verify mock functions were called with correct arguments
// - Verify mock functions were called the expected number of times
// - Example: expect(mockFunction).toHaveBeenCalledWith(expectedArgs);`);
    }

    // Mock cleanup
    const hasMockCleanup = /jest\.clearAllMocks|vi\.clearAllMocks|afterEach.*mock|mock.*cleanup/.test(content);
    if (hasMockCleanup) {
      result.compliant.push('✅ Cleans up mocks');
    } else {
      result.nonCompliant.push('❌ Missing mock cleanup');
      this.addTodo(fileName, 'P1', 'Add mock cleanup', 
        `// TODO: Add mock cleanup to ${fileName}
// afterEach(() => {
//   jest.clearAllMocks();
//   vi.clearAllMocks();
// });`);
    }

    // Mock implementation testing
    const hasMockImplementationTesting = /mockImplementation|mockReturnValue|mockResolvedValue|mockRejectedValue/.test(content);
    if (hasMockImplementationTesting) {
      result.compliant.push('✅ Tests mock implementations');
    } else {
      result.nonCompliant.push('❌ Missing mock implementation testing');
      this.addTodo(fileName, 'P1', 'Add mock implementation testing', 
        `// TODO: Add mock implementation testing to ${fileName}
// - Test different mock return values
// - Test mock error scenarios
// - Test async mock implementations
// - Test mock behavior variations`);
    }

    result.score = (hasProperMockingSetup ? 0.3 : 0) + 
                   (hasMockVerification ? 0.3 : 0) + 
                   (hasMockCleanup ? 0.2 : 0) + 
                   (hasMockImplementationTesting ? 0.2 : 0);

    this.results[fileName].compliance.mockBestPractices = result;
  }

  /**
   * Evaluate Test Coverage
   */
  async evaluateTestCoverage(fileName, content, context) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Edge case testing
    const hasEdgeCaseTesting = /edge.*case|boundary.*condition|extreme.*value|corner.*case/.test(content);
    if (hasEdgeCaseTesting) {
      result.compliant.push('✅ Tests edge cases');
    } else {
      result.nonCompliant.push('❌ Missing edge case testing');
      this.addTodo(fileName, 'P1', 'Add edge case testing', 
        `// TODO: Add edge case testing to ${fileName}
// - Test boundary conditions
// - Test extreme values
// - Test empty/null inputs
// - Test maximum/minimum values`);
    }

    // Branch coverage
    const hasBranchCoverage = /if.*else|switch.*case|conditional.*logic|branch.*testing/.test(content);
    if (hasBranchCoverage) {
      result.compliant.push('✅ Tests different branches');
    } else {
      result.nonCompliant.push('❌ Missing branch coverage');
      this.addTodo(fileName, 'P1', 'Add branch coverage', 
        `// TODO: Add branch coverage to ${fileName}
// - Test all conditional branches
// - Test if/else statements
// - Test switch cases
// - Test different code paths`);
    }

    // Error path testing
    const hasErrorPathTesting = /error.*path|exception.*handling|throw.*error|catch.*block/.test(content);
    if (hasErrorPathTesting) {
      result.compliant.push('✅ Tests error paths');
    } else {
      result.nonCompliant.push('❌ Missing error path testing');
      this.addTodo(fileName, 'P0', 'Add error path testing', 
        `// TODO: Add error path testing to ${fileName}
// - Test error throwing scenarios
// - Test exception handling
// - Test error propagation
// - Test error recovery paths`);
    }

    // Happy path testing
    const hasHappyPathTesting = /happy.*path|success.*scenario|normal.*flow|expected.*behavior/.test(content);
    if (hasHappyPathTesting) {
      result.compliant.push('✅ Tests happy paths');
    } else {
      result.nonCompliant.push('❌ Missing happy path testing');
      this.addTodo(fileName, 'P0', 'Add happy path testing', 
        `// TODO: Add happy path testing to ${fileName}
// - Test successful execution paths
// - Test expected behavior
// - Test normal flow scenarios
// - Test valid input handling`);
    }

    result.score = (hasEdgeCaseTesting ? 0.25 : 0) + 
                   (hasBranchCoverage ? 0.25 : 0) + 
                   (hasErrorPathTesting ? 0.25 : 0) + 
                   (hasHappyPathTesting ? 0.25 : 0);

    this.results[fileName].compliance.testCoverage = result;
  }

  /**
   * Evaluate Assertion Quality
   */
  async evaluateAssertionQuality(fileName, content, context) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Meaningful assertions
    const hasMeaningfulAssertions = /expect.*toBe|expect.*toEqual|expect.*toContain|expect.*toMatch/.test(content);
    if (hasMeaningfulAssertions) {
      result.compliant.push('✅ Uses meaningful assertions');
    } else {
      result.nonCompliant.push('❌ Missing meaningful assertions');
      this.addTodo(fileName, 'P0', 'Add meaningful assertions', 
        `// TODO: Add meaningful assertions to ${fileName}
// - Use specific assertion matchers
// - Test exact values and types
// - Test object properties and structure
// - Test array contents and order`);
    }

    // Error message clarity
    const hasClearErrorMessages = /expect.*toThrow.*message|error.*message.*test|assertion.*message/.test(content);
    if (hasClearErrorMessages) {
      result.compliant.push('✅ Tests error message clarity');
    } else {
      result.nonCompliant.push('❌ Missing error message testing');
      this.addTodo(fileName, 'P1', 'Add error message testing', 
        `// TODO: Add error message testing to ${fileName}
// - Test error message content
// - Test error message format
// - Test error message localization
// - Test error message clarity`);
    }

    // Type checking
    const hasTypeChecking = /expect.*toBeInstanceOf|expect.*toHaveProperty|expect.*toBeDefined|expect.*toBeNull/.test(content);
    if (hasTypeChecking) {
      result.compliant.push('✅ Tests type checking');
    } else {
      result.nonCompliant.push('❌ Missing type checking');
      this.addTodo(fileName, 'P1', 'Add type checking', 
        `// TODO: Add type checking to ${fileName}
// - Test return value types
// - Test object property types
// - Test null/undefined handling
// - Test type safety`);
    }

    // Performance assertions
    const hasPerformanceAssertions = /expect.*toBeLessThan|expect.*toBeGreaterThan|performance.*test|time.*assertion/.test(content);
    if (hasPerformanceAssertions) {
      result.compliant.push('✅ Tests performance assertions');
    } else {
      result.nonCompliant.push('❌ Missing performance assertions');
      this.addTodo(fileName, 'P2', 'Add performance assertions', 
        `// TODO: Add performance assertions to ${fileName}
// - Test execution time limits
// - Test memory usage limits
// - Test performance benchmarks
// - Test performance degradation`);
    }

    result.score = (hasMeaningfulAssertions ? 0.4 : 0) + 
                   (hasClearErrorMessages ? 0.25 : 0) + 
                   (hasTypeChecking ? 0.25 : 0) + 
                   (hasPerformanceAssertions ? 0.1 : 0);

    this.results[fileName].compliance.assertionQuality = result;
  }

  /**
   * Evaluate Test Organization
   */
  async evaluateTestOrganization(fileName, content, context) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Describe blocks
    const hasDescribeBlocks = /describe\(|test\.describe\(|describe.*function|describe.*component/.test(content);
    if (hasDescribeBlocks) {
      result.compliant.push('✅ Uses describe blocks');
    } else {
      result.nonCompliant.push('❌ Missing describe blocks');
      this.addTodo(fileName, 'P1', 'Add describe blocks', 
        `// TODO: Add describe blocks to ${fileName}
// describe('FunctionName', () => {
//   describe('when input is valid', () => {
//     test('should return expected result', () => {
//       // test implementation
//     });
//   });
// });`);
    }

    // Clear test naming
    const hasClearTestNaming = /should.*test|should.*return|should.*handle|should.*validate/.test(content);
    if (hasClearTestNaming) {
      result.compliant.push('✅ Has clear test naming');
    } else {
      result.nonCompliant.push('❌ Missing clear test naming');
      this.addTodo(fileName, 'P1', 'Add clear test naming', 
        `// TODO: Add clear test naming to ${fileName}
// - Use descriptive test names
// - Follow "should" pattern
// - Include context in test names
// - Example: "should return user data when valid ID is provided"`);
    }

    // Setup and teardown
    const hasSetupTeardown = /beforeEach|afterEach|beforeAll|afterAll|setup|teardown/.test(content);
    if (hasSetupTeardown) {
      result.compliant.push('✅ Has setup and teardown');
    } else {
      result.nonCompliant.push('❌ Missing setup and teardown');
      this.addTodo(fileName, 'P1', 'Add setup and teardown', 
        `// TODO: Add setup and teardown to ${fileName}
// beforeEach(() => {
//   // Setup test environment
// });
// 
// afterEach(() => {
//   // Clean up test environment
// });`);
    }

    result.score = (hasDescribeBlocks ? 0.4 : 0) + 
                   (hasClearTestNaming ? 0.4 : 0) + 
                   (hasSetupTeardown ? 0.2 : 0);

    this.results[fileName].compliance.testOrganization = result;
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

    // Function performance testing
    const hasFunctionPerformance = /performance.*test|execution.*time|benchmark|time.*measurement/.test(content);
    if (hasFunctionPerformance) {
      result.compliant.push('✅ Tests function performance');
    } else {
      result.nonCompliant.push('❌ Missing function performance testing');
      this.addTodo(fileName, 'P2', 'Add function performance testing', 
        `// TODO: Add function performance testing to ${fileName}
// - Test function execution time
// - Test performance benchmarks
// - Test performance under load
// - Test memory usage patterns`);
    }

    // Memory leak testing
    const hasMemoryLeakTesting = /memory.*leak|memory.*usage|garbage.*collection|memory.*test/.test(content);
    if (hasMemoryLeakTesting) {
      result.compliant.push('✅ Tests for memory leaks');
    } else {
      result.nonCompliant.push('❌ Missing memory leak testing');
      this.addTodo(fileName, 'P2', 'Add memory leak testing', 
        `// TODO: Add memory leak testing to ${fileName}
// - Test memory usage patterns
// - Test garbage collection behavior
// - Test long-running scenarios
// - Test memory cleanup`);
    }

    result.score = (hasFunctionPerformance ? 0.6 : 0) + 
                   (hasMemoryLeakTesting ? 0.4 : 0);

    this.results[fileName].compliance.performanceTesting = result;
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

    // Exception testing
    const hasExceptionTesting = /expect.*toThrow|throw.*error|exception.*test|error.*throwing/.test(content);
    if (hasExceptionTesting) {
      result.compliant.push('✅ Tests exceptions');
    } else {
      result.nonCompliant.push('❌ Missing exception testing');
      this.addTodo(fileName, 'P0', 'Add exception testing', 
        `// TODO: Add exception testing to ${fileName}
// - Test error throwing scenarios
// - Test exception types
// - Test error messages
// - Test error propagation`);
    }

    // Error recovery testing
    const hasErrorRecoveryTesting = /error.*recovery|recovery.*test|fallback.*test|error.*handling/.test(content);
    if (hasErrorRecoveryTesting) {
      result.compliant.push('✅ Tests error recovery');
    } else {
      result.nonCompliant.push('❌ Missing error recovery testing');
      this.addTodo(fileName, 'P1', 'Add error recovery testing', 
        `// TODO: Add error recovery testing to ${fileName}
// - Test error recovery mechanisms
// - Test fallback strategies
// - Test error handling logic
// - Test graceful degradation`);
    }

    // Async error testing
    const hasAsyncErrorTesting = /async.*error|promise.*rejection|reject.*promise|async.*exception/.test(content);
    if (hasAsyncErrorTesting) {
      result.compliant.push('✅ Tests async errors');
    } else {
      result.nonCompliant.push('❌ Missing async error testing');
      this.addTodo(fileName, 'P1', 'Add async error testing', 
        `// TODO: Add async error testing to ${fileName}
// - Test promise rejections
// - Test async error handling
// - Test async exception scenarios
// - Test async error propagation`);
    }

    result.score = (hasExceptionTesting ? 0.4 : 0) + 
                   (hasErrorRecoveryTesting ? 0.3 : 0) + 
                   (hasAsyncErrorTesting ? 0.3 : 0);

    this.results[fileName].compliance.errorHandling = result;
  }

  /**
   * Evaluate Input Validation
   */
  async evaluateInputValidation(fileName, content, context) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Invalid input testing
    const hasInvalidInputTesting = /invalid.*input|bad.*input|malformed.*input|wrong.*input/.test(content);
    if (hasInvalidInputTesting) {
      result.compliant.push('✅ Tests invalid inputs');
    } else {
      result.nonCompliant.push('❌ Missing invalid input testing');
      this.addTodo(fileName, 'P0', 'Add invalid input testing', 
        `// TODO: Add invalid input testing to ${fileName}
// - Test null/undefined inputs
// - Test wrong data types
// - Test malformed data
// - Test boundary conditions`);
    }

    // Boundary condition testing
    const hasBoundaryConditionTesting = /boundary.*condition|edge.*value|limit.*test|max.*min/.test(content);
    if (hasBoundaryConditionTesting) {
      result.compliant.push('✅ Tests boundary conditions');
    } else {
      result.nonCompliant.push('❌ Missing boundary condition testing');
      this.addTodo(fileName, 'P1', 'Add boundary condition testing', 
        `// TODO: Add boundary condition testing to ${fileName}
// - Test minimum values
// - Test maximum values
// - Test empty inputs
// - Test extreme values`);
    }

    // Type validation testing
    const hasTypeValidationTesting = /type.*validation|type.*check|typeof.*test|instanceof.*test/.test(content);
    if (hasTypeValidationTesting) {
      result.compliant.push('✅ Tests type validation');
    } else {
      result.nonCompliant.push('❌ Missing type validation testing');
      this.addTodo(fileName, 'P1', 'Add type validation testing', 
        `// TODO: Add type validation testing to ${fileName}
// - Test data type validation
// - Test type checking logic
// - Test type conversion
// - Test type safety`);
    }

    result.score = (hasInvalidInputTesting ? 0.4 : 0) + 
                   (hasBoundaryConditionTesting ? 0.3 : 0) + 
                   (hasTypeValidationTesting ? 0.3 : 0);

    this.results[fileName].compliance.inputValidation = result;
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

    // Test documentation
    const hasTestDocumentation = /test.*description|test.*comment|test.*documentation|test.*purpose/.test(content);
    if (hasTestDocumentation) {
      result.compliant.push('✅ Has test documentation');
    } else {
      result.nonCompliant.push('❌ Missing test documentation');
      this.addTodo(fileName, 'P1', 'Add test documentation', 
        `// TODO: Add test documentation to ${fileName}
// - Document test purpose and scope
// - Explain test scenarios
// - Document test assumptions
// - Include relevant comments`);
    }

    // Code comments
    const hasCodeComments = /\/\/.*test|\/\*.*test.*\*\/|comment.*test/.test(content);
    if (hasCodeComments) {
      result.compliant.push('✅ Has code comments');
    } else {
      result.nonCompliant.push('❌ Missing code comments');
      this.addTodo(fileName, 'P2', 'Add code comments', 
        `// TODO: Add code comments to ${fileName}
// - Add comments explaining complex test logic
// - Document test setup and teardown
// - Explain mock configurations
// - Document test data preparation`);
    }

    result.score = (hasTestDocumentation ? 0.6 : 0) + 
                   (hasCodeComments ? 0.4 : 0);

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
    console.log('\n📊 Unit Test Evaluation Report');
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
   * Evaluate all unit test files
   */
  async evaluateAllTests() {
    console.log('🔍 Evaluating all unit test files...');
    
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
  const evaluator = new UnitTestEvaluator();
  
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

module.exports = { UnitTestEvaluator }; 