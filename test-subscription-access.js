const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSubscriptionAccess() {
  try {
    console.log('🧪 Testing Subscription Access for test4@gmail.com...\n');
    
    // Find the merchant
    const merchant = await prisma.merchant.findFirst({
      where: { email: 'test4@gmail.com' },
      select: { id: true, publicId: true, name: true }
    });

    if (!merchant) {
      console.log('❌ No merchant found');
      return;
    }

    console.log(`🏢 Merchant: ${merchant.name}`);
    console.log(`📧 Email: test4@gmail.com`);
    console.log(`🆔 CUID: ${merchant.id}`);
    console.log(`🆔 PublicId: ${merchant.publicId}`);
    console.log('');

    // Test the old way (incorrect)
    console.log('❌ OLD WAY (incorrect):');
    const oldWay = await prisma.subscription.findUnique({
      where: { merchantId: merchant.publicId.toString() },
      select: { id: true, status: true }
    });
    console.log('Result:', oldWay ? 'Found' : 'Not found');
    if (oldWay) {
      console.log('Status:', oldWay.status);
    }
    console.log('');

    // Test the new way (correct)
    console.log('✅ NEW WAY (correct):');
    const newWay = await prisma.subscription.findUnique({
      where: { merchantId: merchant.id },
      select: { id: true, status: true, trialEnd: true }
    });
    console.log('Result:', newWay ? 'Found' : 'Not found');
    if (newWay) {
      console.log('Status:', newWay.status);
      console.log('Trial End:', newWay.trialEnd);
      
      // Test the trial logic
      const now = new Date();
      const trialEnd = new Date(newWay.trialEnd);
      const isExpired = trialEnd < now;
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log('Current Time:', now.toISOString());
      console.log('Trial End:', trialEnd.toISOString());
      console.log('Is Expired:', isExpired);
      console.log('Days Remaining:', daysRemaining);
      
      if (isExpired) {
        console.log('❌ Should show DENIED');
      } else {
        console.log('✅ Should show FULL access');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSubscriptionAccess();
