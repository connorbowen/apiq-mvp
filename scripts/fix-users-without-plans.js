/**
 * Migration script to fix users without plans
 * Creates FREE plans for all existing users who don't have one
 */

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function fixUsersWithoutPlans() {
  console.log('🔧 Fixing users without plans...');

  try {
    // Get all users without user plans
    const usersWithoutPlans = await prisma.user.findMany({
      where: {
        userPlan: null
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    console.log(`📊 Found ${usersWithoutPlans.length} users without plans`);

    if (usersWithoutPlans.length === 0) {
      console.log('✅ All users already have plans!');
      return;
    }

    // Get the FREE plan limits
    const freePlan = await prisma.planLimits.findFirst({
      where: { planType: 'FREE' }
    });

    if (!freePlan) {
      throw new Error('FREE plan not found. Please run seed-plan-limits.js first.');
    }

    console.log(`📋 FREE plan limits: ${freePlan.apiConnectionsLimit} connections, ${freePlan.workflowExecutionsLimit} workflows, ${freePlan.directApiCallsLimit} direct calls`);

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
      console.log(`✅ Created FREE plan for user: ${user.email} (${user.name})`);
    }

    console.log('🎉 Successfully fixed all users without plans!');
    console.log(`📈 Summary: Created FREE plans for ${usersWithoutPlans.length} users`);

  } catch (error) {
    console.error('❌ Error fixing users without plans:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix function
if (require.main === module) {
  fixUsersWithoutPlans()
    .then(() => {
      console.log('✅ Fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixUsersWithoutPlans };
