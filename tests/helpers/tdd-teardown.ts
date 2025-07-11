/**
 * TDD Global Teardown
 * 
 * Cleans up test environment after TDD execution by:
 * - Removing test data
 * - Closing database connections
 * - Clearing temporary resources
 */
import { prisma } from '../../lib/database/client';

async function globalTeardown() {
  console.log('🧹 Cleaning up TDD environment...');
  
  try {
    // Clean up TDD test data
    await cleanupTDDData();
    console.log('✅ TDD test data cleaned');
    
    // Close database connection
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
    
    console.log('🎯 TDD environment cleaned up');
  } catch (error) {
    console.error('❌ TDD teardown failed:', error);
    // Don't throw to avoid masking test failures
  }
}

async function cleanupTDDData() {
  // Remove TDD-specific test data
  await prisma.user.deleteMany({
    where: {
      email: 'tdd-user@example.com'
    }
  });
  
  // Remove test connections
  await prisma.apiConnection.deleteMany({
    where: {
      id: 'tdd-test-connection'
    }
  });
  
  // Clean up any remaining test workflows
  await prisma.workflow.deleteMany({
    where: {
      name: {
        contains: 'TDD Test'
      }
    }
  });
}

export default globalTeardown;