#!/usr/bin/env node

/**
 * Comprehensive Test Evaluation Tool
 * 
 * This tool runs all three test evaluators and provides a unified report:
 * - E2E Test Evaluator (tests/e2e/)
 * - Integration Test Evaluator (tests/integration/)
 * - Unit Test Evaluator (tests/unit/)
 * 
 * Usage: node scripts/evaluate-all-tests.js [test-type] [test-file-path]
 * 
 * Examples:
 *   node scripts/evaluate-all-tests.js                    # Evaluate all tests
 *   node scripts/evaluate-all-tests.js e2e                # Evaluate all E2E tests
 *   node scripts/evaluate-all-tests.js integration        # Evaluate all integration tests
 *   node scripts/evaluate-all-tests.js unit               # Evaluate all unit tests
 *   node scripts/evaluate-all-tests.js e2e path/to/test   # Evaluate specific E2E test
 *   node scripts/evaluate-all-tests.js integration path   # Evaluate specific integration test
 *   node scripts/evaluate-all-tests.js unit path          # Evaluate specific unit test
 */

const fs = require('fs');
const path = require('path');

// Import evaluators
const { E2ETestEvaluator } = require('./evaluate-e2e-tests');
const { IntegrationTestEvaluator } = require('./evaluate-integration-tests');
const { UnitTestEvaluator } = require('./evaluate-unit-tests');

class ComprehensiveTestEvaluator {
  constructor() {
    this.e2eEvaluator = new E2ETestEvaluator();
    this.integrationEvaluator = new IntegrationTestEvaluator();
    this.unitEvaluator = new UnitTestEvaluator();
    this.results = {
      e2e: {},
      integration: {},
      unit: {}
    };
    this.allTodos = [];
  }

  /**
   * Evaluate all test types
   */
  async evaluateAllTests() {
    console.log('🔍 Comprehensive Test Evaluation');
    console.log('=' .repeat(50));

    // Evaluate E2E tests
    console.log('\n📱 Evaluating E2E Tests...');
    await this.evaluateE2ETests();

    // Evaluate Integration tests
    console.log('\n🔗 Evaluating Integration Tests...');
    await this.evaluateIntegrationTests();

    // Evaluate Unit tests
    console.log('\n🧪 Evaluating Unit Tests...');
    await this.evaluateUnitTests();

    // Generate comprehensive report
    this.generateComprehensiveReport();
  }

  /**
   * Evaluate E2E tests
   */
  async evaluateE2ETests() {
    const testFiles = this.e2eEvaluator.findTestFiles('tests/e2e');
    
    for (const testFile of testFiles) {
      await this.e2eEvaluator.evaluateTestFile(testFile);
    }
    
    this.results.e2e = this.e2eEvaluator.results;
    this.allTodos.push(...this.e2eEvaluator.todos);
  }

  /**
   * Evaluate Integration tests
   */
  async evaluateIntegrationTests() {
    const testFiles = this.integrationEvaluator.findTestFiles('tests/integration');
    
    for (const testFile of testFiles) {
      await this.integrationEvaluator.evaluateTestFile(testFile);
    }
    
    this.results.integration = this.integrationEvaluator.results;
    this.allTodos.push(...this.integrationEvaluator.todos);
  }

  /**
   * Evaluate Unit tests
   */
  async evaluateUnitTests() {
    const testFiles = this.unitEvaluator.findTestFiles('tests/unit');
    
    for (const testFile of testFiles) {
      await this.unitEvaluator.evaluateTestFile(testFile);
    }
    
    this.results.unit = this.unitEvaluator.results;
    this.allTodos.push(...this.unitEvaluator.todos);
  }

  /**
   * Evaluate specific test type
   */
  async evaluateTestType(testType) {
    console.log(`🔍 Evaluating ${testType.toUpperCase()} Tests...`);
    
    switch (testType.toLowerCase()) {
      case 'e2e':
        await this.evaluateE2ETests();
        break;
      case 'integration':
        await this.evaluateIntegrationTests();
        break;
      case 'unit':
        await this.evaluateUnitTests();
        break;
      default:
        console.error(`❌ Unknown test type: ${testType}`);
        console.log('Available types: e2e, integration, unit');
        return;
    }
    
    this.generateTestTypeReport(testType);
  }

  /**
   * Evaluate specific test file
   */
  async evaluateSpecificTest(testType, testFilePath) {
    console.log(`🔍 Evaluating ${testType.toUpperCase()} Test: ${testFilePath}`);
    
    let result;
    switch (testType.toLowerCase()) {
      case 'e2e':
        result = await this.e2eEvaluator.evaluateTestFile(testFilePath);
        this.e2eEvaluator.generateReport();
        break;
      case 'integration':
        result = await this.integrationEvaluator.evaluateTestFile(testFilePath);
        this.integrationEvaluator.generateReport();
        break;
      case 'unit':
        result = await this.unitEvaluator.evaluateTestFile(testFilePath);
        this.unitEvaluator.generateReport();
        break;
      default:
        console.error(`❌ Unknown test type: ${testType}`);
        console.log('Available types: e2e, integration, unit');
        return;
    }
    
    return result;
  }

