// Global setup for Playwright tests
// This runs once before all tests to ensure clean database state

import { chromium, FullConfig } from '@playwright/test';
import { PrismaClient } from '../../src/generated/prisma';

const prisma = new PrismaClient();

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  // Clean up any existing test data
  try {
    // Delete all test users (those with e2e- prefix)
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'e2e-'
        }
      }
    });
    
    // Delete all test connections
    await prisma.apiConnection.deleteMany({
      where: {
        name: {
          contains: 'Test'
        }
      }
    });
    
    // Delete all test secrets
    await prisma.secret.deleteMany({
      where: {
        name: {
          contains: 'Test'
        }
      }
    });
    
    console.log('✅ Global test setup completed - database cleaned');
  } catch (error) {
    console.warn('⚠️ Global setup cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

export default globalSetup;
