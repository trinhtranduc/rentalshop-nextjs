#!/usr/bin/env node

/**
 * Reset All Merchants to Trial Status
 * 
 * This script resets all existing merchants to trial status by:
 * 1. Finding the trial plan
 * 2. Updating all merchant subscriptions to trial status
 * 3. Setting proper trial end dates
 * 4. Removing any payment records (optional)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetMerchantsToTrial() {
  try {
    console.log('🔄 Resetting all merchants to trial status...\n');

    // Step 1: Find the trial plan
    console.log('📋 Step 1: Finding trial plan...');
    let trialPlan = await prisma.plan.findFirst({
      where: { 
        name: 'Trial',
        isActive: true 
      }
    });

    if (!trialPlan) {
      console.log('❌ Trial plan not found. Creating one...');
      
      // Get next available publicId
      const lastPlan = await prisma.plan.findFirst({
        orderBy: { publicId: 'desc' }
      });
      const planPublicId = (lastPlan?.publicId || 0) + 1;
      
      // Create trial plan if it doesn't exist
      trialPlan = await prisma.plan.create({
        data: {
          publicId: planPublicId,
          name: 'Trial',
          description: 'Free trial plan for new merchants',
          basePrice: 0,
          currency: 'USD',
          trialDays: 14,
          maxOutlets: 1,
          maxUsers: 3,
          maxProducts: 50,
          maxCustomers: 100,
          features: JSON.stringify([
            'Basic order management',
            'Single outlet support',
            'Basic reporting',
            'Email support'
          ]),
          isActive: true,
          isPopular: false
        }
      });
      console.log('✅ Created trial plan');
    } else {
      console.log(`✅ Found trial plan: ${trialPlan.name} (${trialPlan.trialDays} days)`);
    }

    // Step 2: Get all merchants
    console.log('\n📋 Step 2: Getting all merchants...');
    const merchants = await prisma.merchant.findMany({
      include: {
        subscriptions: true
      }
    });

    console.log(`Found ${merchants.length} merchants to reset`);

    // Step 3: Reset each merchant to trial
    console.log('\n📋 Step 3: Resetting merchants to trial...');
    
    for (const merchant of merchants) {
      console.log(`\n🔄 Processing merchant: ${merchant.name} (ID: ${merchant.publicId})`);

      // Calculate trial dates
      const startDate = new Date();
      const trialEndDate = new Date(startDate.getTime() + (trialPlan.trialDays * 24 * 60 * 60 * 1000));

      // Update or create subscription
      const existingSubscription = merchant.subscriptions[0];
      
      if (existingSubscription) {
        // Update existing subscription
        await prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            planId: trialPlan.id,
            planVariantId: null, // Trial doesn't need plan variant
            status: 'TRIAL',
            startDate: startDate,
            endDate: trialEndDate,
            trialEndDate: trialEndDate,
            nextBillingDate: trialEndDate,
            amount: 0, // Free trial
            currency: 'USD',
            autoRenew: false, // Don't auto-renew trials
            cancelledAt: null,
            cancellationReason: null
          }
        });
        console.log(`  ✅ Updated existing subscription to trial`);
      } else {
        // Create new trial subscription
        const lastSubscription = await prisma.subscription.findFirst({
          orderBy: { publicId: 'desc' }
        });
        const subscriptionPublicId = (lastSubscription?.publicId || 0) + 1;

        await prisma.subscription.create({
          data: {
            publicId: subscriptionPublicId,
            merchantId: merchant.id,
            planId: trialPlan.id,
            planVariantId: null, // Trial doesn't need plan variant
            status: 'TRIAL',
            startDate: startDate,
            endDate: trialEndDate,
            trialEndDate: trialEndDate,
            nextBillingDate: trialEndDate,
            amount: 0, // Free trial
            currency: 'USD',
            autoRenew: false, // Don't auto-renew trials
            cancelledAt: null,
            cancellationReason: null
          }
        });
        console.log(`  ✅ Created new trial subscription`);
      }

      // Update merchant
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          planId: trialPlan.id,
          subscriptionStatus: 'trial',
          trialEndsAt: trialEndDate
        }
      });
      console.log(`  ✅ Updated merchant to trial status`);
    }

    // Step 4: Optional - Remove all payment records
    console.log('\n📋 Step 4: Removing payment records...');
    const paymentCount = await prisma.payment.count();
    
    if (paymentCount > 0) {
      await prisma.payment.deleteMany({});
      console.log(`✅ Removed ${paymentCount} payment records`);
    } else {
      console.log('ℹ️  No payment records found');
    }

    // Step 5: Summary
    console.log('\n📊 Summary:');
    const totalMerchants = await prisma.merchant.count();
    const trialMerchants = await prisma.merchant.count({
      where: { subscriptionStatus: 'trial' }
    });
    const trialSubscriptions = await prisma.subscription.count({
      where: { status: 'TRIAL' }
    });
    const remainingPayments = await prisma.payment.count();

    console.log(`- Total merchants: ${totalMerchants}`);
    console.log(`- Merchants on trial: ${trialMerchants}`);
    console.log(`- Trial subscriptions: ${trialSubscriptions}`);
    console.log(`- Remaining payments: ${remainingPayments}`);

    console.log('\n✅ All merchants have been reset to trial status!');
    console.log('🎉 Merchants can now use the system with trial limitations');

  } catch (error) {
    console.error('❌ Error resetting merchants to trial:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  resetMerchantsToTrial()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { resetMerchantsToTrial };
