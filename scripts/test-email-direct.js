#!/usr/bin/env node
/**
 * Script to test subscription email sending directly
 * This calls the email function directly without going through API
 * 
 * Usage: node scripts/test-email-direct.js
 */

require('dotenv').config({ path: '.env.production' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TEST_EMAIL = 'trinh3@yopmail.com';

async function testEmailDirect() {
  try {
    console.log('\n📧 Testing Subscription Email Sending (Direct)...\n');
    console.log(`Target Email: ${TEST_EMAIL}\n`);
    console.log(`EMAIL_PROVIDER: ${process.env.EMAIL_PROVIDER || 'not set'}\n`);

    // Find first subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        status: { not: 'CANCELLED' }
      },
      include: {
        merchant: true,
        plan: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!subscription) {
      console.error('❌ No subscription found!');
      return;
    }

    // Update merchant email to test email
    console.log(`📧 Updating merchant email to ${TEST_EMAIL}...`);
    await prisma.merchant.update({
      where: { id: subscription.merchantId },
      data: { email: TEST_EMAIL }
    });
    console.log('✅ Merchant email updated!\n');

    // Find another plan
    const otherPlan = await prisma.plan.findFirst({
      where: {
        id: { not: subscription.planId }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otherPlan) {
      console.error('❌ No other plan found!');
      return;
    }

    console.log('📋 Subscription Details:');
    console.log(`   Merchant: ${subscription.merchant.name}`);
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Old Plan: ${subscription.plan.name}`);
    console.log(`   New Plan: ${otherPlan.name}\n`);

    // Calculate price
    const basePrice = otherPlan.basePrice || 0;
    const monthlyPrice = basePrice;
    
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 30);

    // Import and call email function
    console.log('📬 Sending plan change email...\n');
    
    // Use dynamic import for ESM module
    const emailModule = await import('../packages/utils/src/services/email.js');
    
    const result = await emailModule.sendPlanChangeEmail({
      merchantName: subscription.merchant.name,
      email: TEST_EMAIL,
      oldPlanName: subscription.plan.name,
      newPlanName: otherPlan.name,
      amount: monthlyPrice,
      currency: 'VND',
      billingInterval: 'monthly',
      periodStart: periodStart,
      periodEnd: periodEnd
    });

    console.log('\n✅ Email sent successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log(`\n💡 Check ${TEST_EMAIL} inbox to verify email was received.`);
    if (process.env.EMAIL_PROVIDER === 'console') {
      console.log('⚠️  Note: EMAIL_PROVIDER=console, so email was only logged, not sent.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testEmailDirect();
