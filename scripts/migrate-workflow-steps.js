#!/usr/bin/env node

/**
 * Migration Script: Convert Workflow Steps from 'action' to 'method' + 'endpoint'
 * 
 * This script migrates all existing workflow steps from the old format:
 * - action: "POST /users" 
 * 
 * To the new format:
 * - method: "POST"
 * - endpoint: "/users"
 * 
 * Usage: node scripts/migrate-workflow-steps.js
 */

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

/**
 * Parse action string into method and endpoint
 * @param {string} action - Action string like "POST /users" or "GET /data"
 * @returns {Object} Object with method and endpoint
 */
function parseAction(action) {
  if (!action || typeof action !== 'string') {
    throw new Error(`Invalid action: ${action}`);
  }

  // Handle different action formats
  const trimmedAction = action.trim();
  
  // Format: "METHOD /path" (e.g., "POST /users", "GET /data")
  const methodPathMatch = trimmedAction.match(/^([A-Z]+)\s+(.+)$/);
  if (methodPathMatch) {
    return {
      method: methodPathMatch[1],
      endpoint: methodPathMatch[2]
    };
  }

  // Format: "METHOD/path" (e.g., "POST/users", "GET/data") - no space
  const methodPathNoSpaceMatch = trimmedAction.match(/^([A-Z]+)(.+)$/);
  if (methodPathNoSpaceMatch) {
    return {
      method: methodPathNoSpaceMatch[1],
      endpoint: methodPathNoSpaceMatch[2]
    };
  }

  // Format: just the method (e.g., "POST", "GET") - use default endpoint
  const methodOnlyMatch = trimmedAction.match(/^([A-Z]+)$/);
  if (methodOnlyMatch) {
    return {
      method: methodOnlyMatch[1],
      endpoint: '/' // Default endpoint
    };
  }

  // If none of the above patterns match, treat as endpoint only
  return {
    method: 'GET', // Default method
    endpoint: trimmedAction.startsWith('/') ? trimmedAction : `/${trimmedAction}`
  };
}

/**
 * Validate method is a valid HTTP method
 * @param {string} method - HTTP method to validate
 * @returns {boolean} True if valid
 */
function isValidMethod(method) {
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  return validMethods.includes(method.toUpperCase());
}

/**
 * Main migration function
 */
