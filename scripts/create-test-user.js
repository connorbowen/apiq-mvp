const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔧 Creating test user...');

    // Check if test user already exists
    const existingUser = await prisma.user.findFirst({
      where: { id: 'test-user-123' }
    });

    if (existingUser) {
      console.log('✅ Test user already exists:', existingUser.email);
      return existingUser;
    }

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        id: 'test-user-123', // Use the same ID that the API expects
        email: 'test@apiq.com',
        name: 'Test User',
        password: 'hashed-password-would-go-here', // In real app, this would be properly hashed
        role: 'USER',
        isActive: true
      }
    });

    console.log('✅ Test user created successfully:', {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name
    });

    return testUser;

  } catch (error) {
    console.error('❌ Failed to create test user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  createTestUser()
    .then(() => {
      console.log('🎉 Test user setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test user setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createTestUser }; 