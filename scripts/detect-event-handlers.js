#!/usr/bin/env node

/**
 * Event Handler Detection CLI Tool
 * 
 * Command-line tool for detecting conflicting event handlers
 * and validating form submission patterns.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
  srcDir: 'src',
  testDir: 'tests',
  outputDir: 'event-handler-detection-results',
  includePatterns: ['**/*.tsx', '**/*.ts'],
  excludePatterns: ['**/*.test.*', '**/*.spec.*', '**/node_modules/**'],
  failOnCritical: true,
  failOnHigh: true,
  warnOnMedium: true,
  generateReport: true
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

// Logging functions
function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Event handler detection patterns
const patterns = {
  onSubmit: /onSubmit\s*=\s*{/g,
  onClick: /onClick\s*=\s*{/g,
  onKeyDown: /onKeyDown\s*=\s*{/g,
  onKeyPress: /onKeyPress\s*=\s*{/g,
  preventDefault: /preventDefault\(\)/g,
  stopPropagation: /stopPropagation\(\)/g,
  formElement: /<form[^>]*>/g,
  submitButton: /<button[^>]*type\s*=\s*["']submit["'][^>]*>/g,
  dataTestId: /data-testid\s*=\s*["'][^"']*["']/g,
  primaryAction: /data-testid\s*=\s*["'][^"']*primary-action[^"']*["']/g
};

// Detection results
let results = {
  files: [],
  conflicts: [],
  recommendations: [],
  summary: {
    totalFiles: 0,
    filesWithConflicts: 0,
    criticalConflicts: 0,
    highConflicts: 0,
    mediumConflicts: 0,
    lowConflicts: 0
  }
};

/**
 * Scans a file for event handler conflicts
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    
    const fileResult = {
      path: relativePath,
      conflicts: [],
      hasOnSubmit: false,
      hasOnClick: false,
      hasFormElement: false,
      hasSubmitButton: false,
      hasDataTestId: false,
      hasPrimaryAction: false,
      hasPreventDefault: false,
      hasStopPropagation: false
    };

    // Check for event handlers
    fileResult.hasOnSubmit = patterns.onSubmit.test(content);
    fileResult.hasOnClick = patterns.onClick.test(content);
    fileResult.hasFormElement = patterns.formElement.test(content);
    fileResult.hasSubmitButton = patterns.submitButton.test(content);
    fileResult.hasDataTestId = patterns.dataTestId.test(content);
    fileResult.hasPrimaryAction = patterns.primaryAction.test(content);
    fileResult.hasPreventDefault = patterns.preventDefault.test(content);
    fileResult.hasStopPropagation = patterns.stopPropagation.test(content);

    // Detect conflicts - only flag if there are actual conflicting handlers on form elements
    if (fileResult.hasOnSubmit && fileResult.hasOnClick && fileResult.hasFormElement) {
      // Check if there are actual conflicting patterns (onSubmit on form + onClick on submit button)
      const hasFormOnSubmit = content.includes('<form') && content.includes('onSubmit=');
      const hasSubmitButtonOnClick = content.includes('type="submit"') && content.includes('onClick=');
      
      // Also check for onClick handlers that might conflict with form submission
      const hasConflictingOnClick = content.includes('onClick=') && 
        (content.includes('form.requestSubmit') || content.includes('form.submit') || content.includes('handleSubmit'));
      
      if ((hasFormOnSubmit && hasSubmitButtonOnClick) || hasConflictingOnClick) {
        fileResult.conflicts.push({
          type: 'onSubmit + onClick conflict',
          severity: 'critical',
          message: 'Form has both onSubmit and onClick handlers which can cause conflicts',
          recommendation: 'Use formSubmissionUtils.createFormSubmissionHandler() to handle form submission consistently'
        });
      }
    }

    if (fileResult.hasFormElement && !fileResult.hasDataTestId) {
      fileResult.conflicts.push({
        type: 'Missing data-testid',
        severity: 'medium',
        message: 'Form element missing data-testid attribute',
        recommendation: 'Add data-testid attribute to form for reliable testing'
      });
    }

    if (fileResult.hasSubmitButton && !fileResult.hasPrimaryAction) {
      fileResult.conflicts.push({
        type: 'Missing primary-action data-testid',
        severity: 'medium',
        message: 'Submit button missing primary-action data-testid',
        recommendation: 'Add data-testid="primary-action {action}-btn" to submit button'
      });
    }

    if (fileResult.hasOnSubmit && !fileResult.hasPreventDefault) {
      fileResult.conflicts.push({
        type: 'Missing preventDefault',
        severity: 'high',
        message: 'onSubmit handler missing preventDefault() call',
        recommendation: 'Add e.preventDefault() to onSubmit handler to prevent default form submission'
      });
    }

    if (fileResult.hasOnSubmit && !fileResult.hasStopPropagation) {
      fileResult.conflicts.push({
        type: 'Missing stopPropagation',
        severity: 'medium',
        message: 'onSubmit handler missing stopPropagation() call',
        recommendation: 'Add e.stopPropagation() to onSubmit handler to prevent event bubbling'
      });
    }

    // Update summary
    results.summary.totalFiles++;
    if (fileResult.conflicts.length > 0) {
      results.summary.filesWithConflicts++;
      fileResult.conflicts.forEach(conflict => {
        results.summary[`${conflict.severity}Conflicts`]++;
        results.conflicts.push({
          file: relativePath,
          ...conflict
        });
      });
    }

    results.files.push(fileResult);
    return fileResult;

  } catch (error) {
    logError(`Failed to scan file ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Recursively finds files matching the patterns
 */