  /**
   * Generate comprehensive report
   */
  generateComprehensiveReport() {
    console.log('\n📊 Comprehensive Test Evaluation Report');
    console.log('=' .repeat(60));

    // Summary by test type
    const e2eFiles = Object.keys(this.results.e2e).length;
    const integrationFiles = Object.keys(this.results.integration).length;
    const unitFiles = Object.keys(this.results.unit).length;
    const totalFiles = e2eFiles + integrationFiles + unitFiles;

    const e2eAvgScore = e2eFiles > 0 ? 
      Object.values(this.results.e2e).reduce((sum, result) => sum + result.score, 0) / e2eFiles : 0;
    const integrationAvgScore = integrationFiles > 0 ? 
      Object.values(this.results.integration).reduce((sum, result) => sum + result.score, 0) / integrationFiles : 0;
    const unitAvgScore = unitFiles > 0 ? 
      Object.values(this.results.unit).reduce((sum, result) => sum + result.score, 0) / unitFiles : 0;

    const overallAvgScore = totalFiles > 0 ? 
      (e2eAvgScore * e2eFiles + integrationAvgScore * integrationFiles + unitAvgScore * unitFiles) / totalFiles : 0;

    console.log('\n📈 Test Coverage Summary:');
    console.log(`  📱 E2E Tests: ${e2eFiles} files (${Math.round(e2eAvgScore)}% avg score)`);
    console.log(`  🔗 Integration Tests: ${integrationFiles} files (${Math.round(integrationAvgScore)}% avg score)`);
    console.log(`  🧪 Unit Tests: ${unitFiles} files (${Math.round(unitAvgScore)}% avg score)`);
    console.log(`  📊 Total Tests: ${totalFiles} files (${Math.round(overallAvgScore)}% overall avg score)`);

    // TODO breakdown by priority
    const p0Todos = this.allTodos.filter(todo => todo.priority === 'P0').length;
    const p1Todos = this.allTodos.filter(todo => todo.priority === 'P1').length;
    const p2Todos = this.allTodos.filter(todo => todo.priority === 'P2').length;

    console.log('\n🎯 TODO Breakdown by Priority:');
    console.log(`  🚨 P0 (Critical): ${p0Todos} issues`);
    console.log(`  ⚠️  P1 (High): ${p1Todos} issues`);
    console.log(`  📝 P2 (Medium): ${p2Todos} issues`);
    console.log(`  📊 Total: ${this.allTodos.length} issues`);

    // TODO breakdown by test type
    const e2eTodos = this.allTodos.filter(todo => 
      Object.keys(this.results.e2e).includes(path.basename(todo.file))
    );
    const integrationTodos = this.allTodos.filter(todo => 
      Object.keys(this.results.integration).includes(path.basename(todo.file))
    );
    const unitTodos = this.allTodos.filter(todo => 
      Object.keys(this.results.unit).includes(path.basename(todo.file))
    );

    console.log('\n📋 TODO Breakdown by Test Type:');
    console.log(`  📱 E2E Tests: ${e2eTodos.length} issues`);
    console.log(`  🔗 Integration Tests: ${integrationTodos.length} issues`);
    console.log(`  🧪 Unit Tests: ${unitTodos.length} issues`);

    // Top issues by category
    this.generateTopIssuesReport();

    // Recommendations
    this.generateRecommendations();
  }

  /**
   * Generate test type specific report
   */
  generateTestTypeReport(testType) {
    const results = this.results[testType];
    const todos = this.allTodos.filter(todo => 
      Object.keys(results).includes(path.basename(todo.file))
    );

    console.log(`\n📊 ${testType.toUpperCase()} Test Evaluation Report`);
    console.log('=' .repeat(50));

    const totalFiles = Object.keys(results).length;
    const avgScore = totalFiles > 0 ? 
      Object.values(results).reduce((sum, result) => sum + result.score, 0) / totalFiles : 0;

    console.log(`\n📈 Summary: ${totalFiles} files evaluated, ${Math.round(avgScore)}% average score`);
    console.log(`🎯 Total Issues: ${todos.length}`);

    // Show top 5 files by score
    const sortedFiles = Object.entries(results)
      .sort(([,a], [,b]) => b.score - a.score)
      .slice(0, 5);

    console.log('\n🏆 Top 5 Files by Score:');
    sortedFiles.forEach(([fileName, result], index) => {
      console.log(`  ${index + 1}. ${fileName}: ${result.score}%`);
    });

    // Show bottom 5 files by score
    const bottomFiles = Object.entries(results)
      .sort(([,a], [,b]) => a.score - b.score)
      .slice(0, 5);

    console.log('\n⚠️  Bottom 5 Files by Score:');
    bottomFiles.forEach(([fileName, result], index) => {
      console.log(`  ${index + 1}. ${fileName}: ${result.score}%`);
    });
  }

