#!/usr/bin/env node

/**
 * Codemod to apply the beforeEach test data pattern to integration tests
 * 
 * This script:
 * 1. Adds import for createTestData helpers if missing
 * 2. Adds or patches beforeEach to recreate test data
 * 3. Removes redundant afterAll teardown blocks
 * 4. Converts beforeAll data creation to beforeEach
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test file patterns to process
const TEST_PATTERNS = [
  'tests/integration/**/*.test.ts',
  'tests/integration/**/*.test.js'
];

// Helper functions to determine test data type based on file content
function detectTestDataType(content) {
  if (content.includes('apiConnection') || content.includes('ApiConnection')) {
    return 'createConnectionTestData';
  }
  if (content.includes('oauth') || content.includes('OAuth') || content.includes('OAuth2')) {
    return 'createOAuth2TestData';
  }
  if (content.includes('workflow') || content.includes('Workflow')) {
    return 'createWorkflowTestData';
  }
  return 'createCommonTestData';
}

function hasImport(imports, moduleName) {
  return imports.some(imp => 
    imp.includes('createTestData') || 
    imp.includes('createConnectionTestData') ||
    imp.includes('createOAuth2TestData') ||
    imp.includes('createWorkflowTestData') ||
    imp.includes('createCommonTestData')
  );
}

function addImportIfMissing(content, testDataType) {
  const importLine = `import { ${testDataType} } from '../../helpers/createTestData';`;
  
  // Check if import already exists
  if (content.includes(importLine) || content.includes(`import { ${testDataType}`)) {
    return content;
  }
  
  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }
  
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, importLine);
  } else {
    // No imports found, add at the top after any comments
    let insertIndex = 0;
    while (insertIndex < lines.length && 
           (lines[insertIndex].trim().startsWith('//') || 
            lines[insertIndex].trim().startsWith('/*') ||
            lines[insertIndex].trim() === '')) {
      insertIndex++;
    }
    lines.splice(insertIndex, 0, importLine);
  }
  
  return lines.join('\n');
}

function createBeforeEachBlock(testDataType) {
  let assignments = '';
  
  switch (testDataType) {
    case 'createConnectionTestData':
      assignments = 'testUser = testData.user;\n    testConnection = testData.connection;';
      break;
    case 'createOAuth2TestData':
      assignments = 'testUser = testData.user;\n    testApiConnection = testData.connection;';
      break;
    case 'createWorkflowTestData':
      assignments = 'testUser = testData.user;\n    testWorkflow = testData.workflow;';
      break;
    case 'createCommonTestData':
      assignments = 'testUser = testData.user;';
      break;
    default:
      assignments = 'testUser = testData.user;';
  }
  
  return `  beforeEach(async () => {
    // Recreate test data after global setup truncates tables
    const testData = await ${testDataType}();
    ${assignments}
  });`;
}

function processTestFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Detect test data type
  const testDataType = detectTestDataType(content);
  
  // Add import if missing
  content = addImportIfMissing(content, testDataType);
  
  // Check if beforeEach already exists
  const hasBeforeEach = content.includes('beforeEach(async () =>') || content.includes('beforeEach(() =>');
  
  if (!hasBeforeEach) {
    // Find the describe block and add beforeEach after it
    const describeMatch = content.match(/(describe\([^)]+\)\s*=>\s*\{)/);
    if (describeMatch) {
      const beforeEachBlock = createBeforeEachBlock(testDataType);
      content = content.replace(
        describeMatch[0],
        `${describeMatch[0]}\n\n  ${beforeEachBlock}`
      );
    }
  } else {
    // Patch existing beforeEach
    const beforeEachRegex = /beforeEach\(async\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\}\);/;
    const match = content.match(beforeEachRegex);
    
    if (match) {
      const existingBeforeEach = match[0];
      const newBeforeEachBlock = createBeforeEachBlock(testDataType);
      
      // Check if it already has test data recreation
      if (!existingBeforeEach.includes('createTestData') && 
          !existingBeforeEach.includes('testData = await')) {
        content = content.replace(existingBeforeEach, newBeforeEachBlock);
      }
    }
  }
  
  // Remove redundant afterAll blocks that just clean up test data
  const afterAllRegex = /afterAll\(async\s*\(\)\s*=>\s*\{[\s\S]*?(?:delete|remove|cleanup)[\s\S]*?\n\s*\}\);/g;
  content = content.replace(afterAllRegex, '');
  
  // Convert beforeAll data creation to beforeEach if it exists
  const beforeAllRegex = /beforeAll\(async\s*\(\)\s*=>\s*\{[\s\S]*?(?:createTestUser|prisma\.(?:user|apiConnection|workflow)\.create)[\s\S]*?\n\s*\}\);/g;
  if (content.match(beforeAllRegex)) {
    // Remove beforeAll blocks that create test data
    content = content.replace(beforeAllRegex, '');
    
    // Ensure beforeEach exists
    if (!content.includes('beforeEach(async () =>')) {
      const describeMatch = content.match(/(describe\([^)]+\)\s*=>\s*\{)/);
      if (describeMatch) {
        const beforeEachBlock = createBeforeEachBlock(testDataType);
        content = content.replace(
          describeMatch[0],
          `${describeMatch[0]}\n\n  ${beforeEachBlock}`
        );
      }
    }
  }
  
  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
    return false;
  }
}

