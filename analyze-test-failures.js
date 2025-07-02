#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ANSI color codes for better output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function analyzeTestFailures() {
  const jsonPath = path.join(__dirname, 'jest-int-summary.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`${colors.red}Error: jest-int-summary.json not found in current directory${colors.reset}`);
    console.log(`Current directory: ${__dirname}`);
    console.log(`Expected file: ${jsonPath}`);
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // Debug: log the structure
    console.log('JSON structure keys:', Object.keys(data));
    
    // Extract test results
    const testResults = data.testResults || [];
    
    // Analyze each test suite
    const suiteAnalysis = testResults.map(suite => {
      // Use testFilePath if available, otherwise fallback to suite.name
      const suitePath = suite.testFilePath || suite.name || 'unknown';
      const suiteName = (suitePath && typeof suitePath === 'string')
        ? path.basename(suitePath, path.extname(suitePath))
        : (suite.name || 'unknown');
      const totalTests = (suite.numPassingTests || 0) + (suite.numFailingTests || 0) + (suite.numPendingTests || 0);
      const failingTests = suite.numFailingTests || 0;
      const passingTests = suite.numPassingTests || 0;
      
      // Extract first error message from failing tests
      let firstError = '';
      if (failingTests > 0 && suite.testResults) {
        const failedTest = suite.testResults.find(test => test.status === 'failed');
        if (failedTest && failedTest.failureMessages && failedTest.failureMessages.length > 0) {
          const errorMsg = failedTest.failureMessages[0];
          firstError = errorMsg.split('\n')[0]; // First line only
          if (firstError.length > 80) {
            firstError = firstError.substring(0, 77) + '...';
          }
        }
      }
      
      return {
        suitePath,
        suiteName,
        totalTests,
        failingTests,
        passingTests,
        firstError,
        failureRate: totalTests > 0 ? (failingTests / totalTests * 100).toFixed(1) : 0
      };
    });
    
    // Filter to only failing suites and sort by failure count (descending)
    const failingSuites = suiteAnalysis
      .filter(suite => suite.failingTests > 0)
      .sort((a, b) => b.failingTests - a.failingTests);
    
    if (failingSuites.length === 0) {
      console.log(`${colors.green}${colors.bold}🎉 All test suites are passing!${colors.reset}`);
      return;
    }
    
    // Display summary
    console.log(`${colors.bold}${colors.blue}Test Failure Analysis${colors.reset}`);
    console.log(`${colors.cyan}Found ${failingSuites.length} failing test suites${colors.reset}\n`);
    
    // Create table header
    const header = [
      'Rank',
      'Suite Name',
      'Failed',
      'Passed',
      'Total',
      'Failure %',
      'First Error'
    ];
    
    // Calculate column widths
    const colWidths = {
      rank: 4,
      name: Math.max(...failingSuites.map(s => s.suiteName.length), header[1].length),
      failed: 6,
      passed: 6,
      total: 5,
      rate: 8,
      error: Math.max(...failingSuites.map(s => s.firstError.length), header[6].length)
    };
    
    // Print header
    console.log(`${colors.bold}${'─'.repeat(Object.values(colWidths).reduce((a, b) => a + b + 3, 0))}${colors.reset}`);
    console.log(
      `${colors.bold}${header[0].padEnd(colWidths.rank)} │ ${header[1].padEnd(colWidths.name)} │ ${header[2].padEnd(colWidths.failed)} │ ${header[3].padEnd(colWidths.passed)} │ ${header[4].padEnd(colWidths.total)} │ ${header[5].padEnd(colWidths.rate)} │ ${header[6].padEnd(colWidths.error)}${colors.reset}`
    );
    console.log(`${colors.bold}${'─'.repeat(Object.values(colWidths).reduce((a, b) => a + b + 3, 0))}${colors.reset}`);
    
    // Print each failing suite
    failingSuites.slice(0, 15).forEach((suite, index) => {
      const rank = (index + 1).toString().padEnd(colWidths.rank);
      const name = suite.suiteName.padEnd(colWidths.name);
      const failed = suite.failingTests.toString().padEnd(colWidths.failed);
      const passed = suite.passingTests.toString().padEnd(colWidths.passed);
      const total = suite.totalTests.toString().padEnd(colWidths.total);
      const rate = `${suite.failureRate}%`.padEnd(colWidths.rate);
      const error = suite.firstError.padEnd(colWidths.error);
      
      // Color code based on failure rate
      const failureColor = suite.failureRate > 50 ? colors.red : 
                          suite.failureRate > 25 ? colors.yellow : colors.cyan;
      
      console.log(
        `${rank} │ ${name} │ ${failureColor}${failed}${colors.reset} │ ${colors.green}${passed}${colors.reset} │ ${total} │ ${failureColor}${rate}${colors.reset} │ ${colors.magenta}${error}${colors.reset}`
      );
    });
    
    console.log(`${colors.bold}${'─'.repeat(Object.values(colWidths).reduce((a, b) => a + b + 3, 0))}${colors.reset}`);
    
    // Summary statistics
    const totalFailingTests = failingSuites.reduce((sum, suite) => sum + suite.failingTests, 0);
    const totalTests = failingSuites.reduce((sum, suite) => sum + suite.totalTests, 0);
    const overallFailureRate = totalTests > 0 ? (totalFailingTests / totalTests * 100).toFixed(1) : 0;
    
    console.log(`\n${colors.bold}Summary:${colors.reset}`);
    console.log(`  • Total failing tests: ${colors.red}${totalFailingTests}${colors.reset}`);
    console.log(`  • Overall failure rate: ${colors.red}${overallFailureRate}%${colors.reset}`);
    console.log(`  • Top 15 suites shown (${failingSuites.length} total failing suites)`);
    
    // Recommendations
    console.log(`\n${colors.bold}${colors.yellow}Recommended Action Order:${colors.reset}`);
    console.log(`  1. Fix suites with highest failure counts first (Pareto principle)`);
    console.log(`  2. Address timeout/deadlock issues (likely transaction problems)`);
    console.log(`  3. Replace raw Prisma calls with test utilities`);
    console.log(`  4. Fix hardcoded test data violations`);
    
  } catch (error) {
    console.error(`${colors.red}Error parsing JSON file:${colors.reset}`, error.message);
  }
}

// Run the analysis
analyzeTestFailures(); 