#!/usr/bin/env node

/**
 * Add Missing Workflow-Specific P0 TODOs
 * 
 * This script adds workflow-specific P0 TODOs that were missed in the initial run
 */

const fs = require('fs');
const path = require('path');

// Workflow-specific P0 TODOs
const WORKFLOW_TODOS = [
  {
    title: 'Add workflow execution engine testing',
    description: 'Missing workflow execution engine testing',
    code: `// TODO: Add workflow execution engine testing (P0)
// - Test workflow execution from start to finish
// - Test step-by-step execution
// - Test execution state management
// - Test execution error handling
// - Test execution monitoring and logging`
  },
  {
    title: 'Add natural language workflow creation testing',
    description: 'Missing natural language workflow creation testing',
    code: `// TODO: Add natural language workflow creation testing (P0)
// - Test workflow generation from natural language descriptions
// - Test complex multi-step workflow creation
// - Test workflow parameter mapping
// - Test workflow validation and error handling`
  }
];

/**
 * Add workflow-specific TODOs to a test file
 */
function addWorkflowTodosToFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return 0;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Check if workflow TODOs already exist
  if (content.includes('workflow execution engine testing') || 
      content.includes('natural language workflow creation testing')) {
    console.log(`⚠️  Workflow TODOs already exist in ${fileName}`);
    return 0;
  }

  let updatedContent = content;
  let todosAdded = 0;

  // Add workflow-specific TODOs
  WORKFLOW_TODOS.forEach(todo => {
    const todoComment = `\n${todo.code}\n`;
    updatedContent += todoComment;
    todosAdded++;
  });

  // Write the updated content back to the file
  if (todosAdded > 0) {
    fs.writeFileSync(filePath, updatedContent);
    console.log(`✅ Added ${todosAdded} workflow-specific P0 TODOs to ${fileName}`);
  }

  return todosAdded;
}

/**
 * Find workflow test files
 */
function findWorkflowTestFiles(dir) {
  const testFiles = [];
  
  if (!fs.existsSync(dir)) {
    return testFiles;
  }

  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      testFiles.push(...findWorkflowTestFiles(fullPath));
    } else if (item.endsWith('.test.ts') && 
               (item.includes('workflow') || fullPath.includes('workflow-engine'))) {
      testFiles.push(fullPath);
    }
  }
  
  return testFiles;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Adding missing workflow-specific P0 TODOs...\n');
  
  const TEST_DIR = 'tests/e2e';
  const workflowTestFiles = findWorkflowTestFiles(TEST_DIR);
  
  if (workflowTestFiles.length === 0) {
    console.log('❌ No workflow test files found in', TEST_DIR);
    return;
  }

  console.log(`📁 Found ${workflowTestFiles.length} workflow test files\n`);
  
  let totalTodosAdded = 0;
  let filesUpdated = 0;

  for (const testFile of workflowTestFiles) {
    const todosAdded = addWorkflowTodosToFile(testFile);
    if (todosAdded > 0) {
      totalTodosAdded += todosAdded;
      filesUpdated++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Workflow files processed: ${workflowTestFiles.length}`);
  console.log(`  Files updated: ${filesUpdated}`);
  console.log(`  Workflow-specific P0 TODOs added: ${totalTodosAdded}`);
  
  if (filesUpdated > 0) {
    console.log('\n✅ Successfully added workflow-specific P0 TODOs!');
  } else {
    console.log('\nℹ️  All workflow files already have the necessary TODOs');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { addWorkflowTodosToFile, findWorkflowTestFiles }; 