function findFiles(dir, patterns, excludePatterns = []) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip excluded directories
        const shouldExclude = excludePatterns.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
          return regex.test(fullPath);
        });
        
        if (!shouldExclude) {
          traverse(fullPath);
        }
      } else if (stat.isFile()) {
        // Check if file matches include patterns
        const shouldInclude = patterns.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
          return regex.test(fullPath);
        });
        
        if (shouldInclude) {
          files.push(fullPath);
        }
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Generates a comprehensive report
 */
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: results.summary,
    conflicts: results.conflicts,
    files: results.files.filter(f => f.conflicts.length > 0),
    recommendations: generateRecommendations()
  };

  return report;
}

/**
 * Generates recommendations based on detected issues
 */
function generateRecommendations() {
  const recommendations = [];
  
  if (results.summary.criticalConflicts > 0) {
    recommendations.push({
      priority: 'high',
      issue: 'Critical event handler conflicts detected',
      solution: 'Use formSubmissionUtils.createFormSubmissionHandler() for all form submissions',
      files: results.conflicts.filter(c => c.severity === 'critical').map(c => c.file)
    });
  }
  
  if (results.summary.highConflicts > 0) {
    recommendations.push({
      priority: 'high',
      issue: 'High severity conflicts detected',
      solution: 'Add preventDefault() calls to all onSubmit handlers',
      files: results.conflicts.filter(c => c.severity === 'high').map(c => c.file)
    });
  }
  
  if (results.summary.mediumConflicts > 0) {
    recommendations.push({
      priority: 'medium',
      issue: 'Medium severity issues detected',
      solution: 'Add data-testid attributes and stopPropagation() calls',
      files: results.conflicts.filter(c => c.severity === 'medium').map(c => c.file)
    });
  }

  return recommendations;
}

/**
 * Saves the report to a file
 */
function saveReport(report) {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  const reportPath = path.join(config.outputDir, `event-handler-detection-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  logInfo(`Report saved to: ${reportPath}`);
  return reportPath;
}

/**
 * Prints a summary to the console
 */
function printSummary() {
  log('\n📊 Event Handler Detection Summary', 'cyan');
  log('=====================================', 'cyan');
  
  log(`Total files scanned: ${results.summary.totalFiles}`, 'white');
  log(`Files with conflicts: ${results.summary.filesWithConflicts}`, 'white');
  log(`Critical conflicts: ${results.summary.criticalConflicts}`, 'red');
  log(`High conflicts: ${results.summary.highConflicts}`, 'yellow');
  log(`Medium conflicts: ${results.summary.mediumConflicts}`, 'blue');
  log(`Low conflicts: ${results.summary.lowConflicts}`, 'white');
  
  if (results.conflicts.length > 0) {
    log('\n🚨 Detected Conflicts:', 'red');
    results.conflicts.forEach((conflict, index) => {
      const color = conflict.severity === 'critical' ? 'red' : 
                   conflict.severity === 'high' ? 'yellow' : 'blue';
      log(`  ${index + 1}. [${conflict.severity.toUpperCase()}] ${conflict.file}`, color);
      log(`     ${conflict.message}`, 'white');
      log(`     💡 ${conflict.recommendation}`, 'green');
    });
  } else {
    logSuccess('No event handler conflicts detected!');
  }
}

/**
 * Main execution function
 */
function main() {
  log('🔍 Event Handler Detection Tool', 'cyan');
  log('================================', 'cyan');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {
    src: args.includes('--src') ? args[args.indexOf('--src') + 1] : config.srcDir,
    test: args.includes('--test') ? args[args.indexOf('--test') + 1] : config.testDir,
    output: args.includes('--output') ? args[args.indexOf('--output') + 1] : config.outputDir,
    failOnCritical: !args.includes('--no-fail-critical'),
    failOnHigh: !args.includes('--no-fail-high'),
    warnOnMedium: !args.includes('--no-warn-medium'),
    generateReport: !args.includes('--no-report')
  };

  log(`Scanning source directory: ${options.src}`, 'blue');
  log(`Scanning test directory: ${options.test}`, 'blue');
  log(`Output directory: ${options.output}`, 'blue');

  // Find files to scan
  const srcFiles = findFiles(options.src, config.includePatterns, config.excludePatterns);
  const testFiles = findFiles(options.test, config.includePatterns, config.excludePatterns);
  const allFiles = [...srcFiles, ...testFiles];

  log(`Found ${allFiles.length} files to scan`, 'blue');

  // Scan files
  allFiles.forEach(file => {
    scanFile(file);
  });

  // Generate and save report
  if (options.generateReport) {
    const report = generateReport();
    saveReport(report);
  }

  // Print summary
  printSummary();

  // Exit with appropriate code
  if (options.failOnCritical && results.summary.criticalConflicts > 0) {
    logError('Critical conflicts detected. Exiting with error code 1.');
    process.exit(1);
  }

  if (options.failOnHigh && results.summary.highConflicts > 0) {
    logError('High severity conflicts detected. Exiting with error code 1.');
    process.exit(1);
  }

  if (results.summary.criticalConflicts === 0 && results.summary.highConflicts === 0) {
    logSuccess('No critical or high severity conflicts detected!');
  }
}

// Run the tool
if (require.main === module) {
  main();
}

module.exports = {
  scanFile,
  findFiles,
  generateReport,
  generateRecommendations
};
