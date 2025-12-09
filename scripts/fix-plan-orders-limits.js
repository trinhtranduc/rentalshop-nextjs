/**
 * Fix Plan Orders Limits Script
 * 
 * Fixes incorrect orders limits in database plans:
 * - Professional: orders: 0 → 10000
 * - Basic: orders: 0 → 2000
 * - Enterprise: orders: 0 → -1 (unlimited)
 * 
 * Usage: node scripts/fix-plan-orders-limits.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PLAN_FIXES = {
  'Professional': {
    orders: 10000
  },
  'Basic': {
    orders: 2000
  },
  'Enterprise': {
    orders: -1 // unlimited
  }
};

async function fixPlanOrdersLimits() {
  console.log('\n🔧 Starting Plan Orders Limits Fix...\n');

  try {
    const results = {
      updated: [],
      skipped: [],
      errors: []
    };

    for (const [planName, fixes] of Object.entries(PLAN_FIXES)) {
      try {
        // Find plan by name
        const plan = await prisma.plan.findFirst({
          where: { name: planName }
        });

        if (!plan) {
          console.log(`⚠️  Plan "${planName}" not found, skipping...`);
          results.skipped.push(planName);
          continue;
        }

        // Parse current limits
        const currentLimits = typeof plan.limits === 'string' 
          ? JSON.parse(plan.limits) 
          : plan.limits;

        // Check if fix is needed
        if (currentLimits.orders === fixes.orders) {
          console.log(`✅ Plan "${planName}" already has correct orders limit: ${fixes.orders}`);
          results.skipped.push(planName);
          continue;
        }

        // Update limits
        const updatedLimits = {
          ...currentLimits,
          orders: fixes.orders
        };

        // Update plan
        const updatedPlan = await prisma.plan.update({
          where: { id: plan.id },
          data: {
            limits: JSON.stringify(updatedLimits)
          }
        });

        console.log(`✅ UPDATED: ${planName} (ID: ${plan.id})`);
        console.log(`   Old orders limit: ${currentLimits.orders}`);
        console.log(`   New orders limit: ${fixes.orders}`);
        console.log('');

        results.updated.push({
          name: planName,
          id: plan.id,
          oldLimit: currentLimits.orders,
          newLimit: fixes.orders
        });

      } catch (error) {
        console.error(`❌ Error fixing plan "${planName}":`, error);
        results.errors.push({
          name: planName,
          error: error.message
        });
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Updated: ${results.updated.length}`);
    console.log(`   Skipped: ${results.skipped.length}`);
    console.log(`   Errors: ${results.errors.length}`);

    if (results.updated.length > 0) {
      console.log('\n✅ Successfully updated plans:');
      results.updated.forEach(result => {
        console.log(`   - ${result.name}: ${result.oldLimit} → ${result.newLimit}`);
      });
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(error => {
        console.log(`   - ${error.name}: ${error.error}`);
      });
      process.exit(1);
    }

    console.log('\n✅ Plan orders limits fix completed!\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixPlanOrdersLimits();

