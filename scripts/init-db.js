#!/usr/bin/env node

/**
 * Database initialization script
 * Creates the default admin user for testing
 */

const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database...');

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@apiq.com' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@apiq.com',
        name: 'System Administrator',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });

    console.log('✅ Admin user created successfully');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Role: ${adminUser.role}`);

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'CREATE',
        resource: 'USER',
        resourceId: adminUser.id,
        details: { role: 'SUPER_ADMIN', isDefault: true }
      }
    });

    console.log('✅ Audit log entry created');

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('You can now login with:');
    console.log('   Email: admin@apiq.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
initializeDatabase(); 