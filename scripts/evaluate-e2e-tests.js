#!/usr/bin/env node

/**
 * E2E Test Evaluation Tool
 * 
 * This tool evaluates E2E test files against the project's documentation standards:
 * - PRD.md compliance (core feature coverage, success/failure scenarios)
 * - Implementation Plan compliance (P0/P1/P2 priorities, real data usage)
 * - UX_SPEC.md compliance (primary action patterns, accessibility, mobile responsiveness)
 * - Testing Best Practices (UXComplianceHelper usage, real authentication)
 * - Edge Cases & Security (error scenarios, security validation)
 * 
 * Usage: node scripts/evaluate-e2e-tests.js [test-file-path]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const TEST_DIR = 'tests/e2e';
const DOCS_DIR = 'docs';
const SRC_DIR = 'src';

// Evaluation criteria weights
const CRITERIA_WEIGHTS = {
  prdCompliance: 0.25,
  implementationPlanCompliance: 0.20,
  uxSpecCompliance: 0.25,
  testingBestPractices: 0.20,
  edgeCasesSecurity: 0.10
};

class E2ETestEvaluator {
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
    await this.evaluatePRDCompliance(fileName, content);
    await this.evaluateImplementationPlanCompliance(fileName, content);
    await this.evaluateUXSpecCompliance(fileName, content);
    await this.evaluateTestingBestPractices(fileName, content);
    await this.evaluateEdgeCasesSecurity(fileName, content);

    // Calculate overall score
    this.calculateOverallScore(fileName);
    
    // Generate recommendations
    this.generateRecommendations(fileName);
    
    return this.results[fileName];
  }

  /**
   * Evaluate PRD.md compliance
   */
  async evaluatePRDCompliance(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Core feature coverage
    const coreFeatures = [
      'natural language workflow creation',
      'workflow execution engine',
      'api connection management',
      'secrets vault',
      'authentication flows',
      'dashboard functionality'
    ];

    let featureCoverage = 0;
    coreFeatures.forEach(feature => {
      if (content.toLowerCase().includes(feature.replace(/\s+/g, '')) || 
          content.toLowerCase().includes(feature)) {
        featureCoverage++;
        result.compliant.push(`✅ Tests ${feature}`);
      } else {
        result.nonCompliant.push(`❌ Missing ${feature} testing`);
      }
    });

    // Success/failure scenarios
    const hasSuccessScenarios = /expect.*toBeVisible|expect.*toHaveText|expect.*toHaveURL/.test(content);
    const hasFailureScenarios = /error|invalid|failed|timeout/.test(content);
    
    if (hasSuccessScenarios) {
      result.compliant.push('✅ Tests success scenarios');
    } else {
      result.nonCompliant.push('❌ Missing success scenario testing');
    }

    if (hasFailureScenarios) {
      result.compliant.push('✅ Tests failure scenarios');
    } else {
      result.nonCompliant.push('❌ Missing failure scenario testing');
    }

    // Performance requirements
    const hasPerformanceTesting = /timeout|performance|load|speed/.test(content);
    if (hasPerformanceTesting) {
      result.compliant.push('✅ Includes performance testing');
    } else {
      result.nonCompliant.push('❌ Missing performance testing');
    }

    // Business logic validation
    const hasBusinessLogic = /workflow|connection|secret|user|authentication/.test(content);
    if (hasBusinessLogic) {
      result.compliant.push('✅ Tests business logic');
    } else {
      result.nonCompliant.push('❌ Missing business logic validation');

      // Add TODO for business logic testing
      this.addTodo(fileName, 'P0', 'Add business logic validation tests', 
        `// TODO: Add business logic validation tests for ${fileName}
// - Test workflow creation and execution
// - Test API connection management
// - Test secrets vault operations
// - Test user authentication flows`);
    }

    result.score = (featureCoverage / coreFeatures.length) * 0.4 + 
                   (hasSuccessScenarios ? 0.3 : 0) + 
                   (hasFailureScenarios ? 0.2 : 0) + 
                   (hasPerformanceTesting ? 0.1 : 0);

    this.results[fileName].compliance.prdCompliance = result;
  }

  /**
   * Evaluate Implementation Plan compliance
   */
  async evaluateImplementationPlanCompliance(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // P0/P1/P2 feature coverage
    const p0Features = ['authentication', 'workflow', 'connection', 'secret'];
    const p1Features = ['oauth2', 'dashboard', 'monitoring'];
    const p2Features = ['admin', 'audit', 'performance'];

    let p0Coverage = 0;
    p0Features.forEach(feature => {
      if (content.toLowerCase().includes(feature)) {
        p0Coverage++;
        result.compliant.push(`✅ Tests P0 feature: ${feature}`);
      }
    });

    // Real data usage (no mocking)
    const hasRealData = !content.includes('mock') && !content.includes('jest.mock') && 
                       !content.includes('vi.mock') && !content.includes('cy.stub');
    
    if (hasRealData) {
      result.compliant.push('✅ Uses real data (no mocking)');
    } else {
      result.nonCompliant.push('❌ Uses mocked data (violates no-mock-data policy)');
      
      // Add TODO for real data usage
      this.addTodo(fileName, 'P0', 'Replace mocked data with real data', 
        `// TODO: Replace mocked data with real data in ${fileName}
// - Use real authentication tokens
// - Use real API endpoints
// - Use real database operations
// - Remove all jest.mock() and vi.mock() calls`);
    }

    // Error handling and edge cases
    const hasErrorHandling = /try.*catch|error.*handling|edge.*case/.test(content);
    if (hasErrorHandling) {
      result.compliant.push('✅ Tests error handling and edge cases');
    } else {
      result.nonCompliant.push('❌ Missing error handling and edge case testing');
      
      // Add TODO for error handling
      this.addTodo(fileName, 'P1', 'Add comprehensive error handling tests', 
        `// TODO: Add comprehensive error handling tests for ${fileName}
// - Test network failures
// - Test invalid input scenarios
// - Test timeout scenarios
// - Test rate limiting scenarios`);
    }

    // Integration with other features
    const hasIntegration = /beforeEach|afterEach|setup|teardown/.test(content);
    if (hasIntegration) {
      result.compliant.push('✅ Tests integration with other features');
    } else {
      result.nonCompliant.push('❌ Missing integration testing');
    }

    result.score = (p0Coverage / p0Features.length) * 0.5 + 
                   (hasRealData ? 0.3 : 0) + 
                   (hasErrorHandling ? 0.2 : 0);

    this.results[fileName].compliance.implementationPlanCompliance = result;
  }

  /**
   * Evaluate UX_SPEC.md compliance
   */
  async evaluateUXSpecCompliance(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Primary action button patterns
    const hasPrimaryActionPatterns = /data-testid.*primary-action/.test(content);
    if (hasPrimaryActionPatterns) {
      result.compliant.push('✅ Uses primary action button patterns');
    } else {
      result.nonCompliant.push('❌ Missing primary action button patterns');
      
      // Add TODO for primary action patterns
      this.addTodo(fileName, 'P0', 'Add primary action button patterns', 
        `// TODO: Add primary action button patterns to ${fileName}
// - Use data-testid="primary-action {action}-btn" pattern
// - Test primary action presence with UXComplianceHelper
// - Validate button text matches standardized patterns`);
    }

    // Form accessibility
    const hasFormAccessibility = /getByLabel|getByRole.*button|aria-required|aria-label/.test(content);
    if (hasFormAccessibility) {
      result.compliant.push('✅ Tests form accessibility');
    } else {
      result.nonCompliant.push('❌ Missing form accessibility testing');
      
      // Add TODO for form accessibility
      this.addTodo(fileName, 'P0', 'Add form accessibility testing', 
        `// TODO: Add form accessibility testing to ${fileName}
// - Test form labels and ARIA attributes
// - Test keyboard navigation
// - Test screen reader compatibility
// - Use UXComplianceHelper.validateFormAccessibility()`);
    }

    // Error/success message containers
    const hasMessageContainers = /data-testid.*error|data-testid.*success|role.*alert/.test(content);
    if (hasMessageContainers) {
      result.compliant.push('✅ Tests error/success message containers');
    } else {
      result.nonCompliant.push('❌ Missing error/success message container testing');
    }

    // Loading states and feedback
    const hasLoadingStates = /loading|spinner|waitFor|timeout/.test(content);
    if (hasLoadingStates) {
      result.compliant.push('✅ Tests loading states and feedback');
    } else {
      result.nonCompliant.push('❌ Missing loading state testing');
    }

    // Mobile responsiveness
    const hasMobileTesting = /mobile|responsive|viewport|touch/.test(content);
    if (hasMobileTesting) {
      result.compliant.push('✅ Tests mobile responsiveness');
    } else {
      result.nonCompliant.push('❌ Missing mobile responsiveness testing');
      
      // Add TODO for mobile testing
      this.addTodo(fileName, 'P1', 'Add mobile responsiveness testing', 
        `// TODO: Add mobile responsiveness testing to ${fileName}
// - Test mobile viewport (375x667)
// - Test touch interactions
// - Test responsive layout
// - Use UXComplianceHelper.validateMobileResponsiveness()`);
    }

    // Keyboard navigation
    const hasKeyboardNavigation = /keyboard|tab|focus|navigation/.test(content);
    if (hasKeyboardNavigation) {
      result.compliant.push('✅ Tests keyboard navigation');
    } else {
      result.nonCompliant.push('❌ Missing keyboard navigation testing');
      
      // Add TODO for keyboard navigation
      this.addTodo(fileName, 'P1', 'Add keyboard navigation testing', 
        `// TODO: Add keyboard navigation testing to ${fileName}
// - Test tab navigation
// - Test focus management
// - Test keyboard shortcuts
// - Use UXComplianceHelper.validateKeyboardNavigation()`);
    }

    // Screen reader compatibility
    const hasScreenReaderTesting = /screen.*reader|aria|semantic/.test(content);
    if (hasScreenReaderTesting) {
      result.compliant.push('✅ Tests screen reader compatibility');
    } else {
      result.nonCompliant.push('❌ Missing screen reader compatibility testing');
      
      // Add TODO for screen reader testing
      this.addTodo(fileName, 'P1', 'Add screen reader compatibility testing', 
        `// TODO: Add screen reader compatibility testing to ${fileName}
// - Test ARIA landmarks and roles
// - Test semantic HTML structure
// - Test screen reader announcements
// - Use UXComplianceHelper.validateScreenReaderCompatibility()`);
    }

    result.score = (hasPrimaryActionPatterns ? 0.3 : 0) + 
                   (hasFormAccessibility ? 0.25 : 0) + 
                   (hasMessageContainers ? 0.15 : 0) + 
                   (hasLoadingStates ? 0.15 : 0) + 
                   (hasMobileTesting ? 0.1 : 0) + 
                   (hasKeyboardNavigation ? 0.05 : 0);

    this.results[fileName].compliance.uxSpecCompliance = result;
  }

  /**
   * Evaluate Testing Best Practices
   */
  async evaluateTestingBestPractices(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // UXComplianceHelper usage
    const hasUXComplianceHelper = /UXComplianceHelper|uxHelper/.test(content);
    if (hasUXComplianceHelper) {
      result.compliant.push('✅ Uses UXComplianceHelper');
    } else {
      result.nonCompliant.push('❌ Missing UXComplianceHelper usage');
      
      // Add TODO for UXComplianceHelper
      this.addTodo(fileName, 'P0', 'Add UXComplianceHelper integration', 
        `// TODO: Add UXComplianceHelper integration to ${fileName}
// import { UXComplianceHelper } from '../../helpers/uxCompliance';
// 
// test.beforeEach(async ({ page }) => {
//   const uxHelper = new UXComplianceHelper(page);
//   await uxHelper.validateActivationFirstUX();
//   await uxHelper.validateFormAccessibility();
//   await uxHelper.validateMobileResponsiveness();
//   await uxHelper.validateKeyboardNavigation();
// });`);
    }

    // Real authentication
    const hasRealAuth = /jwt|token|localStorage|session|login/.test(content);
    if (hasRealAuth) {
      result.compliant.push('✅ Uses real authentication');
    } else {
      result.nonCompliant.push('❌ Missing real authentication testing');
    }

    // Database operations
    const hasDatabaseOps = /prisma|database|createTestData|cleanup/.test(content);
    if (hasDatabaseOps) {
      result.compliant.push('✅ Uses real database operations');
    } else {
      result.nonCompliant.push('❌ Missing real database operations');
    }

    // Proper cleanup and test isolation
    const hasCleanup = /afterEach|afterAll|cleanup|deleteMany/.test(content);
    if (hasCleanup) {
      result.compliant.push('✅ Has proper cleanup and test isolation');
    } else {
      result.nonCompliant.push('❌ Missing proper cleanup and test isolation');
      
      // Add TODO for cleanup
      this.addTodo(fileName, 'P1', 'Add proper cleanup and test isolation', 
        `// TODO: Add proper cleanup and test isolation to ${fileName}
// test.afterEach(async () => {
//   // Clean up test data
//   await prisma.user.deleteMany({ where: { email: { contains: 'e2e-test' } } });
//   await prisma.connection.deleteMany({ where: { name: { contains: 'Test' } } });
//   await prisma.workflow.deleteMany({ where: { name: { contains: 'Test' } } });
// });`);
    }

    // Clear test descriptions
    const hasClearDescriptions = /should.*test|should.*validate|should.*complete/.test(content);
    if (hasClearDescriptions) {
      result.compliant.push('✅ Has clear test descriptions');
    } else {
      result.nonCompliant.push('❌ Missing clear test descriptions');
    }

    // Appropriate timeouts and retry logic
    const hasTimeouts = /timeout|retry|waitFor|setTimeout/.test(content);
    if (hasTimeouts) {
      result.compliant.push('✅ Has appropriate timeouts and retry logic');
    } else {
      result.nonCompliant.push('❌ Missing appropriate timeouts and retry logic');
      
      // Add TODO for timeouts
      this.addTodo(fileName, 'P1', 'Add appropriate timeouts and retry logic', 
        `// TODO: Add appropriate timeouts and retry logic to ${fileName}
// test.setTimeout(30000); // 30 seconds for complex operations
// await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
// await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });`);
    }

    result.score = (hasUXComplianceHelper ? 0.3 : 0) + 
                   (hasRealAuth ? 0.25 : 0) + 
                   (hasDatabaseOps ? 0.2 : 0) + 
                   (hasCleanup ? 0.15 : 0) + 
                   (hasTimeouts ? 0.1 : 0);

    this.results[fileName].compliance.testingBestPractices = result;
  }

  /**
   * Evaluate Edge Cases & Security
   */
  async evaluateEdgeCasesSecurity(fileName, content) {
    const result = {
      score: 0,
      compliant: [],
      nonCompliant: [],
      required: []
    };

    // Error scenarios and failure modes
    const hasErrorScenarios = /error|invalid|failed|exception|timeout/.test(content);
    if (hasErrorScenarios) {
      result.compliant.push('✅ Tests error scenarios and failure modes');
    } else {
      result.nonCompliant.push('❌ Missing error scenario testing');
      
      // Add TODO for error scenarios
      this.addTodo(fileName, 'P0', 'Add error scenario testing', 
        `// TODO: Add error scenario testing to ${fileName}
// - Test invalid input validation
// - Test network failure scenarios
// - Test timeout scenarios
// - Test rate limiting scenarios
// - Test authentication failure scenarios`);
    }

    // Security validation
    const hasSecurityValidation = /permission|access|authorization|security|encryption/.test(content);
    if (hasSecurityValidation) {
      result.compliant.push('✅ Tests security validation');
    } else {
      result.nonCompliant.push('❌ Missing security validation testing');
      
      // Add TODO for security validation
      this.addTodo(fileName, 'P0', 'Add security validation testing', 
        `// TODO: Add security validation testing to ${fileName}
// - Test permission checks
// - Test access control
// - Test input validation
// - Test authentication requirements
// - Test encryption validation`);
    }

    // Network failures and timeouts
    const hasNetworkTesting = /network|timeout|retry|offline/.test(content);
    if (hasNetworkTesting) {
      result.compliant.push('✅ Tests network failures and timeouts');
    } else {
      result.nonCompliant.push('❌ Missing network failure testing');
    }

    // Data integrity and race conditions
    const hasDataIntegrity = /race|concurrent|integrity|consistency/.test(content);
    if (hasDataIntegrity) {
      result.compliant.push('✅ Tests data integrity and race conditions');
    } else {
      result.nonCompliant.push('❌ Missing data integrity testing');
    }

    result.score = (hasErrorScenarios ? 0.4 : 0) + 
                   (hasSecurityValidation ? 0.4 : 0) + 
                   (hasNetworkTesting ? 0.1 : 0) + 
                   (hasDataIntegrity ? 0.1 : 0);

    this.results[fileName].compliance.edgeCasesSecurity = result;
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
   * Implement TODOs in the test file
   */
  async implementTodos(testFilePath) {
    const fileName = path.basename(testFilePath);
    const fileTodos = this.todos.filter(todo => todo.file === fileName);
    
    if (fileTodos.length === 0) {
      console.log(`✅ No TODOs to implement for ${fileName}`);
      return;
    }

    console.log(`🔧 Implementing ${fileTodos.length} TODOs for ${fileName}`);
    
    let content = fs.readFileSync(testFilePath, 'utf8');
    
    // Sort TODOs by priority (P0 first, then P1, then P2)
    const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2 };
    fileTodos.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Add TODOs to the file
    fileTodos.forEach(todo => {
      const todoComment = `\n${todo.code}\n`;
      
      // Add TODO at the end of the file
      content += todoComment;
      
      console.log(`  ✅ Added ${todo.priority} TODO: ${todo.description}`);
    });

    // Write the updated content back to the file
    fs.writeFileSync(testFilePath, content);
    console.log(`✅ Updated ${testFilePath} with ${fileTodos.length} TODOs`);
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('\n📊 E2E Test Evaluation Report');
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
      if (result.compliance.prdCompliance?.compliant.length > 0) {
        console.log('\n✅ Compliant Areas:');
        result.compliance.prdCompliance.compliant.forEach(item => {
          console.log(`  ${item}`);
        });
      }

      // Show non-compliant areas
      if (result.compliance.prdCompliance?.nonCompliant.length > 0) {
        console.log('\n❌ Non-Compliant Areas:');
        result.compliance.prdCompliance.nonCompliant.forEach(item => {
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
   * Evaluate all E2E test files
   */
  async evaluateAllTests() {
    console.log('🔍 Evaluating all E2E test files...');
    
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
  const evaluator = new E2ETestEvaluator();
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Evaluate all test files
    await evaluator.evaluateAllTests();
  } else {
    // Evaluate specific test file
    const testFilePath = args[0];
    await evaluator.evaluateTestFile(testFilePath);
    evaluator.generateReport();
    
    // Ask if user wants to implement TODOs
    if (evaluator.todos.length > 0) {
      console.log('\n🔧 Would you like to implement the TODOs? (y/n)');
      process.stdin.once('data', async (data) => {
        const answer = data.toString().trim().toLowerCase();
        if (answer === 'y' || answer === 'yes') {
          await evaluator.implementTodos(testFilePath);
        }
        process.exit(0);
      });
    }
  }
}

// Run the evaluator
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { E2ETestEvaluator }; 