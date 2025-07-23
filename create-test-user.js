const { prisma } = require('./lib/database/client');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    // Create test user with dynamic data (no need to check for existing)
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    const testPassword = `password-${timestamp}`;
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: `Test User ${timestamp}`,
        password: hashedPassword,
        role: 'USER',
        isActive: true
      }
    });

    console.log('Test user created successfully:', user.email);
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser(); 