function findTestFiles() {
  const files = [];
  
  function walkDir(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (item.endsWith('.test.ts') || item.endsWith('.test.js')) {
        if (fullPath.includes('integration')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walkDir('tests/integration');
  return files;
}

function main() {
  console.log('🔧 Applying test data pattern to integration tests...\n');
  
  const testFiles = findTestFiles();
  console.log(`Found ${testFiles.length} integration test files\n`);
  
  let updatedCount = 0;
  
  for (const file of testFiles) {
    try {
      const updated = processTestFile(file);
      if (updated) updatedCount++;
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }
  
  console.log(`\n✅ Updated ${updatedCount} files`);
  console.log(`⏭️  Skipped ${testFiles.length - updatedCount} files (no changes needed)`);
  
  if (updatedCount > 0) {
    console.log('\n📝 Run the integration tests to verify the changes:');
    console.log('npm run test:integration -- --runInBand');
  }
}

if (require.main === module) {
  main();
}

module.exports = { processTestFile, detectTestDataType }; 

/**
 * Codemod to apply the beforeEach test data pattern to integration tests
 * 
 * This script:
 * 1. Adds import for createTestData helpers if missing
 * 2. Adds or patches beforeEach to recreate test data
 * 3. Removes redundant afterAll teardown blocks
 * 4. Converts beforeAll data creation to beforeEach
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test file patterns to process
const TEST_PATTERNS = [
  'tests/integration/**/*.test.ts',
  'tests/integration/**/*.test.js'
];

// Helper functions to determine test data type based on file content
function detectTestDataType(content) {
  if (content.includes('apiConnection') || content.includes('ApiConnection')) {
    return 'createConnectionTestData';
  }
  if (content.includes('oauth') || content.includes('OAuth') || content.includes('OAuth2')) {
    return 'createOAuth2TestData';
  }
  if (content.includes('workflow') || content.includes('Workflow')) {
    return 'createWorkflowTestData';
  }
  return 'createCommonTestData';
}

function hasImport(imports, moduleName) {
  return imports.some(imp => 
    imp.includes('createTestData') || 
    imp.includes('createConnectionTestData') ||
    imp.includes('createOAuth2TestData') ||
    imp.includes('createWorkflowTestData') ||
    imp.includes('createCommonTestData')
  );
}

function addImportIfMissing(content, testDataType) {
  const importLine = `import { ${testDataType} } from '../../helpers/createTestData';`;
  
  // Check if import already exists
  if (content.includes(importLine) || content.includes(`import { ${testDataType}`)) {
    return content;
  }
  
  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }
  
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, importLine);
  } else {
    // No imports found, add at the top after any comments
    let insertIndex = 0;
    while (insertIndex < lines.length && 
           (lines[insertIndex].trim().startsWith('//') || 
            lines[insertIndex].trim().startsWith('/*') ||
            lines[insertIndex].trim() === '')) {
      insertIndex++;
    }
    lines.splice(insertIndex, 0, importLine);
  }
  
  return lines.join('\n');
}

