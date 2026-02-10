#!/usr/bin/env tsx
/**
 * Script to check subscription email sending status
 * 
 * Usage:
 *   tsx scripts/check-subscription-email-status.ts
 * 
 * On Railway:
 *   railway run --service apis tsx scripts/check-subscription-email-status.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSubscriptionEmailStatus() {
  try {
    console.log('\n🔍 Checking Subscription Email Configuration...\n');

    // 1. Check email provider configuration
    const emailProvider = process.env.EMAIL_PROVIDER || 'console';
    const emailFrom = process.env.EMAIL_FROM || 'noreply@anyrent.shop';
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsSesRegion = process.env.AWS_SES_REGION || 'us-east-1';

    console.log('📧 Email Provider Configuration:');
    console.log(`   EMAIL_PROVIDER: ${emailProvider}`);
    console.log(`   EMAIL_FROM: ${emailFrom}`);
    console.log(`   AWS_SES_REGION: ${awsSesRegion}`);
    console.log(`   AWS_ACCESS_KEY_ID: ${awsAccessKeyId ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`   AWS_SECRET_ACCESS_KEY: ${awsSecretAccessKey ? '✅ SET' : '❌ NOT SET'}`);

    if (emailProvider === 'console') {
      console.log('\n⚠️  WARNING: EMAIL_PROVIDER=console');
      console.log('   Emails will only be logged to console, not actually sent!');
      console.log('   To send real emails, set EMAIL_PROVIDER=ses and configure AWS credentials\n');
    } else if (emailProvider === 'ses') {
      if (!awsAccessKeyId || !awsSecretAccessKey) {
        console.log('\n❌ ERROR: EMAIL_PROVIDER=ses but AWS credentials not configured!');
        console.log('   Emails will fail to send.');
        console.log('   Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY\n');
      } else {
        console.log('\n✅ Email Provider: AWS SES (configured)');
      }
    }

    // 2. Check merchants with subscriptions
    console.log('\n📊 Checking Merchants with Subscriptions...\n');

    const subscriptions = await prisma.subscription.findMany({
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
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });

    console.log(`Found ${subscriptions.length} subscriptions (showing last 10):\n`);

    subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. Subscription ID: ${sub.id}`);
      console.log(`   Merchant: ${sub.merchant?.name || 'N/A'}`);
      console.log(`   Merchant Email: ${sub.merchant?.email || '❌ NO EMAIL'}`);
      console.log(`   Plan: ${sub.plan?.name || 'N/A'}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Last Updated: ${sub.updatedAt.toISOString()}`);
      console.log('');
    });

    // 3. Check merchants without email
    const merchantsWithoutEmail = await prisma.merchant.findMany({
      where: {
        email: null,
        subscriptions: {
          some: {
            status: {
              in: ['ACTIVE', 'PAUSED']
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
      }
    });

    if (merchantsWithoutEmail.length > 0) {
      console.log(`\n⚠️  WARNING: Found ${merchantsWithoutEmail.length} merchants with active subscriptions but NO EMAIL:\n`);
      merchantsWithoutEmail.forEach((merchant, index) => {
        console.log(`${index + 1}. Merchant ID: ${merchant.id}, Name: ${merchant.name || 'N/A'}`);
      });
      console.log('\n💡 These merchants will NOT receive subscription emails!\n');
    }

    // 4. Summary
    console.log('\n📋 Summary:');
    console.log(`   Total Subscriptions: ${subscriptions.length}`);
    console.log(`   Email Provider: ${emailProvider}`);
    console.log(`   Can Send Emails: ${emailProvider === 'ses' && awsAccessKeyId && awsSecretAccessKey ? '✅ YES' : '❌ NO'}`);
    console.log(`   Merchants Without Email: ${merchantsWithoutEmail.length}`);

    if (emailProvider === 'console') {
      console.log('\n💡 To enable real email sending:');
      console.log('   1. Set EMAIL_PROVIDER=ses in Railway Variables');
      console.log('   2. Ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set');
      console.log('   3. Verify email domain in AWS SES');
    }

  } catch (error) {
    console.error('\n❌ Error checking subscription email status:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubscriptionEmailStatus();
