// Global setup for Playwright tests
// This runs once before all tests to ensure clean database state

import { chromium, FullConfig } from '@playwright/test';
import { PrismaClient } from '../../src/generated/prisma';

const prisma = new PrismaClient();

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  try {
    // Clean up any existing test data
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
    
    // Ensure plan limits are seeded for tests
    const existingFreePlan = await prisma.planLimits.findFirst({
      where: { planType: 'FREE' }
    });
    
    if (!existingFreePlan) {
      console.log('🌱 Seeding plan limits for tests...');
      await prisma.planLimits.create({
        data: {
          planType: 'FREE',
          apiConnectionsLimit: 5,
          workflowExecutionsLimit: 50,
          directApiCallsLimit: 50,
          totalExecutionsLimit: 100,
          priceMonthly: 0,
          priceYearly: 0,
          features: [
            '5 API connections',
            '50 workflow executions per month',
            '50 direct API calls per month',
            '100 total executions per month',
            'Basic support',
            'Community access'
          ],
          isActive: true
        }
      });
      console.log('✅ FREE plan limits seeded');
    }
    
    console.log('✅ Global test setup completed - database cleaned and seeded');
  } catch (error) {
    console.warn('⚠️ Global setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

export default globalSetup;