function createBeforeEachBlock(testDataType) {
  let assignments = '';
  
  switch (testDataType) {
    case 'createConnectionTestData':
      assignments = 'testUser = testData.user;\n    testConnection = testData.connection;';
      break;
    case 'createOAuth2TestData':
      assignments = 'testUser = testData.user;\n    testApiConnection = testData.connection;';
      break;
    case 'createWorkflowTestData':
      assignments = 'testUser = testData.user;\n    testWorkflow = testData.workflow;';
      break;
    case 'createCommonTestData':
      assignments = 'testUser = testData.user;';
      break;
    default:
      assignments = 'testUser = testData.user;';
  }
  
  return `  beforeEach(async () => {
    // Recreate test data after global setup truncates tables
    const testData = await ${testDataType}();
    ${assignments}
  });`;
}

function processTestFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Detect test data type
  const testDataType = detectTestDataType(content);
  
  // Add import if missing
  content = addImportIfMissing(content, testDataType);
  
  // Check if beforeEach already exists
  const hasBeforeEach = content.includes('beforeEach(async () =>') || content.includes('beforeEach(() =>');
  
  if (!hasBeforeEach) {
    // Find the describe block and add beforeEach after it
    const describeMatch = content.match(/(describe\([^)]+\)\s*=>\s*\{)/);
    if (describeMatch) {
      const beforeEachBlock = createBeforeEachBlock(testDataType);
      content = content.replace(
        describeMatch[0],
        `${describeMatch[0]}\n\n  ${beforeEachBlock}`
      );
    }
  } else {
    // Patch existing beforeEach
    const beforeEachRegex = /beforeEach\(async\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\}\);/;
    const match = content.match(beforeEachRegex);
    
    if (match) {
      const existingBeforeEach = match[0];
      const newBeforeEachBlock = createBeforeEachBlock(testDataType);
      
      // Check if it already has test data recreation
      if (!existingBeforeEach.includes('createTestData') && 
          !existingBeforeEach.includes('testData = await')) {
        content = content.replace(existingBeforeEach, newBeforeEachBlock);
      }
    }
  }
  
  // Remove redundant afterAll blocks that just clean up test data
  const afterAllRegex = /afterAll\(async\s*\(\)\s*=>\s*\{[\s\S]*?(?:delete|remove|cleanup)[\s\S]*?\n\s*\}\);/g;
  content = content.replace(afterAllRegex, '');
  
  // Convert beforeAll data creation to beforeEach if it exists
  const beforeAllRegex = /beforeAll\(async\s*\(\)\s*=>\s*\{[\s\S]*?(?:createTestUser|prisma\.(?:user|apiConnection|workflow)\.create)[\s\S]*?\n\s*\}\);/g;
  if (content.match(beforeAllRegex)) {
    // Remove beforeAll blocks that create test data
    content = content.replace(beforeAllRegex, '');
    
    // Ensure beforeEach exists
    if (!content.includes('beforeEach(async () =>')) {
      const describeMatch = content.match(/(describe\([^)]+\)\s*=>\s*\{)/);
      if (describeMatch) {
        const beforeEachBlock = createBeforeEachBlock(testDataType);
        content = content.replace(
          describeMatch[0],
          `${describeMatch[0]}\n\n  ${beforeEachBlock}`
        );
      }
    }
  }
  
  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
    return false;
  }
}

function findTestFiles() {
  const files = [];
  
  function walkDir(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (item.endsWith('.test.ts') || item.endsWith('.test.js')) {
        if (fullPath.includes('integration')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walkDir('tests/integration');
  return files;
}

function main() {
  console.log('🔧 Applying test data pattern to integration tests...\n');
  
  const testFiles = findTestFiles();
  console.log(`Found ${testFiles.length} integration test files\n`);
  
  let updatedCount = 0;
  
  for (const file of testFiles) {
    try {
      const updated = processTestFile(file);
      if (updated) updatedCount++;
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }
  
  console.log(`\n✅ Updated ${updatedCount} files`);
  console.log(`⏭️  Skipped ${testFiles.length - updatedCount} files (no changes needed)`);
  
  if (updatedCount > 0) {
    console.log('\n📝 Run the integration tests to verify the changes:');
    console.log('npm run test:integration -- --runInBand');
  }
}

if (require.main === module) {
  main();
}

module.exports = { processTestFile, detectTestDataType }; 