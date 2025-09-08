// Global teardown for Playwright tests
// This runs once after all tests to clean up any remaining test data

import { FullConfig } from '@playwright/test';
import { PrismaClient } from '../../src/generated/prisma';

const prisma = new PrismaClient();

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');
  
  try {
    // Only clean up if we're actually done with all tests
    // This prevents premature cleanup during parallel test execution
    const isLastTestRun = process.env.PLAYWRIGHT_LAST_TEST === 'true';
    
    if (isLastTestRun) {
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
          OR: [
            {
              name: {
                contains: 'Test API'
              }
            },
            {
              name: {
                contains: 'e2e-step-runner'
              }
            }
          ]
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
    } else {
      console.log('⏭️ Skipping cleanup - not the last test run');
    }
  } catch (error) {
    console.warn('⚠️ Global teardown cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

export default globalTeardown;
