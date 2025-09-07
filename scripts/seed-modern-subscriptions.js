#!/usr/bin/env node

/**
 * Seed Modern Subscription System
 * 
 * This script creates sample plans and subscriptions using the modern SaaS pricing structure.
 * It includes Monthly, Quarterly, and Yearly pricing tiers with automatic discount calculations.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Modern pricing configuration
const PRICING_CONFIG = {
  DISCOUNTS: {
    monthly: 0,      // 0% discount
    quarterly: 10,   // 10% discount
    yearly: 20,      // 20% discount
  }
};

// Calculate pricing for a given base price and period
function calculatePricing(basePrice, period) {
  const totalMonths = period;
  const totalBasePrice = basePrice * totalMonths;
  const discount = PRICING_CONFIG.DISCOUNTS[period === 1 ? 'monthly' : period === 3 ? 'quarterly' : 'yearly'];
  const discountAmount = (totalBasePrice * discount) / 100;
  const finalPrice = totalBasePrice - discountAmount;
  const monthlyEquivalent = finalPrice / totalMonths;
  
  return {
    basePrice: totalBasePrice,
    discount,
    finalPrice,
    savings: discountAmount,
    monthlyEquivalent,
    interval: period === 1 ? 'month' : period === 3 ? 'month' : 'year',
    intervalCount: period === 1 ? 1 : period === 3 ? 3 : 1
  };
}

async function main() {
  console.log('🌱 Starting Modern Subscription System seeding...');

  try {
    // Check for existing data
    const existingPlans = await prisma.plan.count();
    const existingSubscriptions = await prisma.subscription.count();
    
    if (existingPlans > 0 || existingSubscriptions > 0) {
      console.log(`⚠️  Found existing data: ${existingPlans} plans, ${existingSubscriptions} subscriptions`);
      console.log('📝 Adding new data without clearing existing data...');
    } else {
      console.log('✅ No existing data found, proceeding with fresh seeding');
    }

    // Create Modern Plans
    console.log('📋 Creating modern plans...');
    
    const plans = [
      {
        publicId: 1,
        name: 'Starter',
        description: 'Perfect for small rental businesses just getting started',
        basePrice: 29.99,
        currency: 'USD',
        trialDays: 14,
        maxOutlets: 1,
        maxUsers: 3,
        maxProducts: 100,
        maxCustomers: -1, // Unlimited
        features: [
          'Basic inventory management',
          'Customer management',
          'Order processing',
          'Basic reporting',
          'Email support',
          'Mobile app access'
        ],
        isActive: true,
        isPopular: false,
        sortOrder: 1
      },
      {
        publicId: 2,
        name: 'Professional',
        description: 'Ideal for growing rental businesses with multiple outlets',
        basePrice: 79.99,
        currency: 'USD',
        trialDays: 14,
        maxOutlets: 5,
        maxUsers: 15,
        maxProducts: 1000,
        maxCustomers: -1, // Unlimited
        features: [
          'Advanced inventory management',
          'Multi-outlet support',
          'Advanced reporting & analytics',
          'Inventory forecasting',
          'Payment processing',
          'Priority support',
          'API access',
          'Team collaboration tools',
          'Advanced integrations'
        ],
        isActive: true,
        isPopular: true,
        sortOrder: 2
      },
      {
        publicId: 3,
        name: 'Enterprise',
        description: 'For large rental operations with complex needs',
        basePrice: 199.99,
        currency: 'USD',
        trialDays: 14,
        maxOutlets: -1, // Unlimited
        maxUsers: -1, // Unlimited
        maxProducts: -1, // Unlimited
        maxCustomers: -1, // Unlimited
        features: [
          'Unlimited everything',
          'Advanced analytics & reporting',
          'Custom integrations',
          'Dedicated account manager',
          '24/7 phone support',
          'White-label options',
          'Advanced security features',
          'Custom workflows',
          'Enterprise SSO',
          'Advanced API access'
        ],
        isActive: true,
        isPopular: false,
        sortOrder: 3
      }
    ];

    // Create plans in database
    const createdPlans = [];
    for (const planData of plans) {
      // Check if plan already exists
      const existingPlan = await prisma.plan.findUnique({
        where: { publicId: planData.publicId }
      });
      
      if (existingPlan) {
        console.log(`⚠️  Plan already exists: ${planData.name} (ID: ${planData.publicId})`);
        createdPlans.push(existingPlan);
      } else {
        const plan = await prisma.plan.create({
          data: {
            ...planData,
            features: JSON.stringify(planData.features)
          }
        });
        console.log(`✅ Created plan: ${plan.name} (ID: ${plan.publicId})`);
        createdPlans.push(plan);
      }
    }

    // Display pricing for each plan
    console.log('\n💰 Plan Pricing Structure:');
    for (const plan of createdPlans) {
      console.log(`\n📦 ${plan.name} ($${plan.basePrice}/month base):`);
      
      const monthly = calculatePricing(plan.basePrice, 1);
      const quarterly = calculatePricing(plan.basePrice, 3);
      const yearly = calculatePricing(plan.basePrice, 12);
      
      console.log(`  Monthly:    $${monthly.finalPrice.toFixed(2)}/month     (${monthly.discount}% off)`);
      console.log(`  Quarterly:  $${quarterly.finalPrice.toFixed(2)}/quarter   (${quarterly.discount}% off, Save $${quarterly.savings.toFixed(2)})`);
      console.log(`  Yearly:     $${yearly.finalPrice.toFixed(2)}/year      (${yearly.discount}% off, Save $${yearly.savings.toFixed(2)})`);
    }

    // Create sample subscriptions
    console.log('\n📋 Creating sample subscriptions...');
    
    // Get merchants to create subscriptions for
    const merchants = await prisma.merchant.findMany({
      take: 3,
      orderBy: { createdAt: 'asc' }
    });

    if (merchants.length === 0) {
      console.log('⚠️  No merchants found. Please run merchant seeding first.');
      return;
    }

    const subscriptions = [];
    const billingPeriods = [1, 3, 12]; // Monthly, Quarterly, Yearly
    const statuses = ['trial', 'active', 'past_due', 'cancelled', 'paused'];

    for (let i = 0; i < merchants.length; i++) {
      const merchant = merchants[i];
      const plan = createdPlans[i % createdPlans.length];
      const period = billingPeriods[i % billingPeriods.length];
      const status = statuses[i % statuses.length];
      
      const pricing = calculatePricing(plan.basePrice, period);
      
      // Calculate dates
      const now = new Date();
      const trialStart = plan.trialDays > 0 ? now : undefined;
      const trialEnd = plan.trialDays > 0 ? new Date(now.getTime() + (plan.trialDays * 24 * 60 * 60 * 1000)) : undefined;
      
      const currentPeriodStart = trialEnd || now;
      const currentPeriodEnd = new Date(currentPeriodStart.getTime() + (period * 30 * 24 * 60 * 60 * 1000));

      // Generate publicId
      const lastSubscription = await prisma.subscription.findFirst({
        orderBy: { publicId: 'desc' }
      });
      const publicId = (lastSubscription?.publicId || 0) + 1;

      const subscription = await prisma.subscription.create({
        data: {
          publicId,
          merchantId: merchant.id,
          planId: plan.id,
          status,
          currentPeriodStart,
          currentPeriodEnd,
          trialStart,
          trialEnd,
          amount: pricing.finalPrice,
          currency: plan.currency,
          interval: pricing.interval,
          intervalCount: pricing.intervalCount,
          period: period,
          discount: pricing.discount,
          savings: pricing.savings,
          cancelAtPeriodEnd: status === 'cancelled',
          canceledAt: status === 'cancelled' ? now : null,
          cancelReason: status === 'cancelled' ? 'Sample cancellation' : null
        }
      });

      // Update merchant subscription status
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          planId: plan.id,
          subscriptionStatus: status
        }
      });

      subscriptions.push(subscription);
      
      const periodName = period === 1 ? 'Monthly' : period === 3 ? 'Quarterly' : 'Yearly';
      console.log(`✅ Created ${periodName} subscription for ${merchant.name}: $${pricing.finalPrice.toFixed(2)} (${pricing.discount}% off, Save $${pricing.savings.toFixed(2)})`);
    }

    console.log('\n🎉 Modern Subscription System seeding completed!');
    console.log(`📊 Summary:`);
    console.log(`  • ${createdPlans.length} plans created`);
    console.log(`  • ${subscriptions.length} subscriptions created`);
    console.log(`  • Modern pricing tiers: Monthly (0%), Quarterly (10%), Yearly (20%)`);
    console.log(`  • Automatic discount calculations`);
    console.log(`  • Industry-standard SaaS structure`);

  } catch (error) {
    console.error('❌ Error seeding modern subscription system:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { main, calculatePricing, PRICING_CONFIG };
