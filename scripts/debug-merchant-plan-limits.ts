/**
 * Debug script to check plan limits for a merchant
 * Usage: npx tsx scripts/debug-merchant-plan-limits.ts <merchantId>
 */

import { PrismaClient } from '@prisma/client';
import { getPlanLimitsInfo, getCurrentEntityCounts, validatePlanLimits } from '../packages/utils/src/core/validation';

const prisma = new PrismaClient();

async function debugMerchantPlanLimits(merchantId: number) {
  console.log(`\n🔍 Debugging Plan Limits for Merchant ${merchantId}\n`);
  console.log('='.repeat(80));

  try {
    // 1. Get merchant info
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });

    if (!merchant) {
      console.error(`❌ Merchant ${merchantId} not found`);
      return;
    }

    if (!merchant.subscription) {
      console.error(`❌ Merchant ${merchantId} has no subscription`);
      return;
    }

    console.log(`\n📋 Merchant Info:`);
    console.log(`   Name: ${merchant.name}`);
    console.log(`   Subscription ID: ${merchant.subscription.id}`);
    console.log(`   Plan ID: ${merchant.subscription.planId}`);
    console.log(`   Plan Name: ${merchant.subscription.plan?.name || 'N/A'}`);

    // 2. Get plan limits
    const plan = merchant.subscription.plan;
    if (!plan) {
      console.error(`❌ Plan not found`);
      return;
    }

    let planLimits: any;
    if (typeof plan.limits === 'string') {
      planLimits = JSON.parse(plan.limits);
    } else {
      planLimits = plan.limits || {};
    }

    console.log(`\n📊 Base Plan Limits:`);
    console.log(`   Outlets: ${planLimits.outlets ?? -1}`);
    console.log(`   Users: ${planLimits.users ?? -1}`);
    console.log(`   Products: ${planLimits.products ?? -1}`);
    console.log(`   Customers: ${planLimits.customers ?? -1}`);
    console.log(`   Orders: ${planLimits.orders ?? -1}`);

    // 3. Get addons
    const addons = await prisma.planLimitAddon.findMany({
      where: {
        merchantId,
        isActive: true
      }
    });

    console.log(`\n➕ Active Addons: ${addons.length}`);
    if (addons.length > 0) {
      addons.forEach((addon, index) => {
        console.log(`   Addon ${index + 1}:`);
        console.log(`     ID: ${addon.id}`);
        console.log(`     Outlets: ${addon.outlets}`);
        console.log(`     Users: ${addon.users}`);
        console.log(`     Products: ${addon.products}`);
        console.log(`     Customers: ${addon.customers}`);
        console.log(`     Orders: ${addon.orders}`);
        console.log(`     Notes: ${addon.notes || 'N/A'}`);
        console.log(`     Created: ${addon.createdAt}`);
      });
    }

    // Calculate total addon limits
    const totalAddonLimits = addons.reduce(
      (total, addon) => ({
        outlets: total.outlets + addon.outlets,
        users: total.users + addon.users,
        products: total.products + addon.products,
        customers: total.customers + addon.customers,
        orders: total.orders + addon.orders,
      }),
      { outlets: 0, users: 0, products: 0, customers: 0, orders: 0 }
    );

    console.log(`\n📈 Total Addon Limits:`);
    console.log(`   Outlets: ${totalAddonLimits.outlets}`);
    console.log(`   Users: ${totalAddonLimits.users}`);
    console.log(`   Products: ${totalAddonLimits.products}`);
    console.log(`   Customers: ${totalAddonLimits.customers}`);
    console.log(`   Orders: ${totalAddonLimits.orders}`);

    // 4. Calculate total limits
    const calculateTotal = (base: number, addon: number) => {
      if (base === -1) return -1;
      return Math.max(0, base + addon);
    };

    const totalLimits = {
      outlets: calculateTotal(planLimits.outlets ?? -1, totalAddonLimits.outlets),
      users: calculateTotal(planLimits.users ?? -1, totalAddonLimits.users),
      products: calculateTotal(planLimits.products ?? -1, totalAddonLimits.products),
      customers: calculateTotal(planLimits.customers ?? -1, totalAddonLimits.customers),
      orders: calculateTotal(planLimits.orders ?? -1, totalAddonLimits.orders),
    };

    console.log(`\n🎯 Total Limits (Plan + Addon):`);
    console.log(`   Outlets: ${totalLimits.outlets === -1 ? 'Unlimited' : totalLimits.outlets}`);
    console.log(`   Users: ${totalLimits.users === -1 ? 'Unlimited' : totalLimits.users}`);
    console.log(`   Products: ${totalLimits.products === -1 ? 'Unlimited' : totalLimits.products}`);
    console.log(`   Customers: ${totalLimits.customers === -1 ? 'Unlimited' : totalLimits.customers}`);
    console.log(`   Orders: ${totalLimits.orders === -1 ? 'Unlimited' : totalLimits.orders}`);

    // 5. Get current counts
    const currentCounts = await getCurrentEntityCounts(merchantId);

    console.log(`\n📊 Current Entity Counts:`);
    console.log(`   Outlets: ${currentCounts.outlets}`);
    console.log(`   Users: ${currentCounts.users} (excluding ADMIN)`);
    console.log(`   Products: ${currentCounts.products}`);
    console.log(`   Customers: ${currentCounts.customers}`);
    console.log(`   Orders: ${currentCounts.orders}`);

    // 6. Get all users for detailed breakdown
    const allUsers = await prisma.user.findMany({
      where: { merchantId },
      select: {
        id: true,
        email: true,
        role: true,
        deletedAt: true,
        firstName: true,
        lastName: true
      }
    });

    const activeUsers = allUsers.filter(u => !u.deletedAt);
    const adminUsers = activeUsers.filter(u => u.role === 'ADMIN');
    const nonAdminUsers = activeUsers.filter(u => u.role !== 'ADMIN');

    console.log(`\n👥 User Breakdown:`);
    console.log(`   Total users in DB: ${allUsers.length}`);
    console.log(`   Active users: ${activeUsers.length}`);
    console.log(`   ADMIN users (excluded from limit): ${adminUsers.length}`);
    console.log(`   Non-ADMIN users (counted toward limit): ${nonAdminUsers.length}`);
    
    if (adminUsers.length > 0) {
      console.log(`\n   ADMIN Users:`);
      adminUsers.forEach(u => {
        console.log(`     - ${u.email} (${u.role})`);
      });
    }

    if (nonAdminUsers.length > 0) {
      console.log(`\n   Non-ADMIN Users (counted):`);
      nonAdminUsers.forEach(u => {
        console.log(`     - ${u.email} (${u.role})`);
      });
    }

    // 7. Validate plan limits using the actual function
    console.log(`\n✅ Validation Results:`);
    const validation = await validatePlanLimits(merchantId, 'users');
    
    console.log(`   Valid: ${validation.isValid}`);
    if (!validation.isValid) {
      console.log(`   Error: ${validation.error}`);
      console.log(`   Current Count: ${validation.currentCount}`);
      console.log(`   Limit: ${validation.limit}`);
      console.log(`   Remaining: ${validation.limit - validation.currentCount}`);
    } else {
      console.log(`   Current Count: ${validation.currentCount}`);
      console.log(`   Limit: ${validation.limit === -1 ? 'Unlimited' : validation.limit}`);
      if (validation.limit !== -1) {
        console.log(`   Remaining: ${validation.limit - validation.currentCount}`);
      }
    }

    // 8. Check if can create user
    console.log(`\n🔍 Can Create New User?`);
    if (totalLimits.users === -1) {
      console.log(`   ✅ YES - Unlimited users`);
    } else if (currentCounts.users < totalLimits.users) {
      console.log(`   ✅ YES - ${currentCounts.users} < ${totalLimits.users} (${totalLimits.users - currentCounts.users} remaining)`);
    } else {
      console.log(`   ❌ NO - ${currentCounts.users} >= ${totalLimits.users} (limit reached)`);
    }

    // 9. Summary
    console.log(`\n📝 Summary:`);
    console.log(`   Plan: ${plan.name}`);
    console.log(`   Base User Limit: ${planLimits.users ?? -1}`);
    console.log(`   Addon User Limit: ${totalAddonLimits.users}`);
    console.log(`   Total User Limit: ${totalLimits.users === -1 ? 'Unlimited' : totalLimits.users}`);
    console.log(`   Current Users: ${currentCounts.users} (excluding ${adminUsers.length} ADMIN users)`);
    console.log(`   Can Create: ${totalLimits.users === -1 || currentCounts.users < totalLimits.users ? 'YES ✅' : 'NO ❌'}`);

  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Get merchant ID from command line
const merchantId = process.argv[2] ? parseInt(process.argv[2]) : 19;

if (isNaN(merchantId)) {
  console.error('❌ Invalid merchant ID');
  process.exit(1);
}

debugMerchantPlanLimits(merchantId)
  .then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug failed:', error);
    process.exit(1);
  });
