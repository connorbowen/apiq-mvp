/**
 * Seed script for user plans
 * Creates user plans for all existing users who don't have one
 */

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function seedUserPlans() {
  console.log('🌱 Seeding user plans...');

  try {
    // Get all users without user plans
    const usersWithoutPlans = await prisma.user.findMany({
      where: {
        userPlan: null
      },
      select: {
        id: true,
        email: true,
        role: true
      }
    });

    console.log(`📊 Found ${usersWithoutPlans.length} users without plans`);

    // Get the FREE plan limits
    const freePlan = await prisma.planLimits.findFirst({
      where: { planType: 'FREE' }
    });

    if (!freePlan) {
      throw new Error('FREE plan not found. Please run seed-plan-limits.js first.');
    }

    // Create user plans for all users without plans
    for (const user of usersWithoutPlans) {
      await prisma.userPlan.create({
        data: {
          userId: user.id,
          planType: 'FREE',
          status: 'ACTIVE',
          currentConnections: 0,
          currentWorkflowExecutions: 0,
          currentDirectApiCalls: 0,
          currentTotalExecutions: 0,
          apiConnectionsLimit: freePlan.apiConnectionsLimit,
          workflowExecutionsLimit: freePlan.workflowExecutionsLimit,
          directApiCallsLimit: freePlan.directApiCallsLimit,
          totalExecutionsLimit: freePlan.totalExecutionsLimit,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        }
      });
      console.log(`✅ Created FREE plan for user: ${user.email}`);
    }

    console.log('🎉 Successfully seeded user plans!');
  } catch (error) {
    console.error('❌ Error seeding user plans:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedUserPlans()
    .then(() => {
      console.log('✅ User plans seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ User plans seed failed:', error);
      process.exit(1);
    });
}

module.exports = { seedUserPlans };
