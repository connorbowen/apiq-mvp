// Global teardown for integration tests
// This ensures proper cleanup of database connections

const { prisma } = require('./lib/database/client');

module.exports = async () => {
  console.log('🧹 Running global teardown for integration tests...');
  
  try {
    // Ensure all database connections are properly closed
    await prisma.$disconnect();
    console.log('✅ Database connections closed successfully');
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
  }
  
  // Force garbage collection to clean up any remaining connections
  if (global.gc) {
    global.gc();
  }
  
  console.log('✅ Global teardown completed');
}; 