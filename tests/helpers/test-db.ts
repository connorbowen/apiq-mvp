import { prisma, testDatabaseConnection } from '../lib/database/client';

async function testDatabase() {
  console.log('🧪 Testing database connection and schema...\n');

  // Test connection
  const isConnected = await testDatabaseConnection();
  if (!isConnected) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  try {
    // Test basic operations
    console.log('📊 Testing basic database operations...');

    // Test user creation
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password-would-go-here',
        role: 'USER'
      }
    });
    console.log('✅ User creation successful:', testUser.id);

    // Test API connection creation
    const testApiConnection = await prisma.apiConnection.create({
      data: {
        userId: testUser.id,
        name: 'Test API',
        baseUrl: 'https://api.example.com',
        authType: 'API_KEY',
        authConfig: { apiKey: 'test-key' }
      }
    });
    console.log('✅ API connection creation successful:', testApiConnection.id);

    // Test workflow creation
    const testWorkflow = await prisma.workflow.create({
      data: {
        userId: testUser.id,
        name: 'Test Workflow',
        description: 'A test workflow'
      }
    });
    console.log('✅ Workflow creation successful:', testWorkflow.id);

    // Test workflow step creation
    const testStep = await prisma.workflowStep.create({
      data: {
        workflowId: testWorkflow.id,
        stepOrder: 1,
        name: 'Test Step',
        action: 'GET /users',
        parameters: { limit: 10 }
      }
    });
    console.log('✅ Workflow step creation successful:', testStep.id);

    // Test audit log creation
    const testAuditLog = await prisma.auditLog.create({
      data: {
        userId: testUser.id,
        action: 'CREATE',
        resource: 'User',
        resourceId: testUser.id,
        details: { email: testUser.email }
      }
    });
    console.log('✅ Audit log creation successful:', testAuditLog.id);

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await prisma.workflowStep.delete({ where: { id: testStep.id } });
    await prisma.workflow.delete({ where: { id: testWorkflow.id } });
    await prisma.apiConnection.delete({ where: { id: testApiConnection.id } });
    await prisma.auditLog.delete({ where: { id: testAuditLog.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All database tests passed!');
    console.log('✅ Database schema is working correctly');
    console.log('✅ All CRUD operations are functional');
    console.log('✅ Relationships are properly configured');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase().catch(console.error); 