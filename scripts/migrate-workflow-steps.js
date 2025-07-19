#!/usr/bin/env node

/**
 * Migration script to update existing workflow steps
 * This script adds missing fields and updates the structure
 */

const { prisma } = require('../lib/database/client');

async function migrateWorkflowSteps() {
  try {
    console.log('🔧 Starting workflow steps migration...');

    // Get all workflow steps
    const steps = await prisma.workflowStep.findMany({
      include: {
        workflow: true
      }
    });

    console.log(`Found ${steps.length} workflow steps to migrate`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const step of steps) {
      try {
        // Check if step needs migration
        const needsMigration = !step.method || !step.endpoint || !step.parameters;

        if (!needsMigration) {
          skippedCount++;
          continue;
        }

        // Update the step with proper structure
        await prisma.workflowStep.update({
          where: { id: step.id },
          data: {
            method: step.method || 'GET',
            endpoint: step.endpoint || '/',
            parameters: step.parameters || {},
            conditions: step.conditions || null,
            retryConfig: step.retryConfig || null,
            timeout: step.timeout || 30000,
            isActive: true
          }
        });

        updatedCount++;
        console.log(`✅ Updated step: ${step.name} (${step.id})`);

      } catch (error) {
        console.error(`❌ Failed to update step ${step.id}:`, error.message);
      }
    }

    console.log('\n🎉 Migration completed!');
    console.log(`   Updated: ${updatedCount} steps`);
    console.log(`   Skipped: ${skippedCount} steps (already up to date)`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateWorkflowSteps(); 