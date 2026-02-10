#!/usr/bin/env node
/**
 * Script to test subscription change-plan API with email notification
 * This will find a subscription, update merchant email to test email, then call change-plan API
 * 
 * Usage: node scripts/test-change-plan-api.js
 */

require('dotenv').config({ path: '.env.production' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AcmVudGFsc2hvcC5jb20iLCJyb2xlIjoiQURNSU4iLCJtZXJjaGFudElkIjpudWxsLCJvdXRsZXRJZCI6bnVsbCwic2Vzc2lvbklkIjoiMTc1N2E3YTVlNjExMWJlODU4NDcxMDUzNjkxN2M1N2JhYjdiYzBmMDBiNjQwMDY1YTQ5MTE4YmYzZTYzYzExOCIsInBhc3N3b3JkQ2hhbmdlZEF0IjpudWxsLCJwZXJtaXNzaW9uc0NoYW5nZWRBdCI6bnVsbCwiaWF0IjoxNzcwNTIxNjUzLCJleHAiOjE3NzExMjY0NTN9.h1faQLya3iS4cGnXY50tMpRKTJPF29nzMHFnALuetKk';
const TEST_EMAIL = 'trinh3@yopmail.com';
const API_URL = process.env.API_URL || 'https://api.anyrent.shop';

async function testChangePlan() {
  try {
    console.log('\n🔍 Finding subscription to test...\n');

    // Find first active subscription
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

    console.log('📋 Found subscription:');
    console.log(`   ID: ${subscription.publicId}`);
    console.log(`   Merchant: ${subscription.merchant.name} (${subscription.merchant.email})`);
    console.log(`   Current Plan: ${subscription.plan.name} (ID: ${subscription.plan.publicId})`);
    console.log(`   Status: ${subscription.status}\n`);

    // Find a different plan to change to
    const otherPlan = await prisma.plan.findFirst({
      where: {
        id: { not: subscription.planId }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otherPlan) {
      console.error('❌ No other plan found to change to!');
      return;
    }

    console.log(`🎯 Target Plan: ${otherPlan.name} (ID: ${otherPlan.publicId})\n`);

    // Update merchant email to test email
    console.log(`📧 Updating merchant email to ${TEST_EMAIL}...`);
    await prisma.merchant.update({
      where: { id: subscription.merchantId },
      data: { email: TEST_EMAIL }
    });
    console.log('✅ Merchant email updated!\n');

    // Call change-plan API
    console.log('📡 Calling change-plan API...\n');
    const response = await fetch(`${API_URL}/api/subscriptions/${subscription.publicId}/change-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        planId: otherPlan.publicId,
        billingInterval: 'monthly'
      })
    });

    const result = await response.json();
    
    console.log('📬 API Response:');
    console.log(JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('\n✅ Subscription plan changed successfully!');
      console.log(`\n💡 Check ${TEST_EMAIL} inbox to verify email was received.`);
      console.log(`   EMAIL_PROVIDER: ${process.env.EMAIL_PROVIDER || 'not set'}`);
      if (process.env.EMAIL_PROVIDER === 'console') {
        console.log('   ⚠️  Note: EMAIL_PROVIDER=console, so email was only logged, not sent.');
      }
    } else {
      console.error('\n❌ API call failed!');
      console.error('Status:', response.status);
      console.error('Response:', result);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testChangePlan();
