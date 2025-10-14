#!/usr/bin/env node

/**
 * Resume Subscription for Merchant
 * Usage: node resume-subscription.js <merchantId>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resumeSubscription(merchantId) {
  try {
    console.log(`🔍 Resuming subscription for merchant ${merchantId}...`);
    
    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { merchantId: parseInt(merchantId) },
      include: {
        merchant: true,
        plan: true
      }
    });

    if (!subscription) {
      console.error(`❌ No subscription found for merchant ${merchantId}`);
      process.exit(1);
    }

    console.log('📊 Current subscription:', {
      id: subscription.id,
      status: subscription.status,
      merchantId: subscription.merchantId,
      merchantName: subscription.merchant.name
    });

    if (subscription.status !== 'paused' && subscription.status !== 'cancelled') {
      console.log(`✅ Subscription is already ${subscription.status}, no need to resume`);
      process.exit(0);
    }

    // Resume subscription
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'active',
        updatedAt: new Date()
      }
    });

    console.log('✅ Subscription resumed successfully!');
    console.log('📊 Updated subscription:', {
      id: updated.id,
      status: updated.status,
      merchantId: updated.merchantId
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const merchantId = process.argv[2] || '1';
resumeSubscription(merchantId);