async function migrateWorkflowSteps() {
  console.log('🔄 Starting workflow steps migration...');
  
  try {
    // Find all workflow steps that have an action field
    const stepsWithAction = await prisma.workflowStep.findMany({
      where: {
        action: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        action: true,
        apiConnectionId: true
      }
    });

    console.log(`📊 Found ${stepsWithAction.length} workflow steps with action field`);

    if (stepsWithAction.length === 0) {
      console.log('✅ No workflow steps to migrate');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each step
    for (const step of stepsWithAction) {
      try {
        console.log(`\n🔍 Processing step: ${step.name} (ID: ${step.id})`);
        console.log(`   Action: "${step.action}"`);

        // Parse the action
        const parsed = parseAction(step.action);
        console.log(`   Parsed: method="${parsed.method}", endpoint="${parsed.endpoint}"`);

        // Validate the method
        if (!isValidMethod(parsed.method)) {
          throw new Error(`Invalid HTTP method: ${parsed.method}`);
        }

        // Update the step to use method and endpoint instead of action
        await prisma.workflowStep.update({
          where: { id: step.id },
          data: {
            method: parsed.method,
            endpoint: parsed.endpoint,
            action: null // Remove the old action field
          }
        });

        console.log(`   ✅ Successfully migrated step ${step.id}`);
        successCount++;

      } catch (error) {
        console.error(`   ❌ Failed to migrate step ${step.id}:`, error.message);
        errors.push({
          stepId: step.id,
          stepName: step.name,
          action: step.action,
          error: error.message
        });
        errorCount++;
      }
    }

    // Print summary
    console.log('\n📋 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount} steps`);
    console.log(`   ❌ Failed to migrate: ${errorCount} steps`);
    
    if (errors.length > 0) {
      console.log('\n❌ Migration Errors:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. Step "${error.stepName}" (${error.stepId}):`);
        console.log(`      Action: "${error.action}"`);
        console.log(`      Error: ${error.error}`);
      });
    }

    if (successCount > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('   All migrated steps now use the new format (method + endpoint)');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback function to revert the migration if needed
 */
async function rollbackMigration() {
  console.log('🔄 Rolling back workflow steps migration...');
  
  try {
    // Find all workflow steps that have method and endpoint but no action
    const migratedSteps = await prisma.workflowStep.findMany({
      where: {
        method: {
          not: null
        },
        endpoint: {
          not: null
        },
        action: null
      },
      select: {
        id: true,
        name: true,
        method: true,
        endpoint: true
      }
    });

    console.log(`📊 Found ${migratedSteps.length} migrated workflow steps to rollback`);

    if (migratedSteps.length === 0) {
      console.log('✅ No steps to rollback');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each step
    for (const step of migratedSteps) {
      try {
        console.log(`\n🔍 Rolling back step: ${step.name} (ID: ${step.id})`);
        console.log(`   Current: method="${step.method}", endpoint="${step.endpoint}"`);

        // Reconstruct the action string
        const action = `${step.method} ${step.endpoint}`;
        console.log(`   Reconstructed action: "${action}"`);

        // Update the step to use action instead of method and endpoint
        await prisma.workflowStep.update({
          where: { id: step.id },
          data: {
            action: action,
            method: null,
            endpoint: null
          }
        });

        console.log(`   ✅ Successfully rolled back step ${step.id}`);
        successCount++;

      } catch (error) {
        console.error(`   ❌ Failed to rollback step ${step.id}:`, error.message);
        errorCount++;
      }
    }

    // Print summary
    console.log('\n📋 Rollback Summary:');
    console.log(`   ✅ Successfully rolled back: ${successCount} steps`);
    console.log(`   ❌ Failed to rollback: ${errorCount} steps`);

    if (successCount > 0) {
      console.log('\n✅ Rollback completed successfully!');
      console.log('   All rolled back steps now use the old format (action)');
    }

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

/**
 * Dry run function to preview the migration without making changes
 */
async function dryRunMigration() {
  console.log('🔍 Dry run: Previewing workflow steps migration...');
  
  try {
    // Find all workflow steps that have an action field
    const stepsWithAction = await prisma.workflowStep.findMany({
      where: {
        action: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        action: true,
        apiConnectionId: true
      }
    });

    console.log(`📊 Found ${stepsWithAction.length} workflow steps with action field`);

    if (stepsWithAction.length === 0) {
      console.log('✅ No workflow steps to migrate');
      return;
    }

    let validCount = 0;
    let invalidCount = 0;
    const invalidSteps = [];

    // Preview each step
    for (const step of stepsWithAction) {
      try {
        console.log(`\n🔍 Previewing step: ${step.name} (ID: ${step.id})`);
        console.log(`   Current action: "${step.action}"`);

        // Parse the action
        const parsed = parseAction(step.action);
        console.log(`   Would become: method="${parsed.method}", endpoint="${parsed.endpoint}"`);

        // Validate the method
        if (!isValidMethod(parsed.method)) {
          throw new Error(`Invalid HTTP method: ${parsed.method}`);
        }

        console.log(`   ✅ Step would be migrated successfully`);
        validCount++;

      } catch (error) {
        console.error(`   ❌ Step would fail migration: ${error.message}`);
        invalidSteps.push({
          stepId: step.id,
          stepName: step.name,
          action: step.action,
          error: error.message
        });
        invalidCount++;
      }
    }

    // Print summary
    console.log('\n📋 Dry Run Summary:');
    console.log(`   ✅ Would migrate successfully: ${validCount} steps`);
    console.log(`   ❌ Would fail migration: ${invalidCount} steps`);
    
    if (invalidSteps.length > 0) {
      console.log('\n❌ Steps that would fail:');
      invalidSteps.forEach((step, index) => {
        console.log(`   ${index + 1}. Step "${step.stepName}" (${step.stepId}):`);
        console.log(`      Action: "${step.action}"`);
        console.log(`      Error: ${step.error}`);
      });
    }

    if (validCount > 0) {
      console.log('\n💡 To perform the actual migration, run: node scripts/migrate-workflow-steps.js migrate');
    }

  } catch (error) {
    console.error('❌ Dry run failed:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'migrate':
        await migrateWorkflowSteps();
        break;
      case 'rollback':
        await rollbackMigration();
        break;
      case 'dry-run':
      case 'preview':
        await dryRunMigration();
        break;
      default:
        console.log('Usage: node scripts/migrate-workflow-steps.js <command>');
        console.log('');
        console.log('Commands:');
        console.log('  migrate    - Perform the migration');
        console.log('  rollback   - Rollback the migration');
        console.log('  dry-run    - Preview the migration without making changes');
        console.log('  preview    - Alias for dry-run');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/migrate-workflow-steps.js dry-run');
        console.log('  node scripts/migrate-workflow-steps.js migrate');
        console.log('  node scripts/migrate-workflow-steps.js rollback');
        break;
    }
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  migrateWorkflowSteps,
  rollbackMigration,
  dryRunMigration,
  parseAction,
  isValidMethod
}; 