const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTrialStatus() {
  try {
    console.log('🔍 Debugging Trial Status for test4@gmail.com...\n');
    
    // Find the merchant with email test4@gmail.com
    const merchant = await prisma.merchant.findFirst({
      where: {
        email: 'test4@gmail.com'
      },
      include: {
        subscriptions: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!merchant) {
      console.log('❌ No merchant found with email: test4@gmail.com');
      return;
    }

    console.log(`🏢 Merchant: ${merchant.name} (ID: ${merchant.id})`);
    console.log(`📧 Email: ${merchant.email}`);
    console.log(`📅 Created: ${merchant.createdAt}`);
    console.log('');

    if (merchant.subscriptions.length === 0) {
      console.log('❌ No subscriptions found for this merchant');
      return;
    }

    for (const subscription of merchant.subscriptions) {
      const now = new Date();
      const trialEnd = subscription.trialEnd ? new Date(subscription.trialEnd) : null;
      const trialStart = subscription.trialStart ? new Date(subscription.trialStart) : null;
      
      console.log(`📅 Subscription ID: ${subscription.id}`);
      console.log(`📅 Status: ${subscription.status}`);
      console.log(`📅 Trial Start: ${trialStart ? trialStart.toISOString() : 'Not set'}`);
      console.log(`📅 Trial End: ${trialEnd ? trialEnd.toISOString() : 'Not set'}`);
      console.log(`📅 Current Time: ${now.toISOString()}`);
      
      if (trialEnd) {
        const isExpired = trialEnd < now;
        const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`⏰ Trial Expired: ${isExpired ? 'YES' : 'NO'}`);
        console.log(`⏰ Days Remaining: ${daysRemaining}`);
        
        if (isExpired) {
          console.log(`❌ REASON FOR DENIED: Trial period has expired!`);
        } else {
          console.log(`✅ Trial is still active`);
        }
      } else {
        console.log(`⚠️  No trial end date set - this might cause issues`);
      }
      
      console.log('---\n');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTrialStatus();
