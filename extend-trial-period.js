const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function extendTrialPeriod() {
  try {
    console.log('🔄 Extending Trial Period...\n');
    
    // Get all trial subscriptions that have expired
    const now = new Date();
    const trialSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'trial',
        trialEnd: {
          lt: now // Trial has expired
        }
      },
      include: {
        merchant: true
      }
    });

    console.log(`Found ${trialSubscriptions.length} expired trial subscriptions:\n`);

    for (const subscription of trialSubscriptions) {
      console.log(`🏢 Merchant: ${subscription.merchant.name}`);
      console.log(`📅 Current Trial End: ${subscription.trialEnd}`);
      
      // Extend trial by 30 days from now
      const newTrialEnd = new Date();
      newTrialEnd.setDate(newTrialEnd.getDate() + 30);
      
      // Update the subscription
      const updated = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          trialEnd: newTrialEnd,
          currentPeriodEnd: newTrialEnd // Also update current period end
        }
      });
      
      console.log(`✅ Extended trial to: ${newTrialEnd.toISOString()}`);
      console.log('---\n');
    }

    // Also check for any trial subscriptions without trial end dates
    const subscriptionsWithoutTrialEnd = await prisma.subscription.findMany({
      where: {
        status: 'trial',
        trialEnd: null
      },
      include: {
        merchant: true
      }
    });

    if (subscriptionsWithoutTrialEnd.length > 0) {
      console.log(`Found ${subscriptionsWithoutTrialEnd.length} trial subscriptions without end dates:\n`);
      
      for (const subscription of subscriptionsWithoutTrialEnd) {
        console.log(`🏢 Merchant: ${subscription.merchant.name}`);
        
        // Set trial end to 30 days from now
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30);
        
        const updated = await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            trialEnd: trialEnd,
            trialStart: subscription.trialStart || new Date(),
            currentPeriodEnd: trialEnd
          }
        });
        
        console.log(`✅ Set trial end to: ${trialEnd.toISOString()}`);
        console.log('---\n');
      }
    }

    console.log('✅ Trial period extension completed!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extendTrialPeriod();
