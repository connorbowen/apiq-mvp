/**
 * Seed script for plan limits and pricing
 * Populates the database with the pricing tiers from the PRD
 */

const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

const planLimits = [
  {
    planType: 'FREE',
    apiConnectionsLimit: 5,
    workflowExecutionsLimit: 50,
    directApiCallsLimit: 50,
    totalExecutionsLimit: 100,
    priceMonthly: 0, // Free
    priceYearly: 0, // Free
    features: [
      '5 API connections',
      '50 workflow executions per month',
      '50 direct API calls per month',
      '100 total executions per month',
      'Basic support',
      'Community access'
    ],
    isActive: true
  },
  {
    planType: 'STARTER',
    apiConnectionsLimit: 25,
    workflowExecutionsLimit: 500,
    directApiCallsLimit: 500,
    totalExecutionsLimit: 1000,
    priceMonthly: 2900, // $29.00 in cents
    priceYearly: 27840, // $278.40 in cents (20% discount)
    features: [
      '25 API connections',
      '500 workflow executions per month',
      '500 direct API calls per month',
      '1,000 total executions per month',
      'Priority support',
      'Email support',
      'Advanced analytics',
      'API rate limiting'
    ],
    isActive: true
  },
  {
    planType: 'PROFESSIONAL',
    apiConnectionsLimit: 100,
    workflowExecutionsLimit: 5000,
    directApiCallsLimit: 5000,
    totalExecutionsLimit: 10000,
    priceMonthly: 9900, // $99.00 in cents
    priceYearly: 95040, // $950.40 in cents (20% discount)
    features: [
      '100 API connections',
      '5,000 workflow executions per month',
      '5,000 direct API calls per month',
      '10,000 total executions per month',
      'Priority support',
      'Phone support',
      'Advanced analytics',
      'Custom integrations',
      'Team collaboration',
      'Advanced security features'
    ],
    isActive: true
  },
  {
    planType: 'ENTERPRISE',
    apiConnectionsLimit: -1, // Unlimited
    workflowExecutionsLimit: -1, // Unlimited
    directApiCallsLimit: -1, // Unlimited
    totalExecutionsLimit: -1, // Unlimited
    priceMonthly: 0, // Custom pricing
    priceYearly: 0, // Custom pricing
    features: [
      'Unlimited API connections',
      'Unlimited workflow executions',
      'Unlimited direct API calls',
      'Unlimited total executions',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantees',
      'On-premise deployment',
      'Custom security requirements',
      'Dedicated account manager'
    ],
    isActive: true
  }
];

async function seedPlanLimits() {
  console.log('🌱 Seeding plan limits...');

  try {
    // Clear existing plan limits
    await prisma.planLimits.deleteMany({});
    console.log('✅ Cleared existing plan limits');

    // Create new plan limits
    for (const plan of planLimits) {
      await prisma.planLimits.create({
        data: plan
      });
      console.log(`✅ Created ${plan.planType} plan`);
    }

    console.log('🎉 Successfully seeded plan limits!');
  } catch (error) {
    console.error('❌ Error seeding plan limits:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
if (require.main === module) {
  seedPlanLimits()
    .then(() => {
      console.log('✅ Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

module.exports = { seedPlanLimits };
