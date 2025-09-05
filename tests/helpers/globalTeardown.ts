// Global teardown for Playwright tests
// This runs once after all tests to clean up any remaining test data

import { FullConfig } from '@playwright/test';
import { PrismaClient } from '../../src/generated/prisma';

const prisma = new PrismaClient();

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');
  
  try {
    // Clean up any remaining test data
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'e2e-'
        }
      }
    });
    
    await prisma.apiConnection.deleteMany({
      where: {
        name: {
          contains: 'Test'
        }
      }
    });
    
    await prisma.secret.deleteMany({
      where: {
        name: {
          contains: 'Test'
        }
      }
    });
    
    console.log('✅ Global test teardown completed');
  } catch (error) {
    console.warn('⚠️ Global teardown cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

export default globalTeardown;
