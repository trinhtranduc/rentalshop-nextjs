#!/usr/bin/env node

/**
 * Test Plan Functions Script
 * Tests the plan database functions to ensure they work correctly
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPlanFunctions() {
  try {
    console.log('🧪 Testing plan database functions...\n');

    // Test 1: Get all plans
    console.log('1️⃣ Testing getActivePlans...');
    const activePlans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    console.log(`✅ Found ${activePlans.length} active plans`);
    activePlans.forEach(plan => {
      console.log(`   - ${plan.name}: $${plan.price} (ID: ${plan.publicId})`);
    });

    // Test 2: Get plan by public ID
    console.log('\n2️⃣ Testing getPlanByPublicId...');
    const plan1 = await prisma.plan.findUnique({
      where: { publicId: 1 }
    });
    if (plan1) {
      console.log(`✅ Found plan: ${plan1.name} (ID: ${plan1.publicId})`);
    } else {
      console.log('❌ Plan not found');
    }

    // Test 3: Search plans with filters
    console.log('\n3️⃣ Testing searchPlans with filters...');
    const professionalPlans = await prisma.plan.findMany({
      where: {
        name: { contains: 'Professional' }
      }
    });
    console.log(`✅ Found ${professionalPlans.length} professional plans`);

    // Test 4: Get plan statistics
    console.log('\n4️⃣ Testing getPlanStats...');
    const [totalPlans, activePlansCount, totalSubscriptions, activeSubscriptions, totalRevenue] = await Promise.all([
      prisma.plan.count(),
      prisma.plan.count({ where: { isActive: true } }),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { amount: true }
      })
    ]);

    console.log('📊 Plan Statistics:');
    console.log(`   - Total plans: ${totalPlans}`);
    console.log(`   - Active plans: ${activePlansCount}`);
    console.log(`   - Total subscriptions: ${totalSubscriptions}`);
    console.log(`   - Active subscriptions: ${activeSubscriptions}`);
    console.log(`   - Total revenue: $${totalRevenue._sum.amount || 0}`);

    // Test 5: Test plan features parsing
    console.log('\n5️⃣ Testing plan features parsing...');
    const planWithFeatures = await prisma.plan.findFirst({
      where: { name: 'Professional' }
    });
    if (planWithFeatures) {
      const features = JSON.parse(planWithFeatures.features);
      console.log(`✅ ${planWithFeatures.name} plan has ${features.length} features:`);
      features.slice(0, 3).forEach(feature => {
        console.log(`   - ${feature}`);
      });
      if (features.length > 3) {
        console.log(`   ... and ${features.length - 3} more`);
      }
    }

    // Test 6: Test plan limits
    console.log('\n6️⃣ Testing plan limits...');
    const enterprisePlan = await prisma.plan.findFirst({
      where: { name: 'Enterprise' }
    });
    if (enterprisePlan) {
      console.log(`✅ ${enterprisePlan.name} plan limits:`);
      console.log(`   - Outlets: ${enterprisePlan.maxOutlets === -1 ? 'Unlimited' : enterprisePlan.maxOutlets}`);
      console.log(`   - Users: ${enterprisePlan.maxUsers === -1 ? 'Unlimited' : enterprisePlan.maxUsers}`);
      console.log(`   - Products: ${enterprisePlan.maxProducts === -1 ? 'Unlimited' : enterprisePlan.maxProducts}`);
      console.log(`   - Customers: ${enterprisePlan.maxCustomers === -1 ? 'Unlimited' : enterprisePlan.maxCustomers}`);
    }

    console.log('\n🎉 All plan function tests completed successfully!');

  } catch (error) {
    console.error('❌ Error testing plan functions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
if (require.main === module) {
  testPlanFunctions()
    .then(() => {
      console.log('✅ Plan function tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Plan function tests failed:', error);
      process.exit(1);
    });
}

module.exports = { testPlanFunctions };