  /**
   * Generate top issues report
   */
  generateTopIssuesReport() {
    console.log('\n🚨 Top Issues by Category:');

    // Group TODOs by description keywords
    const issueCategories = {};
    
    this.allTodos.forEach(todo => {
      const keywords = todo.description.toLowerCase().split(' ').slice(0, 3).join(' ');
      if (!issueCategories[keywords]) {
        issueCategories[keywords] = [];
      }
      issueCategories[keywords].push(todo);
    });

    // Sort by frequency and priority
    const sortedCategories = Object.entries(issueCategories)
      .sort(([,a], [,b]) => {
        const aP0Count = a.filter(t => t.priority === 'P0').length;
        const bP0Count = b.filter(t => t.priority === 'P0').length;
        if (aP0Count !== bP0Count) return bP0Count - aP0Count;
        return b.length - a.length;
      })
      .slice(0, 10);

    sortedCategories.forEach(([category, todos], index) => {
      const p0Count = todos.filter(t => t.priority === 'P0').length;
      const p1Count = todos.filter(t => t.priority === 'P1').length;
      const p2Count = todos.filter(t => t.priority === 'P2').length;
      
      console.log(`  ${index + 1}. ${category}: ${todos.length} issues (P0: ${p0Count}, P1: ${p1Count}, P2: ${p2Count})`);
    });
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    console.log('\n🎯 Priority Recommendations:');

    // P0 recommendations
    const p0Todos = this.allTodos.filter(todo => todo.priority === 'P0');
    if (p0Todos.length > 0) {
      console.log('\n🚨 **P0 (Critical) - Immediate Action Required:**');
      const p0Categories = this.groupTodosByCategory(p0Todos);
      p0Categories.slice(0, 5).forEach(([category, todos]) => {
        console.log(`  • ${category}: ${todos.length} critical issues`);
      });
    }

    // P1 recommendations
    const p1Todos = this.allTodos.filter(todo => todo.priority === 'P1');
    if (p1Todos.length > 0) {
      console.log('\n⚠️  **P1 (High) - High Priority:**');
      const p1Categories = this.groupTodosByCategory(p1Todos);
      p1Categories.slice(0, 5).forEach(([category, todos]) => {
        console.log(`  • ${category}: ${todos.length} high priority issues`);
      });
    }

    // Test type recommendations
    console.log('\n📋 **Test Type Focus Areas:**');
    
    const e2eScore = Object.keys(this.results.e2e).length > 0 ? 
      Object.values(this.results.e2e).reduce((sum, result) => sum + result.score, 0) / Object.keys(this.results.e2e).length : 0;
    const integrationScore = Object.keys(this.results.integration).length > 0 ? 
      Object.values(this.results.integration).reduce((sum, result) => sum + result.score, 0) / Object.keys(this.results.integration).length : 0;
    const unitScore = Object.keys(this.results.unit).length > 0 ? 
      Object.values(this.results.unit).reduce((sum, result) => sum + result.score, 0) / Object.keys(this.results.unit).length : 0;

    const scores = [
      { type: 'E2E', score: e2eScore, count: Object.keys(this.results.e2e).length },
      { type: 'Integration', score: integrationScore, count: Object.keys(this.results.integration).length },
      { type: 'Unit', score: unitScore, count: Object.keys(this.results.unit).length }
    ].sort((a, b) => a.score - b.score);

    scores.forEach(({ type, score, count }) => {
      const status = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
      console.log(`  ${status} ${type} Tests: ${Math.round(score)}% (${count} files)`);
    });
  }

  /**
   * Group TODOs by category
   */
  groupTodosByCategory(todos) {
    const categories = {};
    
    todos.forEach(todo => {
      const category = todo.description.toLowerCase().split(' ').slice(0, 3).join(' ');
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(todo);
    });

    return Object.entries(categories)
      .sort(([,a], [,b]) => b.length - a.length);
  }
}

// Main execution
async function main() {
  const evaluator = new ComprehensiveTestEvaluator();
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Evaluate all tests
    await evaluator.evaluateAllTests();
  } else if (args.length === 1) {
    // Evaluate specific test type
    await evaluator.evaluateTestType(args[0]);
  } else if (args.length === 2) {
    // Evaluate specific test file
    await evaluator.evaluateSpecificTest(args[0], args[1]);
  } else {
    console.log('Usage: node scripts/evaluate-all-tests.js [test-type] [test-file-path]');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/evaluate-all-tests.js                    # Evaluate all tests');
    console.log('  node scripts/evaluate-all-tests.js e2e                # Evaluate all E2E tests');
    console.log('  node scripts/evaluate-all-tests.js integration        # Evaluate all integration tests');
    console.log('  node scripts/evaluate-all-tests.js unit               # Evaluate all unit tests');
    console.log('  node scripts/evaluate-all-tests.js e2e path/to/test   # Evaluate specific E2E test');
    console.log('  node scripts/evaluate-all-tests.js integration path   # Evaluate specific integration test');
    console.log('  node scripts/evaluate-all-tests.js unit path          # Evaluate specific unit test');
  }
}

// Run the evaluator
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ComprehensiveTestEvaluator }; 