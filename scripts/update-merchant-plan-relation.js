const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateMerchantPlanRelation() {
  try {
    console.log('🔄 Starting merchant-plan relationship update...');

    // Step 1: Create default plans if they don't exist
    console.log('\n📋 Creating default plans...');
    
    const defaultPlans = [
      {
        name: 'Basic',
        description: 'Perfect for small rental businesses just getting started',
        price: 29,
        currency: 'USD',
        trialDays: 14,
        maxOutlets: 1,
        maxUsers: 3,
        maxProducts: 50,
        maxCustomers: 100,
        features: JSON.stringify([
          'Basic inventory management',
          'Customer database',
          'Order processing',
          'Basic reporting',
          'Email support'
        ]),
        isActive: true,
        isPopular: false,
        sortOrder: 1,
        billingCycle: 'monthly',
        billingCycleMonths: 1
      },
      {
        name: 'Professional',
        description: 'Ideal for growing rental businesses with multiple outlets',
        price: 79,
        currency: 'USD',
        trialDays: 30,
        maxOutlets: 5,
        maxUsers: 15,
        maxProducts: 200,
        maxCustomers: 500,
        features: JSON.stringify([
          'Advanced inventory management',
          'Multi-outlet support',
          'Advanced analytics',
          'Customer loyalty program',
          'Priority support',
          'API access',
          'Custom branding'
        ]),
        isActive: true,
        isPopular: true,
        sortOrder: 2,
        billingCycle: 'monthly',
        billingCycleMonths: 1
      },
      {
        name: 'Enterprise',
        description: 'For large rental operations with complex needs',
        price: 199,
        currency: 'USD',
        trialDays: 30,
        maxOutlets: -1, // Unlimited
        maxUsers: -1, // Unlimited
        maxProducts: -1, // Unlimited
        maxCustomers: -1, // Unlimited
        features: JSON.stringify([
          'Unlimited everything',
          'Advanced automation',
          'White-label solution',
          'Dedicated account manager',
          'Custom integrations',
          'Advanced security',
          'SLA guarantee'
        ]),
        isActive: true,
        isPopular: false,
        sortOrder: 3,
        billingCycle: 'monthly',
        billingCycleMonths: 1
      }
    ];

    const createdPlans = [];
    for (const planData of defaultPlans) {
      const existingPlan = await prisma.plan.findUnique({
        where: { name: planData.name }
      });

      if (!existingPlan) {
        const plan = await prisma.plan.create({
          data: {
            publicId: await getNextPublicId('plan'),
            ...planData
          }
        });
        createdPlans.push(plan);
        console.log(`✅ Created plan: ${plan.name} (ID: ${plan.publicId})`);
      } else {
        createdPlans.push(existingPlan);
        console.log(`✅ Using existing plan: ${existingPlan.name} (ID: ${existingPlan.publicId})`);
      }
    }

    // Step 2: Get the Basic plan as default
    const basicPlan = createdPlans.find(p => p.name === 'Basic');
    if (!basicPlan) {
      throw new Error('Basic plan not found');
    }

    // Step 3: Update existing merchants to use the Basic plan
    console.log('\n🏢 Updating existing merchants...');
    
    const merchants = await prisma.merchant.findMany({
      where: {
        planId: null // Only update merchants without a plan
      }
    });

    console.log(`Found ${merchants.length} merchants to update`);

    for (const merchant of merchants) {
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          planId: basicPlan.id,
          subscriptionStatus: 'trial',
          trialEndsAt: new Date(Date.now() + (basicPlan.trialDays * 24 * 60 * 60 * 1000)) // Add trial days
        }
      });
      console.log(`✅ Updated merchant: ${merchant.name} (ID: ${merchant.publicId}) with Basic plan`);
    }

    // Step 4: Create subscriptions for existing merchants
    console.log('\n💳 Creating subscriptions for existing merchants...');
    
    for (const merchant of merchants) {
      const existingSubscription = await prisma.subscription.findFirst({
        where: { merchantId: merchant.id }
      });

      if (!existingSubscription) {
        await prisma.subscription.create({
          data: {
            publicId: await getNextPublicId('subscription'),
            merchantId: merchant.id,
            planId: basicPlan.id,
            status: 'ACTIVE',
            startDate: new Date(),
            nextBillingDate: new Date(Date.now() + (basicPlan.trialDays * 24 * 60 * 60 * 1000)),
            amount: basicPlan.price,
            currency: basicPlan.currency,
            billingCycle: basicPlan.billingCycle,
            autoRenew: true
          }
        });
        console.log(`✅ Created subscription for merchant: ${merchant.name}`);
      }
    }

    console.log('\n✅ Merchant-plan relationship update completed successfully!');
    
    // Step 5: Summary
    const totalMerchants = await prisma.merchant.count();
    const merchantsWithPlans = await prisma.merchant.count({
      where: { planId: { not: null } }
    });
    
    console.log('\n📊 Summary:');
    console.log(`- Total merchants: ${totalMerchants}`);
    console.log(`- Merchants with plans: ${merchantsWithPlans}`);
    console.log(`- Default plans created: ${createdPlans.length}`);

  } catch (error) {
    console.error('❌ Error updating merchant-plan relationship:', error);
    throw error;
  }
}

async function getNextPublicId(model) {
  const result = await prisma.$queryRaw`
    SELECT COALESCE(MAX(publicId), 0) + 1 as nextId 
    FROM ${model}
  `;
  return result[0].nextId;
}

// Run the migration
updateMerchantPlanRelation()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
