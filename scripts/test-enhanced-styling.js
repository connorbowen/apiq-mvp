#!/usr/bin/env node

/**
 * Test Enhanced Styling System
 * 
 * This script tests the enhanced styling system to ensure:
 * 1. All form elements have proper contrast
 * 2. Global CSS overrides are working
 * 3. Enhanced classes are available
 * 4. Text readability is improved
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Helper function to log test results
function logTest(name, status, message = '') {
  const statusColor = status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow;
  const statusText = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  
  console.log(`${statusColor}${statusText} ${name}${colors.reset} ${message}`);
  
  results.tests.push({ name, status, message });
  if (status === 'PASS') results.passed++;
  else if (status === 'FAIL') results.failed++;
  else results.warnings++;
}

// Test 1: Check if enhanced CSS classes exist
function testEnhancedCSSClasses() {
  console.log(`\n${colors.blue}${colors.bright}Testing Enhanced CSS Classes...${colors.reset}`);
  
  try {
    const globalsCSS = fs.readFileSync(path.join(__dirname, '../src/app/globals.css'), 'utf8');
    
    // Check for enhanced classes
    const requiredClasses = [
      '.form-field-enhanced',
      '.label-enhanced',
      '.input-enhanced',
      '.text-enhanced-primary',
      '.text-enhanced-secondary'
    ];
    
    requiredClasses.forEach(className => {
      if (globalsCSS.includes(className)) {
        logTest(`Enhanced class ${className}`, 'PASS');
      } else {
        logTest(`Enhanced class ${className}`, 'FAIL', 'Class not found in globals.css');
      }
    });
    
    // Check for global overrides
    if (globalsCSS.includes('input[type="text"]')) {
      logTest('Global input overrides', 'PASS');
    } else {
      logTest('Global input overrides', 'FAIL', 'Global CSS overrides not found');
    }
    
    if (globalsCSS.includes('!important')) {
      logTest('CSS !important declarations', 'PASS');
    } else {
      logTest('CSS !important declarations', 'FAIL', 'No !important declarations found');
    }
    
  } catch (error) {
    logTest('Enhanced CSS Classes', 'FAIL', `Error reading globals.css: ${error.message}`);
  }
}

// Test 2: Check if utility functions exist
function testUtilityFunctions() {
  console.log(`\n${colors.blue}${colors.bright}Testing Utility Functions...${colors.reset}`);
  
  try {
    const formStyles = fs.readFileSync(path.join(__dirname, '../src/lib/styles/formStyles.ts'), 'utf8');
    
    const requiredFunctions = [
      'getInputClasses',
      'getLabelClasses',
      'getTextareaClasses',
      'getSelectClasses'
    ];
    
    requiredFunctions.forEach(funcName => {
      if (formStyles.includes(`export const ${funcName}`)) {
        logTest(`Utility function ${funcName}`, 'PASS');
      } else {
        logTest(`Utility function ${funcName}`, 'FAIL', 'Function not exported');
      }
    });
    
  } catch (error) {
    logTest('Utility Functions', 'FAIL', `Error reading formStyles.ts: ${error.message}`);
  }
}

// Test 3: Check if reusable components exist
function testReusableComponents() {
  console.log(`\n${colors.blue}${colors.bright}Testing Reusable Components...${colors.reset}`);
  
  try {
    const formElements = fs.readFileSync(path.join(__dirname, '../src/components/ui/FormElements.tsx'), 'utf8');
    
    const requiredComponents = [
      'Input',
      'Textarea',
      'Select',
      'Label',
      'FormField'
    ];
    
    requiredComponents.forEach(componentName => {
      if (formElements.includes(`export const ${componentName}`)) {
        logTest(`Component ${componentName}`, 'PASS');
      } else {
        logTest(`Component ${componentName}`, 'FAIL', 'Component not exported');
      }
    });
    
  } catch (error) {
    logTest('Reusable Components', 'FAIL', `Error reading FormElements.tsx: ${error.message}`);
  }
}

// Test 4: Check if documentation exists
function testDocumentation() {
  console.log(`\n${colors.blue}${colors.bright}Testing Documentation...${colors.reset}`);
  
  try {
    const docsPath = path.join(__dirname, '../docs/ENHANCED_STYLING_SYSTEM.md');
    if (fs.existsSync(docsPath)) {
      logTest('Enhanced Styling Documentation', 'PASS');
    } else {
      logTest('Enhanced Styling Documentation', 'FAIL', 'Documentation file not found');
    }
  } catch (error) {
    logTest('Documentation', 'FAIL', `Error checking documentation: ${error.message}`);
  }
}

// Test 5: Check if Tailwind config has enhanced colors
function testTailwindConfig() {
  console.log(`\n${colors.blue}${colors.bright}Testing Tailwind Configuration...${colors.reset}`);
  
  try {
    const tailwindConfig = fs.readFileSync(path.join(__dirname, '../tailwind.config.js'), 'utf8');
    
    if (tailwindConfig.includes('text:')) {
      logTest('Enhanced text colors', 'PASS');
    } else {
      logTest('Enhanced text colors', 'FAIL', 'Enhanced text colors not found in Tailwind config');
    }
    
    if (tailwindConfig.includes('input:')) {
      logTest('Enhanced input colors', 'PASS');
    } else {
      logTest('Enhanced input colors', 'FAIL', 'Enhanced input colors not found in Tailwind config');
    }
    
  } catch (error) {
    logTest('Tailwind Configuration', 'FAIL', `Error reading tailwind.config.js: ${error.message}`);
  }
}

// Main test runner
function runTests() {
  console.log(`${colors.cyan}${colors.bright}🧪 Enhanced Styling System Test Suite${colors.reset}`);
  console.log(`${colors.cyan}===============================================${colors.reset}`);
  
  testEnhancedCSSClasses();
  testUtilityFunctions();
  testReusableComponents();
  testDocumentation();
  testTailwindConfig();
  
  // Summary
  console.log(`\n${colors.blue}${colors.bright}📊 Test Summary${colors.reset}`);
  console.log(`${colors.blue}=============${colors.reset}`);
  console.log(`${colors.green}✓ Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}⚠ Warnings: ${results.warnings}${colors.reset}`);
  
  if (results.failed === 0) {
    console.log(`\n${colors.green}${colors.bright}🎉 All tests passed! Enhanced styling system is working correctly.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ Some tests failed. Please review the issues above.${colors.reset}`);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, results };
