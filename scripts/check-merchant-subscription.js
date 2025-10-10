/**
 * Quick script to check merchant subscription and plan data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMerchantSubscription() {
  try {
    // Get the most recent merchant (likely the one just registered)
    const merchant = await prisma.merchant.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });

    if (!merchant) {
      console.log('❌ No merchant found');
      return;
    }

    console.log('\n📊 MERCHANT DATA:');
    console.log('================');
    console.log('ID:', merchant.id);
    console.log('Name:', merchant.name);
    console.log('Email:', merchant.email);
    console.log('Subscription Status:', merchant.subscriptionStatus);
    console.log('Created:', merchant.createdAt);

    if (merchant.subscription) {
      console.log('\n💳 SUBSCRIPTION DATA:');
      console.log('====================');
      console.log('ID:', merchant.subscription.id);
      console.log('Status:', merchant.subscription.status);
      console.log('Amount:', merchant.subscription.amount);
      console.log('Currency:', merchant.subscription.currency);
      console.log('Period:', `${merchant.subscription.currentPeriodStart} → ${merchant.subscription.currentPeriodEnd}`);

      if (merchant.subscription.plan) {
        console.log('\n📦 PLAN DATA:');
        console.log('============');
        console.log('ID:', merchant.subscription.plan.id);
        console.log('Name:', merchant.subscription.plan.name);
        console.log('Description:', merchant.subscription.plan.description);
        console.log('Base Price:', merchant.subscription.plan.basePrice);
        console.log('Currency:', merchant.subscription.plan.currency);
        console.log('Trial Days:', merchant.subscription.plan.trialDays);
        console.log('Is Active:', merchant.subscription.plan.isActive);
        console.log('Is Popular:', merchant.subscription.plan.isPopular);
      } else {
        console.log('\n❌ No plan found for subscription');
      }
    } else {
      console.log('\n❌ No subscription found for merchant');
    }

    // Check all available plans
    console.log('\n\n📋 ALL AVAILABLE PLANS:');
    console.log('======================');
    const allPlans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    allPlans.forEach(plan => {
      console.log(`\n${plan.name}:`);
      console.log(`  ID: ${plan.id}`);
      console.log(`  Price: ${plan.basePrice} ${plan.currency}`);
      console.log(`  Trial Days: ${plan.trialDays}`);
      console.log(`  Popular: ${plan.isPopular}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMerchantSubscription();

