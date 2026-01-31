/**
 * Debug script to check why email logs are not appearing
 * 
 * This script checks:
 * 1. If merchant has email
 * 2. If email functions are being called
 * 3. If there are any errors preventing email sending
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugEmailLogs() {
  try {
    console.log('🔍 Debugging Email Logs...\n');

    // Check a few subscriptions with merchants
    const subscriptions = await prisma.subscription.findMany({
      take: 5,
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        plan: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    console.log(`📊 Found ${subscriptions.length} subscriptions\n`);

    for (const sub of subscriptions) {
      console.log(`\n📋 Subscription ID: ${sub.id}`);
      console.log(`   Merchant ID: ${sub.merchantId}`);
      console.log(`   Merchant Name: ${sub.merchant?.name || 'N/A'}`);
      console.log(`   Merchant Email: ${sub.merchant?.email || '❌ NO EMAIL'}`);
      console.log(`   Plan: ${sub.plan?.name || 'N/A'}`);
      console.log(`   Status: ${sub.status}`);
      
      if (!sub.merchant?.email) {
        console.log(`   ⚠️  WARNING: This merchant has no email - emails will NOT be sent!`);
      } else {
        console.log(`   ✅ Merchant has email - emails should work`);
      }
    }

    // Check environment variables
    console.log('\n\n🔧 Environment Variables:');
    console.log(`   EMAIL_PROVIDER: ${process.env.EMAIL_PROVIDER || 'NOT SET (defaults to console)'}`);
    console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || 'NOT SET'}`);
    console.log(`   AWS_SES_REGION: ${process.env.AWS_SES_REGION || 'NOT SET'}`);
    console.log(`   AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET'}`);
    console.log(`   AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET'}`);

    // Check if email functions are exported
    console.log('\n\n📦 Checking Email Functions Export...');
    try {
      const emailModule = await import('@rentalshop/utils');
      const emailFunctions = [
        'sendPlanChangeEmail',
        'sendSubscriptionRenewalEmail',
        'sendSubscriptionExtensionEmail',
        'sendSubscriptionStatusChangeEmail',
        'sendEmail'
      ];

      for (const funcName of emailFunctions) {
        if (typeof emailModule[funcName] === 'function') {
          console.log(`   ✅ ${funcName} is exported`);
        } else {
          console.log(`   ❌ ${funcName} is NOT exported`);
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Error importing email module: ${error.message}`);
    }

    // Check recent subscription activities
    console.log('\n\n📜 Recent Subscription Activities (last 10):');
    const activities = await prisma.subscriptionActivity.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      }
    });

    for (const activity of activities) {
      console.log(`\n   ${activity.type} (${activity.createdAt.toISOString()})`);
      console.log(`      Subscription ID: ${activity.subscriptionId}`);
      console.log(`      Merchant: ${activity.subscription?.merchant?.name || 'N/A'}`);
      console.log(`      Merchant Email: ${activity.subscription?.merchant?.email || '❌ NO EMAIL'}`);
      if (activity.type.includes('plan') || activity.type.includes('renewal') || activity.type.includes('extension')) {
        console.log(`      ⚠️  This activity should have triggered an email!`);
        if (!activity.subscription?.merchant?.email) {
          console.log(`      ❌ But merchant has no email, so email was NOT sent`);
        }
      }
    }

    console.log('\n\n✅ Debug complete!');
    console.log('\n💡 Tips:');
    console.log('   1. Check if merchants have email addresses');
    console.log('   2. Check EMAIL_PROVIDER environment variable');
    console.log('   3. Check server logs for "📨" or "📬" emojis');
    console.log('   4. If EMAIL_PROVIDER is not set, emails will only be logged to console');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug script
debugEmailLogs();
