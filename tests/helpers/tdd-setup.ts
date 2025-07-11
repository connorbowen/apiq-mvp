/**
 * TDD Global Setup
 * 
 * Prepares the test environment for fast TDD execution by:
 * - Setting up test database with minimal data
 * - Configuring environment variables for speed
 * - Preparing shared test resources
 */
import { prisma } from '../../lib/database/client';

async function globalSetup() {
  console.log('🚀 Setting up TDD environment...');
  
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Clean up any existing test data
    await cleanupTestData();
    console.log('✅ Test data cleaned');
    
    // Seed minimal test data for TDD scenarios
    await seedMinimalTestData();
    console.log('✅ Minimal test data seeded');
    
    console.log('🎯 TDD environment ready');
  } catch (error) {
    console.error('❌ TDD setup failed:', error);
    throw error;
  }
}

async function cleanupTestData() {
  // Clean up test users and related data
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test-'
      }
    }
  });
  
  // Clean up test workflows
  await prisma.workflow.deleteMany({
    where: {
      name: {
        contains: 'Test Workflow'
      }
    }
  });
  
  // Clean up test API connections
  await prisma.apiConnection.deleteMany({
    where: {
      name: {
        contains: 'Test Connection'
      }
    }
  });
}

async function seedMinimalTestData() {
  // Create a shared test user for TDD scenarios
  const testUser = await prisma.user.upsert({
    where: { email: 'tdd-user@example.com' },
    update: {},
    create: {
      email: 'tdd-user@example.com',
      name: 'TDD Test User',
      password: 'hashed-password', // This would be properly hashed in real implementation
      role: 'USER',
      emailVerified: new Date(),
    }
  });
  
  // Create a test API connection for connection tests
  await prisma.apiConnection.upsert({
    where: { id: 'tdd-test-connection' },
    update: {},
    create: {
      id: 'tdd-test-connection',
      name: 'TDD Test Connection',
      userId: testUser.id,
      baseUrl: 'https://jsonplaceholder.typicode.com',
      authType: 'API_KEY',
      authConfig: '{}', // Minimal auth config
      status: 'ACTIVE',
    }
  });
  
  console.log('📊 Seeded TDD test data:');
  console.log(`  - Test User: ${testUser.email}`);
  console.log(`  - Test Connection: TDD Test Connection`);
}

export default globalSetup;